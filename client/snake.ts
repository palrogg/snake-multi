import Phaser from "phaser";

export class Snake {
  length: number = 0;
  spacing: number;
  radius: number;
  head: Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
  tail: Phaser.GameObjects.Group;
  bodies: any[];
  userId: string;
  isUser: boolean;
  currentScene: Phaser.Scene;
  blinkTimer: any;
  killRequested = false;
  showDebug = false;
  debugHead: any;
  debugBodies: any[];
  maxTailSize = 500;

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
    this.userId = sessionId;

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
    origin: Phaser.Math.Vector2,
    physicsGroup: Phaser.Physics.Arcade.Group | null = null
  ) {
    const limit =
      targetLength < this.maxTailSize
        ? targetLength - this.length
        : this.maxTailSize - this.length;

    for (let i = 0; i < limit; i++) {
      const body = scene.add.circle(
        origin.x + i * spacing,
        origin.y,
        this.radius,
        this.isUser ? 0x41c000 : 0xfff118
      );
      body.depth = this.isUser ? 3 : 1;
      body.setData("category", "tail");
      body.setData("userId", this.userId);
      scene.physics.add.existing(body);
      this.tail.add(body);
      this.bodies.push(body);
      if (physicsGroup) {
        physicsGroup.add(body);
      }
    }
    this.length = this.bodies.length;
  }

  markForKill() {
    this.killRequested = true;
  }

  createDebugRectangles(circles: Circle[]) {
    /**
     * Create rectangles to show server-side
     * player position and tail
     */
    this.showDebug = true;
    this.debugHead = this.currentScene.add
      .rectangle(0, 0, this.head.width, this.head.height)
      .setStrokeStyle(1, 0xff0000);

    this.debugBodies = circles.map((i) => {
      const rect = this.currentScene.add.rectangle(i.x, i.y, 4, 4, 0xff0000);
      rect.depth = 5;
      return rect;
    });
  }

  updateDebugRectangles(x: number, y: number, circles: Circle[]) {
    /**
     * Update rectangles which show server-side
     * player position
     */

    this.debugHead.x = x;
    this.debugHead.y = y;

    // Add new debug rects if needed
    if (circles.length > this.debugBodies.length) {
      const newRects = circles.slice(this.debugBodies.length).map((i) => {
        const rect = this.currentScene.add.rectangle(i.x, i.y, 4, 4, 0xff0000);
        rect.depth = 5;
        return rect;
      });
      this.debugBodies = this.debugBodies.concat(newRects);
    }
    circles.map((circle: Circle, i: number) => {
      this.debugBodies[i].x = circle.x;
      this.debugBodies[i].y = circle.y;
    });
  }

  destroy() {
    console.log("Destroy entity!!");
    this.stopBlink();
    this.head.destroy();
    this.bodies.map((body) => {
      body.destroy();
    });
    this.tail.destroy();
    this.debugHead.destroy();
    this.debugBodies.map((c) => c.destroy());
  }
}
