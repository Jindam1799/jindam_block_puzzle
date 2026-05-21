* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  user-select: none;
  -webkit-user-select: none;
  touch-action: none;
}
body {
  background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
  font-family: 'Malgun Gothic', sans-serif;
  color: #fff;
  overflow: hidden;
  min-height: 100vh;
  transition: background 0.5s ease;
}

#light-flash-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 999;
  display: none;
}
@keyframes flashLight {
  0% {
    background-color: rgba(255, 255, 255, 0);
  }
  10% {
    background-color: rgba(255, 255, 255, 0.9);
  }
  100% {
    background-color: rgba(255, 255, 255, 0);
  }
}
.flash-active {
  display: block !important;
  animation: flashLight 0.6s ease-out forwards;
}

#start-screen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: #000;
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
  cursor: pointer;
}
.blink-text {
  font-size: 20pt;
  color: #fff;
  text-shadow: 0 0 15px #fff;
  animation: blink 1.5s infinite;
  line-height: 1.5;
}
@keyframes blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}

#lobby-screen,
#ranking-screen {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: rgba(15, 12, 41, 0.95);
  z-index: 200;
  backdrop-filter: blur(10px);
}
.lobby-title {
  font-size: 32pt;
  font-weight: 900;
  color: #00ffcc;
  text-shadow: 0 0 20px #00ffcc;
  margin-bottom: 10px;
  text-align: center;
}
.lobby-subtitle {
  font-size: 14pt;
  color: #ff00ff;
  text-shadow: 0 0 10px #ff00ff;
  margin-bottom: 40px;
}
.mode-buttons {
  display: flex;
  flex-direction: column;
  gap: 15px;
  width: 80%;
  max-width: 320px;
}
.mode-btn {
  padding: 18px;
  border-radius: 12px;
  border: none;
  font-size: 15pt;
  font-weight: bold;
  cursor: pointer;
  color: white;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.5);
  transition: transform 0.1s;
}
.mode-btn span {
  font-size: 10pt;
  font-weight: normal;
  opacity: 0.8;
}
.mode-btn:active {
  transform: scale(0.95);
}
.normal-btn {
  background: linear-gradient(135deg, #00f2fe, #4facfe);
  border: 2px solid #fff;
}
.hell-btn {
  background: linear-gradient(135deg, #ff0844, #ffb199);
  border: 2px solid #fff;
  box-shadow: 0 0 20px rgba(255, 8, 68, 0.6);
}
.rank-btn {
  background: linear-gradient(135deg, #f6d365, #fda085);
  border: 2px solid #fff;
  margin-top: 10px;
  color: #333;
}

.ranking-tabs {
  display: flex;
  width: 90%;
  max-width: 400px;
  margin-bottom: 15px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.2);
}
.tab-btn {
  flex: 1;
  padding: 12px;
  background: rgba(0, 0, 0, 0.5);
  color: #888;
  border: none;
  font-size: 12pt;
  font-weight: bold;
  cursor: pointer;
  transition: 0.3s;
}
.tab-btn.active {
  background: rgba(0, 255, 204, 0.2);
  color: #00ffcc;
  box-shadow: inset 0 -3px 0 #00ffcc;
}
.ranking-list-container {
  width: 90%;
  max-width: 400px;
  height: 50vh;
  overflow-y: auto;
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 10px;
  pointer-events: auto;
  touch-action: pan-y;
}
#ranking-list {
  list-style: none;
  padding: 0;
}
.ranking-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}
.ranking-item:nth-child(1) {
  color: #ffd700;
  font-weight: bold;
  text-shadow: 0 0 10px #ffd700;
  background: rgba(255, 215, 0, 0.1);
}
.ranking-item:nth-child(2) {
  color: #c0c0c0;
  font-weight: bold;
  text-shadow: 0 0 5px #c0c0c0;
}
.ranking-item:nth-child(3) {
  color: #cd7f32;
  font-weight: bold;
  text-shadow: 0 0 5px #cd7f32;
}
.rank-info {
  display: flex;
  flex-direction: column;
  text-align: right;
}
.rank-score {
  font-size: 14pt;
  color: #fff;
}
.rank-combo {
  font-size: 10pt;
  color: #ff00ff;
}

#nickname-input {
  width: 100%;
  padding: 15px;
  margin-bottom: 15px;
  border: 2px solid #00ffcc;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  font-size: 14pt;
  text-align: center;
  outline: none;
}
#nickname-input:focus {
  box-shadow: 0 0 15px rgba(0, 255, 204, 0.5);
}
#nickname-input::placeholder {
  color: #888;
}

#game-container {
  width: 100%;
  max-width: 500px;
  margin: 0 auto;
  padding: 15px;
  height: 100vh;
  display: flex;
  flex-direction: column;
}
@keyframes screenShake {
  0% {
    transform: translate(0, 0) rotate(0deg);
  }
  20% {
    transform: translate(
        calc(-1.5px * var(--shake-int, 1)),
        calc(1.5px * var(--shake-int, 1))
      )
      rotate(calc(-0.5deg * var(--shake-int, 1)));
  }
  40% {
    transform: translate(
        calc(1.5px * var(--shake-int, 1)),
        calc(-1.5px * var(--shake-int, 1))
      )
      rotate(calc(0.5deg * var(--shake-int, 1)));
  }
  60% {
    transform: translate(
        calc(-1.5px * var(--shake-int, 1)),
        calc(-1.5px * var(--shake-int, 1))
      )
      rotate(calc(0deg));
  }
  80% {
    transform: translate(
        calc(1.5px * var(--shake-int, 1)),
        calc(1.5px * var(--shake-int, 1))
      )
      rotate(calc(-0.5deg * var(--shake-int, 1)));
  }
  100% {
    transform: translate(0, 0) rotate(0deg);
  }
}
.shake-active {
  animation: screenShake 0.3s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 20px;
  border-bottom: 2px solid rgba(0, 255, 204, 0.4);
  padding-bottom: 10px;
}
.score-box {
  font-size: 20pt;
  font-weight: 900;
  color: #00ffcc;
  text-shadow: 0 0 10px #00ffcc;
  transition: color 0.3s;
}
.title-box {
  font-size: 11pt;
  font-weight: bold;
  color: #ff00ff;
  text-shadow: 0 0 8px #ff00ff;
}

#board-wrapper {
  width: 100%;
  aspect-ratio: 1;
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(10px);
  border: 2px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 0 20px rgba(0, 255, 204, 0.2);
  border-radius: 12px;
  padding: 6px;
  margin-bottom: 20px;
  transition: all 0.5s ease;
}
#grid-board {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  grid-template-rows: repeat(8, 1fr);
  gap: 4px;
  width: 100%;
  height: 100%;
}
.grid-cell {
  background-color: rgba(0, 0, 0, 0.4);
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: background 0.2s;
}

.color-1 {
  background: linear-gradient(135deg, #00f2fe, #4facfe);
  border: 1px solid #fff;
  box-shadow: inset 0 0 10px rgba(255, 255, 255, 0.8);
}
.color-2 {
  background: linear-gradient(135deg, #b06ab3, #4568dc);
  border: 1px solid #fff;
  box-shadow: inset 0 0 10px rgba(255, 255, 255, 0.8);
}
.color-3 {
  background: linear-gradient(135deg, #43e97b, #38f9d7);
  border: 1px solid #fff;
  box-shadow: inset 0 0 10px rgba(255, 255, 255, 0.8);
}
.color-penalty {
  background: linear-gradient(135deg, #ff0844, #ffb199);
  border: 1px solid #fff;
  box-shadow: inset 0 0 10px rgba(255, 255, 255, 0.8);
}

.cell-obstacle {
  background: linear-gradient(135deg, #430000, #000000);
  border: 2px solid #ff003c;
  border-radius: 6px;
  box-shadow: inset 0 0 15px #ff003c;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #ff003c;
  font-size: 16pt;
  font-weight: 900;
  text-shadow: 0 0 5px #ff003c;
}
.cell-shadow {
  background-color: rgba(0, 255, 204, 0.3) !important;
  border: 2px dashed #00ffcc !important;
  border-radius: 6px;
}

@keyframes explode {
  0% {
    transform: scale(1);
    filter: brightness(1);
  }
  30% {
    transform: scale(1.4);
    filter: brightness(3);
    background: #fff;
    box-shadow:
      0 0 30px #fff,
      0 0 60px #00ffcc,
      inset 0 0 20px #00ffcc;
    z-index: 10;
    border-radius: 20%;
  }
  100% {
    transform: scale(0);
    opacity: 0;
  }
}
.cell-explode {
  animation: explode 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
  position: relative;
  z-index: 10;
}
@keyframes damageShake {
  0%,
  100% {
    transform: translateX(0);
    filter: brightness(1);
  }
  25% {
    transform: translateX(-4px);
    filter: brightness(2.5);
    background: #ff003c;
  }
  50% {
    transform: translateX(4px);
  }
  75% {
    transform: translateX(-4px);
  }
}
.cell-damage {
  animation: damageShake 0.3s ease-out;
  z-index: 10;
  position: relative;
}

#block-dock {
  display: flex;
  justify-content: space-around;
  align-items: center;
  height: 130px;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  flex-shrink: 0;
  transition: all 0.5s ease;
}
.dock-slot {
  width: 30%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}
.preview-matrix {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.preview-row {
  display: flex;
  gap: 2px;
}
.preview-cell {
  width: 22px;
  height: 22px;
  border-radius: 4px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 10pt;
  font-weight: bold;
  color: transparent;
}
#drag-overlay {
  position: absolute;
  pointer-events: none;
  display: none;
  z-index: 99;
  filter: drop-shadow(0 10px 15px rgba(0, 0, 0, 0.5));
}
.drag-block-table {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.drag-row {
  display: flex;
  gap: 3px;
}
.drag-cell {
  width: 40px;
  height: 40px;
  border-radius: 6px;
}

.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 10, 0.5);
  backdrop-filter: blur(3px);
  z-index: 100;
  display: none;
  justify-content: center;
  align-items: center;
}
.modal.active {
  display: flex;
}
.modal-content {
  background: linear-gradient(145deg, #1f1c2c, #928dab);
  border: 2px solid #00ffcc;
  border-radius: 16px;
  width: 85%;
  max-width: 350px;
  padding: 25px 20px;
  text-align: center;
}
.modal-content h3 {
  color: #fff;
  text-shadow: 0 0 8px #fff;
  margin-bottom: 20px;
  font-size: 15pt;
}
#quiz-question {
  font-size: 13pt;
  margin-bottom: 25px;
  line-height: 1.5;
  color: #e0e0e0;
}
.option-btn {
  width: 100%;
  background: linear-gradient(135deg, #3a1c71, #d76d77, #ffaf7b);
  color: #fff;
  border: none;
  padding: 15px;
  margin-bottom: 12px;
  border-radius: 10px;
  font-size: 13pt;
  font-weight: bold;
  cursor: pointer;
}
.option-btn:active {
  transform: scale(0.97);
  filter: brightness(1.2);
}
.feedback {
  margin-top: 15px;
  font-size: 13pt;
  font-weight: bold;
  height: 24px;
}

/* ★ 콤보 & 다중 라인 ボーナス 텍스트 스타일 ★ */
.combo-text {
  position: absolute;
  top: 40%;
  left: 50%;
  transform: translate(-50%, -50%) scale(0);
  font-size: 32pt;
  font-weight: 900;
  font-style: italic;
  color: #ff00ff;
  text-shadow:
    0 0 10px #fff,
    0 0 20px #ff00ff,
    0 0 40px #ff00cc;
  z-index: 150;
  pointer-events: none;
  opacity: 0;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  text-align: center;
}
.combo-text.show {
  transform: translate(-50%, -50%) scale(1.2);
  opacity: 1;
}
.bonus-lines {
  display: block;
  font-size: 18pt;
  color: #00ffcc;
  text-shadow: 0 0 15px #00ffcc;
  margin-bottom: 5px;
}

/* ★ 올 클리어 황금빛 이펙트 ★ */
.all-clear-text {
  position: absolute;
  top: 35%;
  left: 50%;
  transform: translate(-50%, -50%) scale(0);
  font-size: 38pt;
  font-weight: 900;
  font-style: italic;
  color: #ffd700;
  text-shadow:
    0 0 15px #fff,
    0 0 30px #ffd700,
    0 0 50px #ff8c00;
  z-index: 200;
  pointer-events: none;
  opacity: 0;
  transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  text-align: center;
}
.all-clear-text.show {
  transform: translate(-50%, -50%) scale(1.1);
  opacity: 1;
}

body.hell-theme {
  background: linear-gradient(135deg, #2a0000, #4d0000, #1a0000);
}
body.hell-theme header {
  border-bottom: 2px solid rgba(255, 50, 50, 0.4);
}
body.hell-theme .score-box {
  color: #ff3333;
  text-shadow:
    0 0 10px #ff3333,
    0 0 20px #ff0000;
}
body.hell-theme .title-box {
  color: #ffaa00;
  text-shadow: 0 0 8px #ffaa00;
}
body.hell-theme #board-wrapper {
  background: rgba(50, 0, 0, 0.15);
  border: 2px solid rgba(255, 50, 50, 0.3);
  box-shadow:
    0 0 25px rgba(255, 0, 0, 0.4),
    inset 0 0 15px rgba(255, 0, 0, 0.1);
}
body.hell-theme .grid-cell {
  background-color: rgba(40, 0, 0, 0.6);
  border: 1px solid rgba(255, 0, 0, 0.15);
}
body.hell-theme #block-dock {
  background: rgba(40, 0, 0, 0.6);
  border: 1px solid rgba(255, 50, 50, 0.2);
  box-shadow: inset 0 5px 15px rgba(0, 0, 0, 0.9);
}
body.hell-theme .color-1 {
  background: linear-gradient(135deg, #ff4b1f, #ff9068);
  box-shadow: inset 0 0 10px rgba(255, 255, 255, 0.6);
}
body.hell-theme .color-2 {
  background: linear-gradient(135deg, #870000, #190a05);
  box-shadow: inset 0 0 10px rgba(255, 0, 0, 0.8);
}
body.hell-theme .color-3 {
  background: linear-gradient(135deg, #f12711, #f5af19);
  box-shadow: inset 0 0 10px rgba(255, 255, 255, 0.6);
}
body.hell-theme .cell-shadow {
  background-color: rgba(255, 0, 0, 0.25) !important;
  border: 2px dashed #ff3333 !important;
}
body.hell-theme .combo-text {
  color: #ff3300;
  text-shadow:
    0 0 10px #fff,
    0 0 20px #ff0000,
    0 0 40px #ff3300;
}
@keyframes flashLightHell {
  0% {
    background-color: rgba(255, 0, 0, 0);
  }
  10% {
    background-color: rgba(255, 0, 0, 0.7);
  }
  100% {
    background-color: rgba(255, 0, 0, 0);
  }
}
body.hell-theme .flash-active {
  animation: flashLightHell 0.6s ease-out forwards;
}
