class MusicPlayer {
  constructor(song) {
    this.title = document.getElementById("title");
    this.playButton = document.getElementById("play-btn");
    this.progressBar = document.getElementById("progressBar");
    this.durationLabel = document.getElementById("duration");
    this.currentTimeLabel = document.getElementById("currentTime");
    this.fileNameElement = document.getElementById("fileName");
    this.playButton.onclick = function () {
      this.togglePlaying();
    }.bind(this);
    this.progressBar.addEventListener("input", this.seekAudio.bind(this));
    this.song = song;
    this.isPlaying = false;
    this.updateDuration();
  }

  // 进度条控制时间
  seekAudio() {
    const seekTime = (this.progressBar.value / 100) * this.song.duration;
    this.song.currentTime = seekTime;
  }

  // 时间控制进度条
  updateProgressBar() {
    if (!isNaN(this.song.duration)) {
      const value = (this.song.currentTime / this.song.duration) * 100;
      this.progressBar.value = value;
      this.currentTimeLabel.textContent = this.formatTime(
        this.song.currentTime
      );
    }
    if (this.isPlaying) {
      requestAnimationFrame(this.updateProgressBar.bind(this));
    }
  }

  // 总时长显示
  updateDuration() {
    if (!this.song) return;
    if (this.song.duration) {
      this.durationLabel.textContent = this.formatTime(this.song.duration);
    } else {
      setTimeout(this.updateDuration.bind(this), 100); // 等待音频文件加载完成
    }
  }

  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  }

  // 播放-暂停按钮
  togglePlaying() {
    if (!this.song) {
      alert("请先选择一个音频文件");
      return;
    }
    if (!this.isPlaying) {
      this.song.play();
      this.playButton.innerHTML = "pause";
    } else {
      this.song.pause();
      this.playButton.innerHTML = "play";
    }
    this.isPlaying = !this.isPlaying;
    requestAnimationFrame(this.updateProgressBar.bind(this));
  }

  updateSong(song, title) {
    if (this.song) {
      this.song.pause();
    }
    this.title.textContent = title;
    this.song = song;
    this.isPlaying = false;
    this.updateDuration();
  }
}
