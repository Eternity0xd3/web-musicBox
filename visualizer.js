var song;
var bgImgElement = document.getElementById("bg-img");
var coverImg = document.getElementById("coverImg");
var playButton = document.getElementById("play-btn");
var canvas = document.querySelector("canvas");
var enhance = document.getElementById("enhance");
var canvasCtx = canvas.getContext("2d");
var progressBar = document.getElementById("progressBar");
var durationLabel = document.getElementById("duration");
var currentTimeLabel = document.getElementById("currentTime");
var fileNameElement = document.getElementById("fileName");
var bgImg;
var audioContext;
var analyser;
var dataArray;
var preDataArray;
var preProcessedDataArray;
var bufferLength;
var animationId;
var deltaBuffer;
var isPlaying = false;

// some changeable arguments
let smoothingOfNormal = 0.7; // 普通模式下的平滑度
let smoothingOfEnhancement = 0.85; // 加强(导数)模式下的平滑度
let decayRate = 0.7; // 衰减率，用于逐渐减少音频图变化量(加强模式下)
let p = 0.15; // 加强(导数)模式下原数据比例
let d = 5; // 加强(导数)模式下变化率的倍率

init();

function init() {
  //canvas
  canvas.width = window.innerWidth * devicePixelRatio;
  canvas.height = (window.innerHeight / 5) * devicePixelRatio;

  //button
  playButton.onclick = function () {
    togglePlaying();
  };
  //progress bar
  progressBar.addEventListener("input", seekAudio);

  //load file
  document
    .getElementById("audioFile")
    .addEventListener("change", function (event) {
      if (song) song.pause();
      isPlaying = false;
      playButton.innerHTML = "play";
      const file = event.target.files[0];
      const fileURL = URL.createObjectURL(file);
      song = new Audio(fileURL);
      updateDuration();
      fileNameElement.textContent = file.name;
      analyseAudio();
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

// 进度条控制时间
function seekAudio() {
  const seekTime = (progressBar.value / 100) * song.duration;
  song.currentTime = seekTime;
}

// 时间控制进度条
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

// 总时长显示
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

// 播放-暂停按钮
function togglePlaying() {
  if (!song) {
    alert("请先选择一个音频文件");
    return;
  }
  if (!isPlaying) {
    song.play();
    playButton.innerHTML = "pause";
  } else {
    song.pause();
    playButton.innerHTML = "play";
  }
  isPlaying = !isPlaying;
  requestAnimationFrame(updateProgressBar);
}

//音频分析
function analyseAudio() {
  if (!song) {
    alert("请先选择一个音频文件");
    return;
  }
  if (animationId !== undefined) window.cancelAnimationFrame(animationId);
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
  animationId = requestAnimationFrame(drawFreqGraph);

  analyser.getByteFrequencyData(dataArray);

  let processedDataArray = new Uint8Array(bufferLength);

  if (deltaBuffer === undefined || deltaBuffer.length !== bufferLength) {
    deltaBuffer = new Array(bufferLength).fill(0); // 变化量缓冲区
  }

  // 频率图绘制模式(导数加强/普通)
  if (enhance.checked) {
    var smoothing = smoothingOfEnhancement;
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
    var smoothing = smoothingOfNormal;
    processedDataArray = dataArray.slice();
  }

  // 平滑处理
  for (let i = 0; i < bufferLength; i++) {
    processedDataArray[i] = preProcessedDataArray
      ? preProcessedDataArray[i] * smoothing +
        processedDataArray[i] * (1 - smoothing)
      : processedDataArray[i];
  }

  // 绘制频率图
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight / 3;

  canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

  const barWidth = canvas.width / bufferLength + 0.8;
  let barHeight;
  let x = 0;

  for (let i = 0; i < bufferLength; i++) {
    barHeight = (processedDataArray[i] / 255) * canvas.height;

    canvasCtx.fillStyle = "rgb(" + i + "," + (255 - i) + ",255)";
    canvasCtx.fillRect(
      x,
      canvas.height - barHeight,
      barWidth - 1,
      barHeight + 2
    );

    x += barWidth;
  }
  preDataArray = dataArray.slice(); // 确保复制数组数据，而不是引用
  preProcessedDataArray = processedDataArray.slice();
}