/**
 * src/renderer/src/lib/aiClient.ts
 *
 * Lightweight client for local LLMs (Ollama) and OpenAI-compatible cloud APIs (OpenAI, Groq, DeepSeek).
 * Hardened with Electron safeStorage (DPAPI / Keychain) encryption to prevent plaintext API keys
 * from persisting in unencrypted browser localStorage.
 */

export type AIProvider = 'ollama' | 'openai' | 'groq' | 'custom'

export interface AIConfig {
  provider: AIProvider
  baseUrl: string
  apiKey: string
  model: string
  enabled: boolean
}

const DEFAULT_CONFIG: AIConfig = {
  provider: 'ollama',
  baseUrl: 'http://localhost:11434',
  apiKey: '',
  model: 'llama3',
  enabled: false,
}

// In-memory cache for decrypted API key to avoid redundant IPC calls
let inMemoryDecryptedKey: string | null = null
let decryptingPromise: Promise<string> | null = null

/**
 * Initiates async decryption of encrypted API key from safeStorage.
 */
async function decryptStoredKey(encryptedValue: string): Promise<string> {
  if (inMemoryDecryptedKey !== null) {
    return inMemoryDecryptedKey
  }

  // Check if encryptedValue is an enc: prefixed ciphertext
  const cipherText = encryptedValue.startsWith('enc:') ? encryptedValue.slice(4) : encryptedValue
  if (!cipherText || cipherText === 'pending') {
    return ''
  }

  try {
    if (typeof window !== 'undefined' && window.nexusAPI?.safeStorage?.decrypt) {
      const decrypted = await window.nexusAPI.safeStorage.decrypt(cipherText)
      if (decrypted) {
        inMemoryDecryptedKey = decrypted
        return decrypted
      }
    }
  } catch (err) {
    console.error('[aiClient] Error decrypting API key from safeStorage:', err)
  }

  // Also try direct store retrieval if available
  try {
    if (typeof window !== 'undefined' && window.nexusAPI?.safeStorage?.retrieve) {
      const stored = await window.nexusAPI.safeStorage.retrieve('nexus_ai_api_key')
      if (stored) {
        inMemoryDecryptedKey = stored
        return stored
      }
    }
  } catch {}

  return ''
}

// Prime decryption cache immediately on module load if in browser environment
if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
  try {
    const raw = localStorage.getItem('nexus_ai_config')
    if (raw) {
      const parsed = JSON.parse(raw)
      if (typeof parsed.apiKey === 'string' && parsed.apiKey.startsWith('enc:')) {
        decryptingPromise = decryptStoredKey(parsed.apiKey)
      } else if (typeof parsed.apiKey === 'string' && parsed.apiKey.length > 0) {
        // Legacy plaintext migration: prime memory and migrate to safeStorage
        inMemoryDecryptedKey = parsed.apiKey
        saveAIConfig({ ...DEFAULT_CONFIG, ...parsed, apiKey: parsed.apiKey })
      }
    }
  } catch {}
}

export function getAIConfig(): AIConfig {
  try {
    const raw = localStorage.getItem('nexus_ai_config')
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AIConfig>
      const rawKey = parsed.apiKey || ''

      // If key is encrypted in localStorage, return in-memory decrypted key if available
      if (rawKey.startsWith('enc:')) {
        if (inMemoryDecryptedKey !== null) {
          return { ...DEFAULT_CONFIG, ...parsed, apiKey: inMemoryDecryptedKey }
        }
        // Trigger background decryption if not running
        if (!decryptingPromise) {
          decryptingPromise = decryptStoredKey(rawKey)
        }
        return { ...DEFAULT_CONFIG, ...parsed, apiKey: inMemoryDecryptedKey || '' }
      }

      // Legacy plaintext detected in localStorage: cache and trigger migration
      if (rawKey.length > 0) {
        inMemoryDecryptedKey = rawKey
        saveAIConfig({ ...DEFAULT_CONFIG, ...parsed, apiKey: rawKey } as AIConfig)
        return { ...DEFAULT_CONFIG, ...parsed, apiKey: rawKey }
      }

      return { ...DEFAULT_CONFIG, ...parsed, apiKey: inMemoryDecryptedKey || '' }
    }
  } catch {}
  return { ...DEFAULT_CONFIG, apiKey: inMemoryDecryptedKey || '' }
}

/**
 * Asynchronously retrieves AIConfig, ensuring safeStorage decryption has resolved.
 */
export async function getAIConfigAsync(): Promise<AIConfig> {
  const cfg = getAIConfig()
  if (inMemoryDecryptedKey !== null) {
    return { ...cfg, apiKey: inMemoryDecryptedKey }
  }

  const raw = localStorage.getItem('nexus_ai_config')
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<AIConfig>
      if (parsed.apiKey && parsed.apiKey.startsWith('enc:')) {
        const decrypted = await decryptStoredKey(parsed.apiKey)
        return { ...DEFAULT_CONFIG, ...parsed, apiKey: decrypted }
      }
    } catch {}
  }

  return cfg
}

export function saveAIConfig(cfg: AIConfig): void {
  const plainKey = (cfg.apiKey || '').trim()

  // Update in-memory decrypted cache immediately
  inMemoryDecryptedKey = plainKey

  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return
  }

  if (!plainKey) {
    // Empty key: store empty string without encryption
    try {
      localStorage.setItem('nexus_ai_config', JSON.stringify({ ...cfg, apiKey: '' }))
      window.nexusAPI?.safeStorage?.delete?.('nexus_ai_api_key').catch(() => {})
    } catch {}
    return
  }

  // Encrypt key with Electron safeStorage via IPC
  if (window.nexusAPI?.safeStorage?.encrypt) {
    window.nexusAPI.safeStorage
      .encrypt(plainKey)
      .then((cipherText) => {
        const encryptedKey = `enc:${cipherText}`
        localStorage.setItem(
          'nexus_ai_config',
          JSON.stringify({ ...cfg, apiKey: encryptedKey })
        )
      })
      .catch((err) => {
        console.error('[aiClient] safeStorage encryption failed:', err)
      })

    // Also persist in safeStorage key-value store
    window.nexusAPI.safeStorage.store?.('nexus_ai_api_key', plainKey).catch(() => {})
  } else {
    // Fallback if safeStorage is completely unavailable (e.g. non-electron browser preview)
    try {
      localStorage.setItem('nexus_ai_config', JSON.stringify({ ...cfg, apiKey: plainKey }))
    } catch {}
  }
}

export async function askAI(prompt: string, systemPrompt = 'You are an expert developer assistant.'): Promise<string> {
  const cfg = await getAIConfigAsync()
  const isOllama = cfg.provider === 'ollama'

  if (isOllama) {
    // Native Ollama API endpoint
    const url = `${cfg.baseUrl.replace(/\/+$/, '')}/api/generate`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: cfg.model || 'llama3',
        prompt: `${systemPrompt}\n\nTask: ${prompt}`,
        stream: false,
      }),
    })

    if (!res.ok) {
      throw new Error(`Ollama hatası (${res.status}): ${await res.text()}`)
    }

    const data = await res.json()
    return data.response?.trim() || ''
  } else {
    // OpenAI-compatible Chat Completions API
    let baseUrl = cfg.baseUrl.trim()
    if (!baseUrl) {
      if (cfg.provider === 'openai') baseUrl = 'https://api.openai.com/v1'
      else if (cfg.provider === 'groq') baseUrl = 'https://api.groq.com/openai/v1'
      else baseUrl = 'https://api.openai.com/v1'
    }

    const resolvedApiKey = (inMemoryDecryptedKey || cfg.apiKey || '').trim()

    const url = `${baseUrl.replace(/\/+$/, '')}/chat/completions`
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resolvedApiKey}`,
      },
      body: JSON.stringify({
        model: cfg.model || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
      }),
    })

    if (!res.ok) {
      throw new Error(`AI API hatası (${res.status}): ${await res.text()}`)
    }

    const data = await res.json()
    return data.choices?.[0]?.message?.content?.trim() || ''
  }
}
