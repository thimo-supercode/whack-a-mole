const GRID_SIZE = 9;
const ROUND_SECONDS = 30;
const MOLE_VISIBLE_MS = 800;

const grid = document.getElementById('grid');
const scoreEl = document.getElementById('score');
const timeEl = document.getElementById('time');
const resultEl = document.getElementById('result');
const restartBtn = document.getElementById('restart');

let score = 0;
let timeLeft = ROUND_SECONDS;
let holes = [];
let moleTimer = null;
let countdownTimer = null;
let activeHole = null;
let running = false;

function buildGrid() {
  grid.innerHTML = '';
  holes = [];
  for (let i = 0; i < GRID_SIZE; i++) {
    const hole = document.createElement('div');
    hole.className = 'hole';
    hole.addEventListener('click', () => whack(hole));
    grid.appendChild(hole);
    holes.push(hole);
  }
}

function showMole() {
  if (activeHole) {
    activeHole.classList.remove('active');
    activeHole.textContent = '';
  }
  const next = holes[Math.floor(Math.random() * holes.length)];
  next.classList.add('active');
  next.textContent = '🐹';
  activeHole = next;
}

function whack(hole) {
  if (!running || hole !== activeHole) return;
  score += 1;
  scoreEl.textContent = score;
  hole.classList.remove('active');
  hole.textContent = '';
  activeHole = null;
}

function tick() {
  timeLeft -= 1;
  timeEl.textContent = timeLeft;
  if (timeLeft <= 0) endGame();
}

function startGame() {
  score = 0;
  timeLeft = ROUND_SECONDS;
  scoreEl.textContent = score;
  timeEl.textContent = timeLeft;
  resultEl.textContent = '';
  restartBtn.style.display = 'none';
  running = true;
  buildGrid();
  moleTimer = setInterval(showMole, MOLE_VISIBLE_MS);
  countdownTimer = setInterval(tick, 1000);
}

function endGame() {
  running = false;
  clearInterval(moleTimer);
  clearInterval(countdownTimer);
  if (activeHole) {
    activeHole.classList.remove('active');
    activeHole.textContent = '';
  }
  resultEl.textContent = `Runde vorbei – Punkte: ${score}`;
  restartBtn.style.display = 'inline-block';
}

restartBtn.addEventListener('click', startGame);

startGame();
