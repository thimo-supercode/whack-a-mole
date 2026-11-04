const GRID_SIZE = 9;
const ROUND_SECONDS = 30;
const MOLE_VISIBLE_MS = 800;
const HIGHSCORE_KEY = 'whackamole-highscore';
const LEADERBOARD_SIZE = 5;

const grid = document.getElementById('grid');
const leaderboardEl = document.getElementById('leaderboard');
const leaderboardBody = document.getElementById('leaderboard-body');
const scoreEl = document.getElementById('score');
const highscoreEl = document.getElementById('highscore');
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
let highscore = loadHighscore();
let leaderboard = [];

function loadHighscore() {
  try {
    return Number(localStorage.getItem(HIGHSCORE_KEY)) || 0;
  } catch (e) {
    return 0;
  }
}

function saveHighscore() {
  try {
    localStorage.setItem(HIGHSCORE_KEY, highscore);
  } catch (e) {
    // localStorage nicht verfügbar – High-Score gilt dann nur für diese Sitzung
  }
}

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?)?$/;

// Liefert den Zeitstempel (ms) eines Datums wie '2026-11-01' oder
// '2026-11-01T14:30:00Z' – oder null, wenn das Datum ungültig ist.
function parseDate(dateStr) {
  const match = DATE_PATTERN.exec(String(dateStr));
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const check = new Date(year, month - 1, day);
  if (check.getFullYear() !== year || check.getMonth() !== month - 1 || check.getDate() !== day) {
    return null;
  }
  if (!match[4]) return check.getTime(); // nur Datum: Mitternacht Ortszeit
  const time = Date.parse(dateStr);
  return Number.isNaN(time) ? null : time;
}

// '2026-11-01' (oder ISO mit Uhrzeit) -> '01.11.2026'
function formatDate(dateStr) {
  const [year, month, day] = String(dateStr).slice(0, 10).split('-');
  return `${day}.${month}.${year}`;
}

// Sortierung: mehr Punkte > früheres Datum > gültiges vor ungültigem Datum > Name A–Z
function compareEntries(a, b) {
  if (b.score !== a.score) return b.score - a.score;
  const timeA = parseDate(a.date);
  const timeB = parseDate(b.date);
  if (timeA !== null && timeB !== null && timeA !== timeB) return timeA - timeB;
  if (timeA === null && timeB !== null) return 1;
  if (timeA !== null && timeB === null) return -1;
  return String(a.name).localeCompare(String(b.name), 'de');
}

function getTopEntries() {
  return [...leaderboard]
    .sort(compareEntries)
    .slice(0, LEADERBOARD_SIZE);
}

function renderLeaderboard() {
  leaderboardBody.innerHTML = '';
  const entries = getTopEntries();

  if (entries.length === 0) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 4;
    cell.textContent = 'Noch keine Einträge';
    row.appendChild(cell);
    leaderboardBody.appendChild(row);
    return;
  }

  entries.forEach((entry, index) => {
    const row = document.createElement('tr');
    if (index === 0) row.className = 'best';
    const values = [`${index + 1}.`, entry.name, entry.score];
    values.forEach((value) => {
      const cell = document.createElement('td');
      cell.textContent = value;
      row.appendChild(cell);
    });
    const dateCell = document.createElement('td');
    if (parseDate(entry.date) === null) {
      dateCell.textContent = String(entry.date ?? ''); // Rohwert, rot markiert
      dateCell.className = 'invalid-date';
    } else {
      dateCell.textContent = formatDate(entry.date);
    }
    row.appendChild(dateCell);
    leaderboardBody.appendChild(row);
  });
}

function showLeaderboard() {
  renderLeaderboard();
  grid.style.display = 'none';
  leaderboardEl.style.display = 'block';
}

function hideLeaderboard() {
  leaderboardEl.style.display = 'none';
  grid.style.display = '';
}

// Test-Hilfe: Bestenliste mit Dummy-Daten füllen (nur im Speicher)
// Beispiel: setTestLeaderboard([{ name: 'Anna', score: 27, date: '2026-11-01' }]); endGame();
function setTestLeaderboard(entries) {
  leaderboard = entries;
  if (!running) showLeaderboard();
}

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
  hideLeaderboard();
  score = 0;
  timeLeft = ROUND_SECONDS;
  scoreEl.textContent = score;
  highscoreEl.textContent = highscore;
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
  let message = `Runde vorbei – Punkte: ${score}`;
  if (score > highscore) {
    highscore = score;
    saveHighscore();
    highscoreEl.textContent = highscore;
    message += ' – 🏆 Neuer High-Score!';
  }
  resultEl.textContent = message;
  restartBtn.style.display = 'inline-block';
  showLeaderboard();
}

restartBtn.addEventListener('click', startGame);

startGame();
