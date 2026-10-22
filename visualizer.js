class Visualizer {
  constructor(canvas, enhancement = true) {
    this.canvas = canvas;
    this.enhance = enhancement;
    this.canvasCtx = canvas.getContext("2d");
    this.audioContext = null;
    this.source = null;
    this.sources = new WeakMap();
    this.animationId = null;
    this.bandCount = 80;
    this.resetAnalysis();
    this.initCanvas();
  }

  initCanvas() {
    const width = window.innerWidth;
    const height = Math.floor(window.innerHeight / 3);
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    if (this.width === width && this.height === height && this.ratio === ratio) return;
    this.width = width;
    this.height = height;
    this.ratio = ratio;
    this.canvas.width = Math.round(width * ratio);
    this.canvas.height = Math.round(height * ratio);
    // Preserve the existing bottom canvas height on high-DPI displays.
    this.canvas.style.height = `${height}px`;
    this.canvasCtx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  resetAnalysis() {
    this.bands = new Float32Array(this.bandCount);
    this.previousBands = new Float32Array(this.bandCount);
    this.heights = new Float32Array(this.bandCount);
    this.accents = new Float32Array(this.bandCount);
    this.energy = { bass: 0, mid: 0, treble: 0 };
    this.bassMean = 0;
    this.fluxMean = 0;
    this.fluxVariance = 0;
    this.level = 0.65;
    this.beat = 0;
    this.lastBeat = -Infinity;
    this.elapsed = 0;
    this.lastTime = null;
  }

  changeSong(songAudio) {
    if (this.song) this.song.removeEventListener("seeking", this.onSeek);
    this.song = songAudio;
    this.onSeek = () => this.resetAnalysis();
    this.song.addEventListener("seeking", this.onSeek);
    this.analyseAudio();
  }

  analyseAudio() {
    if (!this.song) return;
    if (this.animationId !== null) cancelAnimationFrame(this.animationId);
    if (!this.audioContext) {
      this.audioContext = new window.AudioContext();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 4096;
      // Time-based attack/release below replaces the analyser's smoothing.
      this.analyser.smoothingTimeConstant = 0;
      this.dataArray = new Float32Array(this.analyser.frequencyBinCount);
      this.analyser.connect(this.audioContext.destination);
      this.createFrequencyBands();
    }
    if (this.source) this.source.disconnect();
    this.source = this.sources.get(this.song);
    if (!this.source) {
      this.source = this.audioContext.createMediaElementSource(this.song);
      this.sources.set(this.song, this.source);
    }
    this.source.connect(this.analyser);
    this.resetAnalysis();
    this.audioContext.resume().catch((error) => console.warn("音频分析器尚未恢复运行:", error));
    this.drawFreqGraph();
  }

  createFrequencyBands() {
    const binHz = this.audioContext.sampleRate / this.analyser.fftSize;
    const minHz = 40;
    const maxHz = Math.min(16000, this.audioContext.sampleRate / 2);
    this.frequencyBands = Array.from({ length: this.bandCount }, (_, i) => {
      const low = minHz * (maxHz / minHz) ** (i / this.bandCount);
      const high = minHz * (maxHz / minHz) ** ((i + 1) / this.bandCount);
      return { lowBin: low / binHz, highBin: high / binHz, hz: Math.sqrt(low * high) };
    });
  }

  readFrequencyBands() {
    this.analyser.getFloatFrequencyData(this.dataArray);
    for (let i = 0; i < this.bandCount; i++) {
      const { lowBin, highBin } = this.frequencyBands[i];
      let power = 0;
      let weight = 0;
      // Weight partial bins so narrow bass bands don't read as empty.
      for (let bin = Math.floor(lowBin); bin < Math.ceil(highBin); bin++) {
        if (bin >= this.dataArray.length) break;
        const overlap = Math.min(highBin, bin + 1) - Math.max(lowBin, bin);
        const db = this.dataArray[bin];
        power += (Number.isFinite(db) ? 10 ** (db / 10) : 0) * overlap;
        weight += overlap;
      }
      const db = 10 * Math.log10(Math.max(power / (weight || 1), 1e-12));
      // Fixed noise floor and bounded gain preserve quiet passages.
      this.bands[i] = Math.max(0, Math.min(1, (db + 78) / 58)) ** 1.5;
    }
  }

  updateResponse(dt, active) {
    const totals = { bass: 0, mid: 0, treble: 0 };
    const counts = { bass: 0, mid: 0, treble: 0 };
    let flux = 0;
    let maximum = 0;
    for (let i = 0; i < this.bandCount; i++) {
      const value = this.bands[i];
      const hz = this.frequencyBands[i].hz;
      const range = hz < 180 ? "bass" : hz < 2500 ? "mid" : "treble";
      const rise = Math.max(0, value - this.previousBands[i]);
      totals[range] += value;
      counts[range]++;
      if (range === "bass") flux += rise;
      maximum = Math.max(maximum, value);
      this.accents[i] = Math.max(rise, this.accents[i] * Math.exp(-dt / 0.09));
    }
    for (const range of Object.keys(totals)) totals[range] /= counts[range] || 1;
    this.energy = totals;
    flux /= counts.bass || 1;
    this.beat *= Math.exp(-dt / 0.14);
    const threshold = Math.max(0.018, this.fluxMean + 1.5 * Math.sqrt(this.fluxVariance));
    if (active && this.elapsed > 0.35 && this.elapsed - this.lastBeat > 0.18 &&
        totals.bass > 0.12 && totals.bass > this.bassMean * 1.12 && flux > threshold) {
      this.beat = Math.min(1, 0.4 + flux * 3);
      this.lastBeat = this.elapsed;
    }
    const mix = 1 - Math.exp(-dt / 0.8);
    const delta = flux - this.fluxMean;
    this.fluxMean += delta * mix;
    this.fluxVariance = (1 - mix) * (this.fluxVariance + mix * delta * delta);
    this.bassMean += (totals.bass - this.bassMean) * mix;
    this.elapsed += dt;
    this.level += (Math.max(0.55, maximum) - this.level) * (1 - Math.exp(-dt / 1.5));
    const gain = Math.min(1.25, 0.8 / this.level);
    for (let i = 0; i < this.bandCount; i++) {
      const hz = this.frequencyBands[i].hz;
      const beatWeight = hz < 180 ? 0.24 : hz < 2500 ? 0.09 : 0.04;
      const accent = this.enhance && active
        ? this.accents[i] * 0.45 + this.beat * beatWeight * this.bands[i] : 0;
      const target = Math.min(0.96, this.bands[i] * gain * 0.82 + accent);
      const response = target > this.heights[i] ? 0.018 : hz < 180 ? 0.22 : 0.15;
      this.heights[i] += (target - this.heights[i]) * (1 - Math.exp(-dt / response));
      this.previousBands[i] = this.bands[i];
    }
  }

  drawFreqGraph = (timestamp = performance.now()) => {
    this.animationId = requestAnimationFrame(this.drawFreqGraph);
    const dt = this.lastTime === null ? 1 / 60 : Math.min(0.1, Math.max(0, (timestamp - this.lastTime) / 1000));
    this.lastTime = timestamp;
    this.initCanvas();
    const active = !this.song.paused && !this.song.ended && this.audioContext.state === "running";
    if (active) this.readFrequencyBands();
    else {
      this.bands.fill(0);
      this.beat = 0;
    }
    this.updateResponse(dt, active);
    this.canvasCtx.clearRect(0, 0, this.width, this.height);
    const barWidth = this.width / this.bandCount;
    const gap = Math.min(2, barWidth * 0.2);
    for (let i = 0; i < this.bandCount; i++) {
      const barHeight = this.heights[i] * this.height;
      const color = Math.round(i / (this.bandCount - 1) * 255);
      this.canvasCtx.fillStyle = `rgb(${color}, ${255 - color}, 255)`;
      this.canvasCtx.fillRect(i * barWidth, this.height - barHeight, barWidth - gap, barHeight);
    }
  };
}
