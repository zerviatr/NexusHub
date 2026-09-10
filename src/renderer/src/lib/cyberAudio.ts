// Web Audio API Synthesized Sound Effect Engine
// Zero external assets, sub-millisecond latency, client-side only
// Multi-profile sound architecture: Cyber, Mechanical, Linear, Stealth

export type AudioProfile = 'cyber' | 'mechanical' | 'linear' | 'stealth'

const getStorage = (key: string): string | null => {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key)
    }
  } catch {}
  return null
}

const setStorage = (key: string, val: string): void => {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, val)
    }
  } catch {}
}

class CyberAudioEngine {
  private ctx: AudioContext | null = null
  private enabled: boolean = true
  private volume: number = 0.8
  private profile: AudioProfile = 'cyber'

  constructor() {
    const saved = getStorage('nexus_sfx_enabled')
    this.enabled = saved !== null ? saved === 'true' : true
    const savedVol = getStorage('nexus_sfx_volume')
    this.volume = savedVol !== null ? parseFloat(savedVol) : 0.8
    const savedProfile = getStorage('nexus_sfx_profile') as AudioProfile | null
    if (savedProfile && ['cyber', 'mechanical', 'linear', 'stealth'].includes(savedProfile)) {
      this.profile = savedProfile
    }
  }

  private initContext(): AudioContext | null {
    if (!this.enabled || this.volume <= 0 || this.profile === 'stealth') return null
    if (!this.ctx) {
      if (typeof window !== 'undefined') {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
        if (AudioCtx) {
          this.ctx = new AudioCtx()
        }
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {})
    }
    return this.ctx
  }

  public setEnabled(val: boolean) {
    this.enabled = val
    setStorage('nexus_sfx_enabled', val ? 'true' : 'false')
  }

  public isEnabled(): boolean {
    return this.enabled
  }

  public toggleMute(): boolean {
    const next = !this.enabled
    this.setEnabled(next)
    return next
  }

  public setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val))
    setStorage('nexus_sfx_volume', this.volume.toString())
  }

  public getVolume(): number {
    return this.volume
  }

  public setAudioProfile(profile: AudioProfile) {
    this.profile = profile
    setStorage('nexus_sfx_profile', profile)
  }

  public getAudioProfile(): AudioProfile {
    return this.profile
  }

  // --- Click Sound (Per-Profile Synthesis) ---
  public click() {
    try {
      const ctx = this.initContext()
      if (!ctx) return
      const now = ctx.currentTime

      if (this.profile === 'mechanical') {
        // Crisp mechanical switch click + resonant bottom-out thock
        const osc = ctx.createOscillator()
        const oscGain = ctx.createGain()
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(240, now)
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.03)
        oscGain.gain.setValueAtTime(0.12 * this.volume, now)
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03)
        osc.connect(oscGain)
        oscGain.connect(ctx.destination)
        osc.start(now)
        osc.stop(now + 0.03)

        // Switch click transient (bandpass noise)
        this.playNoiseTransient(ctx, now, 3200, 5, 0.009, 0.14 * this.volume)
      } else if (this.profile === 'linear') {
        // Soft Apple / Linear style hi-fi pop
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(1200, now)
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.016)
        gain.gain.setValueAtTime(0.05 * this.volume, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.016)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(now)
        osc.stop(now + 0.016)
      } else {
        // Default 'cyber' neon sweep
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
      }
    } catch {}
  }

  // --- Copy / Success Chime (Per-Profile Synthesis) ---
  public copySuccess() {
    try {
      const ctx = this.initContext()
      if (!ctx) return
      const now = ctx.currentTime

      if (this.profile === 'mechanical') {
        // Double mechanical keystroke cadence (harmonic clack)
        const playClack = (time: number, freq: number) => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.type = 'triangle'
          osc.frequency.setValueAtTime(freq, time)
          gain.gain.setValueAtTime(0.09 * this.volume, time)
          gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08)
          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.start(time)
          osc.stop(time + 0.08)
          this.playNoiseTransient(ctx, time, 2800, 4, 0.008, 0.08 * this.volume)
        }
        playClack(now, 587.33)
        playClack(now + 0.07, 880)
      } else if (this.profile === 'linear') {
        // Soft dual bell tone (Apple/Linear hi-fi glass ping)
        const osc1 = ctx.createOscillator()
        const osc2 = ctx.createOscillator()
        const gain = ctx.createGain()

        osc1.type = 'sine'
        osc2.type = 'sine'
        osc1.frequency.setValueAtTime(880, now)
        osc2.frequency.setValueAtTime(1320, now + 0.05)

        gain.gain.setValueAtTime(0.04 * this.volume, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2)

        osc1.connect(gain)
        osc2.connect(gain)
        gain.connect(ctx.destination)

        osc1.start(now)
        osc2.start(now + 0.05)
        osc1.stop(now + 0.2)
        osc2.stop(now + 0.2)
      } else {
        // Default 'cyber' synth chord
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
      }
    } catch {}
  }

  // --- Purge / Sonic Rumble ---
  public purge() {
    try {
      const ctx = this.initContext()
      if (!ctx) return
      const now = ctx.currentTime

      if (this.profile === 'mechanical') {
        // Heavy spacebar bottom-out thud with spring dampening
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(130, now)
        osc.frequency.exponentialRampToValueAtTime(45, now + 0.22)
        gain.gain.setValueAtTime(0.12 * this.volume, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(now)
        osc.stop(now + 0.22)
      } else if (this.profile === 'linear') {
        // Gentle low-pass woosh
        const bufferSize = Math.floor(ctx.sampleRate * 0.18)
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
        const data = buffer.getChannelData(0)
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1

        const noise = ctx.createBufferSource()
        noise.buffer = buffer
        const filter = ctx.createBiquadFilter()
        filter.type = 'lowpass'
        filter.frequency.setValueAtTime(450, now)
        filter.frequency.exponentialRampToValueAtTime(80, now + 0.18)

        const gain = ctx.createGain()
        gain.gain.setValueAtTime(0.05 * this.volume, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18)

        noise.connect(filter)
        filter.connect(gain)
        gain.connect(ctx.destination)
        noise.start(now)
        noise.stop(now + 0.18)
      } else {
        // Cyber sawtooth descent
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
      }
    } catch {}
  }

  // --- Shred / Delete Swoosh ---
  public shred() {
    try {
      const ctx = this.initContext()
      if (!ctx) return
      const now = ctx.currentTime

      if (this.profile === 'mechanical') {
        // Triple rapid key chatter
        const playMicroClick = (offset: number) => {
          this.playNoiseTransient(ctx, now + offset, 3000, 4, 0.007, 0.08 * this.volume)
        }
        playMicroClick(0)
        playMicroClick(0.04)
        playMicroClick(0.08)
      } else if (this.profile === 'linear') {
        // Ultra-soft paper slide
        const bufferSize = Math.floor(ctx.sampleRate * 0.12)
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
        const data = buffer.getChannelData(0)
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1

        const noise = ctx.createBufferSource()
        noise.buffer = buffer
        const filter = ctx.createBiquadFilter()
        filter.type = 'bandpass'
        filter.frequency.setValueAtTime(900, now)
        filter.frequency.exponentialRampToValueAtTime(300, now + 0.12)
        filter.Q.setValueAtTime(1.5, now)

        const gain = ctx.createGain()
        gain.gain.setValueAtTime(0.04 * this.volume, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12)

        noise.connect(filter)
        filter.connect(gain)
        gain.connect(ctx.destination)
        noise.start(now)
        noise.stop(now + 0.12)
      } else {
        // Cyber bandpass noise sweep
        const bufferSize = Math.floor(ctx.sampleRate * 0.15)
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
        const data = buffer.getChannelData(0)
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1

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
      }
    } catch {}
  }

  // --- Navigate / Page Warp ---
  public navigate() {
    try {
      const ctx = this.initContext()
      if (!ctx) return
      const now = ctx.currentTime

      if (this.profile === 'mechanical') {
        // Tactile key bump
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(260, now)
        osc.frequency.exponentialRampToValueAtTime(120, now + 0.035)
        gain.gain.setValueAtTime(0.08 * this.volume, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(now)
        osc.stop(now + 0.035)
      } else if (this.profile === 'linear') {
        // Soft bubble pop
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(340, now)
        osc.frequency.exponentialRampToValueAtTime(460, now + 0.025)
        gain.gain.setValueAtTime(0.035 * this.volume, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(now)
        osc.stop(now + 0.025)
      } else {
        // Cyber warp hum
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
      }
    } catch {}
  }

  // Utility: short noise burst for mechanical click transient
  private playNoiseTransient(
    ctx: AudioContext,
    startTime: number,
    freq: number,
    q: number,
    duration: number,
    gainVal: number
  ) {
    const bufferSize = Math.max(64, Math.floor(ctx.sampleRate * duration))
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1

    const noise = ctx.createBufferSource()
    noise.buffer = buffer
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.setValueAtTime(freq, startTime)
    filter.Q.setValueAtTime(q, startTime)

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(gainVal, startTime)
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration)

    noise.connect(filter)
    filter.connect(gain)
    gain.connect(ctx.destination)
    noise.start(startTime)
    noise.stop(startTime + duration)
  }
}

export const cyberAudio = new CyberAudioEngine()

export const setAudioProfile = (profile: AudioProfile) => cyberAudio.setAudioProfile(profile)
export const getAudioProfile = (): AudioProfile => cyberAudio.getAudioProfile()
