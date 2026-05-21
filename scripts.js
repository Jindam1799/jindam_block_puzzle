window.addEventListener(
  'keydown',
  function (e) {
    if (
      ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(
        e.code,
      ) > -1
    )
      e.preventDefault();
  },
  { passive: false },
);

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

function saveRanking() {
  const nickname =
    document.getElementById('nickname-input').value.trim() || '무명장수';
  const newRecord = {
    name: nickname,
    score: score,
    combo: currentCombo,
    date: new Date().toLocaleDateString(),
  };
  let rankings = JSON.parse(localStorage.getItem(`rankings_${gameMode}`)) || [];
  rankings.push(newRecord);
  rankings.sort((a, b) => b.score - a.score);
  rankings = rankings.slice(0, 15);
  localStorage.setItem(`rankings_${gameMode}`, JSON.stringify(rankings));
  document.getElementById('game-over-modal').classList.remove('active');
  showRankingScreen(gameMode);
}

function showRankingScreen(modeToOpen) {
  document.getElementById('lobby-screen').style.display = 'none';
  document.getElementById('game-container').style.display = 'none';
  document.getElementById('ranking-screen').style.display = 'flex';
  playBGM('leaderboard');
  renderRankingList(modeToOpen);
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
  let rankings = JSON.parse(localStorage.getItem(`rankings_${mode}`)) || [];
  if (rankings.length === 0) {
    listEl.innerHTML =
      "<li style='text-align:center; padding: 20px; color: #888;'>등록된 랭킹이 없습니다.</li>";
    return;
  }
  rankings.forEach((record, index) => {
    const li = document.createElement('li');
    li.className = 'ranking-item';
    li.innerHTML = `<div><span style="display:inline-block; width: 25px;">${index + 1}.</span> <span style="font-size: 13pt;">${record.name}</span></div>
            <div class="rank-info"><span class="rank-score">${record.score.toLocaleString()} 점</span><span class="rank-combo">MAX ${record.combo} COMBO</span></div>`;
    listEl.appendChild(li);
  });
}

function returnToLobby() {
  document.getElementById('ranking-screen').style.display = 'none';
  document.getElementById('lobby-screen').style.display = 'flex';
  playBGM('intro');
}

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
let linesClearedThisRound = 0;

const GOOD_BLOCKS = [
  [[1, 1, 1, 1]],
  [[1], [1], [1], [1]],
  [
    [1, 1],
    [1, 1],
  ],
  [[1, 1, 1, 1, 1]],
  [[1], [1], [1], [1], [1]],
  [
    [1, 1, 1],
    [1, 1, 1],
  ],
  [
    [1, 1],
    [1, 1],
    [1, 1],
  ],
  [
    [1, 1, 1],
    [1, 1, 1],
    [1, 1, 1],
  ],
];
const NORMAL_BLOCKS = [
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
  board = Array(BOARD_SIZE)
    .fill(null)
    .map(() => Array(BOARD_SIZE).fill(0));
  score = 0;
  currentCombo = 0;
  linesClearedThisRound = 0;

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

function triggerNewQuiz() {
  const modal = document.getElementById('quiz-modal');
  const feedback = document.getElementById('quiz-feedback');
  feedback.innerText = '';
  const quiz = QUIZ_DATA[Math.floor(Math.random() * QUIZ_DATA.length)];
  document.getElementById('quiz-question').innerText = quiz.q;
  const optionsContainer = document.getElementById('quiz-options');
  optionsContainer.innerHTML = '';

  quiz.options.forEach((opt) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.innerText = opt;
    btn.onclick = () => {
      if (opt === quiz.a) {
        feedback.innerText = '정답입니다!';
        feedback.style.color = '#00ff00';
        setTimeout(() => {
          modal.classList.remove('active');
          generateDockBlocks();
        }, 700);
      } else {
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

// ★ 콤보 점프 수치 비례 로직 및 올 클리어 체크 추가 ★
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
    currentCombo += totalCleared; // 한 번에 지운 줄 수만큼 콤보 정직하게 상승
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

      showComboEffect(totalCleared, currentCombo); // 다중 클리어 보너스 표시

      // ★ ALL CLEAR 체크 로직 ★
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
  // 여러 줄 지우면 보너스 텍스트 추가
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

  // 올 클리어 시 빛 번쩍임 보너스 추가
  const flash = document.getElementById('light-flash-overlay');
  flash.classList.remove('flash-active');
  void flash.offsetWidth;
  flash.classList.add('flash-active');

  setTimeout(() => {
    acEl.classList.remove('show');
  }, 2000);
}

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

  if (activeBlocksCount > 0 && placeableBlocksCount === 0) {
    setTimeout(() => {
      playBGM('leaderboard');
      const gameOverModal = document.getElementById('game-over-modal');
      const statsText = document.getElementById('game-over-stats');

      statsText.innerHTML = `
                모드: <strong style="color:#ff00ff;">${gameMode.toUpperCase()}</strong><br>
                최종 점수: <strong style="color:#00ffcc;">${score}</strong> 점<br>
                달성 콤보: <strong style="color:#ffaf7b;">${currentCombo}</strong> Combo
            `;
      gameOverModal.classList.add('active');
    }, 400);
  }
}
