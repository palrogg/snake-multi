import Phaser from "phaser";
import { Snake } from "./snake";

// Sprites
import title from "./assets/img/title.png";
import greenHead from "./assets/img/snake_green_head_32.png";
import greenHeadBlink from "./assets/img/snake_green_eyes_32.png";
import greenHeadXX from "./assets/img/snake_green_xx_32.png";
import yellowHead from "./assets/img/snake_yellow_head_32.png";
import yellowHeadBlink from "./assets/img/snake_yellow_eyes_32.png";
import yellowHeadXX from "./assets/img/snake_yellow_xx_32.png";

export class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: "TitleScene" });
  }
  mapWidth = 800;
  mapHeight = 600;
  xRequest = 0;
  yRequest = 1;
  evilSnake: any;
  dumbSnakes = new Map();
  dumbSnakesGroup: Phaser.Physics.Arcade.Group;
  debug = true;
  playAgain = false;

  preload() {
    this.load.image("title", title);
    this.load.image("green_head", greenHead);
    this.load.image("green_blink", greenHeadBlink);
    this.load.image("green_xx", greenHeadXX);
    this.load.image("yellow_head", yellowHead);
    this.load.image("yellow_blink", yellowHeadBlink);
    this.load.image("yellow_xx", yellowHeadXX);
  }

  create(data: { playAgain: boolean }) {
    this.playAgain = data.playAgain;

    // Animated title sprite
    let title = this.add
      .sprite(400, 300, "title")
      .setDepth(10)
      .setAngle(-5)
      .setInteractive();

    this.tweens.add({
      targets: title,
      angle: 10,
      duration: 800,
      ease: "Power2",
      yoyo: true,
      loop: -1,
    });

    const debugCheckbox = this.add // @ts-ignore because checkbox plugin is not typed
      .rexCheckbox(
        this.sys.game.canvas.width * 0.5 - 120,
        this.sys.game.canvas.height * 0.75,
        30,
        30,
        {
          color: 0x005cb2,
          checked: true,
        }
      )
      .setDepth(10);

    this.make.text({
      x: this.sys.game.canvas.width * 0.5,
      y: this.sys.game.canvas.height * 0.75,
      depth: 10,
      text: "Debug: show server sync",
      origin: 0.5,
      style: {
        font: "18px Arial",
      },
    });

    let scene = this;
    const playAgain = this.playAgain;
    console.log('again = ', playAgain)
    title.on("pointerdown", function () {
      scene.scene.start("GameScene", {
        debug: debugCheckbox.checked,
        playAgain: playAgain,
      });
    });

    // Speed up local debug
    if (window.location.hostname === "localhost") {
      // setTimeout(() => {
      //   scene.scene.start("GameScene");
      // });
    }

    this.input.keyboard.on(
      "keydown",
      function (e: any) {
        scene.scene.start("GameScene");
      },
      1000
    );

    // A long green snake who beats waves of “dumb” snakes
    this.evilSnake = new Snake(this, 30, 30, "fakesnake", true, 200);

    // Physics Group for “dumb” snakes
    this.dumbSnakesGroup = new Phaser.Physics.Arcade.Group(
      this.physics.world,
      this
    );

    // First wave
    this.spawnDumbSnakes();

    this.physics.add.overlap(this.evilSnake.head, this.dumbSnakesGroup);
    this.physics.add.overlap(this.evilSnake.tail, this.dumbSnakesGroup);

    this.physics.world.on("overlap", (object1: any, object2: any) => {
      const snakeId = object2.getData("id");
      if (snakeId) {
        this.dumbSnakesGroup.remove(object2);
        const dumbSnake = this.dumbSnakes[snakeId];
        dumbSnake.head.setData("alive", false);
        dumbSnake.animDie();
        this.time.addEvent({
          delay: 2000,
          callback: () => {
            dumbSnake.destroy();
            this.dumbSnakes.delete(snakeId);
          },
          loop: false,
        });
      }
    });
  }

  spawnDumbSnakes() {
    for (let i = 0; i < 8; i++) {
      const snake_id = `fakesnake_${i}`;
      const newSnake = new Snake(this, 500 + i * 20, 100 + i * 50, snake_id);
      newSnake.head.setData("id", snake_id);
      newSnake.head.setData("alive", true);
      this.dumbSnakes[snake_id] = newSnake;
      this.dumbSnakesGroup.add(newSnake.head);
    }
  }

  horizontalWarp(x: number) {
    /**
     * When a snake hits the boundary of the screen,
     * it reappears at the opposite boundary.
     */
    if (x > this.mapWidth) {
      return 0;
    } else if (x < 0) {
      return this.mapWidth;
    }
    return x;
  }

  verticalWarp(y: number) {
    if (y > this.mapHeight) {
      this.spawnDumbSnakes();
      return 0;
    } else if (y < 0) {
      return this.mapHeight;
    }
    return y;
  }
  fixedTick(time: number, delta: number) {
    /**
     * Fixed update function
     */

    const dice = Math.random();
    if (dice < 0.01 && this.evilSnake.head.x < 100) {
      this.xRequest = 1;
      this.yRequest = 0;
      this.time.addEvent({
        delay: 100,
        callback: () => {
          this.xRequest = 0;
          this.yRequest = 1;
        },
        loop: false,
      });
    } else if (dice < 0.02 && this.evilSnake.head.x > 50) {
      this.xRequest = -1;
      this.yRequest = 0;
      this.time.addEvent({
        delay: 100,
        callback: () => {
          this.xRequest = 0;
          this.yRequest = 1;
        },
        loop: false,
      });
    }

    const velocity = 2; // Warning: this value also changes the tail spacing for now!

    if (this.xRequest !== 0) {
      this.evilSnake.head.x = this.horizontalWarp(
        this.evilSnake.head.x + this.xRequest * velocity
      );
      this.evilSnake.moveTo(this.evilSnake.head.x, this.evilSnake.head.y);
    } else if (this.yRequest !== 0) {
      this.evilSnake.head.y = this.verticalWarp(
        this.evilSnake.head.y + this.yRequest * velocity
      );
      this.evilSnake.moveTo(this.evilSnake.head.x, this.evilSnake.head.y);
    }

    for (let snakeId in this.dumbSnakes) {
      const snake = this.dumbSnakes[snakeId];
      if (snake.head.getData("alive")) {
        snake.head.x = this.horizontalWarp((snake.head.x -= velocity));
        snake.moveTo(snake.head.x, snake.head.y);
      }
    }
  }

  elapsedTime = 0;
  fixedTimeStep = 1000 / 60;

  update(time: number, delta: number): void {
    this.elapsedTime += delta;
    while (this.elapsedTime >= this.fixedTimeStep) {
      this.elapsedTime -= this.fixedTimeStep;
      this.fixedTick(time, this.fixedTimeStep);
    }
  }
}
