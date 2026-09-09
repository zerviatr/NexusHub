/**
 * src/renderer/src/lib/aiClient.ts
 *
 * Lightweight, zero-dependency client for local LLMs (Ollama)
 * and OpenAI-compatible cloud APIs (OpenAI, Groq, DeepSeek).
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

export function getAIConfig(): AIConfig {
  try {
    const raw = localStorage.getItem('nexus_ai_config')
    if (raw) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(raw) }
    }
  } catch {}
  return DEFAULT_CONFIG
}

export function saveAIConfig(cfg: AIConfig): void {
  try {
    localStorage.setItem('nexus_ai_config', JSON.stringify(cfg))
  } catch {}
}

export async function askAI(prompt: string, systemPrompt = 'You are an expert developer assistant.'): Promise<string> {
  const cfg = getAIConfig()
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

    const url = `${baseUrl.replace(/\/+$/, '')}/chat/completions`
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiKey.trim()}`,
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
