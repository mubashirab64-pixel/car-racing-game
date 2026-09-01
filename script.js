const track = document.getElementById('gameTrack');
const player = document.getElementById('playerCar');
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const scoreEl = document.getElementById('score');
const speedEl = document.getElementById('speed');
const fuelEl = document.getElementById('fuel');
const finalScoreEl = document.getElementById('finalScore');
const highScoreText = document.getElementById('highScoreText');
const feedbackEl = document.getElementById('feedback');

// Game State
let gameState = {
    active: false,
    score: 0,
    baseSpeed: 4.5,
    fuel: 100,
    playerX: 176,
    distance: 0
};

let keys = {};
let enemies = [];
let fuelCans = [];
let animationFrameId;
let lastSpawn = 0;
let highScore = Number(localStorage.getItem('mubashirRacerHigh') || 0);

// Lanes for better placement (center of 3 lanes)
const lanes = [70, 176, 282];

window.addEventListener('keydown', e => {
    keys[e.key.toLowerCase()] = true;
    // prevent scroll
    if (['arrowup','arrowdown','arrowleft','arrowright',' '].includes(e.key.toLowerCase())) {
        e.preventDefault();
    }
});
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

// Touch controls for mobile
let touchStartX = 0;
track.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
}, {passive: true});
track.addEventListener('touchmove', e => {
    if (!gameState.active) return;
    const dx = e.touches[0].clientX - touchStartX;
    if (Math.abs(dx) > 20) {
        if (dx < 0 && gameState.playerX > 55) gameState.playerX -= 8;
        if (dx > 0 && gameState.playerX < 297) gameState.playerX += 8;
        touchStartX = e.touches[0].clientX;
    }
}, {passive: true});

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

function startGame() {
    // Reset
    gameState.active = true;
    gameState.score = 0;
    gameState.baseSpeed = 4.5;
    gameState.fuel = 100;
    gameState.playerX = 176;
    gameState.distance = 0;
    lastSpawn = 0;

    // Clear old objects
    enemies.forEach(e => e.remove());
    fuelCans.forEach(f => f.remove());
    enemies = [];
    fuelCans = [];

    // UI
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    track.classList.add('track-moving');
    fuelEl.classList.remove('low');
    fuelEl.style.width = '100%';
    scoreEl.innerText = '0';
    speedEl.innerText = '0';
    feedbackEl.classList.add('hidden');

    cancelAnimationFrame(animationFrameId);
    requestAnimationFrame(updateGame);
}

function updateGame(timestamp) {
    if (!gameState.active) return;

    // Steering
    const moveSpeed = 7;
    if ((keys['arrowleft'] || keys['a']) && gameState.playerX > 55) {
        gameState.playerX -= moveSpeed;
    }
    if ((keys['arrowright'] || keys['d']) && gameState.playerX < 297) {
        gameState.playerX += moveSpeed;
    }

    // Boost
    let currentSpeed = gameState.baseSpeed;
    if (keys['arrowup'] || keys['w']) {
        currentSpeed += 3.5;
        gameState.fuel -= 0.04; // extra fuel cost for boost
    }

    player.style.left = `${gameState.playerX}px`;

    // Fuel & Score
    gameState.fuel -= 0.035;
    gameState.distance += currentSpeed * 0.15;
    gameState.score = Math.floor(gameState.distance);

    // Difficulty ramp
    gameState.baseSpeed = 4.5 + Math.min(6, gameState.score / 400);

    // UI update
    fuelEl.style.width = `${Math.max(0, gameState.fuel)}%`;
    if (gameState.fuel < 30) fuelEl.classList.add('low');
    else fuelEl.classList.remove('low');

    scoreEl.innerText = gameState.score;
    speedEl.innerText = Math.floor(currentSpeed * 22);

    // Spawn logic
    if (timestamp - lastSpawn > 900 - Math.min(400, gameState.score * 0.4)) {
        if (Math.random() < 0.65 && enemies.length < 4) {
            spawnEnemy();
        }
        if (Math.random() < 0.22 && fuelCans.length < 1) {
            spawnFuel();
        }
        lastSpawn = timestamp;
    }

    // Move objects
    moveEnemies(currentSpeed);
    moveFuel(currentSpeed);

    // Lose condition
    if (gameState.fuel <= 0) {
        showFeedback('OUT OF FUEL!', true);
        setTimeout(endGame, 400);
        return;
    }

    animationFrameId = requestAnimationFrame(updateGame);
}

function spawnEnemy() {
    const enemy = document.createElement('div');
    enemy.classList.add('car', 'enemy-car');
    if (Math.random() < 0.4) enemy.classList.add('alt');

    // Pick a lane
    let lane = lanes[Math.floor(Math.random() * 3)];
    enemy.style.left = `${lane}px`;
    enemy.style.top = `-90px`;

    // Add internals for look
    enemy.innerHTML = `
        <div class="car-roof"></div>
        <div class="car-window"></div>
        <div class="headlight left"></div>
        <div class="headlight right"></div>
        <div class="wheel front-left"></div>
        <div class="wheel front-right"></div>
        <div class="wheel back-left"></div>
        <div class="wheel back-right"></div>
    `;

    track.appendChild(enemy);
    enemies.push(enemy);
}

function moveEnemies(speed) {
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        let top = parseFloat(enemy.style.top) || -90;
        top += speed * 1.1;
        enemy.style.top = `${top}px`;

        if (isColliding(player, enemy)) {
            showFeedback('CRASH!', true);
            endGame();
            return;
        }

        if (top > 680) {
            enemy.remove();
            enemies.splice(i, 1);
            // small score bonus for surviving
            gameState.score += 5;
        }
    }
}

function spawnFuel() {
    const fuel = document.createElement('div');
    fuel.classList.add('fuel-item');
    const lane = lanes[Math.floor(Math.random() * 3)];
    fuel.style.left = `${lane + 10}px`;
    fuel.style.top = `-40px`;
    track.appendChild(fuel);
    fuelCans.push(fuel);
}

function moveFuel(speed) {
    for (let i = fuelCans.length - 1; i >= 0; i--) {
        const fuel = fuelCans[i];
        let top = parseFloat(fuel.style.top) || -40;
        top += speed * 1.05;
        fuel.style.top = `${top}px`;

        if (isColliding(player, fuel)) {
            gameState.fuel = Math.min(100, gameState.fuel + 28);
            showFeedback('+FUEL', false);
            fuel.remove();
            fuelCans.splice(i, 1);
            continue;
        }

        if (top > 680) {
            fuel.remove();
            fuelCans.splice(i, 1);
        }
    }
}

function isColliding(a, b) {
    const aRect = a.getBoundingClientRect();
    const bRect = b.getBoundingClientRect();

    // Slightly tighter hitbox for better feel
    const pad = 6;
    return !(
        aRect.bottom - pad < bRect.top + pad ||
        aRect.top + pad > bRect.bottom - pad ||
        aRect.right - pad < bRect.left + pad ||
        aRect.left + pad > bRect.right - pad
    );
}

function showFeedback(text, isHit) {
    feedbackEl.textContent = text;
    feedbackEl.classList.remove('hidden', 'hit');
    if (isHit) feedbackEl.classList.add('hit');
    // restart animation
    feedbackEl.style.animation = 'none';
    feedbackEl.offsetHeight; // reflow
    feedbackEl.style.animation = '';
    setTimeout(() => feedbackEl.classList.add('hidden'), 700);
}

function endGame() {
    gameState.active = false;
    track.classList.remove('track-moving');
    cancelAnimationFrame(animationFrameId);

    const final = gameState.score;
    finalScoreEl.innerText = final;

    if (final > highScore) {
        highScore = final;
        localStorage.setItem('mubashirRacerHigh', highScore);
        highScoreText.innerText = `🏆 NEW BEST: ${highScore}`;
    } else {
        highScoreText.innerText = `Best: ${highScore}`;
    }

    gameOverScreen.classList.remove('hidden');
}