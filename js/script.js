class MusicPlayer {
    constructor() {
        this.audio = new Audio();
        this.isPlaying = false;
        this.currentSongIndex = 0;
        this.isShuffled = false;
        this.repeatMode = 'none'; // none, one, all
        this.volume = 1;
        this.queue = [];
        this.library = [];
        
        // 初始化GitHub API
        this.github = new GitHubAPI(
            'kafuuchino4302',  // 替换为你的GitHub用户名
            'kafuchino4302.github.io',        // 替换为你的仓库名
            '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'      // 替换为你的GitHub Token
        );

        // 添加对话框相关元素
        this.editDialog = null;
        this.editTitleInput = null;
        this.singersContainer = null;
        this.editOriginalInput = null;
        this.editCancelBtn = null;
        this.editSaveBtn = null;
        this.currentEditingFile = null;
        this.singerCounter = 1;

        this.initializeElements();
        this.setupEventListeners();
        this.loadLibrary();
    }

    initializeElements() {
        // 播放器控制
        this.playBtn = document.getElementById('play');
        this.prevBtn = document.getElementById('prev');
        this.nextBtn = document.getElementById('next');
        this.shuffleBtn = document.getElementById('shuffle');
        this.repeatBtn = document.getElementById('repeat');
        this.volumeControl = document.getElementById('volume');
        this.queueBtn = document.getElementById('queue');
        this.queueSidebar = document.getElementById('queue-sidebar');
        this.closeQueueBtn = document.getElementById('close-queue');
        
        // 播放信息
        this.currentTitle = document.getElementById('current-title');
        this.currentArtist = document.getElementById('current-artist');
        this.currentTime = document.getElementById('current-time');
        this.duration = document.getElementById('duration');
        this.progress = document.getElementById('progress');
        this.progressBar = document.querySelector('.progress-bar');
        
        // 上传相关
        this.dropZone = document.getElementById('drop-zone');
        this.fileInput = document.getElementById('file-input');
        this.uploadList = document.getElementById('upload-list');
        
        // 音乐库
        this.musicLibrary = document.getElementById('music-library');
        this.recentUploads = document.getElementById('recent-uploads');
        
        // 导航
        this.navLinks = document.querySelectorAll('.nav-menu a');
        this.sections = document.querySelectorAll('.section');

        // 初始化编辑对话框元素
        this.editDialog = document.getElementById('music-edit-dialog');
        this.editTitleInput = document.getElementById('edit-title');
        this.editArtistInput = document.getElementById('edit-artist');
        this.editOriginalInput = document.getElementById('edit-original');
        this.editCancelBtn = document.getElementById('cancel-edit');
        this.editSaveBtn = document.getElementById('save-edit');

        // 设置编辑对话框事件
        this.editCancelBtn.addEventListener('click', () => this.closeEditDialog());
        this.editSaveBtn.addEventListener('click', () => this.saveMusicInfo());
    }

    setupEventListeners() {
        // 播放器控制
        this.playBtn.addEventListener('click', () => this.togglePlay());
        this.prevBtn.addEventListener('click', () => this.playPrevious());
        this.nextBtn.addEventListener('click', () => this.playNext());
        this.shuffleBtn.addEventListener('click', () => this.toggleShuffle());
        this.repeatBtn.addEventListener('click', () => this.toggleRepeat());
        this.volumeControl.addEventListener('input', (e) => this.setVolume(e.target.value));
        
        // 进度条控制
        this.progressBar.addEventListener('click', (e) => this.setProgress(e));
        
        // 音频事件
        this.audio.addEventListener('timeupdate', () => this.updateProgress());
        this.audio.addEventListener('ended', () => this.handleSongEnd());
        
        // 队列控制
        this.queueBtn.addEventListener('click', () => this.toggleQueue());
        this.closeQueueBtn.addEventListener('click', () => this.toggleQueue());
        
        // 文件上传
        this.dropZone.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e.target.files));
        this.setupDragAndDrop();
        
        // 导航
        this.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigateToSection(e.target.getAttribute('href').substring(1));
            });
        });
    }

    setupDragAndDrop() {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            this.dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            this.dropZone.addEventListener(eventName, () => {
                this.dropZone.classList.add('dragover');
            });
        });

        ['dragleave', 'drop'].forEach(eventName => {
            this.dropZone.addEventListener(eventName, () => {
                this.dropZone.classList.remove('dragover');
            });
        });

        this.dropZone.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            this.handleFileSelect(files);
        });
    }

    addSingerInput() {
        this.singerCounter++;
        const singerDiv = document.createElement('div');
        singerDiv.className = 'form-group';
        singerDiv.innerHTML = `
            <label for="edit-singer-${this.singerCounter}">歌手 ${this.singerCounter}</label>
            <input type="text" id="edit-singer-${this.singerCounter}" class="singer-input" placeholder="输入歌手名称">
            <button type="button" class="remove-singer-btn"><i class="fas fa-minus"></i></button>
        `;
        
        // 添加删除按钮事件监听
        const removeBtn = singerDiv.querySelector('.remove-singer-btn');
        removeBtn.addEventListener('click', () => {
            singerDiv.remove();
            this.updateSingerLabels();
        });
        
        this.singersContainer.appendChild(singerDiv);
    }

    updateSingerLabels() {
        const singerInputs = this.singersContainer.querySelectorAll('.form-group');
        singerInputs.forEach((div, index) => {
            const label = div.querySelector('label');
            const input = div.querySelector('input');
            label.textContent = `歌手 ${index + 1}`;
            input.id = `edit-singer-${index + 1}`;
        });
        this.singerCounter = singerInputs.length;
    }

    getAllSingers() {
        const singers = [];
        const singerInputs = this.singersContainer.querySelectorAll('.singer-input');
        singerInputs.forEach(input => {
            if (input.value.trim()) {
                singers.push(input.value.trim());
            }
        });
        return singers;
    }

    async handleFileSelect(files) {
        for (const file of files) {
            if (!file.type.startsWith('audio/')) continue;

            const uploadItem = this.createUploadItem(file);
            this.uploadList.appendChild(uploadItem);

            try {
                // 显示编辑对话框
                this.currentEditingFile = file;
                this.showEditDialog(file.name);

                // 等待用户编辑完成
                const musicInfo = await new Promise((resolve) => {
                    this.editSaveBtn.onclick = () => {
                        const musicInfo = {
                            title: this.editTitleInput.value.trim() || file.name.replace(/\.[^/.]+$/, ""),
                            singers: this.getAllSingers(),
                            original: this.editOriginalInput.value.trim() || ""
                        };
                        this.closeEditDialog();
                        resolve(info);
                    };
                    this.editCancelBtn.onclick = () => {
                        this.closeEditDialog();
                        resolve({
                            title: file.name.replace(/\.[^/.]+$/, ""),
                            artist: "未知艺术家"
                        });
                    };
                });

                // 读取文件内容
                const fileContent = await this.readFileAsArrayBuffer(file);
                
                // 上传到GitHub仓库
                await this.github.uploadFile(
                    `uploads/music/${file.name}`,
                    fileContent,
                    `Upload music: ${file.name}`
                );

                // 添加到音乐库
                const song = {
                    id: Date.now(),
                    title: musicInfo.title,
                    artist: musicInfo.artist,
                    file: file.name
                };

                this.library.push(song);
                this.saveLibrary();
                this.updateLibrary();
                
                // 更新上传状态
                uploadItem.classList.add('success');
                uploadItem.querySelector('.upload-status').textContent = '上传成功';
            } catch (error) {
                console.error('上传失败:', error);
                uploadItem.classList.add('error');
                uploadItem.querySelector('.upload-status').textContent = '上传失败';
            }
        }
    }

    readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    createUploadItem(file) {
        const div = document.createElement('div');
        div.className = 'upload-item';
        div.innerHTML = `
            <div class="upload-info">
                <div class="upload-name">${file.name}</div>
                <div class="upload-status">等待编辑中...</div>
            </div>
            <div class="upload-progress">
                <div class="upload-progress-bar" style="width: 0%"></div>
            </div>
        `;
        return div;
    }

    async loadLibrary() {
        try {
            // 从GitHub仓库加载library.json
            const response = await this.github.getFile('library.json');
            if (response.content) {
                const content = atob(response.content);
                this.library = JSON.parse(content);
                this.updateLibrary();
            }
        } catch (error) {
            console.error('加载音乐库失败:', error);
            this.library = [];
        }
    }

    async saveLibrary() {
        try {
            // 保存library.json到GitHub仓库
            await this.github.uploadFile(
                'library.json',
                JSON.stringify(this.library, null, 2),
                'Update music library'
            );
        } catch (error) {
            console.error('保存音乐库失败:', error);
        }
    }

    showEditDialog(fileName) {
        // 设置默认值
        const defaultTitle = fileName.replace(/\.[^/.]+$/, "");
        this.editTitleInput.value = defaultTitle;
        this.editArtistInput.value = "";
        
        // 显示对话框
        this.editDialog.classList.add('active');
        this.editTitleInput.focus();

        // 阻止对话框关闭事件冒泡
        this.editDialog.addEventListener('click', (e) => {
            if (e.target === this.editDialog) {
                this.closeEditDialog();
            }
        });
    }

    closeEditDialog() {
        this.editDialog.classList.remove('active');
        this.currentEditingFile = null;
    }

    saveMusicInfo() {
        // 保存逻辑在 handleFileSelect 方法中处理
        this.editSaveBtn.click();
    }

    updateLibrary() {
        // 更新音乐库显示
        this.musicLibrary.innerHTML = '';
        this.library.forEach(song => {
            const card = this.createMusicCard(song);
            this.musicLibrary.appendChild(card);
        });

        // 更新最近上传
        const recentSongs = this.library.slice(-6);
        this.recentUploads.innerHTML = '';
        recentSongs.forEach(song => {
            const card = this.createMusicCard(song);
            this.recentUploads.appendChild(card);
        });
    }

    createMusicCard(song) {
        const div = document.createElement('div');
        div.className = 'music-card';
        const singersHtml = Array.isArray(song.singers) && song.singers.length > 0 
            ? song.singers.map((singer, index) => `<p class="singer-info">${index === 0 ? '演唱：' : '合唱：'}${singer}</p>`).join('')
            : '<p class="singer-info">演唱：未知歌手</p>';
            
        div.innerHTML = `
            <div class="music-card-info">
                <h3>${song.title}</h3>
                ${singersHtml}
                ${song.original ? `<p class="original-work">原作：${song.original}</p>` : ''}
            </div>
            <div class="music-card-controls">
                <button class="control-btn" onclick="player.addToQueue('${song.id}')">
                    <i class="fas fa-plus"></i>
                </button>
                <button class="control-btn primary" onclick="player.playSong('${song.id}')">
                    <i class="fas fa-play"></i>
                </button>
            </div>
        `;
        return div;
    }

    async playSong(songId) {
        const song = this.library.find(s => s.id === parseInt(songId));
        if (!song) return;

        try {
            // 获取音乐文件URL
            const response = await this.github.getFile(`uploads/music/${song.file}`);
            const audioUrl = response.download_url;

            // 更新播放器状态
            this.currentTitle.textContent = song.title;
            this.currentArtist.textContent = song.artist;
            this.audio.src = audioUrl;
            this.play();

            // 添加到队列（如果不在队列中）
            if (!this.queue.some(s => s.id === song.id)) {
                this.queue.push(song);
                this.currentSongIndex = this.queue.length - 1;
                this.updateQueueDisplay();
            }
        } catch (error) {
            console.error('播放失败:', error);
        }
    }

    togglePlay() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    play() {
        this.isPlaying = true;
        this.playBtn.innerHTML = '<i class="fas fa-pause"></i>';
        this.audio.play();
    }

    pause() {
        this.isPlaying = false;
        this.playBtn.innerHTML = '<i class="fas fa-play"></i>';
        this.audio.pause();
    }

    playNext() {
        if (this.queue.length === 0) return;
        
        this.currentSongIndex = (this.currentSongIndex + 1) % this.queue.length;
        this.playSong(this.queue[this.currentSongIndex].id);
    }

    playPrevious() {
        if (this.queue.length === 0) return;
        
        this.currentSongIndex = (this.currentSongIndex - 1 + this.queue.length) % this.queue.length;
        this.playSong(this.queue[this.currentSongIndex].id);
    }

    updateProgress() {
        const { duration, currentTime } = this.audio;
        if (isNaN(duration)) return;
        
        const progressPercent = (currentTime / duration) * 100;
        this.progress.style.width = `${progressPercent}%`;
        this.currentTime.textContent = this.formatTime(currentTime);
        this.duration.textContent = this.formatTime(duration);
    }

    setProgress(e) {
        const width = this.progressBar.clientWidth;
        const clickX = e.offsetX;
        const duration = this.audio.duration;
        this.audio.currentTime = (clickX / width) * duration;
    }

    formatTime(time) {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    setVolume(value) {
        this.volume = value / 100;
        this.audio.volume = this.volume;
    }

    toggleShuffle() {
        this.isShuffled = !this.isShuffled;
        this.shuffleBtn.classList.toggle('active');
        if (this.isShuffled) {
            this.shuffleQueue();
        }
    }

    toggleRepeat() {
        switch (this.repeatMode) {
            case 'none':
                this.repeatMode = 'one';
                this.repeatBtn.innerHTML = '<i class="fas fa-repeat-1"></i>';
                break;
            case 'one':
                this.repeatMode = 'all';
                this.repeatBtn.innerHTML = '<i class="fas fa-repeat"></i>';
                break;
            case 'all':
                this.repeatMode = 'none';
                this.repeatBtn.innerHTML = '<i class="fas fa-random"></i>';
                break;
        }
    }

    handleSongEnd() {
        switch (this.repeatMode) {
            case 'one':
                this.audio.currentTime = 0;
                this.play();
                break;
            case 'all':
                this.playNext();
                break;
            case 'none':
                if (this.currentSongIndex < this.queue.length - 1) {
                    this.playNext();
                }
                break;
        }
    }

    shuffleQueue() {
        for (let i = this.queue.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.queue[i], this.queue[j]] = [this.queue[j], this.queue[i]];
        }
        this.updateQueueDisplay();
    }

    toggleQueue() {
        this.queueSidebar.classList.toggle('active');
    }

    addToQueue(songId) {
        const song = this.library.find(s => s.id === parseInt(songId));
        if (song && !this.queue.some(s => s.id === song.id)) {
            this.queue.push(song);
            this.updateQueueDisplay();
        }
    }

    updateQueueDisplay() {
        const queueList = document.getElementById('queue-list');
        queueList.innerHTML = '';
        
        this.queue.forEach((song, index) => {
            const li = document.createElement('li');
            li.className = 'queue-item';
            if (index === this.currentSongIndex) li.classList.add('active');
            
            li.innerHTML = `
                <span>${song.title}</span>
                <button class="control-btn" onclick="player.removeFromQueue(${index})">
                    <i class="fas fa-times"></i>
                </button>
            `;
            
            li.addEventListener('click', () => {
                this.currentSongIndex = index;
                this.playSong(song.id);
            });
            
            queueList.appendChild(li);
        });
    }

    removeFromQueue(index) {
        this.queue.splice(index, 1);
        if (index < this.currentSongIndex) {
            this.currentSongIndex--;
        }
        this.updateQueueDisplay();
    }

    navigateToSection(sectionId) {
        this.sections.forEach(section => {
            section.classList.remove('active');
        });
        
        this.navLinks.forEach(link => {
            link.classList.remove('active');
        });
        
        document.getElementById(sectionId).classList.add('active');
        document.querySelector(`[href="#${sectionId}"]`).classList.add('active');
    }
}

// GitHub API 类
class GitHubAPI {
    constructor(owner, repo, token) {
        this.owner = owner;
        this.repo = repo;
        this.token = token;
        this.baseUrl = 'https://api.github.com';
    }

    async uploadFile(path, content, message) {
        const url = `${this.baseUrl}/repos/${this.owner}/${this.repo}/contents/${path}`;
        const data = {
            message,
            content: btoa(content),
            branch: 'main'
        };

        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${this.token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        return response.json();
    }

    async getFile(path) {
        const url = `${this.baseUrl}/repos/${this.owner}/${this.repo}/contents/${path}`;
        const response = await fetch(url, {
            headers: {
                'Authorization': `token ${this.token}`,
            }
        });

        return response.json();
    }
}

// 初始化播放器
let player;
document.addEventListener('DOMContentLoaded', () => {
    player = new MusicPlayer();

});

