/* ==========================================================
   JD CHINESE · HSK BLOCK PUZZLE — scripts.js
   ----------------------------------------------------------
   주요 변경점
   - 드래그: Pointer Events 1벌로 통합(터치/마우스/펜), 이벤트 중복 등록 버그 제거
   - 렌더링: 바뀐 칸만 다시 그림, 그림자/지워질 줄 미리보기는 해당 칸만 갱신
   - 오디오: BGM 1개 엘리먼트로 지연 로딩(시작 시 40MB 선로딩 제거), 효과음 마스터 볼륨
   - 화면: 세로/가로 자동 레이아웃(폰·패드·데스크탑), 드래그 블록 = 보드 칸 크기
   - 음성: Tingting 최우선, 없으면 가장 가까운 중국어 여성 음성
   ========================================================== */
'use strict';

// ==========================================
// ★ 유틸 ★
// ==========================================
const $ = (id) => document.getElementById(id);
const store = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v == null ? fallback : JSON.parse(v);
    } catch (e) {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {}
  },
};
const escapeHTML = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

let toastTimer = null;
function toast(msg, ms = 1600) {
  const el = $('toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), ms);
}

// 방향키/스페이스 스크롤 방지
window.addEventListener(
  'keydown',
  (e) => {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code) && e.target.tagName !== 'INPUT') {
      e.preventDefault();
    }
  },
  { passive: false },
);

// ==========================================
// ★ 사운드 설정 (0: 모두 켬 / 1: BGM 끔 / 2: 모두 끔) ★
// ==========================================
let soundMode = store.get('hskblock_sound', 0);
const SOUND_LABEL = ['🔊 소리 켬', '🎵 BGM 끔', '🔇 음소거'];
const SOUND_ICON = ['🔊', '🎵', '🔇'];
const SOUND_TOAST = ['배경음·효과음·음성 모두 켬', '배경음만 끔 (효과음·음성은 켬)', '모든 소리 끔'];
const bgmOn = () => soundMode === 0;
const sfxOn = () => soundMode < 2;

function updateSoundUI() {
  $('btn-sound').textContent = SOUND_ICON[soundMode];
  $('lobby-sound').textContent = SOUND_LABEL[soundMode];
}
function cycleSound() {
  soundMode = (soundMode + 1) % 3;
  store.set('hskblock_sound', soundMode);
  updateSoundUI();
  toast(SOUND_TOAST[soundMode]);
  if (bgmOn()) resumeBGM();
  else bgmEl.pause();
  if (!sfxOn() && 'speechSynthesis' in window) speechSynthesis.cancel();
}

// ==========================================
// ★ 배경음악(BGM) — 엘리먼트 1개, 필요할 때만 로딩 ★
// ==========================================
const BGM_LIST = {
  intro: ['intro.mp3'],
  leaderboard: ['leaderboard.mp3'],
  normal: ['block_bgm.mp3', 'block_bgm2.mp3', 'block_bgm3.mp3', 'block_bgm4.mp3'],
  hell: ['hell_bgm1.mp3', 'hell_bgm2.mp3', 'hell_bgm3.mp3', 'hell_bgm4.mp3'],
};
const bgmEl = new Audio();
bgmEl.preload = 'auto';
bgmEl.volume = 0.17;
let bgmType = null;
let bgmIndex = 0;
let audioUnlocked = false;

bgmEl.addEventListener('ended', () => {
  const list = BGM_LIST[bgmType] || [];
  if (list.length > 1) {
    bgmIndex = (bgmIndex + 1) % list.length;
    startTrack();
  }
});

function startTrack() {
  const list = BGM_LIST[bgmType];
  if (!list || !bgmOn() || !audioUnlocked) return;
  bgmEl.loop = list.length === 1;
  const src = list[bgmIndex];
  if (!bgmEl.src.endsWith(src)) bgmEl.src = src;
  else bgmEl.currentTime = 0;
  bgmEl.play().catch(() => {});
}
function playBGM(type) {
  if (bgmType === type && !bgmEl.paused) return; // 같은 곡이면 이어서 재생
  bgmType = type;
  const list = BGM_LIST[type];
  bgmIndex = list.length > 1 ? Math.floor(Math.random() * list.length) : 0;
  bgmEl.pause();
  startTrack();
}
function resumeBGM() {
  if (!bgmType || !bgmOn() || !audioUnlocked) return;
  if (bgmEl.src) bgmEl.play().catch(() => {});
  else startTrack();
}
// 앱 전환/화면 꺼짐 시 일시정지
document.addEventListener('visibilitychange', () => {
  if (document.hidden) bgmEl.pause();
  else resumeBGM();
});

// ==========================================
// ★ 효과음 (Web Audio) — 첫 터치 때 생성, 마스터 볼륨 ★
// ==========================================
let audioCtx = null;
let masterGain = null;
function ensureAudio() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    audioCtx = new AC();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.35;
    masterGain.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}
/** steps: [[시간, 주파수], ...]  glide: 'exp' | 'lin' | null */
function tone({ type = 'sine', steps, glide = null, vol = 1, dur = 0.3, delay = 0 }) {
  if (!sfxOn() || !ensureAudio()) return;
  const t0 = audioCtx.currentTime + delay;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  steps.forEach(([t, f], i) => {
    if (i === 0 || !glide) osc.frequency.setValueAtTime(f, t0 + t);
    else if (glide === 'exp') osc.frequency.exponentialRampToValueAtTime(f, t0 + t);
    else osc.frequency.linearRampToValueAtTime(f, t0 + t);
  });
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}
const playPlaceSound = () => tone({ type: 'triangle', steps: [[0, 220], [0.06, 140]], glide: 'exp', vol: 0.5, dur: 0.08 });
const playQuizPopupSound = () => tone({ steps: [[0, 400], [0.15, 800]], glide: 'exp', vol: 1, dur: 0.3 });
const playClearSound = () => tone({ type: 'square', steps: [[0, 150], [0.15, 40]], glide: 'exp', vol: 0.9, dur: 0.2 });
const playCorrectSound = () => tone({ type: 'triangle', steps: [[0, 440], [0.1, 554.37], [0.2, 659.25]], vol: 1, dur: 0.4 });
const playWrongSound = () => tone({ type: 'sawtooth', steps: [[0, 200], [0.4, 50]], glide: 'exp', vol: 0.8, dur: 0.4 });
const playBombSound = () => tone({ type: 'sawtooth', steps: [[0, 100], [0.5, 10]], glide: 'exp', vol: 1.4, dur: 0.5 });
const playBonusSpawnSound = () => tone({ steps: [[0, 600], [0.3, 1200]], glide: 'lin', vol: 0.6, dur: 0.4 });
const playObstacleSpawnSound = () => tone({ type: 'square', steps: [[0, 100], [0.4, 30]], glide: 'exp', vol: 0.9, dur: 0.4 });
const playRerollSound = () => tone({ steps: [[0, 800], [0.3, 100]], glide: 'exp', vol: 0.8, dur: 0.3 });
const playBuffSound = () => tone({ type: 'square', steps: [[0, 300], [0.1, 400], [0.2, 600], [0.3, 800]], vol: 0.5, dur: 0.6 });
const SCALE = [261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25];
function playSequentialComboSounds(startCombo, linesCleared) {
  for (let i = 0; i < linesCleared; i++) {
    const n = startCombo + i;
    const freq = SCALE[(n - 1) % 8] * Math.pow(2, Math.floor((n - 1) / 8));
    tone({ type: 'sawtooth', steps: [[0, freq]], vol: 0.7, dur: 0.4, delay: i * 0.15 });
  }
}

// ==========================================
// ★ 중국어 음성 (Tingting 우선) ★
// ==========================================
let zhVoice = null;
const voiceText = (v) => `${v.name} ${v.voiceURI}`;
const isTingting = (v) => /ting-?ting|婷婷/i.test(voiceText(v));
const isZhCN = (v) => /^(zh[-_]CN|zh[-_]Hans|cmn)/i.test(v.lang) || /^zh$/i.test(v.lang);
// 위에서부터 차례로 찾음 (Tingting → 여성 표준중국어 대체 음성)
const VOICE_RULES = [
  (v) => isTingting(v) && /premium|enhanced|고품질|향상/i.test(voiceText(v)),
  (v) => isTingting(v),
  (v) => isZhCN(v) && /Xiaoxiao|晓晓/i.test(v.name),
  (v) => isZhCN(v) && /Google/i.test(v.name),
  (v) => isZhCN(v) && /Huihui|Yaoyao|Xiaoyi|Lili|Yu-?shu|慧慧|瑶瑶/i.test(v.name),
  (v) => isZhCN(v) && !/Kangkang|Yunxi|Yunyang|Yunjian|康康|male/i.test(v.name),
  (v) => isZhCN(v),
  (v) => /^zh/i.test(v.lang) && !/HK|TW|yue/i.test(v.lang),
];
function pickChineseVoice() {
  if (!('speechSynthesis' in window)) return null;
  const voices = speechSynthesis.getVoices();
  if (!voices.length) return null;
  for (const rule of VOICE_RULES) {
    const found = voices.find(rule);
    if (found) {
      zhVoice = found;
      break;
    }
  }
  updateVoiceChip();
  return zhVoice;
}
function updateVoiceChip() {
  const chip = $('voice-chip');
  if (!chip) return;
  if (!('speechSynthesis' in window)) chip.textContent = '🔇 이 브라우저는 음성 미지원';
  else if (!zhVoice) chip.textContent = '🔊 중국어 음성 없음';
  else if (isTingting(zhVoice)) chip.textContent = '🔊 음성: Tingting';
  else chip.textContent = `🔊 대체 음성: ${zhVoice.name.replace(/Microsoft |Google |\(.*?\)|Online|Natural/g, '').trim() || zhVoice.name}`;
}
if ('speechSynthesis' in window) {
  speechSynthesis.addEventListener?.('voiceschanged', pickChineseVoice);
  speechSynthesis.onvoiceschanged = pickChineseVoice;
  pickChineseVoice();
  // 일부 브라우저는 목록을 늦게 줌
  [300, 1000, 2500].forEach((ms) => setTimeout(() => !zhVoice && pickChineseVoice(), ms));
}
// iOS/안드로이드: 첫 터치 때 음성 엔진 깨워두기
function unlockSpeech() {
  if (!('speechSynthesis' in window)) return;
  try {
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    speechSynthesis.speak(u);
  } catch (e) {}
}
function speakChinese(text) {
  if (!sfxOn() || !('speechSynthesis' in window)) return;
  const clean = String(text).replace(/<[^>]*>/g, '');
  setTimeout(() => {
    speechSynthesis.cancel();
    if (!zhVoice) pickChineseVoice();
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = zhVoice ? zhVoice.lang : 'zh-CN';
    if (zhVoice) u.voice = zhVoice;
    u.rate = 0.85;
    u.volume = 1;
    speechSynthesis.resume();
    speechSynthesis.speak(u);
  }, 40);
}
$('voice-chip').addEventListener('click', () => {
  ensureAudio();
  pickChineseVoice();
  speakChinese('你好！欢迎来到汉语方块。');
  if (zhVoice && !isTingting(zhVoice)) toast('이 기기에는 Tingting이 없어 대체 음성을 써요', 2400);
});

// ==========================================
// ★ 화면 전환 ★
// ==========================================
function showScreen(id) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === id));
  if (id === 'game-container') layout();
}

function initStartScreen() {
  if (!$('start-screen').classList.contains('active')) return;
  audioUnlocked = true;
  ensureAudio();
  unlockSpeech();
  showScreen('lobby-screen');
  playBGM('intro');
}
$('start-screen').addEventListener('click', initStartScreen);
document.addEventListener('keydown', initStartScreen);

// ==========================================
// ★ 랭킹 (로컬스토리지, 기존 저장 키 그대로 사용) ★
// ==========================================
let currentRankMode = 'normal';
let currentRankLevel = 'hsk4';
let lastSavedId = null; // 방금 등록한 기록만 강조

const rankKey = (mode, level) => `player_rankings_${mode}_${level}`;
function getBestScore(mode, level) {
  const list = store.get(rankKey(mode, level), []);
  return list.length ? list[0].score : 0;
}

function saveRanking() {
  const input = $('nickname-input');
  const nickname = input.value.trim();
  if (!nickname) {
    $('nickname-error').hidden = false;
    input.focus();
    return;
  }
  store.set('hskblock_last_nick', nickname);
  const key = rankKey(gameMode, gameLevel);
  let list = store.get(key, []);
  lastSavedId = Date.now();
  list.push({
    id: lastSavedId,
    name: nickname,
    score,
    combo: maxComboThisRound,
    date: new Date().toLocaleDateString(),
    isPlayer: true,
  });
  list.sort((a, b) => b.score - a.score);
  store.set(key, list.slice(0, 50));
  $('game-over-modal').classList.remove('active');
  showRankingScreen(gameMode, gameLevel);
}

function showRankingScreen(mode = 'normal', level = 'hsk4') {
  showScreen('ranking-screen');
  document.body.className = '';
  playBGM('leaderboard');
  currentRankMode = mode;
  currentRankLevel = level;
  renderRankingList();
}
function changeRankMode(mode) {
  currentRankMode = mode;
  renderRankingList();
}
function changeRankLevel(level) {
  currentRankLevel = level;
  renderRankingList();
}

const AI_RIVALS = {
  normal: [
    { name: '제갈공명', baseScore: 85000, combo: 24, isPlayer: false },
    { name: '이소룡', baseScore: 72000, combo: 18, isPlayer: false },
  ],
  hell: [
    { name: '사마의', baseScore: 250000, combo: 35, isPlayer: false },
    { name: '진시황', baseScore: 210000, combo: 28, isPlayer: false },
  ],
};
function growAIRivals(mode, level) {
  const key = `ai_rivals_${mode}_${level}`;
  let rivals = store.get(key, null);
  if (!rivals) {
    rivals = AI_RIVALS[mode].map((r) => ({ ...r, currentScore: r.baseScore, date: new Date().toLocaleDateString() }));
  } else {
    const playerBest = getBestScore(mode, level);
    rivals.forEach((r, i) => {
      const ahead = r.currentScore > playerBest;
      const chance = i === 0 ? (ahead ? 0.1 : 0.4) : ahead ? 0.15 : 0.3;
      const inc = i === 0 ? (Math.floor(Math.random() * 500) + 250) * 10 : (Math.floor(Math.random() * 300) + 150) * 10;
      if (Math.random() < chance) {
        r.currentScore += inc;
        r.date = new Date().toLocaleDateString();
        if (Math.random() < 0.05) r.combo += 1;
      }
    });
  }
  store.set(key, rivals);
}
function getAIRivals(mode, level) {
  const key = `ai_rivals_${mode}_${level}`;
  let rivals = store.get(key, null);
  if (!rivals) {
    rivals = AI_RIVALS[mode].map((r) => ({ ...r, currentScore: r.baseScore, date: new Date().toLocaleDateString() }));
    store.set(key, rivals);
  } else if (rivals.some((r) => !r.date)) {
    // 예전 버전에서 저장된 기록에도 날짜를 채워 다른 기록과 똑같이 보이게
    rivals.forEach((r) => (r.date = r.date || new Date().toLocaleDateString()));
    store.set(key, rivals);
  }
  return rivals.map((r) => ({ name: r.name, score: r.currentScore, combo: r.combo, date: r.date || '', isPlayer: false }));
}

function renderRankingList() {
  $('tab-normal').classList.toggle('active', currentRankMode === 'normal');
  $('tab-hell').classList.toggle('active', currentRankMode === 'hell');
  ['hsk4', 'hsk5', 'hsk6'].forEach((l) => $(`tab-rank-${l}`).classList.toggle('active', currentRankLevel === l));

  const players = store.get(rankKey(currentRankMode, currentRankLevel), []);
  const all = [...players, ...getAIRivals(currentRankMode, currentRankLevel)]
    .sort((a, b) => b.score - a.score)
    .slice(0, 15);

  const listEl = $('ranking-list');
  if (!all.length) {
    listEl.innerHTML = '<li class="rk-empty">등록된 랭킹이 없습니다.</li>';
    return;
  }
  listEl.innerHTML = all
    .map((r, i) => {
      const cls = ['ranking-item', i < 3 ? `top${i + 1}` : '', lastSavedId && r.id === lastSavedId ? 'me' : ''].join(' ');
      const medal = ['🥇', '🥈', '🥉'][i] || i + 1;
      const sub = r.date || '';
      return `<li class="${cls}">
        <span class="rk-no">${medal}</span>
        <span class="rk-name">${escapeHTML(r.name)}<small>${escapeHTML(sub)}</small></span>
        <span class="rk-score">${Number(r.score).toLocaleString()}<small>MAX ${r.combo} COMBO</small></span>
      </li>`;
    })
    .join('');
}

function returnToLobby() {
  document.body.className = '';
  document.querySelectorAll('.float-text, .giant-hanzi-overlay').forEach((el) => el.remove());
  showScreen('lobby-screen');
  playBGM('intro');
}

// ==========================================
// ★ 급수 선택 ★
// ==========================================
let pendingGameMode = 'normal';
let gameLevel = 'hsk4';

function openHSKModal(mode) {
  pendingGameMode = mode;
  const title = $('hsk-modal-title');
  title.textContent = mode === 'hell' ? 'HELL 🔥 · 급수 선택' : 'NORMAL · 급수 선택';
  title.style.color = mode === 'hell' ? '#ff8a9e' : '#7ff5e3';
  $('hsk-modal').classList.add('active');
}
function closeHSKModal() {
  $('hsk-modal').classList.remove('active');
}
function selectHSK(level) {
  closeHSKModal();
  startGame(pendingGameMode, level);
}
// 급수별 단어 수 표시
(function showWordCounts() {
  const data = window.QUIZ_DATA || {};
  ['hsk4', 'hsk5', 'hsk6'].forEach((l) => {
    const el = $(`cnt-${l}`);
    if (el && data[l]) el.textContent = `${data[l].length.toLocaleString()}문제`;
  });
})();

// ==========================================
// ★ 게임 코어 변수 및 블록 데이터 ★
// ==========================================
const BOARD_SIZE = 8;
let board = [];
let score = 0;
let currentDockBlocks = [null, null, null];
let gameMode = 'normal';
let currentCombo = 0;
let maxComboThisRound = 0;
let linesClearedThisRound = 0;

let nextQuizIsBonus = false;
let playerItems = { bomb: 0, reroll: 0, doubleScore: 0 };
let isBombActive = false;
let isDoubleScoreActive = false;
let isGameLocked = false; // 연출/퀴즈 중 조작 잠금
let isGameOver = false;
let quizOpen = false;
let currentQuiz = null;
let availableQuizzes = [];
let gameSession = 0; // 게임마다 증가 → 이전 판의 예약 작업이 새 판을 건드리지 않게

/** 현재 판에서만 실행되는 setTimeout */
function later(fn, ms) {
  const session = gameSession;
  return setTimeout(() => {
    if (session === gameSession) fn();
  }, ms);
}

const GOOD_BLOCKS = [
  [[1, 1, 1, 1]],
  [[1], [1], [1], [1]],
  [[1, 1], [1, 1]],
  [[1, 1, 1]],
  [[1], [1], [1]],
  [[1, 1, 1], [1, 1, 1]],
  [[1, 1], [1, 1], [1, 1]],
];
const NORMAL_BLOCKS = [
  [[1, 1], [0, 1]],
  [[1, 1], [1, 0]],
  [[0, 1], [1, 1]],
  [[1, 0], [1, 1]],
  [[1, 1, 1], [1, 1, 1], [1, 1, 1]],
  [[1, 1, 1], [0, 1, 0]],
  [[0, 1, 0], [1, 1, 1]],
  [[1, 0], [1, 1], [1, 0]],
  [[0, 1], [1, 1], [0, 1]],
  [[1, 0], [1, 0], [1, 1]],
  [[0, 1], [0, 1], [1, 1]],
  [[1, 1, 1, 1, 1]],
  [[1], [1], [1], [1], [1]],
  [[1, 1, 1], [1, 0, 0]],
  [[1, 1, 1], [0, 0, 1]],
  [[1, 0], [1, 0], [1, 1]],
  [[0, 1], [0, 1], [1, 1]],
  [[0, 1], [1, 1], [1, 0]],
  [[1, 0], [1, 1], [0, 1]],
  [[1, 1, 0], [0, 1, 1]],
  [[0, 1, 1], [1, 1, 0]],
];
const HARD_BLOCKS = [
  [[1, 1, 1], [0, 1, 0], [1, 1, 1]],
  [[0, 1, 0], [0, 1, 0], [1, 1, 1]],
  [[1, 1, 1], [0, 1, 0], [0, 1, 0]],
  [[1, 0, 0], [1, 0, 0], [1, 1, 1]],
  [[0, 0, 1], [0, 0, 1], [1, 1, 1]],
  [[1, 1, 1], [1, 0, 0], [1, 0, 0]],
  [[1, 1, 1], [0, 0, 1], [0, 0, 1]],
  [[1, 1, 0], [1, 1, 1]],
  [[0, 1, 1], [1, 1, 1]],
  [[1, 1, 1], [1, 1, 0]],
  [[1, 1, 1], [0, 1, 1]],
];

// DOM 캐시
const gridEl = $('grid-board');
const boardWrap = $('board-wrapper');
const gameEl = $('game-container');
const overlayEl = $('drag-overlay');
let cellEls = []; // [r][c]
let rendered = []; // 화면에 그려진 값 캐시

// ==========================================
// ★ 반응형 레이아웃 계산 (폰·패드·데스크탑 / 세로·가로) ★
// ==========================================
const layoutInfo = { cell: 40, gap: 3 };
const measured = { portrait: { hud: 64, items: 50 }, landscape: { hud: 112, items: 50 } };

function computeLayout(W, H, landscape) {
  const pad = Math.round(clamp(Math.min(W, H) * 0.03, 8, 24));
  const gapUI = Math.round(clamp(Math.min(W, H) * 0.018, 8, 14));
  const m = measured[landscape ? 'landscape' : 'portrait'];
  let boardPx, sidePx, dockH, dockDir = 'row';
  if (!landscape) {
    // 세로: HUD / 보드 / 독(보드의 0.3배) / 아이템
    boardPx = Math.min(W - pad * 2, (H - pad * 2 - m.hud - m.items - gapUI * 3) / 1.3, 680);
    dockH = Math.max(84, Math.round(boardPx * 0.3));
    sidePx = boardPx;
  } else {
    // 가로: 왼쪽 보드 / 오른쪽 패널(HUD·독·아이템)
    sidePx = Math.round(clamp(W * 0.3, 240, 380));
    boardPx = Math.min(H - pad * 2, W - pad * 2 - sidePx - gapUI, 860);
    const spare = W - pad * 2 - boardPx - gapUI;
    if (spare > sidePx) sidePx = Math.min(420, spare);
    dockH = Math.max(80, Math.round(boardPx - m.hud - m.items - gapUI * 2));
  }
  boardPx = Math.floor(boardPx);
  const bpad = Math.round(clamp(boardPx * 0.014, 4, 10));
  const gap = Math.round(clamp(boardPx * 0.008, 2, 6));
  const cell = Math.floor((boardPx - bpad * 2 - 2 - gap * 7) / BOARD_SIZE);

  const inner = 12;
  let pc;
  if (landscape) {
    const rowPc = Math.min((sidePx - inner) / 3, dockH - inner) / 5.3;
    const colPc = Math.min(sidePx - inner, (dockH - inner) / 3) / 5.3;
    dockDir = colPc > rowPc ? 'col' : 'row';
    pc = Math.max(rowPc, colPc);
  } else {
    pc = Math.min((sidePx - inner) / 3, dockH - inner) / 5.3;
  }
  pc = Math.floor(clamp(pc, 10, cell * 0.6));
  return { pad, gapUI, boardPx, sidePx, dockH, dockDir, bpad, gap, cell, pc };
}

function applyLayout(L, landscape) {
  const root = document.documentElement.style;
  root.setProperty('--board', L.boardPx + 'px');
  root.setProperty('--cell', L.cell + 'px');
  root.setProperty('--gap', L.gap + 'px');
  root.setProperty('--bpad', L.bpad + 'px');
  root.setProperty('--pc', L.pc + 'px');
  root.setProperty('--side', L.sidePx + 'px');
  root.setProperty('--dock-h', L.dockH + 'px');
  root.setProperty('--pad', L.pad + 'px');
  root.setProperty('--gap-ui', L.gapUI + 'px');
  gameEl.dataset.layout = landscape ? 'landscape' : 'portrait';
  $('block-dock').dataset.dir = L.dockDir;
  layoutInfo.cell = L.cell;
  layoutInfo.gap = L.gap;
}

function layout() {
  const vv = window.visualViewport;
  const W = Math.round(vv ? vv.width : window.innerWidth);
  const H = Math.round(vv ? vv.height : window.innerHeight);
  const landscape = W / H > 1.15;
  applyLayout(computeLayout(W, H, landscape), landscape);
  // 실제 HUD·아이템 높이를 재서 한 번 더 맞춤
  if (gameEl.classList.contains('active')) {
    const m = measured[landscape ? 'landscape' : 'portrait'];
    const hud = gameEl.querySelector('.hud').offsetHeight;
    const items = $('inventory-container').offsetHeight;
    if (hud && items && (Math.abs(hud - m.hud) > 1 || Math.abs(items - m.items) > 1)) {
      m.hud = hud;
      m.items = items;
      applyLayout(computeLayout(W, H, landscape), landscape);
    }
  }
}
let layoutRAF = 0;
function scheduleLayout() {
  if (drag) return; // 드래그 중엔 크기 변경 미룸
  cancelAnimationFrame(layoutRAF);
  layoutRAF = requestAnimationFrame(layout);
}
window.addEventListener('resize', scheduleLayout);
window.addEventListener('orientationchange', () => setTimeout(layout, 200));
window.visualViewport && window.visualViewport.addEventListener('resize', scheduleLayout);

// ==========================================
// ★ 게임 시작 ★
// ==========================================
function startGame(mode, level) {
  gameMode = mode;
  gameLevel = level;
  gameSession++;

  document.body.className = `theme-${mode} theme-${level}`;
  const levelText = level.toUpperCase().replace('HSK', 'HSK ');
  const modeEl = $('mode-display');
  modeEl.textContent = mode === 'hell' ? `HELL 🔥 · ${levelText}` : `NORMAL · ${levelText}`;

  board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(0));
  score = 0;
  currentCombo = 0;
  maxComboThisRound = 0;
  linesClearedThisRound = 0;
  nextQuizIsBonus = false;
  playerItems = { bomb: 0, reroll: 0, doubleScore: 0 };
  isBombActive = false;
  bombPreview = null;
  isDoubleScoreActive = false;
  isGameLocked = false;
  isGameOver = false;
  quizOpen = false;
  availableQuizzes = [];

  boardWrap.classList.remove('dimmed', 'double-on');
  hideBoardBanner();
  document.querySelectorAll('.modal.active').forEach((m) => m.classList.remove('active'));

  showScreen('game-container');
  playBGM(mode);
  initBoardHTML();
  updateInventoryUI();
  updateHUD();
  generateDockBlocks();
}
function retryGame() {
  $('game-over-modal').classList.remove('active');
  startGame(gameMode, gameLevel);
}

function initBoardHTML() {
  gridEl.innerHTML = '';
  cellEls = [];
  rendered = [];
  const frag = document.createDocumentFragment();
  for (let r = 0; r < BOARD_SIZE; r++) {
    cellEls.push([]);
    rendered.push(Array(BOARD_SIZE).fill(-1));
    for (let c = 0; c < BOARD_SIZE; c++) {
      const el = document.createElement('div');
      el.className = 'grid-cell';
      el.dataset.r = r;
      el.dataset.c = c;
      cellEls[r].push(el);
      frag.appendChild(el);
    }
  }
  gridEl.appendChild(frag);
  renderBoard(true);
}

/** 바뀐 칸만 다시 그림 (버벅임 개선 핵심) */
function renderBoard(force = false) {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const v = board[r][c];
      if (!force && rendered[r][c] === v) continue;
      rendered[r][c] = v;
      const el = cellEls[r][c];
      let cls = 'grid-cell';
      let txt = '';
      if (v >= 1 && v <= 4) {
        cls += ` color-${v}`;
        if (v === 4) txt = '🎁';
      } else if (v >= 11) {
        cls += ' cell-obstacle';
        txt = String(v - 10);
      }
      el.className = cls;
      el.textContent = txt;
    }
  }
  updateHUD();
}

function updateHUD() {
  $('score').textContent = score.toLocaleString();
  const best = Math.max(getBestScore(gameMode, gameLevel), score);
  $('best-score').textContent = best.toLocaleString();
  const chip = $('combo-chip');
  chip.textContent = `COMBO ${currentCombo}${isDoubleScoreActive ? ' · x2' : ''}`;
  chip.classList.toggle('on', currentCombo > 0);
}

// ==========================================
// ★ 방해 블록 / 보너스 블록 ★
// ==========================================
function emptyCells() {
  const list = [];
  for (let r = 0; r < BOARD_SIZE; r++) for (let c = 0; c < BOARD_SIZE; c++) if (board[r][c] === 0) list.push({ r, c });
  return list;
}

function spawnObstacleStone(mode) {
  const total = mode === 'hell' ? Math.floor(Math.random() * 6) + 1 : 1;
  let spawned = 0;
  const newCells = [];

  while (spawned < total) {
    const empties = emptyCells();
    if (!empties.length) break;
    const clusterSize = Math.floor(Math.random() * (total - spawned)) + 1;
    const start = empties[Math.floor(Math.random() * empties.length)];
    const cluster = [start];
    const visited = new Set([`${start.r},${start.c}`]);
    const queue = [start];
    while (cluster.length < clusterSize && queue.length) {
      const cur = queue.shift();
      const nbs = [
        { r: cur.r - 1, c: cur.c },
        { r: cur.r + 1, c: cur.c },
        { r: cur.r, c: cur.c - 1 },
        { r: cur.r, c: cur.c + 1 },
      ].filter(
        (n) => n.r >= 0 && n.r < BOARD_SIZE && n.c >= 0 && n.c < BOARD_SIZE && board[n.r][n.c] === 0 && !visited.has(`${n.r},${n.c}`),
      );
      shuffle(nbs);
      for (const n of nbs) {
        visited.add(`${n.r},${n.c}`);
        cluster.push(n);
        queue.push(n);
        if (cluster.length >= clusterSize) break;
      }
    }
    for (const cell of cluster) {
      board[cell.r][cell.c] = 10 + Math.floor(Math.random() * 2) + 2; // 내구도 2~3
      newCells.push(cell);
      spawned++;
    }
  }

  renderBoard();
  if (newCells.length) {
    playObstacleSpawnSound();
    shakeBoard(2);
    newCells.forEach(({ r, c }) => animateOnce(cellEls[r][c], 'spawn-drop', 500));
  }
}

function spawnBonusBlockOnBoard() {
  let hasBonus = false;
  for (const row of board) if (row.includes(4)) hasBonus = true;
  const empties = emptyCells();
  if (hasBonus || !empties.length || Math.random() >= 0.25) return;
  const cell = empties[Math.floor(Math.random() * empties.length)];
  board[cell.r][cell.c] = 4;
  renderBoard();
  playBonusSpawnSound();
  animateOnce(cellEls[cell.r][cell.c], 'spawn-drop', 500);
}

function animateOnce(el, cls, ms) {
  el.classList.remove(cls);
  // 다음 프레임에 붙여서 애니메이션 재시작 (강제 리플로우 없음)
  requestAnimationFrame(() => {
    el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), ms);
  });
}

// ==========================================
// ★ 대기 블록(독) 생성 ★
// ==========================================
function blockChances() {
  let normalChance = gameMode === 'hell' ? 0.15 : 0.05;
  let hardChance = 0;
  if (currentCombo >= 11) {
    const inc = (currentCombo - 10) * 0.01;
    normalChance += inc;
    hardChance += inc;
  }
  if (normalChance + hardChance > 1) {
    const over = normalChance + hardChance - 1;
    normalChance -= over / 2;
    hardChance -= over / 2;
  }
  return { normalChance, hardChance };
}
function randomMatrix() {
  const { normalChance, hardChance } = blockChances();
  const rand = Math.random();
  const pool = rand < hardChance ? HARD_BLOCKS : rand < hardChance + normalChance ? NORMAL_BLOCKS : GOOD_BLOCKS;
  return pool[Math.floor(Math.random() * pool.length)].map((row) => row.slice());
}

function generateDockBlocks() {
  const colors = shuffle([1, 2, 3]);
  for (let i = 0; i < 3; i++) {
    currentDockBlocks[i] = { matrix: randomMatrix(), colorVal: colors[i] };
    renderDockSlot(i);
  }
  spawnBonusBlockOnBoard();
  checkGameOverCondition();
}

function renderDockSlot(i) {
  const slot = $(`slot-${i}`);
  slot.innerHTML = '';
  slot.classList.remove('dragging', 'unplaceable');
  const data = currentDockBlocks[i];
  if (!data) return;
  const m = document.createElement('div');
  m.className = 'preview-matrix';
  m.style.gridTemplateColumns = `repeat(${data.matrix[0].length}, var(--pc))`;
  for (const row of data.matrix) {
    for (const v of row) {
      const c = document.createElement('div');
      c.className = 'preview-cell' + (v ? ` color-${data.colorVal}` : '');
      if (!v) c.style.visibility = 'hidden';
      m.appendChild(c);
    }
  }
  slot.appendChild(m);
}

// ==========================================
// ★ 드래그 앤 드롭 (Pointer Events — 한 번만 등록) ★
// ==========================================
let drag = null;
let dragRAF = 0;

function buildDragOverlay(data) {
  overlayEl.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'drag-block';
  wrap.style.gridTemplateColumns = `repeat(${data.matrix[0].length}, var(--cell))`;
  for (const row of data.matrix) {
    for (const v of row) {
      const c = document.createElement('div');
      c.className = 'drag-cell' + (v ? ` color-${data.colorVal}` : '');
      if (!v) c.style.visibility = 'hidden';
      wrap.appendChild(c);
    }
  }
  overlayEl.appendChild(wrap);
}

function onSlotPointerDown(e) {
  if (drag || isGameLocked || isBombActive || isGameOver) return;
  if (e.button !== undefined && e.button > 0) return;
  const i = Number(e.currentTarget.dataset.slot);
  const data = currentDockBlocks[i];
  if (!data) return;
  e.preventDefault();
  ensureAudio();

  const rect = gridEl.getBoundingClientRect();
  const { cell, gap } = layoutInfo;
  const step = cell + gap;
  const cols = data.matrix[0].length;
  const rows = data.matrix.length;
  const w = cols * cell + (cols - 1) * gap;
  const h = rows * cell + (rows - 1) * gap;
  // 손가락에 가리지 않도록 터치는 블록을 위로 띄움
  const lift = e.pointerType === 'mouse' ? 0 : h / 2 + Math.max(40, cell * 0.9);

  drag = { i, data, rect, step, w, h, lift, x: e.clientX, y: e.clientY, pid: e.pointerId, key: '', target: null };
  buildDragOverlay(data);
  overlayEl.style.display = 'block';
  e.currentTarget.classList.add('dragging');
  dragFrame();
}

function onPointerMove(e) {
  if (!drag || e.pointerId !== drag.pid) return;
  drag.x = e.clientX;
  drag.y = e.clientY;
  if (!dragRAF) dragRAF = requestAnimationFrame(dragFrame);
}

function dragFrame() {
  dragRAF = 0;
  if (!drag) return;
  const left = drag.x - drag.w / 2;
  const top = drag.y - drag.lift - drag.h / 2;
  overlayEl.style.transform = `translate3d(${left}px, ${top}px, 0)`;

  const c = Math.round((left - drag.rect.left) / drag.step);
  const r = Math.round((top - drag.rect.top) / drag.step);
  const ok = canPlaceBlock(r, c, drag.data.matrix);
  const key = ok ? `${r},${c}` : '';
  if (key !== drag.key) {
    drag.key = key;
    drag.target = ok ? { r, c } : null;
    if (ok) drawShadow(r, c, drag.data);
    else clearShadow();
  }
}

function onPointerUp(e) {
  if (!drag || e.pointerId !== drag.pid) return;
  if (e.type === 'pointerup') {
    drag.x = e.clientX;
    drag.y = e.clientY;
    dragFrame();
  }
  const { i, data, target } = drag;
  cancelAnimationFrame(dragRAF);
  dragRAF = 0;
  drag = null;
  overlayEl.style.display = 'none';
  clearShadow();
  $(`slot-${i}`).classList.remove('dragging');

  if (e.type === 'pointerup' && target && canPlaceBlock(target.r, target.c, data.matrix)) {
    placeBlock(target.r, target.c, data.matrix, data.colorVal);
    currentDockBlocks[i] = null;
    renderDockSlot(i);
    playPlaceSound();
    clearFullLines(afterPlacement);
  }
}

function afterPlacement() {
  if (currentDockBlocks.every((b) => b === null)) {
    if (linesClearedThisRound === 0) {
      currentCombo = 0;
      setDoubleScore(false);
      updateHUD();
    }
    linesClearedThisRound = 0;
    isGameLocked = true;
    later(triggerNewQuiz, 350);
  } else {
    checkGameOverCondition();
  }
}

document.querySelectorAll('.dock-slot').forEach((slot) => slot.addEventListener('pointerdown', onSlotPointerDown));
window.addEventListener('pointermove', onPointerMove, { passive: true });
window.addEventListener('pointerup', onPointerUp);
window.addEventListener('pointercancel', onPointerUp);
// iOS 사파리/크롬: 드래그 중 화면 스크롤 방지
document.addEventListener('touchmove', (e) => drag && e.preventDefault(), { passive: false });

// 그림자 + 지워질 줄 미리보기
let shadowEls = [];
let clearEls = [];
function clearShadow() {
  for (const el of shadowEls) el.classList.remove('cell-shadow', 'ghost-1', 'ghost-2', 'ghost-3');
  for (const el of clearEls) el.classList.remove('cell-will-clear');
  shadowEls = [];
  clearEls = [];
}
function drawShadow(r, c, data) {
  clearShadow();
  const m = data.matrix;
  const inPiece = (rr, cc) => {
    const pr = rr - r;
    const pc = cc - c;
    return pr >= 0 && pr < m.length && pc >= 0 && pc < m[0].length && m[pr][pc] === 1;
  };
  for (let pr = 0; pr < m.length; pr++) {
    for (let pc = 0; pc < m[pr].length; pc++) {
      if (!m[pr][pc]) continue;
      const el = cellEls[r + pr][c + pc];
      el.classList.add('cell-shadow', `ghost-${data.colorVal}`);
      shadowEls.push(el);
    }
  }
  const filled = (rr, cc) => board[rr][cc] !== 0 || inPiece(rr, cc);
  const marks = new Set();
  for (let rr = r; rr < r + m.length; rr++) {
    let full = true;
    for (let cc = 0; cc < BOARD_SIZE && full; cc++) full = filled(rr, cc);
    if (full) for (let cc = 0; cc < BOARD_SIZE; cc++) marks.add(cellEls[rr][cc]);
  }
  for (let cc = c; cc < c + m[0].length; cc++) {
    let full = true;
    for (let rr = 0; rr < BOARD_SIZE && full; rr++) full = filled(rr, cc);
    if (full) for (let rr = 0; rr < BOARD_SIZE; rr++) marks.add(cellEls[rr][cc]);
  }
  marks.forEach((el) => {
    el.classList.add('cell-will-clear');
    clearEls.push(el);
  });
}

function redrawShadowIfDragging() {
  if (!drag) return;
  drag.key = '';
  dragFrame();
}

function canPlaceBlock(startR, startC, matrix) {
  for (let r = 0; r < matrix.length; r++) {
    for (let c = 0; c < matrix[r].length; c++) {
      if (matrix[r][c] !== 1) continue;
      const tr = startR + r;
      const tc = startC + c;
      if (tr < 0 || tr >= BOARD_SIZE || tc < 0 || tc >= BOARD_SIZE || board[tr][tc] !== 0) return false;
    }
  }
  return true;
}

function placeBlock(startR, startC, matrix, colorVal) {
  for (let r = 0; r < matrix.length; r++) {
    for (let c = 0; c < matrix[r].length; c++) {
      if (matrix[r][c] === 1) {
        board[startR + r][startC + c] = colorVal;
        score += 10;
      }
    }
  }
  renderBoard();
}

// ==========================================
// ★ 줄 제거 (상태는 즉시, 연출은 뒤에) ★
// ==========================================
function clearFullLines(onComplete) {
  const rows = [];
  const cols = [];
  for (let r = 0; r < BOARD_SIZE; r++) if (board[r].every((v) => v !== 0)) rows.push(r);
  for (let c = 0; c < BOARD_SIZE; c++) {
    let full = true;
    for (let r = 0; r < BOARD_SIZE; r++) if (board[r][c] === 0) { full = false; break; }
    if (full) cols.push(c);
  }
  const total = rows.length + cols.length;
  if (!total) {
    onComplete && onComplete();
    return;
  }

  playClearSound();
  const prevCombo = currentCombo;
  currentCombo += total;
  maxComboThisRound = Math.max(maxComboThisRound, currentCombo);
  linesClearedThisRound += total;

  const hit = new Set();
  rows.forEach((r) => { for (let c = 0; c < BOARD_SIZE; c++) hit.add(r * BOARD_SIZE + c); });
  cols.forEach((c) => { for (let r = 0; r < BOARD_SIZE; r++) hit.add(r * BOARD_SIZE + c); });

  // 1) 상태 즉시 반영 (연출 중 다음 블록을 놓아도 계산이 꼬이지 않음)
  hit.forEach((idx) => {
    const r = Math.floor(idx / BOARD_SIZE);
    const c = idx % BOARD_SIZE;
    const v = board[r][c];
    const el = cellEls[r][c];
    if (v >= 11) {
      board[r][c] = v - 1 <= 10 ? 0 : v - 1;
      el.classList.add('cell-damage');
    } else if (v > 0) {
      if (v === 4) nextQuizIsBonus = true;
      board[r][c] = 0;
      el.classList.add('cell-explode');
    }
  });

  let earned = total * (gameMode === 'hell' ? 300 : 150) * currentCombo;
  if (isDoubleScoreActive) earned *= 2;
  score += earned;

  const allClear = board.every((row) => row.every((v) => v === 0));
  if (allClear) score += 1000;

  // 2) 연출
  shakeBoard(Math.min(1 + currentCombo * 0.5, 6));
  if (currentCombo >= 10) flashScreen('#ffffff', 0.85);
  showComboEffect(total, currentCombo);
  playSequentialComboSounds(prevCombo + 1, total);
  if (allClear) showAllClearEffect();
  updateHUD();

  // 3) 애니메이션 끝난 뒤 칸 다시 그리기
  later(() => {
    hit.forEach((idx) => {
      const r = Math.floor(idx / BOARD_SIZE);
      const c = idx % BOARD_SIZE;
      cellEls[r][c].classList.remove('cell-explode', 'cell-damage');
      rendered[r][c] = -1;
    });
    renderBoard();
    redrawShadowIfDragging();
  }, 330);

  onComplete && onComplete();
}

// Web Animations API (클래스 토글/리플로우 없이 실행)
function shakeBoard(intensity = 1) {
  const d = 1.5 * intensity;
  boardWrap.animate(
    [
      { transform: 'translate(0,0)' },
      { transform: `translate(${-d}px, ${d}px) rotate(${-0.3 * intensity}deg)` },
      { transform: `translate(${d}px, ${-d}px) rotate(${0.3 * intensity}deg)` },
      { transform: `translate(${-d}px, ${-d}px)` },
      { transform: `translate(${d}px, ${d}px)` },
      { transform: 'translate(0,0)' },
    ],
    { duration: 300, easing: 'ease-out' },
  );
}
function flashScreen(color, peak = 0.8) {
  const f = $('flash-overlay');
  f.style.background = color;
  f.animate([{ opacity: 0 }, { opacity: peak, offset: 0.1 }, { opacity: 0 }], { duration: 600, easing: 'ease-out' });
}
function popText(el, ms = 1200) {
  el.getAnimations().forEach((a) => a.cancel());
  el.animate(
    [
      { transform: 'translate(-50%,-50%) scale(0.3)', opacity: 0 },
      { transform: 'translate(-50%,-50%) scale(1.15)', opacity: 1, offset: 0.18 },
      { transform: 'translate(-50%,-50%) scale(1)', opacity: 1, offset: 0.8 },
      { transform: 'translate(-50%,-60%) scale(0.95)', opacity: 0 },
    ],
    { duration: ms, easing: 'ease-out' },
  );
}
function showComboEffect(lines, combo) {
  const el = $('combo-display');
  const bonus = lines > 1 ? `<span class="bonus-lines">+${lines} LINES!</span>` : '';
  const buff = isDoubleScoreActive ? '<span class="sub">x2 버프 유지 중!</span>' : '';
  el.innerHTML = `${bonus}${combo} COMBO!${buff}`;
  popText(el, 1200);
}
function showAllClearEffect() {
  popText($('all-clear-display'), 2000);
  flashScreen('#fff3b0', 0.9);
}
function floatText(text, cls, ms) {
  const el = document.createElement('div');
  el.className = `float-text ${cls}`;
  el.textContent = text;
  document.body.appendChild(el);
  el.animate(
    [
      { transform: 'translate(-50%, 0) scale(0.5)', opacity: 0 },
      { transform: 'translate(-50%, -20px) scale(1.2)', opacity: 1, offset: 0.15 },
      { transform: 'translate(-50%, -30px) scale(1.15)', opacity: 1, offset: 0.7 },
      { transform: 'translate(-50%, -90px) scale(0.85)', opacity: 0 },
    ],
    { duration: ms, easing: 'ease-out' },
  ).onfinish = () => el.remove();
}

// ==========================================
// ★ 게임 오버 / 구조(아이템으로 살리기) ★
// ==========================================
function checkGameOverCondition() {
  if (isGameOver) return;
  let active = 0;
  let placeable = 0;
  for (let i = 0; i < 3; i++) {
    const data = currentDockBlocks[i];
    if (!data) continue;
    active++;
    let can = false;
    for (let r = 0; r < BOARD_SIZE && !can; r++) for (let c = 0; c < BOARD_SIZE && !can; c++) can = canPlaceBlock(r, c, data.matrix);
    $(`slot-${i}`).classList.toggle('unplaceable', !can);
    if (can) placeable++;
  }

  if (active > 0 && placeable === 0) {
    if (playerItems.bomb > 0 || playerItems.reroll > 0) {
      showBoardBanner('놓을 곳이 없어요! 💣·🔄 아이템을 써 보세요', '포기', () => gameOver(), 'danger');
    } else {
      gameOver();
    }
  } else if (!isBombActive) {
    hideBoardBanner();
  }
}

function gameOver() {
  if (isGameOver) return;
  isGameOver = true;
  isBombActive = false;
  hideBoardBanner();
  growAIRivals(gameMode, gameLevel);
  boardWrap.classList.add('dimmed');

  const el = $('combo-display');
  el.innerHTML = '<span style="color:#ff4d6d">배치 불가!</span><span class="sub">NO SPACE</span>';
  popText(el, 1300);

  later(() => {
    playBGM('leaderboard');
    const prevBest = getBestScore(gameMode, gameLevel);
    $('go-score').textContent = score.toLocaleString();
    $('go-combo').textContent = maxComboThisRound;
    $('go-mode').textContent = gameLevel.replace('hsk', 'HSK ');
    $('go-mode-label').textContent = gameMode === 'hell' ? 'HELL 🔥' : 'NORMAL';
    $('go-record').hidden = !(score > prevBest && score > 0);
    $('nickname-input').value = store.get('hskblock_last_nick', '');
    $('nickname-error').hidden = true;
    $('game-over-modal').classList.add('active');
  }, 1300);
}

function skipRanking() {
  $('game-over-modal').classList.remove('active');
  returnToLobby();
}
$('nickname-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveRanking();
});
$('nickname-input').addEventListener('input', () => ($('nickname-error').hidden = true));

// 보드 하단 배너
let bannerAction = null;
function showBoardBanner(text, btnText, action, tone = '') {
  $('board-banner-text').textContent = text;
  const btn = $('board-banner-btn');
  btn.textContent = btnText;
  bannerAction = action;
  const b = $('board-banner');
  b.className = `board-banner ${tone}`;
  b.hidden = false;
}
function hideBoardBanner() {
  $('board-banner').hidden = true;
  bannerAction = null;
}
$('board-banner-btn').addEventListener('click', () => bannerAction && bannerAction());

// 나가기 확인
let lockBeforeExit = false;
function openExitConfirm() {
  if (isGameOver) return returnToLobby();
  lockBeforeExit = isGameLocked;
  isGameLocked = true;
  $('exit-modal').classList.add('active');
}
function closeExitConfirm() {
  $('exit-modal').classList.remove('active');
  isGameLocked = lockBeforeExit;
}
function exitToLobby() {
  $('exit-modal').classList.remove('active');
  isGameOver = true;
  gameSession++; // 진행 중인 예약 작업 무효화
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  returnToLobby();
}

// ==========================================
// ★ 퀴즈 ★
// ==========================================
function setQuizWord(text, isSentence = false) {
  const el = $('quiz-question');
  el.classList.toggle('text', isSentence);
  el.innerHTML = text;
  if (!isSentence) {
    const len = String(text).replace(/<[^>]*>/g, '').length;
    const size = len <= 2 ? 64 : len <= 4 ? 52 : len <= 7 ? 40 : len <= 11 ? 30 : 24;
    el.style.setProperty('--qsize', `${size}px`);
  }
}

function triggerNewQuiz() {
  if (isGameOver || quizOpen) return;
  if (nextQuizIsBonus) {
    nextQuizIsBonus = false;
    if (window.BONUS_QUIZ_DATA && window.BONUS_QUIZ_DATA.length) return triggerBonusQuiz();
  }
  quizOpen = true;
  isGameLocked = true;

  const levelData = (window.QUIZ_DATA && window.QUIZ_DATA[gameLevel]) || [];
  if (!availableQuizzes.length && levelData.length) availableQuizzes = shuffle([...levelData]);
  currentQuiz = availableQuizzes.length
    ? availableQuizzes.pop()
    : { q: '데이터 없음', pinyin: '-', a: '확인', options: ['확인', '준비중', '테스트'] };

  $('quiz-tag').textContent = '관문을 통과하라!';
  $('quiz-tag').className = 'quiz-tag';
  setQuizWord(currentQuiz.q);
  $('quiz-pinyin').textContent = currentQuiz.pinyin;
  $('quiz-pinyin').hidden = true;
  $('hint-btn').hidden = false;
  $('quiz-feedback').textContent = '';

  const box = $('quiz-options');
  box.innerHTML = '';
  shuffle([...currentQuiz.options]).forEach((opt, idx) => {
    const btn = document.createElement('button');
    btn.className = 'opt';
    btn.innerHTML = `<span class="num">${idx + 1}</span><span class="txt">${escapeHTML(opt)}</span>`;
    btn.dataset.value = opt;
    btn.onclick = () => answerQuiz(btn, opt);
    box.appendChild(btn);
  });

  $('quiz-modal').classList.add('active');
  playQuizPopupSound();
}

function answerQuiz(btn, opt) {
  const quiz = currentQuiz;
  const buttons = [...$('quiz-options').querySelectorAll('button')];
  buttons.forEach((b) => (b.disabled = true));
  const correct = opt === quiz.a;
  const rightBtn = buttons.find((b) => b.dataset.value === quiz.a);
  if (rightBtn) rightBtn.classList.add('correct');

  if (correct) {
    playCorrectSound();
    later(() => {
      $('quiz-modal').classList.remove('active');
      showGiantHanzi(quiz.q, quiz.pinyin, quiz.a, true);
    }, 280);
    later(() => {
      quizOpen = false;
      if (isGameOver) return;
      generateDockBlocks();
      isGameLocked = false;
    }, 2000);
  } else {
    btn.classList.add('wrong');
    playWrongSound();
    score = Math.max(0, score - 500);
    currentCombo = 0;
    linesClearedThisRound = 0;
    setDoubleScore(false);
    updateHUD();
    // 정답을 잠깐 보여준 뒤 닫기
    later(() => {
      $('quiz-modal').classList.remove('active');
      floatText('-500', 'penalty', 2000);
      showGiantHanzi(quiz.q, quiz.pinyin, quiz.a, false);
    }, 900);
    later(() => {
      quizOpen = false;
      if (isGameOver) return;
      spawnObstacleStone(gameMode);
      generateDockBlocks();
      isGameLocked = false;
    }, 2600);
  }
}

function showHint() {
  $('hint-btn').hidden = true;
  $('quiz-pinyin').hidden = false;
}

function triggerBonusQuiz() {
  quizOpen = true;
  isGameLocked = true;
  const data = window.BONUS_QUIZ_DATA;
  const bq = data[Math.floor(Math.random() * data.length)];

  $('quiz-tag').textContent = '🎁 보너스 찬스! (틀려도 페널티 없음)';
  $('quiz-tag').className = 'quiz-tag gold';
  setQuizWord(escapeHTML(bq.q), true);
  $('hint-btn').hidden = true;
  $('quiz-pinyin').hidden = true;
  $('quiz-feedback').textContent = '';

  const box = $('quiz-options');
  box.innerHTML = '';
  shuffle([...bq.options]).forEach((opt, idx) => {
    const btn = document.createElement('button');
    btn.className = 'opt';
    btn.innerHTML = `<span class="num">${idx + 1}</span><span class="txt">${escapeHTML(opt)}</span>`;
    btn.dataset.value = opt;
    btn.onclick = () => {
      const buttons = [...box.querySelectorAll('button')];
      buttons.forEach((b) => (b.disabled = true));
      const right = buttons.find((b) => b.dataset.value === bq.a);
      if (right) right.classList.add('correct');
      const fb = $('quiz-feedback');
      if (opt === bq.a) {
        playCorrectSound();
        fb.textContent = '정답입니다! 아이템을 고르세요!';
        fb.style.color = 'var(--gold)';
        later(() => {
          $('quiz-modal').classList.remove('active');
          $('item-selection-modal').classList.add('active');
        }, 1000);
      } else {
        btn.classList.add('wrong');
        playWrongSound();
        fb.textContent = '아쉽게도 틀렸어요. (페널티 없음)';
        fb.style.color = 'var(--danger)';
        later(() => {
          $('quiz-modal').classList.remove('active');
          quizOpen = false;
          if (isGameOver) return;
          generateDockBlocks();
          isGameLocked = false;
        }, 1400);
      }
    };
    box.appendChild(btn);
  });

  $('quiz-modal').classList.add('active');
  playQuizPopupSound();
}

function selectItem(type) {
  playerItems[type]++;
  updateInventoryUI();
  $('item-selection-modal').classList.remove('active');
  quizOpen = false;
  generateDockBlocks();
  isGameLocked = false;
}

// 키보드 1·2·3 으로 보기 선택, Esc 로 폭탄 취소/창 닫기
window.addEventListener('keydown', (e) => {
  if ($('quiz-modal').classList.contains('active')) {
    const n = { Digit1: 0, Digit2: 1, Digit3: 2, Numpad1: 0, Numpad2: 1, Numpad3: 2 }[e.code];
    if (n !== undefined) {
      const btn = $('quiz-options').querySelectorAll('button')[n];
      if (btn && !btn.disabled) btn.click();
    }
    return;
  }
  if (e.key === 'Escape') {
    if (isBombActive) cancelBomb();
    else if ($('exit-modal').classList.contains('active')) closeExitConfirm();
    else if ($('hsk-modal').classList.contains('active')) closeHSKModal();
  }
});

// 정답/오답 후 큰 한자 + 병음 + 뜻
function showGiantHanzi(hanzi, pinyin, meaning, isCorrect) {
  const overlay = document.createElement('div');
  overlay.className = 'giant-hanzi-overlay';
  const color = isCorrect ? '#ffd54a' : '#ff4d6d';
  const glow = isCorrect ? 'rgba(46,230,200,.8)' : 'rgba(255,0,60,.8)';
  const len = String(hanzi).replace(/<[^>]*>/g, '').length;
  const vw = Math.min(window.innerWidth, 900);
  const size = Math.min(150, Math.floor((vw * 0.86) / Math.max(1, len)));
  overlay.innerHTML = `
    <div class="giant-hanzi-text" style="--gsize:${size}px;color:${color};text-shadow:0 0 24px ${glow},0 4px 0 rgba(0,0,0,.4)">${hanzi}</div>
    <div class="giant-pinyin-text">${escapeHTML(pinyin || '')}</div>
    <div class="giant-meaning">${isCorrect ? '⭕' : '정답:'} ${escapeHTML(meaning || '')}</div>`;
  document.body.appendChild(overlay);
  overlay.animate(
    [
      { transform: 'translate(-50%,-50%) scale(0.4)', opacity: 0 },
      { transform: 'translate(-50%,-50%) scale(1.06)', opacity: 1, offset: 0.12 },
      { transform: 'translate(-50%,-50%) scale(1)', opacity: 1, offset: 0.85 },
      { transform: 'translate(-50%,-50%) scale(0.9)', opacity: 0 },
    ],
    { duration: isCorrect ? 1650 : 1650, easing: 'ease-out' },
  ).onfinish = () => overlay.remove();
  speakChinese(hanzi);
}

// ==========================================
// ★ 아이템 ★
// ==========================================
function updateInventoryUI() {
  $('item-bomb-cnt').textContent = playerItems.bomb;
  $('item-reroll-cnt').textContent = playerItems.reroll;
  $('item-double-cnt').textContent = playerItems.doubleScore;
  $('item-bomb').disabled = playerItems.bomb <= 0 && !isBombActive;
  $('item-reroll').disabled = playerItems.reroll <= 0;
  $('item-double').disabled = playerItems.doubleScore <= 0 || isDoubleScoreActive;
  $('item-bomb').classList.toggle('armed', isBombActive);
}

function setDoubleScore(on) {
  isDoubleScoreActive = on;
  boardWrap.classList.toggle('double-on', on);
  updateInventoryUI();
}

// [폭탄] 마우스: 올려서 조준 → 클릭 / 터치: 탭해서 조준 → 같은 칸 한 번 더 탭
let bombPreview = null;
function useBomb() {
  if (isBombActive) return cancelBomb();
  if (playerItems.bomb <= 0 || isGameLocked || isGameOver) return;
  isBombActive = true;
  bombPreview = null;
  updateInventoryUI();
  showBoardBanner('💣 터뜨릴 칸을 고르세요 (터치: 두 번 탭)', '취소', cancelBomb);
}
function cancelBomb() {
  isBombActive = false;
  bombPreview = null;
  clearBombTarget();
  updateInventoryUI();
  hideBoardBanner();
  checkGameOverCondition();
}
function clearBombTarget() {
  gridEl.querySelectorAll('.bomb-target').forEach((el) => el.classList.remove('bomb-target'));
}
function markBombTarget(r, c) {
  clearBombTarget();
  for (let i = r - 1; i <= r + 1; i++)
    for (let j = c - 1; j <= c + 1; j++)
      if (i >= 0 && i < BOARD_SIZE && j >= 0 && j < BOARD_SIZE) cellEls[i][j].classList.add('bomb-target');
}
function cellFromEvent(e) {
  const el = e.target.closest('.grid-cell');
  return el ? { r: Number(el.dataset.r), c: Number(el.dataset.c) } : null;
}
gridEl.addEventListener('pointerover', (e) => {
  if (!isBombActive || e.pointerType !== 'mouse') return;
  const cell = cellFromEvent(e);
  if (cell) markBombTarget(cell.r, cell.c);
});
gridEl.addEventListener('pointerleave', () => isBombActive && !bombPreview && clearBombTarget());
gridEl.addEventListener('click', (e) => {
  if (!isBombActive) return;
  const cell = cellFromEvent(e);
  if (!cell) return;
  const isMouse = e.pointerType === 'mouse' || (e.pointerType === undefined && matchMedia('(hover: hover)').matches);
  if (isMouse || (bombPreview && bombPreview.r === cell.r && bombPreview.c === cell.c)) {
    detonateBomb(cell.r, cell.c);
  } else {
    bombPreview = cell;
    markBombTarget(cell.r, cell.c);
  }
});

function detonateBomb(r, c) {
  isBombActive = false;
  bombPreview = null;
  playerItems.bomb--;
  clearBombTarget();
  hideBoardBanner();
  updateInventoryUI();

  playBombSound();
  shakeBoard(6);
  flashScreen('#ff4500', 0.6);

  let destroyed = 0;
  for (let i = r - 1; i <= r + 1; i++) {
    for (let j = c - 1; j <= c + 1; j++) {
      if (i < 0 || i >= BOARD_SIZE || j < 0 || j >= BOARD_SIZE) continue;
      const v = board[i][j];
      if (!v) continue;
      if (v === 4) nextQuizIsBonus = true;
      if (v < 11) destroyed++;
      board[i][j] = 0;
      cellEls[i][j].classList.add('bomb-explode');
    }
  }
  score += destroyed * 20;
  const allClear = board.every((row) => row.every((v) => v === 0));
  if (allClear) {
    score += 1000;
    showAllClearEffect();
  }
  updateHUD();

  later(() => {
    gridEl.querySelectorAll('.bomb-explode').forEach((el) => {
      el.classList.remove('bomb-explode');
      rendered[Number(el.dataset.r)][Number(el.dataset.c)] = -1;
    });
    renderBoard();
    checkGameOverCondition();
  }, 400);
}

// [리롤] 남은 블록을 일반 규칙으로 새로 뽑음 (놓을 수 있는 블록이 나오도록 몇 번 재시도)
function useReroll() {
  if (playerItems.reroll <= 0 || isGameLocked || isGameOver || isBombActive) return;
  playerItems.reroll--;
  updateInventoryUI();
  playRerollSound();
  document.querySelectorAll('.dock-slot').forEach((s) => animateOnce(s, 'reroll-anim', 500));

  later(() => {
    const colors = shuffle([1, 2, 3]);
    const slots = [0, 1, 2].filter((i) => currentDockBlocks[i] !== null);
    for (let attempt = 0; attempt < 12; attempt++) {
      slots.forEach((i) => (currentDockBlocks[i] = { matrix: randomMatrix(), colorVal: colors[i] }));
      const anyFits = slots.some((i) => {
        for (let r = 0; r < BOARD_SIZE; r++) for (let c = 0; c < BOARD_SIZE; c++) if (canPlaceBlock(r, c, currentDockBlocks[i].matrix)) return true;
        return false;
      });
      if (anyFits) break;
    }
    slots.forEach(renderDockSlot);
    checkGameOverCondition();
  }, 250);
}

// [점수 2배] 콤보가 끊길 때까지 유지
function useDoubleScore() {
  if (playerItems.doubleScore <= 0 || isDoubleScoreActive || isGameLocked || isGameOver) return;
  playerItems.doubleScore--;
  setDoubleScore(true);
  updateHUD();
  playBuffSound();
  floatText('⭐ SCORE x2 BUFF! ⭐', 'buff', 1500);
}

// ==========================================
// ★ 크롬 안내 배너 / 앱 설치 / 오프라인 캐시 ★
// ==========================================
(function browserSupport() {
  const B = window.__BROWSER || {};
  const banner = $('browser-banner');
  let dismissed = false;
  try {
    dismissed = sessionStorage.getItem('hskblock_bb') === '1';
  } catch (e) {}

  if (!B.isChrome && !B.standalone && !dismissed) {
    const openBtn = $('bb-open');
    const sub = $('bb-sub');
    if (B.isWeb && B.isAndroid) {
      openBtn.onclick = () => {
        location.href = `intent://${location.host}${location.pathname}${location.search}#Intent;scheme=${location.protocol.replace(':', '')};package=com.android.chrome;end`;
      };
    } else if (B.isWeb && B.isIOS) {
      openBtn.onclick = () => {
        location.href = location.href.replace(/^https:/, 'googlechromes:').replace(/^http:/, 'googlechrome:');
      };
      sub.textContent = 'Chrome 앱이 설치되어 있으면 바로 열려요.';
    } else {
      // 데스크탑 또는 파일로 직접 연 경우: 주소 복사 안내
      openBtn.textContent = B.isWeb ? '주소 복사' : '실행 방법';
      sub.textContent = B.isWeb
        ? '주소를 복사해 크롬 주소창에 붙여 넣어 주세요.'
        : '폴더의 PLAY_Chrome 실행 파일로 열면 항상 크롬에서 열려요.';
      openBtn.onclick = () => {
        if (B.isWeb && navigator.clipboard) {
          navigator.clipboard.writeText(location.href).then(() => toast('주소를 복사했어요. 크롬에 붙여 넣으세요.'));
        } else {
          toast('PLAY_Chrome_Windows.bat / PLAY_Chrome_Mac.command 를 실행하세요', 3000);
        }
      };
    }
    $('bb-close').onclick = () => {
      banner.hidden = true;
      try {
        sessionStorage.setItem('hskblock_bb', '1');
      } catch (e) {}
    };
    banner.hidden = false;
  }

  // 홈 화면 설치 (https 로 올렸을 때 크롬에서 동작)
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    $('install-btn').hidden = false;
  });
  $('install-btn').addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    $('install-btn').hidden = true;
  });
  window.addEventListener('appinstalled', () => toast('홈 화면에 설치됐어요!'));
  if (B.isIOS && B.isWeb && !B.standalone) $('ios-install-tip').hidden = false;

  if ('serviceWorker' in navigator && B.isWeb) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
})();

// 초기 UI
updateSoundUI();
updateVoiceChip();
layout();
