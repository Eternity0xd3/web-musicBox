class Visualizer {
  constructor(canvas, enhanceCheckbox) {
    this.canvas = canvas;
    this.enhance = enhanceCheckbox;
    this.canvasCtx = canvas.getContext("2d");

    this.song = null;
    this.audioContext = null;
    this.analyser = null;
    this.dataArray = null;
    this.preDataArray = null;
    this.preProcessedDataArray = null;
    this.bufferLength = null;
    this.animationId = null;
    this.deltaBuffer = null;

    // 参数
    this.smoothingOfNormal = 0.5;
    this.smoothingOfEnhancement = 0.85;
    this.decayRate = 0.7;
    this.p = 0.15;
    this.d = 5;

    this.initCanvas();
  }

  initCanvas() {
    this.canvas.width = window.innerWidth * devicePixelRatio;
    this.canvas.height = (window.innerHeight / 5) * devicePixelRatio;
  }

  changeSong(songAudio) {
    this.song = songAudio;
    this.analyseAudio();
  }

  analyseAudio() {
    if (!this.song) {
      alert("请先选择一个音频文件");
      return;
    }
    if (this.animationId !== undefined) {
      window.cancelAnimationFrame(this.animationId);
    }

    this.audioContext = new window.AudioContext();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 512;
    this.bufferLength = this.analyser.frequencyBinCount;
    this.dataArray = new Uint8Array(this.bufferLength);
    this.preDataArray = new Uint8Array(this.bufferLength);

    const source = this.audioContext.createMediaElementSource(this.song);
    source.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);

    this.drawFreqGraph();
  }

  drawFreqGraph = () => {
    this.animationId = requestAnimationFrame(this.drawFreqGraph);

    this.analyser.getByteFrequencyData(this.dataArray);
    let processedDataArray = new Uint8Array(this.bufferLength);

    if (!this.deltaBuffer) {
      this.deltaBuffer = new Array(this.bufferLength).fill(0);
    }

    let smoothing;
    if (this.enhance) {
      smoothing = this.smoothingOfEnhancement;
      for (let i = 0; i < this.bufferLength; i++) {
        if (!this.preDataArray) break;
        let delta = this.dataArray[i] - this.preDataArray[i];
        delta = delta > 0 ? delta : 0;
        this.deltaBuffer[i] =
          delta * this.d + this.deltaBuffer[i] * this.decayRate;
        processedDataArray[i] =
          this.dataArray[i] * this.p + this.deltaBuffer[i];
      }
    } else {
      smoothing = this.smoothingOfNormal;
      processedDataArray = this.dataArray.slice();
    }

    for (let i = 0; i < this.bufferLength; i++) {
      processedDataArray[i] = this.preProcessedDataArray
        ? this.preProcessedDataArray[i] * smoothing +
          processedDataArray[i] * (1 - smoothing)
        : processedDataArray[i];
    }

    // 绘图
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight / 3;

    this.canvasCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const barWidth = this.canvas.width / this.bufferLength + 0.8;
    let barHeight;
    let x = 0;

    for (let i = 0; i < this.bufferLength; i++) {
      barHeight = (processedDataArray[i] / 255) * this.canvas.height;

      this.canvasCtx.fillStyle = `rgb(${i}, ${255 - i}, 255)`;
      this.canvasCtx.fillRect(
        x,
        this.canvas.height - barHeight,
        barWidth - 1,
        barHeight + 2
      );

      x += barWidth;
    }

    this.preDataArray = this.dataArray.slice();
    this.preProcessedDataArray = processedDataArray.slice();
  };
}
