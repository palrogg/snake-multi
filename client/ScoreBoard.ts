import Phaser from "phaser";

// Phaser Text doc:
// https://rexrainbow.github.io/phaser3-rex-notes/docs/site/text/

export class ScoreBoard {
  scores: Score[];
  currentPlayer: string;

  constructor(scene: Phaser.Scene, scores: Score[], currentPlayer: string) {
    const scoreBoardWidth = 200;
    const margin = 20;
    const lineHeight = 20;
    const colWidths = [120, 40];
    const x = scene.sys.game.canvas.width - scoreBoardWidth + margin;

    scores.sort((a: Score, b: Score) => {
      return b.size - a.size;
    });
    scores.forEach((score, index) => {
      scene.make.text({
        x: x,
        y: margin + index * lineHeight,
        text: score.playerName,
        origin: 0,
        style: {
          font: "14px Arial",
          color: "yellow",
          wordWrap: { width: colWidths[0] },
        },
      });
      scene.make.text({
        x: x + margin + colWidths[0],
        y: margin + index * lineHeight,
        text: score.size.toString(),
        origin: { x: 1, y: 0 },
        style: {
          font: "14px Arial",
          color: "yellow",
          wordWrap: { width: colWidths[1] },
        },
      });
    });
  }
}
