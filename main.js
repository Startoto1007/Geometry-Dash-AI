/**
 * GEOMETRY DASH AI - MOTEUR DE JEU
 * Gère la physique, les collisions, le rendu et la logique du jeu
 */

// Système audio simple (sons générés)
class AudioSystem {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        this.volume = 1.0;
        this.init();
    }
    
    init() {
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log('Audio non disponible');
            this.enabled = false;
        }
    }
    
    setVolume(vol) {
        this.volume = Math.max(0, Math.min(1, vol));
    }
    
    playJump() {
        if (!this.enabled || !this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.frequency.value = 400;
        osc.type = 'square';
        gain.gain.setValueAtTime(0.3 * this.volume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
        
        osc.start(this.ctx.currentTime);
        osc.stop(this.ctx.currentTime + 0.1);
    }
    
    playDeath() {
        if (!this.enabled || !this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.frequency.setValueAtTime(400, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.5);
        osc.type = 'sawtooth';
        gain.gain.setValueAtTime(0.3 * this.volume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);
        
        osc.start(this.ctx.currentTime);
        osc.stop(this.ctx.currentTime + 0.5);
    }
    
    playOrb() {
        if (!this.enabled || !this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.frequency.value = 800;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.2 * this.volume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
        
        osc.start(this.ctx.currentTime);
        osc.stop(this.ctx.currentTime + 0.15);
    }
    
    playWin() {
        if (!this.enabled || !this.ctx) return;
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C, E, G, C
        
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.frequency.value = freq;
            osc.type = 'sine';
            
            const startTime = this.ctx.currentTime + i * 0.15;
            gain.gain.setValueAtTime(0.2 * this.volume, startTime);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);
            
            osc.start(startTime);
            osc.stop(startTime + 0.3);
        });
    }
}

// Gestion de la musique de fond
class MusicManager {
    constructor() {
        this.audio = null;
        this.muted = false;
        this.volume = 0.7;
        this.fadeInterval = null;

        try {
            const stored = localStorage.getItem('audioMuted');
            if (stored !== null) this.muted = stored === 'true';
            const storedVol = localStorage.getItem('musicVolume');
            if (storedVol !== null) this.volume = parseFloat(storedVol);
        } catch (e) {}
    }

    load(src) {
        if (!src) return;
        if (this.audio && this.audio.src && this.audio.src.indexOf(src) !== -1) return;

        this.stop();
        this.audio = new Audio(src);
        this.audio.loop = true;
        this.audio.volume = this.muted ? 0 : this.volume;
        this.audio.preload = 'auto';
        const p = this.audio.play();
        if (p && p.catch) p.catch(() => {});
    }

    play() {
        if (!this.audio) return;
        if (this.muted) return;
        const p = this.audio.play();
        if (p && p.catch) p.catch(() => {});
    }

    pause() {
        if (!this.audio) return;
        try { this.audio.pause(); } catch (e) {}
    }

    stop() {
        if (!this.audio) return;
        try {
            this.audio.pause();
            this.audio.currentTime = 0;
        } catch (e) {}
        this.audio = null;
    }

    setMuted(v) {
        this.muted = !!v;
        try { localStorage.setItem('audioMuted', this.muted ? 'true' : 'false'); } catch (e) {}
        if (this.audio) this.audio.volume = this.muted ? 0 : this.volume;
    }

    setVolume(v) {
        this.volume = Math.max(0, Math.min(1, v));
        try { localStorage.setItem('musicVolume', this.volume.toString()); } catch (e) {}
        if (this.audio && !this.muted) this.audio.volume = this.volume;
    }

    toggleMute() {
        this.setMuted(!this.muted);
    }

    fadeTo(src, duration = 500) {
        if (!src) {
            this.fadeOut(duration);
            return;
        }

        if (this.audio && this.audio.src && this.audio.src.indexOf(src) !== -1) {
            return;
        }

        this.fadeOut(duration / 2, () => {
            this.load(src);
            if (this.audio) {
                this.audio.volume = 0;
                if (!this.muted) this.fadeIn(duration / 2);
            }
        });
    }

    fadeOut(duration = 500, cb) {
        if (!this.audio) {
            if (cb) cb();
            return;
        }

        const steps = 20;
        const stepTime = Math.max(10, Math.floor(duration / steps));
        let i = 0;
        const startVol = this.audio.volume || 0;
        clearInterval(this.fadeInterval);
        this.fadeInterval = setInterval(() => {
            i++;
            const t = i / steps;
            const vol = startVol * (1 - t);
            try { this.audio.volume = Math.max(0, vol); } catch (e) {}
            if (i >= steps) {
                clearInterval(this.fadeInterval);
                try { this.audio.pause(); this.audio.currentTime = 0; } catch (e) {}
                this.audio = null;
                if (cb) cb();
            }
        }, stepTime);
    }

    fadeIn(duration = 500) {
        if (!this.audio) return;
        const steps = 20;
        const stepTime = Math.max(10, Math.floor(duration / steps));
        let i = 0;
        clearInterval(this.fadeInterval);
        this.fadeInterval = setInterval(() => {
            i++;
            const t = i / steps;
            const vol = (this.volume || 1) * t;
            try { if (!this.muted) this.audio.volume = Math.min(this.volume, vol); } catch (e) {}
            if (i >= steps) {
                clearInterval(this.fadeInterval);
            }
        }, stepTime);
    }
}

// Instance globale de la musique
const musicManager = new MusicManager();
window.musicManager = musicManager;

// Arrière-plans animés pour chaque niveau
class BackgroundRenderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.width = 0;
        this.height = 0;
        this.theme = 'default';
        this.time = 0;
        this.animationEnabled = true;
        this.resizeCanvas();
    }

    resizeCanvas() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    }

    setTheme(themeName) {
        this.theme = themeName || 'default';
    }

    setAnimationEnabled(enabled) {
        this.animationEnabled = enabled;
    }

    render(cameraX) {
        this.time += 0.016;

        if (!this.animationEnabled) {
            this.renderStatic();
            return;
        }

        switch(this.theme) {
            case 'awakening':
                this.renderAwakening(cameraX);
                break;
            case 'firstjumps':
                this.renderFirstJumps(cameraX);
                break;
            case 'electric':
                this.renderElectric(cameraX);
                break;
            case 'cosmic':
                this.renderCosmic(cameraX);
                break;
            case 'neon':
                this.renderNeon(cameraX);
                break;
            case 'hypnotic':
                this.renderHypnotic(cameraX);
                break;
            case 'stellar':
                this.renderStellar(cameraX);
                break;
            case 'parallel':
                this.renderParallel(cameraX);
                break;
            case 'digital':
                this.renderDigital(cameraX);
                break;
            default:
                this.renderDefault();
        }
    }

    renderStatic() {
        this.ctx.fillStyle = '#0a0a1f';
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    renderDefault() {
        this.ctx.fillStyle = '#0a0a1f';
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    // L'Éveil - Aurore douce avec étoiles scintillantes
    renderAwakening(cameraX) {
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
        gradient.addColorStop(0, '#1a0033');
        gradient.addColorStop(0.5, '#330066');
        gradient.addColorStop(1, '#0a0a1f');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Étoiles scintillantes
        this.ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 80; i++) {
            const x = (i * 137 + cameraX * 0.05) % this.width;
            const y = (i * 97) % this.height;
            const twinkle = Math.sin(this.time * 3 + i) * 0.5 + 0.5;
            this.ctx.globalAlpha = twinkle;
            this.ctx.fillRect(x, y, 2, 2);
        }
        this.ctx.globalAlpha = 1;
    }

    // Premiers Bonds - Ciel bleu-violet avec nuages
    renderFirstJumps(cameraX) {
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
        gradient.addColorStop(0, '#1e1e4d');
        gradient.addColorStop(0.6, '#3d3d7a');
        gradient.addColorStop(1, '#0a0a1f');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Nuages stylisés
        this.ctx.fillStyle = 'rgba(100, 100, 150, 0.3)';
        for (let i = 0; i < 5; i++) {
            const x = (i * 300 - cameraX * 0.3) % (this.width + 200) - 100;
            const y = 100 + i * 60;
            this.ctx.beginPath();
            this.ctx.arc(x, y, 50, 0, Math.PI * 2);
            this.ctx.arc(x + 40, y, 40, 0, Math.PI * 2);
            this.ctx.arc(x + 70, y, 35, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    // Vagues Électriques - Lightning et grille néon
    renderElectric(cameraX) {
        this.ctx.fillStyle = '#000033';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Grille néon animée
        this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.2)';
        this.ctx.lineWidth = 1;
        const gridSize = 50;
        const offsetX = cameraX * 0.5 % gridSize;
        
        for (let x = -offsetX; x < this.width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.height);
            this.ctx.stroke();
        }

        for (let y = 0; y < this.height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.width, y);
            this.ctx.stroke();
        }

        // Éclairs aléatoires
        if (Math.random() < 0.02) {
            this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.8)';
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            const startX = Math.random() * this.width;
            this.ctx.moveTo(startX, 0);
            for (let i = 0; i < 5; i++) {
                this.ctx.lineTo(startX + (Math.random() - 0.5) * 100, i * 100);
            }
            this.ctx.stroke();
        }
    }

    // Cascade Cosmique - Nébuleuse colorée
    renderCosmic(cameraX) {
        const gradient = this.ctx.createRadialGradient(
            this.width / 2, this.height / 2, 0,
            this.width / 2, this.height / 2, this.width
        );
        gradient.addColorStop(0, '#1a0033');
        gradient.addColorStop(0.5, '#33004d');
        gradient.addColorStop(1, '#0a0020');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Nébuleuse animée
        for (let i = 0; i < 30; i++) {
            const x = (i * 100 - cameraX * 0.2 + Math.sin(this.time + i) * 50) % (this.width + 200);
            const y = (i * 80 + Math.cos(this.time + i) * 30) % this.height;
            const hue = (i * 30 + this.time * 10) % 360;
            
            const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, 50);
            gradient.addColorStop(0, `hsla(${hue}, 100%, 50%, 0.3)`);
            gradient.addColorStop(1, `hsla(${hue}, 100%, 50%, 0)`);
            
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(x - 50, y - 50, 100, 100);
        }
    }

    // Tempête Néon - Lignes néon vibrantes
    renderNeon(cameraX) {
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Lignes néon horizontales animées
        for (let i = 0; i < 20; i++) {
            const y = (i * 60 + this.time * 50) % (this.height + 100);
            const gradient = this.ctx.createLinearGradient(0, y, this.width, y);
            const hue = (i * 30 + this.time * 20) % 360;
            gradient.addColorStop(0, `hsla(${hue}, 100%, 50%, 0)`);
            gradient.addColorStop(0.5, `hsla(${hue}, 100%, 50%, 0.5)`);
            gradient.addColorStop(1, `hsla(${hue}, 100%, 50%, 0)`);
            
            this.ctx.strokeStyle = gradient;
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.width, y);
            this.ctx.stroke();
        }
    }

    // Flux Hypnotique - Spirale hypnotique
    renderHypnotic(cameraX) {
        this.ctx.fillStyle = '#0a0020';
        this.ctx.fillRect(0, 0, this.width, this.height);

        const centerX = this.width / 2;
        const centerY = this.height / 2;

        // Cercles concentriques tournants
        for (let i = 0; i < 15; i++) {
            const radius = 50 + i * 40;
            const rotation = this.time * (i % 2 === 0 ? 1 : -1);
            const hue = (i * 25 + this.time * 30) % 360;
            
            this.ctx.strokeStyle = `hsla(${hue}, 100%, 50%, 0.3)`;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            
            for (let angle = 0; angle < Math.PI * 2; angle += 0.1) {
                const x = centerX + Math.cos(angle + rotation) * radius;
                const y = centerY + Math.sin(angle + rotation) * radius;
                if (angle === 0) {
                    this.ctx.moveTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }
            }
            this.ctx.closePath();
            this.ctx.stroke();
        }
    }

    // Odyssée Stellaire - Champ d'étoiles en mouvement
    renderStellar(cameraX) {
        this.ctx.fillStyle = '#000011';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Étoiles filantes
        for (let i = 0; i < 100; i++) {
            const x = (i * 50 - cameraX * 0.8 - this.time * 100) % (this.width + 200);
            const y = (i * 37) % this.height;
            const length = 30 + Math.sin(i) * 20;
            
            const gradient = this.ctx.createLinearGradient(x, y, x + length, y);
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0.8)');
            
            this.ctx.strokeStyle = gradient;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(x, y);
            this.ctx.lineTo(x + length, y);
            this.ctx.stroke();
        }

        // Planètes lointaines
        for (let i = 0; i < 5; i++) {
            const x = (i * 250 - cameraX * 0.1) % this.width;
            const y = 100 + i * 80;
            const radius = 20 + i * 10;
            const hue = i * 60;
            
            const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, radius);
            gradient.addColorStop(0, `hsla(${hue}, 70%, 60%, 0.8)`);
            gradient.addColorStop(1, `hsla(${hue}, 70%, 30%, 0.3)`);
            
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(x, y, radius, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    // Dimension Parallèle - Effet de distorsion
    renderParallel(cameraX) {
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
        gradient.addColorStop(0, '#1a001a');
        gradient.addColorStop(0.5, '#330033');
        gradient.addColorStop(1, '#0a000a');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Bandes ondulantes
        for (let y = 0; y < this.height; y += 20) {
            const offset = Math.sin(y * 0.05 + this.time * 2) * 50;
            const hue = (y + this.time * 50) % 360;
            
            this.ctx.fillStyle = `hsla(${hue}, 100%, 50%, 0.1)`;
            this.ctx.fillRect(offset - cameraX * 0.3 % this.width, y, this.width, 10);
        }
    }

    // Maelström Digital - Matrice digitale
    renderDigital(cameraX) {
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Pluie de code Matrix
        this.ctx.font = '14px monospace';
        this.ctx.fillStyle = 'rgba(0, 255, 100, 0.8)';
        
        for (let i = 0; i < 50; i++) {
            const x = (i * 30) % this.width;
            const offset = (this.time * 200 + i * 100) % (this.height + 100);
            
            for (let j = 0; j < 10; j++) {
                const y = offset - j * 20;
                const alpha = 1 - (j / 10);
                this.ctx.globalAlpha = alpha;
                const char = String.fromCharCode(0x30A0 + Math.random() * 96);
                this.ctx.fillText(char, x, y);
            }
        }
        this.ctx.globalAlpha = 1;

        // Lignes de données horizontales
        this.ctx.strokeStyle = 'rgba(0, 255, 100, 0.2)';
        this.ctx.lineWidth = 1;
        for (let i = 0; i < 5; i++) {
            const y = (this.time * 100 + i * 150) % this.height;
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.width, y);
            this.ctx.stroke();
        }
    }
}

class GameEngine {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Arrière-plan animé
        this.background = new BackgroundRenderer('backgroundCanvas');
        
        // Audio
        this.audio = new AudioSystem();
        
        // Configuration
        this.width = 0;
        this.height = 0;
        this.resizeCanvas();
        
        // État du jeu
        this.isRunning = false;
        this.isPaused = false;
        this.gameSpeed = 5;
        this.gravity = 0.8;
        this.jumpForce = -15;
        
        // Joueur
        this.player = {
            x: 150,
            y: 0,
            width: 40,
            height: 40,
            velocityY: 0,
            isJumping: false,
            onGround: false,
            rotation: 0
        };
        
        // Niveau
        this.currentLevel = null;
        this.levelData = [];
        this.camera = { x: 0, y: 0 };
        this.groundY = 0;
        
        // Particules
        this.particles = [];
        this.particlesEnabled = true;
        
        // Stats
        this.attempts = 0;
        this.progress = 0;
        this.levelLength = 0;
        
        // Input
        this.keys = {};
        this.setupInput();
        
        // Animation
        this.lastTime = 0;
        this.animationId = null;

        // Charger les paramètres
        this.loadSettings();
    }

    loadSettings() {
        try {
            const speed = localStorage.getItem('gameSpeed');
            if (speed) this.gameSpeed = parseFloat(speed);

            const particles = localStorage.getItem('particlesEnabled');
            if (particles !== null) this.particlesEnabled = particles === 'true';

            const sfxVol = localStorage.getItem('sfxVolume');
            if (sfxVol) this.audio.setVolume(parseFloat(sfxVol));

            const bgAnim = localStorage.getItem('backgroundAnimations');
            if (bgAnim !== null) this.background.setAnimationEnabled(bgAnim === 'true');
        } catch (e) {}
    }
    
    setupInput() {
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && this.isRunning) {
                e.preventDefault();
                this.jump();
            }
        });
        
        this.canvas.addEventListener('mousedown', () => {
            if (this.isRunning) this.jump();
        });
        
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (this.isRunning) this.jump();
        });
    }
    
    resizeCanvas() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.groundY = this.height - 100;
        
        if (this.background) {
            this.background.resizeCanvas();
        }
    }
    
    loadLevel(levelData) {
        this.currentLevel = levelData;
        this.levelData = JSON.parse(JSON.stringify(levelData.objects || []));
        this.attempts = 0;
        this.resetPlayer();
        
        this.levelLength = 0;
        this.levelData.forEach(obj => {
            if (obj.x > this.levelLength) this.levelLength = obj.x;
        });
        this.levelLength += 200;

        // Définir le thème de l'arrière-plan
        if (levelData.theme) {
            this.background.setTheme(levelData.theme);
        }
    }
    
    resetPlayer() {
        this.player.x = 150;
        this.player.y = this.groundY - this.player.height;
        this.player.velocityY = 0;
        this.player.isJumping = false;
        this.player.onGround = true;
        this.player.rotation = 0;
        this.camera.x = 0;
        this.progress = 0;
        
        this.levelData.forEach(obj => {
            if (obj.type === 'orb') {
                obj.used = false;
            }
        });
    }
    
    start() {
        this.isRunning = true;
        this.isPaused = false;
        this.attempts++;
        this.resetPlayer();
        this.particles = [];
        this.gameLoop(0);
    }
    
    stop() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
    }
    
    jump() {
        if (!this.isRunning || this.isPaused) return;
        
        if (this.player.onGround) {
            this.player.velocityY = this.jumpForce;
            this.player.isJumping = true;
            this.player.onGround = false;
            if (this.particlesEnabled) this.createJumpParticles();
            this.audio.playJump();
        }
    }
    
    update(deltaTime) {
        if (this.isPaused) return;
        
        this.camera.x += this.gameSpeed;
        
        this.player.velocityY += this.gravity;
        this.player.y += this.player.velocityY;
        
        if (!this.player.onGround) {
            this.player.rotation += 5;
        } else {
            this.player.rotation = Math.round(this.player.rotation / 90) * 90;
        }
        
        if (this.player.y >= this.groundY - this.player.height) {
            this.player.y = this.groundY - this.player.height;
            this.player.velocityY = 0;
            this.player.onGround = true;
            this.player.isJumping = false;
        }
        
        this.checkCollisions();
        
        this.updateParticles();
        
        this.progress = Math.min(100, (this.camera.x / this.levelLength) * 100);
        
        if (this.camera.x >= this.levelLength) {
            this.win();
        }
    }
    
    checkCollisions() {
        this.levelData.forEach(obj => {
            const objScreenX = obj.x - this.camera.x;
            const objScreenY = this.groundY - obj.height;
            
            if (objScreenX > this.player.x - 100 && objScreenX < this.player.x + 100) {
                switch(obj.type) {
                    case 'spike':
                        if (this.spikeCollision(
                            this.player.x, this.player.y, this.player.width, this.player.height,
                            objScreenX, objScreenY
                        )) {
                            this.die();
                        }
                        break;
                    
                    case 'orb':
                        if (!obj.used && this.circleBoxCollision(
                            this.player.x, this.player.y, this.player.width, this.player.height,
                            objScreenX + 20, objScreenY + 20, 15
                        )) {
                            obj.used = true;
                            this.player.velocityY = this.jumpForce * 0.8;
                            if (this.particlesEnabled) this.createOrbParticles(objScreenX, objScreenY);
                            this.audio.playOrb();
                        }
                        break;
                    
                    case 'block':
                        this.handleBlockCollision(objScreenX, objScreenY, 40, 40);
                        break;
                }
            }
        });
    }
    
    boxCollision(x1, y1, w1, h1, x2, y2, w2, h2) {
        const margin = 2;
        return x1 + margin < x2 + w2 - margin &&
               x1 + w1 - margin > x2 + margin &&
               y1 + margin < y2 + h2 - margin &&
               y1 + h1 - margin > y2 + margin;
    }
    
    spikeCollision(px, py, pw, ph, sx, sy) {
        const spikeTop = { x: sx + 20, y: sy + 5 };
        const spikeBottomLeft = { x: sx + 5, y: sy + 35 };
        const spikeBottomRight = { x: sx + 35, y: sy + 35 };
        
        const hitboxMargin = 8;
        const hitbox = {
            x: px + hitboxMargin,
            y: py + hitboxMargin,
            w: pw - hitboxMargin * 2,
            h: ph - hitboxMargin * 2
        };
        
        const corners = [
            { x: hitbox.x, y: hitbox.y },
            { x: hitbox.x + hitbox.w, y: hitbox.y },
            { x: hitbox.x, y: hitbox.y + hitbox.h },
            { x: hitbox.x + hitbox.w, y: hitbox.y + hitbox.h }
        ];
        
        for (let corner of corners) {
            if (this.pointInTriangle(corner, spikeTop, spikeBottomLeft, spikeBottomRight)) {
                return true;
            }
        }
        
        return false;
    }
    
    pointInTriangle(p, p0, p1, p2) {
        const s = (p0.x - p2.x) * (p.y - p2.y) - (p0.y - p2.y) * (p.x - p2.x);
        const t = (p1.x - p0.x) * (p.y - p0.y) - (p1.y - p0.y) * (p.x - p0.x);
        
        if ((s < 0) !== (t < 0) && s !== 0 && t !== 0)
            return false;
        
        const d = (p2.x - p1.x) * (p.y - p1.y) - (p2.y - p1.y) * (p.x - p1.x);
        return d === 0 || (d < 0) === (s + t <= 0);
    }
    
    circleBoxCollision(bx, by, bw, bh, cx, cy, radius) {
        const closestX = Math.max(bx, Math.min(cx, bx + bw));
        const closestY = Math.max(by, Math.min(cy, by + bh));
        
        const distanceX = cx - closestX;
        const distanceY = cy - closestY;
        const distanceSquared = distanceX * distanceX + distanceY * distanceY;
        
        return distanceSquared < (radius * radius);
    }
    
    handleBlockCollision(bx, by, bw, bh) {
        if (this.boxCollision(
            this.player.x, this.player.y, this.player.width, this.player.height,
            bx, by, bw, bh
        )) {
            const overlapLeft = (this.player.x + this.player.width) - bx;
            const overlapRight = (bx + bw) - this.player.x;
            const overlapTop = (this.player.y + this.player.height) - by;
            const overlapBottom = (by + bh) - this.player.y;
            
            const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
            
            if (minOverlap === overlapTop && this.player.velocityY > 0) {
                this.player.y = by - this.player.height;
                this.player.velocityY = 0;
                this.player.onGround = true;
                this.player.isJumping = false;
            } else {
                this.die();
            }
        }
    }
    
    die() {
        if (this.particlesEnabled) this.createDeathParticles();
        this.audio.playDeath();
        this.stop();
        
        window.dispatchEvent(new CustomEvent('gameover', {
            detail: { progress: Math.floor(this.progress), attempts: this.attempts }
        }));
    }
    
    win() {
        this.audio.playWin();
        this.stop();
        
        window.dispatchEvent(new CustomEvent('victory', {
            detail: { attempts: this.attempts }
        }));
    }
    
    createJumpParticles() {
        for (let i = 0; i < 5; i++) {
            this.particles.push({
                x: this.player.x + this.player.width / 2,
                y: this.player.y + this.player.height,
                vx: (Math.random() - 0.5) * 4,
                vy: Math.random() * 2,
                life: 30,
                color: '#ffffff'
            });
        }
    }
    
    createDeathParticles() {
        for (let i = 0; i < 20; i++) {
            this.particles.push({
                x: this.player.x + this.player.width / 2,
                y: this.player.y + this.player.height / 2,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                life: 60,
                color: '#00ff00'
            });
        }
    }
    
    createOrbParticles(x, y) {
        for (let i = 0; i < 10; i++) {
            this.particles.push({
                x: x + 20,
                y: y + 20,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                life: 40,
                color: '#ffff00'
            });
        }
    }
    
    updateParticles() {
        this.particles = this.particles.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.3;
            p.life--;
            return p.life > 0;
        });
    }
    
    render() {
        // Rendu de l'arrière-plan animé
        this.background.render(this.camera.x);
        
        // Canvas de jeu (transparent pour voir l'arrière-plan)
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        this.renderGround();
        this.renderLevelObjects();
        this.renderPlayer();
        
        if (this.particlesEnabled) {
            this.renderParticles();
        }
        
        this.renderProgressBar();
    }
    
    renderGround() {
        this.ctx.fillStyle = '#333333';
        this.ctx.fillRect(0, this.groundY, this.width, this.height - this.groundY);
        
        this.ctx.strokeStyle = '#555555';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.groundY);
        this.ctx.lineTo(this.width, this.groundY);
        this.ctx.stroke();
    }
    
    renderLevelObjects() {
        this.levelData.forEach(obj => {
            const x = obj.x - this.camera.x;
            const y = this.groundY - obj.height;
            
            if (x > -100 && x < this.width + 100) {
                this.ctx.save();
                this.ctx.translate(x, y);
                
                switch(obj.type) {
                    case 'spike':
                        this.drawSpike();
                        break;
                    case 'orb':
                        if (!obj.used) this.drawOrb();
                        break;
                    case 'block':
                        this.drawBlock();
                        break;
                    case 'portal':
                        this.drawPortal();
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
        const pulse = Math.sin(Date.now() / 200) * 2;
        
        this.ctx.fillStyle = 'rgba(255, 255, 0, 0.6)';
        this.ctx.beginPath();
        this.ctx.arc(20, 20, 15 + pulse, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.fillStyle = 'rgba(255, 255, 102, 0.8)';
        this.ctx.beginPath();
        this.ctx.arc(20, 20, 10 + pulse, 0, Math.PI * 2);
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
        
        this.ctx.fillStyle = 'rgba(136, 136, 136, 0.3)';
        this.ctx.fillRect(4, 4, 32, 32);
    }
    
    drawPortal() {
        this.ctx.fillStyle = 'rgba(0, 136, 255, 0.4)';
        this.ctx.fillRect(5, 0, 40, 80);
        
        this.ctx.fillStyle = 'rgba(0, 204, 255, 0.6)';
        this.ctx.fillRect(15, 10, 20, 60);
    }
    
    renderPlayer() {
        this.ctx.save();
        this.ctx.translate(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2);
        this.ctx.rotate(this.player.rotation * Math.PI / 180);
        
        this.ctx.fillStyle = '#00ff00';
        this.ctx.strokeStyle = '#00cc00';
        this.ctx.lineWidth = 2;
        this.ctx.fillRect(-18, -18, 36, 36);
        this.ctx.strokeRect(-18, -18, 36, 36);
        
        this.ctx.fillStyle = 'rgba(51, 255, 51, 0.5)';
        this.ctx.fillRect(-10, -10, 20, 20);
        
        this.ctx.restore();
    }
    
    renderParticles() {
        this.particles.forEach(p => {
            const alpha = p.life / 60;
            this.ctx.fillStyle = p.color;
            this.ctx.globalAlpha = alpha;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
            this.ctx.fill();
        });
        this.ctx.globalAlpha = 1;
    }
    
    renderProgressBar() {
        const barWidth = 200;
        const barHeight = 20;
        const x = this.width - barWidth - 20;
        const y = 20;
        
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(x, y, barWidth, barHeight);
        
        this.ctx.fillStyle = '#00ff88';
        this.ctx.fillRect(x, y, (barWidth * this.progress) / 100, barHeight);
        
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x, y, barWidth, barHeight);
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`${Math.floor(this.progress)}%`, x + barWidth / 2, y + 15);
    }
    
    gameLoop(timestamp) {
        if (!this.isRunning) return;
        
        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;
        
        this.update(deltaTime);
        this.render();
        
        this.animationId = requestAnimationFrame((t) => this.gameLoop(t));
    }
}

const game = new GameEngine();

window.addEventListener('resize', () => {
    game.resizeCanvas();
    if (game.isRunning) {
        game.render();
    }
});