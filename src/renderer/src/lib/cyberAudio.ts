// Web Audio API Synthesized Sound Effect Engine
// Zero external assets, sub-millisecond latency, client-side only

class CyberAudioEngine {
  private ctx: AudioContext | null = null
  private enabled: boolean = true

  constructor() {
    const saved = localStorage.getItem('nexus_sfx_enabled')
    this.enabled = saved !== null ? saved === 'true' : true
  }

  private initContext(): AudioContext | null {
    if (!this.enabled) return null
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

  // Mechanical cyber-click
  public click() {
    const ctx = this.initContext()
    if (!ctx) return

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(800, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.04)

    gain.gain.setValueAtTime(0.08, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start()
    osc.stop(ctx.currentTime + 0.04)
  }

  // Clean copy / success chime
  public copySuccess() {
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

    gain.gain.setValueAtTime(0.06, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22)

    osc1.connect(gain)
    osc2.connect(gain)
    gain.connect(ctx.destination)

    osc1.start(now)
    osc2.start(now + 0.06)
    osc1.stop(now + 0.22)
    osc2.stop(now + 0.22)
  }

  // Shred / Purge / Delete swoosh
  public shred() {
    const ctx = this.initContext()
    if (!ctx) return

    const now = ctx.currentTime
    const bufferSize = ctx.sampleRate * 0.15
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
    gain.gain.setValueAtTime(0.07, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15)

    noise.connect(filter)
    filter.connect(gain)
    gain.connect(ctx.destination)

    noise.start(now)
    noise.stop(now + 0.15)
  }

  // Warp / Navigation hum
  public navigate() {
    const ctx = this.initContext()
    if (!ctx) return

    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(240, now)
    osc.frequency.exponentialRampToValueAtTime(480, now + 0.07)

    gain.gain.setValueAtTime(0.04, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.07)
  }
}

export const cyberAudio = new CyberAudioEngine()
