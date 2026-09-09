/**
 * server/src/email.ts
 *
 * Resend-powered email sender.
 * Sends the license key to the buyer after a successful purchase.
 */
import { Resend } from 'resend'

let _resend: Resend | null = null

function getResend(): Resend {
  if (!_resend) {
    const apiKey = process.env['RESEND_API_KEY']
    if (!apiKey) throw new Error('RESEND_API_KEY not set')
    _resend = new Resend(apiKey)
  }
  return _resend
}

interface LicenseEmailParams {
  to:        string
  key:       string
  tier:      string
  expiresAt: number  // 0 = never
}

export async function sendLicenseEmail(params: LicenseEmailParams): Promise<void> {
  const { to, key, tier, expiresAt } = params
  const from = process.env['EMAIL_FROM'] ?? 'ZenDev <license@zendev.app>'

  const tierLabel: Record<string, string> = {
    free:     'Free',
    pro:      'Pro',
    team:     'Team',
    lifetime: 'Lifetime',
  }

  const expiryText = expiresAt === 0
    ? 'Never (Lifetime license)'
    : new Date(expiresAt).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
      })

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: system-ui, sans-serif; background: #0a0a0f; color: #e2e8f0; margin: 0; padding: 40px 20px; }
    .card { background: #111118; border: 1px solid #1e1e2e; border-radius: 16px; max-width: 520px; margin: 0 auto; padding: 40px; }
    .logo { font-size: 24px; font-weight: 800; margin-bottom: 24px; }
    .logo span { color: #8b5cf6; }
    h1 { font-size: 20px; font-weight: 700; margin: 0 0 8px; }
    p { color: #94a3b8; font-size: 15px; line-height: 1.6; margin: 0 0 20px; }
    .key-box { background: #0a0a0f; border: 1px solid #22d3ee40; border-radius: 10px; padding: 16px 20px; font-family: monospace; font-size: 18px; letter-spacing: 2px; color: #22d3ee; text-align: center; margin: 24px 0; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 20px 0; }
    .meta-item { background: #0a0a0f; border: 1px solid #1e1e2e; border-radius: 8px; padding: 12px 16px; }
    .meta-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #475569; margin-bottom: 4px; }
    .meta-value { font-size: 15px; font-weight: 600; color: #e2e8f0; }
    .footer { font-size: 12px; color: #475569; margin-top: 32px; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">Zen<span>Dev</span></div>
    <h1>Your License Key 🎉</h1>
    <p>Thank you for your purchase! Here is your ZenDev license key. Keep it safe — you'll need it to activate the application.</p>

    <div class="key-box">${key}</div>

    <div class="meta">
      <div class="meta-item">
        <div class="meta-label">Plan</div>
        <div class="meta-value">${tierLabel[tier] ?? tier}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Valid Until</div>
        <div class="meta-value">${expiryText}</div>
      </div>
    </div>

    <p>Open ZenDev, click <strong>License Check</strong>, and paste your key to activate. You can activate on up to 2 devices.</p>

    <div class="footer">
      ZenDev · If you have any issues, reply to this email.<br/>
      Do not share your license key with others.
    </div>
  </div>
</body>
</html>
  `.trim()

  await getResend().emails.send({
    from,
    to,
    subject: `Your ZenDev ${tierLabel[tier] ?? tier} License Key`,
    html,
  })
}
