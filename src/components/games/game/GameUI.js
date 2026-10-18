export class GameUI {
  constructor() {
    this.createInstructions();
    this.createGameOver();
    this.createScoreboard();
    this.isFirstMove = true;
  }

  createInstructions() {
    this.instructions = document.createElement('div');
    this.instructions.style.position = 'absolute';
    this.instructions.style.top = '50%';
    this.instructions.style.left = '50%';
    this.instructions.style.transform = 'translate(-50%, -50%)';
    this.instructions.style.color = '#ffffff';
    this.instructions.style.fontSize = '20px';
    this.instructions.style.textAlign = 'center';
    this.instructions.style.fontFamily = 'monospace';
    this.instructions.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    this.instructions.style.padding = '20px';
    this.instructions.style.border = '2px solid #ff0000';
    this.instructions.style.textTransform = 'uppercase';
    this.instructions.style.letterSpacing = '2px';
    this.instructions.style.zIndex = '1000';
    this.instructions.style.textShadow = '2px 2px 4px rgba(255, 0, 0, 0.5)';
    this.instructions.innerHTML = `
      <h1 style="color: #ff0000; margin-bottom: 20px; font-size: 32px; font-family: monospace;">ABSTINENCE (˶ˆᗜˆ˵) !?!</h1>
      <div style="margin-bottom: 20px;">
        <p style="margin: 10px 0;"><span style="color: #ff0000;">></span> WASD / ARROWS = MOVE</p>
        <p style="margin: 10px 0;"><span style="color: #ff0000;">></span> SPACE = JUMP</p>
        <p style="margin: 10px 0;"><span style="color: #ff0000;">></span> RIGHT CLICK = KICK BALL</p>
        <p style="margin: 10px 0;"><span style="color: #ff0000;">></span> CLICK TO START</p>
      </div>
      <div style="margin-top: 20px; border-top: 1px solid #ff0000; padding-top: 20px;">
        <div style="display: flex; justify-content: space-around; color: #ff0000;">
          <div>
            <p>AH</p>
            <p>100</p>
          </div>
          <div>
            <p>AHHH</p>
            <p>200</p>
          </div>
          <div>
            <p>AHHHH</p>
            <p>300</p>
          </div>
        </div>
      </div>
    `;
    const gameContainer = document.querySelector('#game-container');
    if (gameContainer) {
      gameContainer.appendChild(this.instructions);
    } else {
      document.body.appendChild(this.instructions);
    }
  }

  createGameOver() {
    this.gameOver = document.createElement('div');
    this.gameOver.style.position = 'absolute';
    this.gameOver.style.top = '50%';
    this.gameOver.style.left = '50%';
    this.gameOver.style.transform = 'translate(-50%, -50%)';
    this.gameOver.style.color = '#ff0000';
    this.gameOver.style.fontSize = '40px';
    this.gameOver.style.textAlign = 'center';
    this.gameOver.style.fontFamily = 'monospace';
    this.gameOver.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    this.gameOver.style.padding = '30px';
    this.gameOver.style.border = '2px solid #ff0000';
    this.gameOver.style.display = 'none';
    this.gameOver.style.zIndex = '1000';
    this.gameOver.style.textTransform = 'uppercase';
    this.gameOver.style.letterSpacing = '4px';
    const gameContainer = document.querySelector('#game-container');
    if (gameContainer) {
      gameContainer.appendChild(this.gameOver);
    } else {
      document.body.appendChild(this.gameOver);
    }
  }

  createScoreboard() {
    this.scoreboard = document.createElement('div');
    this.scoreboard.style.position = 'absolute';
    this.scoreboard.style.top = '20px';
    this.scoreboard.style.right = '20px';
    this.scoreboard.style.color = '#ff0000';
    this.scoreboard.style.fontSize = '24px';
    this.scoreboard.style.fontFamily = 'monospace';
    this.scoreboard.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    this.scoreboard.style.padding = '10px 15px';
    this.scoreboard.style.border = '2px solid #ff0000';
    this.scoreboard.style.zIndex = '1000';
    this.scoreboard.style.textTransform = 'uppercase';
    this.scoreboard.style.letterSpacing = '2px';
    this.updateScore(0, 0);
    const gameContainer = document.querySelector('#game-container');
    if (gameContainer) {
      gameContainer.appendChild(this.scoreboard);
    } else {
      document.body.appendChild(this.scoreboard);
    }
  }

  updateScore(currentScore, highScore) {
    this.scoreboard.innerHTML = `
      <div style="margin-bottom: 5px;">
        SCORE: <span style="color: #ffffff;">${currentScore}</span>
      </div>
      <div>
        HIGH: <span style="color: #ffffff;">${highScore}</span>
      </div>
    `;
  }

  showGameOver(finalScore, highScore) {
    this.gameOver.innerHTML = `
      <h1 style="color: #ff0000; margin-bottom: 30px; font-size: 48px; text-shadow: 4px 4px 0px #000;">GAME OVER</h1>
      <div style="margin-bottom: 20px;">
        <p style="color: #ffffff; font-size: 28px;">SCORE: ${finalScore}</p>
        <p style="color: #ffffff; font-size: 28px;">HIGH: ${highScore}</p>
      </div>
      <p style="color: #ff0000; font-size: 24px; margin-top: 30px;">
        PRESS SPACE
      </p>
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
    if (this.scoreboard && this.scoreboard.parentNode) {
      this.scoreboard.parentNode.removeChild(this.scoreboard);
    }
  }
}