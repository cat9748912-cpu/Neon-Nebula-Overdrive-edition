const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI DOM Bindings
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const scoreDisplay = document.getElementById('score-display');
const shieldBarFill = document.getElementById('shield-bar-fill');
const finalScore = document.getElementById('final-score');

// Game Engine State
let gameState = 'START'; 
let score = 0;
let maxShield = 100;
let shield = 100;
let keys = {};
let screenShake = 0;

// Actor & Effect Containers
let player;
let projectiles = [];
let enemies = [];
let particles = [];
let powerups = [];
let floatingTexts = [];
let backgroundStars = [];

let enemySpawnTimer = 0;
let enemySpawnInterval = 1200; 
let lastTime = 0;

// High-Quality Feature: Multi-layered Parallax Starfield Background
function generateStarfield() {
    backgroundStars = [];
    // Far slow stars
    for (let i = 0; i < 60; i++) {
        backgroundStars.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, size: 1, speed: 0.5, alpha: 0.4 });
    }
    // Near fast stars
    for (let i = 0; i < 30; i++) {
        backgroundStars.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, size: 1.8, speed: 1.5, alpha: 0.8 });
    }
}
generateStarfield();

// Safe Input Capture (Fixes standard browser action scrolling & selection)
window.addEventListener('keydown', (e) => {
    if (['Space', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD', 'KeyW'].includes(e.code)) {
        e.preventDefault(); 
    }
    keys[e.code] = true;
});
window.addEventListener('keyup', (e) => {
    if (['Space', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD', 'KeyW'].includes(e.code)) {
        e.preventDefault();
    }
    keys[e.code] = false;
});

// --- Classes ---

class Player {
    constructor() {
        this.width = 44;
        this.height = 34;
        this.x = canvas.width / 2 - this.width / 2;
        this.y = canvas.height - 70;
        this.vx = 0;
        this.friction = 0.86;
        this.acceleration = 1.4;
        this.cooldown = 0;
        this.angle = 0; // Kinetic banking lean angle
        this.weaponLevel = 1; // Scalable upgrade tracks
    }

    update(dt) {
        if (keys['ArrowLeft'] || keys['KeyA']) this.vx -= this.acceleration;
        if (keys['ArrowRight'] || keys['KeyD']) this.vx += this.acceleration;

        this.vx *= this.friction;
        this.x += this.vx;

        // Dynamic banking calculation based on speed vector
        this.angle = this.vx * 0.04;

        if (this.x < 10) { this.x = 10; this.vx = 0; }
        if (this.x > canvas.width - this.width - 10) { this.x = canvas.width - this.width - 10; this.vx = 0; }

        if (this.cooldown > 0) this.cooldown -= dt;

        if (keys['Space'] && this.cooldown <= 0) {
            this.shoot();
            this.cooldown = 140; 
        }
    }

    shoot() {
        if (this.weaponLevel === 1) {
            // Standard Single Beam
            projectiles.push(new Projectile(this.x + this.width / 2, this.y, 0, -14));
        } else if (this.weaponLevel >= 2) {
            // High Quality Spread Laser Mod
            projectiles.push(new Projectile(this.x + 10, this.y + 10, -2, -14));
            projectiles.push(new Projectile(this.x + this.width - 10, this.y + 10, 2, -14));
            if (this.weaponLevel > 2) {
                projectiles.push(new Projectile(this.x + this.width / 2, this.y, 0, -16));
            }
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate(this.angle);

        // Neon Glow Drop
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#00f2fe';
        
        // Advanced Interceptor Geometry Engine
        ctx.fillStyle = '#00f2fe';
        ctx.beginPath();
        ctx.moveTo(0, -this.height / 2); // Nose cone
        ctx.lineTo(-this.width / 2, this.height / 2); // Left wing port
        ctx.lineTo(-this.width / 4, this.height / 4);
        ctx.lineTo(this.width / 4, this.height / 4);
        ctx.lineTo(this.width / 2, this.height / 2); // Right wing port
        ctx.closePath();
        ctx.fill();

        // Inner Cockpit Glow Core
        ctx.shadowColor = '#fff';
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(0, -this.height / 3);
        ctx.lineTo(-5, 5);
        ctx.lineTo(5, 5);
        ctx.closePath();
        ctx.fill();

        // Dynamic jet exhaust trails
        ctx.fillStyle = Math.random() > 0.5 ? '#ff4e50' : '#ff0844';
        ctx.fillRect(-4, this.height / 2 - 2, 8, Math.random() * 8 + 4);
        
        ctx.restore();
    }
}

class Projectile {
    constructor(x, y, vx, vy) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.width = 3;
        this.height = 14;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
    }

    draw() {
        ctx.save();
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#00f2fe';
        ctx.fillStyle = '#00f2fe';
        // Draw capsules instead of basic squares
        ctx.beginPath();
        ctx.roundRect(this.x - this.width/2, this.y, this.width, this.height, 2);
        ctx.fill();
        ctx.restore();
    }
}

class Enemy {
    constructor(type) {
        this.type = type; // 'SCOUT', 'FIGHTER', 'BOMBER'
        this.x = Math.random() * (canvas.width - 40) + 20;
        this.y = -40;
        this.waveOffset = Math.random() * 100; // unique sin movement patterns
        
        // Setup specialized variant profiles
        if (type === 'SCOUT') {
            this.width = 24; this.height = 24;
            this.speed = 4.2; this.hp = 1;
            this.color = '#ff007f'; this.scoreVal = 15;
        } else if (type === 'BOMBER') {
            this.width = 50; this.height = 40;
            this.speed = 1.4; this.hp = 3;
            this.color = '#ff9f00'; this.scoreVal = 40;
        } else { // Standard Fighter
            this.width = 34; this.height = 28;
            this.speed = 2.4; this.hp = 2;
            this.color = '#bc34fa'; this.scoreVal = 25;
        }
    }

    update() {
        this.y += this.speed;
        // High Quality Sinusoidal sweeping flight patterns for Fighters
        if (this.type === 'FIGHTER') {
            this.x += Math.sin(this.y * 0.02 + this.waveOffset) * 1.5;
        }
    }

    draw() {
        ctx.save();
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;

        ctx.beginPath();
        if (this.type === 'BOMBER') {
            // Hexagonal Heavy Armor silhouette
            ctx.moveTo(this.x + this.width/2, this.y + this.height);
            ctx.lineTo(this.x, this.y + this.height * 0.4);
            ctx.lineTo(this.x + this.width * 0.2, this.y);
            ctx.lineTo(this.x + this.width * 0.8, this.y);
            ctx.lineTo(this.x + this.width, this.y + this.height * 0.4);
        } else {
            // Sharp aggressive triangular alien hulls
            ctx.moveTo(this.x + this.width / 2, this.y + this.height);
            ctx.lineTo(this.x, this.y);
            ctx.lineTo(this.x + this.width, this.y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
}

class PowerUp {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = 16;
        this.speed = 2;
        this.pulse = 0;
    }

    update() {
        this.y += this.speed;
        this.pulse += 0.1;
    }

    draw() {
        ctx.save();
        const scaleGlow = this.size + Math.sin(this.pulse) * 4;
        ctx.shadowBlur = scaleGlow;
        ctx.shadowColor = '#00ff66';
        ctx.fillStyle = '#00ff66';
        // Diamond Matrix layout
        ctx.translate(this.x, this.y);
        ctx.rotate(this.pulse * 0.3);
        ctx.fillRect(-this.size/2, -this.size/2, this.size, this.size);
        ctx.restore();
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.radius = Math.random() * 2.5 + 1;
        const angle = Math.random() * Math.PI * 2;
        const velocity = Math.random() * 5 + 1.5;
        this.vx = Math.cos(angle) * velocity;
        this.vy = Math.sin(angle) * velocity;
        this.alpha = 1;
        this.decay = Math.random() * 0.02 + 0.015;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.alpha -= this.decay;
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class FloatingText {
    constructor(x, y, text, color) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.alpha = 1;
        this.speedY = -1;
    }
    update() {
        this.y += this.speedY;
        this.alpha -= 0.02;
    }
    draw() {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.font = 'bold 14px monospace';
        ctx.fillStyle = this.color;
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
    }
}

// --- Gameplay Mechanisms ---

function createExplosion(x, y, color, count = 12) {
    for (let i = 0; i < count; i++) {
        particles.push(new Particle(x, y, color));
    }
}

function spawnFloatingText(x, y, text, color = '#fff') {
    floatingTexts.push(new FloatingText(x, y, text, color));
}

function updateHUD() {
    scoreDisplay.innerText = `SCORE: ${score.toString().padStart(4, '0')}`;
    const mappedPercent = Math.max(0, shield);
    shieldBarFill.style.width = `${mappedPercent}%`;
}

function initGame() {
    // CRITICAL BUG FIX: Force execution context to drop window focus from clicked UI buttons
    // This stops Spacebar triggers from refiring click events natively!
    startBtn.blur();
    restartBtn.blur();

    score = 0;
    shield = maxShield;
    projectiles = [];
    enemies = [];
    particles = [];
    powerups = [];
    floatingTexts = [];
    enemySpawnInterval = 1200;
    player = new Player();
    
    updateHUD();
    gameState = 'PLAYING';
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
}

function triggerGameOver() {
    gameState = 'GAMEOVER';
    finalScore.innerText = `Final Operational Score: ${score}`;
    gameOverScreen.classList.remove('hidden');
}

function isColliding(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

// --- Frame Processing Loops ---

function update(dt) {
    // Parallax background processing
    backgroundStars.forEach(star => {
        star.y += star.speed;
        if (star.y > canvas.height) star.y = 0;
    });

    if (gameState !== 'PLAYING') return;

    player.update(dt);

    // Progressive Spawning Logic
    enemySpawnTimer += dt;
    if (enemySpawnTimer >= enemySpawnInterval) {
        const rand = Math.random();
        let choice = 'SCOUT';
        if (score > 150 && rand > 0.75) choice = 'BOMBER';
        else if (score > 60 && rand > 0.4) choice = 'FIGHTER';

        enemies.push(new Enemy(choice));
        enemySpawnTimer = 0;
        enemySpawnInterval = Math.max(350, 1200 - (score * 0.6));
    }

    projectiles.forEach((proj, pIdx) => {
        proj.update();
        if (proj.y < -20 || proj.x < -20 || proj.x > canvas.width + 20) projectiles.splice(pIdx, 1);
    });

    // Powerup checks
    powerups.forEach((power, pIdx) => {
        power.update();
        const hitBox = { x: player.x, y: player.y, width: player.width, height: player.height };
        const powerBox = { x: power.x - power.size/2, y: power.y - power.size/2, width: power.size, height: power.size };
        
        if (isColliding(hitBox, powerBox)) {
            player.weaponLevel++;
            spawnFloatingText(player.x, player.y - 10, 'WEAPON UPGRADE!', '#00ff66');
            createExplosion(power.x, power.y, '#00ff66', 20);
            powerups.splice(pIdx, 1);
        } else if (power.y > canvas.height + 20) {
            powerups.splice(pIdx, 1);
        }
    });

    // Enemy Processing Engine
    enemies.forEach((enemy, eIdx) => {
        enemy.update();

        // Hull passed perimeter defense
        if (enemy.y > canvas.height) {
            enemies.splice(eIdx, 1);
            shield -= 15;
            screenShake = 12;
            updateHUD();
            if (shield <= 0) triggerGameOver();
            return;
        }

        // Hull Clash Collision Check
        const shipHitbox = { x: player.x, y: player.y, width: player.width, height: player.height };
        const enemyHitbox = { x: enemy.x, y: enemy.y, width: enemy.width, height: enemy.height };
        
        if (isColliding(shipHitbox, enemyHitbox)) {
            createExplosion(enemy.x + enemy.width/2, enemy.y + enemy.height/2, enemy.color, 25);
            enemies.splice(eIdx, 1);
            shield -= 25;
            screenShake = 22;
            updateHUD();
            if (shield <= 0) triggerGameOver();
            return;
        }

        // Projectile Hit Detection Processing
        projectiles.forEach((proj, pIdx) => {
            const projHitbox = { x: proj.x - proj.width/2, y: proj.y, width: proj.width, height: proj.height };
            if (isColliding(projHitbox, enemyHitbox)) {
                projectiles.splice(pIdx, 1);
                enemy.hp--;
                createExplosion(proj.x, proj.y, '#00f2fe', 4);
                
                if (enemy.hp <= 0) {
                    createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.color, 18);
                    spawnFloatingText(enemy.x, enemy.y, `+${enemy.scoreVal}`, enemy.color);
                    
                    // Controlled drop chance for weapon modules
                    if (Math.random() < 0.12) {
                        powerups.push(new PowerUp(enemy.x + enemy.width/2, enemy.y + enemy.height/2));
                    }
                    
                    score += enemy.scoreVal;
                    enemies.splice(eIdx, 1);
                    updateHUD();
                }
            }
        });
    });

    particles.forEach((part, pIdx) => {
        part.update();
        if (part.alpha <= 0) particles.splice(pIdx, 1);
    });

    floatingTexts.forEach((txt, tIdx) => {
        txt.update();
        if (txt.alpha <= 0) floatingTexts.splice(tIdx, 1);
    });

    if (screenShake > 0) screenShake *= 0.88; 
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    if (screenShake > 0.5) {
        ctx.translate((Math.random() - 0.5) * screenShake, (Math.random() - 0.5) * screenShake);
    }

    // Parallax Render
    backgroundStars.forEach(star => {
        ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
        ctx.fillRect(star.x, star.y, star.size, star.size);
    });

    // Object Rendering Pass
    if (gameState === 'PLAYING') player.draw();
    projectiles.forEach(proj => proj.draw());
    enemies.forEach(enemy => enemy.draw());
    powerups.forEach(power => power.draw());
    particles.forEach(part => part.draw());
    floatingTexts.forEach(txt => txt.draw());

    ctx.restore();
}

function gameLoop(currentTime) {
    if (!lastTime) lastTime = currentTime;
    const dt = currentTime - lastTime;
    lastTime = currentTime;

    update(dt);
    draw();

    requestAnimationFrame(gameLoop);
}

// Core Button Listeners
startBtn.addEventListener('click', initGame);
restartBtn.addEventListener('click', initGame);

// Run Application Execution 
requestAnimationFrame(gameLoop);