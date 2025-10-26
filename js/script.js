// js/script.js

// GitHub 配置
const GITHUB_OWNER = '你的GitHub用户名'; // 替换为你的 GitHub 用户名
const GITHUB_REPO = '你的仓库名'; // 替换为你的仓库名
const TOKEN_PART_1 =' ghp_pOaD2xShfdDnW6g2z'; // 硬编码部分 token（前半部分，替换为你的部分 token）
const MUSIC_DIR = 'music/'; // 音乐文件存储目录
const METADATA_FILE = 'music.json'; // 元数据文件

// 全局变量
let GITHUB_TOKEN = ''; // 完整的 token，将由两部分拼接
let audio = new Audio();
let currentPlaylist = [];
let currentIndex = -1;
let isPlaying = false;
let musicList = [];

// DOM 元素（部分省略，与原代码相同）
const recentUploads = document.getElementById('recent-uploads');
const musicLibrary = document.getElementById('music-library');
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const musicEditDialog = document.getElementById('music-edit-dialog');
const editTitle = document.getElementById('edit-title');
const singersContainer = document.getElementById('singers-container');
const editOriginal = document.getElementById('edit-original');
const saveEditBtn = document.getElementById('save-edit');
const cancelEditBtn = document.getElementById('cancel-edit');
const addSingerBtn = document.getElementById('add-singer-btn');

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    // 获取第二部分 token
    let tokenPart2 = localStorage.getItem('tokenPart2');
    if (!tokenPart2) {
        tokenPart2 = prompt('请输入 GitHub Personal Access Token 的第二部分：');
        if (tokenPart2) {
            localStorage.setItem('tokenPart2', tokenPart2); // 保存到 localStorage
        } else {
            alert('需要完整的 token 才能上传文件！');
            return;
        }
    }

    // 拼接完整 token
    GITHUB_TOKEN = TOKEN_PART_1 + tokenPart2;
    if (GITHUB_TOKEN.length < 40) { // 假设 PAT 长度为 40 位，检查拼接是否合理
        alert('Token 无效，请重新输入第二部分！');
        localStorage.removeItem('tokenPart2');
        return;
    }

    // 加载音乐列表
    loadMusicList();

    // 其余初始化代码（导航、拖拽、播放控制等，与原代码相同）
    document.querySelectorAll('.nav-menu a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.nav-menu a').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
            document.querySelector(link.getAttribute('href')).classList.add('active');
        });
    });

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
        handleFiles(e.dataTransfer.files);
    });

    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => handleFiles(fileInput.files));

    addSingerBtn.addEventListener('click', () => {
        const singerCount = singersContainer.querySelectorAll('.singer-input').length + 1;
        const singerDiv = document.createElement('div');
        singerDiv.className = 'form-group';
        singerDiv.innerHTML = `
            <label for="edit-singer-${singerCount}">歌手 ${singerCount}</label>
            <input type="text" id="edit-singer-${singerCount}" class="singer-input" placeholder="输入歌手名称">
            <button type="button" class="remove-singer-btn"><i class="fas fa-minus"></i></button>
        `;
        singersContainer.appendChild(singerDiv);
        singerDiv.querySelector('.remove-singer-btn').addEventListener('click', () => {
            singerDiv.remove();
        });
    });

    // 其他事件监听器（搜索、播放控制等）省略，与原代码相同
});

// 处理上传文件
function handleFiles(files) {
    Array.from(files).forEach(file => {
        if (file.type.startsWith('audio/')) {
            showEditDialog(file);
        }
    });
}

// 显示编辑对话框
function showEditDialog(file) {
    musicEditDialog.classList.add('active');
    editTitle.value = file.name.replace(/\.[^/.]+$/, '');
    editOriginal.value = '';
    singersContainer.innerHTML = `
        <div class="form-group">
            <label for="edit-singer-1">歌手</label>
            <input type="text" id="edit-singer-1" class="singer-input" placeholder="输入歌手名称">
            <button type="button" class="add-singer-btn" id="add-singer-btn"><i class="fas fa-plus"></i></button>
        </div>
    `;

    saveEditBtn.onclick = () => saveMusic(file);
    cancelEditBtn.onclick = () => musicEditDialog.classList.remove('active');
}

// 保存音乐到 GitHub
async function saveMusic(file) {
    try {
        // 读取文件为 Base64
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
            const base64Content = reader.result.split(',')[1];
            const fileName = `${Date.now()}_${file.name}`;
            const filePath = `${MUSIC_DIR}${fileName}`;

            // 上传音乐文件
            await uploadToGitHub(filePath, base64Content, `Upload ${fileName}`);

            // 更新元数据
            const singers = Array.from(singersContainer.querySelectorAll('.singer-input'))
                .map(input => input.value)
                .filter(val => val.trim());
            const metadata = {
                id: fileName,
                title: editTitle.value,
                singers,
                original: editOriginal.value,
                url: `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/main/${filePath}`
            };

            // 获取当前 music.json
            let currentMetadata = [];
            try {
                const response = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${METADATA_FILE}`, {
                    headers: { Authorization: `token ${GITHUB_TOKEN}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    currentMetadata = JSON.parse(atob(data.content));
                }
            } catch (e) {
                console.log('music.json 不存在，将创建新文件');
            }

            // 更新元数据
            currentMetadata.push(metadata);
            await uploadToGitHub(METADATA_FILE, btoa(JSON.stringify(currentMetadata, null, 2)), 'Update music metadata');

            // 关闭对话框并刷新音乐列表
            musicEditDialog.classList.remove('active');
            loadMusicList();
            alert('音乐上传成功！');
        };
    } catch (error) {
        console.error('上传失败：', error);
        alert('上传失败，请检查 token 或网络！');
    }
}

// 上传文件到 GitHub
async function uploadToGitHub(path, content, message) {
    const response = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`, {
        method: 'PUT',
        headers: {
            Authorization: `token ${GITHUB_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            message,
            content
        })
    });

    if (!response.ok) {
        throw new Error('GitHub API 请求失败');
    }
}

// 加载音乐列表
async function loadMusicList() {
    try {
        const response = await fetch(`https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/main/${METADATA_FILE}`);
        if (response.ok) {
            musicList = await response.json();
            renderMusicLibrary(musicList);
            renderRecentUploads(musicList.slice(-6));
        }
    } catch (error) {
        console.error('加载音乐列表失败：', error);
    }
}

// 渲染音乐库（与原代码相同）
function renderMusicLibrary(list) {
    musicLibrary.innerHTML = '';
    list.forEach(song => {
        const card = document.createElement('div');
        card.className = 'music-card';
        card.innerHTML = `
            <div class="music-card-info">
                <h3>${song.title}</h3>
                <p class="singer-info">${song.singers.join(', ')}</p>
                <p class="original-work">${song.original}</p>
            </div>
            <div class="music-card-controls">
                <button class="play-song" data-id="${song.id}"><i class="fas fa-play"></i></button>
                <button class="add-to-queue" data-id="${song.id}"><i class="fas fa-plus"></i></button>
            </div>
        `;
        musicLibrary.appendChild(card);
        card.querySelector('.play-song').addEventListener('click', () => playSong(song));
        card.querySelector('.add-to-queue').addEventListener('click', () => addToQueue(song));
    });
}

// 渲染最近上传（与原代码相同）
function renderRecentUploads(list) {
    recentUploads.innerHTML = '';
    list.forEach(song => {
        const card = document.createElement('div');
        card.className = 'music-card';
        card.innerHTML = `
            <div class="music-card-info">
                <h3>${song.title}</h3>
                <p class="singer-info">${song.singers.join(', ')}</p>
                <p class="original-work">${song.original}</p>
            </div>
            <div class="music-card-controls">
                <button class="play-song" data-id="${song.id}"><i class="fas fa-play"></i></button>
                <button class="add-to-queue" data-id="${song.id}"><i class="fas fa-plus"></i></button>
            </div>
        `;
        recentUploads.appendChild(card);
        card.querySelector('.play-song').addEventListener('click', () => playSong(song));
        card.querySelector('.add-to-queue').addEventListener('click', () => addToQueue(song));
    });
}

// 播放、队列等功能（与原代码相同，省略部分代码）
function playSong(song) {
    currentPlaylist = [song];
    currentIndex = 0;
    audio.src = song.url;
    audio.play();
    isPlaying = true;
    document.getElementById('play').innerHTML = '<i class="fas fa-pause"></i>';
    document.getElementById('current-title').textContent = song.title;
    document.getElementById('current-artist').textContent = song.singers.join(', ');
    updateQueue();
}

// 其他功能（addToQueue、updateQueue、togglePlay 等）与原代码相同，省略
