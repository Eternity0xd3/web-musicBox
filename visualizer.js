let song;
let button = document.getElementById("btn");
let canvas = document.querySelector("canvas");
let canvasCtx = canvas.getContext("2d");
let audioContext;
let analyser;
let dataArray;
let bufferLength;
var isPlaying = false;
var isFirst = true;

preload();
init();

function preload() {
  song = new Audio("file.mp3");
}

function init() {
  //canvas
  canvas.width = window.innerWidth * devicePixelRatio;
  canvas.height = (window.innerHeight / 5) * devicePixelRatio;

  //button
  button.onclick = function () {
    togglePlaying();
  };
  document
    .getElementById("audioFile")
    .addEventListener("change", function (event) {
      const file = event.target.files[0];
      const fileURL = URL.createObjectURL(file);
      song = new Audio(fileURL);
      isFirst = true;
    });
}

function togglePlaying() {
  if (!isPlaying) {
    if (isFirst) analyseAudio();
    song.play();
    button.innerHTML = "pause";
    isFirst = false;
  } else {
    song.pause();
    button.innerHTML = "play";
  }
  isPlaying = !isPlaying;
}

function analyseAudio() {
  if (!song) {
    alert("请先选择一个音频文件");
    return;
  }

  audioContext = new window.AudioContext();
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 512;
  bufferLength = analyser.frequencyBinCount;
  dataArray = new Uint8Array(bufferLength);

  source = audioContext.createMediaElementSource(song);
  source.connect(analyser);
  analyser.connect(audioContext.destination);

  drawFreqGraph();
}

function loadFile() {
  document
    .getElementById("audioFile")
    .addEventListener("change", function (event) {
      const file = event.target.files[0];
      const fileURL = URL.createObjectURL(file);
      song = new Audio(fileURL);
    });
  isFirst = false;
}

function drawTimeGrapg() {
  requestAnimationFrame(drawTimeGrapg);

  analyser.getByteTimeDomainData(dataArray);

  canvasCtx.fillStyle = "rgb(0, 0, 0)";
  canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

  canvasCtx.lineWidth = 2;
  canvasCtx.strokeStyle = "rgb(241, 209, 255)";

  canvasCtx.beginPath();
  const sliceWidth = (canvas.width * 1.0) / bufferLength;
  let x = 0;

  for (let i = 0; i < bufferLength; i++) {
    const v = dataArray[i] / 128.0;
    const y = (v * canvas.height) / 2;

    if (i === 0) {
      canvasCtx.moveTo(x, y);
    } else {
      canvasCtx.lineTo(x, y);
    }

    x += sliceWidth;
  }

  canvasCtx.lineTo(canvas.width, canvas.height / 2);
  canvasCtx.stroke();
}

function drawFreqGraph() {
  requestAnimationFrame(drawFreqGraph);

  analyser.getByteFrequencyData(dataArray);
  canvasCtx.fillStyle = "rgb(0, 0, 0)";
  canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

  const barWidth = canvas.width / bufferLength - 4;
  let barHeight;
  let x = 0;

  for (let i = 0; i < bufferLength; i++) {
    barHeight = dataArray[i];

    canvasCtx.fillStyle = "rgb(" + i + "," + (255 - i) + ",255)";
    canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

    x += barWidth + 1;
  }
}
