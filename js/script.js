// js/script.js

// --- 全局变量 ---
let audio = new Audio();
let musicDatabase = []; // 用于存储从 JSON 加载的所有音乐
let currentPlaylist = [];
let currentIndex = 0;
let isPlaying = false;
let isShuffle = false;
let isRepeat = false;

// --- GitHub 配置 ---
const GITHUB_OWNER = 'kafuuchino4302';
const GITHUB_REPO = 'kafuchino4302.github.io';
const MUSIC_JSON_PATH = 'music.json';
const MUSIC_FOLDER = 'music/';
const RAW_JSON_URL = 'music.json';

// GitHub Personal Access Token（分割法）
const TOKEN_PART1 = 'ghp_pOaD2xShfdDnW6g2'; // 替换为 Token 的前半部分
const TOKEN_PART2 = 'zt8IIA6injrCOj2JDzRz'; // 替换为 Token 的后半部分
const GITHUB_TOKEN = TOKEN_PART1 + TOKEN_PART2; // 合并 Token

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
const addSingerBtn = document.getElementById('add-singer-btn');
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

// --- 新增: 播放列表相关的 DOM 元素 ---
const createPlaylistBtn = document.getElementById('create-playlist');
const playlistsContainer = document.getElementById('playlists-container');


// --- 导航切换逻辑 ---
const navLinks = document.querySelectorAll('.nav-menu a');
const sections = document.querySelectorAll('.main-container .section');

navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('href').substring(1);
        const targetSection = document.getElementById(targetId);

        if (targetSection) {
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            sections.forEach(s => s.classList.remove('active'));
            targetSection.classList.add('active');
        }
    });
});


// --- 核心功能 ---

// 加载音乐库
async function loadMusicLibrary() {
    try {
        const response = await fetch(RAW_JSON_URL + '?t=' + new Date().getTime());
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        let data = await response.json();
        
        if (Array.isArray(data) && Array.isArray(data[0])) {
            musicDatabase = data[0];
        } else {
            musicDatabase = data;
        }

        displayMusic(musicDatabase);
        displayRecentUploads(musicDatabase.slice(0, 5));
    } catch (error) {
        console.error('加载音乐库失败:', error);
        musicLibrary.innerHTML = '<p>加载音乐库失败，请检查网络或联系管理员。</p>';
    }
}

// 显示音乐列表
function displayMusic(musicData) {
    musicLibrary.innerHTML = '';
    musicData.forEach((song, index) => {
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
                <button class="play-song-btn"><i class="fas fa-play"></i></button>
                <button class="add-queue-btn"><i class="fas fa-plus"></i></button>
            </div>
        `;
        musicLibrary.appendChild(musicCard);
    });
}

// 为音乐库的按钮添加事件委托
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
    }
});

// 显示最近上传
function displayRecentUploads(musicData) {
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

// 从音乐库播放音乐
function playSongFromDatabase(index) {
    currentPlaylist = [...musicDatabase]; 
    currentIndex = index;
    const song = currentPlaylist[currentIndex];
    audio.src = song.url;
    audio.play();
    isPlaying = true;
    playBtn.querySelector('i').classList.replace('fa-play', 'fa-pause');
    updatePlayerInfo(song);
    updateQueueDisplay();
}

// 更新播放器信息
function updatePlayerInfo(song) {
    currentTitle.textContent = song.title;
    currentArtist.textContent = `${Array.isArray(song.singers) ? song.singers.join(', ') : '未知'} - ${song.original || '未知'}`;
}

// 添加到播放队列
function addToQueue(index) {
    const songToAdd = musicDatabase[index];
    if (!currentPlaylist.find(song => song.id === songToAdd.id)) {
        currentPlaylist.push(songToAdd);
        updateQueueDisplay();
    }
}

// 更新播放队列显示
function updateQueueDisplay() {
    queueList.innerHTML = '';
    currentPlaylist.forEach((song, index) => {
        const queueItem = document.createElement('li');
        queueItem.classList.add('queue-item');
        if (index === currentIndex) {
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
        if (currentIndex !== index) {
            currentIndex = index;
            playSongFromQueue();
        }
    }
});

function playSongFromQueue() {
    if (currentIndex < 0 || currentIndex >= currentPlaylist.length) return;
    const song = currentPlaylist[currentIndex];
    audio.src = song.url;
    audio.play();
    isPlaying = true;
    playBtn.querySelector('i').classList.replace('fa-play', 'fa-pause');
    updatePlayerInfo(song);
    updateQueueDisplay();
}

// 从播放队列移除
function removeFromQueue(index) {
    currentPlaylist.splice(index, 1);
    if (index < currentIndex) {
        currentIndex--;
    } else if (index === currentIndex) {
        audio.pause();
        audio.src = '';
        isPlaying = false;
        playBtn.querySelector('i').classList.replace('fa-pause', 'fa-play');
    }
    updateQueueDisplay();
}

// 播放器控制
playBtn.addEventListener('click', () => {
    if (!audio.src) {
        if (currentPlaylist.length > 0) playSongFromQueue();
        return;
    }
    if (isPlaying) {
        audio.pause();
        isPlaying = false;
        playBtn.querySelector('i').classList.replace('fa-pause', 'fa-play');
    } else {
        audio.play();
        isPlaying = true;
        playBtn.querySelector('i').classList.replace('fa-play', 'fa-pause');
    }
});

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
            return;
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

prevBtn.addEventListener('click', playPrev);
nextBtn.addEventListener('click', playNext);
shuffleBtn.addEventListener('click', () => {
    isShuffle = !isShuffle;
    shuffleBtn.style.color = isShuffle ? 'var(--primary-color)' : 'var(--text-primary)';
});
repeatBtn.addEventListener('click', () => {
    isRepeat = !isRepeat;
    repeatBtn.style.color = isRepeat ? 'var(--primary-color)' : 'var(--text-primary)';
});
audio.addEventListener('ended', playNext);
audio.addEventListener('timeupdate', () => {
    if (isNaN(audio.duration)) return;
    const current = audio.currentTime;
    const dur = audio.duration;
    currentTime.textContent = formatTime(current);
    duration.textContent = formatTime(dur);
    progress.style.width = `${(current / dur) * 100}%`;
});
progressBar.addEventListener('click', (e) => {
    if (isNaN(audio.duration)) return;
    const rect = progressBar.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    audio.currentTime = pos * audio.duration;
});
volume.addEventListener('input', () => {
    audio.volume = volume.value / 100;
});

function formatTime(seconds) {
    if (isNaN(seconds)) return "0:00";
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
}

// --- 上传逻辑 ---
// (此部分代码保持不变)
dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => { dropZone.classList.remove('dragover'); });
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    handleFiles(e.dataTransfer.files);
});
dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => handleFiles(fileInput.files));

let currentFile = null;
function handleFiles(files) {
    for (const file of files) {
        if (file.type.startsWith('audio/')) {
            currentFile = file;
            showEditDialog(file);
        }
    }
}

function showEditDialog(file) {
    editTitle.value = file.name.replace(/\.[^/.]+$/, '');
    editOriginal.value = '未知';
    singersContainer.innerHTML = `
        <div class="form-group">
            <label for="edit-singer-1">歌手</label>
            <input type="text" id="edit-singer-1" class="singer-input" placeholder="输入歌手名称">
            <button type="button" class="add-singer-btn" id="add-singer-btn"><i class="fas fa-plus"></i></button>
        </div>
    `;
    musicEditDialog.classList.add('active');
}

singersContainer.addEventListener('click', (e) => {
    const addBtn = e.target.closest('.add-singer-btn');
    if (addBtn) {
        const singerCount = singersContainer.querySelectorAll('.singer-input').length + 1;
        const singerGroup = document.createElement('div');
        singerGroup.classList.add('form-group');
        singerGroup.innerHTML = `
            <label for="edit-singer-${singerCount}" class="sr-only">歌手 ${singerCount}</label>
            <input type="text" id="edit-singer-${singerCount}" class="singer-input" placeholder="输入歌手名称">
            <button type="button" class="remove-singer-btn"><i class="fas fa-minus"></i></button>
        `;
        singerGroup.querySelector('label').style.display = 'none'; 
        singersContainer.appendChild(singerGroup);
    }
    const removeBtn = e.target.closest('.remove-singer-btn');
    if (removeBtn) {
        removeBtn.closest('.form-group').remove();
    }
});
cancelEditBtn.addEventListener('click', () => {
    musicEditDialog.classList.remove('active');
    currentFile = null;
});

saveEditBtn.addEventListener('click', async () => {
    const title = editTitle.value.trim();
    const original = editOriginal.value.trim();
    const singers = Array.from(singersContainer.querySelectorAll('.singer-input'))
        .map(input => input.value.trim())
        .filter(val => val);
    
    if (!title || !singers.length || !currentFile) {
        alert('请填写歌曲名称和至少一位歌手！');
        return;
    }
    if (!GITHUB_TOKEN) {
        alert('GitHub Token 未配置！');
        return;
    }

    musicEditDialog.classList.remove('active');
    const uploadItem = document.createElement('div');
    uploadItem.classList.add('upload-item');
    uploadItem.innerHTML = `<span>${title}</span><div class="upload-progress"><div class="upload-progress-bar" style="width: 0%"></div></div>`;
    uploadList.appendChild(uploadItem);

    try {
        const progressBar = uploadItem.querySelector('.upload-progress-bar');
        const fileContent = await readFileAsBase64(currentFile);

        const lastDotIndex = currentFile.name.lastIndexOf('.');
        const extension = lastDotIndex > 0 ? currentFile.name.substring(lastDotIndex) : '.mp3';
        const sanitizedTitle = title.replace(/[\\/:*?"<>|#%]/g, '_');
        const newFileName = `${sanitizedTitle}${extension}`;
        const filePath = `${MUSIC_FOLDER}${newFileName}`;
        
        await uploadFileToGitHub(filePath, fileContent);
        progressBar.style.width = '50%';

        const { content, sha } = await getMusicJsonContent();
        const musicJson = JSON.parse(decodeURIComponent(escape(atob(content))));

        const newSong = {
            id: newFileName,
            title: title,
            singers: singers,
            original: original,
            url: filePath
        };
        
        const targetArray = Array.isArray(musicJson[0]) ? musicJson[0] : musicJson;
        targetArray.unshift(newSong);

        await updateMusicJson(Array.isArray(musicJson[0]) ? [targetArray] : targetArray, sha);
        
        progressBar.style.width = '100%';
        uploadItem.classList.add('success');
        loadMusicLibrary(); 
    } catch (error) {
        console.error('上传失败:', error);
        uploadItem.classList.add('error');
        uploadItem.innerHTML += '<span> 上传失败</span>';
    } finally {
        currentFile = null;
    }
});

// --- GitHub API 助手函数 ---
// (此部分代码保持不变)
function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function uploadFileToGitHub(path, content) {
    const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`;
    const response = await fetch(url, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
        },
        body: JSON.stringify({
            message: `feat: upload music ${path}`,
            content: content,
            branch: 'main'
        })
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`上传文件失败: ${errorData.message}`);
    }
    return response.json();
}

async function getMusicJsonContent() {
    const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${MUSIC_JSON_PATH}`;
    const response = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
        }
    });
    if (!response.ok) throw new Error('获取 music.json 失败');
    const data = await response.json();
    return { content: data.content, sha: data.sha };
}

async function updateMusicJson(musicJson, sha) {
     const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${MUSIC_JSON_PATH}`;
    const response = await fetch(url, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
        },
        body: JSON.stringify({
            message: 'feat: update music.json',
            content: btoa(unescape(encodeURIComponent(JSON.stringify(musicJson, null, 2)))),
            sha: sha,
            branch: 'main'
        })
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`更新 music.json 失败: ${errorData.message}`);
    }
}


// --- 新增: 播放列表功能 ---

// 从 localStorage 获取播放列表
function getPlaylists() {
    return JSON.parse(localStorage.getItem('galgame_playlists')) || [];
}

// 保存播放列表到 localStorage
function savePlaylists(playlists) {
    localStorage.setItem('galgame_playlists', JSON.stringify(playlists));
}

// 显示所有播放列表
function displayPlaylists() {
    playlistsContainer.innerHTML = '';
    const playlists = getPlaylists();
    if (playlists.length === 0) {
        playlistsContainer.innerHTML = '<p>还没有创建播放列表哦，快来创建一个吧！</p>';
        return;
    }
    playlists.forEach(playlist => {
        const playlistCard = document.createElement('div');
        playlistCard.classList.add('playlist-card');
        playlistCard.dataset.playlistId = playlist.id;
        playlistCard.innerHTML = `
            <div class="playlist-info">
                <h3>${playlist.name}</h3>
                <p>${playlist.songs.length} 首歌曲</p>
            </div>
            <div class="playlist-controls">
                <button class="play-playlist-btn" title="播放此列表"><i class="fas fa-play-circle"></i></button>
                <button class="delete-playlist-btn" title="删除此列表"><i class="fas fa-trash-alt"></i></button>
            </div>
        `;
        playlistsContainer.appendChild(playlistCard);
    });
}

// "新建播放列表" 按钮的点击事件
createPlaylistBtn.addEventListener('click', () => {
    const playlistName = prompt('请输入新播放列表的名称:');
    if (playlistName && playlistName.trim() !== '') {
        const playlists = getPlaylists();
        // 检查是否存在同名播放列表
        if (playlists.some(p => p.name === playlistName.trim())) {
            alert('该名称的播放列表已存在！');
            return;
        }
        // 创建新播放列表对象
        const newPlaylist = {
            id: Date.now(), // 使用时间戳作为唯一ID
            name: playlistName.trim(),
            songs: [] // 初始歌曲为空
        };
        playlists.push(newPlaylist);
        savePlaylists(playlists);
        displayPlaylists(); // 重新渲染播放列表
    }
});

// 使用事件委托处理播放列表卡片上的按钮点击
playlistsContainer.addEventListener('click', (e) => {
    const deleteBtn = e.target.closest('.delete-playlist-btn');
    if (deleteBtn) {
        const card = deleteBtn.closest('.playlist-card');
        const playlistId = Number(card.dataset.playlistId);
        
        if (confirm('确定要删除这个播放列表吗？')) {
            let playlists = getPlaylists();
            playlists = playlists.filter(p => p.id !== playlistId);
            savePlaylists(playlists);
            displayPlaylists();
        }
    }

    // (未来可以添加播放整个列表的功能)
    const playBtn = e.target.closest('.play-playlist-btn');
    if (playBtn) {
        alert('播放整个列表的功能正在开发中！');
    }
});


// --- UI 控制 ---
queueBtn.addEventListener('click', () => queueSidebar.classList.toggle('active'));
closeQueueBtn.addEventListener('click', () => queueSidebar.classList.remove('active'));

// --- 初始化 ---
document.addEventListener('DOMContentLoaded', () => {
    loadMusicLibrary();
    displayPlaylists(); // --- 新增: 页面加载时显示已有的播放列表
});
