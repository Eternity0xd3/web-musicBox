let song;
let bgImgElement = document.getElementById("bg-img");
let coverImg = document.getElementById("coverImg");
let button = document.getElementById("btn");
let canvas = document.querySelector("canvas");
let enhance = document.getElementById("enhance");
let canvasCtx = canvas.getContext("2d");
let progressBar = document.getElementById("progressBar");
let durationLabel = document.getElementById("duration");
let currentTimeLabel = document.getElementById("currentTime");
let fileNameElement = document.getElementById("fileName");
let bgImg;
let audioContext;
let analyser;
let dataArray;
let preDataArray;
let preProcessedDataArray;
let bufferLength;
var isPlaying = false;
var isFirst = true;

init();

function init() {
  //canvas
  canvas.width = window.innerWidth * devicePixelRatio;
  canvas.height = (window.innerHeight / 5) * devicePixelRatio;

  //button
  button.onclick = function () {
    togglePlaying();
  };
  //progress bar
  progressBar.addEventListener("input", seekAudio);

  song = new Audio("./resources/file.mp3"); //default song

  //load file
  document
    .getElementById("audioFile")
    .addEventListener("change", function (event) {
      song.pause();
      isPlaying = false;
      button.innerHTML = "play";
      const file = event.target.files[0];
      const fileURL = URL.createObjectURL(file);
      song = new Audio(fileURL);
      isFirst = true;
      updateDuration();
      fileNameElement.textContent = file.name;
      togglePlaying();

      // 读取mp3文件封面
      const reader = new FileReader();
      reader.onload = function (e) {
        const arrayBuffer = e.target.result;
        jsmediatags.read(new Blob([new Uint8Array(arrayBuffer)]), {
          onSuccess: function (tag) {
            const tags = tag.tags;
            if (tags.picture) {
              const picture = tags.picture;
              const base64String = getBase64String(picture.data);
              const base64 = `data:${picture.format};base64,${base64String}`;

              coverImg.innerHTML = `<img src="${base64}" alt="Cover Image">`;
              bgImgElement.style.backgroundImage = `url(${base64})`;
            }
          },
          onError: function (error) {
            console.log("Error reading tags: ", error.type, error.info);
            coverImg.innerHTML = "";
            bgImgElement.style.backgroundImage = "url(resources/bg.jpg)";
          },
        });
      };
      reader.readAsArrayBuffer(file);
    });
}

function getBase64String(data) {
  let base64String = "";
  for (let i = 0; i < data.length; i++) {
    base64String += String.fromCharCode(data[i]);
  }
  return btoa(base64String);
}

function seekAudio() {
  const seekTime = (progressBar.value / 100) * song.duration;
  song.currentTime = seekTime;
}

function updateProgressBar() {
  if (!isNaN(song.duration)) {
    const value = (song.currentTime / song.duration) * 100;
    progressBar.value = value;
    currentTimeLabel.textContent = formatTime(song.currentTime);
  }
  if (isPlaying) {
    requestAnimationFrame(updateProgressBar);
  }
}

function updateDuration() {
  if (song.duration) {
    durationLabel.textContent = formatTime(song.duration);
  } else {
    setTimeout(updateDuration, 100); // 等待音频文件加载完成
  }
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
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
  requestAnimationFrame(updateProgressBar);
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
  preDataArray = new Uint8Array(bufferLength);

  source = audioContext.createMediaElementSource(song);
  source.connect(analyser);
  analyser.connect(audioContext.destination);

  drawFreqGraph();
}

function drawFreqGraph() {
  requestAnimationFrame(drawFreqGraph);

  analyser.getByteFrequencyData(dataArray);

  canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

  const barWidth = canvas.width / bufferLength - 4;
  let barHeight;
  let x = 0;
  let processedDataArray = new Uint8Array(bufferLength);

  let decayRate = 0.6; // 衰减率，用于逐渐减少变化量
  let deltaBuffer = new Array(bufferLength).fill(0); // 初始化变化量缓冲区

  if (enhance.checked) {
    let p = 0;
    let d = 24;
    var smoothing = 0.84;
    for (let i = 0; i < bufferLength; i++) {
      if (preDataArray === undefined) {
        break;
      }
      let delta = dataArray[i] - preDataArray[i];
      delta = delta > 0 ? delta : 0;
      deltaBuffer[i] = delta * d + deltaBuffer[i] * decayRate; // 存储并衰减变化量
      processedDataArray[i] = dataArray[i] * p + deltaBuffer[i];
    }
  } else {
    processedDataArray = dataArray.slice();
    var smoothing = 0.7;
  }

  for (let i = 0; i < bufferLength; i++) {
    processedDataArray[i] = preProcessedDataArray
      ? preProcessedDataArray[i] * smoothing +
        processedDataArray[i] * (1 - smoothing)
      : processedDataArray[i];
  }

  for (let i = 0; i < bufferLength; i++) {
    barHeight = (processedDataArray[i] / 255) * canvas.height;

    canvasCtx.fillStyle = "rgb(" + i + "," + (255 - i) + ",255)";
    canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

    x += barWidth + 1;
  }
  preDataArray = dataArray.slice(); // 确保复制数组数据，而不是引用
  preProcessedDataArray = processedDataArray.slice();
}
