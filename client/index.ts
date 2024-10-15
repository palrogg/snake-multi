import Phaser from "phaser"
import { Client, Room } from "colyseus.js"
import { Snake } from "./snake"

export class GameScene extends Phaser.Scene {

    client = new Client("ws://localhost:2567")
    room: Room;
    // we will assign each player visual representation here
    // by their `sessionId`
    playerEntities: { [sessionId: string]: any } = {};

    currentPlayer: Phaser.Types.Physics.Arcade.ImageWithDynamicBody
    currentPlayerSnake: Phaser.GameObjects.Group
    remoteRef: Phaser.GameObjects.Rectangle

    // local input cache
    inputPayload = {
        left: false,
        right: false,
        up: false,
        down: false,
    };
    xRequest = 0;
    yRequest = 0;

    cursorKeys: Phaser.Types.Input.Keyboard.CursorKeys;

    preload() {
        this.load.image('head', 'assets/head.png');
        this.cursorKeys = this.input.keyboard.createCursorKeys();
    }

    async create() {
        console.log("Joining room...")

        try {
            this.room = await this.client.joinOrCreate("my_room")
            this.room.state.players.onAdd((player, sessionId) => {
                const playerSnake = new Snake(this, player.x, player.y);
                const playerHead = this.physics.add.image(player.x, player.y, "head")
                // playerHead.alpha = 0;
                // keep a reference of it on `playerEntities`
                this.playerEntities[sessionId] = playerHead;

                if (sessionId === this.room.sessionId) {
                    this.currentPlayer = playerHead;
                    this.currentPlayerSnake = playerSnake;

                    // remoteRef is being used for debug only
                    this.remoteRef = this.add.rectangle(0, 0, playerHead.width, playerHead.height);
                    this.remoteRef.setStrokeStyle(1, 0xff0000);
                    player.onChange(() => {
                        this.remoteRef.x = player.x;
                        this.remoteRef.y = player.y;
                    });
                } else {
                    // remote players
                    player.onChange(() => {
                        playerHead.setData('serverX', player.x);
                        playerHead.setData('serverY', player.y);
                    });
                }
            })
            this.room.state.players.onRemove((player, sessionId) => {
                const entity = this.playerEntities[sessionId];
                if (entity) {
                    // destroy entity
                    entity.destroy();

                    // clear local reference
                    delete this.playerEntities[sessionId];
                }
            });
            console.log("SUCCESS")
        }
        catch (e) {
            console.error(e)
        }
    }

    fixedTick(time: number, delta: number) {
        const velocity = 2;
        // send input to the server
        this.inputPayload.left = this.cursorKeys.left.isDown;
        this.inputPayload.right = this.cursorKeys.right.isDown;
        this.inputPayload.up = this.cursorKeys.up.isDown;
        this.inputPayload.down = this.cursorKeys.down.isDown;
        this.room.send(0, this.inputPayload);


        if (this.inputPayload.left) {
            this.yRequest = 0;
            this.xRequest = -1;
        } else if (this.inputPayload.right) {
            this.yRequest = 0;
            this.xRequest = 1;
        } else if (this.inputPayload.up) {
            this.xRequest = 0;
            this.yRequest = -1;
        } else if (this.inputPayload.down) {
            this.xRequest = 0;
            this.yRequest = 1;
        }

        // Server must handle shiftPosition and collision detection
        if (this.xRequest !== 0) {
            this.currentPlayer.x += this.xRequest * velocity;
            this.currentPlayerSnake.moveTo(this.currentPlayer.x, this.currentPlayer.y)
        } else if (this.yRequest !== 0) {
            this.currentPlayer.y += this.yRequest * velocity;
            this.currentPlayerSnake.moveTo(this.currentPlayer.x, this.currentPlayer.y)
        }


        for (let sessionId in this.playerEntities) {
            // do not interpolate the current player
            if (sessionId === this.room.sessionId) {
                continue;
            }
            const entity = this.playerEntities[sessionId];
            const { serverX, serverY } = entity.data.values;

            // 3rd argument: interpolation speed
            entity.x = Phaser.Math.Linear(entity.x, serverX, 0.2);
            entity.y = Phaser.Math.Linear(entity.y, serverY, 0.2);

            
        }
    }

    elapsedTime = 0;
    fixedTimeStep = 1000 / 60;

    update(time: number, delta: number): void {
        // skip loop if not connected yet.
        if (!this.currentPlayer) { return; }

        this.elapsedTime += delta;
        while (this.elapsedTime >= this.fixedTimeStep) {
            this.elapsedTime -= this.fixedTimeStep;
            this.fixedTick(time, this.fixedTimeStep);
        }
    }
}


const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: '#b6d53c',
    parent: 'phaser-example',
    physics: {
        default: "arcade", arcade: {
            debug: false,
        }
    },
    pixelArt: true,
    scene: [GameScene],
};

// instantiate the game
const game = new Phaser.Game(config);
