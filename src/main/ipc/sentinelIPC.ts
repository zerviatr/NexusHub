import { ipcMain } from 'electron'
import * as os from 'os'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

function getCpuLoad(): Promise<number[]> {
  return new Promise((resolve) => {
    const startCpus = os.cpus()
    setTimeout(() => {
      const endCpus = os.cpus()
      const loads = endCpus.map((endCpu, i) => {
        const startCpu = startCpus[i]
        const idleDiff = endCpu.times.idle - startCpu.times.idle
        let totalDiff = 0
        for (const type in endCpu.times) {
          totalDiff += (endCpu.times as any)[type] - (startCpu.times as any)[type]
        }
        const load = totalDiff > 0 ? (1 - idleDiff / totalDiff) * 100 : 0
        return Math.min(100, Math.max(0, Math.round(load)))
      })
      resolve(loads)
    }, 250)
  })
}

export function registerSentinelIPC(): void {
  ipcMain.handle('sentinel:getStats', async () => {
    try {
      const totalMem = os.totalmem()
      const freeMem = os.freemem()
      const usedMem = totalMem - freeMem
      const cpus = os.cpus()
      const loadPerCore = await getCpuLoad()
      const overallLoad =
        loadPerCore.length > 0
          ? Math.round(loadPerCore.reduce((a, b) => a + b, 0) / loadPerCore.length)
          : 0

      return {
        success: true,
        cpu: {
          model: cpus[0]?.model || 'Unknown CPU',
          cores: cpus.length,
          speed: cpus[0]?.speed || 0,
          overallLoad,
          loadPerCore,
        },
        memory: {
          total: totalMem,
          free: freeMem,
          used: usedMem,
          percentUsed: Math.round((usedMem / totalMem) * 100),
        },
        os: {
          platform: os.platform(),
          arch: os.arch(),
          release: os.release(),
          hostname: os.hostname(),
          uptime: Math.round(os.uptime()),
        },
      }
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to read system metrics' }
    }
  })

  ipcMain.handle('sentinel:optimizeMemory', async () => {
    try {
      if (global.gc) {
        global.gc()
      }
      // On Windows, empty working set for idle performance
      if (process.platform === 'win32') {
        try {
          await execAsync(
            `powershell -Command "[System.GC]::Collect(); [System.GC]::WaitForPendingFinalizers()"`
          )
        } catch {}
      }

      const freeAfter = os.freemem()
      return { success: true, freeMem: freeAfter }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })
}
