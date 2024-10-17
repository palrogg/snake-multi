import Phaser from "phaser"

interface Point {
    x: number
    y: number
}

export interface SnakeInterface extends Phaser.GameObjects.Group {
    moveTo(x: number, y: number): void
    bodies: any[]
    physicsGroup: Phaser.Physics.Arcade.Group
}

export class Snake extends Phaser.GameObjects.Group implements SnakeInterface {
    x: number
    y: number
    length = 20
    bodies: any[]
    public physicsGroup: Phaser.Physics.Arcade.Group

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
        // this.physicsGroup = scene.physics.add.group(this.bodies)
    }

    public moveTo(x: number, y: number) {
        // function logX(bodies){
        //     let output = ''
        //     for(let body of bodies){
        //         output += `${body.x},`
        //     }
        //     console.log(output)
        // }
        // console.log('Before:', logX(this.bodies))
        Phaser.Actions.ShiftPosition(this.bodies, x, y, 1);
    }

    growBy(length: number) {
        // TODO
    }
}