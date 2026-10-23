/** Original instrumental music and abstract mascot sounds, enabled only by play(). */
export class JourneyAudio {
  private context?: AudioContext;
  private master?: GainNode;
  private oceanGain?: GainNode;
  private noise?: AudioBuffer;
  private timer?: ReturnType<typeof setInterval>;
  private beat = 0;
  private nextBeat = 0;
  private mood: 'day' | 'night' | 'party' = 'day';
  private enabled = false;
  private melody = [0, 7, 12, 16, 14, 7, 4, 0, 7, 9, 12, 7, 4, 2, 7, 0];

  async play(): Promise<void> {
    if (!this.context) {
      const ctx = new AudioContext();
      this.context = ctx;
      this.master = ctx.createGain();
      this.master.gain.value = 0.23;
      this.master.connect(ctx.destination);
      const length = ctx.sampleRate * 8;
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let brown = 0;
      for (let i = 0; i < length; i++) {
        brown = (brown + (Math.random() * 2 - 1) * 0.025) / 1.025;
        data[i] = brown * (0.35 + 0.2 * Math.sin(i / ctx.sampleRate * Math.PI / 4));
      }
      this.noise = buffer;
      const ocean = ctx.createBufferSource();
      const lowPass = ctx.createBiquadFilter();
      this.oceanGain = ctx.createGain();
      this.oceanGain.gain.value = this.mood === 'night' ? 0.45 : 0.8;
      lowPass.type = 'lowpass';
      lowPass.frequency.value = 650;
      ocean.buffer = buffer;
      ocean.loop = true;
      ocean.connect(lowPass).connect(this.oceanGain).connect(this.master);
      ocean.start();
      this.timer = setInterval(() => this.tick(), 120);
    }
    this.enabled = true;
    await this.context.resume();
    this.nextBeat = this.context.currentTime;
    this.tick();
  }

  setMood(mood: 'day' | 'night' | 'party'): void {
    if (this.mood === mood) return;
    this.mood = mood;
    this.beat = 0;
    if (this.context) {
      this.nextBeat = this.context.currentTime + 0.2;
      this.oceanGain?.gain.setTargetAtTime(mood === 'night' ? 0.45 : mood === 'party' ? 0.35 : 0.8, this.context.currentTime, 1);
    }
  }

  private tick(): void {
    const ctx = this.context;
    if (!this.enabled || !ctx || ctx.state !== 'running' || ctx.currentTime < this.nextBeat) return;
    const now = ctx.currentTime;
    const step = this.beat++;
    const party = this.mood === 'party';
    this.nextBeat = now + (party ? 0.36 : this.mood === 'night' ? 3.1 : 1.85);
    const pitch = this.melody[(party ? Math.floor(step / 2) : step) % this.melody.length];
    if (!party || step % 2 === 0) {
      const frequency = (party ? 330 : 220) * 2 ** (pitch / 12);
      [1, 2, 3].forEach(harmonic => this.tone(frequency * harmonic, now, party ? 0.65 : 3.5, 0.18 / harmonic ** 2));
    }
    if (party) {
      // A soft, original two-beat arrangement; no sampled music or voices.
      if (step % 2 === 0) this.tone(82.4 * 2 ** ((step % 16 < 8 ? 0 : 5) / 12), now, 0.22, 0.2);
      else this.rustle(now, 0.075, 0.2, 1800);
      if (step % 4 === 0) this.tone(55, now, 0.1, 0.32);
    }
  }

  private tone(frequency: number, at: number, duration: number, volume: number, type: OscillatorType = 'sine', endFrequency?: number): void {
    const ctx = this.context;
    if (!ctx || !this.master) return;
    const oscillator = ctx.createOscillator();
    const envelope = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, at);
    if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, at + duration * 0.8);
    envelope.gain.setValueAtTime(0, at);
    envelope.gain.linearRampToValueAtTime(volume, at + Math.min(0.012, duration / 5));
    envelope.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    oscillator.connect(envelope).connect(this.master);
    oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
    oscillator.start(at);
    oscillator.stop(at + duration + 0.02);
  }

  private rustle(at: number, duration: number, volume: number, frequency: number): void {
    const ctx = this.context;
    if (!ctx || !this.master || !this.noise) return;
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    source.buffer = this.noise;
    filter.type = 'bandpass';
    filter.frequency.value = frequency;
    filter.Q.value = 0.6;
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(volume, at + duration * 0.15);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    source.connect(filter).connect(gain).connect(this.master);
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
    source.start(at, Math.random() * 4, duration);
  }

  /** Unknown cues are silent. This never creates or resumes an AudioContext. */
  cue(kind: string, character = 'blue'): void {
    const ctx = this.context;
    if (!this.enabled || !ctx || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    if (kind === 'babble' || kind === 'talk' || kind === 'laugh' || kind === 'yawn') {
      const voices: Record<string, [number, OscillatorType]> = {
        blue: [340, 'sine'], stone: [185, 'triangle'], penguin: [530, 'sine'],
        capybara: [135, 'triangle'], child: [430, 'sine'],
      };
      const [base, wave] = voices[character] ?? voices.blue;
      const syllables = kind === 'yawn' ? [0, -3] : kind === 'laugh' ? [5, 2, 5, 0] : [0, 4, -2, 7];
      syllables.forEach((semitone, i) => {
        const frequency = base * 2 ** (semitone / 12);
        this.tone(frequency, now + i * 0.14, kind === 'yawn' ? 0.36 : 0.105, 0.2, wave, frequency * (kind === 'laugh' ? 0.85 : 1.12));
      });
    } else if (kind === 'splash' || kind === 'wave') {
      this.rustle(now, 0.65, 1.3, 900);
      this.tone(100, now, 0.16, 0.15, 'sine', 55);
    } else if (kind === 'bell' || kind === 'checkpoint') {
      [660, 990].forEach((frequency, i) => this.tone(frequency, now + i * 0.09, 0.9, 0.15));
    } else if (kind === 'reel') {
      [0, 0.08, 0.16].forEach(offset => this.tone(850, now + offset, 0.035, 0.11, 'triangle', 600));
    } else if (kind === 'page' || kind === 'blanket' || kind === 'ribbon') {
      this.rustle(now, kind === 'blanket' ? 0.65 : 0.3, 0.8, kind === 'blanket' ? 500 : 1900);
    } else if (kind === 'pluck' || kind === 'flower') {
      [523.25, 659.25, 783.99].forEach((frequency, i) => this.tone(frequency, now + i * 0.07, 0.45, 0.13));
    } else if (kind === 'confetti' || kind === 'cheer') {
      this.rustle(now, 0.18, 1.1, 2200);
      [523.25, 659.25, 783.99, 1046.5].forEach((frequency, i) => this.tone(frequency, now + i * 0.08, 0.7, 0.14));
    }
  }

  async pause(): Promise<void> {
    this.enabled = false;
    await this.context?.suspend();
  }

  dispose(): void {
    this.enabled = false;
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    void this.context?.close();
    this.context = undefined;
    this.master = undefined;
    this.oceanGain = undefined;
    this.noise = undefined;
  }
}
