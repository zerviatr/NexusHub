/**
 * Unit Tests for API Studio cURL Parser & Serializer
 */

import { describe, it, expect } from 'vitest'
import {
  tokenizeBashCommand,
  parseCurl,
  exportToCurl,
} from '../src/renderer/src/utils/curlParser'

describe('API Studio - cURL Parser & Serializer', () => {
  it('should tokenize bash commands with single and double quotes and escaped chars', () => {
    const cmd = `curl -X POST "https://api.example.com/v1" \\\n  -H 'Content-Type: application/json' \\\n  -d '{"name": "Nexus Hub"}'`
    const tokens = tokenizeBashCommand(cmd)

    expect(tokens).toContain('curl')
    expect(tokens).toContain('-X')
    expect(tokens).toContain('POST')
    expect(tokens).toContain('https://api.example.com/v1')
    expect(tokens).toContain('-H')
    expect(tokens).toContain('Content-Type: application/json')
    expect(tokens).toContain('-d')
    expect(tokens).toContain('{"name": "Nexus Hub"}')
  })

  it('should parse a simple GET cURL command', () => {
    const cmd = 'curl "https://jsonplaceholder.typicode.com/todos/1"'
    const parsed = parseCurl(cmd)

    expect(parsed.method).toBe('GET')
    expect(parsed.url).toBe('https://jsonplaceholder.typicode.com/todos/1')
    expect(parsed.headers).toEqual({})
    expect(parsed.body).toBeUndefined()
    expect(parsed.auth.type).toBe('none')
  })

  it('should parse a POST request with headers, body, and Bearer token', () => {
    const cmd = `curl -X POST "https://api.example.com/items" \\
      -H "Authorization: Bearer secret_jwt_token_456" \\
      -H "Content-Type: application/json" \\
      -d '{"sku": "NX-900", "price": 49.99}'`

    const parsed = parseCurl(cmd)

    expect(parsed.method).toBe('POST')
    expect(parsed.url).toBe('https://api.example.com/items')
    expect(parsed.headers['Content-Type']).toBe('application/json')
    expect(parsed.body).toBe('{"sku": "NX-900", "price": 49.99}')
    expect(parsed.auth.type).toBe('bearer')
    expect(parsed.auth.bearerToken).toBe('secret_jwt_token_456')
  })

  it('should parse basic auth flag -u user:pass', () => {
    const cmd = 'curl -u "admin:matrixPass99" -X GET https://api.internal/stats'
    const parsed = parseCurl(cmd)

    expect(parsed.method).toBe('GET')
    expect(parsed.url).toBe('https://api.internal/stats')
    expect(parsed.auth.type).toBe('basic')
    expect(parsed.auth.basicUser).toBe('admin')
    expect(parsed.auth.basicPass).toBe('matrixPass99')
  })

  it('should auto-infer POST method when --data is provided without explicit -X', () => {
    const cmd = 'curl https://api.example.com/submit --data "param1=val1&param2=val2"'
    const parsed = parseCurl(cmd)

    expect(parsed.method).toBe('POST')
    expect(parsed.url).toBe('https://api.example.com/submit')
    expect(parsed.body).toBe('param1=val1&param2=val2')
  })

  it('should parse -I or --head as HEAD method', () => {
    const cmd = 'curl -I https://google.com'
    const parsed = parseCurl(cmd)

    expect(parsed.method).toBe('HEAD')
    expect(parsed.url).toBe('https://google.com')
  })

  it('should export structured request into clean cURL string', () => {
    const curl = exportToCurl({
      method: 'PUT',
      url: 'https://api.nexus.io/v2/config',
      headers: {
        'Content-Type': 'application/json',
        'X-Client': 'NexusHub',
      },
      body: '{"active": true}',
      auth: {
        type: 'bearer',
        bearerToken: 'token_xyz',
      },
    })

    expect(curl).toContain('curl -X PUT "https://api.nexus.io/v2/config"')
    expect(curl).toContain('-H "Content-Type: application/json"')
    expect(curl).toContain('-H "Authorization: Bearer token_xyz"')
    expect(curl).toContain(`-d '{"active": true}'`)
  })

  it('should support export and re-parse round-trip', () => {
    const original = {
      method: 'POST' as const,
      url: 'https://api.service.com/graphql',
      headers: {
        'Content-Type': 'application/json',
      },
      body: '{"query": "{ me { id name } }"}',
      auth: {
        type: 'bearer' as const,
        bearerToken: 'auth_jwt_123',
      },
    }

    const exported = exportToCurl(original)
    const reParsed = parseCurl(exported)

    expect(reParsed.method).toBe(original.method)
    expect(reParsed.url).toBe(original.url)
    expect(reParsed.headers['Content-Type']).toBe('application/json')
    expect(reParsed.body).toBe(original.body)
    expect(reParsed.auth.type).toBe('bearer')
    expect(reParsed.auth.bearerToken).toBe('auth_jwt_123')
  })
})
