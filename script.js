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
        
        // Events souris
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', () => this.onMouseUp());
        this.canvas.addEventListener('wheel', (e) => this.onWheel(e));
        
        // Prévenir le menu contextuel
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    
    setupControls() {
        // Boutons de sélection d'objet
        document.querySelectorAll('.obj-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.obj-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.selectedType = e.target.dataset.type;
            });
        });
        
        // Boutons d'action
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
        
        if (e.button === 0) { // Clic gauche - placer objet
            this.placeObject(x, y);
        } else if (e.button === 1 || (e.button === 0 && e.shiftKey)) { // Clic milieu ou Shift+clic - déplacer vue
            this.isDragging = true;
            this.lastMouseX = x;
        } else if (e.button === 2) { // Clic droit - supprimer
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
        // Convertir en coordonnées monde
        const worldX = screenX + this.camera.x;
        
        // Snap à la grille - aligner au coin supérieur gauche de la case
        const gridX = Math.floor(worldX / this.gridSize) * this.gridSize;
        const gridY = Math.floor(screenY / this.gridSize) * this.gridSize;
        
        // Ne pas placer en dehors du niveau (au-dessus du sol)
        if (gridY >= this.groundY - this.gridSize) return;
        
        // Vérifier si un objet existe déjà à cette position exacte
        const existing = this.objects.find(obj => 
            Math.abs(obj.x - gridX) < 20 && Math.abs(obj.screenY - gridY) < 20
        );
        
        if (!existing) {
            // Calculer la hauteur pour l'alignement au sol
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
        
        // Snap à la grille pour supprimer précisément
        const gridX = Math.floor(worldX / this.gridSize) * this.gridSize;
        const gridY = Math.floor(screenY / this.gridSize) * this.gridSize;
        
        this.objects = this.objects.filter(obj => {
            // Supprimer l'objet sur la case cliquée
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

        // Ajouter aux niveaux personnalisés
        uiManager.customLevels.push(level);

        // Préparer le JSON à écrire
        const dataStr = JSON.stringify({ levels: uiManager.customLevels }, null, 2);

        // Tentative : File System Access API — ouvrir le fichier existant pour écriture
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

        // Si l'ouverture du fichier a échoué ou n'est pas disponible, proposer un save picker
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

        // Fallback final : déclencher le téléchargement du fichier JSON
        this.downloadAllCustomLevelsJSON();
        alert(`Niveau "${levelName}" ajouté localement. Téléchargement déclenché en fallback.`);
    }
    
    exportLevel() {
        // Pour corriger le décalage entre l'éditeur (qui a son propre canvas/toolbar)
        // et le canvas de jeu, calculer la hauteur des objets par rapport au
        // sol global attendu par le moteur (`window.innerHeight - 100`).
        const globalGroundY = window.innerHeight - 100;
        const canvasRect = this.canvas.getBoundingClientRect();

        return {
            id: Date.now(),
            name: document.getElementById('levelNameInput').value || 'Niveau Personnalisé',
            difficulty: document.getElementById('difficultySelect').value,
            objects: this.objects.map(obj => {
                // Position absolue Y (par rapport au haut de la fenêtre)
                const absoluteY = canvasRect.top + obj.screenY;
                // Hauteur du sommet de l'objet jusqu'au sol global
                const height = Math.max(0, Math.round(globalGroundY - absoluteY)+1);

                return {
                    type: obj.type,
                    x: obj.x,
                    height: height
                };
            })
        };
    }
    
    downloadJSON(level) {
        const dataStr = JSON.stringify({ levels: [level] }, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

        const exportFileDefaultName = `${level.name.replace(/\s+/g, '_')}.json`;

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    }
    
    // Télécharge tous les niveaux personnalisés en fallback
    downloadAllCustomLevelsJSON() {
        const dataStr = JSON.stringify({ levels: uiManager.customLevels }, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', 'levels-custom.json');
        linkElement.click();
    }
    render() {
        // Fond
        this.ctx.fillStyle = '#0a0a1f';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Grille
        this.renderGrid();
        
        // Sol
        this.renderGround();
        
        // Objets
        this.renderObjects();
        
        // Info caméra
        this.renderInfo();
    }
    
    renderGrid() {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 1;
        
        // Lignes verticales
        const startX = Math.floor(this.camera.x / this.gridSize) * this.gridSize;
        for (let x = startX - this.camera.x; x < this.width; x += this.gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.height);
            this.ctx.stroke();
        }
        
        // Lignes horizontales
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
        // Écrans
        this.screens = {
            menu: document.getElementById('menu'),
            levelSelect: document.getElementById('levelSelect'),
            editor: document.getElementById('editor'),
            game: document.getElementById('game'),
            gameOver: document.getElementById('gameOver'),
            victory: document.getElementById('victory')
        };
        
        // Boutons
        this.buttons = {
            play: document.getElementById('playBtn'),
            editor: document.getElementById('editorBtn'),
            custom: document.getElementById('customBtn'),
            back: document.getElementById('backBtn'),
            editorBack: document.getElementById('editorBackBtn'),
            quit: document.getElementById('quitBtn'),
            retry: document.getElementById('retryBtn'),
            menu: document.getElementById('menuBtn'),
            menu2: document.getElementById('menuBtn2'),
            next: document.getElementById('nextBtn')
        };
        
        // Éléments
        this.levelList = document.getElementById('levelList');
        this.levelName = document.getElementById('levelName');
        this.attempts = document.getElementById('attempts');
        this.progressText = document.getElementById('progressText');
        this.victoryAttempts = document.getElementById('victoryAttempts');
        
        // Données
        this.levels = [];
        this.customLevels = [];
        this.currentLevelIndex = 0;
        this.isCustomMode = false;
        
        // Éditeur
        this.editor = null;
        
        // Initialisation
        this.setupEventListeners();
        this.loadLevels();

        // Bouton audio (mute/unmute)
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
    
    setupEventListeners() {
        // Navigation
        this.buttons.play.addEventListener('click', () => this.showLevelSelect(false));
        this.buttons.editor.addEventListener('click', () => this.showEditor());
        this.buttons.custom.addEventListener('click', () => this.showLevelSelect(true));
        this.buttons.back.addEventListener('click', () => this.showScreen('menu'));
        this.buttons.editorBack.addEventListener('click', () => this.showScreen('menu'));
        this.buttons.quit.addEventListener('click', () => this.quitGame());
        
        // Gameplay
        this.buttons.retry.addEventListener('click', () => this.retryLevel());
        this.buttons.menu.addEventListener('click', () => this.showScreen('menu'));
        this.buttons.menu2.addEventListener('click', () => this.showScreen('menu'));
        this.buttons.next.addEventListener('click', () => this.nextLevel());
        
        // Événements du jeu
        window.addEventListener('gameover', (e) => this.onGameOver(e.detail));
        window.addEventListener('victory', (e) => this.onVictory(e.detail));
    }
    
    async loadLevels() {
        try {
            // Charger les niveaux prédéfinis
            const response = await fetch('levels.json');
            const data = await response.json();
            this.levels = data.levels;
            
            // Charger les niveaux personnalisés
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
                objects: this.generateDefaultLevel()
            }];
        }
    }

    // Sauvegarde des niveaux personnalisés sur le disque
    async saveCustomLevelsToFile() {
        const dataStr = JSON.stringify({ levels: this.customLevels }, null, 2);

        // Utiliser File System Access API si disponible (permet d'écrire directement)
        if (window.showSaveFilePicker) {
            const opts = {
                suggestedName: 'levels-custom.json',
                types: [
                    {
                        description: 'JSON',
                        accept: { 'application/json': ['.json'] }
                    }
                ]
            };

            const handle = await window.showSaveFilePicker(opts);
            const writable = await handle.createWritable();
            await writable.write(dataStr);
            await writable.close();
            return;
        }

        // Si pas disponible, rejeter pour que l'appelant puisse effectuer un fallback (download)
        return Promise.reject(new Error('File System Access API non disponible'));
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
        // Cacher tous les écrans
        Object.values(this.screens).forEach(screen => {
            screen.classList.remove('active');
        });
        
        // Afficher l'écran demandé
        if (this.screens[screenName]) {
            this.screens[screenName].classList.add('active');
        }
        
        // Arrêter le jeu si on quitte l'écran de jeu
        if (screenName !== 'game') {
            game.stop();
        }

        // Gérer la musique selon l'écran
        if (screenName === 'menu') {
            // Musique d'accueil
            if (window.musicManager) window.musicManager.fadeTo('musiques/home.mp3');
        } else if (screenName === 'levelSelect' || screenName === 'editor') {
            // Garder musique d'accueil ou couper si souhaité
        }
    }
    
    showEditor() {
        this.showScreen('editor');
        
        // Initialiser l'éditeur si ce n'est pas déjà fait
        if (!this.editor) {
            this.editor = new LevelEditor();
        } else {
            this.editor.resizeCanvas();
        }
    }
    
    showLevelSelect(customMode = false) {
        this.isCustomMode = customMode;
        const levelsToShow = customMode ? this.customLevels : this.levels;
        
        // Vider la liste
        this.levelList.innerHTML = '';
        
        // Vérifier s'il y a des niveaux
        if (levelsToShow.length === 0) {
            this.levelList.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 2rem;">Aucun niveau disponible. Créez-en un dans l\'éditeur !</p>';
        } else {
            // Créer les éléments de niveau
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
        
        // Charger le niveau dans le moteur
        game.loadLevel(level);
        
        // Mettre à jour l'interface
        this.levelName.textContent = level.name;
        this.updateAttempts();
        
        // Afficher l'écran de jeu et démarrer
        this.showScreen('game');
        
        // Petit délai pour laisser l'écran s'afficher
        setTimeout(() => {
            // Charger la musique du niveau si renseignée
            if (level && level.music && window.musicManager) {
                window.musicManager.fadeTo(level.music);
            } else if (window.musicManager) {
                // si pas de musique définie, arrêter la musique d'arrière-plan
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
            // Retour au menu si c'était le dernier niveau
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
        
        // Petit délai pour voir l'explosion
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

// Initialiser l'interface quand le DOM est prêt
let uiManager;

window.addEventListener('DOMContentLoaded', () => {
    uiManager = new UIManager();
    // Tentative de lancer la musique d'accueil (sera silencieux si le navigateur bloque l'autoplay)
    if (window.musicManager) window.musicManager.fadeTo('musiques/home.mp3');
});