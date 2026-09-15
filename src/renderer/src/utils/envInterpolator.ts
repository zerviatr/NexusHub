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
 * @file envInterpolator.ts
 * @description Variable substitution engine for NexusHub API Studio.
 * Replaces {{varName}} placeholders across URLs, headers, and request payloads
 * with active environment values, providing safe fallback and preventing recursion.
 */

export interface InterpolationOptions {
  /**
   * Whether to leave unresolved variables intact (e.g. `{{missing}}`).
   * Default: true.
   */
  keepUnresolved?: boolean

  /**
   * Fallback value for unresolved variables if keepUnresolved is false.
   */
  fallbackValue?: string

  /**
   * Maximum expansion depth to prevent recursive loop attacks.
   * Default: 1 (single-pass expansion).
   */
  maxDepth?: number
}

// Regex matching {{ variable_name }} with optional surrounding whitespace
const VARIABLE_REGEX = /\{\{\s*([a-zA-Z0-9_.\-]+)\s*\}\}/g

/**
 * Interpolates environment variables into a target string template.
 *
 * @param {string} template - Text containing `{{var}}` placeholders.
 * @param {Record<string, string>} env - Dictionary of key-value environment variables.
 * @param {InterpolationOptions} [options={}] - Configuration options for substitution.
 * @returns {string} The interpolated string.
 */
export function interpolateEnv(
  template: string,
  env: Record<string, string> = {},
  options: InterpolationOptions = {}
): string {
  if (typeof template !== 'string') {
    return ''
  }

  if (!template || !template.includes('{{')) {
    return template
  }

  const { keepUnresolved = true, fallbackValue = '' } = options

  return template.replace(VARIABLE_REGEX, (match, varName) => {
    if (Object.prototype.hasOwnProperty.call(env, varName)) {
      const val = env[varName]
      return val !== undefined && val !== null ? String(val) : ''
    }

    if (keepUnresolved) {
      return match
    }

    return fallbackValue
  })
}

/**
 * Extracts all unique variable names referenced in a string template.
 *
 * @param {string} template - Text containing `{{var}}` placeholders.
 * @returns {string[]} Array of distinct variable names found in the template.
 */
export function extractVariables(template: string): string[] {
  if (!template || typeof template !== 'string') {
    return []
  }

  const names = new Set<string>()
  let match: RegExpExecArray | null

  // Reset regex state
  const regex = new RegExp(VARIABLE_REGEX.source, 'g')
  while ((match = regex.exec(template)) !== null) {
    if (match[1]) {
      names.add(match[1].trim())
    }
  }

  return Array.from(names)
}

/**
 * Identifies any variables in the template that do not exist in the provided environment dictionary.
 *
 * @param {string} template - Text containing `{{var}}` placeholders.
 * @param {Record<string, string>} env - Dictionary of key-value environment variables.
 * @returns {string[]} Array of variable names referenced in template but missing in env.
 */
export function getUnresolvedVariables(
  template: string,
  env: Record<string, string> = {}
): string[] {
  const referenced = extractVariables(template)
  return referenced.filter(
    (varName) => !Object.prototype.hasOwnProperty.call(env, varName) || env[varName] === undefined
  )
}

/**
 * Interpolates all parts of an HTTP request (URL, headers, body) using an environment dictionary.
 *
 * @template T
 * @param {T} request - Request object containing url, headers, and optional body.
 * @param {Record<string, string>} env - Active environment variables.
 * @param {InterpolationOptions} [options] - Configuration options.
 * @returns {T} New cloned request object with interpolated fields.
 */
export function interpolateRequest<
  T extends {
    url: string
    headers?: Record<string, string>
    body?: string
    [key: string]: any
  }
>(request: T, env: Record<string, string> = {}, options?: InterpolationOptions): T {
  const result: T = { ...request }

  // Interpolate URL
  if (result.url) {
    result.url = interpolateEnv(result.url, env, options)
  }

  // Interpolate Headers
  if (result.headers) {
    const interpolatedHeaders: Record<string, string> = {}
    for (const [key, val] of Object.entries(result.headers)) {
      const newKey = interpolateEnv(key, env, options)
      const newVal = typeof val === 'string' ? interpolateEnv(val, env, options) : val
      interpolatedHeaders[newKey] = newVal
    }
    result.headers = interpolatedHeaders
  }

  // Interpolate Body
  if (result.body && typeof result.body === 'string') {
    result.body = interpolateEnv(result.body, env, options)
  }

  return result
}

/**
 * Alias for interpolateEnv for string interpolation.
 */
export const interpolateString = interpolateEnv

/**
 * Interpolates key-value pairs with active environment variables.
 */
export function interpolateKeyValuePairs<T extends { key: string; value: string; [k: string]: any }>(
  pairs: T[],
  env: Record<string, string> = {}
): T[] {
  if (!Array.isArray(pairs)) return []
  return pairs.map((pair) => ({
    ...pair,
    key: interpolateEnv(pair.key, env),
    value: typeof pair.value === 'string' ? interpolateEnv(pair.value, env) : pair.value,
  }))
}

/**
 * Interpolates a plain headers dictionary.
 */
export function interpolateHeaderRecord(
  headers: Record<string, string>,
  env: Record<string, string> = {},
  options?: InterpolationOptions
): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, val] of Object.entries(headers || {})) {
    const k = interpolateEnv(key, env, options)
    const v = typeof val === 'string' ? interpolateEnv(val, env, options) : val
    if (k.trim()) {
      result[k] = v
    }
  }
  return result
}

/**
 * Builds a query string from key-value pairs with optional environment interpolation.
 */
export function buildQueryString(
  pairs: Array<{ key: string; value: string; enabled?: boolean }>,
  env: Record<string, string> = {}
): string {
  if (!Array.isArray(pairs)) return ''
  const searchParams = new URLSearchParams()
  for (const pair of pairs) {
    if ((pair.enabled === undefined || pair.enabled) && pair.key && pair.key.trim()) {
      const k = interpolateEnv(pair.key.trim(), env)
      const v = typeof pair.value === 'string' ? interpolateEnv(pair.value, env) : pair.value
      searchParams.append(k, v || '')
    }
  }
  const qs = searchParams.toString()
  return qs ? `?${qs}` : ''
}

