import Phaser from "phaser";

export interface SnakeInterface extends Phaser.GameObjects.Group {
  moveTo(x: number, y: number): void;
  bodies: any[];
}

export class Snake {
  length: number = 0;
  spacing: number;
  radius: number;
  head: Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
  tail: Phaser.GameObjects.Group;
  bodies: any[];
  isUser: boolean;
  currentScene: Phaser.Scene;
  blinkTimer: any;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    sessionId: string | null,
    user = false,
    length = 20,
    spacing = 2,
    radius = 10
  ) {
    this.bodies = [];
    this.isUser = user;
    this.radius = radius;
    this.spacing = spacing;
    this.currentScene = scene;

    // Create the snake head
    this.head = scene.physics.add
      .image(x, y, user ? "green_head" : "yellow_head")
      .setData("userId", sessionId)
      .setData("category", "head")
      .setDepth(user ? 4 : 2);

    this.head.body.onOverlap = true;
    this.head.body.collisionCategory = 1;

    // Eyes animation
    this.animBlink();

    // Create the snake tail
    this.tail = scene.add.group();
    this.growTo(scene, length, this.spacing, new Phaser.Math.Vector2(x, y));
  }

  animBlink() {
    this.blinkTimer = this.currentScene.time.addEvent({
      delay: 5000,
      callback: () => {
        this.head.setTexture(this.isUser ? "green_blink" : "yellow_blink");
        this.currentScene.time.addEvent({
          delay: 200,
          callback: () => {
            this.head.setTexture(this.isUser ? "green_head" : "yellow_head");
          },
          loop: false,
        });
      },
      loop: true,
    });
  }

  stopBlink() {
    this.currentScene.time.removeEvent(this.blinkTimer);
  }

  animDie() {
    this.stopBlink();
    this.head.setTexture(this.isUser ? "green_xx" : "yellow_xx");
    this.currentScene.tweens.add({
      targets: this.head,
      angle: -120,
      duration: 500,
      ease: "Power2",
      yoyo: false,
      loop: 0,
      onComplete: () => {
        this.currentScene.tweens.add({
          targets: this.bodies,
          alpha: 0,
          duration: 500,
          yoyo: false,
          loop: 0,
          onComplete: () => {
            this.currentScene.tweens.add({
              targets: this.head,
              alpha: 0,
              duration: 500,
              yoyo: false,
              loop: 0,
            });
          },
        });
      },
    });
  }

  moveTo(x: number, y: number) {
    if (this.bodies.length > 0) {
      Phaser.Actions.ShiftPosition(this.bodies, x, y, 1);
    }
  }

  growTo(
    scene: Phaser.Scene,
    targetLength: number,
    spacing: number,
    origin: Phaser.Math.Vector2
  ) {
    const limit = targetLength - this.length;
    for (let i = 0; i < limit; i++) {
      const body = scene.add.circle(
        origin.x + i * spacing,
        origin.y,
        this.radius,
        this.isUser ? 0x41c000 : 0xfff118
      );
      body.depth = this.isUser ? 3 : 1;
      scene.physics.add.existing(body);
      this.tail.add(body);
      this.bodies.push(body);
    }
    this.length = this.bodies.length;
  }
  
  destroy() {
    console.log("Destroy entity!!");
    this.stopBlink();
    this.head.destroy();
    this.bodies.map((body) => {
      body.destroy();
    });
    this.tail.destroy();
  }
}
