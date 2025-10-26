// 这个类专门用于触发 GitHub Actions 工作流
class GitHubActionsAPI {
    constructor(owner, repo, token) {
        this.owner = owner;
        this.repo = repo;
        // 注意：这里的 token 是权限非常有限的、专门用于触发 workflow 的 token
        this.token = token;
        this.baseUrl = 'https://api.github.com';
    }

    async triggerUpload(payload) {
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
                client_payload: payload,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Failed to trigger workflow: ${errorData.message}`);
        }
        // dispatch API 在成功时返回 204 No Content，所以没有 .json()
        console.log('Workflow triggered successfully.');
    }
}


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
        this.repoOwner = 'kafuuchino4302'; // 替换为你的GitHub用户名
        this.repoName = 'kafuchino4302.github.io'; // 替换为你的仓库名

        // 使用新的、权限有限的 Token 来触发 GitHub Actions
        this.githubActions = new GitHubActionsAPI(
            this.repoOwner,
            this.repoName,
            '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' // ！！！替换为你刚刚创建的那个权限很低的 PAT！！！
        );

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
        this.singersContainer = document.getElementById('singers-container');
        this.editOriginalInput = document.getElementById('edit-original');
        this.editCancelBtn = document.getElementById('cancel-edit');
        this.editSaveBtn = document.getElementById('save-edit');
        
        // 确保添加歌手按钮存在并绑定事件
        const addSingerBtn = this.singersContainer.querySelector('.add-singer-btn');
        if(addSingerBtn) {
            addSingerBtn.addEventListener('click', () => this.addSingerInput());
        }
    }

    setupEventListeners() {
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
    }

    setupDragAndDrop() {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            this.dropZone.addEventListener(eventName, (e) => {
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

        this.dropZone.addEventListener('drop', (e) => {
            this.handleFileSelect(e.dataTransfer.files);
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
            const input = div.querySelector('input');
            const newIndex = index + 1;
            label.textContent = `歌手 ${newIndex}`;
            label.setAttribute('for', `edit-singer-${newIndex}`);
            input.id = `edit-singer-${newIndex}`;
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

            try {
                const musicInfo = await this.promptForMusicInfo(file);
                
                if (!musicInfo) { // 用户点击了取消
                    uploadItem.remove();
                    continue;
                }
                
                uploadItem.querySelector('.upload-status').textContent = '文件读取中...';
                const fileContentBase64 = await this.readFileAsBase64(file);
                
                uploadItem.querySelector('.upload-status').textContent = '触发上传流程...';
                
                const payload = {
                    filename: file.name,
                    content: fileContentBase64,
                    title: musicInfo.title,
                    singers: musicInfo.singers,
                    original: musicInfo.original,
                };

                await this.githubActions.triggerUpload(payload);

                uploadItem.classList.add('success');
                uploadItem.querySelector('.upload-status').innerHTML = '上传请求已发送！<br>请稍后刷新页面查看。';

            } catch (error) {
                console.error('上传流程失败:', error);
                uploadItem.classList.add('error');
                uploadItem.querySelector('.upload-status').textContent = `上传失败: ${error.message}`;
            }
        }
    }

    promptForMusicInfo(file) {
        return new Promise((resolve) => {
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
                resolve(null); // 表示用户取消
            };
            
            const cleanup = () => {
                this.editSaveBtn.removeEventListener('click', onSave);
                this.editCancelBtn.removeEventListener('click', onCancel);
                this.closeEditDialog();
            };

            this.editSaveBtn.addEventListener('click', onSave);
            this.editCancelBtn.addEventListener('click', onCancel);
        });
    }

    readFileAsBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                // reader.result 是 data:audio/mpeg;base64,xxxx
                // 我们只需要 base64 部分
                const base64String = reader.result.split(',')[1];
                resolve(base64String);
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
                <div class="upload-status">等待编辑信息...</div>
            </div>
        `;
        return div;
    }

    async loadLibrary() {
        try {
            // 直接通过公开URL加载，不需要token
            // 添加一个时间戳参数来防止浏览器缓存
            const url = `library.json?t=${new Date().getTime()}`;
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.library = await response.json();
            this.updateLibrary();
        } catch (error) {
            console.error('加载音乐库失败:', error);
            this.library = []; // 加载失败则清空
            this.updateLibrary();
        }
    }
    
    // saveLibrary 将由 GitHub Actions 完成，前端不再需要此方法
    // async saveLibrary() { ... }

    showEditDialog(fileName) {
        // 清空旧数据
        this.editTitleInput.value = fileName.replace(/\.[^/.]+$/, "");
        this.editOriginalInput.value = "";
        this.singersContainer.innerHTML = `
            <div class="form-group">
                <label for="edit-singer-1">歌手</label>
                <input type="text" id="edit-singer-1" class="singer-input" placeholder="输入歌手名称">
                <button type="button" class="add-singer-btn"><i class="fas fa-plus"></i></button>
            </div>
        `;
        this.singersContainer.querySelector('.add-singer-btn').addEventListener('click', () => this.addSingerInput());
        this.singerCounter = 1;
        
        this.editDialog.classList.add('active');
        this.editTitleInput.focus();
    }

    closeEditDialog() {
        this.editDialog.classList.remove('active');
    }

    updateLibrary() {
        this.musicLibrary.innerHTML = '';
        if (this.library.length === 0) {
            this.musicLibrary.innerHTML = '<p>音乐库为空，请先上传音乐。</p>';
        } else {
            this.library.forEach(song => {
                const card = this.createMusicCard(song);
                this.musicLibrary.appendChild(card);
            });
        }

        const recentSongs = [...this.library].reverse().slice(0, 6);
        this.recentUploads.innerHTML = '';
        if(recentSongs.length === 0){
             this.recentUploads.innerHTML = '<p>暂无最近上传。</p>';
        } else {
            recentSongs.forEach(song => {
                const card = this.createMusicCard(song);
                this.recentUploads.appendChild(card);
            });
        }
    }

    createMusicCard(song) {
        const div = document.createElement('div');
        div.className = 'music-card';
        div.dataset.songId = song.id;

        const singersHtml = Array.isArray(song.singers) && song.singers.length > 0 
            ? song.singers.map(singer => `<span>${singer}</span>`).join(' / ')
            : '未知歌手';
            
        div.innerHTML = `
            <div class="music-card-info">
                <h3>${song.title}</h3>
                <p class="singer-info">${singersHtml}</p>
                ${song.original ? `<p class="original-work">原作：${song.original}</p>` : ''}
            </div>
            <div class="music-card-controls">
                <button class="control-btn add-to-queue-btn">
                    <i class="fas fa-plus"></i>
                </button>
                <button class="control-btn primary play-song-btn">
                    <i class="fas fa-play"></i>
                </button>
            </div>
        `;

        div.querySelector('.add-to-queue-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.addToQueue(song.id);
        });

        div.querySelector('.play-song-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.playSong(song.id);
        });

        return div;
    }

    playSong(songId) {
        const song = this.library.find(s => s.id === songId);
        if (!song) return;

        // 直接使用相对路径播放，因为文件和网页在同一个仓库
        const audioUrl = `uploads/music/${encodeURIComponent(song.file)}`;
        
        const artists = Array.isArray(song.singers) && song.singers.length > 0 ? song.singers.join(' / ') : '未知歌手';

        this.currentTitle.textContent = song.title;
        this.currentArtist.textContent = artists;
        this.audio.src = audioUrl;
        this.play();

        const songInQueueIndex = this.queue.findIndex(s => s.id === song.id);
        if (songInQueueIndex > -1) {
             this.currentSongIndex = songInQueueIndex;
        } else {
            this.queue.unshift(song);
            this.currentSongIndex = 0;
        }
        this.updateQueueDisplay();
    }

    togglePlay() {
        if (!this.audio.src) return;
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    play() {
        if (!this.audio.src) return;
        this.isPlaying = true;
        this.playBtn.innerHTML = '<i class="fas fa-pause"></i>';
        this.audio.play().catch(e => console.error("播放失败:", e));
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
        if(!this.duration.dataset.loaded) {
            this.duration.textContent = this.formatTime(duration);
            this.duration.dataset.loaded = true;
        }
    }

    setProgress(e) {
        if(!this.audio.duration) return;
        const width = this.progressBar.clientWidth;
        const clickX = e.offsetX;
        this.audio.currentTime = (clickX / width) * this.audio.duration;
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
        if (this.isShuffled) {
            this.shuffleQueue();
        }
    }

    toggleRepeat() {
        const repeatModes = ['none', 'all', 'one'];
        const currentModeIndex = repeatModes.indexOf(this.repeatMode);
        this.repeatMode = repeatModes[(currentModeIndex + 1) % repeatModes.length];
        
        switch (this.repeatMode) {
            case 'one':
                this.repeatBtn.innerHTML = '<i class="fas fa-redo-alt"></i>'; // 使用不同的图标表示单曲循环
                this.repeatBtn.classList.add('active');
                break;
            case 'all':
                this.repeatBtn.innerHTML = '<i class="fas fa-redo"></i>';
                this.repeatBtn.classList.add('active');
                break;
            default: // 'none'
                this.repeatBtn.innerHTML = '<i class="fas fa-redo"></i>';
                this.repeatBtn.classList.remove('active');
                break;
        }
    }



    handleSongEnd() {
        if (this.repeatMode === 'one') {
            this.audio.currentTime = 0;
            this.play();
        } else if (this.currentSongIndex < this.queue.length - 1) {
            this.playNext();
        } else if (this.repeatMode === 'all') {
            this.currentSongIndex = -1; // playNext 会加1变成0
            this.playNext();
        } else {
            this.pause();
        }
    }

    shuffleQueue() {
        let currentIndex = this.queue.length;
        while (currentIndex !== 0) {
            let randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex--;
            [this.queue[currentIndex], this.queue[randomIndex]] = [this.queue[randomIndex], this.queue[currentIndex]];
        }
        // 找到当前播放歌曲在新队列中的位置
        const currentSong = this.queue.find(song => song.id === this.queue[this.currentSongIndex].id);
        this.currentSongIndex = this.queue.indexOf(currentSong);
        this.updateQueueDisplay();
    }

    toggleQueue() {
        this.queueSidebar.classList.toggle('active');
    }

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
            li.dataset.index = index;
            if (index === this.currentSongIndex && this.isPlaying) li.classList.add('active');
            
            li.innerHTML = `
                <div class="queue-song-info">
                    <span>${song.title}</span>
                    <small>${Array.isArray(song.singers) && song.singers.length > 0 ? song.singers.join(' / ') : '未知歌手'}</small>
                </div>
                <button class="control-btn remove-from-queue-btn">
                    <i class="fas fa-times"></i>
                </button>
            `;
            
            li.querySelector('.queue-song-info').addEventListener('click', () => {
                this.currentSongIndex = index;
                this.playSong(song.id);
            });
            
            li.querySelector('.remove-from-queue-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeFromQueue(index);
            });
            
            queueList.appendChild(li);
        });
    }

    removeFromQueue(index) {
        this.queue.splice(index, 1);
        if (index < this.currentSongIndex) {
            this.currentSongIndex--;
        } else if (index === this.currentSongIndex) {
            // 如果删除的是当前歌曲，需要决定下一步操作
            // 这里简单地停止播放
            if (this.queue.length > 0) {
                // 播放下一首或回到开头
                this.currentSongIndex = Math.max(0, this.currentSongIndex - 1);
                this.playSong(this.queue[this.currentSongIndex].id);
            } else {
                this.audio.src = '';
                this.currentTitle.textContent = '未播放';
                this.currentArtist.textContent = '选择音乐开始播放';
                this.pause();
            }
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
        
        const activeSection = document.getElementById(sectionId);
        if(activeSection) activeSection.classList.add('active');

        const activeLink = document.querySelector(`.nav-menu a[href="#${sectionId}"]`);
        if(activeLink) activeLink.classList.add('active');
    }
}


// 初始化播放器
let player;
document.addEventListener('DOMContentLoaded', () => {
    player = new MusicPlayer();
});
