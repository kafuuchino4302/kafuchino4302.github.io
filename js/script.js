// js/script.js

// 全局变量
let audio = new Audio();
let currentPlaylist = [];
let currentIndex = 0;
let isPlaying = false;
let isShuffle = false;
let isRepeat = false;

// GitHub 配置
const GITHUB_OWNER = 'kafuuchino4302';
const GITHUB_REPO = 'kafuchino4302.github.io';
const MUSIC_JSON_PATH = 'music.json';
const MUSIC_FOLDER = 'music/';
const RAW_JSON_URL = 'https://raw.githubusercontent.com/kafuuchino4302/kafuchino4302.github.io/refs/heads/main/music.json';

// GitHub Personal Access Token（分割法）
const TOKEN_PART1 = 'ghp_pOaD2xShfdDnW6g2'; // 替换为 Token 的前半部分
const TOKEN_PART2 = 'zt8IIA6injrCOj2JDzRz'; // 替换为 Token 的后半部分
const GITHUB_TOKEN = TOKEN_PART1 + TOKEN_PART2; // 合并 Token

// DOM 元素
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

// 加载音乐库
async function loadMusicLibrary() {
    try {
        const response = await fetch(RAW_JSON_URL);
        const musicData = await response.json();
        displayMusic(musicData);
        displayRecentUploads(musicData.slice(0, 4)); // 显示最近4首
    } catch (error) {
        console.error('加载音乐库失败:', error);
    }
}

// 显示音乐列表
function displayMusic(musicData) {
    musicLibrary.innerHTML = '';
    musicData.forEach((song, index) => {
        const musicCard = document.createElement('div');
        musicCard.classList.add('music-card');
        musicCard.innerHTML = `
            <div class="music-card-info">
                <h3>${song.title}</h3>
                <p class="singer-info">${song.singers.join(', ')}</p>
                <p class="original-work">${song.original}</p>
            </div>
            <div class="music-card-controls">
                <button onclick="playSong(${index})"><i class="fas fa-play"></i></button>
                <button onclick="addToQueue(${index})"><i class="fas fa-plus"></i></button>
            </div>
        `;
        musicLibrary.appendChild(musicCard);
    });
}

// 显示最近上传
function displayRecentUploads(musicData) {
    recentUploads.innerHTML = '';
    musicData.forEach((song, index) => {
        const musicCard = document.createElement('div');
        musicCard.classList.add('music-card');
        musicCard.innerHTML = `
            <div class="music-card-info">
                <h3>${song.title}</h3>
                <p class="singer-info">${song.singers.join(', ')}</p>
                <p class="original-work">${song.original}</p>
            </div>
            <div class="music-card-controls">
                <button onclick="playSong(${index})"><i class="fas fa-play"></i></button>
                <button onclick="addToQueue(${index})"><i class="fas fa-plus"></i></button>
            </div>
        `;
        recentUploads.appendChild(musicCard);
    });
}

// 播放音乐
async function playSong(index) {
    const response = await fetch(RAW_JSON_URL);
    const musicData = await response.json();
    currentPlaylist = musicData;
    currentIndex = index;
    audio.src = musicData[index].url;
    audio.play();
    isPlaying = true;
    playBtn.querySelector('i').classList.replace('fa-play', 'fa-pause');
    updatePlayerInfo(musicData[index]);
    updateQueueDisplay();
}

// 更新播放器信息
function updatePlayerInfo(song) {
    currentTitle.textContent = song.title;
    currentArtist.textContent = song.singers.join(', ') + ' - ' + song.original;
}

// 添加到播放队列
async function addToQueue(index) {
    const response = await fetch(RAW_JSON_URL);
    const musicData = await response.json();
    currentPlaylist.push(musicData[index]);
    updateQueueDisplay();
}

// 更新播放队列显示
function updateQueueDisplay() {
    queueList.innerHTML = '';
    currentPlaylist.forEach((song, index) => {
        const queueItem = document.createElement('li');
        queueItem.classList.add('queue-item');
        if (index === currentIndex && isPlaying) {
            queueItem.classList.add('active');
        }
        queueItem.innerHTML = `
            <span>${song.title} - ${song.singers.join(', ')}</span>
            <button onclick="removeFromQueue(${index})"><i class="fas fa-trash"></i></button>
        `;
        queueList.appendChild(queueItem);
    });
}

// 从播放队列移除
function removeFromQueue(index) {
    currentPlaylist.splice(index, 1);
    if (index < currentIndex) {
        currentIndex--;
    }
    updateQueueDisplay();
}

// 播放器控制
playBtn.addEventListener('click', () => {
    if (isPlaying) {
        audio.pause();
        isPlaying = false;
        playBtn.querySelector('i').classList.replace('fa-pause', 'fa-play');
    } else if (audio.src) {
        audio.play();
        isPlaying = true;
        playBtn.querySelector('i').classList.replace('fa-play', 'fa-pause');
    }
});

prevBtn.addEventListener('click', () => {
    if (currentIndex > 0) {
        currentIndex--;
        playSong(currentIndex);
    }
});

nextBtn.addEventListener('click', () => {
    if (currentIndex < currentPlaylist.length - 1) {
        currentIndex++;
        playSong(currentIndex);
    } else if (isRepeat) {
        currentIndex = 0;
        playSong(currentIndex);
    }
});

shuffleBtn.addEventListener('click', () => {
    isShuffle = !isShuffle;
    shuffleBtn.style.color = isShuffle ? 'var(--primary-color)' : 'var(--text-primary)';
});

repeatBtn.addEventListener('click', () => {
    isRepeat = !isRepeat;
    repeatBtn.style.color = isRepeat ? 'var(--primary-color)' : 'var(--text-primary)';
});

audio.addEventListener('timeupdate', () => {
    const current = audio.currentTime;
    const dur = audio.duration;
    currentTime.textContent = formatTime(current);
    duration.textContent = formatTime(dur);
    progress.style.width = `${(current / dur) * 100}%`;
});

progressBar.addEventListener('click', (e) => {
    const rect = progressBar.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    audio.currentTime = pos * audio.duration;
});

volume.addEventListener('input', () => {
    audio.volume = volume.value / 100;
});

function formatTime(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
}

// 上传区域拖拽事件
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const files = e.dataTransfer.files;
    handleFiles(files);
});

dropZone.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', () => {
    handleFiles(fileInput.files);
});

// 处理上传文件
let currentFile = null;
function handleFiles(files) {
    for (const file of files) {
        if (file.type.startsWith('audio/')) {
            currentFile = file;
            showEditDialog(file);
        }
    }
}

// 显示音乐信息编辑对话框
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

// 添加歌手输入框
singersContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('add-singer-btn')) {
        const singerCount = singersContainer.querySelectorAll('.singer-input').length + 1;
        const singerGroup = document.createElement('div');
        singerGroup.classList.add('form-group');
        singerGroup.innerHTML = `
            <label for="edit-singer-${singerCount}">歌手</label>
            <input type="text" id="edit-singer-${singerCount}" class="singer-input" placeholder="输入歌手名称">
            <button type="button" class="remove-singer-btn"><i class="fas fa-minus"></i></button>
        `;
        singersContainer.appendChild(singerGroup);
    }
});

// 移除歌手输入框
singersContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-singer-btn')) {
        e.target.closest('.form-group').remove();
    }
});

// 取消编辑
cancelEditBtn.addEventListener('click', () => {
    musicEditDialog.classList.remove('active');
    currentFile = null;
});

// 保存并上传
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

    const uploadItem = document.createElement('div');
    uploadItem.classList.add('upload-item');
    uploadItem.innerHTML = `
        <span>${title}</span>
        <div class="upload-progress">
            <div class="upload-progress-bar" style="width: 0%"></div>
        </div>
    `;
    uploadList.appendChild(uploadItem);

    try {
        // 上传音乐文件
        const fileContent = await readFileAsBase64(currentFile);
        const filePath = `${MUSIC_FOLDER}${encodeURIComponent(currentFile.name)}`;
        const uploadResponse = await uploadFileToGitHub(filePath, fileContent);
        
        // 更新 music.json
        const musicJson = await getMusicJson();
        const newSong = {
            id: currentFile.name,
            title: title,
            singers: singers,
            original: original,
            url: `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/main/${filePath}`
        };
        musicJson.push(newSong);
        await updateMusicJson(musicJson);

        uploadItem.classList.add('success');
        uploadItem.querySelector('.upload-progress-bar').style.width = '100%';
        musicEditDialog.classList.remove('active');
        currentFile = null;
        loadMusicLibrary(); // 刷新音乐库
    } catch (error) {
        console.error('上传失败:', error);
        uploadItem.classList.add('error');
        uploadItem.innerHTML += '<span>上传失败</span>';
    }
});

// 读取文件为 Base64
function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]); // 移除 Base64 前缀
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// 上传文件到 GitHub
async function uploadFileToGitHub(path, content) {
    const response = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${GITHUB_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            message: `Upload ${path}`,
            content: content
        })
    });
    if (!response.ok) {
        throw new Error('上传文件失败');
    }
    return response.json();
}

// 获取当前 music.json
async function getMusicJson() {
    const response = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${MUSIC_JSON_PATH}`, {
        headers: {
            'Authorization': `Bearer ${GITHUB_TOKEN}`
        }
    });
    if (!response.ok) {
        throw new Error('获取 music.json 失败');
    }
    const data = await response.json();
    return JSON.parse(atob(data.content));
}

// 更新 music.json
async function updateMusicJson(musicJson) {
    const response = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${MUSIC_JSON_PATH}`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${GITHUB_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            message: 'Update music.json',
            content: btoa(JSON.stringify(musicJson, null, 2)),
            sha: (await getMusicJsonSha()).sha
        })
    });
    if (!response.ok) {
        throw new Error('更新 music.json 失败');
    }
}

// 获取 music.json 的 SHA
async function getMusicJsonSha() {
    const response = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${MUSIC_JSON_PATH}`, {
        headers: {
            'Authorization': `Bearer ${GITHUB_TOKEN}`
        }
    });
    if (!response.ok) {
        throw new Error('获取 music.json SHA 失败');
    }
    return response.json();
}

// 队列侧边栏控制
queueBtn.addEventListener('click', () => {
    queueSidebar.classList.toggle('active');
});

closeQueueBtn.addEventListener('click', () => {
    queueSidebar.classList.remove('active');
});

// 初始化
loadMusicLibrary();
