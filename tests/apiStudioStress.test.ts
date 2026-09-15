/**
 * Comprehensive Adversarial Stress Test Suite for API Studio
 * Target: src/renderer/src/utils/curlParser.ts
 *         src/renderer/src/utils/envInterpolator.ts
 * Auditor: Challenger 1 (Empirical Challenger)
 * Sprint: NexusHub Enterprise Sprint Iteration 2
 */

import { describe, it, expect } from 'vitest'
import {
  tokenizeCommandLine,
  parseCurlCommand,
  exportToCurl,
  ParsedRequest,
} from '../src/renderer/src/utils/curlParser'
import {
  interpolateEnv,
  interpolateString,
  extractVariables,
  getUnresolvedVariables,
  interpolateRequest,
  interpolateKeyValuePairs,
  interpolateHeaderRecord,
  buildQueryString,
} from '../src/renderer/src/utils/envInterpolator'

describe('Adversarial Stress Suite � cURL Parser & Serializer', () => {
  // 1. Malformed and Empty Inputs
  describe('Malformed and Boundary Inputs', () => {
    it('should throw on empty string', () => {
      expect(() => parseCurlCommand('')).toThrow('Cannot parse empty cURL command.')
    })

    it('should throw on whitespace-only command', () => {
      expect(() => parseCurlCommand('   \t\n  ')).toThrow('Cannot parse empty cURL command.')
    })

    it('should throw when command contains no URL', () => {
      expect(() => parseCurlCommand('curl')).toThrow('cURL command did not contain a target URL.')
      expect(() => parseCurlCommand('curl -X POST -H "Content-Type: application/json"')).toThrow(
        'cURL command did not contain a target URL.'
      )
      expect(() => parseCurlCommand('curl -d "name=nexus"')).toThrow(
        'cURL command did not contain a target URL.'
      )
    })

    it('should handle /usr/bin/curl or other executable path prefixes', () => {
      const parsed = parseCurlCommand('/usr/bin/curl https://api.enterprise.com/v1')
      expect(parsed.url).toBe('https://api.enterprise.com/v1')
      expect(parsed.method).toBe('GET')
    })

    it('should auto-prefix https:// when URL protocol is missing', () => {
      const parsed = parseCurlCommand('curl api.enterprise.com/v1/health')
      expect(parsed.url).toBe('https://api.enterprise.com/v1/health')
    })

    it('should preserve http:// schema when explicitly provided', () => {
      const parsed = parseCurlCommand('curl http://internal.local:8080/metrics')
      expect(parsed.url).toBe('http://internal.local:8080/metrics')
    })

    it('should handle missing flag arguments without throwing uncaught exceptions', () => {
      // Dangling -X
      const parsedX = parseCurlCommand('curl https://api.enterprise.com -X')
      expect(parsedX.method).toBe('GET')

      // Dangling -H
      const parsedH = parseCurlCommand('curl https://api.enterprise.com -H')
      expect(parsedH.headers).toEqual({})

      // Dangling -d
      const parsedD = parseCurlCommand('curl https://api.enterprise.com -d')
      expect(parsedD.body).toBeUndefined()

      // Dangling -u
      const parsedU = parseCurlCommand('curl https://api.enterprise.com -u')
      expect(parsedU.auth?.type).toBe('none')

      // Dangling --url
      const parsedUrl = parseCurlCommand('curl https://api.enterprise.com --url')
      expect(parsedUrl.url).toBe('https://api.enterprise.com')
    })
  })

  // 2. Multi-line, Backslash Chains, Whitespace Variations
  describe('Multi-line Backslash Chains & Whitespace', () => {
    it('should parse Linux-style multi-line continuation chains (\\n)', () => {
      const cmd = `curl \\
        -X POST \\
        https://api.enterprise.com/v1/data \\
        -H "Accept: application/json" \\
        -H "Content-Type: application/json" \\
        -d '{"status": "active"}'`

      const parsed = parseCurlCommand(cmd)
      expect(parsed.method).toBe('POST')
      expect(parsed.url).toBe('https://api.enterprise.com/v1/data')
      expect(parsed.headers['Accept']).toBe('application/json')
      expect(parsed.headers['Content-Type']).toBe('application/json')
      expect(parsed.body).toBe('{"status": "active"}')
    })

    it('should parse Windows CRLF multi-line continuation chains (\\r\\n)', () => {
      const cmd = "curl \\\r\n  -X PUT \\\r\n  https://api.enterprise.com/update \\\r\n  -d 'refresh=true'"
      const parsed = parseCurlCommand(cmd)
      expect(parsed.method).toBe('PUT')
      expect(parsed.url).toBe('https://api.enterprise.com/update')
      expect(parsed.body).toBe('refresh=true')
    })

    it('should tolerate multiple blank lines and irregular spacing between tokens', () => {
      const cmd = `curl   \n\n\n   https://api.enterprise.com/status   \n\n   -X   DELETE`
      const parsed = parseCurlCommand(cmd)
      expect(parsed.method).toBe('DELETE')
      expect(parsed.url).toBe('https://api.enterprise.com/status')
    })

    it('should parse deep multi-line chains with 10+ lines', () => {
      const lines = [
        'curl \\',
        '  -X POST \\',
        '  https://api.enterprise.com/bulk \\',
        '  -H "X-Header-1: val1" \\',
        '  -H "X-Header-2: val2" \\',
        '  -H "X-Header-3: val3" \\',
        '  -H "X-Header-4: val4" \\',
        '  -H "X-Header-5: val5" \\',
        '  -d "chunk1=a" \\',
        '  -d "chunk2=b"',
      ]
      const parsed = parseCurlCommand(lines.join('\n'))
      expect(parsed.method).toBe('POST')
      expect(Object.keys(parsed.headers).length).toBe(5)
      expect(parsed.body).toBe('chunk1=a&chunk2=b')
    })
  })

  // 3. Quotes, Escaping, and Complex JSON Payloads
  describe('Quotes, Escaping, and Payloads', () => {
    it('should parse nested double and single quotes inside JSON body', () => {
      // In bash: -d '{"quote": "She said \"Yes\"", "single": "it'\''s fine"}'
      const cmd = `curl -X POST https://api.enterprise.com/echo -d '{"quote": "She said \\"Yes\\"", "single": "it'\\''s fine"}'`
      const parsed = parseCurlCommand(cmd)
      expect(parsed.body).toBe(`{"quote": "She said \\"Yes\\"", "single": "it's fine"}`)
    })

    it('should preserve unicode, escaped slashes, and special symbols in payload', () => {
      const rawPayload = JSON.stringify({
        path: 'C:\\\\Program Files\\\\NexusHub',
        emojis: '? NexusHub ?? 2026',
        special: '<>&"\'`',
      })
      const escaped = rawPayload.replace(/'/g, "'\\''");
      const cmd = `curl -X POST https://api.enterprise.com/symbols -d '${escaped}'`
      const parsed = parseCurlCommand(cmd)
      expect(parsed.body).toBe(rawPayload)
    })

    it('should join multiple -d or --data chunks with & for urlencoded forms', () => {
      const cmd = 'curl https://api.enterprise.com/form -d "a=1" --data "b=2" --data "c=3"'
      const parsed = parseCurlCommand(cmd)
      expect(parsed.method).toBe('POST')
      expect(parsed.body).toBe('a=1&b=2&c=3')
    })

    it('should keep single -d chunk as-is without appending &', () => {
      const cmd = 'curl https://api.enterprise.com/form -d "single=param"'
      const parsed = parseCurlCommand(cmd)
      expect(parsed.body).toBe('single=param')
    })
  })

  // 4. Unusual Flags and Flag Variations
  describe('Unusual and Condensed Flags', () => {
    it('should parse --data-raw flag', () => {
      const cmd = `curl https://api.enterprise.com/raw --data-raw '{"raw": true}'`
      const parsed = parseCurlCommand(cmd)
      expect(parsed.method).toBe('POST')
      expect(parsed.body).toBe('{"raw": true}')
    })

    it('should parse --data-binary flag', () => {
      const cmd = `curl https://api.enterprise.com/bin --data-binary '@archive.tar.gz'`
      const parsed = parseCurlCommand(cmd)
      expect(parsed.method).toBe('POST')
      expect(parsed.body).toBe('@archive.tar.gz')
    })

    it('should parse --data-ascii flag', () => {
      const cmd = `curl https://api.enterprise.com/ascii --data-ascii 'sample_ascii_data'`
      const parsed = parseCurlCommand(cmd)
      expect(parsed.method).toBe('POST')
      expect(parsed.body).toBe('sample_ascii_data')
    })

    it('should parse condensed method flags: -XPOST, -XPUT, -XDELETE, -XPATCH', () => {
      expect(parseCurlCommand('curl -XPOST https://api.enterprise.com').method).toBe('POST')
      expect(parseCurlCommand('curl -XPUT https://api.enterprise.com').method).toBe('PUT')
      expect(parseCurlCommand('curl -XDELETE https://api.enterprise.com').method).toBe('DELETE')
      expect(parseCurlCommand('curl -XPATCH https://api.enterprise.com').method).toBe('PATCH')
    })

    it('should parse condensed data flag: -d"body"', () => {
      const parsed = parseCurlCommand('curl -d"name=john&role=admin" https://api.enterprise.com')
      expect(parsed.method).toBe('POST')
      expect(parsed.body).toBe('name=john&role=admin')
    })

    it('should parse condensed basic auth flag: -u"user:pass"', () => {
      const parsed = parseCurlCommand('curl -u"superuser:secret123" https://api.enterprise.com')
      expect(parsed.auth?.type).toBe('basic')
      expect(parsed.auth?.username).toBe('superuser')
      expect(parsed.auth?.password).toBe('secret123')
    })

    it('should parse -I and --head as HEAD method', () => {
      expect(parseCurlCommand('curl -I https://api.enterprise.com').method).toBe('HEAD')
      expect(parseCurlCommand('curl --head https://api.enterprise.com').method).toBe('HEAD')
    })

    // CHALLENGE EMPIRICAL PROBES: Condensed and Long Flags
    it('DEFECT 1: should parse condensed -H"Header: Value" without space', () => {
      const cmd = 'curl -H"Content-Type: application/json" -H"X-Custom-Token: secret456" https://api.enterprise.com'
      const parsed = parseCurlCommand(cmd)

      // In curlParser.ts line 158, only exact matches `token === '-H' || token === '--header'` are handled.
      // startsWith('-H') is missing, causing tokens like '-HContent-Type: application/json' to be dropped.
      expect(parsed.headers['Content-Type']).toBe('application/json')
    })

    it('DEFECT 2: should parse GNU long flag with equals --header="Header: Value"', () => {
      const cmd = 'curl --header="Content-Type: application/json" https://api.enterprise.com'
      const parsed = parseCurlCommand(cmd)
      expect(parsed.headers['Content-Type']).toBe('application/json')
    })

    it('DEFECT 3: should parse GNU long flag with equals --data="payload"', () => {
      const cmd = 'curl https://api.enterprise.com --data="key=val"'
      const parsed = parseCurlCommand(cmd)
      expect(parsed.body).toBe('key=val')
      expect(parsed.method).toBe('POST')
    })

    it('DEFECT 4: should parse GNU long flag with equals --url="https://..."', () => {
      const cmd = 'curl --url="https://api.enterprise.com"'
      const parsed = parseCurlCommand(cmd)
      expect(parsed.url).toBe('https://api.enterprise.com')
    })
  })

  // 5. Query Parameters and URL Parsing
  describe('Query Parameters Extraction', () => {
    it('should extract query parameters into queryParams dictionary', () => {
      const cmd = 'curl "https://api.enterprise.com/query?q=search&sort=desc&page=2"'
      const parsed = parseCurlCommand(cmd)
      expect(parsed.queryParams).toEqual({
        q: 'search',
        sort: 'desc',
        page: '2',
      })
    })

    it('should parse URL with URL-encoded query characters', () => {
      const cmd = 'curl "https://api.enterprise.com/filter?term=hello%20world&flag=%2B"'
      const parsed = parseCurlCommand(cmd)
      expect(parsed.queryParams?.['term']).toBe('hello world')
      expect(parsed.queryParams?.['flag']).toBe('+')
    })
  })

  // 6. Serializer & Round-trip Consistency
  describe('cURL Serializer & Round-Trip', () => {
    it('should serialize basic request to single-line cURL when multiline is false', () => {
      const req: ParsedRequest = {
        url: 'https://api.enterprise.com/v1/status',
        method: 'GET',
        headers: { 'X-Status-Check': '1' },
      }
      const curl = exportToCurl(req, false)
      expect(curl).toBe('curl -X GET "https://api.enterprise.com/v1/status" -H "X-Status-Check: 1"')
    })

    it('should serialize request to formatted multi-line cURL when multiline is true', () => {
      const req: ParsedRequest = {
        url: 'https://api.enterprise.com/v1/items',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"name": "test"}',
      }
      const curl = exportToCurl(req, true)
      expect(curl).toContain('curl -X POST "https://api.enterprise.com/v1/items" \\\n  -H "Content-Type: application/json"')
      expect(curl).toContain(`-d '{"name": "test"}'`)
    })

    it('should throw error when exportToCurl is called with missing or invalid URL', () => {
      expect(() => exportToCurl({ url: '', method: 'GET', headers: {} })).toThrow(
        'Cannot export request with missing target URL.'
      )
      expect(() => exportToCurl(null as any)).toThrow(
        'Cannot export request with missing target URL.'
      )
    })

    it('should preserve single quotes in body during export-to-curl and re-parse', () => {
      const original: ParsedRequest = {
        url: 'https://api.enterprise.com/test',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: `{"name": "O'Connor", "text": "It's working"}`,
      }
      const exported = exportToCurl(original)
      const reParsed = parseCurlCommand(exported)

      expect(reParsed.method).toBe(original.method)
      expect(reParsed.url).toBe(original.url)
      expect(reParsed.headers['Content-Type']).toBe('application/json')
      expect(reParsed.body).toBe(original.body)
    })

    it('should preserve Bearer token auth in round-trip', () => {
      const original: ParsedRequest = {
        url: 'https://api.enterprise.com/auth-check',
        method: 'GET',
        headers: {},
        auth: {
          type: 'bearer',
          bearerToken: 'eyJhGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0',
        },
      }
      const exported = exportToCurl(original)
      const reParsed = parseCurlCommand(exported)

      expect(reParsed.auth?.type).toBe('bearer')
      expect(reParsed.auth?.bearerToken).toBe(original.auth?.bearerToken)
    })

    it('should preserve Basic auth in round-trip', () => {
      const original: ParsedRequest = {
        url: 'https://api.enterprise.com/basic-check',
        method: 'GET',
        headers: {},
        auth: {
          type: 'basic',
          basicUser: 'adminUser',
          basicPass: 'strongPassword!@#',
        },
      }
      const exported = exportToCurl(original)
      const reParsed = parseCurlCommand(exported)

      expect(reParsed.auth?.type).toBe('basic')
      expect(reParsed.auth?.basicUser).toBe('adminUser')
      expect(reParsed.auth?.basicPass).toBe('strongPassword!@#')
    })
  })
})

describe('Adversarial Stress Suite � Environment Interpolator', () => {
  const env: Record<string, string> = {
    domain: 'api.nexushub.io',
    apiVersion: 'v2',
    port: '8080',
    'api-key': 'sec_enterprise_key_99',
    'app.version': '2.4.1',
    _db_prefix: 'tst_',
    zero: '0',
    blank: '',
  }

  // 1. Unclosed and Malformed Braces
  describe('Unclosed and Malformed Braces', () => {
    it('should leave unclosed braces intact without throwing or hanging', () => {
      expect(interpolateEnv('{{domain', env)).toBe('{{domain')
      expect(interpolateEnv('https://{{domain/items', env)).toBe('https://{{domain/items')
      expect(interpolateEnv('{{ incomplete variable name', env)).toBe('{{ incomplete variable name')
      expect(interpolateEnv('pre {{ unclosed post', env)).toBe('pre {{ unclosed post')
    })

    it('should ignore single braces and triple braces appropriately', () => {
      expect(interpolateEnv('{domain}', env)).toBe('{domain}')
      // In {{{domain}}}, the {{domain}} is substituted, leaving {api.nexushub.io}
      expect(interpolateEnv('{{{domain}}}', env)).toBe('{api.nexushub.io}')
    })

    it('should not throw on non-string inputs', () => {
      expect(interpolateEnv(null as any, env)).toBe('')
      expect(interpolateEnv(undefined as any, env)).toBe('')
      expect(interpolateEnv(12345 as any, env)).toBe('')
      expect(interpolateEnv({} as any, env)).toBe('')
      expect(interpolateEnv([] as any, env)).toBe('')
    })
  })

  // 2. Whitespace Variations
  describe('Whitespace Handling inside Placeholders', () => {
    it('should tolerate arbitrary whitespace around variable name inside braces', () => {
      expect(interpolateEnv('{{domain}}', env)).toBe('api.nexushub.io')
      expect(interpolateEnv('{{  domain  }}', env)).toBe('api.nexushub.io')
      expect(interpolateEnv('{{\tdomain\t}}', env)).toBe('api.nexushub.io')
      expect(interpolateEnv('{{\ndomain\n}}', env)).toBe('api.nexushub.io')
      expect(interpolateEnv('{{ \r\n domain \r\n }}', env)).toBe('api.nexushub.io')
    })

    it('should NOT match when whitespace occurs inside the variable identifier itself', () => {
      expect(interpolateEnv('{{ domain name }}', env)).toBe('{{ domain name }}')
    })
  })

  // 3. Nested Braces and Adjoining Braces
  describe('Nested and Adjoining Braces', () => {
    it('should safely interpolate quadruple braces {{{{var}}}}', () => {
      const result = interpolateEnv('{{{{domain}}}}', env)
      expect(result).toBe('{{api.nexushub.io}}')
    })

    it('should interpolate adjoining placeholders correctly', () => {
      const result = interpolateEnv('https://{{domain}}:{{port}}/{{apiVersion}}', env)
      expect(result).toBe('https://api.nexushub.io:8080/v2')
    })
  })

  // 4. Special Characters in Variable Names
  describe('Variable Names with Hyphens, Dots, Underscores', () => {
    it('should match and interpolate variable names containing hyphens, dots, and underscores', () => {
      expect(interpolateEnv('{{api-key}}', env)).toBe('sec_enterprise_key_99')
      expect(interpolateEnv('{{app.version}}', env)).toBe('2.4.1')
      expect(interpolateEnv('{{_db_prefix}}users', env)).toBe('tst_users')
    })

    it('should extract all unique variable names with hyphens, dots, and underscores', () => {
      const template = '{{api-key}} + {{app.version}} + {{_db_prefix}} + {{domain}} + {{domain}}'
      const vars = extractVariables(template)
      expect(vars).toEqual(['api-key', 'app.version', '_db_prefix', 'domain'])
    })
  })

  // 5. Missing Variables and Fallbacks
  describe('Missing Variables and Fallback Options', () => {
    it('should leave missing variables intact when keepUnresolved is true (default)', () => {
      expect(interpolateEnv('{{missingVar}}', env)).toBe('{{missingVar}}')
      expect(interpolateEnv('{{missingVar}}', env, { keepUnresolved: true })).toBe('{{missingVar}}')
    })

    it('should replace missing variables with empty string when keepUnresolved is false', () => {
      expect(interpolateEnv('{{missingVar}}', env, { keepUnresolved: false })).toBe('')
    })

    it('should replace missing variables with custom fallbackValue', () => {
      const res = interpolateEnv('Val: {{missingVar}}', env, {
        keepUnresolved: false,
        fallbackValue: '[MISSING]',
      })
      expect(res).toBe('Val: [MISSING]')
    })

    it('should accurately report unresolved variables in getUnresolvedVariables', () => {
      const template = '{{domain}}/{{missingOne}}?k={{api-key}}&opt={{missingTwo}}'
      const unresolved = getUnresolvedVariables(template, env)
      expect(unresolved).toEqual(['missingOne', 'missingTwo'])
    })
  })

  // 6. Non-String and Falsy Values in Environment
  describe('Non-String & Falsy Values in Environment', () => {
    it('should preserve string "0" and numeric 0 instead of treating as empty or null', () => {
      expect(interpolateEnv('Count: {{zero}}', env)).toBe('Count: 0')
      expect(interpolateEnv('Count: {{numZero}}', { numZero: 0 as any })).toBe('Count: 0')
    })

    it('should coerce numbers, booleans, and null/undefined safely', () => {
      const weirdEnv: Record<string, any> = {
        num: 42,
        boolTrue: true,
        boolFalse: false,
        nullVal: null,
        undefVal: undefined,
      }
      expect(interpolateEnv('{{num}}', weirdEnv)).toBe('42')
      expect(interpolateEnv('{{boolTrue}}', weirdEnv)).toBe('true')
      expect(interpolateEnv('{{boolFalse}}', weirdEnv)).toBe('false')
      expect(interpolateEnv('{{nullVal}}', weirdEnv)).toBe('')
      expect(interpolateEnv('{{undefVal}}', weirdEnv)).toBe('')
    })
  })

  // 7. Circular Reference and Recursion Protection
  describe('Circular Reference & Recursion Protection', () => {
    it('should be immune to infinite recursion on circular reference variables', () => {
      const circularEnv: Record<string, string> = {
        a: '{{b}}',
        b: '{{a}}',
      }
      const start = Date.now()
      const result = interpolateEnv('{{a}}', circularEnv)
      const durationMs = Date.now() - start

      expect(durationMs).toBeLessThan(50)
      // Single-pass expansion replaces {{a}} with {{b}} and safely halts
      expect(result).toBe('{{b}}')
    })

    it('should be immune to self-referential variable expansion', () => {
      const selfRefEnv: Record<string, string> = {
        loop: '{{loop}}',
      }
      const result = interpolateEnv('{{loop}}', selfRefEnv)
      expect(result).toBe('{{loop}}')
    })
  })

  // 8. Request & Object Structure Interpolation
  describe('Request & Structural Interpolation', () => {
    it('should interpolate full request object (URL, headers, body)', () => {
      const req = {
        url: 'https://{{domain}}/{{apiVersion}}/data',
        headers: {
          Authorization: 'Bearer {{api-key}}',
          'X-App-Version': '{{app.version}}',
        },
        body: '{"target": "{{domain}}"}',
      }
      const interpolated = interpolateRequest(req, env)
      expect(interpolated.url).toBe('https://api.nexushub.io/v2/data')
      expect(interpolated.headers?.Authorization).toBe('Bearer sec_enterprise_key_99')
      expect(interpolated.headers?.['X-App-Version']).toBe('2.4.1')
      expect(interpolated.body).toBe('{"target": "api.nexushub.io"}')
    })

    it('should interpolate key-value pairs while respecting enabled flag', () => {
      const pairs = [
        { key: 'Host', value: '{{domain}}', enabled: true },
        { key: 'Disabled', value: '{{api-key}}', enabled: false },
      ]
      const interpolated = interpolateKeyValuePairs(pairs, env)
      expect(interpolated[0].value).toBe('api.nexushub.io')
      expect(interpolated[1].enabled).toBe(false)
    })

    it('should interpolate plain headers record', () => {
      const headers = { 'X-Key': '{{api-key}}', 'X-Version': '{{app.version}}' }
      const res = interpolateHeaderRecord(headers, env)
      expect(res['X-Key']).toBe('sec_enterprise_key_99')
      expect(res['X-Version']).toBe('2.4.1')
    })

    it('should build query string with proper URL encoding and env interpolation', () => {
      const params = [
        { key: 'host', value: '{{domain}}', enabled: true },
        { key: 'skip', value: 'yes', enabled: false },
      ]
      const qs = buildQueryString(params, env)
      expect(qs).toBe('?host=api.nexushub.io')
    })
  })
})
