/** An original, sparse pentatonic melody over a filtered ocean-noise bed. */
export class JourneyAudio {
  private context?: AudioContext;
  private timer?: ReturnType<typeof setInterval>;
  private beat = 0;
  private melody = [0, 7, 12, 16, 14, 7, 4, 0, 7, 9, 12, 7, 4, 2, 7, 0];

  async play(): Promise<void> {
    if (!this.context) {
      const ctx = new AudioContext();
      this.context = ctx;
      const master = ctx.createGain();
      master.gain.value = 0.23;
      master.connect(ctx.destination);
      const length = ctx.sampleRate * 8;
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let brown = 0;
      for (let i = 0; i < length; i++) {
        brown = (brown + (Math.random() * 2 - 1) * 0.025) / 1.025;
        data[i] = brown * (0.35 + 0.2 * Math.sin(i / ctx.sampleRate * Math.PI / 4));
      }
      const ocean = ctx.createBufferSource();
      const lowPass = ctx.createBiquadFilter();
      lowPass.type = 'lowpass';
      lowPass.frequency.value = 650;
      ocean.buffer = buffer;
      ocean.loop = true;
      ocean.connect(lowPass).connect(master);
      ocean.start();
      const note = () => {
        if (ctx.state !== 'running') return;
        const now = ctx.currentTime;
        const frequency = 220 * 2 ** (this.melody[this.beat++ % this.melody.length] / 12);
        [1, 2, 3].forEach((harmonic) => {
          const oscillator = ctx.createOscillator();
          const envelope = ctx.createGain();
          oscillator.type = 'sine';
          oscillator.frequency.value = frequency * harmonic;
          envelope.gain.setValueAtTime(0, now);
          envelope.gain.linearRampToValueAtTime(0.2 / harmonic ** 2, now + 0.012);
          envelope.gain.exponentialRampToValueAtTime(0.0001, now + 3.5);
          oscillator.connect(envelope).connect(master);
          oscillator.start(now);
          oscillator.stop(now + 3.6);
        });
      };
      this.timer = setInterval(note, 1850);
      await ctx.resume();
      note();
    } else {
      await this.context.resume();
    }
  }

  async pause(): Promise<void> { await this.context?.suspend(); }

  dispose(): void {
    if (this.timer) clearInterval(this.timer);
    void this.context?.close();
    this.context = undefined;
  }
}
