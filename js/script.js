// js/script.js

// --- 全局变量 ---
let audio = new Audio();
let musicDatabase = [];
let currentPlaylist = [];
let currentIndex = 0;
let isPlaying = false;
let isShuffle = false;
let isRepeat = false;
// 新增: 用于播放列表功能的状态变量
let songIdToAddToPlaylist = null;
let currentViewingPlaylistId = null;

// --- GitHub 配置 ---
const GITHUB_OWNER = 'kafuuchino4302';
const GITHUB_REPO = 'kafuchino4302.github.io';
const MUSIC_JSON_PATH = 'music.json';
const MUSIC_FOLDER = 'music/';
const RAW_JSON_URL = 'music.json';
const TOKEN_PART1 = 'ghp_pOaD2xShfdDnW6g2';
const TOKEN_PART2 = 'zt8IIA6injrCOj2JDzRz';
const GITHUB_TOKEN = TOKEN_PART1 + TOKEN_PART2;

// --- DOM 元素 ---
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const uploadList = document.getElementById('upload-list');
const musicEditDialog = document.getElementById('music-edit-dialog');
const saveEditBtn = document.getElementById('save-edit');
const cancelEditBtn = document.getElementById('cancel-edit');
const editTitle = document.getElementById('edit-title');
const editOriginal = document.getElementById('edit-original');
const singersContainer = document.getElementById('singers-container');
const recentUploads = document.getElementById('recent-uploads');
const musicLibrary = document.getElementById('music-library');
const queueList = document.getElementById('queue-list');
const queueSidebar = document.getElementById('queue-sidebar');
const closeQueueBtn = document.getElementById('close-queue');
const playBtn = document.getElementById('play');
const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');
const shuffleBtn = document.getElementById('shuffle');
const repeatBtn = document.getElementById('repeat');
const currentTime = document.getElementById('current-time');
const duration = document.getElementById('duration');
const progress = document.getElementById('progress');
const progressBar = document.querySelector('.progress-bar');
const volume = document.getElementById('volume');
const currentTitle = document.getElementById('current-title');
const currentArtist = document.getElementById('current-artist');
const queueBtn = document.getElementById('queue');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');

// --- 播放列表相关的 DOM 元素 ---
const createPlaylistBtn = document.getElementById('create-playlist-btn');
const playlistsContainer = document.getElementById('playlists-container');
const playlistDetailSection = document.getElementById('playlist-detail');
const playlistDetailName = document.getElementById('playlist-detail-name');
const playlistSongListContainer = document.getElementById('playlist-song-list-container');
const backToPlaylistsBtn = document.getElementById('back-to-playlists-btn');
const playAllInDetailBtn = document.getElementById('play-all-in-detail-btn');
const addToPlaylistModal = document.getElementById('add-to-playlist-modal');
const modalPlaylistList = document.getElementById('modal-playlist-list');
const closeModalBtn = document.getElementById('close-modal-btn');


// --- 导航与页面切换 ---
const navLinks = document.querySelectorAll('.nav-menu a');
const sections = document.querySelectorAll('.main-container .section');

function switchToSection(targetId) {
    const targetSection = document.getElementById(targetId);
    if (targetSection) {
        navLinks.forEach(l => {
            l.classList.toggle('active', l.getAttribute('href') === `#${targetId}`);
        });
        sections.forEach(s => s.classList.remove('active'));
        targetSection.classList.add('active');
    }
}

navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('href').substring(1);
        switchToSection(targetId);
    });
});

// --- 搜索功能 ---

function performSearch() {
    // 1. 获取用户输入的搜索词，并转换为小写以便不区分大小写匹配
    const searchTerm = searchInput.value.toLowerCase().trim();

    // 2. 如果搜索词为空，则显示完整的音乐库
    if (!searchTerm) {
        displayMusic(musicDatabase);
        return;
    }

    // 3. 过滤 musicDatabase 数组
    const filteredMusic = musicDatabase.filter(song => {
        // 将歌曲信息也转换为小写
        const title = song.title.toLowerCase();
        const original = song.original ? song.original.toLowerCase() : '';
        // 将歌手数组连接成一个字符串再搜索
        const singers = Array.isArray(song.singers) ? song.singers.join(' ').toLowerCase() : '';

        // 检查歌曲的标题、原作或歌手中是否包含搜索词
        return title.includes(searchTerm) || 
               original.includes(searchTerm) || 
               singers.includes(searchTerm);
    });

    // 4. 使用过滤后的结果重新渲染音乐库
    if (filteredMusic.length > 0) {
        displayMusic(filteredMusic);
    } else {
        // 如果没有搜索结果，显示提示信息
        musicLibrary.innerHTML = '<p style="text-align: center; color: var(--text-secondary); margin-top: 2rem;">未找到匹配的音乐。</p>';
    }
}

// --- 事件监听 ---
// 1. 当用户在搜索框中输入时，立即执行搜索 (实时搜索)
searchInput.addEventListener('input', performSearch);

// 2. 当用户点击搜索按钮时，也执行搜索
searchBtn.addEventListener('click', performSearch);

// 3. (可选) 当用户在搜索框中按回车键时，也执行搜索
searchInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
        performSearch();
    }
});
// --- 核心音乐功能 ---

async function loadMusicLibrary() {
    try {
        const response = await fetch(`${RAW_JSON_URL}?t=${new Date().getTime()}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        let data = await response.json();
        musicDatabase = Array.isArray(data) && Array.isArray(data[0]) ? data[0] : data;
        displayMusic(musicDatabase);
        displayRecentUploads(musicDatabase.slice(0, 5));
    } catch (error) {
        console.error('加载音乐库失败:', error);
        musicLibrary.innerHTML = '<p>加载音乐库失败。</p>';
    }
}

function displayMusic(musicData) {
    musicLibrary.innerHTML = '';
    musicData.forEach(song => {
        const musicCard = document.createElement('div');
        musicCard.classList.add('music-card');
        musicCard.dataset.songId = song.id;
        musicCard.innerHTML = `
            <div class="music-card-info">
                <h3>${song.title}</h3>
                <p class="singer-info">${Array.isArray(song.singers) ? song.singers.join(', ') : '未知歌手'}</p>
                <p class="original-work">${song.original || '未知'}</p>
            </div>
            <div class="music-card-controls">
                <button class="control-btn play-song-btn" title="播放"><i class="fas fa-play"></i></button>
                <button class="control-btn add-queue-btn" title="添加到队列"><i class="fas fa-plus"></i></button>
                <button class="control-btn add-to-playlist-btn" title="添加到播放列表"><i class="fas fa-stream"></i></button>
            </div>
        `;
        musicLibrary.appendChild(musicCard);
    });
}

musicLibrary.addEventListener('click', e => {
    const card = e.target.closest('.music-card');
    if (!card) return;
    const songId = card.dataset.songId;
    const songIndex = musicDatabase.findIndex(song => song.id === songId);
    if (songIndex === -1) return;

    if (e.target.closest('.play-song-btn')) {
        playSongFromDatabase(songIndex);
    } else if (e.target.closest('.add-queue-btn')) {
        addToQueue(songIndex);
    } else if (e.target.closest('.add-to-playlist-btn')) {
        openAddToPlaylistModal(songId);
    }
});

function displayRecentUploads(musicData) {
    // ... (此函数保持不变)
    recentUploads.innerHTML = '';
     musicData.forEach((song) => {
        const songIndex = musicDatabase.findIndex(s => s.id === song.id);
        if (songIndex === -1) return;

        const musicCard = document.createElement('div');
        musicCard.classList.add('music-card');
        musicCard.innerHTML = `
            <div class="music-card-info">
                <h3>${song.title}</h3>
                <p class="singer-info">${Array.isArray(song.singers) ? song.singers.join(', ') : '未知歌手'}</p>
                <p class="original-work">${song.original || '未知'}</p>
            </div>
            <div class="music-card-controls">
                <button onclick="playSongFromDatabase(${songIndex})"><i class="fas fa-play"></i></button>
                <button onclick="addToQueue(${songIndex})"><i class="fas fa-plus"></i></button>
            </div>
        `;
        recentUploads.appendChild(musicCard);
    });
}

function playSongFromDatabase(index) {
    currentPlaylist = [musicDatabase[index]]; // 播放单曲，队列只包含这首歌
    currentIndex = 0;
    playSongFromQueue();
}

function updatePlayerInfo(song) {
    currentTitle.textContent = song.title;
    currentArtist.textContent = `${Array.isArray(song.singers) ? song.singers.join(', ') : '未知'} - ${song.original || '未知'}`;
}

function addToQueue(index) {
    const songToAdd = musicDatabase[index];
    if (!currentPlaylist.find(song => song.id === songToAdd.id)) {
        currentPlaylist.push(songToAdd);
        updateQueueDisplay();
        if(!isPlaying && audio.paused) {
           currentIndex = currentPlaylist.length - 1;
           playSongFromQueue();
        }
    }
}
// ... (所有播放器控制, 上传, GitHub API 函数保持不变)
// (此处省略了未改动的代码，请保留您文件中的这部分)
function updateQueueDisplay() {
    queueList.innerHTML = '';
    currentPlaylist.forEach((song, index) => {
        const queueItem = document.createElement('li');
        queueItem.classList.add('queue-item');
        if (index === currentIndex && isPlaying) {
            queueItem.classList.add('active');
        }
        queueItem.innerHTML = `
            <span>${song.title} - ${Array.isArray(song.singers) ? song.singers.join(', ') : ''}</span>
            <button onclick="removeFromQueue(${index})"><i class="fas fa-trash"></i></button>
        `;
        queueItem.dataset.index = index;
        queueList.appendChild(queueItem);
    });
}
queueList.addEventListener('click', e => {
    const item = e.target.closest('.queue-item');
    if(item && !e.target.closest('button')) {
        const index = parseInt(item.dataset.index, 10);
        if (currentIndex !== index || !isPlaying) {
            currentIndex = index;
            playSongFromQueue();
        }
    }
});

function playSongFromQueue() {
    if (currentIndex < 0 || currentIndex >= currentPlaylist.length) {
        isPlaying = false;
        playBtn.querySelector('i').classList.replace('fa-pause', 'fa-play');
        return;
    }
    const song = currentPlaylist[currentIndex];
    audio.src = song.url;
    audio.play();
    isPlaying = true;
    playBtn.querySelector('i').classList.replace('fa-play', 'fa-pause');
    updatePlayerInfo(song);
    updateQueueDisplay();
}

function removeFromQueue(index) {
    const wasPlaying = (index === currentIndex);
    currentPlaylist.splice(index, 1);
    if (index < currentIndex) {
        currentIndex--;
    } else if (wasPlaying) {
        if(currentPlaylist.length > 0) {
           if(currentIndex >= currentPlaylist.length) currentIndex = 0; // if last song was removed
           playSongFromQueue();
        } else {
            audio.pause();
            audio.src = '';
            isPlaying = false;
            playBtn.querySelector('i').classList.replace('fa-pause', 'fa-play');
        }
    }
    updateQueueDisplay();
}

playBtn.addEventListener('click', () => { /* ... */ });
function playNext() { /* ... */ }
function playPrev() { /* ... */ }
prevBtn.addEventListener('click', playPrev);
nextBtn.addEventListener('click', playNext);
shuffleBtn.addEventListener('click', () => { /* ... */ });
repeatBtn.addEventListener('click', () => { /* ... */ });
audio.addEventListener('ended', playNext);
audio.addEventListener('timeupdate', () => { /* ... */ });
progressBar.addEventListener('click', (e) => { /* ... */ });
volume.addEventListener('input', () => { /* ... */ });
function formatTime(seconds) { /* ... */ }
dropZone.addEventListener('dragover', (e) => { /* ... */ });
// ... [保留所有未改动的上传和GitHub API函数]
// --- 播放列表功能 ---

function getPlaylists() {
    return JSON.parse(localStorage.getItem('galgame_playlists')) || [];
}

function savePlaylists(playlists) {
    localStorage.setItem('galgame_playlists', JSON.stringify(playlists));
}

function displayPlaylists() {
    playlistsContainer.innerHTML = '';
    const playlists = getPlaylists();
    if (playlists.length === 0) {
        playlistsContainer.innerHTML = '<p style="text-align: center; color: var(--text-secondary); margin-top: 2rem;">还没有创建播放列表哦，快来创建一个吧！</p>';
        return;
    }
    playlists.forEach(playlist => {
        const playlistCard = document.createElement('div');
        playlistCard.classList.add('playlist-card');
        playlistCard.dataset.playlistId = playlist.id;
        playlistCard.innerHTML = `
            <div class="playlist-info">
                <h3>${playlist.name}</h3>
                <p>${playlist.songIds.length} 首歌曲</p>
            </div>
            <div class="playlist-controls">
                <button class="play-playlist-btn" title="播放此列表"><i class="fas fa-play-circle"></i></button>
                <button class="delete-playlist-btn" title="删除此列表"><i class="fas fa-trash-alt"></i></button>
            </div>
        `;
        playlistsContainer.appendChild(playlistCard);
    });
}

createPlaylistBtn.addEventListener('click', () => {
    const playlistName = prompt('请输入新播放列表的名称:');
    if (playlistName && playlistName.trim() !== '') {
        const playlists = getPlaylists();
        if (playlists.some(p => p.name === playlistName.trim())) {
            alert('该名称的播放列表已存在！');
            return;
        }
        const newPlaylist = {
            id: Date.now(),
            name: playlistName.trim(),
            songIds: [] // 存储歌曲ID而不是整个对象
        };
        playlists.push(newPlaylist);
        savePlaylists(playlists);
        displayPlaylists();
    }
});

playlistsContainer.addEventListener('click', (e) => {
    const card = e.target.closest('.playlist-card');
    if (!card) return;
    const playlistId = Number(card.dataset.playlistId);

    if (e.target.closest('.delete-playlist-btn')) {
        if (confirm('确定要删除这个播放列表吗？')) {
            let playlists = getPlaylists();
            playlists = playlists.filter(p => p.id !== playlistId);
            savePlaylists(playlists);
            displayPlaylists();
        }
    } else if (e.target.closest('.play-playlist-btn')) {
        playPlaylist(playlistId);
    } else {
        // 点击卡片本身，进入详情页
        showPlaylistDetail(playlistId);
    }
});

function playPlaylist(playlistId) {
    const playlists = getPlaylists();
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist || playlist.songIds.length === 0) {
        alert('这个播放列表是空的！');
        return;
    }
    // 根据songIds从musicDatabase中找到完整的歌曲对象
    currentPlaylist = playlist.songIds.map(id => musicDatabase.find(song => song.id === id)).filter(Boolean);
    if(currentPlaylist.length > 0) {
        currentIndex = 0;
        playSongFromQueue();
        queueSidebar.classList.add('active'); // 自动打开播放队列
    } else {
        alert('播放列表中的歌曲在库中找不到了。');
    }
}

function showPlaylistDetail(playlistId) {
    currentViewingPlaylistId = playlistId;
    const playlists = getPlaylists();
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist) return;

    playlistDetailName.textContent = playlist.name;
    playlistSongListContainer.innerHTML = '';
    
    if(playlist.songIds.length === 0) {
        playlistSongListContainer.innerHTML = '<p>这个列表还没有歌曲，快去音乐库添加吧！</p>';
    } else {
        const songsInPlaylist = playlist.songIds.map(id => musicDatabase.find(song => song.id === id)).filter(Boolean);
        songsInPlaylist.forEach((song, index) => {
            const item = document.createElement('div');
            item.classList.add('playlist-song-item');
            item.dataset.songId = song.id;
            item.innerHTML = `
                <button class="play-btn-small"><i class="fas fa-play"></i></button>
                <div class="song-details">
                    <span class="title">${song.title}</span>
                    <span class="artist">${Array.isArray(song.singers) ? song.singers.join(', ') : ''}</span>
                </div>
                <button class="remove-song-btn" title="从列表中移除"><i class="fas fa-times"></i></button>
            `;
            playlistSongListContainer.appendChild(item);
        });
    }

    switchToSection('playlist-detail');
}

playlistSongListContainer.addEventListener('click', e => {
    const item = e.target.closest('.playlist-song-item');
    if (!item) return;

    const songId = item.dataset.songId;

    if (e.target.closest('.remove-song-btn')) {
        let playlists = getPlaylists();
        const playlist = playlists.find(p => p.id === currentViewingPlaylistId);
        if(playlist) {
            playlist.songIds = playlist.songIds.filter(id => id !== songId);
            savePlaylists(playlists);
            showPlaylistDetail(currentViewingPlaylistId); // 刷新列表
        }
    } else if (e.target.closest('.play-btn-small')) {
        const songIndex = musicDatabase.findIndex(s => s.id === songId);
        if(songIndex > -1) playSongFromDatabase(songIndex);
    }
});

backToPlaylistsBtn.addEventListener('click', () => {
    switchToSection('playlists');
    currentViewingPlaylistId = null;
});

playAllInDetailBtn.addEventListener('click', () => {
    if(currentViewingPlaylistId) {
        playPlaylist(currentViewingPlaylistId);
    }
});

// --- 添加到播放列表模态框逻辑 ---

function openAddToPlaylistModal(songId) {
    songIdToAddToPlaylist = songId;
    const playlists = getPlaylists();
    modalPlaylistList.innerHTML = '';
    if (playlists.length === 0) {
        modalPlaylistList.innerHTML = '<li>还没有播放列表，请先创建一个。</li>';
    } else {
        playlists.forEach(playlist => {
            const li = document.createElement('li');
            li.textContent = playlist.name;
            li.dataset.playlistId = playlist.id;
            modalPlaylistList.appendChild(li);
        });
    }
    addToPlaylistModal.classList.add('active');
}

function closeAddToPlaylistModal() {
    addToPlaylistModal.classList.remove('active');
    songIdToAddToPlaylist = null;
}

closeModalBtn.addEventListener('click', closeAddToPlaylistModal);
addToPlaylistModal.addEventListener('click', (e) => { // 点击背景关闭
    if (e.target === addToPlaylistModal) {
        closeAddToPlaylistModal();
    }
});

modalPlaylistList.addEventListener('click', e => {
    if (e.target.tagName === 'LI' && e.target.dataset.playlistId) {
        const playlistId = Number(e.target.dataset.playlistId);
        const playlists = getPlaylists();
        const playlist = playlists.find(p => p.id === playlistId);

        if (playlist && !playlist.songIds.includes(songIdToAddToPlaylist)) {
            playlist.songIds.push(songIdToAddToPlaylist);
            savePlaylists(playlists);
            alert(`已将歌曲添加到 "${playlist.name}"`);
        } else if (playlist) {
            alert('这首歌已经在这个播放列表里了。');
        }
        closeAddToPlaylistModal();
    }
});


// --- UI 控制 & 初始化 ---
queueBtn.addEventListener('click', () => queueSidebar.classList.toggle('active'));
closeQueueBtn.addEventListener('click', () => queueSidebar.classList.remove('active'));

document.addEventListener('DOMContentLoaded', () => {
    loadMusicLibrary();
    displayPlaylists();
});

