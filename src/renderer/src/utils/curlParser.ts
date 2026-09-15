/*
 Copyright 2025 Lee Boonstra

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
*/

/**
 * @file curlParser.ts
 * @description Enterprise cURL command parser and serializer for NexusHub API Studio.
 * Parses multi-line bash cURL commands into structured HTTP request objects and
 * converts structured requests back into valid, copyable cURL strings.
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'

export interface RequestAuth {
  type: 'none' | 'bearer' | 'basic' | 'apikey'
  token?: string
  bearerToken?: string
  username?: string
  basicUser?: string
  password?: string
  basicPass?: string
  key?: string
  value?: string
  addTo?: 'header' | 'query'
}

export interface ParsedRequest {
  url: string
  method: HttpMethod
  headers: Record<string, string>
  body?: string
  auth?: RequestAuth
  queryParams?: Record<string, string>
}

/**
 * Tokenizes a bash-like command line string respecting single/double quotes
 * and escaped characters.
 *
 * @param {string} command - Raw bash command string.
 * @returns {string[]} Array of parsed argument tokens.
 */
export function tokenizeCommandLine(command: string): string[] {
  // Normalize multi-line continuation backslashes followed by newline
  const normalized = command
    .replace(/\\\r?\n/g, ' ')
    .replace(/[\r\n]+/g, ' ')
    .trim()

  const tokens: string[] = []
  let current = ''
  let inSingleQuote = false
  let inDoubleQuote = false
  let isEscaped = false

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i]

    if (isEscaped) {
      current += char
      isEscaped = false
      continue
    }

    if (char === '\\' && !inSingleQuote) {
      isEscaped = true
      continue
    }

    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote
      continue
    }

    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote
      continue
    }

    if (/\s/.test(char) && !inSingleQuote && !inDoubleQuote) {
      if (current.length > 0) {
        tokens.push(current)
        current = ''
      }
      continue
    }

    current += char
  }

  if (current.length > 0) {
    tokens.push(current)
  }

  return tokens
}

/**
 * Parses a cURL bash command string into a structured ParsedRequest object.
 *
 * @param {string} rawCommand - The input cURL command string.
 * @returns {ParsedRequest} The structured request object.
 * @throws {Error} If the command is empty or missing a valid target URL.
 */
export function parseCurlCommand(rawCommand: string): ParsedRequest {
  if (!rawCommand || !rawCommand.trim()) {
    throw new Error('Cannot parse empty cURL command.')
  }

  const rawTokens = tokenizeCommandLine(rawCommand)
  if (rawTokens.length === 0) {
    throw new Error('No tokens found in cURL command.')
  }

  // Preprocess tokens to normalize GNU long flags with '=' and attached short flags
  const tokens: string[] = []
  for (const token of rawTokens) {
    // 1. GNU long options with '=' (e.g. --header=..., --data=..., --url=..., etc.)
    if (token.startsWith('--') && token.includes('=')) {
      const eqIndex = token.indexOf('=')
      const flag = token.slice(0, eqIndex)
      const value = token.slice(eqIndex + 1)
      tokens.push(flag, value)
      continue
    }

    // 2. Attached short options (e.g. -H"...", -d"...", -u"...", -XPOST, -X"POST")
    if (!token.startsWith('--')) {
      if (
        token.startsWith('-H') ||
        token.startsWith('-d') ||
        token.startsWith('-u') ||
        token.startsWith('-X')
      ) {
        if (token.length > 2) {
          const flag = token.slice(0, 2)
          let value = token.slice(2)
          if (value.startsWith('=')) {
            value = value.slice(1)
          }
          tokens.push(flag, value)
          continue
        }
      }
    }

    tokens.push(token)
  }

  let explicitMethod: HttpMethod | null = null
  let targetUrl = ''
  const headers: Record<string, string> = {}
  const dataChunks: string[] = []
  let basicAuthStr: string | null = null

  // Skip leading 'curl' or executable alias if present
  let startIndex = 0
  if (tokens[0].toLowerCase() === 'curl' || tokens[0].endsWith('/curl')) {
    startIndex = 1
  }

  for (let i = startIndex; i < tokens.length; i++) {
    const token = tokens[i]

    // 1. Method Flag: -X or --request or -I / --head
    if (token === '-I' || token === '--head') {
      explicitMethod = 'HEAD'
      continue
    }
    if (token === '-X' || token === '--request') {
      if (i + 1 < tokens.length) {
        explicitMethod = tokens[++i].toUpperCase() as HttpMethod
      }
      continue
    }
    if (token.startsWith('-X') && token.length > 2) {
      const val = token.startsWith('-X=') ? token.slice(3) : token.slice(2)
      explicitMethod = val.replace(/^['"]|['"]$/g, '').toUpperCase() as HttpMethod
      continue
    }
    if (token.startsWith('--request=')) {
      const val = token.slice(10).replace(/^['"]|['"]$/g, '')
      explicitMethod = val.toUpperCase() as HttpMethod
      continue
    }

    // 2. Header Flag: -H or --header
    if (token === '-H' || token === '--header') {
      if (i + 1 < tokens.length) {
        const headerStr = tokens[++i]
        const colonIndex = headerStr.indexOf(':')
        if (colonIndex > 0) {
          const key = headerStr.slice(0, colonIndex).trim()
          const value = headerStr.slice(colonIndex + 1).trim()
          headers[key] = value
        }
      }
      continue
    }
    if (token.startsWith('-H') && token.length > 2) {
      const headerStr = token.startsWith('-H=') ? token.slice(3) : token.slice(2)
      const colonIndex = headerStr.indexOf(':')
      if (colonIndex > 0) {
        const key = headerStr.slice(0, colonIndex).trim()
        const value = headerStr.slice(colonIndex + 1).trim()
        headers[key] = value
      }
      continue
    }
    if (token.startsWith('--header=')) {
      const headerStr = token.slice(9)
      const colonIndex = headerStr.indexOf(':')
      if (colonIndex > 0) {
        const key = headerStr.slice(0, colonIndex).trim()
        const value = headerStr.slice(colonIndex + 1).trim()
        headers[key] = value
      }
      continue
    }

    // 3. Data / Body Flags: -d, --data, --data-raw, --data-ascii, --data-binary, --data-urlencode
    if (
      token === '-d' ||
      token === '--data' ||
      token === '--data-raw' ||
      token === '--data-ascii' ||
      token === '--data-binary' ||
      token === '--data-urlencode'
    ) {
      if (i + 1 < tokens.length) {
        dataChunks.push(tokens[++i])
      }
      continue
    }
    if (
      token.startsWith('--data=') ||
      token.startsWith('--data-raw=') ||
      token.startsWith('--data-ascii=') ||
      token.startsWith('--data-binary=') ||
      token.startsWith('--data-urlencode=')
    ) {
      const eqIdx = token.indexOf('=')
      dataChunks.push(token.slice(eqIdx + 1))
      continue
    }
    if (token.startsWith('-d') && !token.startsWith('--') && token.length > 2) {
      const val = token.startsWith('-d=') ? token.slice(3) : token.slice(2)
      dataChunks.push(val)
      continue
    }

    // 4. Basic Auth Flag: -u or --user
    if (token === '-u' || token === '--user') {
      if (i + 1 < tokens.length) {
        basicAuthStr = tokens[++i]
      }
      continue
    }
    if (token.startsWith('--user=')) {
      basicAuthStr = token.slice(7)
      continue
    }
    if (token.startsWith('-u') && token.length > 2) {
      basicAuthStr = token.startsWith('-u=') ? token.slice(3) : token.slice(2)
      continue
    }

    // 5. Target URL Flag: --url
    if (token === '--url') {
      if (i + 1 < tokens.length) {
        const nextVal = tokens[++i].replace(/^['"]|['"]$/g, '')
        if (nextVal) {
          targetUrl = nextVal
        }
      }
      continue
    }
    if (token.startsWith('--url=')) {
      const val = token.slice(6).replace(/^['"]|['"]$/g, '')
      if (val) {
        targetUrl = val
      }
      continue
    }

    // 6. Positional URL argument (does not start with '-')
    if (!token.startsWith('-') && !targetUrl) {
      // Clean surrounding quotes if any remain
      targetUrl = token.replace(/^['"]|['"]$/g, '')
      continue
    }
  }

  if (!targetUrl) {
    throw new Error('cURL command did not contain a target URL.')
  }

  // Ensure URL protocol defaults to https:// if missing
  if (!/^https?:\/\//i.test(targetUrl)) {
    targetUrl = `https://${targetUrl}`
  }

  // Parse query params from URL
  const queryParams: Record<string, string> = {}
  try {
    const urlObj = new URL(targetUrl)
    urlObj.searchParams.forEach((val, key) => {
      queryParams[key] = val
    })
  } catch {
    // Keep targetUrl as-is if URL constructor encounters non-standard schema
  }

  // Determine body
  let body: string | undefined
  if (dataChunks.length > 0) {
    // If multiple -d chunks, join with & unless single chunk is JSON
    if (dataChunks.length === 1) {
      body = dataChunks[0]
    } else {
      body = dataChunks.join('&')
    }
  }

  // Infer Method: if data present without explicit method, default to POST; else GET
  let method: HttpMethod = 'GET'
  if (explicitMethod) {
    method = explicitMethod
  } else if (body !== undefined) {
    method = 'POST'
  }

  // Process Authentication
  let auth: RequestAuth = { type: 'none' }

  if (basicAuthStr) {
    const [user, ...passParts] = basicAuthStr.split(':')
    const pass = passParts.join(':')
    auth = {
      type: 'basic',
      username: user || '',
      basicUser: user || '',
      password: pass || '',
      basicPass: pass || '',
    }
    // Set Authorization header if not manually provided
    if (!headers['Authorization'] && !headers['authorization']) {
      const base64 = Buffer.from(`${auth.username}:${auth.password}`).toString('base64')
      headers['Authorization'] = `Basic ${base64}`
    }
  } else {
    // Check Authorization header for Bearer or Basic
    const authHeader = headers['Authorization'] || headers['authorization']
    if (authHeader) {
      if (authHeader.startsWith('Bearer ')) {
        const token = authHeader.slice(7).trim()
        auth = {
          type: 'bearer',
          token,
          bearerToken: token,
        }
      } else if (authHeader.startsWith('Basic ')) {
        const decoded = Buffer.from(authHeader.slice(6).trim(), 'base64').toString('utf8')
        const [u, ...p] = decoded.split(':')
        const pass = p.join(':')
        auth = {
          type: 'basic',
          username: u || '',
          basicUser: u || '',
          password: pass || '',
          basicPass: pass || '',
        }
      }
    }
  }

  return {
    url: targetUrl,
    method,
    headers,
    body,
    auth,
    queryParams,
  }
}

/**
 * Serializes a ParsedRequest object into a clean, reproducible cURL command string.
 *
 * @param {ParsedRequest} request - The request configuration to serialize.
 * @param {boolean} [multiline=true] - Whether to format across multiple lines with backslashes.
 * @returns {string} The valid cURL command.
 */
export function exportToCurl(request: ParsedRequest, multiline: boolean = true): string {
  if (!request || !request.url) {
    throw new Error('Cannot export request with missing target URL.')
  }

  const delim = multiline ? ' \\\n  ' : ' '
  const method = request.method || 'GET'
  const headers: Record<string, string> = { ...(request.headers || {}) }

  // Sync auth into headers or arguments
  if (request.auth?.type === 'bearer' && (request.auth.bearerToken || request.auth.token)) {
    if (!headers['Authorization'] && !headers['authorization']) {
      headers['Authorization'] = `Bearer ${request.auth.bearerToken || request.auth.token}`
    }
  }

  const firstLine = `curl -X ${method} "${request.url}"`
  const parts: string[] = [firstLine]

  if (request.auth?.type === 'basic' && (request.auth.basicUser || request.auth.username)) {
    const u = request.auth.basicUser || request.auth.username
    const p = request.auth.basicPass || request.auth.password || ''
    parts.push(`-u "${u}:${p}"`)
  }

  // Headers
  for (const [key, value] of Object.entries(headers)) {
    if (value !== undefined && value !== null) {
      parts.push(`-H "${key}: ${value.replace(/"/g, '\\"')}"`)
    }
  }

  // Body
  if (request.body && method !== 'GET' && method !== 'HEAD') {
    // Single-quote the body to avoid bash variable expansion issues
    const escapedBody = request.body.replace(/'/g, "'\\''")
    parts.push(`-d '${escapedBody}'`)
  }

  return parts.join(delim)
}

/** Backward compatibility aliases */
export const parseCurl = parseCurlCommand
export const tokenizeBashCommand = tokenizeCommandLine
export type ParsedCurlRequest = ParsedRequest
