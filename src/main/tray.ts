import { app, Tray, Menu, nativeImage } from 'electron'
import type { BrowserWindow } from 'electron'
import { join } from 'path'

let tray: Tray | null = null

// Embedded fallback 32x32 NexusHub icon (PNG data URL) to guarantee tray creation
const FALLBACK_TRAY_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAACXBIWXMAAC4jAAAuIwF4pT92AAAHsElEQVRYhX2Xy29cZxnGh03sc75zv87MucyZGV/GsccTz2TG43Hs2EmaoKQpdpymrpw4V5FWhAoJCSpVXUQUUUBpEaWwAYkFqcqGBWSRHUtU/okuWCEFKRISEkrkB73fd87c7GDp0YyPJT+/9/K933tyuVzuG5kUJdxS1eCppgXPNS3EYQVcqhpAUYsjUrkKI1KU/LCeK4r/VFG87WHPnPgpyKoaPNb1GJoWHbzKmJtn6ptmEK80TuVDVfMH4u/+F+SZmudyqhr8wTDIPHyhaeHLo81DqFxHwGhFKJrICod6BYCi+C8VxX+hKAXIsvuYmytKsCMi58Zj0QfQ9ACqHo5IIRkRVLME1YyhGvQsgMJBhHg2FB7tmLwDxjwCgaK4OzlNC58MAYymftiYTLgiqFbpsMxYQOgDCEUdiZ6LMQ8ZAGPeEwJ4lhoOoteHzSOoRgTFjKBYCRS7zKXaFch6CKaF4plVEiIQg0AKYHqB90YGkZqTKAtgzH1GAIeabpDuiEesUKqtMphdgeJWuSb1AGu7H6N9/SeY1AIwpyJkJwLECDmAgDgEQOakg9x4zUfqbVK6KWoynuIiEydsYbq2g1P7n+HkvV+iPH8FVtQEc5JRCJ6NImTNBxspgdtX7pUNR81FqXWqYKmxkV9ApbaFheY9JLXLMPw6TL+O6PglTC/fQbhwGVrhOJhdGgIREEwVEEw5EiAYjZ43VgLJiDBJWfBmEE+dx8LSXUzPvwkv7sIOmvBKXS767sQdxI0rKHdvwqud5WWa0AuQqAS8HEXIqg95CEAeAeh3u0g7M2MUptYw1XwTc/UbmFu8jmJ5XRhHXfjxCtyow0VA9GmGDbjVVUTtXRQ7byFpbsGrrkA2irwxZS0PWfW4scwcSLJDANlQSQeNEUGzK5hgeazu/RTbP/s7wuo52MEJuFEbfqkHL17mSuYucnlxB07Uhpt0YcVN6EEd7uwGtn/+Feq3f4xjkg3FisB0AqA+cLn5YYC09tR0slVCsfYa5nvvwi91EVQ34ZV6cMM2oqmzWGjdwonuAyyuPMBsdx/FmU3YYRNOqQN3Zg12uY3g7B2Y86ch6wGYJU4FlYBnQBYQObpYSASh9AHKkJ0y/KiL2sIenOISCskaitNnMLu0i1bve+itP8S51z/H+tav0LjwIWY3v4O4fRX56dOwKyvQg0W4navQkhZkMwKzIsiUAQ5AciDLFnLZ/ObnnyZdmgHmlJFPVjHX2IfD695BsbKG5up76J5+iBt3/orv/uAZ9h/+E2e//xSzlz5A9dy7vAfMUgtG2IDXewtatdMHYBkASR4DUGmijQFQvWuNG7zxqOmKlXU02vfx2uXf4L0f/gtf/vG/+P2f/oMzn/0Dszc/RbxxF+4UAZyEHjbgrF6DVm1DMiPIHKAwaELZHgcIRgCoBFTz2cZ1Xls/7qJYXUd9+dvY2PqcR07mv/7Lv7H0u69RvfsJipt34FR7AiBqwF69BrVCAOEAIOsBNgSgcABxVPjMpx6wE3hJDzNLNzgAHbNCZQ310w/QOP8hTztFvvTbr1H70Z8Rb72P8JvvwKmuwIib0KIGrFPXoFYzgDAtgTsKoKabjEJbjp4BJHyKOfEyqo1dWMEJ+OVV3unVk9dQ23yA2sUPUNv/BNXbjxBuv4/ihXdQ7F6FN7MGs9qFFtZh9K6AlZc4AJ0CGskDACsDKKSbTHqFGjQJE163YPYcjq/eh5N0eHc7SRd22EJ+egNJ7zriM/cRnLuPwtoeP/dWuASz3IE5ewpauYni2duw59b5NGQmDSK/P4TIXJKGALK1irKg2gmOyS5Ovf0x3nj0FfyZMzCDBuyoyWGc6CRXvn4efv087KgFK2rBLLehx0tQgnkoc2u4/OhvWLxJg8gQAP0GdLh5H4Dua75GaSkAlUEPYE+voLi8jaS1i7i9C6fSgxkswiqdhJ20YUZNIfpeakELF6FNdWGs7kBf3YG7/AaM6Y6IPGtA2e6bjwBwCPqeloF6QdaLkKgv3Crc2U1EvX3km9+CmYhjxo0p6mgRWrkFo3MZ5sbb0Gj6OWVMUsRkbhTS9FPkwwAmcsOLI+1wBMG0vMgEXaXUkFYC2Yqh5mvwFi+isHYDTuMCWPE4WOE4jBPnYW7sQW9eAPNnIBnpsaPON8U+wOsuOSPmhwDE3kalyPMjQ/c4ZYJZMYfIQLS4AbP1OlZu/QJL9z6F2r4EJapDpuNmx9xcpprzZSQbu8PRmyMAB4cAlDyYSjdXBkLHU/xjvmxYJUwoPlp7H2H+1keYoNpasTAnCDLnN58rjt0rzCXJPMgpiv8s3VgPxldoRiDakGiz4akVOqb5mKQlg6c6EOnm9faEeTpyjzA/SD+fUQaeqGJpTHf1wfKoMLFG8U2G6ki7HS0VlFq+ZAgJ09SYIubDhmp+pDnpZfrsCQHsZACDdXlU/PjQIpGuVOJ3D0wTDdtPdTbl+ik/Ou0CgL7rO+nbkf+Y1515L+ilYWx1HlmlxSQbutO5sudZsw3O+eHIzRfpc/FqlktfTuldLeuF8dVZGIsVSspM+XVqi0sl09iQGTOn8XtAI3higswHL6f9V2VJ8rYZ854y5j4fNR/scKTsLh/X/zOXJOu5JFlPJckaeT3/H1J6GcMmCpqtAAAAAElFTkSuQmCC'

function resolveTrayIcon(): nativeImage {
  const isWin = process.platform === 'win32'
  const iconFilename = isWin ? 'icon.ico' : 'icon.png'

  const candidatePaths = [
    join(process.resourcesPath, 'icons', iconFilename),
    join(process.resourcesPath, 'build', 'icons', iconFilename),
    join(app.getAppPath(), 'build', 'icons', iconFilename),
    join(app.getAppPath(), 'build', 'icons', 'icon.png'),
    join(__dirname, '../../build/icons', iconFilename),
    join(__dirname, '../../build/icons', 'icon.png')
  ]

  for (const p of candidatePaths) {
    try {
      const img = nativeImage.createFromPath(p)
      if (!img.isEmpty()) {
        return img.resize({ width: 16, height: 16 })
      }
    } catch {
      // Continue to next candidate
    }
  }

  // Fallback to embedded base64 icon
  const fallback = nativeImage.createFromDataURL(FALLBACK_TRAY_DATA_URL)
  return fallback.resize({ width: 16, height: 16 })
}

export function setupSystemTray(mainWindow: BrowserWindow): Tray | null {
  if (tray) return tray

  try {
    const resizedIcon = resolveTrayIcon()
    tray = new Tray(resizedIcon)
    tray.setToolTip('NexusHub — Multi-Tool Suite')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open NexusHub',
      click: () => {
        mainWindow.show()
        mainWindow.focus()
      }
    },
    { type: 'separator' },
    {
      label: 'Clipboard Manager (Ctrl+Shift+V)',
      click: () => {
        mainWindow.show()
        mainWindow.focus()
        mainWindow.webContents.send('navigate:to', '/clipboard')
      }
    },
    {
      label: 'Quick Password Generator',
      click: () => {
        mainWindow.show()
        mainWindow.focus()
        mainWindow.webContents.send('navigate:to', '/password')
      }
    },
    {
      label: 'QR Code Studio',
      click: () => {
        mainWindow.show()
        mainWindow.focus()
        mainWindow.webContents.send('navigate:to', '/qr-code')
      }
    },
    {
      label: 'JSON & JWT Studio',
      click: () => {
        mainWindow.show()
        mainWindow.focus()
        mainWindow.webContents.send('navigate:to', '/json-studio')
      }
    },
    { type: 'separator' },
    {
      label: 'Quit NexusHub',
      click: () => {
        ;(app as any).isQuitting = true
        app.quit()
      }
    }
  ])

  tray.setContextMenu(contextMenu)

  // Double-click or click toggles window visibility
  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide()
    } else {
      mainWindow.show()
      mainWindow.focus()
    }
  })

  tray.on('double-click', () => {
    mainWindow.show()
    mainWindow.focus()
  })

  return tray
} catch (err) {
  console.error('[Tray] Failed to setup system tray:', err)
  return null
}
}

