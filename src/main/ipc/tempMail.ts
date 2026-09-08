import { ipcMain } from 'electron'
import axios from 'axios'

const API_BASE = 'https://api.guerrillamail.com/ajax.php'

// GuerrillaMail requires a session token to fetch emails for an address.
// We map the generated email to its token here so the frontend doesn't need to care.
const sessions: Record<string, string> = {}

export interface TempMailMessage {
  id: string
  from: string
  subject: string
  date: string
}

export interface TempMailMessageDetails extends TempMailMessage {
  attachments: { filename: string; contentType: string; size: number }[]
  body: string
  textBody: string
  htmlBody: string
}

async function generateEmail(): Promise<{ success: boolean; email?: string; error?: string }> {
  try {
    const response = await axios.get(`${API_BASE}?f=get_email_address`)
    if (response.data && response.data.email_addr) {
      sessions[response.data.email_addr] = response.data.sid_token
      return { success: true, email: response.data.email_addr }
    }
    return { success: false, error: 'Failed to generate email' }
  } catch (error: any) {
    console.error('[TempMail] Generate error:', error?.message || String(error))
    return { success: false, error: 'Network error generating email' }
  }
}

async function checkInbox(
  email: string
): Promise<{ success: boolean; messages?: TempMailMessage[]; error?: string }> {
  try {
    const sidToken = sessions[email]
    if (!sidToken) return { success: false, error: 'Session expired or not found' }

    // get_email_list returns 20 latest emails
    const response = await axios.get(`${API_BASE}?f=get_email_list&offset=0&sid_token=${sidToken}`)
    if (response.data && response.data.list) {
      const messages = response.data.list.map((m: any) => ({
        id: m.mail_id,
        from: m.mail_from,
        subject: m.mail_subject,
        date: m.mail_date,
      }))
      return { success: true, messages }
    }
    return { success: true, messages: [] }
  } catch (error: any) {
    console.error('[TempMail] Check inbox error:', error?.message || String(error))
    return { success: false, error: 'Network error checking inbox' }
  }
}

async function readMessage(
  email: string,
  id: string
): Promise<{ success: boolean; message?: TempMailMessageDetails; error?: string }> {
  try {
    const sidToken = sessions[email]
    if (!sidToken) return { success: false, error: 'Session expired or not found' }

    const response = await axios.get(
      `${API_BASE}?f=fetch_email&email_id=${id}&sid_token=${sidToken}`
    )
    if (response.data) {
      const m = response.data
      return {
        success: true,
        message: {
          id: m.mail_id,
          from: m.mail_from,
          subject: m.mail_subject,
          date: m.mail_date,
          attachments: [], // GuerrillaMail API doesn't expose attachments simply via this endpoint
          body: m.mail_body,
          htmlBody: m.mail_body,
          textBody: m.mail_excerpt || '',
        },
      }
    }
    return { success: false, error: 'Message not found' }
  } catch (error: any) {
    console.error('[TempMail] Read message error:', error?.message || String(error))
    return { success: false, error: 'Network error reading message' }
  }
}

export function registerTempMailIPC(): void {
  ipcMain.handle('tempmail:generate', async () => generateEmail())
  ipcMain.handle('tempmail:check', async (_event, email: string) => checkInbox(email))
  ipcMain.handle('tempmail:read', async (_event, email: string, id: string) =>
    readMessage(email, id)
  )
}
