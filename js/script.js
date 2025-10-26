// js/script.js

// --- 全局变量 ---
let audio = new Audio();
let musicDatabase = [];
let publicSonglists = []; // 新增: 存储公共歌单
let currentPlaylist = [];
let currentIndex = 0;
let isPlaying = false;
let isShuffle = false;
let isRepeat = false;
let songIdToAddToPlaylist = null;
let currentViewingPlaylistId = null;
let currentViewingSonglistId = null; // 新增: 当前查看的公共歌单ID
let filesToUpload = []; // 用于暂存待上传的文件信息

// --- GitHub 配置 ---
const GITHUB_OWNER = 'kafuuchino4302';
const GITHUB_REPO = 'kafuchino4302.github.io';
const MUSIC_JSON_PATH = 'music.json';
const SONGLISTS_JSON_PATH = 'songlists.json'; // 新增: 公共歌单文件路径
const MUSIC_FOLDER = 'music/';
const RAW_JSON_URL = 'music.json';
const RAW_SONGLISTS_URL = 'songlists.json'; // 新增: 公共歌单文件的Raw URL
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

// --- 新增: 公共歌单相关的 DOM 元素 ---
const createSonglistBtn = document.getElementById('create-songlist-btn');
const songlistsContainer = document.getElementById('songlists-container');
const songlistDetailSection = document.getElementById('songlist-detail');
const songlistDetailName = document.getElementById('songlist-detail-name');
const songlistSongListContainer = document.getElementById('songlist-song-list-container');
const backToSonglistsBtn = document.getElementById('back-to-songlists-btn');
const playAllInSonglistDetailBtn = document.getElementById('play-all-in-songlist-detail-btn');


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
    const searchTerm = searchInput.value.toLowerCase().trim();
    if (!searchTerm) {
        displayMusic(musicDatabase);
        return;
    }
    const filteredMusic = musicDatabase.filter(song => {
        const title = song.title.toLowerCase();
        const original = song.original ? song.original.toLowerCase() : '';
        const singers = Array.isArray(song.singers) ? song.singers.join(' ').toLowerCase() : '';
        return title.includes(searchTerm) || original.includes(searchTerm) || singers.includes(searchTerm);
    });
    if (filteredMusic.length > 0) {
        displayMusic(filteredMusic);
    } else {
        musicLibrary.innerHTML = '<p style="text-align: center; color: var(--text-secondary); margin-top: 2rem;">未找到匹配的音乐。</p>';
    }
}
searchInput.addEventListener('input', performSearch);
searchBtn.addEventListener('click', performSearch);
searchInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') performSearch();
});


// --- 核心音乐功能 ---
async function loadMusicLibrary() {
    try {
        const response = await fetch(`${RAW_JSON_URL}?t=${new Date().getTime()}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        let data = await response.json();
        musicDatabase = (Array.isArray(data) && Array.isArray(data[0]) ? data[0] : data).sort((a,b) => b.id - a.id);
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
    recentUploads.innerHTML = '';
     musicData.forEach((song) => {
        const songIndex = musicDatabase.findIndex(s => s.id === song.id);
        if (songIndex === -1) return;

        const musicCard = document.createElement('div');
        musicCard.classList.add('music-card');
        musicCard.dataset.songId = song.id; // 添加songId以便事件委托
        musicCard.innerHTML = `
            <div class="music-card-info">
                <h3>${song.title}</h3>
                <p class="singer-info">${Array.isArray(song.singers) ? song.singers.join(', ') : '未知歌手'}</p>
                <p class="original-work">${song.original || '未知'}</p>
            </div>
            <div class="music-card-controls">
                <button class="play-song-btn" title="播放"><i class="fas fa-play"></i></button>
                <button class="add-queue-btn" title="添加到队列"><i class="fas fa-plus"></i></button>
            </div>
        `;
        recentUploads.appendChild(musicCard);
    });
}

// 事件委托给父容器
recentUploads.addEventListener('click', e => {
    const card = e.target.closest('.music-card');
    if (!card) return;
    const songId = card.dataset.songId;
    const songIndex = musicDatabase.findIndex(s => s.id === songId);
    if (songIndex === -1) return;

    if (e.target.closest('.play-song-btn')) {
        playSongFromDatabase(songIndex);
    } else if (e.target.closest('.add-queue-btn')) {
        addToQueue(songIndex);
    }
});

// --- 播放器与队列逻辑 ---
function playSongFromDatabase(index) {
    currentPlaylist = [musicDatabase[index]]; // 播放单曲，队列只包含这首歌
    currentIndex = 0;
    playSongFromQueue();
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

function updateQueueDisplay() {
    queueList.innerHTML = '';
    currentPlaylist.forEach((song, index) => {
        const queueItem = document.createElement('li');
        queueItem.classList.add('queue-item');
        if (index === currentIndex) { // 标记当前播放歌曲，无论是否正在播放
            queueItem.classList.add('active');
        }
        queueItem.dataset.index = index;
        queueItem.innerHTML = `
            <span>${song.title} - ${Array.isArray(song.singers) ? song.singers.join(', ') : ''}</span>
            <button class="remove-from-queue-btn" data-index="${index}"><i class="fas fa-trash"></i></button>
        `;
        queueList.appendChild(queueItem);
    });
}

queueList.addEventListener('click', e => {
    if (e.target.closest('.remove-from-queue-btn')) {
        const index = parseInt(e.target.closest('.remove-from-queue-btn').dataset.index, 10);
        removeFromQueue(index);
    } else {
        const item = e.target.closest('.queue-item');
        if (item) {
            const index = parseInt(item.dataset.index, 10);
            if (currentIndex !== index || !isPlaying) {
                currentIndex = index;
                playSongFromQueue();
            }
        }
    }
});

function playSongFromQueue() {
    if (currentIndex < 0 || currentIndex >= currentPlaylist.length) {
        isPlaying = false;
        playBtn.querySelector('i').classList.replace('fa-pause', 'fa-play');
        updatePlayerInfo({title: '未播放', singers: [], original: '选择音乐开始播放'});
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
    const wasPlayingCurrent = (index === currentIndex);
    currentPlaylist.splice(index, 1);
    
    if (index < currentIndex) {
        currentIndex--;
    } else if (wasPlayingCurrent) {
        if (currentPlaylist.length > 0) {
           if (currentIndex >= currentPlaylist.length) currentIndex = 0;
           playSongFromQueue();
        } else {
            audio.pause();
            audio.src = '';
            isPlaying = false;
            playBtn.querySelector('i').classList.replace('fa-pause', 'fa-play');
            updatePlayerInfo({title: '未播放', singers: [], original: '选择音乐开始播放'});
        }
    }
    updateQueueDisplay();
}

function playNext() {
    if (isShuffle) {
        currentIndex = Math.floor(Math.random() * currentPlaylist.length);
    } else {
        currentIndex++;
    }
    if (currentIndex >= currentPlaylist.length) {
        if (isRepeat) {
            currentIndex = 0;
        } else {
            isPlaying = false;
            playBtn.querySelector('i').classList.replace('fa-pause', 'fa-play');
            return; // 列表播放完毕
        }
    }
    playSongFromQueue();
}

function playPrev() {
    currentIndex--;
    if (currentIndex < 0) {
        currentIndex = currentPlaylist.length - 1;
    }
    playSongFromQueue();
}

function updatePlayerInfo(song) {
    currentTitle.textContent = song.title;
    currentArtist.textContent = `${Array.isArray(song.singers) && song.singers.length > 0 ? song.singers.join(', ') : '未知歌手'} - ${song.original || '未知'}`;
}

// 播放器事件监听
playBtn.addEventListener('click', () => {
    if (isPlaying) {
        audio.pause();
        isPlaying = false;
        playBtn.querySelector('i').classList.replace('fa-pause', 'fa-play');
    } else {
        if (audio.src) {
            audio.play();
            isPlaying = true;
            playBtn.querySelector('i').classList.replace('fa-play', 'fa-pause');
        } else if (currentPlaylist.length > 0) {
            playSongFromQueue();
        }
    }
});
prevBtn.addEventListener('click', playPrev);
nextBtn.addEventListener('click', playNext);
shuffleBtn.addEventListener('click', () => { isShuffle = !isShuffle; shuffleBtn.classList.toggle('active', isShuffle); });
repeatBtn.addEventListener('click', () => { isRepeat = !isRepeat; repeatBtn.classList.toggle('active', isRepeat); });
audio.addEventListener('ended', playNext);
audio.addEventListener('timeupdate', () => {
    const { currentTime: ct, duration: d } = audio;
    if (d) {
        progress.style.width = `${(ct / d) * 100}%`;
        currentTime.textContent = formatTime(ct);
        duration.textContent = formatTime(d);
    }
});
progressBar.addEventListener('click', (e) => {
    const width = progressBar.clientWidth;
    const clickX = e.offsetX;
    audio.currentTime = (clickX / width) * audio.duration;
});
volume.addEventListener('input', () => { audio.volume = volume.value / 100; });
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
}

// --- 上传功能 ---
dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        filesToUpload = Array.from(files);
        showEditDialog();
    }
});
fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
        filesToUpload = Array.from(fileInput.files);
        showEditDialog();
    }
});

function showEditDialog() {
    if (filesToUpload.length > 0) {
        // 默认填充第一个文件的信息
        const firstFile = filesToUpload[0];
        const fileName = firstFile.name.replace(/\.[^/.]+$/, ""); // 移除扩展名
        editTitle.value = fileName;
        editOriginal.value = '';
        singersContainer.innerHTML = `
            <div class="form-group">
                <label for="edit-singer-1">歌手</label>
                <input type="text" id="edit-singer-1" class="singer-input" placeholder="输入歌手名称">
                <button type="button" class="add-singer-btn" id="add-singer-btn"><i class="fas fa-plus"></i></button>
            </div>
        `;
        musicEditDialog.classList.add('active');
    }
}
cancelEditBtn.addEventListener('click', () => musicEditDialog.classList.remove('active'));
saveEditBtn.addEventListener('click', async () => {
    const title = editTitle.value.trim();
    const original = editOriginal.value.trim();
    const singers = Array.from(document.querySelectorAll('.singer-input')).map(input => input.value.trim()).filter(Boolean);

    if (!title || singers.length === 0 || !original) {
        alert('请填写所有必填信息 (歌曲名称, 至少一位歌手, 原作信息)。');
        return;
    }

    const musicInfo = { title, original, singers };
    musicEditDialog.classList.remove('active');
    
    // 目前只支持单文件上传，所以只处理第一个文件
    await uploadFile(filesToUpload[0], musicInfo);
});


// --- GitHub API 交互 ---
async function uploadFile(file, musicInfo) {
    const fileName = `${Date.now()}_${file.name}`;
    const filePath = `${MUSIC_FOLDER}${fileName}`;
    const reader = new FileReader();

    reader.onload = async (e) => {
        const content = e.target.result.split(',')[1];
        const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}`;

        try {
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: `上传音乐: ${file.name}`,
                    content: content
                })
            });
            if (!response.ok) throw new Error('上传文件到 GitHub 失败');
            
            const data = await response.json();
            const newSong = {
                id: Date.now().toString(), // 使用时间戳作为ID
                title: musicInfo.title,
                singers: musicInfo.singers,
                original: musicInfo.original,
                url: data.content.download_url
            };

            await updateMusicJson(newSong);
        } catch (error) {
            console.error(error);
        }
    };
    reader.readAsDataURL(file);
}

async function updateMusicJson(newSong) {
    const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${MUSIC_JSON_PATH}`;
    try {
        const response = await fetch(url, { headers: { 'Authorization': `token ${GITHUB_TOKEN}` } });
        const data = await response.json();
        const content = atob(data.content);
        let musicList = JSON.parse(content);

        // 确保 musicList 是一个数组
        if (!Array.isArray(musicList)) musicList = [];

        musicList.unshift(newSong); // 添加到最前面

        const updatedContent = btoa(unescape(encodeURIComponent(JSON.stringify(musicList, null, 2))));
        
        await fetch(url, {
            method: 'PUT',
            headers: { 'Authorization': `token ${GITHUB_TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: `更新 music.json 添加: ${newSong.title}`,
                content: updatedContent,
                sha: data.sha
            })
        });

        alert('上传成功！');
        loadMusicLibrary(); // 重新加载音乐库
    } catch (error) {
        console.error('更新 music.json 失败:', error);
    }
}

async function updateGitHubFile(path, content, commitMessage) {
    const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`;
    try {
        const response = await fetch(url, { headers: { 'Authorization': `token ${GITHUB_TOKEN}` } });
        let sha;
        if (response.ok) {
            const data = await response.json();
            sha = data.sha;
        } else if (response.status !== 404) {
            throw new Error(`获取文件 SHA 失败: ${response.statusText}`);
        }
        const contentEncoded = btoa(unescape(encodeURIComponent(JSON.stringify(content, null, 2))));
        const updateResponse = await fetch(url, {
            method: 'PUT',
            headers: { 'Authorization': `token ${GITHUB_TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: commitMessage,
                content: contentEncoded,
                sha: sha
            })
        });
        if (!updateResponse.ok) {
            const errorData = await updateResponse.json();
            throw new Error(`更新 GitHub 文件失败: ${errorData.message}`);
        }
        console.log(`文件 ${path} 更新成功!`);
        return await updateResponse.json();
    } catch (error) {
        console.error('GitHub API 操作出错:', error);
        alert(`操作失败: ${error.message}`);
        return null;
    }
}

// --- 个人播放列表功能 (LocalStorage) ---
function getPlaylists() { return JSON.parse(localStorage.getItem('galgame_playlists')) || []; }
function savePlaylists(playlists) { localStorage.setItem('galgame_playlists', JSON.stringify(playlists)); }

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
            alert('该名称的播放列表已存在！'); return;
        }
        const newPlaylist = { id: Date.now(), name: playlistName.trim(), songIds: [] };
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
        showPlaylistDetail(playlistId);
    }
});

function playPlaylist(playlistId) {
    const playlists = getPlaylists();
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist || playlist.songIds.length === 0) {
        alert('这个播放列表是空的！'); return;
    }
    currentPlaylist = playlist.songIds.map(id => musicDatabase.find(song => song.id === id)).filter(Boolean);
    if(currentPlaylist.length > 0) {
        currentIndex = 0;
        playSongFromQueue();
        queueSidebar.classList.add('active');
    } else {
        alert('播放列表中的歌曲在库中找不到了。');
    }
}

function showPlaylistDetail(playlistId) {
    currentViewingPlaylistId = playlistId;
    const playlist = getPlaylists().find(p => p.id === playlistId);
    if (!playlist) return;

    playlistDetailName.textContent = playlist.name;
    playlistSongListContainer.innerHTML = '';
    
    if(playlist.songIds.length === 0) {
        playlistSongListContainer.innerHTML = '<p>这个列表还没有歌曲，快去音乐库添加吧！</p>';
    } else {
        const songsInPlaylist = playlist.songIds.map(id => musicDatabase.find(song => song.id === id)).filter(Boolean);
        songsInPlaylist.forEach((song) => {
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
            showPlaylistDetail(currentViewingPlaylistId);
        }
    } else if (e.target.closest('.play-btn-small')) {
        const songIndex = musicDatabase.findIndex(s => s.id === songId);
        if(songIndex > -1) playSongFromDatabase(songIndex);
    }
});

backToPlaylistsBtn.addEventListener('click', () => { switchToSection('playlists'); currentViewingPlaylistId = null; });
playAllInDetailBtn.addEventListener('click', () => { if(currentViewingPlaylistId) playPlaylist(currentViewingPlaylistId); });


// --- 公共歌单功能 (GitHub API) ---
async function loadPublicSonglists() {
    try {
        const response = await fetch(`${RAW_SONGLISTS_URL}?t=${new Date().getTime()}`);
        if (response.status === 404) {
            publicSonglists = [];
            displayPublicSonglists();
            return;
        }
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        publicSonglists = await response.json();
        displayPublicSonglists();
    } catch (error) {
        console.error('加载公共歌单失败:', error);
        songlistsContainer.innerHTML = '<p>加载公共歌单失败。</p>';
    }
}

function displayPublicSonglists() {
    songlistsContainer.innerHTML = '';
    if (publicSonglists.length === 0) {
        songlistsContainer.innerHTML = '<p style="text-align: center; color: var(--text-secondary); margin-top: 2rem;">还没有公共歌单，快来创建一个吧！</p>';
        return;
    }
    publicSonglists.forEach(songlist => {
        const songlistCard = document.createElement('div');
        songlistCard.classList.add('playlist-card');
        songlistCard.dataset.songlistId = songlist.id;
        songlistCard.innerHTML = `
            <div class="playlist-info">
                <h3>${songlist.name}</h3>
                <p>${songlist.songIds.length} 首歌曲</p>
            </div>
            <div class="playlist-controls">
                <button class="play-playlist-btn" title="播放此歌单"><i class="fas fa-play-circle"></i></button>
            </div>
        `;
        songlistsContainer.appendChild(songlistCard);
    });
}

createSonglistBtn.addEventListener('click', async () => {
    const songlistName = prompt('请输入新公共歌单的名称:');
    if (songlistName && songlistName.trim() !== '') {
        if (publicSonglists.some(p => p.name === songlistName.trim())) {
            alert('该名称的公共歌单已存在！'); return;
        }
        const newSonglist = { id: Date.now(), name: songlistName.trim(), songIds: [] };
        const updatedSonglists = [...publicSonglists, newSonglist];
        
        const result = await updateGitHubFile(SONGLISTS_JSON_PATH, updatedSonglists, `创建歌单: ${newSonglist.name}`);
        if (result) {
            publicSonglists = updatedSonglists;
            displayPublicSonglists();
            alert('公共歌单创建成功！');
        }
    }
});

songlistsContainer.addEventListener('click', (e) => {
    const card = e.target.closest('.playlist-card');
    if (!card) return;
    const songlistId = Number(card.dataset.songlistId);

    if (e.target.closest('.play-playlist-btn')) {
        playSonglist(songlistId);
    } else {
        showSonglistDetail(songlistId);
    }
});

function playSonglist(songlistId) {
    const songlist = publicSonglists.find(p => p.id === songlistId);
    if (!songlist || songlist.songIds.length === 0) {
        alert('这个歌单是空的！'); return;
    }
    currentPlaylist = songlist.songIds.map(id => musicDatabase.find(song => song.id === id)).filter(Boolean);
    if(currentPlaylist.length > 0) {
        currentIndex = 0;
        playSongFromQueue();
        queueSidebar.classList.add('active');
    } else {
        alert('歌单中的歌曲在库中找不到了。');
    }
}

function showSonglistDetail(songlistId) {
    currentViewingSonglistId = songlistId;
    const songlist = publicSonglists.find(p => p.id === songlistId);
    if (!songlist) return;

    songlistDetailName.textContent = songlist.name;
    songlistSongListContainer.innerHTML = '';
    
    if(songlist.songIds.length === 0) {
        songlistSongListContainer.innerHTML = '<p>这个歌单还没有歌曲，快去音乐库添加吧！</p>';
    } else {
        const songsInSonglist = songlist.songIds.map(id => musicDatabase.find(song => song.id === id)).filter(Boolean);
        songsInSonglist.forEach((song) => {
            const item = document.createElement('div');
            item.classList.add('playlist-song-item');
            item.dataset.songId = song.id;
            item.innerHTML = `
                <button class="play-btn-small"><i class="fas fa-play"></i></button>
                <div class="song-details">
                    <span class="title">${song.title}</span>
                    <span class="artist">${Array.isArray(song.singers) ? song.singers.join(', ') : ''}</span>
                </div>
                <button class="remove-song-btn" title="从歌单中移除"><i class="fas fa-times"></i></button>
            `;
            songlistSongListContainer.appendChild(item);
        });
    }
    switchToSection('songlist-detail');
}

songlistSongListContainer.addEventListener('click', async e => {
    const item = e.target.closest('.playlist-song-item');
    if (!item) return;
    const songId = item.dataset.songId;

    if (e.target.closest('.remove-song-btn')) {
        const songlist = publicSonglists.find(p => p.id === currentViewingSonglistId);
        if(songlist) {
            const updatedSongIds = songlist.songIds.filter(id => id !== songId);
            const updatedSonglists = publicSonglists.map(sl => sl.id === currentViewingSonglistId ? { ...sl, songIds: updatedSongIds } : sl);
            
            const song = musicDatabase.find(s => s.id === songId);
            const result = await updateGitHubFile(SONGLISTS_JSON_PATH, updatedSonglists, `从歌单移除歌曲: ${song.title}`);
            if (result) {
                publicSonglists = updatedSonglists;
                showSonglistDetail(currentViewingSonglistId);
            }
        }
    } else if (e.target.closest('.play-btn-small')) {
        const songIndex = musicDatabase.findIndex(s => s.id === songId);
        if(songIndex > -1) playSongFromDatabase(songIndex);
    }
});

backToSonglistsBtn.addEventListener('click', () => switchToSection('songlists'));
playAllInSonglistDetailBtn.addEventListener('click', () => { if(currentViewingSonglistId) playSonglist(currentViewingSonglistId); });


// --- "添加到..." 模态框逻辑 (合并版) ---
function openAddToPlaylistModal(songId) {
    songIdToAddToPlaylist = songId;
    const playlists = getPlaylists();
    modalPlaylistList.innerHTML = '';
    
    // 个人播放列表
    modalPlaylistList.innerHTML += '<li class="modal-list-header">我的播放列表</li>';
    if (playlists.length === 0) {
        modalPlaylistList.innerHTML += '<li>还没有个人播放列表。</li>';
    } else {
        playlists.forEach(playlist => {
            modalPlaylistList.innerHTML += `<li data-playlist-id="${playlist.id}" data-type="private">${playlist.name}</li>`;
        });
    }

    // 公共歌单
    modalPlaylistList.innerHTML += '<li class="modal-list-header">公共歌单</li>';
    if (publicSonglists.length === 0) {
        modalPlaylistList.innerHTML += '<li>还没有公共歌单。</li>';
    } else {
        publicSonglists.forEach(songlist => {
            modalPlaylistList.innerHTML += `<li data-playlist-id="${songlist.id}" data-type="public">${songlist.name}</li>`;
        });
    }
    addToPlaylistModal.classList.add('active');
}

function closeAddToPlaylistModal() {
    addToPlaylistModal.classList.remove('active');
    songIdToAddToPlaylist = null;
}

closeModalBtn.addEventListener('click', closeAddToPlaylistModal);
addToPlaylistModal.addEventListener('click', (e) => { if (e.target === addToPlaylistModal) closeAddToPlaylistModal(); });

modalPlaylistList.addEventListener('click', async e => {
    if (e.target.tagName !== 'LI' || !e.target.dataset.playlistId) return;

    const listId = Number(e.target.dataset.playlistId);
    const type = e.target.dataset.type;

    if (type === 'private') {
        const playlists = getPlaylists();
        const playlist = playlists.find(p => p.id === listId);
        if (playlist && !playlist.songIds.includes(songIdToAddToPlaylist)) {
            playlist.songIds.push(songIdToAddToPlaylist);
            savePlaylists(playlists);
            alert(`已将歌曲添加到播放列表 "${playlist.name}"`);
        } else if (playlist) {
            alert('这首歌已经在这个播放列表里了。');
        }
    } else if (type === 'public') {
        const songlist = publicSonglists.find(p => p.id === listId);
        if (songlist && !songlist.songIds.includes(songIdToAddToPlaylist)) {
            const updatedSonglists = publicSonglists.map(sl => 
                sl.id === listId ? { ...sl, songIds: [...sl.songIds, songIdToAddToPlaylist] } : sl
            );
            const song = musicDatabase.find(s => s.id === songIdToAddToPlaylist);
            const result = await updateGitHubFile(SONGLISTS_JSON_PATH, updatedSonglists, `向歌单添加歌曲: ${song.title}`);
            if(result) {
                publicSonglists = updatedSonglists;
                alert(`已将歌曲添加到公共歌单 "${songlist.name}"`);
            }
        } else if (songlist) {
            alert('这首歌已经在这个公共歌单里了。');
        }
    }
    closeAddToPlaylistModal();
});


// --- UI 控制 & 初始化 ---
queueBtn.addEventListener('click', () => queueSidebar.classList.toggle('active'));
closeQueueBtn.addEventListener('click', () => queueSidebar.classList.remove('active'));

document.addEventListener('DOMContentLoaded', () => {
    loadMusicLibrary();
    displayPlaylists();
    loadPublicSonglists();
});
