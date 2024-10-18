import Phaser from "phaser";

export interface SnakeInterface extends Phaser.GameObjects.Group {
  moveTo(x: number, y: number): void;
  bodies: any[];
}

export class Snake extends Phaser.GameObjects.Group implements SnakeInterface {
  length: number = 0;
  spacing: number;
  radius: number;
  bodies: any[];
  isUser: boolean;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    user = false,
    length = 20,
    spacing = 2,
    radius = 10
  ) {
    super(scene);
    this.bodies = [];
    this.isUser = user;
    this.radius = radius;
    this.spacing = spacing;
    this.growTo(scene, length, new Phaser.Math.Vector2(x, y));
  }

  moveTo(x: number, y: number) {
    if (this.bodies.length > 0) {
      Phaser.Actions.ShiftPosition(this.bodies, x, y, 1);
    }
  }

  growTo(
    scene: Phaser.Scene,
    targetLength: number,
    origin: Phaser.Math.Vector2
  ) {
    const limit = targetLength - this.length;
    for (let i = 0; i < limit; i++) {
      const body = scene.add.circle(
        origin.x + i * this.spacing,
        origin.y,
        this.radius,
        this.isUser ? 0x41c000 : 0xfff118
      );
      body.depth = this.isUser ? 3 : 1;
      scene.physics.add.existing(body);
      this.add(body);
      this.bodies.push(body);
    }
    this.length = this.bodies.length;
  }
}
