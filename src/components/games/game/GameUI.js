const RED = 'oklch(57.7% 0.245 27.325)';
const INK = '#141414';
const MUTED = '#6b6b6b';
const RULE = '#e6e6e6';
const MONO = "'JetBrains Mono', monospace";
const SANS = "'Archivo', sans-serif";

const heading = `margin: 0 0 16px; font-family: ${SANS}; font-weight: 600; font-size: 16px; letter-spacing: 0.08em; color: ${RED};`;
const line = 'margin: 6px 0;';
const prompt = `color: ${MUTED};`;
const label = `font-family: ${MONO}; font-size: 11px; line-height: 22px; letter-spacing: 0.06em; color: ${MUTED};`;
const row = `display: grid; grid-template-columns: 72px minmax(0, 1fr); gap: 16px; padding: 12px 0; border-top: 1px solid ${RULE};`;

function createPanel() {
  const el = document.createElement('div');
  Object.assign(el.style, {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    boxSizing: 'border-box',
    width: 'calc(100% - 32px)',
    maxWidth: '360px',
    padding: '24px',
    background: '#ffffff',
    border: `1px solid ${INK}`,
    color: INK,
    fontFamily: MONO,
    fontSize: '12px',
    lineHeight: '1.5',
    textAlign: 'left',
    textTransform: 'uppercase',
    zIndex: '1000',
  });
  return el;
}

export class GameUI {
  constructor(container) {
    this.container = container;
    this.createInstructions();
    this.createGameOver();
    this.isFirstMove = true;
  }

  createInstructions() {
    this.instructions = createPanel();
    this.instructions.innerHTML = `
      <h1 style="${heading}">ABSTINENCE (˶ˆᗜˆ˵) !?!</h1>
      <div>
        <p style="${line}"><span style="${prompt}">></span> WASD / ARROWS = MOVE</p>
        <p style="${line}"><span style="${prompt}">></span> SPACE = JUMP</p>
        <p style="${line}"><span style="${prompt}">></span> RIGHT CLICK = KICK BALL</p>
        <p style="${line}"><span style="${prompt}">></span> CLICK TO START</p>
      </div>
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); margin-top: 16px; padding-top: 16px; border-top: 1px solid ${RULE}; text-align: center;">
        <div><p style="margin: 0; ${label}">AH</p><p style="margin: 0;">100</p></div>
        <div><p style="margin: 0; ${label}">AHHH</p><p style="margin: 0;">200</p></div>
        <div><p style="margin: 0; ${label}">AHHHH</p><p style="margin: 0;">300</p></div>
      </div>
    `;
    this.container.appendChild(this.instructions);
  }

  createGameOver() {
    this.gameOver = createPanel();
    this.gameOver.style.display = 'none';
    this.container.appendChild(this.gameOver);
  }

  showGameOver(finalScore, highScore) {
    this.gameOver.innerHTML = `
      <h1 style="${heading}">GAME OVER</h1>
      <div style="${row}"><span style="${label}">SCORE</span><span style="font-family: ${SANS}; font-size: 15px; line-height: 22px;">${finalScore}</span></div>
      <div style="${row} border-bottom: 1px solid ${INK};"><span style="${label}">HIGH</span><span style="font-family: ${SANS}; font-size: 15px; line-height: 22px;">${highScore}</span></div>
      <p style="margin: 16px 0 0; font-size: 13px; color: ${RED};">PRESS SPACE</p>
    `;
    this.gameOver.style.display = 'block';
  }

  hideGameOver() {
    this.gameOver.style.display = 'none';
  }

  hideInstructions() {
    this.instructions.style.display = 'none';
  }

  dispose() {
    if (this.instructions && this.instructions.parentNode) {
      this.instructions.parentNode.removeChild(this.instructions);
    }
    if (this.gameOver && this.gameOver.parentNode) {
      this.gameOver.parentNode.removeChild(this.gameOver);
    }
  }
}
