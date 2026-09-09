/**
 * server/src/services/notifier.ts
 *
 * Real-time notification engine for ZenDev Server.
 * Supports:
 *   - Telegram Bot API
 *   - Discord Webhook Embeds
 *
 * Non-blocking, fault-tolerant async execution.
 */
import { getDb } from '../db'

export interface NotificationSettings {
  telegram_bot_token?: string
  telegram_chat_id?: string
  telegram_enabled: boolean
  discord_webhook_url?: string
  discord_enabled: boolean
  notify_on_activate: boolean
  notify_on_revoke: boolean
  notify_on_alert: boolean
}

/** Fetch current notification configuration from admin_settings */
export async function getNotificationSettings(): Promise<NotificationSettings> {
  const db = getDb()
  const res = await db.execute({
    sql: `SELECT key, value FROM admin_settings WHERE key LIKE 'notif_%'`,
    args: [],
  })

  const map: Record<string, string> = {}
  for (const row of res.rows) {
    map[String(row['key'])] = String(row['value'])
  }

  return {
    telegram_bot_token:  map['notif_tg_token'] || process.env['TELEGRAM_BOT_TOKEN'] || '',
    telegram_chat_id:    map['notif_tg_chat_id'] || process.env['TELEGRAM_CHAT_ID'] || '',
    telegram_enabled:    map['notif_tg_enabled'] === '1',
    discord_webhook_url: map['notif_dc_webhook'] || process.env['DISCORD_WEBHOOK_URL'] || '',
    discord_enabled:     map['notif_dc_enabled'] === '1',
    notify_on_activate:  map['notif_on_activate'] !== '0', // default true
    notify_on_revoke:    map['notif_on_revoke'] !== '0',   // default true
    notify_on_alert:     map['notif_on_alert'] !== '0',    // default true
  }
}

/** Save notification configuration to admin_settings */
export async function saveNotificationSettings(settings: Partial<NotificationSettings>): Promise<void> {
  const db = getDb()
  const now = Date.now()

  const entries: [string, string][] = [
    ['notif_tg_token', settings.telegram_bot_token ?? ''],
    ['notif_tg_chat_id', settings.telegram_chat_id ?? ''],
    ['notif_tg_enabled', settings.telegram_enabled ? '1' : '0'],
    ['notif_dc_webhook', settings.discord_webhook_url ?? ''],
    ['notif_dc_enabled', settings.discord_enabled ? '1' : '0'],
    ['notif_on_activate', settings.notify_on_activate ? '1' : '0'],
    ['notif_on_revoke', settings.notify_on_revoke ? '1' : '0'],
    ['notif_on_alert', settings.notify_on_alert ? '1' : '0'],
  ]

  for (const [k, v] of entries) {
    await db.execute({
      sql: `INSERT INTO admin_settings (key, value, updated_at) VALUES (?, ?, ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      args: [k, v, now],
    })
  }
}

/** Dispatch Telegram message */
export async function sendTelegram(token: string, chatId: string, text: string): Promise<{ success: boolean; error?: string }> {
  if (!token || !chatId) return { success: false, error: 'Telegram bot token or chat ID missing' }
  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(6000),
    })

    const json = await res.json() as any
    if (!json.ok) {
      return { success: false, error: json.description ?? 'Telegram API error' }
    }
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Telegram network error' }
  }
}

/** Dispatch Discord Webhook embed */
export async function sendDiscord(webhookUrl: string, payload: {
  title: string
  description: string
  color: number
  fields?: { name: string; value: string; inline?: boolean }[]
}): Promise<{ success: boolean; error?: string }> {
  if (!webhookUrl) return { success: false, error: 'Discord webhook URL missing' }
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'ZenDev Sentinel',
        avatar_url: 'https://raw.githubusercontent.com/zerviatr/ZenDev/main/build/icons/icon.png',
        embeds: [
          {
            ...payload,
            timestamp: new Date().toISOString(),
            footer: { text: 'ZenDev Central Hub • Railway Production' },
          },
        ],
      }),
      signal: AbortSignal.timeout(6000),
    })

    if (!res.ok) {
      const errText = await res.text()
      return { success: false, error: `Discord HTTP ${res.status}: ${errText}` }
    }
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Discord network error' }
  }
}

/** Broadcast notification to all enabled channels */
export async function broadcastNotification(opts: {
  title: string
  plainText: string
  htmlText: string
  color: number // hex number e.g. 0x06b6d4
  fields?: { name: string; value: string; inline?: boolean }[]
}): Promise<void> {
  const settings = await getNotificationSettings()

  // Telegram
  if (settings.telegram_enabled && settings.telegram_bot_token && settings.telegram_chat_id) {
    sendTelegram(settings.telegram_bot_token, settings.telegram_chat_id, opts.htmlText)
      .catch((e) => console.warn('[notifier] Telegram dispatch error:', e))
  }

  // Discord
  if (settings.discord_enabled && settings.discord_webhook_url) {
    sendDiscord(settings.discord_webhook_url, {
      title: opts.title,
      description: opts.plainText,
      color: opts.color,
      fields: opts.fields,
    }).catch((e) => console.warn('[notifier] Discord dispatch error:', e))
  }
}

/** Trigger when a license key is successfully activated */
export function notifyKeyActivated(payload: {
  key: string
  tier: string
  deviceId: string
  salesChannel?: string
  customerInfo?: string
  expiresAt?: number
}): void {
  setImmediate(async () => {
    try {
      const settings = await getNotificationSettings()
      if (!settings.notify_on_activate) return

      const maskedKey = `${payload.key.slice(0, 10)}...${payload.key.slice(-5)}`
      const expDate   = payload.expiresAt && payload.expiresAt > 0 
        ? new Date(payload.expiresAt).toLocaleDateString('tr-TR') 
        : 'Ömür Boyu (Lifetime)'

      const html = `<b>🚀 ZenDev Yeni Aktivasyon!</b>\n\n` +
        `🔑 <b>Lisans:</b> <code>${maskedKey}</code>\n` +
        `💎 <b>Paket:</b> ${payload.tier.toUpperCase()}\n` +
        `💻 <b>Cihaz:</b> <code>${payload.deviceId.slice(0, 10)}...</code>\n` +
        `⏳ <b>Bitiş:</b> ${expDate}\n` +
        (payload.salesChannel ? `🛒 <b>Kanal:</b> ${payload.salesChannel}\n` : '') +
        (payload.customerInfo ? `👤 <b>Müşteri:</b> ${payload.customerInfo}\n` : '')

      const fields = [
        { name: 'Lisans Anahtarı', value: `\`${maskedKey}\``, inline: true },
        { name: 'Paket / Tier', value: payload.tier.toUpperCase(), inline: true },
        { name: 'Bitiş Tarihi', value: expDate, inline: true },
      ]
      if (payload.salesChannel) fields.push({ name: 'Satış Kanalı', value: payload.salesChannel, inline: true })
      if (payload.customerInfo) fields.push({ name: 'Müşteri / Not', value: payload.customerInfo, inline: true })

      await broadcastNotification({
        title: '🚀 Yeni Lisans Aktivasyonu',
        plainText: `Bir cihaz başarıyla ZenDev ${payload.tier.toUpperCase()} lisansını etkinleştirdi.`,
        htmlText: html,
        color: 0x10b981, // Emerald green
        fields,
      })
    } catch (err) {
      console.warn('[notifier] notifyKeyActivated failed:', err)
    }
  })
}

/** Trigger when a key is revoked or deactivated */
export function notifyKeyRevoked(payload: {
  key: string
  reason?: string
  ip?: string
}): void {
  setImmediate(async () => {
    try {
      const settings = await getNotificationSettings()
      if (!settings.notify_on_revoke) return

      const maskedKey = `${payload.key.slice(0, 10)}...${payload.key.slice(-5)}`
      const html = `<b>🛑 Lisans İptal / Deaktif Bildirimi</b>\n\n` +
        `🔑 <b>Lisans:</b> <code>${maskedKey}</code>\n` +
        `⚠️ <b>Sebep:</b> ${payload.reason || 'Admin tarafından deaktif edildi'}\n` +
        (payload.ip ? `🌐 <b>IP:</b> ${payload.ip}\n` : '')

      await broadcastNotification({
        title: '🛑 Lisans İptal Edildi / Oturum Kapatıldı',
        plainText: `Lisans anahtarı ${maskedKey} sonlandırıldı. Bağlı istemciler anında kick-out edildi.`,
        htmlText: html,
        color: 0xef4444, // Red
        fields: [
          { name: 'Lisans', value: `\`${maskedKey}\``, inline: true },
          { name: 'Neden', value: payload.reason || 'Yönetici deaktif etti', inline: true },
        ],
      })
    } catch (err) {
      console.warn('[notifier] notifyKeyRevoked failed:', err)
    }
  })
}

/** Trigger on security alerts (e.g. brute force lockout) */
export function notifySecurityAlert(payload: {
  action: string
  ip: string
  details: string
}): void {
  setImmediate(async () => {
    try {
      const settings = await getNotificationSettings()
      if (!settings.notify_on_alert) return

      const html = `<b>🛡️ ZenDev Güvenlik Alarmı</b>\n\n` +
        `⚠️ <b>Olay:</b> ${payload.action}\n` +
        `🌐 <b>IP Adresi:</b> <code>${payload.ip}</code>\n` +
        `📝 <b>Detay:</b> ${payload.details}\n`

      await broadcastNotification({
        title: '🛡️ Güvenlik Uyarısı',
        plainText: `Güvenlik denetleyicisi şüpheli bir işlem algıladı: ${payload.action}`,
        htmlText: html,
        color: 0xf59e0b, // Amber
        fields: [
          { name: 'Olay', value: payload.action, inline: true },
          { name: 'IP', value: payload.ip, inline: true },
          { name: 'Açıklama', value: payload.details, inline: false },
        ],
      })
    } catch (err) {
      console.warn('[notifier] notifySecurityAlert failed:', err)
    }
  })
}
