// Synthesize a short "bing" notification tone via Web Audio API.
// No external audio file required.

let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new AudioContext()
  }
  return audioCtx
}

/**
 * Play a two-tone "bing" notification sound.
 * Uses Web Audio API so it works without any audio file.
 */
export function playBing() {
  try {
    const ctx = getAudioContext()

    // Resume context if suspended (browser autoplay policy)
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }

    const now = ctx.currentTime

    // Gain node for volume envelope
    const gain = ctx.createGain()
    gain.connect(ctx.destination)
    gain.gain.setValueAtTime(0.3, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4)

    // First tone — 830 Hz
    const osc1 = ctx.createOscillator()
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(830, now)
    osc1.connect(gain)
    osc1.start(now)
    osc1.stop(now + 0.4)

    // Second tone — 1050 Hz, slightly delayed for the "bing" effect
    const gain2 = ctx.createGain()
    gain2.connect(ctx.destination)
    gain2.gain.setValueAtTime(0, now)
    gain2.gain.setValueAtTime(0.25, now + 0.12)
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.5)

    const osc2 = ctx.createOscillator()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(1050, now + 0.12)
    osc2.connect(gain2)
    osc2.start(now + 0.12)
    osc2.stop(now + 0.5)
  } catch {
    // Silent fail — audio is non-critical
  }
}
