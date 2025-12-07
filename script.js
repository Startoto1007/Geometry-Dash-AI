/**
 * GEOMETRY DASH AI - GESTION UI + ÉDITEUR
 * Gère les menus, le chargement des niveaux et l'éditeur graphique
 */

class LevelEditor {
    constructor() {
        this.canvas = document.getElementById('editorCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.width = 0;
        this.height = 0;
        this.groundY = 0;
        
        this.camera = { x: 0 };
        this.objects = [];
        this.selectedType = 'spike';
        this.gridSize = 40;
        
        this.isDragging = false;
        this.lastMouseX = 0;
        
        this.setupCanvas();
        this.setupControls();
        this.render();
    }
    
    setupCanvas() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', () => this.onMouseUp());
        this.canvas.addEventListener('wheel', (e) => this.onWheel(e));
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    
    setupControls() {
        document.querySelectorAll('.obj-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.obj-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.selectedType = e.target.dataset.type;
            });
        });
        
        document.getElementById('clearBtn').addEventListener('click', () => this.clear());
        document.getElementById('testBtn').addEventListener('click', () => this.test());
        document.getElementById('saveBtn').addEventListener('click', () => this.save());
    }
    
    resizeCanvas() {
        const toolbar = document.querySelector('.editor-toolbar');
        const header = document.querySelector('.editor-header');
        const help = document.querySelector('.editor-help');
        
        this.width = window.innerWidth;
        this.height = window.innerHeight - toolbar.offsetHeight - header.offsetHeight - help.offsetHeight;
        
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.groundY = this.height - 100;
        
        this.render();
    }
    
    onMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        if (e.button === 0) {
            this.placeObject(x, y);
        } else if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
            this.isDragging = true;
            this.lastMouseX = x;
        } else if (e.button === 2) {
            this.removeObject(x, y);
        }
    }
    
    onMouseMove(e) {
        if (this.isDragging) {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const deltaX = x - this.lastMouseX;
            this.camera.x -= deltaX;
            this.camera.x = Math.max(0, this.camera.x);
            this.lastMouseX = x;
            this.render();
        }
    }
    
    onMouseUp() {
        this.isDragging = false;
    }
    
    onWheel(e) {
        e.preventDefault();
        this.camera.x += e.deltaY * 0.5;
        this.camera.x = Math.max(0, this.camera.x);
        this.render();
    }
    
    placeObject(screenX, screenY) {
        const worldX = screenX + this.camera.x;
        
        const gridX = Math.floor(worldX / this.gridSize) * this.gridSize;
        const gridY = Math.floor(screenY / this.gridSize) * this.gridSize;
        
        if (gridY >= this.groundY - this.gridSize) return;
        
        const existing = this.objects.find(obj => 
            Math.abs(obj.x - gridX) < 20 && Math.abs(obj.screenY - gridY) < 20
        );
        
        if (!existing) {
            const height = this.groundY - gridY;
            
            this.objects.push({
                type: this.selectedType,
                x: gridX,
                screenY: gridY,
                height: height
            });
            this.render();
        }
    }
    
    removeObject(screenX, screenY) {
        const worldX = screenX + this.camera.x;
        
        const gridX = Math.floor(worldX / this.gridSize) * this.gridSize;
        const gridY = Math.floor(screenY / this.gridSize) * this.gridSize;
        
        this.objects = this.objects.filter(obj => {
            return !(Math.abs(obj.x - gridX) < 20 && Math.abs(obj.screenY - gridY) < 20);
        });
        
        this.render();
    }
    
    clear() {
        if (confirm('Effacer tous les objets ?')) {
            this.objects = [];
            this.render();
        }
    }
    
    test() {
        if (this.objects.length === 0) {
            alert('Ajoutez des objets avant de tester !');
            return;
        }
        
        const level = this.exportLevel();
        game.loadLevel(level);
        game.resizeCanvas();
        uiManager.showScreen('game');
        setTimeout(() => game.start(), 100);
    }
    
    async save() {
        if (this.objects.length === 0) {
            alert('Ajoutez des objets avant de sauvegarder !');
            return;
        }
        
        const levelName = document.getElementById('levelNameInput').value || 'Niveau Personnalisé';
        const difficulty = document.getElementById('difficultySelect').value;
        
        const level = this.exportLevel();
        level.name = levelName;
        level.difficulty = difficulty;

        uiManager.customLevels.push(level);

        const dataStr = JSON.stringify({ levels: uiManager.customLevels }, null, 2);

        if (window.showOpenFilePicker) {
            try {
                const [handle] = await window.showOpenFilePicker({
                    multiple: false,
                    types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }]
                });
                const writable = await handle.createWritable();
                await writable.write(dataStr);
                await writable.close();
                alert(`Niveau "${levelName}" sauvegardé dans le fichier sélectionné !`);
                return;
            } catch (e) {
                if (e.name === 'AbortError') return;
                console.warn('showOpenFilePicker aborted or failed:', e);
            }
        }

        if (window.showSaveFilePicker) {
            try {
                const handle = await window.showSaveFilePicker({
                    suggestedName: 'levels-custom.json',
                    types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }]
                });
                const writable = await handle.createWritable();
                await writable.write(dataStr);
                await writable.close();
                alert(`Niveau "${levelName}" sauvegardé (fichier créé/enregistré).`);
                return;
            } catch (e) {
                if (e.name === 'AbortError') return;
                console.warn('showSaveFilePicker failed:', e);
            }
        }

        this.downloadAllCustomLevelsJSON();
        alert(`Niveau "${levelName}" ajouté localement. Téléchargement déclenché en fallback.`);
    }
    
    exportLevel() {
        const globalGroundY = window.innerHeight - 100;
        const canvasRect = this.canvas.getBoundingClientRect();

        return {
            id: Date.now(),
            name: document.getElementById('levelNameInput').value || 'Niveau Personnalisé',
            difficulty: document.getElementById('difficultySelect').value,
            objects: this.objects.map(obj => {
                const absoluteY = canvasRect.top + obj.screenY;
                const height = Math.max(0, Math.round(globalGroundY - absoluteY)+1);

                return {
                    type: obj.type,
                    x: obj.x,
                    height: height
                };
            })
        };
    }
    
    downloadAllCustomLevelsJSON() {
        const dataStr = JSON.stringify({ levels: uiManager.customLevels }, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', 'levels-custom.json');
        linkElement.click();
    }
    
    render() {
        this.ctx.fillStyle = '#0a0a1f';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        this.renderGrid();
        this.renderGround();
        this.renderObjects();
        this.renderInfo();
    }
    
    renderGrid() {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 1;
        
        const startX = Math.floor(this.camera.x / this.gridSize) * this.gridSize;
        for (let x = startX - this.camera.x; x < this.width; x += this.gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.height);
            this.ctx.stroke();
        }
        
        for (let y = 0; y < this.height; y += this.gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.width, y);
            this.ctx.stroke();
        }
    }
    
    renderGround() {
        this.ctx.fillStyle = '#333333';
        this.ctx.fillRect(0, this.groundY, this.width, this.height - this.groundY);
        
        this.ctx.strokeStyle = '#00ff88';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.groundY);
        this.ctx.lineTo(this.width, this.groundY);
        this.ctx.stroke();
    }
    
    renderObjects() {
        this.objects.forEach(obj => {
            const x = obj.x - this.camera.x;
            const y = obj.screenY;
            
            if (x > -50 && x < this.width + 50) {
                this.ctx.save();
                this.ctx.translate(x, y);
                
                switch(obj.type) {
                    case 'spike':
                        this.drawSpike();
                        break;
                    case 'orb':
                        this.drawOrb();
                        break;
                    case 'block':
                        this.drawBlock();
                        break;
                }
                
                this.ctx.restore();
            }
        });
    }
    
    drawSpike() {
        this.ctx.fillStyle = '#ff0000';
        this.ctx.strokeStyle = '#cc0000';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(20, 5);
        this.ctx.lineTo(35, 35);
        this.ctx.lineTo(5, 35);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
    }
    
    drawOrb() {
        this.ctx.fillStyle = 'rgba(255, 255, 0, 0.8)';
        this.ctx.beginPath();
        this.ctx.arc(20, 20, 15, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(20, 20, 5, 0, Math.PI * 2);
        this.ctx.fill();
    }
    
    drawBlock() {
        this.ctx.fillStyle = '#666666';
        this.ctx.strokeStyle = '#444444';
        this.ctx.lineWidth = 2;
        this.ctx.fillRect(0, 0, 40, 40);
        this.ctx.strokeRect(0, 0, 40, 40);
    }
    
    renderInfo() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(10, 10, 200, 60);
        
        this.ctx.fillStyle = '#00ff88';
        this.ctx.font = '14px Arial';
        this.ctx.fillText(`Objets: ${this.objects.length}`, 20, 30);
        this.ctx.fillText(`Position: ${Math.round(this.camera.x)}px`, 20, 50);
    }
}

class UIManager {
    constructor() {
        this.screens = {
            menu: document.getElementById('menu'),
            settings: document.getElementById('settings'),
            levelSelect: document.getElementById('levelSelect'),
            editor: document.getElementById('editor'),
            game: document.getElementById('game'),
            gameOver: document.getElementById('gameOver'),
            victory: document.getElementById('victory')
        };
        
        this.buttons = {
            play: document.getElementById('playBtn'),
            settings: document.getElementById('settingsBtn'),
            editor: document.getElementById('editorBtn'),
            custom: document.getElementById('customBtn'),
            back: document.getElementById('backBtn'),
            settingsBack: document.getElementById('settingsBackBtn'),
            editorBack: document.getElementById('editorBackBtn'),
            quit: document.getElementById('quitBtn'),
            retry: document.getElementById('retryBtn'),
            menu: document.getElementById('menuBtn'),
            menu2: document.getElementById('menuBtn2'),
            next: document.getElementById('nextBtn')
        };
        
        this.levelList = document.getElementById('levelList');
        this.levelName = document.getElementById('levelName');
        this.attempts = document.getElementById('attempts');
        this.progressText = document.getElementById('progressText');
        this.victoryAttempts = document.getElementById('victoryAttempts');
        
        this.levels = [];
        this.customLevels = [];
        this.currentLevelIndex = 0;
        this.isCustomMode = false;
        
        this.editor = null;
        
        this.setupEventListeners();
        this.setupSettings();
        this.loadLevels();

        const audioBtn = document.getElementById('audioToggle');
        if (audioBtn) {
            const updateIcon = () => {
                if (window.musicManager && window.musicManager.muted) audioBtn.textContent = '🔈';
                else audioBtn.textContent = '🔊';
            };

            audioBtn.addEventListener('click', () => {
                if (window.musicManager) window.musicManager.toggleMute();
                updateIcon();
            });

            updateIcon();
        }
    }

    setupSettings() {
        const musicVolume = document.getElementById('musicVolume');
        const musicVolumeValue = document.getElementById('musicVolumeValue');
        const sfxVolume = document.getElementById('sfxVolume');
        const sfxVolumeValue = document.getElementById('sfxVolumeValue');
        const gameSpeed = document.getElementById('gameSpeed');
        const gameSpeedValue = document.getElementById('gameSpeedValue');
        const particlesEnabled = document.getElementById('particlesEnabled');
        const backgroundAnimations = document.getElementById('backgroundAnimations');

        // Charger les paramètres sauvegardés
        try {
            const savedMusic = localStorage.getItem('musicVolume');
            if (savedMusic) {
                const vol = parseFloat(savedMusic) * 100;
                musicVolume.value = vol;
                musicVolumeValue.textContent = Math.round(vol) + '%';
            }

            const savedSfx = localStorage.getItem('sfxVolume');
            if (savedSfx) {
                const vol = parseFloat(savedSfx) * 100;
                sfxVolume.value = vol;
                sfxVolumeValue.textContent = Math.round(vol) + '%';
            }

            const savedSpeed = localStorage.getItem('gameSpeed');
            if (savedSpeed) {
                gameSpeed.value = savedSpeed;
                gameSpeedValue.textContent = savedSpeed;
            }

            const savedParticles = localStorage.getItem('particlesEnabled');
            if (savedParticles !== null) {
                particlesEnabled.checked = savedParticles === 'true';
            }

            const savedBgAnim = localStorage.getItem('backgroundAnimations');
            if (savedBgAnim !== null) {
                backgroundAnimations.checked = savedBgAnim === 'true';
            }
        } catch (e) {}

        musicVolume.addEventListener('input', (e) => {
            const vol = e.target.value / 100;
            musicVolumeValue.textContent = e.target.value + '%';
            if (window.musicManager) {
                window.musicManager.setVolume(vol);
            }
        });

        sfxVolume.addEventListener('input', (e) => {
            const vol = e.target.value / 100;
            sfxVolumeValue.textContent = e.target.value + '%';
            game.audio.setVolume(vol);
            try {
                localStorage.setItem('sfxVolume', vol.toString());
            } catch (ex) {}
        });

        gameSpeed.addEventListener('input', (e) => {
            gameSpeedValue.textContent = e.target.value;
            game.gameSpeed = parseFloat(e.target.value);
            try {
                localStorage.setItem('gameSpeed', e.target.value);
            } catch (ex) {}
        });

        particlesEnabled.addEventListener('change', (e) => {
            game.particlesEnabled = e.target.checked;
            try {
                localStorage.setItem('particlesEnabled', e.target.checked ? 'true' : 'false');
            } catch (ex) {}
        });

        backgroundAnimations.addEventListener('change', (e) => {
            game.background.setAnimationEnabled(e.target.checked);
            try {
                localStorage.setItem('backgroundAnimations', e.target.checked ? 'true' : 'false');
            } catch (ex) {}
        });
    }
    
    setupEventListeners() {
        this.buttons.play.addEventListener('click', () => this.showLevelSelect(false));
        this.buttons.settings.addEventListener('click', () => this.showScreen('settings'));
        this.buttons.editor.addEventListener('click', () => this.showEditor());
        this.buttons.custom.addEventListener('click', () => this.showLevelSelect(true));
        this.buttons.back.addEventListener('click', () => this.showScreen('menu'));
        this.buttons.settingsBack.addEventListener('click', () => this.showScreen('menu'));
        this.buttons.editorBack.addEventListener('click', () => this.showScreen('menu'));
        this.buttons.quit.addEventListener('click', () => this.quitGame());
        
        this.buttons.retry.addEventListener('click', () => this.retryLevel());
        this.buttons.menu.addEventListener('click', () => this.showScreen('menu'));
        this.buttons.menu2.addEventListener('click', () => this.showScreen('menu'));
        this.buttons.next.addEventListener('click', () => this.nextLevel());
        
        window.addEventListener('gameover', (e) => this.onGameOver(e.detail));
        window.addEventListener('victory', (e) => this.onVictory(e.detail));
    }
    
    async loadLevels() {
        try {
            const response = await fetch('levels.json');
            const data = await response.json();
            this.levels = data.levels;
            
            try {
                const customResponse = await fetch('levels-custom.json');
                const customData = await customResponse.json();
                this.customLevels = customData.levels || [];
            } catch (e) {
                console.log('Pas de niveaux personnalisés');
                this.customLevels = [];
            }
        } catch (error) {
            console.error('Erreur de chargement des niveaux:', error);
            this.levels = [{
                id: 1,
                name: "Niveau 1",
                difficulty: "Facile",
                theme: "default",
                objects: this.generateDefaultLevel()
            }];
        }
    }
    
    generateDefaultLevel() {
        const objects = [];
        let x = 400;
        
        for (let i = 0; i < 10; i++) {
            objects.push({
                type: 'spike',
                x: x,
                height: 40
            });
            x += 200 + Math.random() * 200;
            
            if (Math.random() > 0.5) {
                objects.push({
                    type: 'orb',
                    x: x - 100,
                    height: 150
                });
            }
        }
        
        return objects;
    }
    
    showScreen(screenName) {
        Object.values(this.screens).forEach(screen => {
            screen.classList.remove('active');
        });
        
        if (this.screens[screenName]) {
            this.screens[screenName].classList.add('active');
        }
        
        if (screenName !== 'game') {
            game.stop();
        }

        if (screenName === 'menu') {
            if (window.musicManager) window.musicManager.fadeTo('musiques/home.mp3');
        } else if (screenName === 'settings' || screenName === 'levelSelect' || screenName === 'editor') {
            // Garder la musique actuelle
        }
    }
    
    showEditor() {
        this.showScreen('editor');
        
        if (!this.editor) {
            this.editor = new LevelEditor();
        } else {
            this.editor.resizeCanvas();
        }
    }
    
    showLevelSelect(customMode = false) {
        this.isCustomMode = customMode;
        const levelsToShow = customMode ? this.customLevels : this.levels;
        
        this.levelList.innerHTML = '';
        
        if (levelsToShow.length === 0) {
            this.levelList.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 2rem;">Aucun niveau disponible. Créez-en un dans l\'éditeur !</p>';
        } else {
            levelsToShow.forEach((level, index) => {
                const levelItem = document.createElement('div');
                levelItem.className = 'level-item';
                levelItem.innerHTML = `
                    <h3>${level.name}</h3>
                    <p>${level.difficulty}</p>
                `;
                
                levelItem.addEventListener('click', () => this.startLevel(index));
                this.levelList.appendChild(levelItem);
            });
        }
        
        this.showScreen('levelSelect');
    }
    
    startLevel(index) {
        this.currentLevelIndex = index;
        const levels = this.isCustomMode ? this.customLevels : this.levels;
        const level = levels[index];
        
        if (!level) return;
        
        game.loadLevel(level);
        game.resizeCanvas();
        
        this.levelName.textContent = level.name;
        this.updateAttempts();
        
        this.showScreen('game');
        
        setTimeout(() => {
            if (level && level.music && window.musicManager) {
                window.musicManager.fadeTo(level.music);
            } else if (window.musicManager) {
                window.musicManager.fadeOut(300);
            }

            game.start();
        }, 100);
    }
    
    retryLevel() {
        this.showScreen('game');
        setTimeout(() => {
            game.start();
        }, 100);
        this.updateAttempts();
    }
    
    nextLevel() {
        const levels = this.isCustomMode ? this.customLevels : this.levels;
        
        if (this.currentLevelIndex < levels.length - 1) {
            this.startLevel(this.currentLevelIndex + 1);
        } else {
            this.showScreen('menu');
        }
    }
    
    quitGame() {
        game.stop();
        this.showScreen('menu');
    }
    
    updateAttempts() {
        this.attempts.textContent = `Tentatives: ${game.attempts}`;
    }
    
    onGameOver(detail) {
        this.progressText.textContent = `Progression: ${detail.progress}%`;
        
        setTimeout(() => {
            this.showScreen('gameOver');
        }, 500);
        
        this.updateAttempts();
    }
    
    onVictory(detail) {
        this.victoryAttempts.textContent = `Tentatives: ${detail.attempts}`;
        
        setTimeout(() => {
            this.showScreen('victory');
        }, 500);
    }
}

let uiManager;

window.addEventListener('DOMContentLoaded', () => {
    uiManager = new UIManager();
    if (window.musicManager) window.musicManager.fadeTo('musiques/home.mp3');
});