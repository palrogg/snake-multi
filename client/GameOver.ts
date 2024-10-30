import { Scene } from "phaser";

export class GameOver extends Scene {
  camera: Phaser.Cameras.Scene2D.Camera;
  background: Phaser.GameObjects.Image;
  gameOverText: Phaser.GameObjects.Text;

  constructor() {
    super("GameOver");
  }

  create() {
    console.log("create gameover scene");
    this.camera = this.cameras.main;
    this.camera.setBackgroundColor(0xd40000);

    this.gameOverText = this.add
      .text(
        this.sys.game.canvas.width * 0.5,
        this.sys.game.canvas.height * 0.5,
        "Game Over",
        {
          fontFamily: "Arial Black",
          fontSize: 64,
          color: "#ffffff",
          stroke: "#000000",
          strokeThickness: 18,
          align: "center",
        }
      )
      .setOrigin(0.5)
      .setDepth(10);

    this.gameOverText = this.add
      .text(
        this.sys.game.canvas.width * 0.5,
        this.sys.game.canvas.height * 0.6,
        "F5 to play again",
        {
          fontFamily: "Arial Black",
          fontSize: 30,
          color: "#ffffff",
          stroke: "#000000",
          strokeThickness: 5,
          align: "center",
        }
      )
      .setOrigin(0.5)
      .setDepth(10);

    // Not ready yet
    // this.input.keyboard.on("keydown", () =>
    //   this.scene.start("TitleScene", { playAgain: true })
    // );
  }
}
