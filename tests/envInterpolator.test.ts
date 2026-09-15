/**
 * Unit Tests for API Studio Environment Variable Interpolator Engine
 */

import { describe, it, expect } from 'vitest'
import {
  interpolateString,
  interpolateKeyValuePairs,
  interpolateHeaderRecord,
  extractVariables,
  getUnresolvedVariables,
  buildQueryString,
} from '../src/renderer/src/utils/envInterpolator'

describe('API Studio - Environment Variable Interpolator', () => {
  const env: Record<string, string> = {
    baseUrl: 'https://api.nexushub.io',
    apiVersion: 'v2',
    token: 'jwt_secure_token_999',
    userId: '1042',
  }

  it('should interpolate single variable in URL string', () => {
    const input = '{{baseUrl}}/users'
    const result = interpolateString(input, env)
    expect(result).toBe('https://api.nexushub.io/users')
  })

  it('should interpolate multiple variables with whitespace variations', () => {
    const input = '{{ baseUrl }}/{{apiVersion}}/users/{{ userId }}'
    const result = interpolateString(input, env)
    expect(result).toBe('https://api.nexushub.io/v2/users/1042')
  })

  it('should leave unknown variables as original placeholder tokens', () => {
    const input = '{{baseUrl}}/{{missingEndpoint}}?key={{unknownKey}}'
    const result = interpolateString(input, env)
    expect(result).toBe('https://api.nexushub.io/{{missingEndpoint}}?key={{unknownKey}}')
  })

  it('should interpolate array of key-value items filtering disabled items properly', () => {
    const pairs = [
      { id: '1', key: 'Authorization', value: 'Bearer {{token}}', enabled: true },
      { id: '2', key: 'X-User-Id', value: '{{userId}}', enabled: true },
      { id: '3', key: 'Disabled-Header', value: '{{baseUrl}}', enabled: false },
    ]

    const interpolated = interpolateKeyValuePairs(pairs, env)

    expect(interpolated[0].value).toBe('Bearer jwt_secure_token_999')
    expect(interpolated[1].value).toBe('1042')
    expect(interpolated[2].enabled).toBe(false)
  })

  it('should interpolate a plain headers dictionary', () => {
    const headers = {
      Authorization: 'Bearer {{token}}',
      'X-Version': '{{apiVersion}}',
    }
    const result = interpolateHeaderRecord(headers, env)

    expect(result['Authorization']).toBe('Bearer jwt_secure_token_999')
    expect(result['X-Version']).toBe('v2')
  })

  it('should extract all unique variable names from text', () => {
    const text = 'curl -X GET {{baseUrl}}/items?user={{userId}}&token={{token}}&repeat={{userId}}'
    const vars = extractVariables(text)

    expect(vars).toEqual(['baseUrl', 'userId', 'token'])
  })

  it('should find unresolved variables missing from the environment dictionary', () => {
    const text = '{{baseUrl}}/items?secret={{apiKey}}&filter={{filterType}}'
    const unresolved = getUnresolvedVariables(text, env)

    expect(unresolved).toEqual(['apiKey', 'filterType'])
  })

  it('should build a query string from key-value pairs with env interpolation', () => {
    const params = [
      { id: '1', key: 'q', value: 'nexus', enabled: true },
      { id: '2', key: 'user', value: '{{userId}}', enabled: true },
      { id: '3', key: 'page', value: '2', enabled: false },
    ]

    const qs = buildQueryString(params, env)
    expect(qs).toBe('?q=nexus&user=1042')
  })
})
