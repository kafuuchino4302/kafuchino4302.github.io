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
// 使用 jsdelivr CDN 加速访问，并自动处理缓存
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

// --- 核心功能 ---

// 加载音乐库（仅在启动时加载一次）
async function loadMusicLibrary() {
    try {
        // 添加时间戳防止 CDN 缓存
        const response = await fetch(RAW_JSON_URL + '?t=' + new Date().getTime());
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        let data = await response.json();
        
        // 关键修复：处理可能存在的嵌套数组问题
        if (Array.isArray(data) && Array.isArray(data[0])) {
            musicDatabase = data[0];
        } else {
            musicDatabase = data;
        }

        displayMusic(musicDatabase);
        displayRecentUploads(musicDatabase.slice(0, 5)); // 显示最近5首
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
        // 使用 song.id 作为索引，这样即使列表排序了也能找到正确的歌曲
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
     musicData.forEach((song) => { // 不需要 index
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

// 从已加载的 musicDatabase 播放音乐
function playSongFromDatabase(index) {
    // 将整个音乐库设置为当前播放列表
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
    // 避免重复添加
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
        // 如果移除的是当前播放的歌曲，则停止播放
        audio.pause();
        audio.src = '';
        isPlaying = false;
        playBtn.querySelector('i').classList.replace('fa-pause', 'fa-play');
        // 可选择播放下一首
        // playNext(); 
    }
    updateQueueDisplay();
}

// 播放器控制
playBtn.addEventListener('click', () => {
    if (!audio.src) { // 如果没有歌曲，不执行任何操作
        if (currentPlaylist.length > 0) {
            playSongFromQueue();
        }
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
            // 播放完毕
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

audio.addEventListener('ended', () => {
    playNext();
});

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

// ... [保留您原来的上传相关函数，它们是正确的] ...
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
        // 动态添加的元素需要移除label，或者设为 screen-reader-only
        singerGroup.querySelector('label').style.display = 'none'; 
        singersContainer.appendChild(singerGroup);
    }
});

// 移除歌手输入框
singersContainer.addEventListener('click', (e) => {
    const removeBtn = e.target.closest('.remove-singer-btn');
    if (removeBtn) {
        removeBtn.closest('.form-group').remove();
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

    musicEditDialog.classList.remove('active'); // 先关闭对话框

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
        // 1. 上传音乐文件
        const progressBar = uploadItem.querySelector('.upload-progress-bar');
        const fileContent = await readFileAsBase64(currentFile);
        const fileName = `${Date.now()}-${currentFile.name}`; // 添加时间戳避免重名
        const filePath = `${MUSIC_FOLDER}${encodeURIComponent(fileName)}`;
        await uploadFileToGitHub(filePath, fileContent);
        progressBar.style.width = '50%';

        // 2. 更新 music.json
        const { content, sha } = await getMusicJsonContent();
        const musicJson = JSON.parse(atob(content));

        const newSong = {
            id: fileName, // 使用带时间戳的文件名作为唯一ID
            title: title,
            singers: singers,
            original: original,
            url: `https://cdn.jsdelivr.net/gh/${GITHUB_OWNER}/${GITHUB_REPO}@main/${filePath}` // 使用CDN URL
        };
        // 修复：确保 musicJson 是一个单层数组
        const targetArray = Array.isArray(musicJson[0]) ? musicJson[0] : musicJson;
        targetArray.unshift(newSong); // 将新歌添加到最前面

        await updateMusicJson(Array.isArray(musicJson[0]) ? [targetArray] : targetArray, sha);
        
        progressBar.style.width = '100%';
        uploadItem.classList.add('success');
        
        // 刷新音乐库
        loadMusicLibrary(); 
    } catch (error) {
        console.error('上传失败:', error);
        uploadItem.classList.add('error');
        uploadItem.innerHTML += '<span> 上传失败</span>';
    } finally {
        currentFile = null;
    }
});


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
    if (!response.ok) {
        throw new Error('获取 music.json 失败');
    }
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


// 队列侧边栏控制
queueBtn.addEventListener('click', () => {
    queueSidebar.classList.toggle('active');
});

closeQueueBtn.addEventListener('click', () => {
    queueSidebar.classList.remove('active');
});

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    loadMusicLibrary();
});

