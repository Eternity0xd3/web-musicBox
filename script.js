const apiUrl = "https://music.eternity0.xyz";
const playListId = "4974517819";
let limit = 15;
let offset = 0;
let musicListUrl = `${apiUrl}/api/playlist/track?id=${playListId}&limit=${limit}&offset=${offset}`;
let musicList = [];
let enhancement = true;
let curentSongIndex = -1;
let settingsAutoPlaying = true;
const musicPlayer = new MusicPlayer(null);
const visualizer = new Visualizer(
  document.getElementById("canvas"),
  enhancement
);

async function fetchMusicList(url) {
  try {
    const response = await axios.get(musicListUrl);
    console.log(response)
    const data = response.data.songs;
    return data;
  } catch (error) {
    console.error("获取音乐列表失败:", error);
  }
}

async function getMusicData(id) {
  try {
    const quality = "exhigh";
    const url = `${apiUrl}/api/song/resource?id=${id}&level=${quality}`;
    const response = await axios.get(url);
    const data = response.data.data[0].url;
    console.log(data)
    return data;
  } catch (error) {
    console.error("获取音乐数据失败:", error);
  }
}

function displayMusicList(songs) {
  const musicListContainer = document.getElementById("music-list-container");
  musicListContainer.innerHTML = "";
  songs.forEach((music) => {
    const musicDiv = document.createElement("div");
    const img =
      music.al.picUrl ||
      "https://p2.music.126.net/6y-UleORITEDbvrOLV0Q8A==/5639395138885805.jpg";
    const artists = music.ar
      ? music.ar.map((a) => a.name).join(", ")
      : music.artists.map((a) => a.name).join(", ");
    musicDiv.className =
      "flex items-center p-2 border-b hover:bg-gray-50 hover:shadow-md transition-all duration-200";
    musicDiv.innerHTML = `
      <img src="${img}" alt="封面" class="w-12 h-12 rounded mr-2">
      <span class="flex-1 cursor-pointer">${music.name}
      <span class="text-gray-500 text-sm"> - ${artists}</span></span>
      <button class="preview-btn bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 hover:scale-105 transition-transform" data-id="${music.id}" title="${artists} - ${music.name}">
        <svg class="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.2A1 1 0 0010 9.768v4.464a1 1 0 001.555.832l3.197-2.2a1 1 0 000-1.664z"></path>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
      </button>
      `;
    musicListContainer.appendChild(musicDiv);
  });
}

let isConcealed = false;
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("toggle-display-btn");
  const targetDiv = document.getElementById("main");

  btn.addEventListener("click", () => {
    targetDiv.classList.toggle("hidden");
    isConcealed = !isConcealed;
  });
});

document.addEventListener("click", async (e) => {
  if (e.target.closest(".preview-btn")) {
    const songId = e.target.closest(".preview-btn").dataset.id;
    const title = e.target.closest(".preview-btn").title;
    const url = await getMusicData(songId);
    if (url) {
      let songUrl = url;
      if (songUrl.startsWith("http://")) {
        songUrl = songUrl.replace("http://", "https://");
      }
      let song = new Audio(songUrl);
      song.crossOrigin = "anonymous";
      musicPlayer.updateSong(song, title);
      visualizer.changeSong(song);
      musicPlayer.togglePlaying();
    }
  }
});

let isLoading = false;
let page = 1; // current page
window.addEventListener("scroll", () => {
  if (isLoading) return;
  if (isConcealed) return;

  const scrollTop = window.scrollY;
  const windowHeight = window.innerHeight;
  const docHeight = document.documentElement.scrollHeight;

  // load additional list when reach 100px from the bottom
  if (scrollTop + windowHeight >= docHeight - 100) {
    isLoading = true;
    offset += limit;
    console.log(musicList);
    // async load music list
    fetchMusicList(musicListUrl).then((data) => {
      isLoading = false;
      console.log(data);
      musicList = musicList.concat(data);
      displayMusicList(musicList);
    });
  }
});

musicList = await fetchMusicList(musicListUrl);
displayMusicList(musicList);
