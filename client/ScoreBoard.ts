import Phaser from "phaser";

// Phaser Text doc:
// https://rexrainbow.github.io/phaser3-rex-notes/docs/site/text/

export class ScoreBoard {
  scene: Phaser.Scene;
  currentPlayer: string;
  scores: Score[] = [];
  baseTailSize = 20;
  lineHeight = 20;
  margin = 20;
  leftColTexts: {} = {};
  rightColTexts: {} = {};

  constructor(scene: Phaser.Scene, currentPlayer: string) {
    this.scene = scene;
    this.currentPlayer = currentPlayer;
    console.log("Score Board created. Current user is", currentPlayer);
  }

  drawScore(index: number) {
    const scoreBoardWidth = 200;
    const colWidths = [120, 40];
    const x = this.scene.sys.game.canvas.width - scoreBoardWidth + this.margin;

    const score = this.scores[index];
    this.leftColTexts[score.playerId] = this.scene.make.text({
      x: x,
      y: this.margin + index * this.lineHeight,
      depth: 10,
      text: this.scores[index].playerName,
      origin: 0,
      style: {
        font: "14px Arial",
        color: score.playerId === this.currentPlayer ? "#41c000" : "#FFF118",
        wordWrap: { width: colWidths[0] },
      },
    });
    this.rightColTexts[score.playerId] = this.scene.make.text({
      x: x + this.margin + colWidths[0],
      y: this.margin + index * this.lineHeight,
      depth: 10,
      text: this.scores[index].size.toString(),
      origin: { x: 1, y: 0 },
      style: {
        font: "14px Arial",
        color: score.playerId === this.currentPlayer ? "#41c000" : "#FFF118",
        wordWrap: { width: colWidths[1] },
      },
    });
  }

  sortPlayers(force = false) {
    console.log("Scores before", this.scores);
    const sorted = [...this.scores].sort((a: Score, b: Score) => {
      return b.size - a.size;
    });
    sorted.forEach((value, index) => {
      if (force === true || this.scores[index].playerId !== value.playerId) {
        this.scene.tweens.add({
          targets: [
            this.leftColTexts[value.playerId],
            this.rightColTexts[value.playerId],
          ],
          y: this.margin + index * this.lineHeight,
          duration: 200,
          ease: "Power2",
          yoyo: false,
          loop: 0,
        });
      }
    });
    console.log("Scores after", sorted);
  }

  addPlayer(player: any, sessionId: string) {
    console.log("Add player", player.name);
    this.scores.push({
      playerName: player.name,
      playerId: sessionId,
      size: player.tailSize - this.baseTailSize,
      kills: player.kills,
    });
    this.drawScore(this.scores.length - 1);
  }

  removePlayer(sessionId: string) {
    // Remove the line and move lines below with a tween
    const playerIndex = this.scores.findIndex(
      (score) => score.playerId === sessionId
    );
    this.scores = this.scores.filter((item) => {
      return item.playerId !== sessionId;
    });
    this.leftColTexts[sessionId].destroy();
    this.rightColTexts[sessionId].destroy();
    this.sortPlayers(true);
  }

  updateScore(player: any, sessionId: string) {
    console.log("Update!");
    const playerIndex = this.scores.findIndex(
      (score) => score.playerId === sessionId
    );
    if (playerIndex > -1) {
      this.scores[playerIndex].size = player.tailSize - this.baseTailSize;

      // Update score text
      this.rightColTexts[this.scores[playerIndex].playerId].text =
        this.scores[playerIndex].size;
    }
    // Check if order will change
    // Animate if players go up or down
    this.sortPlayers();
  }
}

// for (let playerId in players) {
//   console.log(playerId);
// }

// scores.sort((a: Score, b: Score) => {
//   return b.size - a.size;
// });
// scores.forEach((score, index) => {
//   scene.make.text({
//     x: x,
//     y: this.margin + index * this.lineHeight,
//     text: score.playerName,
//     origin: 0,
//     style: {
//       font: "14px Arial",
//       color: "yellow",
//       wordWrap: { width: colWidths[0] },
//     },
//   });
//   scene.make.text({
//     x: x + this.margin + colWidths[0],
//     y: this.margin + index * this.lineHeight,
//     text: score.size.toString(),
//     origin: { x: 1, y: 0 },
//     style: {
//       font: "14px Arial",
//       color: "yellow",
//       wordWrap: { width: colWidths[1] },
//     },
//   });
// });
