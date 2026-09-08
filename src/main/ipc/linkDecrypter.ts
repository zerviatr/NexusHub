import { ipcMain } from 'electron'
import axios from 'axios'
import { URL } from 'url'

const KNOWN_TRACKERS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'fbclid',
  'igshid',
  'gclid',
  'gclsrc',
  'wbraid',
  'gbraid',
  '_ga',
  '_gl',
  '_ke',
  'mc_cid',
  'mc_eid',
  'ref',
  'ref_src',
  'ref_url',
])

export interface DecryptResult {
  success: boolean
  originalUrl?: string
  finalUrl?: string
  cleanUrl?: string
  trackersRemoved?: number
  error?: string
}

export async function decryptAndClean(targetUrl: string): Promise<DecryptResult> {
  try {
    // 1. Follow redirects to find the final URL
    let finalUrl = targetUrl
    try {
      const response = await axios.get(targetUrl, {
        maxRedirects: 10,
        // Sometimes sites require a User-Agent or they block axios default
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        timeout: 10000, // 10s timeout
      })
      finalUrl = response.request?.res?.responseUrl || response.config.url || targetUrl
    } catch (error: any) {
      // If axios throws but it's a redirect issue or something where we still get a URL, try to extract it
      if (error.request && error.request.res && error.request.res.responseUrl) {
        finalUrl = error.request.res.responseUrl
      } else if (error.response && error.response.request && error.response.request.res) {
        finalUrl = error.response.request.res.responseUrl
      } else {
        // If we can't get the final URL, we just process the targetUrl itself
        finalUrl = targetUrl
      }
    }

    // --- NEW: Check if it's an Aylink ---
    const { isValidAylinkUrl, bypassAylink } = await import('./linkBypasser')
    if (isValidAylinkUrl(finalUrl)) {
      console.log(`[LinkDecrypter] Detected Aylink URL: ${finalUrl}, running bypasser...`)
      const bypassRes = await bypassAylink(finalUrl)
      if (bypassRes.success && bypassRes.url) {
        finalUrl = bypassRes.url
      }
    }

    // 2. Clean the URL
    const urlObj = new URL(finalUrl)
    let trackersRemoved = 0

    // Collect keys to remove
    const keysToRemove: string[] = []
    urlObj.searchParams.forEach((_, key) => {
      // Check exact matches or prefixes (e.g., utm_ anything)
      if (KNOWN_TRACKERS.has(key) || key.startsWith('utm_')) {
        keysToRemove.push(key)
      }
    })

    // Remove them
    for (const key of keysToRemove) {
      urlObj.searchParams.delete(key)
      trackersRemoved++
    }

    const cleanUrl = urlObj.toString()

    return {
      success: true,
      originalUrl: targetUrl,
      finalUrl,
      cleanUrl,
      trackersRemoved,
    }
  } catch (error: any) {
    console.error('[LinkDecrypter] Error:', error.message)
    return {
      success: false,
      error: error.message || 'Failed to decrypt and clean link.',
    }
  }
}

export function registerLinkDecrypterIPC(): void {
  ipcMain.handle('decrypter:clean', async (_event, url: string) => decryptAndClean(url))
}
