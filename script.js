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

// Game Parameters
let gameState = {
    active: false,
    score: 0,
    speed: 5,
    fuel: 100,
    playerX: 179,
    laneWidth: 400
};

let keys = {};
let enemies = [];
let fuelCans = [];
let animationFrameId;

// Key Event Listeners
window.addEventListener('keydown', e => keys[e.key] = true);
window.addEventListener('keyup', e => keys[e.key] = false);

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

function startGame() {
    // Reset State
    gameState.active = true;
    gameState.score = 0;
    gameState.speed = 5;
    gameState.fuel = 100;
    gameState.playerX = 179;

    // Clear UI & Items
    enemies.forEach(e => e.remove());
    fuelCans.forEach(f => f.remove());
    enemies = [];
    fuelCans = [];

    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    track.classList.add('track-moving');

    requestAnimationFrame(updateGame);
}

function updateGame() {
    if (!gameState.active) return;

    // Player Steering
    if ((keys['ArrowLeft'] || keys['a'] || keys['A']) && gameState.playerX > 20) {
        gameState.playerX -= 6;
    }
    if ((keys['ArrowRight'] || keys['d'] || keys['D']) && gameState.playerX < 338) {
        gameState.playerX += 6;
    }
    
    // Boost Speed
    let currentSpeed = gameState.speed;
    if (keys['ArrowUp'] || keys['w'] || keys['W']) {
        currentSpeed += 3;
    }

    player.style.left = `${gameState.playerX}px`;

    // Fuel Decay & Score Update
    gameState.fuel -= 0.05;
    gameState.score += 1;
    
    fuelEl.style.width = `${Math.max(0, gameState.fuel)}%`;
    scoreEl.innerText = Math.floor(gameState.score / 10);
    speedEl.innerText = Math.floor(currentSpeed * 20);

    // Spawn Elements
    spawnEnemies();
    spawnFuel();

    // Move & Collision Handling
    moveEnemies(currentSpeed);
    moveFuel(currentSpeed);

    // Check Loss Condition
    if (gameState.fuel <= 0) {
        endGame();
        return;
    }

    animationFrameId = requestAnimationFrame(updateGame);
}

function spawnEnemies() {
    if (Math.random() < 0.02 && enemies.length < 3) {
        const enemy = document.createElement('div');
        enemy.classList.add('car', 'enemy-car');
        enemy.style.left = `${Math.floor(Math.random() * 315) + 20}px`;
        enemy.style.top = `-80px`;
        track.appendChild(enemy);
        enemies.push(enemy);
    }
}

function moveEnemies(speed) {
    enemies.forEach((enemy, index) => {
        let top = parseInt(enemy.style.top) || -80;
        top += speed;
        enemy.style.top = `${top}px`;

        // Collision Check
        if (isColliding(player, enemy)) {
            endGame();
        }

        // Cleanup
        if (top > 600) {
            enemy.remove();
            enemies.splice(index, 1);
        }
    });
}

function spawnFuel() {
    if (Math.random() < 0.005 && fuelCans.length < 1) {
        const fuel = document.createElement('div');
        fuel.classList.add('fuel-item');
        fuel.style.left = `${Math.floor(Math.random() * 330) + 20}px`;
        fuel.style.top = `-30px`;
        track.appendChild(fuel);
        fuelCans.push(fuel);
    }
}

function moveFuel(speed) {
    fuelCans.forEach((fuel, index) => {
        let top = parseInt(fuel.style.top) || -30;
        top += speed;
        fuel.style.top = `${top}px`;

        // Pickup Fuel
        if (isColliding(player, fuel)) {
            gameState.fuel = Math.min(100, gameState.fuel + 30);
            fuel.remove();
            fuelCans.splice(index, 1);
        }

        // Cleanup
        if (top > 600) {
            fuel.remove();
            fuelCans.splice(index, 1);
        }
    });
}

function isColliding(a, b) {
    const aRect = a.getBoundingClientRect();
    const bRect = b.getBoundingClientRect();

    return !(
        aRect.bottom < bRect.top ||
        aRect.top > bRect.bottom ||
        aRect.right < bRect.left ||
        aRect.left > bRect.right
    );
}

function endGame() {
    gameState.active = false;
    track.classList.remove('track-moving');
    cancelAnimationFrame(animationFrameId);
    finalScoreEl.innerText = Math.floor(gameState.score / 10);
    gameOverScreen.classList.remove('hidden');
}