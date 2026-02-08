// --- Game Constants & State ---
const GAME_DURATION = 30;
let score = 0;
let lastHole;
let timeUp = false;
let gameTimer;
let moleTimer;
let isPaused = false;
let timeLeft = GAME_DURATION;
let playerName = "PLAYER_ONE";
let highScore = parseInt(localStorage.getItem("neonMoleHighScore")) || 0;

// --- DOM Elements ---
const holes = document.querySelectorAll(".hole");
const scoreBoard = document.querySelector("#score");
const moles = document.querySelectorAll(".mole");
const startScreen = document.getElementById("startScreen");
const gameContainer = document.querySelector(".game-ui");
const usernameInput = document.getElementById("usernameInput");
const startGameBtn = document.getElementById("startGameBtn"); // Input screen button
const timeLeftDisplay = document.getElementById("timeLeft");
const maxScoreDisplay = document.getElementById("maxScore");
const gameOverModal = document.getElementById("gameOverModal");
const finalScoreDisplay = document.getElementById("finalScore");
const finalHighScoreDisplay = document.getElementById("finalHighScore"); // Added
const gameOverTitle = document.getElementById("gameOverTitle");
const highScoreMessage = document.getElementById("highScoreMessage");
const restartBtn = document.getElementById("restartBtn"); // Modal button
const playerNameDisplay = document.getElementById("playerNameDisplay");
const pauseBtn = document.getElementById("pauseBtn");
const gameStartBtn = document.getElementById("gameStartBtn"); // Control panel button
const gameResetBtn = document.getElementById("gameResetBtn"); // Control panel button

// --- Audio System (Web Audio API) ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
    if (audioCtx.state === "suspended") audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    if (type === "bonk") {
        osc.type = "square";
        osc.frequency.setValueAtTime(150, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
    } else if (type === "start") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.5);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.5);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.5);
    } else if (type === "win") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.2); // E5
        osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.4); // G5
        osc.frequency.setValueAtTime(1046.5, audioCtx.currentTime + 0.6); // C6
        gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 1);
        osc.start();
        osc.stop(audioCtx.currentTime + 1.0);
    } else if (type === "gameover") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(400, audioCtx.currentTime);
        osc.frequency.linearRampToValueAtTime(100, audioCtx.currentTime + 0.5);
        gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.5);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.5);
    }
}

// --- Confetti Effect ---
const confettiCanvas = document.getElementById("confettiCanvas");
const ctxConfetti = confettiCanvas.getContext("2d");
let particles = [];
let animationId;

function resizeConfetti() {
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeConfetti);
resizeConfetti();

class Particle {
    constructor() {
        this.x = Math.random() * confettiCanvas.width;
        this.y = confettiCanvas.height + Math.random() * 100;
        this.vx = Math.random() * 6 - 3;
        this.vy = Math.random() * -10 - 10;
        this.gravity = 0.5;
        this.color = `hsl(${Math.random() * 360}, 100%, 50%)`;
        this.size = Math.random() * 10 + 5;
        this.type = Math.random() > 0.5 ? 'rect' : 'circle';
        this.rotation = Math.random() * 360;
        this.rotationSpeed = Math.random() * 10 - 5;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity;
        this.rotation += this.rotationSpeed;
        if (this.x < 0 || this.x > confettiCanvas.width) this.vx *= -0.8;
    }

    draw() {
        ctxConfetti.save();
        ctxConfetti.translate(this.x, this.y);
        ctxConfetti.rotate(this.rotation * Math.PI / 180);
        ctxConfetti.fillStyle = this.color;
        
        if (this.type === 'rect') {
            ctxConfetti.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
        } else {
            ctxConfetti.beginPath();
            for (let i = 0; i < 5; i++) {
                ctxConfetti.rotate(Math.PI * 2 / 5);
                ctxConfetti.beginPath();
                ctxConfetti.fillStyle = this.color;
                ctxConfetti.arc(10, 0, this.size/2, 0, Math.PI * 2);
                ctxConfetti.fill();
            }
            ctxConfetti.beginPath();
            ctxConfetti.arc(0, 0, this.size/3, 0, Math.PI * 2);
            ctxConfetti.fillStyle = 'white';
            ctxConfetti.fill();
        }
        ctxConfetti.restore();
    }
}

function startConfetti() {
    particles = [];
    for (let i = 0; i < 150; i++) {
        setTimeout(() => particles.push(new Particle()), i * 10);
    }
    animateConfetti();
    setTimeout(stopConfetti, 5000);
}

function animateConfetti() {
    ctxConfetti.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    particles.forEach((p, index) => {
        p.update();
        p.draw();
        if (p.y > confettiCanvas.height + 100 && p.vy > 0) {
            particles.splice(index, 1);
        }
    });

    if (particles.length > 0) {
        animationId = requestAnimationFrame(animateConfetti);
    }
}

function stopConfetti() {
    cancelAnimationFrame(animationId);
    ctxConfetti.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
}

// --- Game Logic ---

function randomTime(min, max) {
    return Math.round(Math.random() * (max - min) + min);
}

function randomHole(holes) {
    const idx = Math.floor(Math.random() * holes.length);
    const hole = holes[idx];
    if (hole === lastHole) return randomHole(holes);
    lastHole = hole;
    return hole;
}

function peep() {
    // Speed: 600ms to 1500ms
    const time = randomTime(600, 1500);
    const hole = randomHole(holes);
    const mole = hole.querySelector(".mole");

    if (mole.classList.contains("up")) return peep();

    mole.classList.add("up");
    mole.classList.remove("bonked");

    moleTimer = setTimeout(() => {
        mole.classList.remove("up");
        if (!timeUp && !isPaused) peep();
    }, time);
}

function startGame() {
    scoreBoard.textContent = 0;
    timeUp = false;
    isPaused = false;
    score = 0;
    timeLeft = GAME_DURATION;
    timeLeftDisplay.textContent = timeLeft;
    pauseBtn.textContent = "PAUSE";

    playSound("start");

    startScreen.classList.add("hidden");
    gameOverModal.classList.add("hidden");
    gameContainer.classList.remove("hidden");

    peep();
    startTimer();
}

function startTimer() {
    gameTimer = setInterval(() => {
        if (!isPaused) {
            timeLeft--;
            timeLeftDisplay.textContent = timeLeft;
            if (timeLeft <= 0) {
                clearInterval(gameTimer);
                timeUp = true;
                endGame();
            }
        }
    }, 1000);
}

function togglePause() {
    if (isPaused) {
        isPaused = false;
        pauseBtn.textContent = "PAUSE";
        peep();
    } else {
        isPaused = true;
        pauseBtn.textContent = "RESUME";
        clearTimeout(moleTimer);
        moles.forEach(mole => mole.classList.remove('up'));
    }
}

function bonk(e) {
    if (!e.isTrusted) return;
    
    // 'this' is the hole div
    const mole = this.querySelector('.mole');
    
    if (!mole.classList.contains("up")) return;

    score++;
    mole.classList.remove("up");
    mole.classList.add("bonked");
    scoreBoard.textContent = score;

    playSound("bonk");
    showScorePopup(e.clientX, e.clientY);
}

function showScorePopup(x, y) {
    const popup = document.createElement("div");
    popup.classList.add("score-popup");
    popup.textContent = "+100";
    popup.style.left = `${x}px`;
    popup.style.top = `${y}px`;
    document.body.appendChild(popup);
    setTimeout(() => popup.remove(), 800);
}

function endGame() {
    // Update Score Logic matches user request
    finalScoreDisplay.textContent = score;
    document.getElementById('winnerName').textContent = playerName;

    // Determine Logic
    let isNewHigh = false;
    if (score > highScore) {
        highScore = score;
        localStorage.setItem("neonMoleHighScore", highScore);
        isNewHigh = true;
        playSound("win");
    } else {
        playSound("gameover");
    }
    
    // Update Display
    if(finalHighScoreDisplay) finalHighScoreDisplay.textContent = highScore;
    maxScoreDisplay.textContent = highScore;

    // Show Modal with Delay
    setTimeout(() => {
        gameContainer.classList.add("hidden");
        gameOverModal.classList.remove("hidden");

        if (isNewHigh) {
            highScoreMessage.classList.remove("hidden");
            if(gameOverTitle) {
                gameOverTitle.textContent = "NEW RECORD!";
                gameOverTitle.style.color = "var(--neon-green)";
            }
            startConfetti();
        } else {
            highScoreMessage.classList.add("hidden");
             if(gameOverTitle) {
                gameOverTitle.textContent = "GAME OVER";
                gameOverTitle.style.color = "red";
            }
        }
    }, 1000);
}

// --- Event Listeners ---

// Moles/Holes
holes.forEach((hole) => hole.addEventListener("click", bonk));

// Start Screen
startGameBtn.addEventListener("click", () => {
    let name = usernameInput.value.trim();
    if (!name) name = "PLAYER_ONE";
    playerName = name;
    playerNameDisplay.textContent = playerName;
    startGame();
});

// Modal Restart
restartBtn.addEventListener("click", () => {
    startGame();
});

// Control Panel
if(gameStartBtn) {
    gameStartBtn.addEventListener("click", () => {
        if (gameTimer) clearInterval(gameTimer);
        if (moleTimer) clearTimeout(moleTimer);
        startGame();
    });
}

if(gameResetBtn) {
    gameResetBtn.addEventListener("click", () => {
        if (gameTimer) clearInterval(gameTimer);
        if (moleTimer) clearTimeout(moleTimer);
        
        isPaused = false;
        timeUp = true;
        score = 0;
        timeLeft = GAME_DURATION;
        
        scoreBoard.textContent = 0;
        timeLeftDisplay.textContent = timeLeft;
        pauseBtn.textContent = "PAUSE";
        
        moles.forEach(mole => mole.classList.remove('up'));
        
        gameContainer.classList.add("hidden");
        startScreen.classList.remove("hidden");
        startScreen.classList.add("active");
    });
}

if(pauseBtn) {
    pauseBtn.addEventListener("click", togglePause);
}

// Initial Display
maxScoreDisplay.textContent = highScore;
