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
        this.singerCounter = 1;
        this.currentEditingFile = null;

        // =================================================================
        // 重要配置：请替换为您的信息
        // =================================================================
        const GITHUB_USERNAME = 'kafuuchino4302';
        const GITHUB_REPO = 'kafuchino4302.github.io';
        // 这是一个低权限的Token，仅用于触发Action。请在GitHub上生成一个新的。
        const ACTION_TRIGGER_TOKEN = 'ghp_YOUR_ACTION_TRIGGER_TOKEN'; // <--- 在这里替换您的TOKEN
        // =================================================================

        // GitHub Pages 的基础 URL
        this.baseUrl = `https://${GITHUB_USERNAME}.github.io`;
        
        // 用于触发 GitHub Action 的 API 帮助类
        this.githubActionTrigger = new GitHubActionTrigger(
            GITHUB_USERNAME,
            GITHUB_REPO,
            ACTION_TRIGGER_TOKEN
        );

        this.initializeElements();
        this.setupEventListeners();
        this.loadLibrary();
    }

    initializeElements() {
        // ... （所有播放器、导航等元素的选择器保持不变）
        this.playBtn = document.getElementById('play');
        this.prevBtn = document.getElementById('prev');
        this.nextBtn = document.getElementById('next');
        this.shuffleBtn = document.getElementById('shuffle');
        this.repeatBtn = document.getElementById('repeat');
        this.volumeControl = document.getElementById('volume');
        this.queueBtn = document.getElementById('queue');
        this.queueSidebar = document.getElementById('queue-sidebar');
        this.closeQueueBtn = document.getElementById('close-queue');
        this.currentTitle = document.getElementById('current-title');
        this.currentArtist = document.getElementById('current-artist');
        this.currentTime = document.getElementById('current-time');
        this.duration = document.getElementById('duration');
        this.progress = document.getElementById('progress');
        this.progressBar = document.querySelector('.progress-bar');
        this.dropZone = document.getElementById('drop-zone');
        this.fileInput = document.getElementById('file-input');
        this.uploadList = document.getElementById('upload-list');
        this.musicLibrary = document.getElementById('music-library');
        this.recentUploads = document.getElementById('recent-uploads');
        this.navLinks = document.querySelectorAll('.nav-menu a');
        this.sections = document.querySelectorAll('.section');
        
        // 编辑对话框元素
        this.editDialog = document.getElementById('music-edit-dialog');
        this.editTitleInput = document.getElementById('edit-title');
        this.singersContainer = document.getElementById('singers-container');
        this.addSingerBtn = document.getElementById('add-singer-btn');
        this.editOriginalInput = document.getElementById('edit-original');
        this.editCancelBtn = document.getElementById('cancel-edit');
        this.editSaveBtn = document.getElementById('save-edit');
    }

    setupEventListeners() {
        // ... （播放器、进度条、音频事件等监听器保持不变）
        this.playBtn.addEventListener('click', () => this.togglePlay());
        this.prevBtn.addEventListener('click', () => this.playPrevious());
        this.nextBtn.addEventListener('click', () => this.playNext());
        this.shuffleBtn.addEventListener('click', () => this.toggleShuffle());
        this.repeatBtn.addEventListener('click', () => this.toggleRepeat());
        this.volumeControl.addEventListener('input', (e) => this.setVolume(e.target.value));
        this.progressBar.addEventListener('click', (e) => this.setProgress(e));
        this.audio.addEventListener('timeupdate', () => this.updateProgress());
        this.audio.addEventListener('ended', () => this.handleSongEnd());
        this.queueBtn.addEventListener('click', () => this.toggleQueue());
        this.closeQueueBtn.addEventListener('click', () => this.toggleQueue());
        this.dropZone.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e.target.files));
        this.setupDragAndDrop();
        this.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigateToSection(e.currentTarget.getAttribute('href').substring(1));
            });
        });
        this.addSingerBtn.addEventListener('click', () => this.addSingerInput());
    }

    setupDragAndDrop() {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            this.dropZone.addEventListener(eventName, e => {
                e.preventDefault();
                e.stopPropagation();
            });
        });
        ['dragenter', 'dragover'].forEach(eventName => {
            this.dropZone.addEventListener(eventName, () => this.dropZone.classList.add('dragover'));
        });
        ['dragleave', 'drop'].forEach(eventName => {
            this.dropZone.addEventListener(eventName, () => this.dropZone.classList.remove('dragover'));
        });
        this.dropZone.addEventListener('drop', e => {
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
        const removeBtn = singerDiv.querySelector('.remove-singer-btn');
        removeBtn.addEventListener('click', () => {
            singerDiv.remove();
            this.updateSingerLabels();
        });
        this.singersContainer.appendChild(singerDiv);
    }

    updateSingerLabels() {
        const singerGroups = this.singersContainer.querySelectorAll('.form-group');
        singerGroups.forEach((div, index) => {
            const label = div.querySelector('label');
            label.textContent = `歌手 ${index + 1}`;
        });
        this.singerCounter = singerGroups.length;
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

            const musicInfo = await this.promptForMusicInfo(file);

            if (!musicInfo) {
                uploadItem.classList.add('error');
                uploadItem.querySelector('.upload-status').textContent = '已取消';
                setTimeout(() => uploadItem.remove(), 3000);
                continue;
            }
            
            try {
                uploadItem.querySelector('.upload-status').textContent = '正在上传...';
                const fileContentBase64 = await this.readFileAsBase64(file);

                await this.githubActionTrigger.triggerUploadWorkflow({
                    filename: file.name,
                    content: fileContentBase64,
                    title: musicInfo.title,
                    singers: musicInfo.singers,
                    original: musicInfo.original,
                });

                uploadItem.classList.add('success');
                uploadItem.querySelector('.upload-status').textContent = '上传成功！等待库更新';
                
            } catch (error) {
                console.error('触发上传失败:', error);
                uploadItem.classList.add('error');
                uploadItem.querySelector('.upload-status').textContent = '上传失败';
            }
        }
    }

    promptForMusicInfo(file) {
        return new Promise(resolve => {
            this.showEditDialog(file.name);
            
            const onSave = () => {
                const info = {
                    title: this.editTitleInput.value.trim() || file.name.replace(/\.[^/.]+$/, ""),
                    singers: this.getAllSingers(),
                    original: this.editOriginalInput.value.trim() || ""
                };
                cleanup();
                resolve(info);
            };

            const onCancel = () => {
                cleanup();
                resolve(null);
            };
            
            const cleanup = () => {
                this.editSaveBtn.removeEventListener('click', onSave);
                this.editCancelBtn.removeEventListener('click', onCancel);
                this.closeEditDialog();
            };

            this.editSaveBtn.addEventListener('click', onSave, { once: true });
            this.editCancelBtn.addEventListener('click', onCancel, { once: true });
        });
    }

    readFileAsBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64Content = reader.result.split(',')[1];
                resolve(base64Content);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
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
        `;
        return div;
    }

    async loadLibrary() {
        try {
            const response = await fetch(`${this.baseUrl}/library.json?t=${Date.now()}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.library = await response.json();
            this.updateLibrary();
        } catch (error) {
            console.error('加载音乐库失败:', error);
            this.library = [];
            // 可以在页面上显示错误提示
        }
    }

    showEditDialog(fileName) {
        this.singersContainer.innerHTML = `
            <div class="form-group">
                <label for="edit-singer-1">歌手</label>
                <input type="text" id="edit-singer-1" class="singer-input" placeholder="输入歌手名称">
                <button type="button" class="add-singer-btn" id="add-singer-btn"><i class="fas fa-plus"></i></button>
            </div>
        `;
        document.getElementById('add-singer-btn').addEventListener('click', () => this.addSingerInput());
        this.singerCounter = 1;

        this.editTitleInput.value = fileName.replace(/\.[^/.]+$/, "");
        this.editOriginalInput.value = '';
        
        this.editDialog.classList.add('active');
        this.editTitleInput.focus();
    }

    closeEditDialog() {
        this.editDialog.classList.remove('active');
    }

    updateLibrary() {
        this.musicLibrary.innerHTML = '';
        this.library.forEach(song => {
            const card = this.createMusicCard(song);
            this.musicLibrary.appendChild(card);
        });

        const recentSongs = [...this.library].reverse().slice(0, 6);
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
            ? song.singers.map(singer => `<p class="singer-info">${singer}</p>`).join('')
            : '<p class="singer-info">未知歌手</p>';

        div.innerHTML = `
            <div class="music-card-info">
                <h3>${song.title}</h3>
                ${singersHtml}
                ${song.original ? `<p class="original-work">原作：${song.original}</p>` : ''}
            </div>
            <div class="music-card-controls">
                <button class="control-btn" onclick="player.addToQueue(${song.id})">
                    <i class="fas fa-plus"></i>
                </button>
                <button class="control-btn primary" onclick="player.playSong(${song.id})">
                    <i class="fas fa-play"></i>
                </button>
            </div>
        `;
        return div;
    }

    playSong(songId) {
        const song = this.library.find(s => s.id === songId);
        if (!song) return;

        const audioUrl = `${this.baseUrl}/uploads/music/${encodeURIComponent(song.file)}`;

        this.currentTitle.textContent = song.title;
        this.currentArtist.textContent = Array.isArray(song.singers) && song.singers.length > 0 ? song.singers.join(', ') : '未知歌手';
        this.audio.src = audioUrl;
        this.play();

        const songIndexInQueue = this.queue.findIndex(s => s.id === song.id);
        if (songIndexInQueue !== -1) {
            this.currentSongIndex = songIndexInQueue;
        } else {
            this.queue.unshift(song);
            this.currentSongIndex = 0;
        }
        this.updateQueueDisplay();
    }

    togglePlay() {
        if (!this.audio.src) return;
        this.isPlaying ? this.pause() : this.play();
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

    // ... （所有其他播放器控制方法 playNext, playPrevious, etc. 保持不变）
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
        if (!isNaN(duration)) {
            this.audio.currentTime = (clickX / width) * duration;
        }
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
        this.shuffleBtn.classList.toggle('active', this.isShuffled);
        if (this.isShuffled) this.shuffleQueue();
    }
    toggleRepeat() {
        const repeatModes = ['none', 'all', 'one'];
        const currentModeIndex = repeatModes.indexOf(this.repeatMode);
        this.repeatMode = repeatModes[(currentModeIndex + 1) % repeatModes.length];
        this.repeatBtn.classList.toggle('active', this.repeatMode !== 'none');
        this.repeatBtn.innerHTML = this.repeatMode === 'one' ? '<i class="fas fa-repeat-1"></i>' : '<i class="fas fa-redo"></i>';
    }
    handleSongEnd() {
        if (this.repeatMode === 'one') {
            this.playSong(this.queue[this.currentSongIndex].id);
        } else if (this.currentSongIndex < this.queue.length - 1) {
            this.playNext();
        } else if (this.repeatMode === 'all') {
            this.playNext();
        } else {
            this.pause();
        }
    }
    shuffleQueue() { /* ... */ }
    toggleQueue() { this.queueSidebar.classList.toggle('active'); }
    addToQueue(songId) {
        const song = this.library.find(s => s.id === songId);
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
                <button class="control-btn" onclick="event.stopPropagation(); player.removeFromQueue(${index})">
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
        } else if (index === this.currentSongIndex && this.queue.length > 0) {
            this.currentSongIndex = Math.max(0, this.currentSongIndex % this.queue.length);
        }
        this.updateQueueDisplay();
    }
    navigateToSection(sectionId) {
        this.sections.forEach(s => s.classList.remove('active'));
        this.navLinks.forEach(l => l.classList.remove('active'));
        document.getElementById(sectionId).classList.add('active');
        document.querySelector(`.nav-menu a[href="#${sectionId}"]`).classList.add('active');
    }
}

class GitHubActionTrigger {
    constructor(owner, repo, token) {
        this.owner = owner;
        this.repo = repo;
        this.token = token;
        this.baseUrl = 'https://api.github.com';
    }

    async triggerUploadWorkflow(payload) {
        if (!this.token || this.token === 'ghp_YOUR_ACTION_TRIGGER_TOKEN') {
            alert('错误：GitHub Action触发Token未配置！请在script.js中设置。');
            throw new Error('Action trigger token is not configured.');
        }

        const url = `${this.baseUrl}/repos/${this.owner}/${this.repo}/dispatches`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `token ${this.token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                event_type: 'upload-music',
                client_payload: payload
            })
        });

        if (response.status !== 204) {
            const errorData = await response.json();
            throw new Error(`触发工作流失败: ${errorData.message}`);
        }
        console.log('成功触发 "upload-music" 工作流。');
    }
}

let player;
document.addEventListener('DOMContentLoaded', () => {
    player = new MusicPlayer();
});
