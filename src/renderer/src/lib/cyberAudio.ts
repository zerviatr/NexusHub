// Web Audio API Synthesized Sound Effect Engine
// Zero external assets, sub-millisecond latency, client-side only

class CyberAudioEngine {
  private ctx: AudioContext | null = null
  private enabled: boolean = true
  private volume: number = 0.8

  constructor() {
    const saved = localStorage.getItem('nexus_sfx_enabled')
    this.enabled = saved !== null ? saved === 'true' : true
    const savedVol = localStorage.getItem('nexus_sfx_volume')
    this.volume = savedVol !== null ? parseFloat(savedVol) : 0.8
  }

  private initContext(): AudioContext | null {
    if (!this.enabled || this.volume <= 0) return null
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (AudioCtx) {
        this.ctx = new AudioCtx()
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {})
    }
    return this.ctx
  }

  public setEnabled(val: boolean) {
    this.enabled = val
    localStorage.setItem('nexus_sfx_enabled', val ? 'true' : 'false')
  }

  public isEnabled(): boolean {
    return this.enabled
  }

  public setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val))
    localStorage.setItem('nexus_sfx_volume', this.volume.toString())
  }

  public getVolume(): number {
    return this.volume
  }

  // Mechanical cyber-click
  public click() {
    try {
      const ctx = this.initContext()
      if (!ctx) return

      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(800, now)
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.04)

      gain.gain.setValueAtTime(0.08 * this.volume, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + 0.04)
    } catch {}
  }

  // Clean copy / success chime
  public copySuccess() {
    try {
      const ctx = this.initContext()
      if (!ctx) return

      const now = ctx.currentTime
      const osc1 = ctx.createOscillator()
      const osc2 = ctx.createOscillator()
      const gain = ctx.createGain()

      osc1.type = 'triangle'
      osc2.type = 'sine'

      osc1.frequency.setValueAtTime(587.33, now)
      osc1.frequency.setValueAtTime(880, now + 0.06)

      osc2.frequency.setValueAtTime(1174.66, now + 0.06)

      gain.gain.setValueAtTime(0.06 * this.volume, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22)

      osc1.connect(gain)
      osc2.connect(gain)
      gain.connect(ctx.destination)

      osc1.start(now)
      osc2.start(now + 0.06)
      osc1.stop(now + 0.22)
      osc2.stop(now + 0.22)
    } catch {}
  }

  // Shred / Purge / Delete swoosh
  // Turbo purge / optimization sonic rumble
  public purge() {
    try {
      const ctx = this.initContext()
      if (!ctx) return

      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(160, now)
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.35)

      gain.gain.setValueAtTime(0.08 * this.volume, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + 0.35)
    } catch {}
  }

  public shred() {
    try {
      const ctx = this.initContext()
      if (!ctx) return

      const now = ctx.currentTime
      const bufferSize = Math.floor(ctx.sampleRate * 0.15)
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1
      }

      const noise = ctx.createBufferSource()
      noise.buffer = buffer

      const filter = ctx.createBiquadFilter()
      filter.type = 'bandpass'
      filter.frequency.setValueAtTime(1200, now)
      filter.frequency.exponentialRampToValueAtTime(200, now + 0.15)
      filter.Q.setValueAtTime(3, now)

      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0.07 * this.volume, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15)

      noise.connect(filter)
      filter.connect(gain)
      gain.connect(ctx.destination)

      noise.start(now)
      noise.stop(now + 0.15)
    } catch {}
  }

  // Warp / Navigation hum
  public navigate() {
    try {
      const ctx = this.initContext()
      if (!ctx) return

      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(240, now)
      osc.frequency.exponentialRampToValueAtTime(480, now + 0.07)

      gain.gain.setValueAtTime(0.04 * this.volume, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + 0.07)
    } catch {}
  }
}

export const cyberAudio = new CyberAudioEngine()
