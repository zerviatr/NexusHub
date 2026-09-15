import { useState } from 'react'
import { motion } from 'framer-motion'
import { Zap, Copy, Check, Download, RefreshCw, Database, CreditCard, User, Phone, MapPin, Mail } from 'lucide-react'
import { cyberAudio } from '../lib/cyberAudio'
import { useT } from '../lib/i18n'

interface MockUser {
  id: string
  fullName: string
  email: string
  phone: string
  city: string
  company: string
  tcNo: string
  creditCard: string
  uuid: string
}

const FIRST_NAMES = ['Ahmet', 'Mehmet', 'Can', 'Burak', 'Emre', 'Zeynep', 'Elif', 'Ayşe', 'Büşra', 'Selin', 'Deniz', 'Mert', 'Kaan']
const LAST_NAMES = ['Yılmaz', 'Kaya', 'Demir', 'Çelik', 'Şahin', 'Yıldız', 'Öztürk', 'Aydın', 'Özdemir', 'Arslan', 'Doğan', 'Kılıç']
const CITIES = ['İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya', 'Eskişehir', 'Trabzon', 'Adana', 'Gaziantep', 'Kocaeli']
const COMPANIES = ['Nexus Corp', 'Apex Teknoloji', 'Nova Cyber Systems', 'Vortex Yazılım', 'Aura Labs', 'CyberDyne TR', 'SiberGuard']

// Generate valid test TC number algorithmically
function generateTestTc(): string {
  const digits: number[] = []
  digits.push(Math.floor(Math.random() * 9) + 1) // 1-9
  for (let i = 1; i < 9; i++) {
    digits.push(Math.floor(Math.random() * 10))
  }
  const oddSum = digits[0] + digits[2] + digits[4] + digits[6] + digits[8]
  const evenSum = digits[1] + digits[3] + digits[5] + digits[7]
  const d10 = ((oddSum * 7 - evenSum) % 10 + 10) % 10
  const totalSum = oddSum + evenSum + d10
  const d11 = totalSum % 10
  return [...digits, d10, d11].join('')
}

// Generate valid test Visa credit card (Luhn algorithm compliant)
function generateTestCreditCard(): string {
  const prefix = '4532'
  let numbers = prefix
  for (let i = 0; i < 11; i++) {
    numbers += Math.floor(Math.random() * 10).toString()
  }
  // Calculate check digit
  let sum = 0
  for (let i = 0; i < numbers.length; i++) {
    let digit = parseInt(numbers[i], 10)
    if (i % 2 === 0) {
      digit *= 2
      if (digit > 9) digit -= 9
    }
    sum += digit
  }
  const checkDigit = (10 - (sum % 10)) % 10
  const full = numbers + checkDigit
  return full.match(/.{1,4}/g)?.join(' ') || full
}

function generateSingleUser(): MockUser {
  const first = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]
  const last = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]
  const fullName = `${first} ${last}`
  const randNum = Math.floor(Math.random() * 899) + 100
  const email = `${first.toLowerCase()}.${last.toLowerCase()}${randNum}@example.com`
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ü/g, 'u')
  const phone = `+90 5${Math.floor(Math.random() * 5) + 3}${Math.floor(Math.random() * 10)} ${Math.floor(Math.random() * 899) + 100} ${Math.floor(Math.random() * 89) + 10} ${Math.floor(Math.random() * 89) + 10}`
  const city = CITIES[Math.floor(Math.random() * CITIES.length)]
  const company = COMPANIES[Math.floor(Math.random() * COMPANIES.length)]
  const tcNo = generateTestTc()
  const creditCard = generateTestCreditCard()
  const uuid = crypto.randomUUID()

  return {
    id: uuid.slice(0, 8),
    fullName,
    email,
    phone,
    city,
    company,
    tcNo,
    creditCard,
    uuid
  }
}

export default function FakeDataStudio() {
  const { t } = useT()
  const [currentUser, setCurrentUser] = useState<MockUser>(generateSingleUser())
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [bulkCount, setBulkCount] = useState(10)

  const handleRefresh = () => {
    cyberAudio.click()
    setCurrentUser(generateSingleUser())
  }

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    cyberAudio.copySuccess()
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 1500)
  }

  const exportBulk = (format: 'json' | 'csv') => {
    cyberAudio.click()
    const list: MockUser[] = []
    for (let i = 0; i < bulkCount; i++) {
      list.push(generateSingleUser())
    }

    let blob: Blob
    let filename: string

    if (format === 'json') {
      const content = JSON.stringify(list, null, 2)
      blob = new Blob([content], { type: 'application/json' })
      filename = `zendev_mock_data_${bulkCount}.json`
    } else {
      const header = 'id,fullName,email,phone,city,company,tcNo,creditCard,uuid\n'
      const rows = list
        .map((u) => `"${u.id}","${u.fullName}","${u.email}","${u.phone}","${u.city}","${u.company}","${u.tcNo}","${u.creditCard}","${u.uuid}"`)
        .join('\n')
      blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' })
      filename = `zendev_mock_data_${bulkCount}.csv`
    }

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const fields = [
    { label: t('fakeData.fullName'), value: currentUser.fullName, key: 'name', icon: User },
    { label: t('fakeData.email'), value: currentUser.email, key: 'email', icon: Mail },
    { label: t('fakeData.phone'), value: currentUser.phone, key: 'phone', icon: Phone },
    { label: t('fakeData.city'), value: currentUser.city, key: 'city', icon: MapPin },
    { label: t('fakeData.company'), value: currentUser.company, key: 'company', icon: Database },
    { label: t('fakeData.tcNo'), value: currentUser.tcNo, key: 'tc', icon: Zap },
    { label: t('fakeData.creditCard'), value: currentUser.creditCard, key: 'cc', icon: CreditCard },
    { label: t('fakeData.uuid'), value: currentUser.uuid, key: 'uuid', icon: Zap },
  ]

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-nexus-text flex items-center gap-3">
            <Zap className="w-7 h-7 text-nexus-cyan" />
            {t('fakeData.title')}
          </h1>
          <p className="text-sm text-nexus-muted mt-1">
            {t('fakeData.description')}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-4 py-2 bg-nexus-accent hover:bg-nexus-accent/90 text-white rounded-xl text-xs font-medium shadow-lg shadow-nexus-accent/20 transition-all active:scale-95 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>{t('fakeData.newIdentity')}</span>
        </button>
      </div>

      {/* Identity Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fields.map((f) => {
          const Icon = f.icon
          const isCopied = copiedField === f.key
          return (
            <motion.div
              key={f.key}
              whileHover={{ scale: 1.01 }}
              onClick={() => copyToClipboard(f.value, f.key)}
              className="bg-nexus-surface border border-nexus-border/40 hover:border-nexus-cyan/40 p-4 rounded-2xl cursor-pointer transition-all shadow group relative flex items-center justify-between"
            >
              <div className="flex items-center gap-3 truncate pr-3">
                <div className="w-10 h-10 rounded-xl bg-nexus-bg flex items-center justify-center text-nexus-cyan shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <div className="text-[11px] font-mono text-nexus-muted uppercase tracking-wider">{f.label}</div>
                  <div className="text-sm font-semibold text-nexus-text font-mono truncate group-hover:text-nexus-cyan transition-colors">
                    {f.value}
                  </div>
                </div>
              </div>
              <div className="shrink-0 p-2 rounded-lg bg-nexus-bg border border-nexus-border/30 text-nexus-muted group-hover:text-nexus-text transition-colors">
                {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Bulk Generator Station */}
      <div className="bg-nexus-surface border border-nexus-border/40 rounded-2xl p-6 shadow-lg">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-nexus-text flex items-center gap-2">
              <Database className="w-4 h-4 text-nexus-accent" />
              {t('fakeData.bulkExport')}
            </h3>
            <p className="text-xs text-nexus-muted mt-1">
              {t('fakeData.bulkDesc')}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Record Count Selector */}
            <select
              value={bulkCount}
              onChange={(e) => setBulkCount(Number(e.target.value))}
              className="bg-nexus-bg border border-nexus-border rounded-xl px-3 py-2 text-xs font-mono text-nexus-text focus:outline-none focus:border-nexus-accent cursor-pointer"
            >
              <option value={10}>{t('fakeData.records', { count: 10 })}</option>
              <option value={50}>{t('fakeData.records', { count: 50 })}</option>
              <option value={100}>{t('fakeData.records', { count: 100 })}</option>
              <option value={500}>{t('fakeData.records', { count: 500 })}</option>
            </select>

            <button
              onClick={() => exportBulk('json')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-nexus-bg hover:bg-nexus-surface border border-nexus-border hover:border-nexus-accent/40 rounded-xl text-xs font-mono text-nexus-text transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-nexus-accent" />
              <span>{t('fakeData.downloadJson')}</span>
            </button>

            <button
              onClick={() => exportBulk('csv')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-nexus-bg hover:bg-nexus-surface border border-nexus-border hover:border-nexus-cyan/40 rounded-xl text-xs font-mono text-nexus-text transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-nexus-cyan" />
              <span>{t('fakeData.downloadCsv')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
