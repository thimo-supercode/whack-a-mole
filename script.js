const GRID_SIZE = 9;
const ROUND_SECONDS = 30;
const MOLE_VISIBLE_MS = 800;
const HIGHSCORE_KEY = 'whackamole-highscore';
const LEADERBOARD_SIZE = 5;
const LEADERBOARD_KEY = 'whackamole-leaderboard';
const NAME_MAX_LENGTH = 15;
const DEFAULT_NAME = 'Anonym';

// Globale Bestenliste (Supabase). Der Publishable Key ist öffentlich und darf im Code stehen.
const SUPABASE_URL = 'https://ovwwnpwughlsfauypucl.supabase.co';
const SUPABASE_KEY = 'sb_publishable_gyeEbns8s6tuCMNQuFaYfQ_tVIETSo9';
const SCORES_URL = `${SUPABASE_URL}/rest/v1/scores`;
const FETCH_TIMEOUT_MS = 5000;

const grid = document.getElementById('grid');
const leaderboardEl = document.getElementById('leaderboard');
const leaderboardBody = document.getElementById('leaderboard-body');
const tabGlobal = document.getElementById('tab-global');
const tabLocal = document.getElementById('tab-local');
const nameForm = document.getElementById('name-form');
const nameLabel = document.getElementById('name-label');
const nameHint = document.getElementById('name-hint');
const nameInput = document.getElementById('player-name');
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
let leaderboard = loadLeaderboard();
let testMode = false;   // true nach setTestLeaderboard(): nichts wird gespeichert
let entrySaved = false; // verhindert doppeltes Eintragen derselben Runde
let newEntry = null;    // zuletzt eingetragener Eintrag (wird hervorgehoben)
let globalLeaderboard = [];  // Top 5 vom Server
let globalStatus = 'loading'; // 'loading' | 'ok' | 'error'
let newGlobalId = null;       // id des eigenen neuen Server-Eintrags (wird hervorgehoben)
let activeTab = 'global';     // 'global' | 'local'
let canEnterLocal = false;
let canEnterGlobal = false;
let roundId = 0;              // erkennt Server-Antworten aus einer alten Runde

function loadLeaderboard() {
  try {
    const data = JSON.parse(localStorage.getItem(LEADERBOARD_KEY));
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
}

function saveLeaderboard() {
  if (testMode) return;
  try {
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(leaderboard));
  } catch (e) {
    // localStorage nicht verfügbar – Bestenliste gilt dann nur für diese Sitzung
  }
}

function loadHighscore() {
  try {
    return Number(localStorage.getItem(HIGHSCORE_KEY)) || 0;
  } catch (e) {
    return 0;
  }
}

function saveHighscore() {
  if (testMode) return;
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

function pad(n) {
  return String(n).padStart(2, '0');
}

// '2026-11-01' (oder ISO mit Uhrzeit) -> '01.11.2026'
// Mit Zeitzone (z. B. '...+00:00' vom Server) wird in Ortszeit umgerechnet.
function formatDate(dateStr) {
  const str = String(dateStr);
  if (/(Z|[+-]\d{2}:\d{2})$/.test(str)) {
    const date = new Date(str);
    return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`;
  }
  const [year, month, day] = str.slice(0, 10).split('-');
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

// Aktuelle lokale Zeit als '2026-11-04T21:15:03' (ohne Z, damit das Datum nicht nach UTC rutscht)
function localDateTime() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
    `T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

// Ein neues Ergebnis ist immer das späteste – bei Punktgleichstand mit Platz 5 reicht es also nicht
// top: bereits sortierte Top-Liste (lokal oder vom Server)
function qualifies(points, top) {
  if (points <= 0) return false;
  return top.length < LEADERBOARD_SIZE || points > top[top.length - 1].score;
}

function addEntry(name, points) {
  const entry = { name, score: points, date: localDateTime() };
  leaderboard.push(entry);
  leaderboard = getTopEntries();
  saveLeaderboard();
  return entry;
}

// ----- Globale Bestenliste (Supabase REST-API) -----

async function loadGlobalLeaderboard() {
  const url = `${SCORES_URL}?select=id,name,score,created_at` +
    `&order=score.desc,created_at.asc&limit=${LEADERBOARD_SIZE}`;
  const response = await fetch(url, {
    headers: { apikey: SUPABASE_KEY },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const rows = await response.json();
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    score: row.score,
    // Mikrosekunden auf Millisekunden kürzen, damit jeder Browser das Datum versteht
    date: String(row.created_at).replace(/(\.\d{3})\d+/, '$1'),
  }));
}

// Speichert einen Eintrag auf dem Server und liefert dessen id
async function saveGlobalEntry(name, points) {
  const response = await fetch(SCORES_URL, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({ name, score: points }),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const [row] = await response.json();
  return row.id;
}

async function refreshGlobalLeaderboard() {
  globalStatus = 'loading';
  renderLeaderboard();
  try {
    globalLeaderboard = await loadGlobalLeaderboard();
    globalStatus = 'ok';
  } catch (e) {
    globalStatus = 'error';
  }
  renderLeaderboard();
}

function switchTab(tab) {
  activeTab = tab;
  if (tab === 'global' && globalStatus === 'error') {
    refreshGlobalLeaderboard(); // neuer Versuch
  } else {
    renderLeaderboard();
  }
}

// ----- Anzeige -----

function renderMessage(text) {
  const row = document.createElement('tr');
  const cell = document.createElement('td');
  cell.colSpan = 4;
  cell.textContent = text;
  row.appendChild(cell);
  leaderboardBody.appendChild(row);
}

function renderLeaderboard() {
  leaderboardBody.innerHTML = '';
  tabGlobal.classList.toggle('active', activeTab === 'global');
  tabLocal.classList.toggle('active', activeTab === 'local');

  const isGlobal = activeTab === 'global';
  if (isGlobal && globalStatus === 'loading') {
    renderMessage('Lade …');
    return;
  }
  if (isGlobal && globalStatus === 'error') {
    renderMessage('Weltweite Bestenliste gerade nicht erreichbar');
    return;
  }

  const entries = isGlobal ? globalLeaderboard : getTopEntries();
  if (entries.length === 0) {
    renderMessage('Noch keine Einträge');
    return;
  }

  entries.forEach((entry, index) => {
    const row = document.createElement('tr');
    if (index === 0) row.classList.add('best');
    const isNew = isGlobal ? entry.id === newGlobalId : entry === newEntry;
    if (isNew) row.classList.add('new');
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

function hideNameForm() {
  nameForm.style.display = 'none';
  nameInput.value = '';
}

function showNameForm() {
  if (!canEnterLocal && !canEnterGlobal) return;
  if (canEnterLocal && canEnterGlobal) {
    nameLabel.textContent = 'Du bist in den Top 5 – weltweit und bei dir! Dein Name:';
  } else if (canEnterGlobal) {
    nameLabel.textContent = 'Du bist in den weltweiten Top 5! Dein Name:';
  } else {
    nameLabel.textContent = 'Du bist in deinen Top 5! Dein Name:';
  }
  nameHint.style.display = canEnterGlobal ? '' : 'none';
  nameForm.style.display = 'flex';
  nameInput.focus();
}

async function submitName(event) {
  event.preventDefault();
  if (entrySaved) return;
  entrySaved = true;
  const name = nameInput.value.trim().slice(0, NAME_MAX_LENGTH) || DEFAULT_NAME;
  hideNameForm();
  if (canEnterLocal) newEntry = addEntry(name, score);
  renderLeaderboard();
  if (canEnterGlobal) {
    try {
      newGlobalId = await saveGlobalEntry(name, score);
    } catch (e) {
      resultEl.textContent += ' – Weltweiter Eintrag fehlgeschlagen';
    }
    await refreshGlobalLeaderboard();
  }
}

// Test-Hilfe: Bestenliste mit Dummy-Daten füllen (nur im Speicher, schaltet Speichern ab)
// Beispiel: setTestLeaderboard([{ name: 'Anna', score: 27, date: '2026-11-01' }]); endGame();
function setTestLeaderboard(entries) {
  testMode = true;
  leaderboard = entries;
  activeTab = 'local';
  if (!running) showLeaderboard();
}

// Test-Hilfe: gespeicherte Bestenliste löschen
function clearLeaderboard() {
  leaderboard = [];
  activeTab = 'local';
  try {
    localStorage.removeItem(LEADERBOARD_KEY);
  } catch (e) {
    // localStorage nicht verfügbar
  }
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
  clearInterval(moleTimer);      // falls noch eine Runde läuft: alte Timer stoppen
  clearInterval(countdownTimer);
  hideLeaderboard();
  hideNameForm();
  roundId += 1;
  newEntry = null;
  newGlobalId = null;
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
  entrySaved = false;
  newEntry = null;
  newGlobalId = null;
  canEnterLocal = qualifies(score, getTopEntries());
  canEnterGlobal = false;
  hideNameForm();
  showLeaderboard();

  // Erst die weltweite Liste laden, dann entscheiden, ob das Namensformular erscheint
  const thisRound = roundId;
  refreshGlobalLeaderboard().then(() => {
    if (thisRound !== roundId || running || entrySaved) return; // inzwischen neue Runde
    canEnterGlobal = !testMode && globalStatus === 'ok' && qualifies(score, globalLeaderboard);
    if (canEnterGlobal) activeTab = 'global';
    else if (canEnterLocal) activeTab = 'local';
    renderLeaderboard();
    showNameForm();
  });
}

restartBtn.addEventListener('click', startGame);
nameForm.addEventListener('submit', submitName);
tabGlobal.addEventListener('click', () => switchTab('global'));
tabLocal.addEventListener('click', () => switchTab('local'));

startGame();
