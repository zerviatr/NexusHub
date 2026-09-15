/*
 * Copyright 2025 Lee Boonstra
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Network Dispatcher Security Guard & SSRF Protection Engine
 *
 * Provides enterprise-grade network security validations for the Electron Main Process:
 * 1. URL Protocol Enforcement: Strictly restricts schemes to http: and https:;
 *    explicitly rejects dangerous protocols (file:, javascript:, data:, blob:, gopher:, ftp:, ws:, etc.).
 * 2. SSRF Protection: Blocks requests targeting cloud instance metadata endpoints (AWS, GCP, Azure, Alibaba,
 *    Oracle, Kubernetes, and RFC 3927 link-local addresses across IPv4, IPv6, mapped IPv6, decimal, and octal notations).
 * 3. Header Injection Prevention: Sanitizes and validates HTTP request headers against CRLF (\r, \n), null bytes,
 *    and RFC 7230 invalid token characters.
 * 4. Port & Hostname Validation: Restricts TCP/SSL ports to legal 1-65535 integers and sanitizes hostnames
 *    against command and argument injection vectors.
 */

// ===== Interfaces & Types =====

/**
 * Options for target URL security validation.
 */
export interface RequestValidationOptions {
    /**
     * Whether to permit private network / localhost destinations (default: true for local dev).
     */
    allowLocal?: boolean;
    /**
     * Alias for allowLocal for semantic flexibility.
     */
    allowPrivateNetwork?: boolean;
    /**
     * Whether to permit cloud metadata endpoints (default: false for security).
     */
    allowCloudMetadata?: boolean;
    /**
     * Custom list of blocked hostnames or IP addresses.
     */
    blockedHosts?: string[];
    /**
     * Custom permitted protocols (default: ['http:', 'https:']).
     */
    allowedProtocols?: string[];
}

/**
 * Valid target URL result.
 */
export interface ValidationResultValid {
    valid: true;
    isValid: true;
    parsedUrl: URL;
    sanitizedUrl: string;
    error?: undefined;
    errorCode?: undefined;
}

/**
 * Invalid target URL result.
 */
export interface ValidationResultInvalid {
    valid: false;
    isValid: false;
    error: string;
    errorCode: string;
    parsedUrl?: undefined;
    sanitizedUrl?: undefined;
}

/**
 * Result structure returned by URL target validation.
 */
export type ValidationResult = ValidationResultValid | ValidationResultInvalid;

/**
 * Options for request header sanitization.
 */
export interface HeaderSanitizationOptions {
    /**
     * When true, header injection or illegal characters immediately invalidate the payload.
     */
    strict?: boolean;
}

/**
 * Result structure returned by header sanitization.
 */
export interface HeaderSanitizationResult {
    valid: boolean;
    isValid?: boolean;
    error?: string;
    sanitized: Record<string, string>;
    sanitizedHeaders: Record<string, string>;
}

/**
 * Valid port result.
 */
export interface PortValidationResultValid {
    valid: true;
    isValid: true;
    port: number;
    error?: undefined;
}

/**
 * Invalid port result.
 */
export interface PortValidationResultInvalid {
    valid: false;
    isValid: false;
    error: string;
    port?: undefined;
}

/**
 * Result structure returned by port validation.
 */
export type PortValidationResult = PortValidationResultValid | PortValidationResultInvalid;

/**
 * Valid hostname result.
 */
export interface HostnameValidationResultValid {
    valid: true;
    isValid: true;
    sanitizedHost: string;
    error?: undefined;
}

/**
 * Invalid hostname result.
 */
export interface HostnameValidationResultInvalid {
    valid: false;
    isValid: false;
    error: string;
    sanitizedHost?: undefined;
}

/**
 * Result structure returned by hostname validation.
 */
export type HostnameValidationResult = HostnameValidationResultValid | HostnameValidationResultInvalid;

// ===== Security Error Class =====

/**
 * Custom error thrown on critical security policy violations.
 */
export class SecurityValidationError extends Error {
    public readonly code: string;
    public readonly target?: string;
    public readonly details?: unknown;

    /**
     * @param code - Machine-readable security violation code.
     * @param message - Human-readable diagnostic description.
     * @param target - The invalid URL, header, or port target.
     * @param details - Optional additional context.
     */
    constructor(code: string, message: string, target?: string, details?: unknown) {
        super(message);
        this.name = 'SecurityValidationError';
        this.code = code;
        this.target = target;
        this.details = details;
        Object.setPrototypeOf(this, SecurityValidationError.prototype);
    }
}

// ===== Constants & Blocklists =====

const DEFAULT_ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

/**
 * Dangerous protocols that must be explicitly rejected with contextual error messages.
 */
const DANGEROUS_PROTOCOL_MESSAGES: Record<string, string> = {
    'file:': "Protocol 'file:' is forbidden and rejected: Local file system access is strictly blocked for outbound dispatch.",
    'javascript:': "Protocol 'javascript:' is dangerous and strictly prohibited: JavaScript execution is rejected.",
    'data:': "Protocol 'data:' is forbidden and rejected: Data URIs are not permitted for network dispatch.",
    'blob:': "Protocol 'blob:' is forbidden and rejected: Blob URIs are not permitted for network dispatch.",
    'gopher:': "Protocol 'gopher:' is legacy and strictly prohibited: gopher protocol is rejected.",
    'ftp:': "Protocol 'ftp:' is not supported and rejected: Outbound requests are restricted to HTTP and HTTPS.",
    'sftp:': "Protocol 'sftp:' is not supported and rejected: Outbound requests are restricted to HTTP and HTTPS.",
    'ws:': "Protocol 'ws:' is not supported and rejected: Use dedicated WebSocket connection for websocket schemes.",
    'wss:': "Protocol 'wss:' is not supported and rejected: Use dedicated WebSocket connection for websocket schemes.",
    'php:': "Protocol 'php:' is dangerous and strictly prohibited: PHP stream wrappers are rejected.",
    'ldap:': "Protocol 'ldap:' is forbidden and rejected: LDAP protocol is prohibited for HTTP request dispatch.",
    'ldaps:': "Protocol 'ldaps:' is forbidden and rejected: LDAPS protocol is prohibited for HTTP request dispatch.",
    'dict:': "Protocol 'dict:' is dangerous and strictly prohibited: DICT protocol is rejected.",
    'jar:': "Protocol 'jar:' is dangerous and strictly prohibited: JAR protocol is rejected.",
    'view-source:': "Protocol 'view-source:' is forbidden and rejected.",
};

/**
 * Explicit cloud metadata service endpoints and internal identifiers targeted in SSRF attacks.
 */
const BLOCKED_METADATA_HOSTS = new Set([
    '169.254.169.254',             // AWS, Azure, GCP, DigitalOcean, OpenStack metadata IP
    'metadata.google.internal',     // GCP metadata DNS
    'metadata.goog',                // GCP metadata alias
    'instance-data',                // AWS legacy metadata DNS
    'instance-data.ec2.internal',   // AWS EC2 internal metadata DNS
    '169.254.169.250',             // Cloud link-local metadata variants
    '169.254.169.251',
    '169.254.169.253',
    '100.100.100.200',             // Alibaba Cloud instance metadata IP
    '168.63.129.16',               // Azure WireServer / IMDS host communication IP
    'fd00:ec2::254',               // AWS IPv6 IMDSv2 address
    'kubernetes.default',          // Kubernetes in-cluster API service
    'kubernetes.default.svc',
    'kubernetes.default.svc.cluster.local',
]);

const LINK_LOCAL_IPV4_PREFIX = '169.254.';
const RFC7230_HEADER_TOKEN_REGEX = /^[a-zA-Z0-9!#$%&'*+\-.^_`|~]+$/;
const CRLF_AND_LINEBREAKS_REGEX = /[\r\n\u2028\u2029\0]/;
const CONTROL_CHARS_REGEX = /[\x00-\x08\x0A-\x1F\x7F]/g;
const MAX_PORT_NUMBER = 65535;
const MIN_PORT_NUMBER = 1;
const MAX_HOSTNAME_LENGTH = 253;

// ===== Helper Functions =====

/**
 * Converts integer, hex, or octal IP strings into canonical dotted-decimal IPv4 representation.
 * Prevents SSRF filter bypasses using alternative IP notation (e.g. 2852039166 or 0xa9fea9fe).
 *
 * @param host - Raw host or IP string
 * @returns Canonical dotted-decimal IPv4 or null if not a numeric representation
 */
function normalizeNumericIp(host: string): string | null {
    const trimmed = host.trim().replace(/\.+$/, '');

    // Standard dotted decimal IPv4 format
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(trimmed)) {
        return trimmed;
    }

    // Decimal 32-bit integer representation (e.g. 2852039166 -> 169.254.169.254)
    if (/^\d+$/.test(trimmed)) {
        const num = Number(trimmed);
        if (num >= 0 && num <= 0xffffffff) {
            return [
                (num >>> 24) & 255,
                (num >>> 16) & 255,
                (num >>> 8) & 255,
                num & 255,
            ].join('.');
        }
    }

    // Hex integer representation (e.g. 0xa9fea9fe -> 169.254.169.254)
    if (/^0x[0-9a-fA-F]+$/i.test(trimmed)) {
        const num = Number(trimmed);
        if (num >= 0 && num <= 0xffffffff) {
            return [
                (num >>> 24) & 255,
                (num >>> 16) & 255,
                (num >>> 8) & 255,
                num & 255,
            ].join('.');
        }
    }

    // Dotted octal representation (e.g. 0251.0376.0251.0376 -> 169.254.169.254)
    if (/^0[0-7]+(\.0[0-7]+){3}$/.test(trimmed)) {
        const parts = trimmed.split('.');
        const parsed = parts.map((part) => parseInt(part, 8));
        if (parsed.every((p) => p >= 0 && p <= 255)) {
            return parsed.join('.');
        }
    }

    // Dotted hex representation (e.g. 0xa9.0xfe.0xa9.0xfe -> 169.254.169.254)
    if (/^0x[0-9a-fA-F]+(\.0x[0-9a-fA-F]+){3}$/i.test(trimmed)) {
        const parts = trimmed.split('.');
        const parsed = parts.map((part) => parseInt(part, 16));
        if (parsed.every((p) => p >= 0 && p <= 255)) {
            return parsed.join('.');
        }
    }

    return null;
}

/**
 * Checks whether a given hostname or IP corresponds to a cloud metadata or link-local service.
 *
 * @param host - Hostname or IP to evaluate
 * @returns True if the target is a cloud metadata endpoint
 */
export function isCloudMetadataHost(host: string): boolean {
    if (!host || typeof host !== 'string') {
        return false;
    }

    const cleanHost = host.trim().toLowerCase().replace(/^\[|\]$/g, '').replace(/\.+$/, '');

    // Check direct blocklist of known metadata domains and IPs
    if (BLOCKED_METADATA_HOSTS.has(cleanHost)) {
        return true;
    }

    // Check subdomains of metadata service domains
    if (cleanHost.endsWith('.metadata.google.internal') || cleanHost.endsWith('.metadata.goog')) {
        return true;
    }

    // IPv4 Link-Local CIDR block (169.254.0.0/16)
    if (cleanHost.startsWith(LINK_LOCAL_IPV4_PREFIX)) {
        return true;
    }

    // Evaluate alternative numeric representations (decimal, hex, octal)
    const normalizedDotted = normalizeNumericIp(cleanHost);
    if (normalizedDotted) {
        if (BLOCKED_METADATA_HOSTS.has(normalizedDotted) || normalizedDotted.startsWith(LINK_LOCAL_IPV4_PREFIX)) {
            return true;
        }
    }

    // IPv6 Link-Local range fe80::/10 (fe80 to febf)
    if (/^fe[89ab][0-9a-f]:/i.test(cleanHost) || cleanHost === 'fe80::' || cleanHost.startsWith('fe80:')) {
        return true;
    }

    // IPv4-mapped IPv6 addresses for link-local (e.g., ::ffff:169.254.x.x or hex ::ffff:a9fe:xxxx)
    if (cleanHost.includes('::ffff:') || cleanHost.startsWith('0:0:0:0:0:ffff:')) {
        if (cleanHost.includes('169.254.') || cleanHost.includes('a9fe:')) {
            return true;
        }
    }

    return false;
}

/**
 * Checks whether a hostname or IP belongs to a private network (RFC 1918, loopback, or ULA).
 *
 * @param host - Hostname or IP to evaluate
 * @returns True if the target belongs to private/loopback address space
 */
export function isPrivateNetworkHost(host: string): boolean {
    if (!host || typeof host !== 'string') {
        return false;
    }

    const clean = host.trim().toLowerCase().replace(/^\[|\]$/g, '').replace(/\.+$/, '');

    // Loopback hosts
    if (clean === 'localhost' || clean.endsWith('.localhost') || clean === '127.0.0.1' || clean === '::1' || clean === '0.0.0.0') {
        return true;
    }
    if (clean.startsWith('127.')) {
        return true;
    }

    // IPv6 ULA (fc00::/7)
    if (/^f[cd][0-9a-f]{2}:/i.test(clean)) {
        return true;
    }

    // Normalize potential alternative encodings
    const dotted = normalizeNumericIp(clean) || clean;

    // RFC 1918 Private Ranges: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
    if (dotted.startsWith('10.') || dotted.startsWith('192.168.')) {
        return true;
    }

    const match172 = dotted.match(/^172\.(\d{1,3})\./);
    if (match172) {
        const secondOctet = parseInt(match172[1], 10);
        if (secondOctet >= 16 && secondOctet <= 31) {
            return true;
        }
    }

    return false;
}

// ===== Primary Security Functions =====

/**
 * Validates a target request URL for allowed protocols, SSRF defense, and structural integrity.
 *
 * @param urlInput - Target URL string or URL object
 * @param options - Configuration options for private network and metadata access
 * @returns ValidationResult with status, parsed URL, or descriptive error message
 */
export function validateRequestTarget(
    urlInput: unknown,
    options: RequestValidationOptions = {}
): ValidationResult {
    if (urlInput === null || urlInput === undefined || typeof urlInput !== 'string' || urlInput.trim() === '') {
        return {
            valid: false,
            isValid: false,
            error: 'Target URL cannot be empty.',
            errorCode: 'EMPTY_URL',
        };
    }

    const rawUrl = urlInput.trim();

    // Block dangerous control characters and null bytes before URI parsing
    if (/[\x00-\x1F\x7F]/.test(rawUrl)) {
        return {
            valid: false,
            isValid: false,
            error: 'Target URL contains forbidden control characters or null bytes.',
            errorCode: 'INVALID_CHARACTERS',
        };
    }

    // Fast-check protocol prefix to catch dangerous schemes even if URL constructor fails
    const protocolMatch = rawUrl.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/);
    if (protocolMatch) {
        const schemeWithColon = protocolMatch[1].toLowerCase() + ':';
        if (DANGEROUS_PROTOCOL_MESSAGES[schemeWithColon]) {
            return {
                valid: false,
                isValid: false,
                error: DANGEROUS_PROTOCOL_MESSAGES[schemeWithColon],
                errorCode: 'FORBIDDEN_PROTOCOL',
            };
        }
    }

    let parsed: URL;
    try {
        parsed = new URL(rawUrl);
    } catch (err: any) {
        return {
            valid: false,
            isValid: false,
            error: `Invalid URL format: ${err.message || 'Unable to parse URL'}. Only valid http:// and https:// URLs are permitted.`,
            errorCode: 'INVALID_URL',
        };
    }

    // Enforce protocol whitelist
    const allowed = options.allowedProtocols
        ? new Set(options.allowedProtocols.map((p) => (p.endsWith(':') ? p.toLowerCase() : `${p.toLowerCase()}:`)))
        : DEFAULT_ALLOWED_PROTOCOLS;

    if (!allowed.has(parsed.protocol)) {
        const customMessage = DANGEROUS_PROTOCOL_MESSAGES[parsed.protocol];
        return {
            valid: false,
            isValid: false,
            error: customMessage || `Protocol '${parsed.protocol}' is forbidden. Outbound requests are restricted to HTTP and HTTPS.`,
            errorCode: 'FORBIDDEN_PROTOCOL',
        };
    }

    const hostname = parsed.hostname.toLowerCase();

    // Check custom blocked hosts list if supplied
    if (options.blockedHosts && options.blockedHosts.length > 0) {
        const blockedSet = new Set(options.blockedHosts.map((h) => h.toLowerCase().trim()));
        if (blockedSet.has(hostname)) {
            return {
                valid: false,
                isValid: false,
                error: `Security Policy: Access to host '${hostname}' is blocked by administrator policy.`,
                errorCode: 'POLICY_BLOCKED',
            };
        }
    }

    // Defend against Cloud Metadata credential exfiltration (SSRF)
    if (!options.allowCloudMetadata) {
        if (isCloudMetadataHost(hostname)) {
            return {
                valid: false,
                isValid: false,
                error: `SSRF Security Alert: SSRF Guard blocked request to cloud metadata host '${hostname}' to prevent credential exfiltration.`,
                errorCode: 'SSRF_BLOCKED',
            };
        }
    }

    // Restrict private network targets if explicitly disabled
    const allowPrivate = options.allowPrivateNetwork !== undefined ? options.allowPrivateNetwork : options.allowLocal !== false;
    if (!allowPrivate && isPrivateNetworkHost(hostname)) {
        return {
            valid: false,
            isValid: false,
            error: `SSRF Guard: Access to internal or loopback destination '${hostname}' is restricted by policy.`,
            errorCode: 'SSRF_PRIVATE_NETWORK_BLOCKED',
        };
    }

    // Validate port boundaries if an explicit port was specified in the URL
    if (parsed.port) {
        const portCheck = validatePort(parsed.port);
        if (!portCheck.valid) {
            return {
                valid: false,
                isValid: false,
                error: `URL contains an out-of-range or invalid port: ${portCheck.error}`,
                errorCode: 'INVALID_PORT',
            };
        }
    }

    return {
        valid: true,
        isValid: true,
        parsedUrl: parsed,
        sanitizedUrl: parsed.toString(),
    };
}

/**
 * Asserts that a target request URL is safe, throwing SecurityValidationError on any policy breach.
 *
 * @param urlInput - Target URL string or URL object
 * @param options - Security validation options
 * @returns Parsed URL instance
 * @throws SecurityValidationError
 */
export function assertSafeRequestTarget(
    urlInput: unknown,
    options: RequestValidationOptions = {}
): URL {
    const result = validateRequestTarget(urlInput, options);
    if (!result.valid || !result.parsedUrl) {
        throw new SecurityValidationError(
            result.errorCode || 'INVALID_URL',
            result.error || 'URL validation failed',
            String(urlInput)
        );
    }
    return result.parsedUrl;
}

/**
 * Sanitizes and validates request headers, preventing CRLF injection and malicious control characters.
 *
 * @param headers - Key-value pair headers from the renderer process
 * @param options - Sanitization options (strict mode toggle)
 * @returns HeaderSanitizationResult with cleaned headers or error details
 */
export function validateAndSanitizeHeaders(
    headers?: Record<string, unknown>,
    options: HeaderSanitizationOptions = {}
): HeaderSanitizationResult {
    if (!headers || typeof headers !== 'object' || Array.isArray(headers)) {
        return { valid: true, isValid: true, sanitized: {}, sanitizedHeaders: {} };
    }

    const sanitized: Record<string, string> = {};

    for (const [rawKey, rawVal] of Object.entries(headers)) {
        if (typeof rawKey !== 'string') {
            return {
                valid: false,
                isValid: false,
                error: 'Header name must be a valid string.',
                sanitized: {},
                sanitizedHeaders: {},
            };
        }

        const trimmedKey = rawKey.trim();
        if (trimmedKey.length === 0) {
            continue;
        }

        // Detect CRLF in header key or value
        if (CRLF_AND_LINEBREAKS_REGEX.test(rawKey)) {
            return {
                valid: false,
                isValid: false,
                error: `Header injection attempt detected in header name '${trimmedKey.replace(/[\r\n]/g, '')}'. CRLF characters are prohibited.`,
                sanitized: {},
                sanitizedHeaders: {},
            };
        }

        // Verify header name conforms strictly to RFC 7230 token specification
        if (!RFC7230_HEADER_TOKEN_REGEX.test(trimmedKey)) {
            return {
                valid: false,
                isValid: false,
                error: `Invalid header name '${trimmedKey}'. Header names must contain only valid RFC 7230 token characters.`,
                sanitized: {},
                sanitizedHeaders: {},
            };
        }

        const strVal = rawVal === null || rawVal === undefined ? '' : String(rawVal);

        // Detect CRLF injection in header value
        if (CRLF_AND_LINEBREAKS_REGEX.test(strVal)) {
            if (options.strict) {
                return {
                    valid: false,
                    isValid: false,
                    error: `Header injection attempt detected in header value for '${trimmedKey}'. CRLF characters are prohibited: prohibited CRLF injection sequence detected.`,
                    sanitized: {},
                    sanitizedHeaders: {},
                };
            }
            // In default mode, sanitize CRLF and control characters
            const cleanedVal = strVal.replace(/[\r\n\0]/g, '').replace(CONTROL_CHARS_REGEX, '').trim();
            sanitized[trimmedKey] = cleanedVal;
            continue;
        }

        // Strip non-printable control characters while preserving horizontal tab (\t)
        const cleanedValue = strVal.replace(CONTROL_CHARS_REGEX, '').trim();
        sanitized[trimmedKey] = cleanedValue;
    }

    return { valid: true, isValid: true, sanitized, sanitizedHeaders: sanitized };
}

/**
 * Alias for validateAndSanitizeHeaders for backward and semantic compatibility.
 */
export const sanitizeHeaders = validateAndSanitizeHeaders;

/**
 * Validates request headers in strict mode, returning boolean validity and diagnostic error.
 *
 * @param headers - Request headers map
 * @returns Status object
 */
export function validateHeaders(headers?: Record<string, unknown>): { isValid: boolean; error?: string } {
    const result = validateAndSanitizeHeaders(headers, { strict: true });
    return { isValid: result.valid, error: result.error };
}

/**
 * Validates a port number ensuring it is a legal whole integer between 1 and 65535.
 *
 * @param port - Port value to validate (number or string representation)
 * @returns PortValidationResult with validated integer port or descriptive error
 */
export function validatePort(port: unknown): PortValidationResult {
    if (port === null || port === undefined) {
        return {
            valid: false,
            isValid: false,
            error: 'Port cannot be null or undefined. Port must be a valid integer.',
        };
    }

    if (typeof port !== 'number' && typeof port !== 'string') {
        return {
            valid: false,
            isValid: false,
            error: `Invalid port type: expected number or string, received ${typeof port}. Port must be a valid integer.`,
        };
    }

    if (typeof port === 'string') {
        const trimmed = port.trim();
        if (trimmed === '') {
            return { valid: false, isValid: false, error: 'Port cannot be empty. Port must be a valid integer.' };
        }
        if (!/^-?\d+$/.test(trimmed)) {
            return {
                valid: false,
                isValid: false,
                error: `Invalid port number: '${port}'. Port must be a numeric integer.`,
            };
        }
    }

    const num = Number(port);

    if (isNaN(num)) {
        return {
            valid: false,
            isValid: false,
            error: `Invalid port number: '${port}'. Port must be a valid number.`,
        };
    }

    if (!Number.isInteger(num)) {
        return {
            valid: false,
            isValid: false,
            error: `Invalid port number: '${port}'. Port must be a whole integer, floats are not allowed.`,
        };
    }

    if (num < MIN_PORT_NUMBER || num > MAX_PORT_NUMBER) {
        return {
            valid: false,
            isValid: false,
            error: `Invalid port number: ${num}. Port must be a valid integer between 1 and 65535. Valid port range is 1 to 65535.`,
        };
    }

    return { valid: true, isValid: true, port: num };
}

/**
 * Asserts that a port number is valid, returning the numeric port or throwing SecurityValidationError.
 *
 * @param port - Port candidate
 * @param context - Optional description for error messages
 * @returns Validated numeric port (1-65535)
 * @throws SecurityValidationError
 */
export function assertValidPort(port: unknown, context = 'Port'): number {
    const result = validatePort(port);
    if (!result.valid || result.port === undefined) {
        throw new SecurityValidationError('INVALID_PORT', `${context}: ${result.error || 'Invalid port'}`);
    }
    return result.port;
}

/**
 * Validates and sanitizes a hostname for network operations (DNS lookup, TCP ping, SSL check).
 * Defends against command line argument injection (-flags) and shell metacharacters.
 *
 * @param host - Host string to validate
 * @returns HostnameValidationResult with sanitized hostname or descriptive error
 */
export function validateHostname(host: unknown): HostnameValidationResult {
    if (host === null || host === undefined || typeof host !== 'string' || host.trim() === '') {
        return { valid: false, isValid: false, error: 'Hostname is required and cannot be empty.' };
    }

    const trimmedHost = host.trim();

    // Reject hostnames with internal whitespace
    if (/\s/.test(trimmedHost)) {
        return { valid: false, isValid: false, error: 'Hostname cannot contain whitespace.' };
    }

    // Strip URL scheme and extract host component if a full URL was accidentally passed
    let clean = trimmedHost.replace(/^https?:\/\//i, '').split('/')[0].split('?')[0].split('#')[0];

    // Strip port suffix if present for hostname-only validations (e.g. host:80)
    if (clean.includes(':') && !clean.includes(']')) {
        clean = clean.split(':')[0];
    }

    // Prevent argument injection by stripping leading hyphens
    while (clean.startsWith('-')) {
        clean = clean.slice(1).trim();
    }

    if (!clean) {
        return { valid: false, isValid: false, error: 'Failed to extract a valid hostname.' };
    }

    if (clean.length > MAX_HOSTNAME_LENGTH) {
        return {
            valid: false,
            isValid: false,
            error: `Hostname exceeds maximum permitted length of ${MAX_HOSTNAME_LENGTH} characters.`,
        };
    }

    // Block command injection and shell metacharacters: ; & | ` $ > < \n \r " '
    if (/[;&|`$><\r\n\t"']/.test(clean)) {
        return {
            valid: false,
            isValid: false,
            error: `Hostname '${clean}' contains dangerous shell or control characters.`,
        };
    }

    // Permit valid hostnames (alphanumeric, dot, dash, underscore) or bracketed IPv6 literals
    const SAFE_HOST_REGEX = /^(\[[a-fA-F0-9:]+\]|[a-zA-Z0-9.\-_]+)$/;
    if (!SAFE_HOST_REGEX.test(clean)) {
        return {
            valid: false,
            isValid: false,
            error: `Invalid characters in hostname '${clean}'. Only alphanumeric characters, dots, dashes, and underscores are allowed.`,
        };
    }

    return { valid: true, isValid: true, sanitizedHost: clean };
}

/**
 * Alias for validateHostname.
 */
export const validateHost = validateHostname;

/**
 * Asserts that a hostname is valid, returning the sanitized host string or throwing SecurityValidationError.
 *
 * @param host - Host candidate
 * @param context - Optional description for error messages
 * @returns Sanitized hostname string
 * @throws SecurityValidationError
 */
export function assertValidHostname(host: unknown, context = 'Hostname'): string {
    const result = validateHostname(host);
    if (!result.valid || !result.sanitizedHost) {
        throw new SecurityValidationError('INVALID_HOSTNAME', `${context}: ${result.error || 'Invalid hostname'}`);
    }
    return result.sanitizedHost;
}

/**
 * Alias for assertValidHostname.
 */
export const assertValidHost = assertValidHostname;

// ===== Enterprise Class Wrapper =====

/**
 * Enterprise Network Dispatcher Security Service
 * Encapsulates security policies, configurable allowlists, and validation routines.
 */
export class NetDispatcherSecurity {
    private readonly defaultOptions: RequestValidationOptions;

    /**
     * @param defaultOptions - Baseline security validation options
     */
    constructor(defaultOptions: RequestValidationOptions = {}) {
        this.defaultOptions = defaultOptions;
    }

    /**
     * Validates target URL against instance baseline options and optional overrides.
     *
     * @param url - URL to validate
     * @param overrides - Optional configuration overrides
     * @returns ValidationResult
     */
    public validateRequestTarget(url: unknown, overrides?: RequestValidationOptions): ValidationResult {
        return validateRequestTarget(url, { ...this.defaultOptions, ...overrides });
    }

    /**
     * Asserts target URL is valid.
     *
     * @param url - URL to validate
     * @param overrides - Optional configuration overrides
     * @returns Parsed URL
     */
    public assertSafeRequestTarget(url: unknown, overrides?: RequestValidationOptions): URL {
        return assertSafeRequestTarget(url, { ...this.defaultOptions, ...overrides });
    }

    /**
     * Sanitizes request headers.
     *
     * @param headers - Headers map
     * @param options - Header sanitization options
     * @returns HeaderSanitizationResult
     */
    public sanitizeHeaders(
        headers?: Record<string, unknown>,
        options?: HeaderSanitizationOptions
    ): HeaderSanitizationResult {
        return validateAndSanitizeHeaders(headers, options);
    }

    /**
     * Validates port number (1-65535).
     *
     * @param port - Port candidate
     * @returns PortValidationResult
     */
    public validatePort(port: unknown): PortValidationResult {
        return validatePort(port);
    }

    /**
     * Asserts port is valid.
     *
     * @param port - Port candidate
     * @param context - Diagnostic context
     * @returns Numeric port
     */
    public assertValidPort(port: unknown, context?: string): number {
        return assertValidPort(port, context);
    }

    /**
     * Validates hostname.
     *
     * @param host - Host candidate
     * @returns HostnameValidationResult
     */
    public validateHostname(host: unknown): HostnameValidationResult {
        return validateHostname(host);
    }

    /**
     * Asserts hostname is valid.
     *
     * @param host - Host candidate
     * @param context - Diagnostic context
     * @returns Sanitized hostname
     */
    public assertValidHost(host: unknown, context?: string): string {
        return assertValidHostname(host, context);
    }
}
