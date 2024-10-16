import Phaser from "phaser"

interface Point {
    x: number
    y: number
}

interface SnakeInterface extends Phaser.GameObjects.Group {
    moveTo(x: number, y: number): void
}

export class Snake extends Phaser.GameObjects.Group implements SnakeInterface {
    x: number
    y: number
    length = 20
    bodies: any[]

    constructor(scene: Phaser.Scene, x: number, y: number, user = false, direction = 'right') {
        super(scene)
        this.bodies = []
        
        const radius = 10;
        const spacing = 2;

        for (let i = 0; i < this.length; i++) {
            const body = scene.add.circle(x, y, radius, user ? 0x41c000 : 0xfff118);
            body.depth = user ? 3 : 1;
            scene.physics.add.existing(body);
            this.add(body)
            this.bodies.push(body)
            x += spacing;
        }
    }

    moveTo(x: number, y: number) {
        Phaser.Actions.ShiftPosition(this.bodies, x, y);
    }

    growBy(length: number) {
        // TODO
    }
}