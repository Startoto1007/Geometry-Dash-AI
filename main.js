/**
 * GEOMETRY DASH AI - MOTEUR DE JEU
 * Gère la physique, les collisions, le rendu et la logique du jeu
 */

// Système audio simple (sons générés)
class AudioSystem {
    constructor() {
        this.ctx = null;
        this.enabled = true;
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
    
    playJump() {
        if (!this.enabled || !this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.frequency.value = 400;
        osc.type = 'square';
        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
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
        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
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
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
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
            gain.gain.setValueAtTime(0.2, startTime);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);
            
            osc.start(startTime);
            osc.stop(startTime + 0.3);
        });
    }
}

// Gestion simple de la musique de fond (fichiers MP3/OGG dans `musiques/`)
class MusicManager {
    constructor() {
        this.audio = null;
        this.muted = false;
        this.volume = 0.7;
        this.fadeInterval = null;

        try {
            const stored = localStorage.getItem('audioMuted');
            if (stored !== null) this.muted = stored === 'true';
        } catch (e) {
            // ignore
        }
    }

    load(src) {
        if (!src) return;
        // If same src, do nothing
        if (this.audio && this.audio.src && this.audio.src.indexOf(src) !== -1) return;

        this.stop();
        this.audio = new Audio(src);
        this.audio.loop = true;
        this.audio.volume = this.muted ? 0 : this.volume;
        this.audio.preload = 'auto';
        // Play only after a user gesture may be required; callers should handle promise
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

    toggleMute() {
        this.setMuted(!this.muted);
    }

    // Fade to a new track smoothly
    fadeTo(src, duration = 500) {
        if (!src) {
            this.fadeOut(duration);
            return;
        }

        if (this.audio && this.audio.src && this.audio.src.indexOf(src) !== -1) {
            // already playing
            return;
        }

        // Fade out current, then load new
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

class GameEngine {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
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
    }
    
    setupInput() {
        // Clavier
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && this.isRunning) {
                e.preventDefault();
                this.jump();
            }
        });
        
        // Souris/tactile
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
    }
    
    loadLevel(levelData) {
        this.currentLevel = levelData;
        this.levelData = JSON.parse(JSON.stringify(levelData.objects || [])); // Clone profond
        this.attempts = 0;
        this.resetPlayer();
        
        // Calculer la longueur du niveau
        this.levelLength = 0;
        this.levelData.forEach(obj => {
            if (obj.x > this.levelLength) this.levelLength = obj.x;
        });
        this.levelLength += 200;
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
        
        // Réinitialiser les orbes
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
            this.createJumpParticles();
            this.audio.playJump();
        }
    }
    
    update(deltaTime) {
        if (this.isPaused) return;
        
        // Mouvement de la caméra
        this.camera.x += this.gameSpeed;
        
        // Physique du joueur
        this.player.velocityY += this.gravity;
        this.player.y += this.player.velocityY;
        
        // Rotation du cube
        if (!this.player.onGround) {
            this.player.rotation += 5;
        } else {
            this.player.rotation = Math.round(this.player.rotation / 90) * 90;
        }
        
        // Collision avec le sol
        if (this.player.y >= this.groundY - this.player.height) {
            this.player.y = this.groundY - this.player.height;
            this.player.velocityY = 0;
            this.player.onGround = true;
            this.player.isJumping = false;
        }
        
        // Vérifier les collisions avec les obstacles
        this.checkCollisions();
        
        // Mettre à jour les particules
        this.updateParticles();
        
        // Calculer la progression
        this.progress = Math.min(100, (this.camera.x / this.levelLength) * 100);
        
        // Vérifier la victoire
        if (this.camera.x >= this.levelLength) {
            this.win();
        }
    }
    
    checkCollisions() {
        this.levelData.forEach(obj => {
            const objScreenX = obj.x - this.camera.x;
            const objScreenY = this.groundY - obj.height;
            
            // Vérifier si l'objet est proche du joueur
            if (objScreenX > this.player.x - 100 && objScreenX < this.player.x + 100) {
                switch(obj.type) {
                    case 'spike':
                        // Collision plus précise pour les spikes (forme triangulaire)
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
                            this.createOrbParticles(objScreenX, objScreenY);
                            this.audio.playOrb();
                        }
                        break;
                    
                    case 'block':
                        // Collision avec gestion du dessus du bloc
                        this.handleBlockCollision(objScreenX, objScreenY, 40, 40);
                        break;
                }
            }
        });
    }
    
    // Collision box simple avec marge pour éviter les faux positifs
    boxCollision(x1, y1, w1, h1, x2, y2, w2, h2) {
        const margin = 2; // Marge de 2px pour éviter les collisions sur les bords
        return x1 + margin < x2 + w2 - margin &&
               x1 + w1 - margin > x2 + margin &&
               y1 + margin < y2 + h2 - margin &&
               y1 + h1 - margin > y2 + margin;
    }
    
    // Collision spike (triangulaire) - plus précise
    spikeCollision(px, py, pw, ph, sx, sy) {
        // Centre du joueur
        const playerCenterX = px + pw / 2;
        const playerCenterY = py + ph / 2;
        
        // Points du triangle (spike)
        const spikeTop = { x: sx + 20, y: sy + 5 };
        const spikeBottomLeft = { x: sx + 5, y: sy + 35 };
        const spikeBottomRight = { x: sx + 35, y: sy + 35 };
        
        // Réduire la zone de collision du joueur (hitbox plus petite)
        const hitboxMargin = 8;
        const hitbox = {
            x: px + hitboxMargin,
            y: py + hitboxMargin,
            w: pw - hitboxMargin * 2,
            h: ph - hitboxMargin * 2
        };
        
        // Vérifier si un coin du joueur est dans le triangle
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
    
    // Vérifier si un point est dans un triangle
    pointInTriangle(p, p0, p1, p2) {
        const s = (p0.x - p2.x) * (p.y - p2.y) - (p0.y - p2.y) * (p.x - p2.x);
        const t = (p1.x - p0.x) * (p.y - p0.y) - (p1.y - p0.y) * (p.x - p0.x);
        
        if ((s < 0) !== (t < 0) && s !== 0 && t !== 0)
            return false;
        
        const d = (p2.x - p1.x) * (p.y - p1.y) - (p2.y - p1.y) * (p.x - p1.x);
        return d === 0 || (d < 0) === (s + t <= 0);
    }
    
    // Collision cercle-box (pour les orbes)
    circleBoxCollision(bx, by, bw, bh, cx, cy, radius) {
        // Trouver le point le plus proche du cercle sur le rectangle
        const closestX = Math.max(bx, Math.min(cx, bx + bw));
        const closestY = Math.max(by, Math.min(cy, by + bh));
        
        // Distance entre le cercle et ce point
        const distanceX = cx - closestX;
        const distanceY = cy - closestY;
        const distanceSquared = distanceX * distanceX + distanceY * distanceY;
        
        return distanceSquared < (radius * radius);
    }
    
    // Gestion des collisions avec les blocs (peut marcher dessus)
    handleBlockCollision(bx, by, bw, bh) {
        const margin = 3;
        
        // Vérifier collision
        if (this.boxCollision(
            this.player.x, this.player.y, this.player.width, this.player.height,
            bx, by, bw, bh
        )) {
            // Calculer les overlaps
            const overlapLeft = (this.player.x + this.player.width) - bx;
            const overlapRight = (bx + bw) - this.player.x;
            const overlapTop = (this.player.y + this.player.height) - by;
            const overlapBottom = (by + bh) - this.player.y;
            
            // Trouver le plus petit overlap
            const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
            
            // Si on arrive par le dessus et qu'on tombe (velocityY > 0)
            if (minOverlap === overlapTop && this.player.velocityY > 0) {
                // Poser le joueur sur le bloc
                this.player.y = by - this.player.height;
                this.player.velocityY = 0;
                this.player.onGround = true;
                this.player.isJumping = false;
            } else {
                // Collision latérale ou par le dessous = mort
                this.die();
            }
        }
    }
    
    die() {
        this.createDeathParticles();
        this.audio.playDeath();
        this.stop();
        
        // Déclencher l'événement game over
        window.dispatchEvent(new CustomEvent('gameover', {
            detail: { progress: Math.floor(this.progress), attempts: this.attempts }
        }));
    }
    
    win() {
        this.audio.playWin();
        this.stop();
        
        // Déclencher l'événement victoire
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
        // Effacer le canvas
        this.ctx.fillStyle = '#0a0a1f';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Fond avec étoiles
        this.renderStars();
        
        // Sol
        this.renderGround();
        
        // Objets du niveau
        this.renderLevelObjects();
        
        // Joueur
        this.renderPlayer();
        
        // Particules
        this.renderParticles();
        
        // Barre de progression
        this.renderProgressBar();
    }
    
    renderStars() {
        this.ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 50; i++) {
            const x = (i * 137 + this.camera.x * 0.1) % this.width;
            const y = (i * 97) % (this.height - 100);
            this.ctx.fillRect(x, y, 2, 2);
        }
    }
    
    renderGround() {
        this.ctx.fillStyle = '#333333';
        this.ctx.fillRect(0, this.groundY, this.width, this.height - this.groundY);
        
        // Ligne décorative
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
            const y = this.groundY - obj.height; // CORRECTION: alignement sur le sol
            
            // Ne dessiner que les objets visibles
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
        
        // Cube principal
        this.ctx.fillStyle = '#00ff00';
        this.ctx.strokeStyle = '#00cc00';
        this.ctx.lineWidth = 2;
        this.ctx.fillRect(-18, -18, 36, 36);
        this.ctx.strokeRect(-18, -18, 36, 36);
        
        // Effet lumineux
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
        
        // Fond
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(x, y, barWidth, barHeight);
        
        // Progression
        this.ctx.fillStyle = '#00ff88';
        this.ctx.fillRect(x, y, (barWidth * this.progress) / 100, barHeight);
        
        // Bordure
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x, y, barWidth, barHeight);
        
        // Texte
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

// Instance globale du moteur
const game = new GameEngine();

// Gérer le redimensionnement
window.addEventListener('resize', () => {
    game.resizeCanvas();
});