// ==========================================
// ★ 방향키 스크롤 방지 로직 ★
// ==========================================
window.addEventListener(
  'keydown',
  function (e) {
    if (
      ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(
        e.code,
      ) > -1
    ) {
      e.preventDefault();
    }
  },
  { passive: false },
);

// ==========================================
// ★ 오디오(BGM) 관리 시스템 ★
// ==========================================
const AUDIO_SOURCES = {
  intro: new Audio('intro.mp3'),
  leaderboard: new Audio('leaderboard.mp3'),
  normal: [
    'block_bgm.mp3',
    'block_bgm2.mp3',
    'block_bgm3.mp3',
    'block_bgm4.mp3',
  ].map((src) => new Audio(src)),
  hell: [
    'hell_bgm1.mp3',
    'hell_bgm2.mp3',
    'hell_bgm3.mp3',
    'hell_bgm4.mp3',
  ].map((src) => new Audio(src)),
};
let currentAudio = null;
let currentPlaylist = [];
let currentTrackIndex = 0;

function stopAllBGM() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
  }
}

function playNextTrack() {
  currentAudio = currentPlaylist[currentTrackIndex];
  currentAudio.onended = () => {
    currentTrackIndex = (currentTrackIndex + 1) % currentPlaylist.length;
    playNextTrack();
  };
  currentAudio.play().catch((e) => console.log('Audio blocked.'));
}

function playBGM(type) {
  stopAllBGM();
  if (type === 'intro' || type === 'leaderboard') {
    currentAudio = AUDIO_SOURCES[type];
    currentAudio.loop = true;
    currentAudio.play().catch((e) => console.log('Audio blocked.'));
  } else {
    currentPlaylist = AUDIO_SOURCES[type];
    currentTrackIndex = Math.floor(Math.random() * currentPlaylist.length);
    playNextTrack();
  }
}

function initStartScreen() {
  const startScreen = document.getElementById('start-screen');
  if (startScreen.style.display !== 'none') {
    startScreen.style.display = 'none';
    document.getElementById('lobby-screen').style.display = 'flex';
    playBGM('intro');
  }
}
document
  .getElementById('start-screen')
  .addEventListener('click', initStartScreen);
document.addEventListener('keydown', initStartScreen);

// ==========================================
// ★ 랭킹 (로컬스토리지) 시스템 ★
// ==========================================
function saveRanking() {
  const nicknameInput = document.getElementById('nickname-input');
  const nickname = nicknameInput.value.trim();

  if (!nickname) {
    document.getElementById('alert-modal').classList.add('active');
    return;
  }

  const newRecord = {
    name: nickname,
    score: score,
    combo: maxComboThisRound,
    date: new Date().toLocaleDateString(),
    isPlayer: true,
  };
  let playerRankings =
    JSON.parse(localStorage.getItem(`player_rankings_${gameMode}`)) || [];
  playerRankings.push(newRecord);
  playerRankings.sort((a, b) => b.score - a.score);
  playerRankings = playerRankings.slice(0, 50);
  localStorage.setItem(
    `player_rankings_${gameMode}`,
    JSON.stringify(playerRankings),
  );

  document.getElementById('game-over-modal').classList.remove('active');
  showRankingScreen(gameMode);
}

function closeAlertModal() {
  document.getElementById('alert-modal').classList.remove('active');
  document.getElementById('nickname-input').focus();
}

function showRankingScreen(modeToOpen) {
  document.getElementById('lobby-screen').style.display = 'none';
  document.getElementById('game-container').style.display = 'none';
  document.getElementById('ranking-screen').style.display = 'flex';
  playBGM('leaderboard');
  renderRankingList(modeToOpen);
}

const AI_RIVALS = {
  normal: [
    { name: '제갈공명', baseScore: 85000, combo: 24, isPlayer: false },
    { name: '이소룡', baseScore: 72000, combo: 18, isPlayer: false },
  ],
  hell: [
    { name: '사마의', baseScore: 250000, combo: 35, isPlayer: false },
    {
      name: '진시황',
      baseScore: 210000,
      combo: 28,
      isPlayer: false,
    },
  ],
};

function growAIRivals(mode) {
  let rivals = JSON.parse(localStorage.getItem(`ai_rivals_${mode}`));

  if (!rivals) {
    rivals = AI_RIVALS[mode].map((r) => ({ ...r, currentScore: r.baseScore }));
  } else {
    // 1. 현재 플레이어의 최고 점수 가져오기
    let playerRankings =
      JSON.parse(localStorage.getItem(`player_rankings_${mode}`)) || [];
    let playerBestScore =
      playerRankings.length > 0 ? playerRankings[0].score : 0;

    // index 0: 1등 AI (제갈공명 / 사마의)
    // index 1: 2등 AI (이소룡 / 진시황)
    rivals.forEach((r, index) => {
      let playChance = 0;
      let scoreIncrease = 0;

      if (index === 0) {
        // [1등 AI 성향] 여유 10% / 분노 40% (점수 증가폭: 2500 ~ 7490)
        playChance = r.currentScore > playerBestScore ? 0.1 : 0.4;
        scoreIncrease = (Math.floor(Math.random() * 500) + 250) * 10;
      } else {
        // [2등 AI 성향] 꾸준함 15% / 분노 30% (점수 증가폭: 1500 ~ 4490 - 조금씩 오름)
        playChance = r.currentScore > playerBestScore ? 0.15 : 0.3;
        scoreIncrease = (Math.floor(Math.random() * 300) + 150) * 10;
      }

      // 확률에 당첨되었을 때만(AI가 게임을 했을 때만) 점수 증가
      if (Math.random() < playChance) {
        r.currentScore += scoreIncrease;

        // 5% 확률로 최대 콤보 기록도 갱신
        if (Math.random() < 0.05) r.combo += 1;
      }
    });
  }

  localStorage.setItem(`ai_rivals_${mode}`, JSON.stringify(rivals));
}

function getAIRivals(mode) {
  let rivals = JSON.parse(localStorage.getItem(`ai_rivals_${mode}`));
  if (!rivals) {
    rivals = AI_RIVALS[mode].map((r) => ({ ...r, currentScore: r.baseScore }));
    localStorage.setItem(`ai_rivals_${mode}`, JSON.stringify(rivals));
  }
  return rivals.map((r) => ({
    name: r.name,
    score: r.currentScore,
    combo: r.combo,
    isPlayer: false,
  }));
}

function renderRankingList(mode) {
  document
    .getElementById('tab-normal')
    .classList.toggle('active', mode === 'normal');
  document
    .getElementById('tab-hell')
    .classList.toggle('active', mode === 'hell');

  const listEl = document.getElementById('ranking-list');
  listEl.innerHTML = '';
  let playerRankings =
    JSON.parse(localStorage.getItem(`player_rankings_${mode}`)) || [];
  let aiRankings = getAIRivals(mode);

  let combinedRankings = [...playerRankings, ...aiRankings];
  combinedRankings.sort((a, b) => b.score - a.score);
  combinedRankings = combinedRankings.slice(0, 15);

  if (combinedRankings.length === 0) {
    listEl.innerHTML =
      "<li style='text-align:center; padding: 20px; color: #888;'>등록된 랭킹이 없습니다.</li>";
    return;
  }

  combinedRankings.forEach((record, index) => {
    const li = document.createElement('li');
    li.className = 'ranking-item';

    // 등수별 메달 색상
    let rankColor =
      index === 0
        ? '#ffd700'
        : index === 1
          ? '#c0c0c0'
          : index === 2
            ? '#cd7f32'
            : '#fff';

    // ★ AI 가독성 개선: 기존 #888에서 밝은 은회색(#e0e0e0)으로 변경 및 그림자 추가 ★
    const nameColor = record.isPlayer ? '#00ffcc' : '#e0e0e0';
    const nameShadow = record.isPlayer
      ? 'text-shadow: 0 0 10px #00ffcc;'
      : 'text-shadow: 0 0 5px rgba(255,255,255,0.4);'; // AI에게도 부드러운 그림자 부여

    li.innerHTML = `
        <div>
            <span style="display:inline-block; width: 35px; color:${rankColor}; font-weight:900; font-size:15pt;">${index + 1}.</span> 
            <span style="font-size: 13pt; font-weight: bold; color: ${nameColor}; ${nameShadow}">${record.name}</span>
        </div>
        <div class="rank-info">
            <span class="rank-score" style="color:${rankColor};">${record.score.toLocaleString()} 점</span>
            <span class="rank-combo">MAX ${record.combo} COMBO</span>
        </div>
    `;
    listEl.appendChild(li);
  });
}

function returnToLobby() {
  document.getElementById('ranking-screen').style.display = 'none';
  document.getElementById('lobby-screen').style.display = 'flex';
  playBGM('intro');
}

// ==========================================
// ★ 게임 코어 시스템 ★
// ==========================================
const BOARD_SIZE = 8;
let board = Array(BOARD_SIZE)
  .fill(null)
  .map(() => Array(BOARD_SIZE).fill(0));
let score = 0;
let currentDockBlocks = [null, null, null];
let activeDragIndex = null;
let isDragging = false;
let gameMode = 'normal';
let currentCombo = 0;
let maxComboThisRound = 0;
let linesClearedThisRound = 0;
let currentQuiz = null; // 현재 출제된 문제를 저장할 변수
let availableQuizzes = []; // ★ 퀴즈 중복 출제 방지를 위한 남은 문제 배열
const GOOD_BLOCKS = [
  [[1, 1, 1, 1]],
  [[1], [1], [1], [1]],
  [
    [1, 1],
    [1, 1],
  ],

  [[1, 1, 1]],
  [[1], [1], [1]],
  [
    [1, 1, 1],
    [1, 1, 1],
  ],
  [
    [1, 1],
    [1, 1],
    [1, 1],
  ],
];
const NORMAL_BLOCKS = [
  [
    [1, 1],
    [0, 1],
  ],
  [
    [1, 1],
    [1, 0],
  ],
  [
    [0, 1],
    [1, 1],
  ],
  [
    [1, 0],
    [1, 1],
  ],
  [
    [1, 1, 1],
    [1, 1, 1],
    [1, 1, 1],
  ],
  [
    [1, 1, 1],
    [0, 1, 0],
  ],
  [
    [0, 1, 0],
    [1, 1, 1],
  ],
  [
    [1, 0],
    [1, 1],
    [1, 0],
  ],
  [
    [0, 1],
    [1, 1],
    [0, 1],
  ],
  [
    [1, 0],
    [1, 0],
    [1, 1],
  ],
  [
    [0, 1],
    [0, 1],
    [1, 1],
  ],
  [[1, 1, 1, 1, 1]],
  [[1], [1], [1], [1], [1]],

  [
    [1, 1, 1],
    [1, 0, 0],
  ],
  [
    [1, 1, 1],
    [0, 0, 1],
  ],
  [
    [1, 0],
    [1, 0],
    [1, 1],
  ],
  [
    [0, 1],
    [0, 1],
    [1, 1],
  ],

  [
    [0, 1],
    [1, 1],
    [1, 0],
  ],
  [
    [1, 0],
    [1, 1],
    [0, 1],
  ],
  [
    [1, 1, 0],
    [0, 1, 1],
  ],
  [
    [0, 1, 1],
    [1, 1, 0],
  ],
];
const HARD_BLOCKS = [
  [
    [1, 1, 1],
    [0, 1, 0],
    [1, 1, 1],
  ],
  [
    [0, 1, 0],
    [0, 1, 0],
    [1, 1, 1],
  ],
  [
    [1, 1, 1],
    [0, 1, 0],
    [0, 1, 0],
  ],
  [
    [1, 0, 0],
    [1, 0, 0],
    [1, 1, 1],
  ],
  [
    [0, 0, 1],
    [0, 0, 1],
    [1, 1, 1],
  ],
  [
    [1, 1, 1],
    [1, 0, 0],
    [1, 0, 0],
  ],
  [
    [1, 1, 1],
    [0, 0, 1],
    [0, 0, 1],
  ],
  [
    [1, 1, 0],
    [1, 1, 1],
  ],
  [
    [0, 1, 1],
    [1, 1, 1],
  ],
  [
    [1, 1, 1],
    [1, 1, 0],
  ],
  [
    [1, 1, 1],
    [0, 1, 1],
  ],
];

function startGame(mode) {
  gameMode = mode;
  document.getElementById('lobby-screen').style.display = 'none';
  document.getElementById('game-container').style.display = 'flex';

  if (mode === 'hell') {
    document.body.classList.add('hell-theme');
    document.getElementById('mode-display').innerText = 'HELL 🔥';
    document.getElementById('mode-display').style.color = '#ff003c';
  } else {
    document.body.classList.remove('hell-theme');
    document.getElementById('mode-display').innerText = 'NORMAL';
    document.getElementById('mode-display').style.color = '#ff00ff';
  }

  playBGM(mode);
  const boardWrapper = document.getElementById('board-wrapper');
  if (boardWrapper) boardWrapper.style.filter = 'none';
  board = Array(BOARD_SIZE)
    .fill(null)
    .map(() => Array(BOARD_SIZE).fill(0));
  score = 0;
  currentCombo = 0;
  maxComboThisRound = 0;
  linesClearedThisRound = 0;
  availableQuizzes = []; // ★ 새 게임 시작 시 문제 덱 초기화 추가 ★
  initBoardHTML();
  generateDockBlocks();
  setupTouchEvents();
}

function initBoardHTML() {
  const boardEl = document.getElementById('grid-board');
  boardEl.innerHTML = '';
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const cellEl = document.createElement('div');
      cellEl.className = 'grid-cell';
      cellEl.id = `cell-${r}-${c}`;
      boardEl.appendChild(cellEl);
    }
  }
  renderBoard();
}

function renderBoard() {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const cellEl = document.getElementById(`cell-${r}-${c}`);
      cellEl.className = 'grid-cell';
      cellEl.innerText = '';
      const val = board[r][c];
      if (val >= 1 && val <= 3) cellEl.classList.add(`color-${val}`);
      else if (val >= 11) {
        cellEl.classList.add('cell-obstacle');
        cellEl.innerText = val - 10;
      }
    }
  }
  document.getElementById('score').innerText = score;
}
// ==========================================
// ★ 퀴즈 시스템 (힌트 보기 & 중복 방지 로직) ★
// ==========================================
function triggerNewQuiz() {
  const modal = document.getElementById('quiz-modal');
  const feedback = document.getElementById('quiz-feedback');
  const hintBtn = document.getElementById('hint-btn');
  const pinyinDisplay = document.getElementById('quiz-pinyin');

  feedback.innerText = '';

  // 팝업이 뜰 때마다 힌트 상태 초기화
  hintBtn.style.display = 'inline-block';
  pinyinDisplay.style.display = 'none';

  // ★ 중복 방지 로직: 남은 문제가 없으면 원본 데이터를 복사하고 무작위로 섞음 (피셔-예이츠 셔플) ★
  if (availableQuizzes.length === 0) {
    availableQuizzes = [...QUIZ_DATA]; // 데이터 복사
    for (let i = availableQuizzes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [availableQuizzes[i], availableQuizzes[j]] = [
        availableQuizzes[j],
        availableQuizzes[i],
      ];
    }
  }

  // 섞여 있는 배열의 맨 끝에서 문제를 하나씩 뽑아 출제 (한 바퀴 돌 때까지 중복 절대 불가)
  currentQuiz = availableQuizzes.pop();

  document.getElementById('quiz-question').innerText = currentQuiz.q;
  pinyinDisplay.innerText = currentQuiz.pinyin;

  const optionsContainer = document.getElementById('quiz-options');
  optionsContainer.innerHTML = '';

  currentQuiz.options.forEach((opt) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.innerText = opt;
    btn.onclick = () => {
      // 더블 클릭 방지
      const allBtns = optionsContainer.querySelectorAll('button');
      allBtns.forEach((b) => (b.disabled = true));

      if (opt === currentQuiz.a) {
        playCorrectSound(); // 정답 효과음 재생
        feedback.innerText = '정답입니다!';
        feedback.style.color = '#00ff00';
        setTimeout(() => {
          modal.classList.remove('active');
          generateDockBlocks();
        }, 700);
      } else {
        playWrongSound(); // 오답 효과음 재생
        feedback.innerText =
          gameMode === 'hell'
            ? '오답! 장애물 최대 6개 투하!'
            : '오답! 장애물 1개 투하!';
        feedback.style.color = '#ff3333';
        currentCombo = 0;
        linesClearedThisRound = 0;
        setTimeout(() => {
          modal.classList.remove('active');
          spawnObstacleStone(gameMode);
          generateDockBlocks();
        }, 1000);
      }
    };
    optionsContainer.appendChild(btn);
  });

  modal.classList.add('active');
  playQuizPopupSound(); // 퀴즈 등장 효과음 재생
}

// 힌트 버튼 클릭 시 실행되는 함수
function showHint() {
  document.getElementById('hint-btn').style.display = 'none';
  document.getElementById('quiz-pinyin').style.display = 'block';
}

function spawnObstacleStone(mode) {
  let totalToSpawn = mode === 'hell' ? Math.floor(Math.random() * 6) + 1 : 1;
  let spawned = 0;
  while (spawned < totalToSpawn) {
    let emptyCells = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++)
        if (board[r][c] === 0) emptyCells.push({ r, c });
    }
    if (emptyCells.length === 0) break;

    let clusterSize = Math.floor(Math.random() * (totalToSpawn - spawned)) + 1;
    let startCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    let cluster = [startCell];
    let visited = new Set();
    visited.add(`${startCell.r},${startCell.c}`);
    let queue = [startCell];

    while (cluster.length < clusterSize && queue.length > 0) {
      let curr = queue.shift();
      let neighbors = [
        { r: curr.r - 1, c: curr.c },
        { r: curr.r + 1, c: curr.c },
        { r: curr.r, c: curr.c - 1 },
        { r: curr.r, c: curr.c + 1 },
      ].filter(
        (n) =>
          n.r >= 0 &&
          n.r < BOARD_SIZE &&
          n.c >= 0 &&
          n.c < BOARD_SIZE &&
          board[n.r][n.c] === 0 &&
          !visited.has(`${n.r},${n.c}`),
      );
      neighbors.sort(() => Math.random() - 0.5);
      for (let n of neighbors) {
        visited.add(`${n.r},${n.c}`);
        cluster.push(n);
        queue.push(n);
        if (cluster.length >= clusterSize) break;
      }
    }
    for (let cell of cluster) {
      let durability = Math.floor(Math.random() * 2) + 2;
      board[cell.r][cell.c] = 10 + durability;
      spawned++;
    }
  }
  renderBoard();
}

function generateDockBlocks() {
  const colorPool = [1, 2, 3].sort(() => Math.random() - 0.5);
  let normalChance = 0;
  let hardChance = 0;

  if (gameMode === 'normal') {
    normalChance = 0.05;
    hardChance = 0.0;
    if (currentCombo >= 11) {
      let increase = (currentCombo - 10) * 0.01;
      normalChance += increase;
      hardChance += increase;
    }
  } else if (gameMode === 'hell') {
    normalChance = 0.15;
    hardChance = 0.0;
    if (currentCombo >= 11) {
      let increase = (currentCombo - 10) * 0.01;
      normalChance += increase;
      hardChance += increase;
    }
  }

  if (normalChance + hardChance > 1.0) {
    let over = normalChance + hardChance - 1.0;
    normalChance -= over / 2;
    hardChance -= over / 2;
  }

  for (let i = 0; i < 3; i++) {
    const rand = Math.random();
    let poolToUse =
      rand < hardChance
        ? HARD_BLOCKS
        : rand < hardChance + normalChance
          ? NORMAL_BLOCKS
          : GOOD_BLOCKS;
    const blockMatrix = JSON.parse(
      JSON.stringify(poolToUse[Math.floor(Math.random() * poolToUse.length)]),
    );
    currentDockBlocks[i] = { matrix: blockMatrix, colorVal: colorPool[i] };
    renderDockSlot(i);
  }
  checkGameOverCondition();
}

function renderDockSlot(slotIndex) {
  const slotEl = document.getElementById(`slot-${slotIndex}`);
  slotEl.innerHTML = '';
  const blockData = currentDockBlocks[slotIndex];
  if (!blockData) return;
  const table = document.createElement('div');
  table.className = 'preview-matrix';
  blockData.matrix.forEach((row) => {
    const rowEl = document.createElement('div');
    rowEl.className = 'preview-row';
    row.forEach((cell) => {
      const cellEl = document.createElement('div');
      cellEl.className = 'preview-cell';
      if (cell === 1) cellEl.classList.add(`color-${blockData.colorVal}`);
      rowEl.appendChild(cellEl);
    });
    table.appendChild(rowEl);
  });
  slotEl.appendChild(table);
}

function setupTouchEvents() {
  const dockSlots = document.querySelectorAll('.dock-slot');
  const overlay = document.getElementById('drag-overlay');

  function updateDragPosition(clientX, clientY) {
    if (!isDragging) return { topLeftX: 0, topLeftY: 0 };
    const overlayRect = overlay.getBoundingClientRect();
    const centerX = clientX;
    const centerY = clientY - 40;
    overlay.style.left = `${centerX - overlayRect.width / 2}px`;
    overlay.style.top = `${centerY - overlayRect.height / 2}px`;
    const topLeftX = centerX - overlayRect.width / 2 + 20;
    const topLeftY = centerY - overlayRect.height / 2 + 20;
    drawShadow(topLeftX, topLeftY);
    return { topLeftX, topLeftY };
  }

  function handleStart(clientX, clientY, slot) {
    const slotIndex = parseInt(slot.getAttribute('data-slot'));
    if (!currentDockBlocks[slotIndex]) return;
    activeDragIndex = slotIndex;
    isDragging = true;
    createDragOverlayStyle(currentDockBlocks[slotIndex]);
    overlay.style.display = 'block';
    requestAnimationFrame(() => updateDragPosition(clientX, clientY));
  }

  function handleMove(clientX, clientY) {
    updateDragPosition(clientX, clientY);
  }

  function handleEnd(clientX, clientY) {
    if (!isDragging) return;
    const { topLeftX, topLeftY } = updateDragPosition(clientX, clientY);
    isDragging = false;
    overlay.style.display = 'none';
    clearShadow();

    const targetCell = findBoardCellAtPos(topLeftX, topLeftY);
    if (targetCell) {
      const { r, c } = targetCell;
      const blockData = currentDockBlocks[activeDragIndex];
      if (canPlaceBlock(r, c, blockData.matrix)) {
        placeBlock(r, c, blockData.matrix, blockData.colorVal);
        currentDockBlocks[activeDragIndex] = null;
        renderDockSlot(activeDragIndex);

        clearFullLines(() => {
          if (currentDockBlocks.every((b) => b === null)) {
            if (linesClearedThisRound === 0) currentCombo = 0;
            linesClearedThisRound = 0;
            setTimeout(() => triggerNewQuiz(), 300);
          } else checkGameOverCondition();
        });
      }
    }
    activeDragIndex = null;
  }

  dockSlots.forEach((slot) => {
    slot.addEventListener(
      'touchstart',
      (e) => handleStart(e.touches[0].clientX, e.touches[0].clientY, slot),
      { passive: false },
    );
    slot.addEventListener('mousedown', (e) =>
      handleStart(e.clientX, e.clientY, slot),
    );
  });
  window.addEventListener(
    'touchmove',
    (e) => {
      if (isDragging) {
        e.preventDefault();
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    },
    { passive: false },
  );
  window.addEventListener('mousemove', (e) => handleMove(e.clientX, e.clientY));
  window.addEventListener('touchend', (e) =>
    handleEnd(e.changedTouches[0].clientX, e.changedTouches[0].clientY),
  );
  window.addEventListener('mouseup', (e) => handleEnd(e.clientX, e.clientY));
}

function clearShadow() {
  document
    .querySelectorAll('.cell-shadow')
    .forEach((el) => el.classList.remove('cell-shadow'));
}

function drawShadow(topLeftX, topLeftY) {
  clearShadow();
  if (activeDragIndex === null) return;
  const targetCell = findBoardCellAtPos(topLeftX, topLeftY);
  if (!targetCell) return;
  const { r, c } = targetCell;
  const blockData = currentDockBlocks[activeDragIndex];
  if (canPlaceBlock(r, c, blockData.matrix)) {
    for (let row = 0; row < blockData.matrix.length; row++) {
      for (let col = 0; col < blockData.matrix[row].length; col++) {
        if (blockData.matrix[row][col] === 1) {
          const cellEl = document.getElementById(`cell-${r + row}-${c + col}`);
          if (cellEl) cellEl.classList.add('cell-shadow');
        }
      }
    }
  }
}

function createDragOverlayStyle(blockData) {
  const overlay = document.getElementById('drag-overlay');
  overlay.innerHTML = '';
  const container = document.createElement('div');
  container.className = 'drag-block-table';
  blockData.matrix.forEach((row) => {
    const rowEl = document.createElement('div');
    rowEl.className = 'drag-row';
    row.forEach((cell) => {
      const cellEl = document.createElement('div');
      cellEl.className = 'drag-cell';
      cellEl.style.width = '40px';
      cellEl.style.height = '40px';
      if (cell === 1) cellEl.classList.add(`color-${blockData.colorVal}`);
      cellEl.style.opacity = cell === 1 ? '1' : '0';
      rowEl.appendChild(cellEl);
    });
    container.appendChild(rowEl);
  });
  overlay.appendChild(container);
}

function findBoardCellAtPos(x, y) {
  const boardEl = document.getElementById('grid-board');
  const rect = boardEl.getBoundingClientRect();
  if (
    x < rect.left - 20 ||
    x > rect.right + 20 ||
    y < rect.top - 20 ||
    y > rect.bottom + 20
  )
    return null;
  const cellW = rect.width / BOARD_SIZE;
  const cellH = rect.height / BOARD_SIZE;
  let c = Math.floor((x - rect.left) / cellW);
  let r = Math.floor((y - rect.top) / cellH);
  c = Math.max(0, Math.min(c, BOARD_SIZE - 1));
  r = Math.max(0, Math.min(r, BOARD_SIZE - 1));
  return { r, c };
}

function canPlaceBlock(startR, startC, matrix) {
  for (let r = 0; r < matrix.length; r++) {
    for (let c = 0; c < matrix[r].length; c++) {
      if (matrix[r][c] === 1) {
        const tr = startR + r;
        const tc = startC + c;
        if (
          tr < 0 ||
          tr >= BOARD_SIZE ||
          tc < 0 ||
          tc >= BOARD_SIZE ||
          board[tr][tc] !== 0
        )
          return false;
      }
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

function clearFullLines(onComplete) {
  let rowsToClear = [];
  let colsToClear = [];
  for (let r = 0; r < BOARD_SIZE; r++)
    if (board[r].every((cell) => cell !== 0)) rowsToClear.push(r);
  for (let c = 0; c < BOARD_SIZE; c++) {
    let isFull = true;
    for (let r = 0; r < BOARD_SIZE; r++) {
      if (board[r][c] === 0) {
        isFull = false;
        break;
      }
    }
    if (isFull) colsToClear.push(c);
  }
  const totalCleared = rowsToClear.length + colsToClear.length;

  if (totalCleared > 0) {
    playClearSound(); // ★ 블록 제거 타격감 사운드 재생

    let previousCombo = currentCombo;
    currentCombo += totalCleared;
    maxComboThisRound = Math.max(maxComboThisRound, currentCombo);
    linesClearedThisRound += totalCleared;

    let shakeIntensity = 1 + currentCombo * 0.5;
    document.documentElement.style.setProperty(
      '--shake-int',
      Math.min(shakeIntensity, 6),
    );
    const gameContainer = document.getElementById('game-container');
    gameContainer.classList.remove('shake-active');
    void gameContainer.offsetWidth;
    gameContainer.classList.add('shake-active');
    setTimeout(() => gameContainer.classList.remove('shake-active'), 400);

    if (currentCombo >= 10) {
      const flash = document.getElementById('light-flash-overlay');
      flash.classList.remove('flash-active');
      void flash.offsetWidth;
      flash.classList.add('flash-active');
      setTimeout(() => flash.classList.remove('flash-active'), 600);
    }

    let normalCells = [];
    let damagedObstacles = [];
    let hitCells = new Set();
    rowsToClear.forEach((r) => {
      for (let c = 0; c < BOARD_SIZE; c++) hitCells.add(`${r},${c}`);
    });
    colsToClear.forEach((c) => {
      for (let r = 0; r < BOARD_SIZE; r++) hitCells.add(`${r},${c}`);
    });
    hitCells.forEach((pos) => {
      let [r, c] = pos.split(',').map(Number);
      if (board[r][c] >= 11) damagedObstacles.push({ r, c });
      else if (board[r][c] > 0) normalCells.push({ r, c });
    });

    normalCells.forEach((pos) =>
      document
        .getElementById(`cell-${pos.r}-${pos.c}`)
        .classList.add('cell-explode'),
    );
    damagedObstacles.forEach((pos) =>
      document
        .getElementById(`cell-${pos.r}-${pos.c}`)
        .classList.add('cell-damage'),
    );

    setTimeout(() => {
      normalCells.forEach((pos) => {
        board[pos.r][pos.c] = 0;
      });
      damagedObstacles.forEach((pos) => {
        board[pos.r][pos.c] -= 1;
        if (board[pos.r][pos.c] <= 10) board[pos.r][pos.c] = 0;
      });

      const baseScore = gameMode === 'hell' ? 300 : 150;
      let earnedScore = totalCleared * baseScore * currentCombo;
      score += earnedScore;

      showComboEffect(totalCleared, currentCombo);

      // ★ 다중 라인 제거 시 연속 아르페지오 사운드 재생 ★
      playSequentialComboSounds(previousCombo + 1, totalCleared);

      let isAllClear = true;
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          if (board[r][c] > 0) {
            isAllClear = false;
            break;
          }
        }
        if (!isAllClear) break;
      }
      if (isAllClear) {
        score += 1000;
        showAllClearEffect();
      }

      renderBoard();
      if (onComplete) onComplete();
    }, 300);
  } else {
    if (onComplete) onComplete();
  }
}

function showComboEffect(linesCleared, finalCombo) {
  const comboEl = document.getElementById('combo-display');
  let bonusText =
    linesCleared > 1
      ? `<span class="bonus-lines">+${linesCleared} LINES!</span>`
      : '';
  comboEl.innerHTML = `${bonusText}${finalCombo} COMBO!`;
  comboEl.classList.remove('show');
  void comboEl.offsetWidth;
  comboEl.classList.add('show');
  setTimeout(() => {
    comboEl.classList.remove('show');
  }, 1200);
}

function showAllClearEffect() {
  const acEl = document.getElementById('all-clear-display');
  acEl.classList.remove('show');
  void acEl.offsetWidth;
  acEl.classList.add('show');
  const flash = document.getElementById('light-flash-overlay');
  flash.classList.remove('flash-active');
  void flash.offsetWidth;
  flash.classList.add('flash-active');
  setTimeout(() => {
    acEl.classList.remove('show');
  }, 2000);
}

// ==========================================
// ★ 게임 오버 조건 체크 및 가시성 개선 연출 ★
// ==========================================
function checkGameOverCondition() {
  let activeBlocksCount = 0;
  let placeableBlocksCount = 0;
  for (let i = 0; i < 3; i++) {
    const blockData = currentDockBlocks[i];
    if (blockData) {
      activeBlocksCount++;
      let canBePlacedAnywhere = false;
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          if (canPlaceBlock(r, c, blockData.matrix)) {
            canBePlacedAnywhere = true;
            break;
          }
        }
        if (canBePlacedAnywhere) break;
      }
      if (canBePlacedAnywhere) placeableBlocksCount++;
    }
  }

  // 블록은 남아있는데 더 이상 둘 곳이 없는 경우 (게임 오버 트래킹)
  if (activeBlocksCount > 0 && placeableBlocksCount === 0) {
    // AI 점수 성장 작동
    growAIRivals(gameMode);

    // 1. 보드판 전체를 흐리게 만들고 타격감 차단 처리 효과 (CSS 필터 활용)
    const boardWrapper = document.getElementById('board-wrapper');
    if (boardWrapper) {
      boardWrapper.style.transition = 'all 1s ease';
      boardWrapper.style.filter = 'grayscale(0.6) brightness(0.5)';
    }

    // 2. 콤보 표시 자리에 "배치 불가" 경고 메시지를 띄워 안내 강화
    const comboEl = document.getElementById('combo-display');
    comboEl.innerHTML = `<span style="color: #ff003c; text-shadow: 0 0 15px #ff003c; font-size: 26pt; font-weight: 900;">배치 불가!<br><span style="font-size: 16pt; color: #fff;">NO SPACE</span></span>`;
    comboEl.classList.add('show');

    // 3. 바로 팝업을 띄우지 않고, 유저가 상황을 인지할 수 있도록 1.2초의 여유 시간을 준 뒤 모달 띄우기
    setTimeout(() => {
      playBGM('leaderboard');

      // "배치 불가" 글씨 걷어내기
      comboEl.classList.remove('show');

      const gameOverModal = document.getElementById('game-over-modal');
      const statsText = document.getElementById('game-over-stats');
      statsText.innerHTML = `
                모드: <strong style="color:#ff00ff;">${gameMode.toUpperCase()}</strong><br>
                최종 점수: <strong style="color:#00ffcc;">${score}</strong> 점<br>
                최대 콤보: <strong style="color:#ffaf7b;">${maxComboThisRound}</strong> Combo
            `;
      gameOverModal.classList.add('active');
    }, 1200);
  }
}
// ==========================================
// ★ Web Audio API 기반 커스텀 사운드 효과 ★
// ==========================================
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const scaleFrequencies = [
  261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25,
]; // 도레미파솔라시도

// 1. 퀴즈 등장 효과음 (띠로롱~) - 볼륨 2배 증가
function playQuizPopupSound() {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(400, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.15);
  gain.gain.setValueAtTime(1.0, audioCtx.currentTime); // 볼륨 1.0으로 상향
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.3);
}

// 2. 블록 제거 타격 효과음 (파직!) - 볼륨 2.4배 증가
function playClearSound() {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(150, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.15);
  gain.gain.setValueAtTime(1.2, audioCtx.currentTime); // 볼륨 1.2로 상향 (강한 타격감)
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.2);
}

// 3. 다중 라인 제거 시 아르페지오 (도-레-미 연속 재생) - 볼륨 증가
function playSequentialComboSounds(startCombo, linesCleared) {
  if (audioCtx.state === 'suspended') audioCtx.resume();

  for (let i = 0; i < linesCleared; i++) {
    const currentComboCount = startCombo + i;
    const scaleIndex = (currentComboCount - 1) % 8;
    const octaveMultiplier = Math.pow(
      2,
      Math.floor((currentComboCount - 1) / 8),
    );
    const freq = scaleFrequencies[scaleIndex] * octaveMultiplier;

    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.type = 'sawtooth'; // 레트로 오락실 느낌 파형

    // 0.15초 간격으로 스케줄링하여 아르페지오 연출
    const startTime = audioCtx.currentTime + i * 0.15;
    const stopTime = startTime + 0.4;

    oscillator.frequency.setValueAtTime(freq, startTime);

    gainNode.gain.setValueAtTime(0.0, audioCtx.currentTime); // 시작 전엔 음소거
    gainNode.gain.setValueAtTime(1.0, startTime); // 볼륨 1.0으로 상향
    gainNode.gain.exponentialRampToValueAtTime(0.001, stopTime);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.start(startTime);
    oscillator.stop(stopTime);
  }
}

// 4. 정답 효과음 (밝고 경쾌한 상승음)
function playCorrectSound() {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(440, audioCtx.currentTime); // A4
  osc.frequency.setValueAtTime(554.37, audioCtx.currentTime + 0.1); // C#5
  osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.2); // E5
  gain.gain.setValueAtTime(1.0, audioCtx.currentTime); // 볼륨 1.0
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.4);
}

// 5. 오답 효과음 (둔탁하고 하락하는 경고음)
function playWrongSound() {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(200, audioCtx.currentTime); // 낮은 주파수
  osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.4);
  gain.gain.setValueAtTime(1.0, audioCtx.currentTime); // 볼륨 1.0
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.4);
}
