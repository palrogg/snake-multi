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
    bodies: any[]

    constructor(scene: Phaser.Scene, x: number, y: number, direction = 'right') {
        super(scene)

        this.bodies = []

        // TODO: en faire des arguments
        const length = 20;
        const radius = 10;
        const spacing = 2;

        for (let i = 0; i < length; i++) {
            const body = scene.add.circle(x, y, radius, 900);
            // scene.add.existing(this);
            scene.physics.add.existing(body);
            this.add(body)

            this.bodies.push(body)
            x += spacing;
        }

    }
    moveTo(x: number, y: number) {
        // Quel comportement si on peut traverser le bas de l'ecran?
        Phaser.Actions.ShiftPosition(this.bodies, x, y);
    }
}