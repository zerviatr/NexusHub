import { ipcMain } from 'electron'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export interface ActivePortInfo {
  protocol: string
  localAddress: string
  port: number
  state: string
  pid: number
  processName: string
}

export function registerPortWatchdogIPC(): void {
  // 1. Scan active listening ports with process names on Windows
  ipcMain.handle('port:scanActivePorts', async (): Promise<{ success: boolean; ports: ActivePortInfo[]; error?: string }> => {
    try {
      // Run netstat to get ports and tasklist to get process names
      const [netstatOut, tasklistOut] = await Promise.all([
        execAsync('netstat -ano -p tcp'),
        execAsync('tasklist /FO CSV /NH').catch(() => ({ stdout: '' })),
      ])

      // Build PID -> Process Name map
      const pidToName = new Map<number, string>()
      if (tasklistOut.stdout) {
        const lines = tasklistOut.stdout.split('\r\n')
        for (const line of lines) {
          if (!line.trim()) continue
          const match = line.match(/^"([^"]+)",(?:"[^"]*",){0,1}"(\d+)"/)
          if (match) {
            const name = match[1]
            const pid = parseInt(match[2], 10)
            if (!isNaN(pid)) {
              pidToName.set(pid, name)
            }
          }
        }
      }

      // Parse netstat output
      const ports: ActivePortInfo[] = []
      const netLines = netstatOut.stdout.split('\r\n')

      for (const line of netLines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('TCP')) continue

        const parts = trimmed.split(/\s+/)
        if (parts.length >= 4) {
          const protocol = parts[0]
          const localAddr = parts[1]
          const state = parts.length >= 5 ? parts[3] : 'LISTENING'
          const pidStr = parts.length >= 5 ? parts[4] : parts[3]
          const pid = parseInt(pidStr, 10)

          if (isNaN(pid)) continue

          // Extract port number from local address (e.g. 0.0.0.0:3000, [::]:8080, 127.0.0.1:5432)
          const lastColon = localAddr.lastIndexOf(':')
          if (lastColon === -1) continue

          const port = parseInt(localAddr.slice(lastColon + 1), 10)
          if (isNaN(port)) continue

          // Only keep unique ports or listening states for clarity
          if (state === 'LISTENING' || state === 'ESTABLISHED') {
            const processName = pidToName.get(pid) || (pid === 0 ? 'System Idle' : pid === 4 ? 'System Kernel' : 'Unknown Process')
            ports.push({
              protocol,
              localAddress: localAddr,
              port,
              state,
              pid,
              processName,
            })
          }
        }
      }

      // Sort by port ascending
      ports.sort((a, b) => a.port - b.port)

      return { success: true, ports }
    } catch (err: any) {
      return { success: false, ports: [], error: err.message || 'Failed to scan active ports' }
    }
  })

  // 2. Safely terminate a process by PID
  ipcMain.handle('port:killProcess', async (_, pid: number): Promise<{ success: boolean; message?: string; error?: string }> => {
    try {
      if (typeof pid !== 'number' || isNaN(pid) || pid <= 4) {
        return { success: false, error: 'Sistem kritik işlemleri (PID 0 veya 4) sonlandırılamaz.' }
      }

      await execAsync(`taskkill /PID ${pid} /F`)
      return { success: true, message: `PID ${pid} başarıyla sonlandırıldı.` }
    } catch (err: any) {
      return { success: false, error: err.message || `PID ${pid} sonlandırılamadı.` }
    }
  })
}
