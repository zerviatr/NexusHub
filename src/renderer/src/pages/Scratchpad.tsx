import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText,
  Copy,
  Check,
  Download,
  Trash2,
  Columns,
  Eye,
  Edit3,
  Code,
  Bold,
  Italic,
  List,
  Heading,
  Clock,
  Sparkles,
  Link,
  CheckSquare,
  Plus,
  X,
  Printer,
  FileCode,
  Search,
  BookOpen,
  Share2,
  Strikethrough,
  Table as TableIcon,
  Maximize2,
  Minimize2,
  Lock,
  Unlock,
  History,
  RotateCcw,
  Replace,
  ArrowDown,
  ArrowUp,
  Image as ImageIcon,
  Workflow,
  Key,
} from 'lucide-react'
import BaseToolTemplate from '../components/BaseToolTemplate'
import { cyberAudio } from '../lib/cyberAudio'
import { useToast } from '../lib/ToastContext'

interface Note {
  id: string
  title: string
  content: string
  updatedAt: number
  isEncrypted?: boolean
  encryptedBlob?: string
}

interface NoteSnapshot {
  id: string
  timestamp: number
  previewTitle: string
  charCount: number
  content: string
}

// ─── AES-GCM Web Crypto Helpers (100% Offline & Pure JS) ────────────────────
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

async function encryptNoteText(text: string, password: string): Promise<string> {
  const enc = new TextEncoder()
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(password, salt)
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(text))
  const combined = new Uint8Array(salt.length + iv.length + ciphertext.byteLength)
  combined.set(salt, 0)
  combined.set(iv, salt.length)
  combined.set(new Uint8Array(ciphertext), salt.length + iv.length)
  return btoa(String.fromCharCode(...combined))
}

async function decryptNoteText(cipherB64: string, password: string): Promise<string> {
  const binary = atob(cipherB64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  const salt = bytes.slice(0, 16)
  const iv = bytes.slice(16, 28)
  const ciphertext = bytes.slice(28)
  const key = await deriveKey(password, salt)
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
  return new TextDecoder().decode(decrypted)
}

const DEFAULT_NOTE_CONTENT = `# NexusHub Scratchpad Ultimate

Geliştiriciler, güvenlik uzmanları ve teknik ekipler için tasarlanmış ileri düzey çevrimdışı Markdown ve Kod stüdyosu.

## ⚡ Canlı Yetenekler
- [x] Çoklu sekme & bağımsız not yönetimi
- [x] Ctrl+F İçiçe Bul & Değiştir (Find & Replace)
- [x] Doğrudan görsel sürükle-bırak (Auto Base64 embed)
- [x] Satır numaraları ve senkronize çift kaydırma (Dual-scroll)
- [x] AES-GCM Parolalı Şifreli Not Kalkanı (Vault Mode)
- [x] Dikkat dağıtmayan Zen / Tam Ekran modu
- [x] Otomatik sürüm geçmişi ve geri yükleme zaman tüneli
- [x] Canlı Akış Şeması (Flowchart) render motoru

### 🛠️ Örnek Akış Şeması
\`\`\`flow
İstemci --> [NexusHub GUI] --> [IPC Watchdog] --> [Kritik Süreç]
\`\`\`

### 📊 Örnek Tablo
| Protokol | Port | Açıklama | Güvenlik Durumu |
| :--- | :--- | :--- | :--- |
| HTTPS | 443 | Güvenli Web Trafiği | TLS 1.3 Aktif |
| SSH | 22 | Güvenli Kabuk Erişimi | Ed25519 Anahtar |
| Redis | 6379 | In-Memory Veri Deposu | Dahili Ağ İzolasyonu |

\`\`\`typescript
// NexusHub Hızlı API Test Parçacığı
async function verifyNetworkIntegrity(host: string): Promise<boolean> {
  const telemetry = await window.nexusAPI.port.scanActivePorts();
  return telemetry.length > 0;
}
\`\`\`

> "Bütün araçlar tek bir komutta elinizin altında."
`

const TEMPLATES: Record<string, { title: string; content: string }> = {
  meeting: {
    title: 'Toplantı Notu',
    content: `# 📋 Sprint Planlama & Teknik Değerlendirme

**Tarih:** ${new Date().toLocaleDateString('tr-TR')}  
**Katılımcılar:** @Takım Lideri, @Backend, @Frontend, @DevOps  

---

## 🎯 Gündem Maddeleri
1. v2.2.0 mimari hedefleri ve yeni araç eklemeleri
2. CI/CD derleme sürelerinin düşürülmesi ve blokmap optimizasyonu
3. Güvenlik taraması ve bağımlılık denetimleri

## 📝 Alınan Kararlar
- [ ] Yeni mikro araçlar için Lazy-loading standardı korunacak
- [ ] Windows Defender false-positive risklerine karşı release imzaları doğrulanacak
- [ ] RAM Sentinel flush eşiği %85 olarak belirlendi

## 📌 Aksiyon Maddeleri
- [ ] **@Backend:** TCP watchdog port kapatma testlerini tamamla
- [ ] **@Frontend:** Scratchpad Pro sekme mimarisini doğrula
- [ ] **@DevOps:** GitHub Actions cache oranını kontrol et
`,
  },
  bug: {
    title: 'Hata Bildirimi',
    content: `# 🐛 Hata Raporu: [Hatanın Kısa Tanımı]

**Öncelik:** 🔴 Yüksek / 🟡 Orta / 🟢 Düşük  
**İlgili Modül:** Örn. NetworkTools / DevSandbox  
**Sürüm:** NexusHub v2.1.9  

---

## 🔍 Beklenen Davranış
Butona tıklandığında işlem arka planda kesintisiz çalışmalı ve toast bildirimi göstermelidir.

## ❌ Gerçekleşen Davranış
İşlem sırasında console'da IPC timeout hatası dönüyor ve ekran donuyor.

## 🔁 Yeniden Üretim Adımları
1. Uygulama menüsünden ilgili aracı açın
2. Girdi alanına geçersiz formatta bir IP veya JSON yapıştırın
3. 'Çalıştır' butonuna basın
`,
  },
  apiDoc: {
    title: 'REST API Dokümanı',
    content: `# 🌐 REST API Uç Nokta Spesifikasyonu

### \`POST /api/v1/auth/verify\`
Kullanıcı oturum anahtarını doğrular ve geçici JWT token üretir.

---

#### 📥 İstek Başlıkları (Headers)
| Başlık | Tip | Zorunlu | Açıklama |
| :--- | :--- | :--- | :--- |
| Authorization | String | Evet | \`Bearer <API_KEY>\` |
| Content-Type | String | Evet | \`application/json\` |

#### 📦 İstek Gövdesi (Payload)
\`\`\`json
{
  "client_id": "nexus-client-01",
  "nonce": 17889342,
  "fingerprint": "a9f8b2c4e1d3"
}
\`\`\`

#### 📤 Başarılı Yanıt (\`200 OK\`)
\`\`\`json
{
  "status": "success",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 3600
}
\`\`\`
`,
  },
  readme: {
    title: 'Proje README',
    content: `# 🚀 Proje Adı

> Kısa ve etkileyici proje açıklaması buraya gelir.

---

## 📦 Kurulum
\`\`\`bash
# Depoyu klonlayın
git clone https://github.com/kullanici/proje.git

# Bağımlılıkları yükleyin
npm install

# Geliştirme sunucusunu başlatın
npm run dev
\`\`\`

## 🛠️ Mimari & Teknoloji Yığını
- **Arayüz:** React 18 + Tailwind CSS
- **Masaüstü:** Electron + Vite
- **Paketleme:** Electron Builder NSIS

## 📄 Lisans
MIT © 2026 NexusHub
`,
  },
}

export default function Scratchpad() {
  const { success: showToastSuccess, error: showToastError } = useToast()

  // Multi-tab storage
  const [notes, setNotes] = useState<Note[]>(() => {
    try {
      const stored = localStorage.getItem('nexus_scratchpad_notes')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch {}
    return [
      {
        id: 'default-note',
        title: 'Genel Notlar',
        content: DEFAULT_NOTE_CONTENT,
        updatedAt: Date.now(),
      },
    ]
  })

  const [activeNoteId, setActiveNoteId] = useState<string>(() => {
    return notes[0]?.id || 'default-note'
  })

  const [viewMode, setViewMode] = useState<'split' | 'edit' | 'preview'>('split')
  const [copied, setCopied] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showTemplates, setShowTemplates] = useState(false)
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null)
  const [tempTitle, setTempTitle] = useState('')

  // 1. Find & Replace state
  const [showFindReplace, setShowFindReplace] = useState(false)
  const [findQuery, setFindQuery] = useState('')
  const [replaceQuery, setReplaceQuery] = useState('')
  const [isCaseSensitive, setIsCaseSensitive] = useState(false)

  // 2. Zen Mode state
  const [isZenMode, setIsZenMode] = useState(false)

  // 3. Vault / Encryption state
  const [showVaultModal, setShowVaultModal] = useState(false)
  const [vaultPassword, setVaultPassword] = useState('')
  const [isDecrypting, setIsDecrypting] = useState(false)
  const [unlockPassword, setUnlockPassword] = useState('')

  // 4. Timeline / Snapshot state
  const [showTimeline, setShowTimeline] = useState(false)
  const [snapshots, setSnapshots] = useState<NoteSnapshot[]>(() => {
    try {
      const saved = localStorage.getItem('nexus_scratchpad_snapshots')
      if (saved) return JSON.parse(saved)
    } catch {}
    return []
  })

  const editorRef = useRef<HTMLTextAreaElement>(null)
  const gutterRef = useRef<HTMLDivElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)

  // Current active note
  const activeNote = notes.find((n) => n.id === activeNoteId) || notes[0]

  // Persist notes
  useEffect(() => {
    try {
      localStorage.setItem('nexus_scratchpad_notes', JSON.stringify(notes))
    } catch (e) {
      console.error(e)
    }
  }, [notes])

  // Persist snapshots
  useEffect(() => {
    try {
      localStorage.setItem('nexus_scratchpad_snapshots', JSON.stringify(snapshots.slice(0, 15)))
    } catch {}
  }, [snapshots])

  // Periodic auto-snapshot (every 3 minutes if content changed)
  useEffect(() => {
    const timer = setInterval(() => {
      if (!activeNote || activeNote.isEncrypted || !activeNote.content.trim()) return
      setSnapshots((prev) => {
        const last = prev[0]
        if (last && last.content === activeNote.content) return prev
        const newSnap: NoteSnapshot = {
          id: `snap-${Date.now()}`,
          timestamp: Date.now(),
          previewTitle: activeNote.title,
          charCount: activeNote.content.length,
          content: activeNote.content,
        }
        return [newSnap, ...prev].slice(0, 15)
      })
    }, 180000)
    return () => clearInterval(timer)
  }, [activeNote])

  // Update active note content
  const updateContent = (newContent: string) => {
    setNotes((prev) =>
      prev.map((n) =>
        n.id === activeNote.id ? { ...n, content: newContent, updatedAt: Date.now() } : n
      )
    )
  }

  // Find occurrences counter
  const matchCount = useMemo(() => {
    if (!findQuery || !activeNote.content) return 0
    try {
      const flags = isCaseSensitive ? 'g' : 'gi'
      const regex = new RegExp(findQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags)
      const matches = activeNote.content.match(regex)
      return matches ? matches.length : 0
    } catch {
      return 0
    }
  }, [findQuery, activeNote.content, isCaseSensitive])

  // Handle Find Next
  const handleFindNext = () => {
    const textarea = editorRef.current
    if (!textarea || !findQuery) return
    const text = activeNote.content
    const flags = isCaseSensitive ? '' : 'i'
    const currentPos = textarea.selectionEnd
    const regex = new RegExp(findQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags)

    const slice = text.substring(currentPos)
    const match = slice.match(regex)
    if (match && match.index !== undefined) {
      const start = currentPos + match.index
      const end = start + match[0].length
      textarea.focus()
      textarea.setSelectionRange(start, end)
      cyberAudio.click()
    } else {
      // Loop from beginning
      const firstMatch = text.match(regex)
      if (firstMatch && firstMatch.index !== undefined) {
        const start = firstMatch.index
        const end = start + firstMatch[0].length
        textarea.focus()
        textarea.setSelectionRange(start, end)
        cyberAudio.click()
      }
    }
  }

  // Handle Replace Once
  const handleReplaceOnce = () => {
    const textarea = editorRef.current
    if (!textarea || !findQuery) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const currentSelected = activeNote.content.substring(start, end)

    const matches = isCaseSensitive
      ? currentSelected === findQuery
      : currentSelected.toLowerCase() === findQuery.toLowerCase()

    if (matches) {
      const updated =
        activeNote.content.substring(0, start) +
        replaceQuery +
        activeNote.content.substring(end)
      updateContent(updated)
      cyberAudio.copySuccess()
      setTimeout(() => handleFindNext(), 20)
    } else {
      handleFindNext()
    }
  }

  // Handle Replace All
  const handleReplaceAll = () => {
    if (!findQuery) return
    try {
      const flags = isCaseSensitive ? 'g' : 'gi'
      const regex = new RegExp(findQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags)
      const count = (activeNote.content.match(regex) || []).length
      if (count === 0) {
        showToastError('Bulunamadı', 'Değiştirilecek eşleşme bulunamadı.')
        return
      }
      const updated = activeNote.content.replace(regex, replaceQuery)
      updateContent(updated)
      cyberAudio.copySuccess()
      showToastSuccess('Tümü Değiştirildi', `${count} eşleşme başarıyla güncellendi.`)
    } catch {
      showToastError('Hata', 'Arama ifadesi geçersiz.')
    }
  }

  // Drag & Drop Image directly to Base64 Markdown
  const handleDrop = (e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault()
    const files = e.dataTransfer.files
    if (!files || files.length === 0) return

    const file = files[0]
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (ev) => {
        const base64 = ev.target?.result as string
        if (base64) {
          const imgMarkdown = `\n![${file.name}](${base64})\n`
          wrapSelection(imgMarkdown, '', '')
          cyberAudio.copySuccess()
          showToastSuccess('Görsel Eklendi', `${file.name} başarıyla Markdown içine gömüldü.`)
        }
      }
      reader.readAsDataURL(file)
    }
  }

  // Lock Note (AES-GCM)
  const handleLockNote = async () => {
    if (!vaultPassword.trim()) {
      showToastError('Parola Gerekli', 'Lütfen bir şifreleme parolası belirleyin.')
      return
    }
    try {
      const encrypted = await encryptNoteText(activeNote.content, vaultPassword.trim())
      setNotes((prev) =>
        prev.map((n) =>
          n.id === activeNote.id
            ? {
                ...n,
                isEncrypted: true,
                encryptedBlob: encrypted,
                content: '',
                updatedAt: Date.now(),
              }
            : n
        )
      )
      setVaultPassword('')
      setShowVaultModal(false)
      cyberAudio.shred()
      showToastSuccess('Not Kilitlendi', 'Not AES-256-GCM ile güvenli şekilde şifrelendi.')
    } catch (e) {
      showToastError('Hata', 'Şifreleme sırasında bir hata oluştu.')
    }
  }

  // Unlock Note
  const handleUnlockNote = async () => {
    if (!unlockPassword.trim() || !activeNote.encryptedBlob) return
    setIsDecrypting(true)
    try {
      const decrypted = await decryptNoteText(activeNote.encryptedBlob, unlockPassword.trim())
      setNotes((prev) =>
        prev.map((n) =>
          n.id === activeNote.id
            ? {
                ...n,
                isEncrypted: false,
                encryptedBlob: undefined,
                content: decrypted,
                updatedAt: Date.now(),
              }
            : n
        )
      )
      setUnlockPassword('')
      cyberAudio.copySuccess()
      showToastSuccess('Kilit Açıldı', 'Not içeriği başarıyla çözüldü.')
    } catch {
      cyberAudio.shred()
      showToastError('Hatalı Parola', 'Girdiğiniz parola ile not çözülemedi.')
    } finally {
      setIsDecrypting(false)
    }
  }

  // Restore Snapshot
  const handleRestoreSnapshot = (snap: NoteSnapshot) => {
    if (window.confirm(`${new Date(snap.timestamp).toLocaleTimeString()} tarihli sürüme dönmek istiyor musunuz?`)) {
      updateContent(snap.content)
      setShowTimeline(false)
      cyberAudio.copySuccess()
      showToastSuccess('Geri Yüklendi', 'Not önceki sürüme döndürüldü.')
    }
  }

  // Create new note
  const handleAddNote = () => {
    try {
      cyberAudio.click()
    } catch {}
    const newNote: Note = {
      id: `note-${Date.now()}`,
      title: `Not ${notes.length + 1}`,
      content: `# Yeni Not\n\nBuraya yazmaya başlayın...\n`,
      updatedAt: Date.now(),
    }
    setNotes((prev) => [...prev, newNote])
    setActiveNoteId(newNote.id)
    showToastSuccess('Yeni Not', 'Yeni not sekmesi oluşturuldu.')
  }

  // Close / Delete note
  const handleDeleteNote = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (notes.length <= 1) {
      showToastError('Uyarı', 'En az bir not sekmesi bulunmalıdır.')
      return
    }
    if (window.confirm('Bu notu silmek istediğinize emin misiniz?')) {
      try {
        cyberAudio.shred()
      } catch {}
      const nextNotes = notes.filter((n) => n.id !== id)
      setNotes(nextNotes)
      if (activeNoteId === id) {
        setActiveNoteId(nextNotes[0].id)
      }
      showToastSuccess('Silindi', 'Not başarıyla kaldırıldı.')
    }
  }

  // Rename note
  const handleSaveTitle = (id: string) => {
    if (!tempTitle.trim()) {
      setEditingTitleId(null)
      return
    }
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, title: tempTitle.trim(), updatedAt: Date.now() } : n))
    )
    setEditingTitleId(null)
  }

  // Apply template
  const handleApplyTemplate = (key: string) => {
    const tpl = TEMPLATES[key]
    if (!tpl) return
    try {
      cyberAudio.click()
    } catch {}
    const newNote: Note = {
      id: `note-tpl-${Date.now()}`,
      title: tpl.title,
      content: tpl.content,
      updatedAt: Date.now(),
    }
    setNotes((prev) => [...prev, newNote])
    setActiveNoteId(newNote.id)
    setShowTemplates(false)
    showToastSuccess('Şablon Eklendi', `${tpl.title} yeni bir sekme olarak açıldı.`)
  }

  // Smart Selection Wrapping
  const wrapSelection = (prefix: string, suffix: string = '', placeholder: string = 'metin') => {
    const textarea = editorRef.current
    if (!textarea) return

    try {
      cyberAudio.click()
    } catch {}

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const current = activeNote.content
    const selected = current.substring(start, end)

    let replacement = ''
    let newCursorPos = 0

    if (selected.length > 0) {
      replacement = `${prefix}${selected}${suffix}`
      newCursorPos = start + replacement.length
    } else {
      replacement = `${prefix}${placeholder}${suffix}`
      newCursorPos = start + prefix.length + placeholder.length
    }

    const updated = current.substring(0, start) + replacement + current.substring(end)
    updateContent(updated)

    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, 10)
  }

  // Keyboard Shortcuts in Textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key.toLowerCase() === 'f') {
        e.preventDefault()
        setShowFindReplace((prev) => !prev)
      } else if (e.key.toLowerCase() === 'b') {
        e.preventDefault()
        wrapSelection('**', '**', 'kalın metin')
      } else if (e.key.toLowerCase() === 'i') {
        e.preventDefault()
        wrapSelection('*', '*', 'italik metin')
      } else if (e.key.toLowerCase() === 'k') {
        e.preventDefault()
        wrapSelection('[', '](https://)', 'bağlantı metni')
      } else if (e.shiftKey && e.key.toLowerCase() === 'x') {
        e.preventDefault()
        wrapSelection('~~', '~~', 'üstü çizili')
      } else if (e.key.toLowerCase() === 's') {
        e.preventDefault()
        handleDownloadMd()
      }
    } else if (e.key === 'Tab') {
      e.preventDefault()
      const textarea = editorRef.current
      if (!textarea) return
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const current = activeNote.content

      if (!e.shiftKey) {
        // Indent 2 spaces
        const updated = current.substring(0, start) + '  ' + current.substring(end)
        updateContent(updated)
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 2
        }, 0)
      } else {
        // Unindent
        if (start >= 2 && current.substring(start - 2, start) === '  ') {
          const updated = current.substring(0, start - 2) + current.substring(end)
          updateContent(updated)
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = start - 2
          }, 0)
        }
      }
    }
  }

  // Synchronized Dual-Scroll (Editor, Gutter & Preview)
  const handleEditorScroll = () => {
    const editor = editorRef.current
    const gutter = gutterRef.current
    const preview = previewRef.current

    if (editor && gutter) {
      gutter.scrollTop = editor.scrollTop
    }

    if (viewMode === 'split' && editor && preview) {
      const percentage = editor.scrollTop / (editor.scrollHeight - editor.clientHeight || 1)
      preview.scrollTop = percentage * (preview.scrollHeight - preview.clientHeight)
    }
  }

  // Interactive Task List Toggle (clicking preview checkbox updates editor line!)
  const toggleTaskLine = (lineIndex: number) => {
    const lines = activeNote.content.split('\n')
    if (lineIndex < 0 || lineIndex >= lines.length) return

    const line = lines[lineIndex]
    if (line.startsWith('- [ ] ')) {
      lines[lineIndex] = line.replace('- [ ] ', '- [x] ')
    } else if (line.startsWith('- [x] ')) {
      lines[lineIndex] = line.replace('- [x] ', '- [ ] ')
    }

    try {
      cyberAudio.click()
    } catch {}

    updateContent(lines.join('\n'))
  }

  // Metrics
  const charCount = activeNote.content.length
  const wordCount = activeNote.content.trim() ? activeNote.content.trim().split(/\s+/).length : 0
  const linesArray = activeNote.content.split('\n')
  const lineCount = linesArray.length
  const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200))

  // Copy raw markdown
  const handleCopy = () => {
    navigator.clipboard.writeText(activeNote.content)
    try {
      cyberAudio.copySuccess()
    } catch {}
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
    showToastSuccess('Kopyalandı', 'Markdown içeriği panoya kopyalandı.')
  }

  // Copy formatted HTML
  const handleCopyHtml = () => {
    const html = generateStyledHtml(activeNote.content)
    navigator.clipboard.writeText(html)
    try {
      cyberAudio.copySuccess()
    } catch {}
    showToastSuccess('HTML Kopyalandı', 'Biçimlendirilmiş HTML panoya kopyalandı.')
  }

  // Print / Save as PDF
  const handlePrint = () => {
    try {
      cyberAudio.click()
    } catch {}
    window.print()
  }

  // Download .md
  const handleDownloadMd = () => {
    try {
      cyberAudio.copySuccess()
    } catch {}
    const blob = new Blob([activeNote.content], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${activeNote.title.toLowerCase().replace(/[^a-z0-9]/gi, '_') || 'note'}.md`
    a.click()
    URL.revokeObjectURL(url)
    showToastSuccess('İndirildi', 'Markdown dosyası kaydedildi.')
  }

  // Download .html
  const handleDownloadHtml = () => {
    try {
      cyberAudio.copySuccess()
    } catch {}
    const htmlContent = generateStyledHtml(activeNote.content)
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${activeNote.title.toLowerCase().replace(/[^a-z0-9]/gi, '_') || 'note'}.html`
    a.click()
    URL.revokeObjectURL(url)
    showToastSuccess('İndirildi', 'HTML dosyası kaydedildi.')
  }

  // Filtered notes by search query
  const filteredNotes = notes.filter((n) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)
  })

  // Full Rich HTML generator for export
  const generateStyledHtml = (text: string) => {
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${activeNote.title} - NexusHub Export</title>
<style>
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    padding: 2.5rem;
    line-height: 1.7;
    background: #09090e;
    color: #e2e8f0;
    max-width: 860px;
    margin: auto;
  }
  h1 { font-size: 2rem; color: #ffffff; border-bottom: 1px solid #27273a; padding-bottom: 0.5rem; }
  h2 { font-size: 1.5rem; color: #06b6d4; margin-top: 1.5rem; }
  h3 { font-size: 1.25rem; color: #8b5cf6; margin-top: 1.25rem; }
  pre { background: #13131f; padding: 1.25rem; border-radius: 10px; border: 1px solid #27273a; overflow-x: auto; color: #a5f3fc; }
  code { font-family: monospace; }
  blockquote { border-left: 4px solid #8b5cf6; padding-left: 1rem; margin: 1rem 0; color: #cbd5e1; background: rgba(139,92,246,0.06); padding: 0.5rem 1rem; border-radius: 0 8px 8px 0; font-style: italic; }
  table { width: 100%; border-collapse: collapse; margin: 1.5rem 0; }
  th, td { border: 1px solid #27273a; padding: 0.75rem; text-align: left; }
  th { background: #1a1a2e; color: #06b6d4; }
  tr:nth-child(even) { background: #0f0f18; }
</style>
</head>
<body>
<pre style="white-space: pre-wrap; font-family: inherit; background: transparent; border: none; padding: 0;">${text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
</body>
</html>`
  }

  // Flowchart ASCII/SVG node parser
  const renderFlowchart = (raw: string, keyIdx: number) => {
    const lines = raw.trim().split('\n')
    return (
      <div
        key={`flow-${keyIdx}`}
        className="my-3 p-4 rounded-xl border border-nexus-cyan/30 bg-black/50 overflow-x-auto"
      >
        <div className="flex items-center gap-2 mb-2 text-[10px] font-mono text-nexus-cyan">
          <Workflow className="w-3.5 h-3.5" />
          <span>CANLI AKIŞ ŞEMASI (FLOWCHART)</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 py-2">
          {lines.map((line, lIdx) => {
            const parts = line.split(/-->|->/).map((p) => p.trim())
            return (
              <div key={lIdx} className="flex items-center gap-2 flex-wrap">
                {parts.map((p, pIdx) => (
                  <div key={pIdx} className="flex items-center gap-2">
                    <span className="px-3 py-1.5 rounded-lg bg-nexus-surface border border-nexus-accent/50 text-xs font-mono text-white shadow-sm shadow-nexus-accent/20">
                      {p.replace(/^\[|\]$/g, '')}
                    </span>
                    {pIdx < parts.length - 1 && (
                      <span className="text-nexus-cyan text-xs font-bold font-mono">→</span>
                    )}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // Advanced Markdown Component Renderer
  const renderAdvancedMarkdown = (text: string) => {
    const lines = text.split('\n')
    let inCodeBlock = false
    let codeLanguage = ''
    let codeBlockBuffer: string[] = []
    let inTable = false
    let tableBuffer: string[] = []

    const elements: React.ReactNode[] = []

    const flushTable = (key: string) => {
      if (tableBuffer.length === 0) return
      const rows = tableBuffer.map((r) =>
        r
          .split('|')
          .map((c) => c.trim())
          .filter((c, i, arr) => (i === 0 && c === '' ? false : i === arr.length - 1 && c === '' ? false : true))
      )
      tableBuffer = []
      inTable = false

      if (rows.length === 0) return

      const headerRow = rows[0]
      const bodyRows = rows.slice(1).filter((r) => !r.every((cell) => /^:?-+:?$/.test(cell)))

      elements.push(
        <div key={key} className="overflow-x-auto my-3 rounded-xl border border-nexus-border/60 bg-nexus-surface/30">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-nexus-surface/80 text-nexus-cyan font-mono border-b border-nexus-border/60">
              <tr>
                {headerRow.map((cell, cIdx) => (
                  <th key={cIdx} className="p-2.5 font-semibold">
                    {cell}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-nexus-border/30 text-nexus-text">
              {bodyRows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-white/[0.02] transition-colors">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="p-2.5">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }

    lines.forEach((line, idx) => {
      // Code block handling
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          const codeContent = codeBlockBuffer.join('\n')
          const isFlow = codeLanguage === 'flow' || codeLanguage === 'mermaid'
          codeBlockBuffer = []
          inCodeBlock = false

          if (isFlow) {
            elements.push(renderFlowchart(codeContent, idx))
            return
          }

          elements.push(
            <div
              key={`code-${idx}`}
              className="relative my-3 rounded-xl border border-nexus-border/60 bg-black/60 p-4 font-mono text-xs text-nexus-cyan overflow-x-auto group"
            >
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(codeContent)
                  try {
                    cyberAudio.copySuccess()
                  } catch {}
                  showToastSuccess('Kopyalandı', 'Kod bloğu panoya kopyalandı.')
                }}
                className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 rounded bg-nexus-surface border border-nexus-border/60 text-[10px] text-white hover:text-nexus-cyan flex items-center gap-1"
              >
                <Copy className="w-3 h-3" />
                <span>Kopyala</span>
              </button>
              <pre className="selection:bg-nexus-cyan/20">
                <code>{codeContent}</code>
              </pre>
            </div>
          )
          return
        } else {
          inCodeBlock = true
          codeLanguage = line.slice(3).trim().toLowerCase()
          codeBlockBuffer = []
          return
        }
      }

      if (inCodeBlock) {
        codeBlockBuffer.push(line)
        return
      }

      // Table handling
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        inTable = true
        tableBuffer.push(line)
        return
      } else if (inTable) {
        flushTable(`table-${idx}`)
      }

      // Images: ![alt](url)
      const imgMatch = line.match(/^!\[(.*?)\]\((.*?)\)$/)
      if (imgMatch) {
        elements.push(
          <div key={`img-${idx}`} className="my-3 text-center">
            <img
              src={imgMatch[2]}
              alt={imgMatch[1] || 'Embedded image'}
              className="max-h-80 mx-auto rounded-xl border border-nexus-border/60 object-contain shadow-lg"
            />
            {imgMatch[1] && (
              <span className="block text-[11px] text-nexus-muted mt-1 italic">{imgMatch[1]}</span>
            )}
          </div>
        )
        return
      }

      // Headers
      if (line.startsWith('# ')) {
        elements.push(
          <h1 key={idx} className="text-2xl font-bold text-white mb-3 mt-4 border-b border-nexus-border/60 pb-2">
            {line.slice(2)}
          </h1>
        )
        return
      }
      if (line.startsWith('## ')) {
        elements.push(
          <h2 key={idx} className="text-xl font-bold text-nexus-cyan mb-2 mt-3">
            {line.slice(3)}
          </h2>
        )
        return
      }
      if (line.startsWith('### ')) {
        elements.push(
          <h3 key={idx} className="text-base font-semibold text-nexus-accent mb-1 mt-2">
            {line.slice(4)}
          </h3>
        )
        return
      }
      if (line.startsWith('#### ')) {
        elements.push(
          <h4 key={idx} className="text-sm font-semibold text-white/90 mb-1 mt-1">
            {line.slice(5)}
          </h4>
        )
        return
      }

      // Horizontal Rule
      if (line.trim() === '---' || line.trim() === '***') {
        elements.push(<hr key={idx} className="my-4 border-nexus-border/40" />)
        return
      }

      // Interactive Task Lists
      if (line.startsWith('- [x] ') || line.startsWith('- [ ] ')) {
        const isChecked = line.startsWith('- [x] ')
        elements.push(
          <div
            key={idx}
            onClick={() => toggleTaskLine(idx)}
            className="flex items-center gap-2.5 my-1.5 text-xs cursor-pointer group select-none"
          >
            <span
              className={`w-4 h-4 rounded flex items-center justify-center text-[10px] transition-all ${
                isChecked
                  ? 'bg-nexus-cyan text-black font-bold shadow-sm shadow-nexus-cyan/40'
                  : 'border border-nexus-border/80 group-hover:border-nexus-cyan text-transparent'
              }`}
            >
              ✓
            </span>
            <span
              className={`transition-colors ${
                isChecked ? 'line-through text-nexus-muted' : 'text-white group-hover:text-nexus-cyan'
              }`}
            >
              {line.slice(6)}
            </span>
          </div>
        )
        return
      }

      // Unordered list
      if (line.startsWith('- ') || line.startsWith('* ')) {
        elements.push(
          <li key={idx} className="ml-5 list-disc text-xs text-nexus-text my-1 leading-relaxed">
            {line.slice(2)}
          </li>
        )
        return
      }

      // Ordered list
      const numMatch = line.match(/^(\d+)\.\s(.*)/)
      if (numMatch) {
        elements.push(
          <div key={idx} className="ml-4 flex items-start gap-2 my-1 text-xs text-nexus-text">
            <span className="font-mono text-nexus-cyan font-bold">{numMatch[1]}.</span>
            <span>{numMatch[2]}</span>
          </div>
        )
        return
      }

      // Blockquotes
      if (line.startsWith('> ')) {
        elements.push(
          <blockquote
            key={idx}
            className="border-l-4 border-nexus-accent pl-3 py-1.5 my-2.5 bg-nexus-accent/10 rounded-r-xl text-xs italic text-nexus-accent-light"
          >
            {line.slice(2)}
          </blockquote>
        )
        return
      }

      // Empty line
      if (!line.trim()) {
        elements.push(<div key={idx} className="h-2" />)
        return
      }

      // Regular paragraph
      elements.push(
        <p key={idx} className="text-xs text-nexus-text/90 my-1 leading-relaxed">
          {line}
        </p>
      )
    })

    if (inTable) {
      flushTable('table-end')
    }

    return elements
  }

  // ─── Render Locked Vault Screen if Note is Encrypted ───────────────────────
  if (activeNote.isEncrypted) {
    return (
      <BaseToolTemplate
        icon={FileText}
        title="Markdown Scratchpad Ultimate"
        description="Şifreli Güvenli Kasa Modu Aktif."
        gradient="from-emerald-600 to-teal-500"
      >
        <div className="glass-card p-12 flex flex-col items-center justify-center text-center max-w-md mx-auto my-12 border-rose-500/30 bg-rose-500/5">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mb-4 shadow-xl shadow-rose-500/20">
            <Lock className="w-8 h-8 text-rose-400 animate-pulse" />
          </div>
          <h2 className="text-lg font-bold text-white mb-1">Şifreli Not Kalkanı</h2>
          <p className="text-xs text-nexus-muted mb-6">
            "{activeNote.title}" notu askeri düzey AES-256-GCM ile şifrelendi. İçeriği görüntülemek için parolanızı girin.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleUnlockNote()
            }}
            className="w-full space-y-3"
          >
            <input
              type="password"
              value={unlockPassword}
              onChange={(e) => setUnlockPassword(e.target.value)}
              placeholder="Kilit açma parolasını girin..."
              autoFocus
              className="w-full p-2.5 rounded-xl bg-nexus-surface border border-nexus-border focus:border-rose-400 text-xs text-white text-center outline-none font-mono"
            />
            <button
              type="submit"
              disabled={isDecrypting || !unlockPassword}
              className="w-full py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <Unlock className="w-4 h-4" />
              <span>{isDecrypting ? 'Şifre Çözülüyor...' : 'Notun Kilidini Aç'}</span>
            </button>
          </form>
        </div>
      </BaseToolTemplate>
    )
  }

  return (
    <div className={isZenMode ? 'fixed inset-0 z-50 bg-nexus-bg p-6 flex flex-col overflow-hidden' : ''}>
      <BaseToolTemplate
        icon={FileText}
        title="Markdown Scratchpad Ultimate"
        description="Çoklu sekme, canlı görevler, görsel sürükle-bırak, bul-değiştir, AES şifreli kasa ve akış şeması destekli tam teşekküllü stüdyo."
        gradient="from-emerald-600 to-teal-500"
      >
        <div className="space-y-4">
          {/* Multi-Tab Bar & Search Row */}
          <div className="relative z-30 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 glass-card p-2.5 px-3">
            {/* Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none flex-1">
              {filteredNotes.map((note) => {
                const isActive = note.id === activeNote.id
                const isEditing = editingTitleId === note.id

                return (
                  <div
                    key={note.id}
                    onClick={() => {
                      setActiveNoteId(note.id)
                      try {
                        cyberAudio.click()
                      } catch {}
                    }}
                    onDoubleClick={() => {
                      setEditingTitleId(note.id)
                      setTempTitle(note.title)
                    }}
                    className={`group relative flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium cursor-pointer transition-all whitespace-nowrap select-none ${
                      isActive
                        ? 'bg-nexus-surface border-nexus-accent/60 text-white shadow-lg shadow-nexus-accent/10'
                        : 'bg-nexus-surface/40 border-white/5 text-nexus-muted hover:text-white hover:bg-nexus-surface/70'
                    }`}
                  >
                    {note.isEncrypted ? (
                      <Lock className="w-3.5 h-3.5 text-rose-400" />
                    ) : (
                      <FileText
                        className={`w-3.5 h-3.5 ${isActive ? 'text-nexus-cyan' : 'text-nexus-muted'}`}
                      />
                    )}

                    {isEditing ? (
                      <input
                        type="text"
                        value={tempTitle}
                        autoFocus
                        onChange={(e) => setTempTitle(e.target.value)}
                        onBlur={() => handleSaveTitle(note.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveTitle(note.id)
                          if (e.key === 'Escape') setEditingTitleId(null)
                        }}
                        className="bg-black/50 text-white px-1.5 py-0.5 rounded border border-nexus-cyan/40 outline-none w-24"
                      />
                    ) : (
                      <span className="truncate max-w-[120px]">{note.title}</span>
                    )}

                    {notes.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteNote(note.id, e)}
                        className="opacity-0 group-hover:opacity-100 hover:text-rose-400 p-0.5 transition-opacity"
                        title="Sekmeyi Sil"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )
              })}

              {/* New Tab Button */}
              <button
                type="button"
                onClick={handleAddNote}
                className="p-1.5 px-2.5 rounded-xl bg-nexus-surface/40 hover:bg-nexus-accent/20 border border-white/5 hover:border-nexus-accent/40 text-nexus-muted hover:text-white transition-all flex items-center gap-1 text-xs"
                title="Yeni Not Ekle"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Yeni</span>
              </button>
            </div>

            {/* Quick Search & Tools Popovers */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-nexus-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Notlarda ara..."
                  className="pl-8 pr-3 py-1 rounded-xl bg-nexus-surface/60 border border-white/10 text-xs text-white placeholder-nexus-muted focus:outline-none focus:border-nexus-cyan/40 w-32 sm:w-40"
                />
              </div>

              {/* Find & Replace Toggle */}
              <button
                type="button"
                onClick={() => setShowFindReplace(!showFindReplace)}
                className={`p-2 rounded-xl border transition-all ${
                  showFindReplace
                    ? 'bg-nexus-cyan/20 text-nexus-cyan border-nexus-cyan/40'
                    : 'bg-nexus-surface border-nexus-border text-nexus-muted hover:text-white'
                }`}
                title="Bul & Değiştir (Ctrl+F)"
              >
                <Replace className="w-3.5 h-3.5" />
              </button>

              {/* Lock Vault Button */}
              <button
                type="button"
                onClick={() => setShowVaultModal(true)}
                className="p-2 rounded-xl bg-nexus-surface hover:bg-rose-500/20 border border-nexus-border text-nexus-muted hover:text-rose-400 transition-all"
                title="Notu Parola ile Şifrele"
              >
                <Lock className="w-3.5 h-3.5" />
              </button>

              {/* Timeline Snapshots Trigger */}
              <div className="relative z-50">
                <button
                  type="button"
                  onClick={() => setShowTimeline(!showTimeline)}
                  className="p-2 rounded-xl bg-nexus-surface hover:bg-white/[0.08] border border-nexus-border text-nexus-muted hover:text-white transition-all"
                  title="Sürüm Geçmişi (Snapshots)"
                >
                  <History className="w-3.5 h-3.5 text-amber-400" />
                </button>

                <AnimatePresence>
                  {showTimeline && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="absolute right-0 top-full mt-2 w-72 rounded-2xl bg-nexus-surface/98 border border-amber-500/40 shadow-2xl p-3 z-50 backdrop-blur-xl"
                    >
                      <div className="text-[10px] font-mono text-amber-400 uppercase pb-2 border-b border-white/5 flex items-center justify-between">
                        <span>Zaman Tüneli Snapshots</span>
                        <span>{snapshots.length} Kayıt</span>
                      </div>
                      <div className="max-h-60 overflow-y-auto space-y-1.5 mt-2">
                        {snapshots.length === 0 ? (
                          <div className="text-center py-4 text-xs text-nexus-muted">
                            Henüz kayıtlı snapshot yok.
                          </div>
                        ) : (
                          snapshots.map((snap) => (
                            <div
                              key={snap.id}
                              onClick={() => handleRestoreSnapshot(snap)}
                              className="p-2 rounded-xl bg-nexus-surface/40 hover:bg-amber-500/10 border border-white/5 hover:border-amber-500/30 text-xs cursor-pointer transition-all"
                            >
                              <div className="flex items-center justify-between text-[11px] font-mono text-white">
                                <span>{snap.previewTitle}</span>
                                <span className="text-nexus-muted">
                                  {new Date(snap.timestamp).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>
                              <div className="text-[10px] text-nexus-muted mt-0.5">
                                {snap.charCount} karakter
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Templates Popover Trigger */}
              <div className="relative z-50">
                <button
                  type="button"
                  onClick={() => setShowTemplates(!showTemplates)}
                  className="px-2.5 py-1.5 rounded-xl bg-nexus-surface hover:bg-white/[0.08] border border-nexus-border text-xs text-white flex items-center gap-1.5 transition-all"
                >
                  <BookOpen className="w-3.5 h-3.5 text-nexus-cyan" />
                  <span>Şablonlar</span>
                </button>

                <AnimatePresence>
                  {showTemplates && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-nexus-surface/98 border border-nexus-cyan/40 shadow-2xl p-2 z-50 backdrop-blur-xl"
                    >
                      <div className="text-[10px] font-mono text-nexus-muted uppercase px-2 py-1 border-b border-white/5">
                        Hazır Şablon Ekle
                      </div>
                      <div className="space-y-1 mt-1">
                        {Object.entries(TEMPLATES).map(([key, tpl]) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => handleApplyTemplate(key)}
                            className="w-full text-left p-2 rounded-xl text-xs text-nexus-text hover:text-white hover:bg-nexus-cyan/10 transition-colors flex items-center justify-between"
                          >
                            <span>{tpl.title}</span>
                            <Plus className="w-3 h-3 text-nexus-cyan" />
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Zen Mode Toggle */}
              <button
                type="button"
                onClick={() => setIsZenMode(!isZenMode)}
                className={`p-2 rounded-xl border transition-all ${
                  isZenMode
                    ? 'bg-nexus-accent text-white border-nexus-accent'
                    : 'bg-nexus-surface border-nexus-border text-nexus-muted hover:text-white'
                }`}
                title="Zen / Tam Ekran Odaklanma Modu"
              >
                {isZenMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* In-Editor Find & Replace Bar */}
          <AnimatePresence>
            {showFindReplace && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="relative z-20 glass-card p-3 flex flex-wrap items-center justify-between gap-3 border-nexus-cyan/40 bg-nexus-surface/90"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <input
                      type="text"
                      value={findQuery}
                      onChange={(e) => setFindQuery(e.target.value)}
                      placeholder="Aranacak metin..."
                      className="px-3 py-1.5 rounded-xl bg-black/50 border border-nexus-border text-xs text-white placeholder-nexus-muted outline-none focus:border-nexus-cyan w-40 sm:w-52"
                    />
                    {findQuery && (
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-nexus-cyan">
                        {matchCount} eşleşme
                      </span>
                    )}
                  </div>

                  <input
                    type="text"
                    value={replaceQuery}
                    onChange={(e) => setReplaceQuery(e.target.value)}
                    placeholder="Yeni metin..."
                    className="px-3 py-1.5 rounded-xl bg-black/50 border border-nexus-border text-xs text-white placeholder-nexus-muted outline-none focus:border-nexus-cyan w-40 sm:w-52"
                  />

                  <button
                    type="button"
                    onClick={() => setIsCaseSensitive(!isCaseSensitive)}
                    className={`px-2 py-1 rounded-lg text-xs font-mono font-bold border transition-colors ${
                      isCaseSensitive
                        ? 'bg-nexus-cyan/20 text-nexus-cyan border-nexus-cyan/40'
                        : 'bg-nexus-surface border-nexus-border text-nexus-muted'
                    }`}
                    title="Büyük / Küçük Harfe Duyarlı (Aa)"
                  >
                    Aa
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleFindNext}
                    className="px-2.5 py-1 rounded-lg bg-nexus-surface hover:bg-white/[0.08] text-xs text-white flex items-center gap-1 border border-white/10"
                  >
                    <ArrowDown className="w-3 h-3" />
                    <span>Bul</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleReplaceOnce}
                    className="px-2.5 py-1 rounded-lg bg-nexus-surface hover:bg-white/[0.08] text-xs text-white flex items-center gap-1 border border-white/10"
                  >
                    <span>Değiştir</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleReplaceAll}
                    className="px-2.5 py-1 rounded-lg bg-nexus-cyan/20 hover:bg-nexus-cyan/30 text-xs text-nexus-cyan font-medium border border-nexus-cyan/40"
                  >
                    <span>Tümünü Değiştir</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Toolbar & Actions */}
          <div className="relative z-10 glass-card p-2.5 px-3 flex flex-wrap items-center justify-between gap-3">
            {/* Quick Format Buttons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => wrapSelection('**', '**', 'kalın metin')}
                className="p-2 rounded-lg bg-nexus-surface hover:bg-white/[0.08] text-nexus-muted hover:text-white transition-colors"
                title="Kalın (Ctrl+B)"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => wrapSelection('*', '*', 'italik metin')}
                className="p-2 rounded-lg bg-nexus-surface hover:bg-white/[0.08] text-nexus-muted hover:text-white transition-colors"
                title="İtalik (Ctrl+I)"
              >
                <Italic className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => wrapSelection('~~', '~~', 'üstü çizili')}
                className="p-2 rounded-lg bg-nexus-surface hover:bg-white/[0.08] text-nexus-muted hover:text-white transition-colors"
                title="Üstü Çizili (Ctrl+Shift+X)"
              >
                <Strikethrough className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => wrapSelection('### ', '', 'Başlık')}
                className="p-2 rounded-lg bg-nexus-surface hover:bg-white/[0.08] text-nexus-muted hover:text-white transition-colors"
                title="Başlık 3"
              >
                <Heading className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => wrapSelection('```typescript\n', '\n```', '// kodunuz')}
                className="p-2 rounded-lg bg-nexus-surface hover:bg-white/[0.08] text-nexus-muted hover:text-white transition-colors"
                title="Kod Bloğu"
              >
                <Code className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => wrapSelection('```flow\nİstemci --> [NexusHub] --> [Sonuç]\n```', '', '')}
                className="p-2 rounded-lg bg-nexus-surface hover:bg-white/[0.08] text-nexus-muted hover:text-white transition-colors"
                title="Akış Şeması (Flowchart)"
              >
                <Workflow className="w-3.5 h-3.5 text-nexus-cyan" />
              </button>
              <button
                type="button"
                onClick={() => wrapSelection('- [ ] ', '', 'Yapılacak Görev')}
                className="p-2 rounded-lg bg-nexus-surface hover:bg-white/[0.08] text-nexus-muted hover:text-white transition-colors"
                title="Görev Kutusu"
              >
                <CheckSquare className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() =>
                  wrapSelection(
                    '| Başlık 1 | Başlık 2 |\n| :--- | :--- |\n| Veri 1 | Veri 2 |\n',
                    '',
                    ''
                  )
                }
                className="p-2 rounded-lg bg-nexus-surface hover:bg-white/[0.08] text-nexus-muted hover:text-white transition-colors"
                title="Tablo Ekle"
              >
                <TableIcon className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => wrapSelection('[', '](https://)', 'Bağlantı')}
                className="p-2 rounded-lg bg-nexus-surface hover:bg-white/[0.08] text-nexus-muted hover:text-white transition-colors"
                title="Link Ekle (Ctrl+K)"
              >
                <Link className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* View mode toggle */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/5">
              <button
                type="button"
                onClick={() => setViewMode('edit')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  viewMode === 'edit' ? 'bg-nexus-accent text-white shadow-sm' : 'text-nexus-muted hover:text-white'
                }`}
              >
                Editör
              </button>
              <button
                type="button"
                onClick={() => setViewMode('split')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  viewMode === 'split' ? 'bg-nexus-accent text-white shadow-sm' : 'text-nexus-muted hover:text-white'
                }`}
              >
                İkili Panel
              </button>
              <button
                type="button"
                onClick={() => setViewMode('preview')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  viewMode === 'preview' ? 'bg-nexus-accent text-white shadow-sm' : 'text-nexus-muted hover:text-white'
                }`}
              >
                Önizleme
              </button>
            </div>

            {/* Export & Print Actions */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCopy}
                className="px-2.5 py-1.5 rounded-xl bg-nexus-surface hover:bg-white/[0.08] border border-nexus-border text-xs text-white flex items-center gap-1.5 transition-all active:scale-95"
                title="Markdown Kopyala"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">Kopyala</span>
              </button>

              <button
                type="button"
                onClick={handleCopyHtml}
                className="px-2.5 py-1.5 rounded-xl bg-nexus-surface hover:bg-white/[0.08] border border-nexus-border text-xs text-white flex items-center gap-1.5 transition-all active:scale-95"
                title="HTML Kopyala"
              >
                <FileCode className="w-3.5 h-3.5 text-nexus-cyan" />
                <span className="hidden sm:inline">HTML</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadMd}
                className="px-2.5 py-1.5 rounded-xl bg-nexus-surface hover:bg-white/[0.08] border border-nexus-border text-xs text-white flex items-center gap-1.5 transition-all active:scale-95"
                title="Markdown İndir"
              >
                <Download className="w-3.5 h-3.5" />
                <span>.md</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadHtml}
                className="px-2.5 py-1.5 rounded-xl bg-nexus-surface hover:bg-white/[0.08] border border-nexus-border text-xs text-white flex items-center gap-1.5 transition-all active:scale-95"
                title="HTML İndir"
              >
                <Download className="w-3.5 h-3.5" />
                <span>.html</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="p-2 rounded-xl bg-nexus-surface hover:bg-white/[0.08] border border-nexus-border text-xs text-white transition-all active:scale-95"
                title="PDF Olarak Yazdır / Kaydet"
              >
                <Printer className="w-3.5 h-3.5 text-purple-400" />
              </button>
            </div>
          </div>

          {/* Dual Editor & Preview Workspace */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[590px]">
            {/* Editor Pane with Line Numbers Gutter */}
            {(viewMode === 'edit' || viewMode === 'split') && (
              <div
                className={`${
                  viewMode === 'split' ? 'lg:col-span-6' : 'lg:col-span-12'
                } glass-card p-4 flex flex-col h-full overflow-hidden`}
              >
                <div className="flex items-center justify-between pb-2 border-b border-nexus-border/30 mb-2">
                  <span className="text-[11px] font-mono text-nexus-muted uppercase">
                    Markdown Girişi & Kodlama
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400">● Otomatik Kaydedildi</span>
                </div>

                <div className="flex-1 flex overflow-hidden">
                  {/* Line Numbers Gutter */}
                  <div
                    ref={gutterRef}
                    className="w-9 shrink-0 select-none py-1 pr-2 text-right font-mono text-xs text-nexus-muted/40 border-r border-nexus-border/30 overflow-hidden leading-relaxed"
                  >
                    {linesArray.map((_, i) => (
                      <div key={i}>{i + 1}</div>
                    ))}
                  </div>

                  {/* Main Textarea */}
                  <textarea
                    ref={editorRef}
                    value={activeNote.content}
                    onChange={(e) => updateContent(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onScroll={handleEditorScroll}
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                    placeholder="Markdown metninizi buraya yazın... Görsel sürükleyip bırakabilirsiniz."
                    className="flex-1 w-full pl-3 bg-transparent resize-none focus:outline-none font-mono text-xs text-white leading-relaxed placeholder-nexus-muted selection:bg-nexus-accent/30 overflow-y-auto"
                  />
                </div>
              </div>
            )}

            {/* Preview Pane */}
            {(viewMode === 'preview' || viewMode === 'split') && (
              <div
                ref={previewRef}
                className={`${
                  viewMode === 'split' ? 'lg:col-span-6' : 'lg:col-span-12'
                } glass-card p-6 overflow-y-auto h-full bg-nexus-surface/40 border-nexus-border/60`}
              >
                <div className="flex items-center justify-between pb-2 border-b border-nexus-border/30 mb-4">
                  <span className="text-[11px] font-mono text-nexus-muted uppercase">Canlı Çıktı</span>
                  <span className="text-[10px] font-mono text-nexus-cyan">Etkileşimli Görevler Aktif</span>
                </div>
                <div className="prose prose-invert max-w-none">
                  {renderAdvancedMarkdown(activeNote.content)}
                </div>
              </div>
            )}
          </div>

          {/* Live Metrics & Shortcut Hints */}
          <div className="glass-card p-3 px-4 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-nexus-muted">
            <div className="flex items-center gap-6">
              <span>
                Karakter: <strong className="text-white">{charCount}</strong>
              </span>
              <span>
                Kelime: <strong className="text-white">{wordCount}</strong>
              </span>
              <span>
                Satır: <strong className="text-white">{lineCount}</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-nexus-cyan" />
                <span>
                  Okuma Süresi: <strong className="text-white">~{readingTimeMinutes} dk</strong>
                </span>
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-nexus-muted/80">
              <span>Kısayollar:</span>
              <kbd className="px-1.5 py-0.5 rounded bg-black/40 border border-white/10 text-nexus-cyan">
                Ctrl+F (Bul)
              </kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-black/40 border border-white/10 text-nexus-cyan">
                Ctrl+B (Kalın)
              </kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-black/40 border border-white/10 text-nexus-cyan">
                Tab (Girinti)
              </kbd>
            </div>
          </div>
        </div>

        {/* Password Lock Modal */}
        <AnimatePresence>
          {showVaultModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="glass-card p-6 max-w-sm w-full border-rose-500/40 bg-nexus-surface shadow-2xl"
              >
                <div className="flex items-center gap-2 mb-4 text-rose-400">
                  <Lock className="w-5 h-5" />
                  <h3 className="text-sm font-bold text-white">Notu Parola ile Şifrele</h3>
                </div>
                <p className="text-xs text-nexus-muted mb-4">
                  Belirleyeceğiniz parola AES-256-GCM ile notu şifreler. Parolayı unutursanız veriler kurtarılamaz.
                </p>
                <input
                  type="password"
                  value={vaultPassword}
                  onChange={(e) => setVaultPassword(e.target.value)}
                  placeholder="Kilit parolası belirleyin..."
                  className="w-full p-2.5 rounded-xl bg-black/50 border border-nexus-border text-xs text-white outline-none focus:border-rose-400 mb-4 font-mono"
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowVaultModal(false)
                      setVaultPassword('')
                    }}
                    className="px-3 py-1.5 rounded-xl bg-nexus-surface border border-nexus-border text-xs text-nexus-muted hover:text-white"
                  >
                    İptal
                  </button>
                  <button
                    type="button"
                    onClick={handleLockNote}
                    className="px-3 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-xs text-white font-semibold flex items-center gap-1.5"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Şifrele ve Kilitle</span>
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </BaseToolTemplate>
    </div>
  )
}
