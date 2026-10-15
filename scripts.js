/* © 2026 진담중국어 (Jindam Chinese). All rights reserved. */
/* ==========================================================
   HSK 블록퍼즐 v2 — scripts.js
   ----------------------------------------------------------
   - 게임판·블록·드래그·효과: 캔버스에 직접 그림 (웹페이지 요소 수십 개 → 그림판 1장)
   - 메뉴·퀴즈·랭킹: HTML
   - 진행 기록·랭킹 저장 키는 v1 과 같음 → 학생 기록이 그대로 이어짐
   ========================================================== */
'use strict';

// ==========================================
// ★ 유틸 ★
// ==========================================
const $ = (id) => document.getElementById(id);
const ASSETS = document.body.dataset.assets || '';
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
const icon = (name, cls = '') => `<svg class="ic ${cls}"><use href="#i-${name}"/></svg>`;
function starsHTML(n, total = 3) {
  let h = '';
  for (let i = 0; i < total; i++) h += icon('star', i < n ? 'on' : '');
  return h;
}

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
// ★ 사운드 설정 (0: 모두 켬 / 1: 배경음 끔 / 2: 모두 끔) ★
// ==========================================
let soundMode = store.get('hskblock_sound', 0);
const SOUND_ICON = ['sound', 'music-off', 'mute'];
const SOUND_LABEL = ['소리 켬', '배경음 끔', '음소거'];
const SOUND_TOAST = ['배경음·효과음·음성 모두 켬', '배경음만 끔 (효과음·음성은 켬)', '모든 소리 끔'];
const bgmOn = () => soundMode === 0;
const sfxOn = () => soundMode < 2;

function updateSoundUI() {
  $('btn-sound').innerHTML = icon(SOUND_ICON[soundMode]);
  $('lobby-sound').innerHTML = `${icon(SOUND_ICON[soundMode])}${SOUND_LABEL[soundMode]}`;
}
function cycleSound() {
  soundMode = (soundMode + 1) % 3;
  store.set('hskblock_sound', soundMode);
  updateSoundUI();
  toast(SOUND_TOAST[soundMode]);
  if (bgmOn()) resumeBGM();
  else pauseBGM();
  if (!sfxOn() && 'speechSynthesis' in window) speechSynthesis.cancel();
  sfx.tap();
}

// ==========================================
// ★ 배경음악 (mp3, 필요할 때만 로딩 + 끊김 자동 복구) ★
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
let bgmRetryTimer = 0;
let bgmPausedByUs = false;
const bgmWanted = () => !!bgmType && bgmOn() && audioUnlocked && !document.hidden;
const bgmIsCurrent = () => (BGM_LIST[bgmType] || []).some((f) => bgmEl.src.endsWith('/' + f));

function nextTrack() {
  const list = BGM_LIST[bgmType] || [];
  bgmIndex = (bgmIndex + 1) % Math.max(1, list.length);
  startTrack(true);
}
bgmEl.addEventListener('ended', () => {
  if ((BGM_LIST[bgmType] || []).length > 1) nextTrack();
  else resumeBGM();
});
bgmEl.addEventListener('error', () => {
  clearTimeout(bgmRetryTimer);
  bgmRetryTimer = setTimeout(() => bgmWanted() && nextTrack(), 1500);
});
// 음성(TTS)·전화 등으로 브라우저가 멋대로 멈추면 다시 재생
bgmEl.addEventListener('pause', () => {
  if (bgmPausedByUs || bgmEl.ended) return;
  clearTimeout(bgmRetryTimer);
  bgmRetryTimer = setTimeout(resumeBGM, 600);
});
function pauseBGM() {
  bgmPausedByUs = true;
  bgmEl.pause();
  bgmPausedByUs = false;
}
function startTrack(forceReload = false) {
  const list = BGM_LIST[bgmType];
  if (!list || !bgmWanted()) return;
  bgmEl.loop = list.length === 1;
  const file = list[bgmIndex];
  if (forceReload || !bgmEl.src.endsWith('/' + file)) bgmEl.src = ASSETS + file;
  else bgmEl.currentTime = 0;
  bgmEl.play().catch(() => {});
}
function playBGM(type) {
  if (bgmType === type && !bgmEl.paused) return;
  bgmType = type;
  const list = BGM_LIST[type];
  bgmIndex = list.length > 1 ? Math.floor(Math.random() * list.length) : 0;
  pauseBGM();
  startTrack();
}
function resumeBGM() {
  if (!bgmWanted() || !bgmEl.paused) return;
  if (!bgmEl.src || !bgmIsCurrent()) return startTrack();
  bgmEl.play().catch(() => {});
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pauseBGM();
  else resumeBGM();
});
setInterval(() => {
  if (bgmWanted() && bgmEl.paused && !bgmEl.seeking) resumeBGM();
}, 3000);

// ==========================================
// ★ 효과음 (Web Audio로 직접 합성 — 말랑하고 귀여운 소리) ★
// ==========================================
let audioCtx = null;
let master = null;
function ensureAudio() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    audioCtx = new AC();
    const comp = audioCtx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 4;
    master = audioCtx.createGain();
    master.gain.value = 0.55;
    master.connect(comp);
    comp.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}
const canPlay = () => sfxOn() && ensureAudio();
function envGain(t0, attack, decay, peak) {
  const g = audioCtx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
  g.connect(master);
  return g;
}
/** 종소리 (실로폰·마림바 느낌) */
function bell(freq, { t = 0, dur = 0.45, vol = 0.25 } = {}) {
  if (!canPlay()) return;
  const t0 = audioCtx.currentTime + t;
  const g = envGain(t0, 0.005, dur, vol);
  const o1 = audioCtx.createOscillator();
  o1.type = 'sine';
  o1.frequency.value = freq;
  o1.connect(g);
  const g2 = envGain(t0, 0.003, dur * 0.35, vol * 0.35);
  const o2 = audioCtx.createOscillator();
  o2.type = 'sine';
  o2.frequency.value = freq * 3.99;
  o2.connect(g2);
  [o1, o2].forEach((o) => {
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  });
}
/** 미끄러지는 소리 (뽁, 뿅, 우웅) */
function slide(f0, f1, { t = 0, dur = 0.12, vol = 0.3, type = 'sine' } = {}) {
  if (!canPlay()) return;
  const t0 = audioCtx.currentTime + t;
  const g = envGain(t0, 0.006, dur, vol);
  const o = audioCtx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f0, t0);
  o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
  o.connect(g);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}
/** 바람·펑 소리 (걸러낸 잡음) */
let noiseBuf = null;
function puff({ t = 0, dur = 0.3, vol = 0.3, f0 = 1500, f1 = 200, type = 'lowpass' } = {}) {
  if (!canPlay()) return;
  if (!noiseBuf) {
    noiseBuf = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.6, audioCtx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t0 = audioCtx.currentTime + t;
  const src = audioCtx.createBufferSource();
  src.buffer = noiseBuf;
  const f = audioCtx.createBiquadFilter();
  f.type = type;
  f.Q.value = type === 'bandpass' ? 2 : 0.7;
  f.frequency.setValueAtTime(f0, t0);
  f.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
  const g = envGain(t0, 0.01, dur, vol);
  src.connect(f);
  f.connect(g);
  src.start(t0);
  src.stop(t0 + dur + 0.05);
}
// 도레미솔라 (5음계) — 콤보가 오를수록 높은 음
const PENTA = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98, 1760, 2093];
const sfx = {
  tap: () => bell(880, { dur: 0.06, vol: 0.08 }),
  pick: () => bell(1320, { dur: 0.08, vol: 0.1 }),
  place: () => {
    slide(620, 300, { dur: 0.08, vol: 0.32 });
    puff({ dur: 0.05, vol: 0.06, f0: 3000, f1: 800 });
  },
  invalid: () => slide(330, 240, { dur: 0.16, vol: 0.18, type: 'triangle' }),
  clear: (fromCombo, lines) => {
    puff({ dur: 0.18, vol: 0.12, f0: 4000, f1: 600, type: 'bandpass' });
    for (let i = 0; i < lines; i++) {
      const n = Math.min(PENTA.length - 1, fromCombo - 1 + i);
      bell(PENTA[n], { t: i * 0.09, dur: 0.5, vol: 0.26 });
    }
  },
  quiz: () => slide(320, 780, { dur: 0.14, vol: 0.22 }),
  correct: () => {
    bell(1318.51, { dur: 0.35, vol: 0.25 });
    bell(1760, { t: 0.1, dur: 0.5, vol: 0.25 });
  },
  wrong: () => {
    slide(392, 330, { dur: 0.18, vol: 0.2, type: 'triangle' });
    slide(330, 247, { t: 0.17, dur: 0.26, vol: 0.2, type: 'triangle' });
  },
  sparkle: () => [2093, 2637, 3136, 2349].forEach((f, i) => bell(f, { t: i * 0.05, dur: 0.25, vol: 0.09 })),
  thud: () => {
    slide(180, 70, { dur: 0.25, vol: 0.45 });
    puff({ dur: 0.12, vol: 0.1, f0: 600, f1: 100 });
  },
  bomb: () => {
    puff({ dur: 0.5, vol: 0.5, f0: 1600, f1: 90 });
    slide(150, 45, { dur: 0.4, vol: 0.4 });
  },
  reroll: () => {
    puff({ dur: 0.28, vol: 0.18, f0: 500, f1: 2600, type: 'bandpass' });
    bell(1046.5, { t: 0.2, dur: 0.25, vol: 0.12 });
  },
  buff: () => [1046.5, 1318.51, 1567.98, 2093].forEach((f, i) => bell(f, { t: i * 0.07, dur: 0.35, vol: 0.18 })),
  speed: () => {
    bell(2093, { dur: 0.15, vol: 0.14 });
    bell(2637, { t: 0.06, dur: 0.2, vol: 0.14 });
  },
  heart: () => [659.25, 987.77, 1318.51].forEach((f, i) => bell(f, { t: i * 0.02, dur: 0.8, vol: 0.14 })),
  stageClear: () => {
    [1046.5, 1318.51, 1567.98].forEach((f, i) => bell(f, { t: i * 0.12, dur: 0.3, vol: 0.2 }));
    [1046.5, 1318.51, 1567.98, 2093].forEach((f) => bell(f, { t: 0.42, dur: 1.1, vol: 0.13 }));
  },
  fail: () => [523.25, 466.16, 392, 349.23].forEach((f, i) => bell(f, { t: i * 0.16, dur: 0.4, vol: 0.16 })),
};

// ==========================================
// ★ 중국어 음성 (Tingting 우선 · 크롬 데스크톱 대응) ★
// ==========================================
let zhVoice = null;
const brokenVoices = new Set();
const voiceText = (v) => `${v.name} ${v.voiceURI}`;
const isTingting = (v) => /ting-?ting|婷婷/i.test(voiceText(v));
const isZhCN = (v) => /^(zh[-_]CN|zh[-_]Hans|cmn)/i.test(v.lang) || /^zh$/i.test(v.lang);
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
  const voices = speechSynthesis.getVoices().filter((v) => !brokenVoices.has(v.name));
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
  const el = $('voice-chip-text');
  if (!el) return;
  if (!('speechSynthesis' in window)) el.textContent = '이 브라우저는 음성 미지원';
  else if (!zhVoice) el.textContent = '중국어 음성 없음';
  else if (isTingting(zhVoice)) el.textContent = '음성: Tingting';
  else el.textContent = `대체 음성: ${zhVoice.name.replace(/Microsoft |Google |\(.*?\)|Online|Natural/g, '').trim() || zhVoice.name}`;
}
if ('speechSynthesis' in window) {
  speechSynthesis.onvoiceschanged = pickChineseVoice;
  pickChineseVoice();
  [300, 1000, 2500].forEach((ms) => setTimeout(() => !zhVoice && pickChineseVoice(), ms));
}
function unlockSpeech() {
  if (!('speechSynthesis' in window) || !(window.__BROWSER || {}).isIOS) return;
  try {
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    speechSynthesis.speak(u);
  } catch (e) {}
}
let currentUtterance = null;
function localChineseVoice() {
  const voices = speechSynthesis.getVoices().filter((v) => v.localService && !brokenVoices.has(v.name));
  for (const rule of VOICE_RULES) {
    const v = voices.find(rule);
    if (v) return v;
  }
  return null;
}
function speakNow(text, voice, isRetry) {
  const u = new SpeechSynthesisUtterance(text);
  u.lang = voice ? voice.lang : 'zh-CN';
  if (voice) u.voice = voice;
  u.rate = 0.85;
  u.volume = 1;
  let started = false;
  const fallback = () => {
    if (started || currentUtterance !== u || isRetry) return;
    if (voice) brokenVoices.add(voice.name);
    const local = localChineseVoice();
    if (local && (!voice || local.name !== voice.name)) {
      zhVoice = local;
      updateVoiceChip();
    }
    speechSynthesis.cancel();
    setTimeout(() => speakNow(text, local, true), 120);
  };
  u.onstart = () => (started = true);
  u.onend = () => setTimeout(resumeBGM, 200);
  u.onerror = (e) => {
    setTimeout(resumeBGM, 200);
    if (!started && !isRetry && e.error !== 'interrupted' && e.error !== 'canceled') fallback();
  };
  currentUtterance = u;
  speechSynthesis.resume();
  speechSynthesis.speak(u);
  if (voice && !voice.localService) setTimeout(fallback, 1500);
}
function speakChinese(text) {
  if (!sfxOn() || !('speechSynthesis' in window)) return;
  const clean = String(text).replace(/<[^>]*>/g, '').trim();
  if (!clean) return;
  if (!zhVoice || brokenVoices.has(zhVoice.name)) pickChineseVoice();
  const voice = zhVoice && !brokenVoices.has(zhVoice.name) ? zhVoice : localChineseVoice();
  if (speechSynthesis.speaking || speechSynthesis.pending) {
    speechSynthesis.cancel();
    setTimeout(() => speakNow(clean, voice, false), 150);
  } else {
    speakNow(clean, voice, false);
  }
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
  sfx.buff();
  showScreen('lobby-screen');
  playBGM('intro');
}
$('start-screen').addEventListener('click', initStartScreen);
document.addEventListener('keydown', initStartScreen);

// ==========================================
// ★ 스테이지 (노말 25단어 / 헬 100단어씩) ★
// ==========================================
const STAGE_SIZE = { normal: 25, hell: 100 };
const PROGRESS_KEY = 'hskblock_progress_v1';
let pendingGameMode = 'normal';
let gameLevel = 'hsk4';
let currentStage = 1;

const levelWords = (level) => (window.QUIZ_DATA && window.QUIZ_DATA[level]) || [];
const stageCount = (mode, level) => Math.ceil(levelWords(level).length / STAGE_SIZE[mode]);
function stageWords(mode, level, stage) {
  const size = STAGE_SIZE[mode];
  return levelWords(level).slice((stage - 1) * size, stage * size);
}
const levelLabel = (level) => level.replace('hsk', 'HSK ');
const modeLabel = (mode) => (mode === 'hell' ? '헬' : '노말');

function loadProgress() {
  return store.get(PROGRESS_KEY, { normal: {}, hell: {} });
}
function levelProgress(mode, level) {
  const p = loadProgress();
  return (p[mode] && p[mode][level]) || {};
}
function stageRecord(mode, level, stage) {
  return levelProgress(mode, level)[stage] || null;
}
function isUnlocked(mode, level, stage) {
  return stage === 1 || !!stageRecord(mode, level, stage - 1);
}
function clearedCount(mode, level) {
  return Object.keys(levelProgress(mode, level)).filter((k) => /^\d+$/.test(k)).length;
}
function saveStageClear(mode, level, stage, stars, gained) {
  const p = loadProgress();
  p[mode] = p[mode] || {};
  const lv = (p[mode][level] = p[mode][level] || {});
  const prev = lv[stage] || { stars: 0, best: 0 };
  const isBest = gained > prev.best;
  lv[stage] = { stars: Math.max(prev.stars, stars), best: Math.max(prev.best, gained) };
  store.set(PROGRESS_KEY, p);
  return { isBest, firstClear: !prev.best && !prev.stars };
}
function setLastStage(mode, level, stage) {
  const p = loadProgress();
  p[mode] = p[mode] || {};
  const lv = (p[mode][level] = p[mode][level] || {});
  lv.last = stage;
  store.set(PROGRESS_KEY, p);
}
function getBestScore(mode, level, stage = currentStage) {
  const rec = stageRecord(mode, level, stage);
  return rec ? rec.best : 0;
}
function starsFor(mode, wrong, heartsUsed) {
  const [three, two] = mode === 'hell' ? [2, 8] : [0, 2];
  let s = wrong <= three ? 3 : wrong <= two ? 2 : 1;
  if (heartsUsed > 0) s -= 1; // 하트를 쓰면 별 하나 덜
  return Math.max(1, s);
}

// ---------- 급수 선택 ----------
function openHSKModal(mode) {
  sfx.tap();
  pendingGameMode = mode;
  $('hsk-modal-title').textContent = `${modeLabel(mode)} 모드 · 급수 선택`;
  ['hsk4', 'hsk5', 'hsk6'].forEach((l) => {
    const el = $(`cnt-${l}`);
    if (el) el.textContent = `${clearedCount(mode, l)} / ${stageCount(mode, l)}단계`;
  });
  $('hsk-modal').classList.add('active');
}
function closeHSKModal() {
  $('hsk-modal').classList.remove('active');
}
function selectHSK(level) {
  sfx.tap();
  closeHSKModal();
  showStageScreen(pendingGameMode, level);
}

// ---------- 단계 선택 화면 ----------
function showStageScreen(mode = gameMode, level = gameLevel) {
  gameMode = mode;
  gameLevel = level;
  document.body.className = `theme-${mode} theme-${level}`;
  document.body.classList.remove('fever-on');
  document.querySelectorAll('.float-text, .giant-hanzi-overlay').forEach((el) => el.remove());
  showScreen('stage-screen');
  playBGM('intro');
  renderStageGrid();
}
function renderStageGrid() {
  const mode = gameMode;
  const level = gameLevel;
  const total = stageCount(mode, level);
  const prog = levelProgress(mode, level);
  const cleared = clearedCount(mode, level);
  let stars = 0;
  for (let s = 1; s <= total; s++) if (prog[s]) stars += prog[s].stars;

  $('stage-title').textContent = `${modeLabel(mode)} · ${levelLabel(level)}급`;
  $('stage-sub').textContent = `단계마다 ${STAGE_SIZE[mode]}단어를 모두 맞히면 클리어!`;
  $('stage-cleared').textContent = `${cleared} / ${total}`;
  $('stage-stars').textContent = `${stars} / ${total * 3}`;
  $('stage-bar').style.width = `${total ? (cleared / total) * 100 : 0}%`;

  const next = Math.min(total, cleared + 1);
  let html = '';
  for (let s = 1; s <= total; s++) {
    const rec = prog[s];
    const open = isUnlocked(mode, level, s);
    const cls = rec ? 'cleared' : open ? 'open now' : 'locked';
    const inner = rec
      ? `<span class="st-stars">${starsHTML(rec.stars)}</span>`
      : open
        ? '<span class="st-go">도전!</span>'
        : `<span class="st-lock">${icon('lock')}</span>`;
    html += `<button class="stage-tile ${cls}" data-stage="${s}"><b>${s}</b>${inner}</button>`;
  }
  const grid = $('stage-grid');
  grid.innerHTML = html;
  const focus = prog.last && isUnlocked(mode, level, prog.last) ? prog.last : next;
  const target = grid.querySelector(`[data-stage="${focus}"]`);
  if (target) requestAnimationFrame(() => target.scrollIntoView({ block: 'center' }));
}
$('stage-grid').addEventListener('click', (e) => {
  const tile = e.target.closest('.stage-tile');
  if (!tile) return;
  const s = Number(tile.dataset.stage);
  if (!isUnlocked(gameMode, gameLevel, s)) {
    sfx.invalid();
    toast(`${s - 1}단계를 먼저 클리어해야 해요`);
    return;
  }
  sfx.tap();
  startGame(gameMode, gameLevel, s);
});

// ==========================================
// ★ 명예의 전당 (모드·급수별 누적 / 이번 주) ★
//   - 친구들 기록은 날짜를 기준으로 계산 → 어느 기기에서 봐도 같은 이름·같은 점수
//   - 친구마다 실력·주로 하는 시간·꾸준함이 달라서 하루하루 순위가 바뀜
// ==========================================
let currentRankMode = 'normal';
let currentRankLevel = 'hsk4';
let currentRankView = 'all'; // 'all' | 'week'
let rankBackTo = 'lobby';
const DAY = 86400000;
const HIST_KEY = 'hskblock_hist_v1';
const getNick = () => store.get('hskblock_last_nick', '');
const RANK_EPOCH = new Date(2026, 8, 1).getTime(); // 친구들이 게임을 시작한 기준일

// 함께 플레이하는 친구들 (각자 성향이 이름으로 고정됨)
const ROSTER = [
  '민준', '서연', '하준이', '지우짱', '도윤123', '예린', '수아공주', '판다조아', '만두는사랑', '탕후루킹',
  '열공중', '중국어천재', 'HSK합격', 'jiho0312', 'yuna_k', '하늘별', '시우', '은우', '라온', '다온',
  '연우', '서준', '지안', '하린', '윤서', '채원', '민서', '준우', '건우', '니하오짱',
  '샤오룽바오', '월병맛있어', '훠궈러버', '마라탕중독', '별빛소녀', '축구왕', '고양이집사', '공부하자', '오늘도출석', '미래통역사',
  '북경가자', '상하이드림', '팬더곰', '꿀벌', '젤리곰', '딸기우유', '초코칩', '민트초코', '구름빵', '해바라기',
  '콩떡', '레몬에이드', '토끼발', '대나무숲', '용용이', '짜요짜요', 'minseo07', 'dahyun', '쭝궈마스터', '한자왕',
];
const AVATAR_COLORS = ['#ff8fb1', '#ffb547', '#6fcf97', '#56b4ff', '#a98bff', '#ff8a65', '#4dd0c8', '#f7c948'];

function seededRandom(seedText) {
  let h = 2166136261;
  for (const ch of seedText) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const dayIndex = (ts) => {
  const d = new Date(ts);
  return Math.floor((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - RANK_EPOCH) / DAY);
};
function weekStart(ts = Date.now()) {
  const d = new Date(ts);
  const back = (d.getDay() + 6) % 7; // 월요일 시작
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - back).getTime();
}
// 단계 하나 클리어 점수 추정 (v2 난이도 시뮬레이션 기준: 노말 25단어 ≈ 2.5~3만, 헬 100단어 ≈ 26만)
function stageScoreEstimate(mode, level, stage) {
  const words = stageWords(mode, level, stage).length || STAGE_SIZE[mode];
  const perWord = mode === 'hell' ? 2700 : 1150;
  return perWord * words * (1 + Math.min(stage, 60) * 0.004);
}
function kidTraits(name) {
  const r = seededRandom('kid|' + name);
  return {
    skill: 0.68 + r() * 0.5, // 실력
    hour: 15 + Math.floor(r() * 7), // 주로 하는 시간 (오후 3시~밤 9시대)
    weekday: 0.12 + r() * 0.5, // 평일에 할 확률
    weekend: 0.08 + r() * 0.55, // 주말에 할 확률
  };
}
/** 친구 한 명의 오늘까지 기록 계산 */
function simulateKid(mode, level, name, now) {
  const seed = `${mode}|${level}|${name}`;
  const r0 = seededRandom(seed);
  const join = r0();
  if (join > (mode === 'hell' ? 0.45 : 0.62)) return null; // 이 급수는 안 하는 친구
  const k = kidTraits(name);
  const total = stageCount(mode, level);
  const startDay = Math.floor(Math.pow(r0(), 0.7) * 85) - 15; // 최근에 새로 들어온 친구가 많음
  const quitAfter = r0() < 0.3 ? 5 + Math.floor(r0() * 30) : 9999; // 중간에 그만둔 친구도 있음
  const today = dayIndex(now);
  const nowMin = new Date(now).getHours() * 60 + new Date(now).getMinutes();
  const wk = weekStart(now);
  let cleared = 0, score = 0, stars = 0, week = 0, last = 0;
  for (let d = Math.max(0, startDay); d <= Math.min(today, startDay + quitAfter); d++) {
    const r = seededRandom(`${seed}|${d}`);
    const dayTs = RANK_EPOCH + d * DAY;
    const dow = new Date(dayTs).getDay();
    if (r() > (dow === 0 || dow === 6 ? k.weekend : k.weekday)) continue;
    const playMin = k.hour * 60 + Math.floor(r() * 150);
    if (d === today && nowMin < playMin) continue; // 오늘은 아직 안 함
    const tries = mode === 'hell' ? 1 : 1 + (r() < 0.35 ? 1 : 0);
    let played = false;
    for (let t = 0; t < tries && cleared < total; t++) {
      played = true;
      const prog = cleared / Math.max(1, total);
      const p = mode === 'hell' ? clamp(k.skill * 0.42 - prog * 0.2, 0.06, 0.45) : clamp(k.skill - 0.12 - prog * 0.6, 0.15, 0.9);
      if (r() > p) break; // 실패하면 그날은 끝
      cleared++;
      const s = Math.round((stageScoreEstimate(mode, level, cleared) * k.skill * (0.85 + r() * 0.3)) / 10) * 10;
      score += s;
      stars += 1 + (r() < k.skill * 0.75 ? 1 : 0) + (r() < k.skill * 0.45 ? 1 : 0);
      if (dayTs >= wk) week += s;
    }
    if (played) last = dayTs + playMin * 60000 + Math.floor(r() * 25) * 60000;
  }
  if (!cleared) return null;
  return { name, cleared, score, stars, week, last: Math.min(last, now), isPlayer: false };
}
let rivalCache = { key: '', rows: [] };
function rivalRows(mode, level) {
  const now = Date.now();
  const key = `${mode}|${level}|${Math.floor(now / 60000)}`;
  if (rivalCache.key !== key) {
    rivalCache = { key, rows: ROSTER.map((n) => simulateKid(mode, level, n, now)).filter(Boolean) };
  }
  return rivalCache.rows;
}
function playerRow(mode, level) {
  const prog = levelProgress(mode, level);
  let cleared = 0, score = 0, stars = 0;
  for (const k of Object.keys(prog)) {
    if (!/^\d+$/.test(k)) continue;
    cleared++;
    score += prog[k].best;
    stars += prog[k].stars;
  }
  if (!cleared) return null;
  const hist = store.get(HIST_KEY, []).filter((h) => h.m === mode && h.l === level);
  const wk = weekStart();
  const week = hist.filter((h) => h.t >= wk).reduce((a, h) => a + h.add, 0);
  const last = hist.length ? hist[hist.length - 1].t : Date.now();
  return { name: getNick() || '나', cleared, score, stars, week, last, isPlayer: true };
}
function recordHistory(mode, level, add) {
  const hist = store.get(HIST_KEY, []);
  hist.push({ m: mode, l: level, t: Date.now(), add });
  store.set(HIST_KEY, hist.slice(-300));
}
function rankingRows(mode, level, view = 'all') {
  const me = playerRow(mode, level);
  let rows = [...rivalRows(mode, level), ...(me ? [me] : [])];
  if (view === 'week') rows = rows.filter((r) => r.week > 0 || r.isPlayer).sort((a, b) => b.week - a.week);
  else rows.sort((a, b) => b.score - a.score);
  return rows;
}
function myRank(mode, level, view = 'all') {
  return rankingRows(mode, level, view).findIndex((r) => r.isPlayer) + 1;
}
function timeAgo(ts) {
  const diff = Date.now() - ts;
  if (diff < 5 * 60000) return '방금 전';
  if (diff < 60 * 60000) return `${Math.floor(diff / 60000)}분 전`;
  if (diff < DAY && new Date(ts).getDate() === new Date().getDate()) return `${Math.floor(diff / 3600000)}시간 전`;
  const days = dayIndex(Date.now()) - dayIndex(ts);
  if (days <= 1) return '어제';
  if (days < 7) return `${days}일 전`;
  const d = new Date(ts);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}
function avatarHTML(name) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const first = [...name][0] || '?';
  return `<span class="rk-avatar" style="background:${AVATAR_COLORS[h % AVATAR_COLORS.length]}">${escapeHTML(/[a-z]/i.test(first) ? first.toUpperCase() : first)}</span>`;
}

function updateRankBox(beforeRank) {
  const rank = myRank(gameMode, gameLevel);
  const up = beforeRank > 0 && rank > 0 && rank < beforeRank ? ` (${beforeRank - rank}계단 상승!)` : '';
  $('rank-done-text').textContent = rank > 0 ? `${levelLabel(gameLevel)}급 누적 랭킹 ${rank}위${up}` : '';
}
function saveRanking() {
  const input = $('nickname-input');
  const nickname = input.value.trim();
  if (!nickname) {
    $('nickname-error').hidden = false;
    input.focus();
    return;
  }
  sfx.tap();
  store.set('hskblock_last_nick', nickname);
  $('rank-form').hidden = true;
  $('rank-done').hidden = false;
  updateRankBox(0);
}
function showRankingScreen(mode = 'normal', level = 'hsk4', backTo) {
  rankBackTo = backTo || ($('stage-screen').classList.contains('active') ? 'stage' : 'lobby');
  document.querySelectorAll('.modal.active').forEach((m) => m.classList.remove('active'));
  showScreen('ranking-screen');
  document.body.className = '';
  playBGM('leaderboard');
  currentRankMode = mode;
  currentRankLevel = level;
  renderRankingList();
}
function openRankingFromLobby() {
  sfx.tap();
  const last = store.get('hskblock_last_level', { mode: 'normal', level: 'hsk4' });
  showRankingScreen(last.mode, last.level, 'lobby');
}
function changeRankMode(mode) {
  sfx.tap();
  currentRankMode = mode;
  renderRankingList();
}
function changeRankLevel(level) {
  sfx.tap();
  currentRankLevel = level;
  renderRankingList();
}
function changeRankView(view) {
  sfx.tap();
  currentRankView = view;
  renderRankingList();
}
function rankRowHTML(r, i, total, view) {
  const cls = ['ranking-item', i < 3 ? `top${i + 1}` : '', r.isPlayer ? 'me' : ''].join(' ');
  const shown = view === 'week' ? r.week : r.score;
  const sub = r.isPlayer ? `${r.cleared}/${total}단계 · 나` : `${r.cleared}/${total}단계 · ${timeAgo(r.last)}`;
  return `<li class="${cls}">
    <span class="rk-no">${i + 1}</span>
    ${avatarHTML(r.name)}
    <span class="rk-name">${escapeHTML(r.name)}<small>${sub}</small></span>
    <span class="rk-score">${Number(shown).toLocaleString()}<small>${icon('star')}${r.stars}</small></span>
  </li>`;
}
function renderRankingList() {
  $('tab-normal').classList.toggle('active', currentRankMode === 'normal');
  $('tab-hell').classList.toggle('active', currentRankMode === 'hell');
  $('tab-all').classList.toggle('active', currentRankView === 'all');
  $('tab-week').classList.toggle('active', currentRankView === 'week');
  ['hsk4', 'hsk5', 'hsk6'].forEach((l) => $(`tab-rank-${l}`).classList.toggle('active', currentRankLevel === l));
  const total = stageCount(currentRankMode, currentRankLevel);
  const view = currentRankView;
  const all = rankingRows(currentRankMode, currentRankLevel, view);
  const players = rivalRows(currentRankMode, currentRankLevel).length + (playerRow(currentRankMode, currentRankLevel) ? 1 : 0);
  $('rank-desc').textContent =
    view === 'week'
      ? `이번 주(월요일부터) 얻은 점수 순위예요 · 참가자 ${players}명`
      : `클리어한 단계 최고 점수의 합계 순위예요 · 참가자 ${players}명`;
  const listEl = $('ranking-list');
  if (!all.length) {
    listEl.innerHTML = '<li class="rk-empty">아직 기록이 없어요. 1단계를 클리어해 보세요!</li>';
    return;
  }
  const TOP = 20;
  let html = all.slice(0, TOP).map((r, i) => rankRowHTML(r, i, total, view)).join('');
  const myIdx = all.findIndex((r) => r.isPlayer);
  if (myIdx >= TOP) html += `<li class="rk-gap">···</li>${rankRowHTML(all[myIdx], myIdx, total, view)}`;
  if (myIdx < 0) html += '<li class="rk-gap">1단계를 클리어하면 나도 순위에 올라가요!</li>';
  listEl.innerHTML = html;
  const me = listEl.querySelector('.ranking-item.me');
  if (me) requestAnimationFrame(() => me.scrollIntoView({ block: 'nearest' }));
}

function closeRanking() {
  sfx.tap();
  if (rankBackTo === 'stage') showStageScreen(gameMode, gameLevel);
  else returnToLobby();
}
function returnToLobby() {
  document.body.className = '';
  document.querySelectorAll('.float-text, .giant-hanzi-overlay').forEach((el) => el.remove());
  showScreen('lobby-screen');
  playBGM('intro');
}

// ==========================================
// ★ 게임 상태 ★
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
let isGameLocked = false;
let isGameOver = false;
let quizOpen = false;
let currentQuiz = null;
let quizPool = [];
let stageList = [];
let correctCount = 0;
let wrongCount = 0;
let gameSession = 0;

// 피버 / 스피드
const FEVER_STREAK = 3;
const FEVER_BLOCKS = 3;
const SPEED_LIMIT_MS = 3000;
let quizStreak = 0;
let feverLeft = 0;
let quizShownAt = 0;
const feverOn = () => feverLeft > 0;
const scoreMult = () => (feverOn() ? 2 : 1);

// 하트 (놓을 곳이 없을 때 1번 살아나기)
const HEARTS_START = { normal: 1, hell: 3 };
const HEART_REGEN = { normal: 0, hell: 20 }; // 헬: 20단어 맞힐 때마다 1개 회복
let hearts = 0;
let heartsUsed = 0;
let reviving = false;

function later(fn, ms) {
  const session = gameSession;
  return setTimeout(() => {
    if (session === gameSession) fn();
  }, ms);
}

// ==========================================
// ★ 블록 모양 & 난이도 ★
//   작은(1~3칸) / 중간(4칸) / 큰(5~9칸) 세 등급을 섞어서 뽑음
//   - 단계가 오를수록 큰 블록 조금씩 증가
//   - 판이 꽉 차면 작은 블록 위주 (숨 돌릴 틈)
//   - 세 개 중 최소 1개는 반드시 놓을 수 있게
// ==========================================
const rotate = (m) => m[0].map((_, c) => m.map((row) => row[c]).reverse());
function allRotations(m) {
  const out = [];
  let cur = m;
  for (let i = 0; i < 4; i++) {
    if (!out.some((o) => JSON.stringify(o) === JSON.stringify(cur))) out.push(cur);
    cur = rotate(cur);
  }
  return out;
}
const SHAPES = {
  small: [...allRotations([[1]]), ...allRotations([[1, 1]]), ...allRotations([[1, 1, 1]]), ...allRotations([[1, 1], [1, 0]])],
  medium: [
    ...allRotations([[1, 1], [1, 1]]),
    ...allRotations([[1, 1, 1, 1]]),
    ...allRotations([[1, 0], [1, 0], [1, 1]]),
    ...allRotations([[0, 1], [0, 1], [1, 1]]),
    ...allRotations([[1, 1, 1], [0, 1, 0]]),
    ...allRotations([[1, 1, 0], [0, 1, 1]]),
    ...allRotations([[0, 1, 1], [1, 1, 0]]),
  ],
  large: [
    ...allRotations([[1, 1, 1], [1, 1, 1]]),
    ...allRotations([[1, 1, 1, 1, 1]]),
    ...allRotations([[1, 0, 0], [1, 0, 0], [1, 1, 1]]),
    [[1, 1, 1], [1, 1, 1], [1, 1, 1]],
  ],
};
function boardFill() {
  let n = 0;
  for (const row of board) for (const v of row) if (v) n++;
  return n / 64;
}
function shapeWeights() {
  const w = gameMode === 'hell' ? { small: 20, medium: 45, large: 35 } : { small: 32, medium: 50, large: 18 };
  const prog = Math.min(1, (currentStage - 1) / 30);
  w.large += prog * (gameMode === 'hell' ? 8 : 10);
  w.small -= prog * 6;
  if (currentCombo >= 8) {
    w.large += 6;
    w.small -= 4;
  }
  if (boardFill() > 0.55) {
    w.small *= 2.2;
    w.large *= 0.5;
  }
  return w;
}
function randomMatrix(w = shapeWeights()) {
  const total = w.small + w.medium + w.large;
  const x = Math.random() * total;
  const tier = x < w.small ? 'small' : x < w.small + w.medium ? 'medium' : 'large';
  const list = SHAPES[tier];
  return list[Math.floor(Math.random() * list.length)].map((r) => r.slice());
}
function fitsAnywhere(m) {
  for (let r = 0; r < BOARD_SIZE; r++) for (let c = 0; c < BOARD_SIZE; c++) if (canPlaceBlock(r, c, m)) return true;
  return false;
}
function makeFairSet(count) {
  const w = shapeWeights();
  let set = [];
  for (let attempt = 0; attempt < 10; attempt++) {
    set = Array.from({ length: count }, () => randomMatrix(w));
    if (set.some(fitsAnywhere)) break;
  }
  return set;
}

// ==========================================
// ★ 반응형 레이아웃 ★
// ==========================================
const gameEl = $('game-container');
const boardWrap = $('board-wrapper');
const layoutInfo = { cell: 40, gap: 3, pad: 8, pc: 20, step: 43 };
const measured = { portrait: { hud: 96, items: 50 }, landscape: { hud: 140, items: 50 } };

function computeLayout(W, H, landscape) {
  const pad = Math.round(clamp(Math.min(W, H) * 0.03, 8, 24));
  const gapUI = Math.round(clamp(Math.min(W, H) * 0.018, 8, 14));
  const m = measured[landscape ? 'landscape' : 'portrait'];
  let boardPx, sidePx, dockH, dockDir = 'row';
  if (!landscape) {
    boardPx = Math.min(W - pad * 2, (H - pad * 2 - m.hud - m.items - gapUI * 3) / 1.3, 680);
    dockH = Math.max(84, Math.round(boardPx * 0.3));
    sidePx = boardPx;
  } else {
    sidePx = Math.round(clamp(W * 0.3, 250, 380));
    boardPx = Math.min(H - pad * 2, W - pad * 2 - sidePx - gapUI, 860);
    const spare = W - pad * 2 - boardPx - gapUI;
    if (spare > sidePx) sidePx = Math.min(420, spare);
    dockH = Math.max(80, Math.round(boardPx - m.hud - m.items - gapUI * 2));
  }
  boardPx = Math.floor(boardPx);
  const bpad = Math.round(clamp(boardPx * 0.022, 6, 14));
  const gap = Math.round(clamp(boardPx * 0.009, 2, 6));
  const cell = Math.floor((boardPx - bpad * 2 - gap * 7) / BOARD_SIZE);
  const extra = boardPx - bpad * 2 - gap * 7 - cell * BOARD_SIZE;
  const inner = 14;
  let pc;
  if (landscape) {
    const rowPc = Math.min((sidePx - inner) / 3, dockH - inner) / 5.4;
    const colPc = Math.min(sidePx - inner, (dockH - inner) / 3) / 5.4;
    dockDir = colPc > rowPc ? 'col' : 'row';
    pc = Math.max(rowPc, colPc);
  } else {
    pc = Math.min((sidePx - inner) / 3, dockH - inner) / 5.4;
  }
  pc = Math.floor(clamp(pc, 10, cell * 0.62));
  return { pad, gapUI, boardPx, sidePx, dockH, dockDir, gap, cell, pc, boardPad: bpad + extra / 2 };
}
function applyLayout(L, landscape) {
  const root = document.documentElement.style;
  root.setProperty('--board', L.boardPx + 'px');
  root.setProperty('--cell', L.cell + 'px');
  root.setProperty('--pc', L.pc + 'px');
  root.setProperty('--side', L.sidePx + 'px');
  root.setProperty('--dock-h', L.dockH + 'px');
  root.setProperty('--pad', L.pad + 'px');
  root.setProperty('--gap-ui', L.gapUI + 'px');
  gameEl.dataset.layout = landscape ? 'landscape' : 'portrait';
  $('block-dock').dataset.dir = L.dockDir;
  Object.assign(layoutInfo, { cell: L.cell, gap: L.gap, pad: L.boardPad, pc: L.pc, step: L.cell + L.gap, px: L.boardPx });
}
function layout() {
  const vv = window.visualViewport;
  const W = Math.round(vv ? vv.width : window.innerWidth);
  const H = Math.round(vv ? vv.height : window.innerHeight);
  const landscape = W / H > 1.15;
  applyLayout(computeLayout(W, H, landscape), landscape);
  if (gameEl.classList.contains('active')) {
    const m = measured[landscape ? 'landscape' : 'portrait'];
    const hud = gameEl.querySelector('.hud').offsetHeight;
    const items = $('inventory-container').offsetHeight;
    if (hud && items && (Math.abs(hud - m.hud) > 1 || Math.abs(items - m.items) > 1)) {
      m.hud = hud;
      m.items = items;
      applyLayout(computeLayout(W, H, landscape), landscape);
    }
    R.resize();
    for (let i = 0; i < 3; i++) renderDockSlot(i);
  }
}
let layoutRAF = 0;
function scheduleLayout() {
  if (drag) return;
  cancelAnimationFrame(layoutRAF);
  layoutRAF = requestAnimationFrame(layout);
}
window.addEventListener('resize', scheduleLayout);
window.addEventListener('orientationchange', () => setTimeout(layout, 200));
if (window.visualViewport) window.visualViewport.addEventListener('resize', scheduleLayout);

// ==========================================
// ★ 캔버스 렌더러 (게임판·대기 블록·드래그 블록) ★
// ==========================================
const R = {
  cv: $('board-canvas'),
  ctx: $('board-canvas').getContext('2d'),
  dpr: 1,
  px: 0,
  ghost: null, // { cells: [[r,c]...], color }
  willClear: null, // Set(index)
  bomb: null, // { r, c }
  fx: [], // 칸 효과
  parts: [], // 조각 파티클
  raf: 0,
  last: 0,
  colors: null,
  sprites: new Map(),

  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2); // 2배 이상은 눈으로 차이가 거의 없고 부담만 큼
    this.px = layoutInfo.px || this.cv.clientWidth;
    this.cv.width = Math.round(this.px * this.dpr);
    this.cv.height = Math.round(this.px * this.dpr);
    this.sprites.clear();
    this.request();
  },
  request() {
    if (!this.raf) this.raf = requestAnimationFrame((t) => this.frame(t));
  },
  frame(now) {
    this.raf = 0;
    const dt = this.last ? Math.min(50, now - this.last) / 1000 : 0.016;
    this.last = now;
    this.updateParticles(dt);
    this.draw(now);
    if (this.fx.length || this.parts.length) this.request();
    else this.last = 0;
  },
  cellXY(r, c) {
    const { pad, step } = layoutInfo;
    return [pad + c * step, pad + r * step];
  },
  draw(now = performance.now()) {
    const { ctx, dpr, px } = this;
    if (!px) return;
    if (!this.colors) readTheme();
    const s = layoutInfo.cell;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, px, px);

    // 효과 중인 칸은 따로 그림
    const hidden = new Set();
    for (const f of this.fx) if (f.kind !== 'pop') hidden.add(f.r * 8 + f.c);

    const empty = sprite('empty', s);
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const [x, y] = this.cellXY(r, c);
        ctx.drawImage(empty, x, y, s, s);
        const v = board[r][c];
        if (v && !hidden.has(r * 8 + c)) drawCell(ctx, v, x, y, s);
      }
    }
    // 놓을 위치 미리보기
    if (this.ghost) {
      ctx.globalAlpha = 0.45;
      const g = sprite(this.ghost.color, s);
      for (const [r, c] of this.ghost.cells) {
        const [x, y] = this.cellXY(r, c);
        ctx.drawImage(g, x, y, s, s);
      }
      ctx.globalAlpha = 1;
    }
    // 지워질 줄 표시
    if (this.willClear) {
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(2, s * 0.06);
      for (const idx of this.willClear) {
        const [x, y] = this.cellXY(Math.floor(idx / 8), idx % 8);
        roundRect(ctx, x + 1, y + 1, s - 2, s - 2, s * 0.22);
        ctx.fill();
        ctx.stroke();
      }
    }
    // 폭탄 조준
    if (this.bomb) {
      ctx.fillStyle = 'rgba(255, 90, 110, 0.5)';
      ctx.strokeStyle = '#ff5a6e';
      ctx.lineWidth = Math.max(2, s * 0.06);
      for (let r = this.bomb.r - 1; r <= this.bomb.r + 1; r++)
        for (let c = this.bomb.c - 1; c <= this.bomb.c + 1; c++) {
          if (r < 0 || r >= 8 || c < 0 || c >= 8) continue;
          const [x, y] = this.cellXY(r, c);
          roundRect(ctx, x + 1, y + 1, s - 2, s - 2, s * 0.22);
          ctx.fill();
          ctx.stroke();
        }
    }
    // 칸 효과
    this.fx = this.fx.filter((f) => {
      const t = (now - f.t0) / f.dur;
      if (t < 0) {
        if (f.kind === 'drop') return true; // 시작 전엔 안 보임
        if (f.kind === 'pop') {
          const [x, y] = this.cellXY(f.r, f.c);
          drawCell(ctx, f.v, x, y, s);
        }
        return true;
      }
      if (t >= 1) {
        if (f.kind !== 'pop') this.needsFinal = true;
        return false;
      }
      const [x, y] = this.cellXY(f.r, f.c);
      if (f.kind === 'pop') {
        // 살짝 커졌다가 작아지며 사라짐 (번쩍임 없음)
        const sc = t < 0.25 ? 1 + 0.12 * (t / 0.25) : 1.12 * (1 - (t - 0.25) / 0.75);
        ctx.globalAlpha = t < 0.25 ? 1 : 1 - (t - 0.25) / 0.75;
        const d = (s * (1 - sc)) / 2;
        drawCell(ctx, f.v, x + d, y + d, s * sc);
        ctx.globalAlpha = 1;
      } else if (f.kind === 'drop') {
        const e = easeOutBack(t);
        ctx.globalAlpha = Math.min(1, t * 4);
        drawCell(ctx, board[f.r][f.c] || f.v, x, y - (1 - e) * s * 1.5, s);
        ctx.globalAlpha = 1;
      } else if (f.kind === 'hit') {
        const off = Math.sin(t * Math.PI * 6) * (1 - t) * s * 0.12;
        drawCell(ctx, board[f.r][f.c] || f.v, x + off, y, s);
      } else if (f.kind === 'squish') {
        const k = 1 - Math.sin(t * Math.PI) * 0.12;
        const w = s * (2 - k);
        const h = s * k;
        drawCell(ctx, board[f.r][f.c] || f.v, x - (w - s) / 2, y + (s - h), w, h);
      }
      return true;
    });
    if (this.needsFinal) {
      this.needsFinal = false;
      this.request();
    }
    // 파티클
    for (const p of this.parts) {
      ctx.globalAlpha = Math.max(0, 1 - p.age / p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      if (p.star) drawStarPath(ctx, p.x, p.y, p.size, p.rot);
      else ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  },
  updateParticles(dt) {
    if (!this.parts.length) return;
    for (const p of this.parts) {
      p.age += dt;
      p.vy += 900 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
    }
    this.parts = this.parts.filter((p) => p.age < p.life);
  },
  burst(r, c, color, n = 5) {
    const [x, y] = this.cellXY(r, c);
    const s = layoutInfo.cell;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = 120 + Math.random() * 220;
      this.parts.push({
        x: x + s / 2,
        y: y + s / 2,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 220,
        size: s * (0.08 + Math.random() * 0.09),
        color,
        star: Math.random() < 0.35,
        rot: Math.random() * 6,
        vr: (Math.random() - 0.5) * 10,
        age: 0,
        life: 0.55 + Math.random() * 0.35,
      });
    }
    if (this.parts.length > 220) this.parts.splice(0, this.parts.length - 220);
  },
  addFx(kind, r, c, v, dur, delay = 0) {
    this.fx = this.fx.filter((f) => !(f.r === r && f.c === c && f.kind !== 'pop'));
    this.fx.push({ kind, r, c, v, t0: performance.now() + delay, dur });
    this.request();
  },
  cellAt(clientX, clientY, rect = this.cv.getBoundingClientRect()) {
    const { pad, step } = layoutInfo;
    const c = Math.floor((clientX - rect.left - pad + layoutInfo.gap / 2) / step);
    const r = Math.floor((clientY - rect.top - pad + layoutInfo.gap / 2) / step);
    return r >= 0 && r < 8 && c >= 0 && c < 8 ? { r, c } : null;
  },
};
const easeOutBack = (t) => 1 + 2.4 * Math.pow(t - 1, 3) + 1.4 * Math.pow(t - 1, 2);

function readTheme() {
  const cs = getComputedStyle(document.body);
  const g = (n, d) => cs.getPropertyValue(n).trim() || d;
  R.colors = {
    1: [g('--c1a', '#7fd3ff'), g('--c1b', '#4a9bff'), g('--c1d', '#3576d6')],
    2: [g('--c2a', '#ff9ec4'), g('--c2b', '#ff6fa3'), g('--c2d', '#e0508a')],
    3: [g('--c3a', '#ffe07a'), g('--c3b', '#ffb830'), g('--c3d', '#e69a12')],
    4: ['#fff09a', '#ffc93a', '#e3a000'],
    stone: ['#d8d2ea', '#b5acd0', '#958cb3'],
    empty: g('--cell-empty', '#f0edf8'),
  };
  R.sprites.clear();
}
function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function drawStarPath(ctx, x, y, size, rot) {
  for (let i = 0; i < 10; i++) {
    const a = rot + (i * Math.PI) / 5;
    const rr = i % 2 ? size * 0.45 : size;
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr;
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.closePath();
}
const RAINBOW = ['#ff8fa3', '#ffc36b', '#ffe56b', '#8ee6a0', '#7fd3ff', '#b9a0ff'];
/** 블록 한 칸 그림을 미리 만들어 둠 (매 프레임 다시 그리지 않음) */
function sprite(key, size) {
  const id = `${key}@${size}@${R.dpr}`;
  let cv = R.sprites.get(id);
  if (cv) return cv;
  if (!R.colors) readTheme();
  const d = R.dpr;
  cv = document.createElement('canvas');
  cv.width = Math.ceil(size * d);
  cv.height = Math.ceil(size * d);
  const ctx = cv.getContext('2d');
  ctx.scale(d, d);
  const s = size;
  const rad = s * 0.24;
  if (key === 'empty') {
    ctx.fillStyle = R.colors.empty;
    roundRect(ctx, 0, 0, s, s, rad);
    ctx.fill();
    ctx.fillStyle = 'rgba(58,51,82,0.04)';
    roundRect(ctx, 0, s * 0.82, s, s * 0.18, rad);
    ctx.fill();
  } else {
    const depth = Math.max(2, s * 0.09);
    let top, bottom, dark;
    if (key === 'rainbow') {
      dark = '#d58bd0';
    } else {
      [top, bottom, dark] = R.colors[key] || R.colors[1];
    }
    // 아랫면 (말랑한 두께감)
    ctx.fillStyle = dark;
    roundRect(ctx, 0, 0, s, s, rad);
    ctx.fill();
    // 윗면
    let grad;
    if (key === 'rainbow') {
      grad = ctx.createLinearGradient(0, 0, s, s - depth);
      RAINBOW.forEach((c, i) => grad.addColorStop(i / (RAINBOW.length - 1), c));
    } else {
      grad = ctx.createLinearGradient(0, 0, 0, s - depth);
      grad.addColorStop(0, top);
      grad.addColorStop(1, bottom);
    }
    ctx.fillStyle = grad;
    roundRect(ctx, 0, 0, s, s - depth, rad);
    ctx.fill();
    // 반짝이 하이라이트
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    roundRect(ctx, s * 0.15, s * 0.1, s * 0.42, s * 0.13, s * 0.07);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(s * 0.74, s * 0.165, s * 0.055, 0, Math.PI * 2);
    ctx.fill();
    if (key === 4) {
      // 선물 상자 리본
      ctx.fillStyle = '#ff6f9f';
      ctx.fillRect(s * 0.43, 0, s * 0.14, s - depth);
      ctx.fillRect(0, s * 0.4, s, s * 0.13);
      ctx.beginPath();
      ctx.ellipse(s * 0.38, s * 0.3, s * 0.11, s * 0.08, -0.5, 0, Math.PI * 2);
      ctx.ellipse(s * 0.62, s * 0.3, s * 0.11, s * 0.08, 0.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (key === 'stone') {
      ctx.fillStyle = 'rgba(58,51,82,0.12)';
      [[0.25, 0.7, 0.06], [0.75, 0.62, 0.05], [0.3, 0.38, 0.04]].forEach(([a, b, r]) => {
        ctx.beginPath();
        ctx.arc(s * a, s * b, s * r, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }
  R.sprites.set(id, cv);
  return cv;
}
function drawCell(ctx, v, x, y, w, h = w) {
  if (v >= 1 && v <= 4) {
    ctx.drawImage(sprite(v, layoutInfo.cell), x, y, w, h);
  } else if (v >= 11) {
    ctx.drawImage(sprite('stone', layoutInfo.cell), x, y, w, h);
    ctx.fillStyle = '#5b5378';
    ctx.font = `${Math.round(w * 0.5)}px Jua, 'Gowun Dodum', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(v - 10), x + w / 2, y + h * 0.47);
  }
}
/** 블록 모양을 작은 캔버스에 그리기 (대기 칸·드래그용) */
function paintPiece(cv, data, size, gap, withShadow = false) {
  const d = R.dpr || Math.min(window.devicePixelRatio || 1, 2);
  const cols = data.matrix[0].length;
  const rows = data.matrix.length;
  const w = cols * size + (cols - 1) * gap;
  const h = rows * size + (rows - 1) * gap;
  const padB = withShadow ? Math.round(size * 0.35) : 0;
  cv.width = Math.ceil((w + padB * 2) * d);
  cv.height = Math.ceil((h + padB * 2) * d);
  cv.style.width = w + padB * 2 + 'px';
  cv.style.height = h + padB * 2 + 'px';
  const ctx = cv.getContext('2d');
  ctx.setTransform(d, 0, 0, d, 0, 0);
  ctx.clearRect(0, 0, w + padB * 2, h + padB * 2);
  const key = feverOn() ? 'rainbow' : data.colorVal;
  const img = sprite(key, size);
  if (withShadow) {
    ctx.shadowColor = 'rgba(58,51,82,0.28)';
    ctx.shadowBlur = size * 0.35;
    ctx.shadowOffsetY = size * 0.18;
  }
  data.matrix.forEach((row, r) =>
    row.forEach((v, c) => {
      if (v) ctx.drawImage(img, padB + c * (size + gap), padB + r * (size + gap), size, size);
    }),
  );
  return { w, h, padB };
}
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => R.request());

// ==========================================
// ★ 게임 시작 ★
// ==========================================
function startGame(mode, level, stage = 1) {
  gameMode = mode;
  gameLevel = level;
  currentStage = stage;
  gameSession++;
  setLastStage(mode, level, stage);
  store.set('hskblock_last_level', { mode, level });

  document.body.className = `theme-${mode} theme-${level}`;
  $('mode-display').textContent = `${modeLabel(mode)} · ${levelLabel(level)} · ${stage}단계`;

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
  reviving = false;
  stageList = stageWords(mode, level, stage);
  quizPool = shuffle([...stageList]);
  correctCount = 0;
  wrongCount = 0;
  quizStreak = 0;
  feverLeft = 0;
  hearts = HEARTS_START[mode];
  heartsUsed = 0;
  R.fx = [];
  R.parts = [];
  R.ghost = R.willClear = R.bomb = null;

  boardWrap.classList.remove('dimmed', 'double-on', 'fever');
  document.body.classList.remove('fever-on');
  hideBoardBanner();
  document.querySelectorAll('.modal.active').forEach((m) => m.classList.remove('active'));

  readTheme();
  showScreen('game-container');
  playBGM(mode);
  updateInventoryUI();
  updateHUD();
  generateDockBlocks();
  R.request();
}
function retryGame() {
  sfx.tap();
  document.querySelectorAll('.modal.active').forEach((m) => m.classList.remove('active'));
  startGame(gameMode, gameLevel, currentStage);
}
function nextStage() {
  sfx.tap();
  document.querySelectorAll('.modal.active').forEach((m) => m.classList.remove('active'));
  if (currentStage < stageCount(gameMode, gameLevel)) startGame(gameMode, gameLevel, currentStage + 1);
  else showStageScreen(gameMode, gameLevel);
}
function backToStages() {
  sfx.tap();
  document.querySelectorAll('.modal.active').forEach((m) => m.classList.remove('active'));
  showStageScreen(gameMode, gameLevel);
}

function updateHUD() {
  $('score').textContent = score.toLocaleString();
  $('best-score').textContent = Math.max(getBestScore(gameMode, gameLevel, currentStage), score).toLocaleString();
  const total = stageList.length || 1;
  $('word-chip').textContent = `단어 ${correctCount}/${stageList.length}`;
  $('stage-progress').style.transform = `scaleX(${correctCount / total})`;
  const chip = $('combo-chip');
  if (feverOn()) chip.innerHTML = `${icon('flame')}피버 ×2 · ${feverLeft}`;
  else chip.textContent = `콤보 ${currentCombo}${isDoubleScoreActive ? ' · ×2' : ''}`;
  chip.classList.toggle('on', currentCombo > 0 && !feverOn());
  chip.classList.toggle('fever', feverOn());
  const max = Math.max(HEARTS_START[gameMode], hearts);
  let h = '';
  for (let i = 0; i < max; i++) h += i < hearts ? icon('heart') : icon('heart-empty', 'empty');
  $('hearts').innerHTML = h;
}
function setFever(n) {
  const was = feverOn();
  feverLeft = n;
  document.body.classList.toggle('fever-on', n > 0);
  boardWrap.classList.toggle('fever', n > 0);
  if (was !== feverOn()) for (let i = 0; i < 3; i++) renderDockSlot(i);
  updateHUD();
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
      ].filter((n) => n.r >= 0 && n.r < 8 && n.c >= 0 && n.c < 8 && board[n.r][n.c] === 0 && !visited.has(`${n.r},${n.c}`));
      shuffle(nbs);
      for (const n of nbs) {
        visited.add(`${n.r},${n.c}`);
        cluster.push(n);
        queue.push(n);
        if (cluster.length >= clusterSize) break;
      }
    }
    for (const cell of cluster) {
      board[cell.r][cell.c] = 10 + Math.floor(Math.random() * 2) + 2;
      newCells.push(cell);
      spawned++;
    }
  }
  if (newCells.length) {
    sfx.thud();
    shakeBoard(2);
    newCells.forEach(({ r, c }, i) => R.addFx('drop', r, c, board[r][c], 450, i * 60));
  }
  R.request();
}
function spawnBonusBlockOnBoard() {
  for (const row of board) if (row.includes(4)) return;
  const empties = emptyCells();
  if (!empties.length || Math.random() >= 0.25) return;
  const cell = empties[Math.floor(Math.random() * empties.length)];
  board[cell.r][cell.c] = 4;
  sfx.sparkle();
  R.addFx('drop', cell.r, cell.c, 4, 500);
}

// ==========================================
// ★ 대기 블록 ★
// ==========================================
function generateDockBlocks() {
  const colors = shuffle([1, 2, 3]);
  const set = makeFairSet(3);
  for (let i = 0; i < 3; i++) {
    currentDockBlocks[i] = { matrix: set[i], colorVal: colors[i] };
    renderDockSlot(i);
  }
  spawnBonusBlockOnBoard();
  checkGameOverCondition();
}
function renderDockSlot(i) {
  const slot = $(`slot-${i}`);
  const cv = slot.querySelector('canvas');
  slot.classList.remove('dragging');
  const data = currentDockBlocks[i];
  if (!data) {
    cv.width = cv.height = 0;
    cv.style.width = cv.style.height = '0px';
    slot.classList.remove('unplaceable');
    return;
  }
  if (!R.colors) readTheme();
  const pc = layoutInfo.pc;
  paintPiece(cv, data, pc, Math.max(2, Math.round(pc * 0.1)));
}

// ==========================================
// ★ 드래그 앤 드롭 ★
// ==========================================
let drag = null;
let dragRAF = 0;
const overlayEl = $('drag-overlay');
const dragCv = document.createElement('canvas'); // 그린 뒤 이미지로 바꿔서 움직임 (캔버스를 직접 움직이는 것보다 훨씬 가벼움)
const dragImg = $('drag-img');

function onSlotPointerDown(e) {
  if (drag || isGameLocked || isBombActive || isGameOver) return;
  if (e.button !== undefined && e.button > 0) return;
  const i = Number(e.currentTarget.dataset.slot);
  const data = currentDockBlocks[i];
  if (!data) return;
  e.preventDefault();
  ensureAudio();
  sfx.pick();

  const rect = R.cv.getBoundingClientRect();
  const { cell, gap, step, pad } = layoutInfo;
  const { w, h, padB } = paintPiece(dragCv, data, cell, gap, true);
  dragImg.src = dragCv.toDataURL();
  dragImg.style.width = dragCv.style.width;
  dragImg.style.height = dragCv.style.height;
  const lift = e.pointerType === 'mouse' ? 0 : h / 2 + Math.max(40, cell * 0.9);
  drag = { i, data, rect, step, pad, w, h, padB, lift, x: e.clientX, y: e.clientY, pid: e.pointerId, key: '', target: null };
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
  overlayEl.style.transform = `translate3d(${left - drag.padB}px, ${top - drag.padB}px, 0)`;
  const c = Math.round((left - drag.rect.left - drag.pad) / drag.step);
  const r = Math.round((top - drag.rect.top - drag.pad) / drag.step);
  const ok = canPlaceBlock(r, c, drag.data.matrix);
  const key = ok ? `${r},${c}` : '';
  if (key !== drag.key) {
    drag.key = key;
    drag.target = ok ? { r, c } : null;
    if (ok) setGhost(r, c, drag.data);
    else clearGhost();
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
  clearGhost();
  $(`slot-${i}`).classList.remove('dragging');

  if (e.type === 'pointerup' && target && canPlaceBlock(target.r, target.c, data.matrix)) {
    placeBlock(target.r, target.c, data.matrix, data.colorVal);
    currentDockBlocks[i] = null;
    renderDockSlot(i);
    sfx.place();
    clearFullLines(afterPlacement);
  } else if (e.type === 'pointerup') {
    sfx.invalid();
  }
}
function afterPlacement() {
  if (feverOn()) setFever(feverLeft - 1);
  if (currentDockBlocks.every((b) => b === null)) {
    if (linesClearedThisRound === 0) {
      currentCombo = 0;
      setDoubleScore(false);
      updateHUD();
    }
    linesClearedThisRound = 0;
    isGameLocked = true;
    later(triggerNewQuiz, 380);
  } else {
    checkGameOverCondition();
  }
}
document.querySelectorAll('.dock-slot').forEach((slot) => slot.addEventListener('pointerdown', onSlotPointerDown));
window.addEventListener('pointermove', onPointerMove, { passive: true });
window.addEventListener('pointerup', onPointerUp);
window.addEventListener('pointercancel', onPointerUp);

function clearGhost() {
  if (!R.ghost && !R.willClear) return;
  R.ghost = null;
  R.willClear = null;
  R.request();
}
function setGhost(r, c, data) {
  const m = data.matrix;
  const cells = [];
  m.forEach((row, pr) => row.forEach((v, pc) => v && cells.push([r + pr, c + pc])));
  const inPiece = (rr, cc) => {
    const pr = rr - r;
    const pc = cc - c;
    return pr >= 0 && pr < m.length && pc >= 0 && pc < m[0].length && m[pr][pc] === 1;
  };
  const filled = (rr, cc) => board[rr][cc] !== 0 || inPiece(rr, cc);
  const marks = new Set();
  for (let rr = r; rr < r + m.length; rr++) {
    let full = true;
    for (let cc = 0; cc < 8 && full; cc++) full = filled(rr, cc);
    if (full) for (let cc = 0; cc < 8; cc++) marks.add(rr * 8 + cc);
  }
  for (let cc = c; cc < c + m[0].length; cc++) {
    let full = true;
    for (let rr = 0; rr < 8 && full; rr++) full = filled(rr, cc);
    if (full) for (let rr = 0; rr < 8; rr++) marks.add(rr * 8 + cc);
  }
  R.ghost = { cells, color: feverOn() ? 'rainbow' : data.colorVal };
  R.willClear = marks.size ? marks : null;
  R.request();
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
      if (matrix[r][c] !== 1) continue;
      board[startR + r][startC + c] = colorVal;
      score += 10 * scoreMult();
      R.addFx('squish', startR + r, startC + c, colorVal, 180);
    }
  }
  updateHUD();
  R.request();
}

// ==========================================
// ★ 줄 지우기 ★
// ==========================================
const PRAISE = [
  [12, '천재예요!'],
  [8, '대단해요!'],
  [5, '멋져요!'],
  [3, '좋아요!'],
];
function clearFullLines(onComplete) {
  const rows = [];
  const cols = [];
  for (let r = 0; r < 8; r++) if (board[r].every((v) => v !== 0)) rows.push(r);
  for (let c = 0; c < 8; c++) {
    let full = true;
    for (let r = 0; r < 8; r++) if (board[r][c] === 0) { full = false; break; }
    if (full) cols.push(c);
  }
  const total = rows.length + cols.length;
  if (!total) {
    onComplete && onComplete();
    return;
  }
  const prevCombo = currentCombo;
  currentCombo += total;
  maxComboThisRound = Math.max(maxComboThisRound, currentCombo);
  linesClearedThisRound += total;

  const hit = new Set();
  rows.forEach((r) => { for (let c = 0; c < 8; c++) hit.add(r * 8 + c); });
  cols.forEach((c) => { for (let r = 0; r < 8; r++) hit.add(r * 8 + c); });

  // 상태는 즉시, 그림은 효과로
  let k = 0;
  hit.forEach((idx) => {
    const r = Math.floor(idx / 8);
    const c = idx % 8;
    const v = board[r][c];
    const delay = (rows.includes(r) ? c : r) * 22; // 줄을 따라 순서대로 톡톡
    if (v >= 11) {
      board[r][c] = v - 1 <= 10 ? 0 : v - 1;
      if (board[r][c]) R.addFx('hit', r, c, board[r][c], 320, delay);
      else R.addFx('pop', r, c, v, 360, delay);
    } else if (v > 0) {
      if (v === 4) nextQuizIsBonus = true;
      board[r][c] = 0;
      R.addFx('pop', r, c, v, 360, delay);
      const col = R.colors[v] ? R.colors[v][0] : '#ffd54a';
      if (k++ % 2 === 0) setTimeout(() => R.burst(r, c, col, 4), delay);
    }
  });

  let earned = total * (gameMode === 'hell' ? 300 : 150) * currentCombo;
  if (isDoubleScoreActive) earned *= 2;
  earned *= scoreMult();
  score += earned;
  const allClear = board.every((row) => row.every((v) => v === 0));
  if (allClear) score += 1000;

  sfx.clear(prevCombo + 1, total);
  shakeBoard(Math.min(1 + currentCombo * 0.4, 5));
  showComboEffect(total, currentCombo, allClear);
  if (allClear) showAllClearEffect();
  updateHUD();
  R.request();
  onComplete && onComplete();
}

// 연출 (Web Animations — 가벼움)
function shakeBoard(intensity = 1) {
  const d = 1.5 * intensity;
  boardWrap.animate(
    [
      { transform: 'translate(0,0)' },
      { transform: `translate(${-d}px, ${d}px)` },
      { transform: `translate(${d}px, ${-d}px)` },
      { transform: `translate(${-d * 0.6}px, ${-d * 0.6}px)` },
      { transform: 'translate(0,0)' },
    ],
    { duration: 260, easing: 'ease-out' },
  );
}
function flashScreen(color, peak = 0.2) {
  const f = $('flash-overlay');
  f.style.background = color;
  f.animate([{ opacity: 0 }, { opacity: peak, offset: 0.15 }, { opacity: 0 }], { duration: 500, easing: 'ease-out' });
}
function popText(el, ms = 1200) {
  el.getAnimations().forEach((a) => a.cancel());
  el.animate(
    [
      { transform: 'translate(-50%,-50%) scale(0.3) rotate(-6deg)', opacity: 0 },
      { transform: 'translate(-50%,-50%) scale(1.12) rotate(2deg)', opacity: 1, offset: 0.18 },
      { transform: 'translate(-50%,-50%) scale(1) rotate(0)', opacity: 1, offset: 0.8 },
      { transform: 'translate(-50%,-62%) scale(0.95)', opacity: 0 },
    ],
    { duration: ms, easing: 'ease-out' },
  );
}
function showComboEffect(lines, combo, withAllClear = false) {
  const el = $('combo-display');
  el.className = 'combo-text' + (withAllClear ? ' low' : '');
  const praise = (PRAISE.find(([n]) => combo >= n) || [])[1];
  const top = lines > 1 ? `<span class="bonus-lines">${lines}줄 동시!</span>` : '';
  const sub = isDoubleScoreActive ? '<span class="sub">점수 ×2 유지 중</span>' : praise ? `<span class="sub">${praise}</span>` : '';
  el.innerHTML = `${top}${combo} 콤보${sub}`;
  popText(el, 1150);
}
function showAllClearEffect() {
  popText($('all-clear-display'), 2000);
  flashScreen('#fff3b0', 0.22);
  sfx.sparkle();
}
function floatText(html, cls, ms) {
  const el = document.createElement('div');
  el.className = `float-text ${cls}`;
  el.innerHTML = html;
  document.body.appendChild(el);
  el.animate(
    [
      { transform: 'translate(-50%, 0) scale(0.5)', opacity: 0 },
      { transform: 'translate(-50%, -20px) scale(1.15)', opacity: 1, offset: 0.15 },
      { transform: 'translate(-50%, -30px) scale(1.1)', opacity: 1, offset: 0.7 },
      { transform: 'translate(-50%, -80px) scale(0.85)', opacity: 0 },
    ],
    { duration: ms, easing: 'ease-out' },
  ).onfinish = () => el.remove();
}

// ==========================================
// ★ 놓을 곳이 없을 때: 아이템 / 하트 / 실패 ★
// ==========================================
function checkGameOverCondition() {
  if (isGameOver || reviving) return;
  let active = 0;
  let placeable = 0;
  for (let i = 0; i < 3; i++) {
    const data = currentDockBlocks[i];
    if (!data) continue;
    active++;
    const can = fitsAnywhere(data.matrix);
    $(`slot-${i}`).classList.toggle('unplaceable', !can);
    if (can) placeable++;
  }
  if (!(active > 0 && placeable === 0)) {
    if (!isBombActive) hideBoardBanner();
    return;
  }
  const hasItems = playerItems.bomb > 0 || playerItems.reroll > 0;
  if (hasItems) {
    if (hearts > 0) showBoardBanner('놓을 곳이 없어요! 아이템을 쓰거나 하트를 써요', '포기', gameOver, 'danger', '하트 쓰기', useHeart);
    else showBoardBanner('놓을 곳이 없어요! 아이템을 써 보세요', '포기', gameOver, 'danger');
  } else if (hearts > 0) {
    reviving = true;
    isGameLocked = true;
    later(useHeart, 700);
  } else {
    gameOver();
  }
}
/** 하트 사용: 가장 꽉 찬 가로 3줄 + 세로 3줄을 비움 */
function useHeart() {
  if (hearts <= 0 || isGameOver) return;
  hearts--;
  heartsUsed++;
  reviving = false;
  hideBoardBanner();
  const count = (arr) => arr.filter(Boolean).length;
  const rowsSorted = [...Array(8).keys()].sort((a, b) => count(board[b]) - count(board[a])).slice(0, 3);
  const colsSorted = [...Array(8).keys()].sort((a, b) => count(board.map((row) => row[b])) - count(board.map((row) => row[a]))).slice(0, 3);
  const hit = new Set();
  rowsSorted.forEach((r) => { for (let c = 0; c < 8; c++) hit.add(r * 8 + c); });
  colsSorted.forEach((c) => { for (let r = 0; r < 8; r++) hit.add(r * 8 + c); });
  hit.forEach((idx) => {
    const r = Math.floor(idx / 8);
    const c = idx % 8;
    const v = board[r][c];
    if (!v) return;
    if (v === 4) nextQuizIsBonus = true;
    board[r][c] = 0;
    R.addFx('pop', r, c, v, 420, Math.random() * 200);
  });
  sfx.heart();
  floatText(`${icon('heart')}하트 사용! 다시 힘내요`, 'heart', 1600);
  updateHUD();
  R.request();
  isGameLocked = false;
  checkGameOverCondition();
}
function gameOver() {
  if (isGameOver) return;
  isGameOver = true;
  isBombActive = false;
  R.bomb = null;
  hideBoardBanner();
  boardWrap.classList.add('dimmed');
  const el = $('combo-display');
  el.className = 'combo-text bad';
  el.innerHTML = '놓을 곳이 없어요<span class="sub">블록이 꽉 찼어요</span>';
  popText(el, 1300);
  sfx.fail();
  later(() => {
    playBGM('leaderboard');
    $('fail-title').textContent = `${currentStage}단계 실패`;
    $('fail-words').textContent = `${correctCount} / ${stageList.length}`;
    $('fail-score').textContent = score.toLocaleString();
    $('fail-bar').style.width = `${(correctCount / Math.max(1, stageList.length)) * 100}%`;
    $('stage-fail-modal').classList.add('active');
  }, 1300);
}
function stageClear() {
  isGameOver = true;
  isGameLocked = true;
  const stars = starsFor(gameMode, wrongCount, heartsUsed);
  const rankBefore = myRank(gameMode, gameLevel);
  const prevBest = getBestScore(gameMode, gameLevel, currentStage);
  const { isBest, firstClear } = saveStageClear(gameMode, gameLevel, currentStage, stars, score);
  recordHistory(gameMode, gameLevel, Math.max(0, score - prevBest)); // 이번 주 랭킹용
  playBGM('leaderboard');
  sfx.stageClear();
  flashScreen('#fff3b0', 0.2);

  $('clear-title').textContent = `${currentStage}단계 클리어!`;
  $('clear-stars').innerHTML = starsHTML(stars);
  $('clear-score').textContent = score.toLocaleString();
  $('clear-combo').textContent = maxComboThisRound;
  $('clear-wrong').textContent = wrongCount;
  const total = stageCount(gameMode, gameLevel);
  const msgs = [];
  if (isBest && !firstClear) msgs.push('이 단계 최고 기록 갱신!');
  if (firstClear && currentStage < total) msgs.push(`${currentStage + 1}단계가 열렸어요!`);
  if (currentStage >= total) msgs.push(`${levelLabel(gameLevel)}급 마지막 단계까지 클리어!`);
  if (heartsUsed) msgs.push(`하트 ${heartsUsed}개 사용`);
  $('clear-msg').textContent = msgs.join(' · ');
  $('clear-msg').hidden = !msgs.length;
  $('clear-next').hidden = currentStage >= total;
  const hasNick = !!getNick();
  $('rank-form').hidden = hasNick;
  $('rank-done').hidden = !hasNick;
  $('nickname-input').value = '';
  $('nickname-error').hidden = true;
  if (hasNick) updateRankBox(rankBefore);
  $('stage-clear-modal').classList.add('active');
}
$('nickname-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveRanking();
});
$('nickname-input').addEventListener('input', () => ($('nickname-error').hidden = true));

// 보드 하단 안내
let bannerAction = null;
let bannerAction2 = null;
function showBoardBanner(text, btnText, action, tone = '', btn2Text = '', action2 = null) {
  $('board-banner-text').textContent = text;
  $('board-banner-btn').textContent = btnText;
  const b2 = $('board-banner-btn2');
  b2.hidden = !btn2Text;
  b2.textContent = btn2Text;
  bannerAction = action;
  bannerAction2 = action2;
  const b = $('board-banner');
  b.className = `board-banner ${tone}`;
  b.hidden = false;
}
function hideBoardBanner() {
  $('board-banner').hidden = true;
  bannerAction = bannerAction2 = null;
}
$('board-banner-btn').addEventListener('click', () => bannerAction && bannerAction());
$('board-banner-btn2').addEventListener('click', () => bannerAction2 && bannerAction2());

// 나가기
let lockBeforeExit = false;
function openExitConfirm() {
  sfx.tap();
  if (isGameOver) return backToStages();
  lockBeforeExit = isGameLocked;
  isGameLocked = true;
  $('exit-modal').classList.add('active');
}
function closeExitConfirm() {
  sfx.tap();
  $('exit-modal').classList.remove('active');
  isGameLocked = lockBeforeExit;
}
function exitToLobby() {
  $('exit-modal').classList.remove('active');
  isGameOver = true;
  gameSession++;
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  showStageScreen(gameMode, gameLevel);
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
    const size = len <= 2 ? 68 : len <= 4 ? 54 : len <= 7 ? 40 : len <= 11 ? 30 : 24;
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
  currentQuiz = quizPool.length ? quizPool.pop() : { q: '데이터 없음', pinyin: '-', a: '확인', options: ['확인', '준비중', '테스트'] };

  const tag = $('quiz-tag');
  if (quizStreak > 0) {
    tag.className = 'quiz-tag fire';
    tag.innerHTML = `${icon('flame')}연속 정답 ${quizStreak} · ${FEVER_STREAK - quizStreak}개 더 맞히면 피버!`;
  } else {
    tag.className = 'quiz-tag';
    tag.textContent = `관문을 통과하라! · 남은 단어 ${stageList.length - correctCount}개`;
  }
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
  sfx.quiz();
  startQuizTimer();
}
function startQuizTimer() {
  const wrap = $('quiz-timer');
  const bar = $('quiz-timer-bar');
  wrap.hidden = false;
  wrap.classList.remove('done');
  bar.style.transition = 'none';
  bar.style.transform = 'scaleX(1)';
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      quizShownAt = performance.now();
      bar.style.transition = `transform ${SPEED_LIMIT_MS}ms linear`;
      bar.style.transform = 'scaleX(0)';
    }),
  );
}
function stopQuizTimer() {
  const bar = $('quiz-timer-bar');
  bar.style.transform = getComputedStyle(bar).transform;
  bar.style.transition = 'none';
  $('quiz-timer').classList.add('done');
}
function answerQuiz(btn, opt) {
  const quiz = currentQuiz;
  const buttons = [...$('quiz-options').querySelectorAll('button')];
  buttons.forEach((b) => (b.disabled = true));
  const correct = opt === quiz.a;
  const rightBtn = buttons.find((b) => b.dataset.value === quiz.a);
  if (rightBtn) rightBtn.classList.add('correct');
  const elapsed = performance.now() - quizShownAt;
  stopQuizTimer();

  if (correct) {
    sfx.correct();
    correctCount++;
    if (quizShownAt && elapsed <= SPEED_LIMIT_MS) {
      const bonus = gameMode === 'hell' ? 600 : 300;
      score += bonus;
      floatText(`${icon('bolt')}스피드 +${bonus}`, 'speed', 1600);
      setTimeout(sfx.speed, 120);
    }
    // 헬: 20단어마다 하트 회복
    const regen = HEART_REGEN[gameMode];
    if (regen && correctCount % regen === 0 && hearts < HEARTS_START[gameMode]) {
      hearts++;
      later(() => floatText(`${icon('heart')}하트 +1`, 'heart', 1400), 600);
    }
    quizStreak++;
    const startFever = quizStreak >= FEVER_STREAK;
    if (startFever) quizStreak = 0;
    updateHUD();
    const cleared = correctCount >= stageList.length;
    later(() => {
      $('quiz-modal').classList.remove('active');
      showGiantHanzi(quiz.q, quiz.pinyin, quiz.a, true);
    }, 300);
    later(() => {
      quizOpen = false;
      if (isGameOver) return;
      if (cleared) return stageClear();
      if (startFever) {
        setFever(FEVER_BLOCKS);
        floatText(`${icon('flame')}피버 타임!`, 'buff fever', 1600);
        sfx.buff();
      }
      generateDockBlocks();
      isGameLocked = false;
    }, 2000);
  } else {
    btn.classList.add('wrong');
    sfx.wrong();
    wrongCount++;
    quizStreak = 0;
    quizPool.splice(Math.floor(Math.random() * Math.max(1, quizPool.length)), 0, quiz);
    score = Math.max(0, score - 500);
    currentCombo = 0;
    linesClearedThisRound = 0;
    setDoubleScore(false);
    updateHUD();
    later(() => {
      $('quiz-modal').classList.remove('active');
      floatText('-500', 'penalty', 1800);
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
  sfx.tap();
  $('hint-btn').hidden = true;
  $('quiz-pinyin').hidden = false;
}
function triggerBonusQuiz() {
  quizOpen = true;
  isGameLocked = true;
  const data = window.BONUS_QUIZ_DATA;
  const bq = data[Math.floor(Math.random() * data.length)];
  const tag = $('quiz-tag');
  tag.className = 'quiz-tag gold';
  tag.innerHTML = `${icon('gift')}보너스 찬스! 틀려도 괜찮아요`;
  setQuizWord(escapeHTML(bq.q), true);
  $('hint-btn').hidden = true;
  $('quiz-pinyin').hidden = true;
  $('quiz-feedback').textContent = '';
  $('quiz-timer').hidden = true;

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
        sfx.correct();
        fb.textContent = '정답! 아이템을 골라요';
        fb.style.color = '#12925c';
        later(() => {
          $('quiz-modal').classList.remove('active');
          $('item-selection-modal').classList.add('active');
          sfx.sparkle();
        }, 1000);
      } else {
        btn.classList.add('wrong');
        sfx.wrong();
        fb.textContent = '아쉬워요! 다음 기회에';
        fb.style.color = '#d63a4e';
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
  sfx.quiz();
}
function selectItem(type) {
  sfx.buff();
  playerItems[type]++;
  updateInventoryUI();
  $('item-selection-modal').classList.remove('active');
  quizOpen = false;
  generateDockBlocks();
  isGameLocked = false;
}
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
  const color = isCorrect ? '#ff6f9f' : '#ff5a6e';
  const len = String(hanzi).replace(/<[^>]*>/g, '').length;
  const vw = Math.min(window.innerWidth, 900);
  const size = Math.min(140, Math.floor((vw * 0.78) / Math.max(1, len)));
  overlay.innerHTML = `
    <div class="giant-hanzi-text" style="--gsize:${size}px;color:${isCorrect ? 'var(--ink)' : color}">${hanzi}</div>
    <div class="giant-pinyin-text">${escapeHTML(pinyin || '')}</div>
    <div class="giant-meaning ${isCorrect ? 'good' : 'bad'}">${isCorrect ? icon('check') : '정답:'} ${escapeHTML(meaning || '')}</div>`;
  document.body.appendChild(overlay);
  overlay.animate(
    [
      { transform: 'translate(-50%,-50%) scale(0.5)', opacity: 0 },
      { transform: 'translate(-50%,-50%) scale(1.04)', opacity: 1, offset: 0.12 },
      { transform: 'translate(-50%,-50%) scale(1)', opacity: 1, offset: 0.86 },
      { transform: 'translate(-50%,-50%) scale(0.92)', opacity: 0 },
    ],
    { duration: 1650, easing: 'ease-out' },
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

// 폭탄: 마우스는 올려서 조준 → 클릭 / 터치는 탭해서 조준 → 같은 칸 한 번 더 탭
let bombPreview = null;
function useBomb() {
  if (isBombActive) return cancelBomb();
  if (playerItems.bomb <= 0 || isGameLocked || isGameOver) return;
  sfx.tap();
  isBombActive = true;
  bombPreview = null;
  updateInventoryUI();
  showBoardBanner('터뜨릴 칸을 고르세요 (터치는 두 번 탭)', '취소', cancelBomb);
}
function cancelBomb() {
  isBombActive = false;
  bombPreview = null;
  R.bomb = null;
  R.request();
  updateInventoryUI();
  hideBoardBanner();
  checkGameOverCondition();
}
R.cv.addEventListener('pointermove', (e) => {
  if (!isBombActive || e.pointerType !== 'mouse') return;
  const cell = R.cellAt(e.clientX, e.clientY);
  const key = cell ? cell.r * 8 + cell.c : -1;
  const cur = R.bomb ? R.bomb.r * 8 + R.bomb.c : -1;
  if (key !== cur) {
    R.bomb = cell;
    R.request();
  }
});
R.cv.addEventListener('pointerleave', () => {
  if (isBombActive && !bombPreview && R.bomb) {
    R.bomb = null;
    R.request();
  }
});
R.cv.addEventListener('click', (e) => {
  if (!isBombActive) return;
  const cell = R.cellAt(e.clientX, e.clientY);
  if (!cell) return;
  const isMouse = e.pointerType === 'mouse' || (!e.pointerType && matchMedia('(hover: hover)').matches);
  if (isMouse || (bombPreview && bombPreview.r === cell.r && bombPreview.c === cell.c)) {
    detonateBomb(cell.r, cell.c);
  } else {
    bombPreview = cell;
    R.bomb = cell;
    sfx.tap();
    R.request();
  }
});
function detonateBomb(r, c) {
  isBombActive = false;
  bombPreview = null;
  R.bomb = null;
  playerItems.bomb--;
  hideBoardBanner();
  updateInventoryUI();
  sfx.bomb();
  shakeBoard(5);
  flashScreen('#ffb07a', 0.2);
  let destroyed = 0;
  for (let i = r - 1; i <= r + 1; i++) {
    for (let j = c - 1; j <= c + 1; j++) {
      if (i < 0 || i >= 8 || j < 0 || j >= 8) continue;
      const v = board[i][j];
      if (!v) continue;
      if (v === 4) nextQuizIsBonus = true;
      if (v < 11) destroyed++;
      board[i][j] = 0;
      R.addFx('pop', i, j, v, 380, Math.random() * 120);
      R.burst(i, j, v < 11 && R.colors[v] ? R.colors[v][0] : '#b5acd0', 3);
    }
  }
  score += destroyed * 20;
  if (board.every((row) => row.every((v) => v === 0))) {
    score += 1000;
    showAllClearEffect();
  }
  updateHUD();
  later(checkGameOverCondition, 420);
}
function useReroll() {
  if (playerItems.reroll <= 0 || isGameLocked || isGameOver || isBombActive) return;
  playerItems.reroll--;
  updateInventoryUI();
  sfx.reroll();
  document.querySelectorAll('.dock-slot').forEach((s) => {
    s.classList.remove('reroll-anim');
    requestAnimationFrame(() => {
      s.classList.add('reroll-anim');
      setTimeout(() => s.classList.remove('reroll-anim'), 500);
    });
  });
  later(() => {
    const colors = shuffle([1, 2, 3]);
    const slots = [0, 1, 2].filter((i) => currentDockBlocks[i] !== null);
    const set = makeFairSet(slots.length);
    slots.forEach((i, k) => {
      currentDockBlocks[i] = { matrix: set[k], colorVal: colors[i] };
      renderDockSlot(i);
    });
    checkGameOverCondition();
  }, 250);
}
function useDoubleScore() {
  if (playerItems.doubleScore <= 0 || isDoubleScoreActive || isGameLocked || isGameOver) return;
  playerItems.doubleScore--;
  setDoubleScore(true);
  updateHUD();
  sfx.buff();
  floatText(`${icon('star')}점수 ×2!`, 'buff', 1500);
}

// ==========================================
// ★ 크롬 안내 / 앱 설치 / 오프라인 캐시 ★
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
      openBtn.textContent = B.isWeb ? '주소 복사' : '실행 방법';
      sub.textContent = B.isWeb ? '주소를 복사해 크롬 주소창에 붙여 넣어 주세요.' : '폴더의 PLAY_Chrome 실행 파일로 열면 항상 크롬에서 열려요.';
      openBtn.onclick = () => {
        if (B.isWeb && navigator.clipboard) navigator.clipboard.writeText(location.href).then(() => toast('주소를 복사했어요. 크롬에 붙여 넣으세요.'));
        else toast('PLAY_Chrome_Windows.bat / PLAY_Chrome_Mac.command 를 실행하세요', 3000);
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
  if ('serviceWorker' in navigator && B.isWeb && document.body.dataset.sw !== '0') {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
})();

// 초기 UI
updateSoundUI();
updateVoiceChip();
layout();
