import { ipcMain } from 'electron'
import axios from 'axios'
import { URL } from 'url'
import { isValidAylinkUrl, bypassAylink } from './linkBypasser'

export interface RemovedTrackerInfo {
  name: string
  category: 'analytics' | 'social' | 'ads' | 'campaign' | 'other'
  description: string
}

export interface DecryptResult {
  success: boolean
  originalUrl?: string
  finalUrl?: string
  cleanUrl?: string
  trackersRemoved?: number
  removedList?: RemovedTrackerInfo[]
  error?: string
}

// Taxonomy rules for recognized query tracking parameters
const TRACKER_TAXONOMY: Record<string, { category: RemovedTrackerInfo['category']; desc: string }> = {
  // Google Analytics & Google Ads
  gclid: { category: 'ads', desc: 'Google Click Identifier' },
  gclsrc: { category: 'ads', desc: 'Google Click Source' },
  wbraid: { category: 'ads', desc: 'Google Ads Web Conversion' },
  gbraid: { category: 'ads', desc: 'Google Ads App Conversion' },
  _ga: { category: 'analytics', desc: 'Google Analytics Client ID' },
  _gl: { category: 'analytics', desc: 'Google Analytics Linker' },
  dclid: { category: 'ads', desc: 'DoubleClick Click Identifier' },

  // Meta / Facebook / Instagram
  fbclid: { category: 'social', desc: 'Meta Facebook Click ID' },
  igshid: { category: 'social', desc: 'Instagram Share ID' },

  // TikTok / Twitter / Microsoft
  ttclid: { category: 'social', desc: 'TikTok Click ID' },
  twclid: { category: 'social', desc: 'Twitter Click ID' },
  msclkid: { category: 'ads', desc: 'Microsoft Bing Click ID' },

  // Newsletter & Marketing
  mc_cid: { category: 'campaign', desc: 'Mailchimp Campaign ID' },
  mc_eid: { category: 'campaign', desc: 'Mailchimp Email ID' },
  _ke: { category: 'campaign', desc: 'Klaviyo Email Tracking' },

  // Referrals
  ref: { category: 'analytics', desc: 'Referral Tag' },
  ref_src: { category: 'analytics', desc: 'Referral Source Platform' },
  ref_url: { category: 'analytics', desc: 'Referral Origin URL' },
}

const KNOWN_TRACKERS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  ...Object.keys(TRACKER_TAXONOMY),
])

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

    // --- Check if it's an Aylink ---
    if (isValidAylinkUrl(finalUrl)) {
      console.log(`[LinkDecrypter] Detected Aylink URL: ${finalUrl}, running bypasser...`)
      const bypassRes = await bypassAylink(finalUrl)
      if (bypassRes.success && bypassRes.url) {
        finalUrl = bypassRes.url
      }
    }

    // 2. Clean the URL
    const urlObj = new URL(finalUrl)
    const removedList: RemovedTrackerInfo[] = []

    // Collect keys to remove
    const keysToRemove: string[] = []
    urlObj.searchParams.forEach((_, key) => {
      // Check exact matches or prefixes (e.g., utm_ anything)
      if (KNOWN_TRACKERS.has(key) || key.startsWith('utm_')) {
        keysToRemove.push(key)
        const matched = TRACKER_TAXONOMY[key]
        if (matched) {
          removedList.push({ name: key, category: matched.category, description: matched.desc })
        } else if (key.startsWith('utm_')) {
          removedList.push({ name: key, category: 'campaign', description: 'Google Analytics UTM Tag' })
        } else {
          removedList.push({ name: key, category: 'other', description: 'Tracking Query Parameter' })
        }
      }
    })

    // Remove them
    for (const key of keysToRemove) {
      urlObj.searchParams.delete(key)
    }

    const cleanUrl = urlObj.toString()

    return {
      success: true,
      originalUrl: targetUrl,
      finalUrl,
      cleanUrl,
      trackersRemoved: keysToRemove.length,
      removedList,
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
  ipcMain.handle('decrypter:cleanBatch', async (_event, urls: string[]) => {
    const results: DecryptResult[] = []
    for (const u of urls) {
      if (!u || !u.trim()) continue
      results.push(await decryptAndClean(u.trim()))
    }
    return results
  })
}
