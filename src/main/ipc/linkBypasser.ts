/**
 * Link Bypasser IPC Handler
 *
 * Adapted from: aylink-bypass/server/server.js
 * Strips Express/web middleware (helmet, CORS, CSRF, rate-limit).
 * Keeps the core bypass logic intact: fetch page → extract tokens → get tk → go2 → resolve redirects.
 *
 * Runtime deps: axios, cheerio, validator (in package.json dependencies)
 */

import { ipcMain } from 'electron'
import axios from 'axios'
import * as cheerio from 'cheerio'
import validator from 'validator'

// ===== Types =====

export interface BypassResult {
  success: boolean
  url?: string
  intermediateUrl?: string
  alias?: string
  status?: string
  trackersRemoved?: number
  error?: string
}

// ===== Constants =====

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36'

const ALLOWED_DOMAINS = [
  'aylink.co',
  'cpmlink.pro',
  'ay.live',
  'aylink.net',
  'aylink.link',
]

const FINAL_DOMAINS = [
  'drive.google.com',
  'docs.google.com',
  'mega.nz',
  'mega.co.nz',
  'mediafire.com',
  'dropbox.com',
  'onedrive.live.com',
  'github.com',
  'youtube.com',
  'youtu.be',
  'cdn.discordapp.com',
  'discord.gg',
  'archive.org',
  'gofile.io',
  'pixeldrain.com',
  'anonfiles.com',
  'uploadhaven.com',
  'krakenfiles.com',
  'workupload.com',
  'file.io',
  'wetransfer.com',
  'zippyshare.com',
  'disk.yandex.com.tr',
  'disk.yandex.com',
  'yadi.sk',
  'terabox.com',
  'fileditch.com',
]

const TRACKER_KEYS = new Set([
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'fbclid', 'igshid', 'gclid', 'gclsrc', 'wbraid', 'gbraid',
  '_ga', '_gl', '_ke', 'mc_cid', 'mc_eid', 'ref', 'ref_src', 'ref_url'
])

export function stripTrackingParams(targetUrl: string): { cleanUrl: string; trackersRemoved: number } {
  try {
    const urlObj = new URL(targetUrl)
    let trackersRemoved = 0
    const keysToRemove: string[] = []
    urlObj.searchParams.forEach((_, key) => {
      if (TRACKER_KEYS.has(key.toLowerCase()) || key.toLowerCase().startsWith('utm_')) {
        keysToRemove.push(key)
      }
    })
    keysToRemove.forEach((key) => {
      urlObj.searchParams.delete(key)
      trackersRemoved++
    })
    return { cleanUrl: urlObj.toString(), trackersRemoved }
  } catch {
    return { cleanUrl: targetUrl, trackersRemoved: 0 }
  }
}

// ===== Helpers (ported verbatim from server.js) =====

export function isValidAylinkUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false

  if (
    !validator.isURL(url, {
      protocols: ['http', 'https'],
      require_protocol: true,
      require_valid_protocol: true,
    })
  )
    return false

  try {
    const host = new URL(url).hostname.toLowerCase()
    return ALLOWED_DOMAINS.some((d) => host === d || host.endsWith('.' + d))
  } catch {
    return false
  }
}

function isFinalDestination(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase()
    return FINAL_DOMAINS.some((d) => host === d || host.endsWith('.' + d))
  } catch {
    return false
  }
}

/**
 * Follow the full redirect chain: HTTP 3xx, meta-refresh,
 * JS window.location, data-url attrs, continue links.
 * Max 15 hops — won't loop.
 */
async function resolveRedirects(startUrl: string, maxHops = 15): Promise<string> {
  let currentUrl = startUrl
  const visited = new Set<string>()

  for (let hop = 0; hop < maxHops; hop++) {
    if (visited.has(currentUrl)) {
      console.log(`[Redirect] Loop detected, stopping: ${currentUrl}`)
      break
    }
    visited.add(currentUrl)

    if (isFinalDestination(currentUrl)) {
      console.log(`[Redirect] Final destination found (hop ${hop}): ${currentUrl}`)
      return currentUrl
    }

    console.log(`[Redirect] Hop ${hop}: ${currentUrl}`)

    try {
      const response = await axios.get(currentUrl, {
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
          Referer: currentUrl,
        },
        maxRedirects: 0,
        timeout: 15000,
        validateStatus: () => true,
      })

      const status = response.status

      // 1) HTTP 3xx redirect
      if (status >= 300 && status < 400 && response.headers.location) {
        let location = response.headers.location
        if (location.startsWith('/')) {
          const base = new URL(currentUrl)
          location = `${base.protocol}//${base.host}${location}`
        } else if (!location.startsWith('http')) {
          location = new URL(location, new URL(currentUrl)).href
        }
        console.log(`[Redirect] HTTP ${status} → ${location}`)
        currentUrl = location
        continue
      }

      // 2) 200 OK — scan HTML for redirect patterns
      if (status === 200 && typeof response.data === 'string') {
        const html: string = response.data
        let nextUrl: string | null = null

        // a) meta http-equiv="refresh"
        const metaRefreshMatch = html.match(
          /<meta[^>]*http-equiv\s*=\s*["']?refresh["']?[^>]*content\s*=\s*["']?\d+\s*;\s*url\s*=\s*["']?([^"'>\s]+)/i,
        )
        if (metaRefreshMatch) {
          nextUrl = metaRefreshMatch[1]
          console.log(`[Redirect] Meta-refresh → ${nextUrl}`)
        }

        // b) JS variable assignments (bildirim.online pattern etc.)
        if (!nextUrl) {
          const jsVarPatterns = [
            /(?:let|var|const)\s+url\s*=\s*['"]([^'"]+)['"]/i,
            /(?:let|var|const)\s+redirect_?url\s*=\s*['"]([^'"]+)['"]/i,
            /(?:let|var|const)\s+target_?url\s*=\s*['"]([^'"]+)['"]/i,
            /(?:let|var|const)\s+destination\s*=\s*['"]([^'"]+)['"]/i,
            /(?:let|var|const)\s+dest\s*=\s*['"]([^'"]+)['"]/i,
            /(?:let|var|const)\s+go_?url\s*=\s*['"]([^'"]+)['"]/i,
            /(?:let|var|const)\s+link\s*=\s*['"]([^'"]+)['"]/i,
          ]

          const skipDomains = ['bildirim.online', 'ppcnt.us', 'ppcnt.net', 'pushance.com']

          for (const pattern of jsVarPatterns) {
            const match = html.match(pattern)
            if (match?.[1]?.startsWith('http')) {
              try {
                const matchedHost = new URL(match[1]).hostname.toLowerCase()
                if (!skipDomains.some((d) => matchedHost === d || matchedHost.endsWith('.' + d))) {
                  nextUrl = match[1]
                  console.log(`[Redirect] JS variable → ${nextUrl}`)
                  break
                }
              } catch {
                /* URL parse error — skip */
              }
            }
          }
        }

        // c) Direct window.location assignments
        if (!nextUrl) {
          const jsRedirectPatterns = [
            /window\.location\.href\s*=\s*["']([^"']+)["']/i,
            /window\.location\s*=\s*["']([^"']+)["']/i,
            /location\.href\s*=\s*["']([^"']+)["']/i,
            /location\.replace\s*\(\s*["']([^"']+)["']\s*\)/i,
            /window\.location\.assign\s*\(\s*["']([^"']+)["']\s*\)/i,
            /document\.location\.href\s*=\s*["']([^"']+)["']/i,
            /document\.location\s*=\s*["']([^"']+)["']/i,
            /top\.location\.href\s*=\s*["']([^"']+)["']/i,
          ]

          for (const pattern of jsRedirectPatterns) {
            const match = html.match(pattern)
            if (match?.[1]?.startsWith('http')) {
              nextUrl = match[1]
              console.log(`[Redirect] JS redirect → ${nextUrl}`)
              break
            }
          }
        }

        // d) Cheerio-based link detection
        if (!nextUrl) {
          const $ = cheerio.load(html)

          // data-url attribute
          const dataUrl = $('[data-url]').first().attr('data-url')
          if (dataUrl?.startsWith('http')) {
            nextUrl = dataUrl
            console.log(`[Redirect] data-url → ${nextUrl}`)
          }

          // "Devam" / "Continue" / "Go" button links
          if (!nextUrl) {
            const continueLink = $('a[href^="http"]')
              .filter((_, el) => {
                const text = $(el).text().toLowerCase()
                return (
                  text.includes('devam') ||
                  text.includes('continue') ||
                  text.includes('go to') ||
                  text.includes('redirect') ||
                  text.includes('click here') ||
                  text.includes('tıkla') ||
                  text.includes('git')
                )
              })
              .first()
              .attr('href')
            if (continueLink) {
              nextUrl = continueLink
              console.log(`[Redirect] Continue link → ${nextUrl}`)
            }
          }

          // Single external link on the page
          if (!nextUrl) {
            try {
              const currentHost = new URL(currentUrl).hostname
              const externalLinks: string[] = []
              $('a[href^="http"]').each((_, el) => {
                const href = $(el).attr('href')
                if (!href) return
                try {
                  const linkHost = new URL(href).hostname
                  if (linkHost !== currentHost && !href.includes('javascript:')) {
                    externalLinks.push(href)
                  }
                } catch {
                  /* skip malformed hrefs */
                }
              })
              if (externalLinks.length === 1) {
                nextUrl = externalLinks[0]
                console.log(`[Redirect] Single external link → ${nextUrl}`)
              }
            } catch {
              /* skip */
            }
          }
        }

        if (nextUrl) {
          if (!nextUrl.startsWith('http')) {
            nextUrl = new URL(nextUrl, currentUrl).href
          }
          currentUrl = nextUrl
          continue
        }
      }

      // No redirect found — stop here
      console.log(`[Redirect] No more redirects, stopping: ${currentUrl}`)
      break
    } catch (err: any) {
      console.log(`[Redirect] Error (hop ${hop}): ${err.message}, returning current URL`)
      break
    }
  }

  return currentUrl
}

// ===== Core Bypass Logic =====

export async function bypassAylink(url: string): Promise<BypassResult> {
  if (!isValidAylinkUrl(url)) {
    return {
      success: false,
      error: 'Invalid URL. Only aylink.co and related domains are supported.',
    }
  }

  const cleanUrl = url.trim()
  console.log('[Bypass] Processing URL:', cleanUrl)

  try {
    // 1. Fetch the aylink page
    const pageResponse = await axios.get(cleanUrl, {
      headers: { 'User-Agent': USER_AGENT },
      timeout: 10000,
      maxRedirects: 5,
      validateStatus: (status: number) => status >= 200 && status < 400,
    })

    const html: string = pageResponse.data
    const $ = cheerio.load(html)

    // 2. Extract _a, _t, _d, alias, csrf from inline scripts
    let _a: string | undefined
    let _t: string | undefined
    let _d: string | undefined
    let alias: string | undefined
    let csrf: string | undefined

    $('script').each((_, elem) => {
      const content = $(elem).html()
      if (!content) return

      const aMatch = content.match(/_a\s*=\s*['"]([^'"]+)['"]/)
      if (aMatch && !_a) _a = aMatch[1]

      const tMatch = content.match(/_t\s*=\s*['"]([^'"]+)['"]/)
      if (tMatch && !_t) _t = tMatch[1]

      const dMatch = content.match(/_d\s*=\s*['"]([^'"]+)['"]/)
      if (dMatch && !_d) _d = dMatch[1]

      const aliasMatch =
        content.match(/app\[['"]alias['"]\]\s*=\s*['"]([^'"]+)['"]/) ||
        content.match(/['"]alias['"]\s*:\s*['"]([^'"]+)['"]/)
      if (aliasMatch && !alias) alias = aliasMatch[1]

      const csrfMatch =
        content.match(/app\[['"]csrf['"]\]\s*=\s*['"]([^'"]+)['"]/) ||
        content.match(/['"]csrf['"]\s*:\s*['"]([^'"]+)['"]/)
      if (csrfMatch && !csrf) csrf = csrfMatch[1]
    })

    // visitor_token from .btn-go button's data-token attr
    const visitorToken = $('a.btn-go[data-token]').attr('data-token') || ''

    console.log('[Bypass] Extracted vars:', {
      _a: _a ? '✓' : '✗',
      _t: _t ? '✓' : '✗',
      _d: _d ? '✓' : '✗',
      alias: alias ? '✓' : '✗',
      csrf: csrf ? '✓' : '✗',
      visitor_token: visitorToken ? '✓' : '✗',
    })

    if (!_a || !_t || !_d || !alias || !csrf) {
      return {
        success: false,
        error: 'Required parameters not found on the page. The site structure may have changed.',
      }
    }

    // Validate base64 format
    if (!validator.isBase64(_a) || !validator.isBase64(_t) || !validator.isBase64(_d)) {
      return { success: false, error: 'Invalid parameter format detected.' }
    }

    const urlObj = new URL(cleanUrl)
    const baseOrigin = urlObj.origin
    const cookies = pageResponse.headers['set-cookie']
      ? (pageResponse.headers['set-cookie'] as string[]).map((c) => c.split(';')[0]).join('; ')
      : ''

    // 3. POST /get/tk — acquire token
    const tokenHeaders: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'User-Agent': USER_AGENT,
      'X-Requested-With': 'XMLHttpRequest',
      Referer: cleanUrl,
    }
    if (cookies) tokenHeaders['Cookie'] = cookies

    const tokenResponse = await axios.post(
      `${baseOrigin}/get/tk`,
      `_a=${_a}&_t=${_t}&_d=${_d}`,
      { headers: tokenHeaders, timeout: 10000 },
    )

    const tokenData = tokenResponse.data
    console.log('[Bypass] Token received:', tokenData.status ? '✓' : '✗')

    const token = tokenData.th || tokenData
    if (!token) {
      return { success: false, error: 'Failed to obtain token.' }
    }

    // 4. POST /links/go2 — get the destination URL
    const signal = JSON.stringify({
      t: Date.now(),
      d: 12.011,
      m: { move: 1354, click: 2, scroll: 0, key: 0, touch: 0, focus: 0 },
      f: { webdriver: false, headless: false, noPlugins: false, mobile: false },
    })

    const finalHeaders: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'User-Agent': USER_AGENT,
      'X-Requested-With': 'XMLHttpRequest',
      Referer: cleanUrl,
    }
    if (cookies) finalHeaders['Cookie'] = cookies

    const finalResponse = await axios.post(
      `${baseOrigin}/links/go2`,
      `alias=${alias}&csrf=${csrf}&tkn=${token}&visitor_token=${encodeURIComponent(visitorToken)}&signal=${encodeURIComponent(signal)}`,
      { headers: finalHeaders, timeout: 10000 },
    )

    const result = finalResponse.data
    console.log('[Bypass] Final API response status:', result.status)

    if (result.url) {
      // Fix escaped slashes in the URL
      let intermediateUrl: string = result.url.replace(/\\\//g, '/')

      if (!validator.isURL(intermediateUrl)) {
        return { success: false, error: 'Invalid destination URL received.' }
      }

      console.log('[Bypass] Intermediate URL:', intermediateUrl)

      // Resolve the full redirect chain to the final destination
      let finalUrl = intermediateUrl
      let trackersRemoved = 0
      try {
        finalUrl = await resolveRedirects(intermediateUrl)
        console.log('[Bypass] Final destination URL:', finalUrl)
        
        // Clean tracking parameters from final destination URL
        const cleaned = stripTrackingParams(finalUrl)
        finalUrl = cleaned.cleanUrl
        trackersRemoved = cleaned.trackersRemoved
        if (trackersRemoved > 0) {
          console.log(`[Bypass] Cleaned ${trackersRemoved} trackers from bypassed URL`)
        }
      } catch (redirectErr: any) {
        console.log(
          '[Bypass] Redirect resolution error, using intermediate URL:',
          redirectErr.message,
        )
      }

      const safeAlias = result.alias || alias || ''
      return {
        success: true,
        url: finalUrl,
        intermediateUrl: intermediateUrl !== finalUrl ? intermediateUrl : undefined,
        alias: safeAlias ? validator.escape(String(safeAlias)) : '',
        status: result.status || 'success',
        trackersRemoved,
      }
    } else {
      return { success: false, error: 'Target URL not found in response.' }
    }
  } catch (error: any) {
    console.error('[Bypass] Error:', error.message)
    return {
      success: false,
      error: 'An error occurred while processing the URL. Please try again later.',
    }
  }
}

// ===== IPC Registration =====

export function registerLinkBypasserIPC(): void {
  ipcMain.handle('link:bypass', async (_event, url: string) => {
    return bypassAylink(url)
  })
}
