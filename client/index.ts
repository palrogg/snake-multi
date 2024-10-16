import Phaser from "phaser"
import { Client, Room } from "colyseus.js"
import { Snake } from "./snake"

import greenHead from './assets/img/snake_green_head_32.png';
import greenHeadBlink from './assets/img/snake_green_eyes_32.png';
import yellowHead from './assets/img/snake_yellow_head_32.png';
import yellowHeadBlink from './assets/img/snake_yellow_eyes_32.png';

export class GameScene extends Phaser.Scene {
    mapWidth = 800
    mapHeight = 600
    client = new Client("ws://localhost:2567")
    room: Room;

    // Players
    playerEntities: { [sessionId: string]: any } = {};
    playerTails: { [sessionId: string]: any } = {};

    // Physics
    foodGroup: Phaser.Physics.Arcade.Group
    playerGroup: Phaser.Physics.Arcade.Group


    currentPlayer: Phaser.Types.Physics.Arcade.ImageWithDynamicBody
    currentPlayerTail: Phaser.GameObjects.Group
    remoteRef: Phaser.GameObjects.Rectangle

    // Local input cache
    inputPayload = {
        left: false,
        right: false,
        up: false,
        down: false,
    };

    // Player will be able to trigger server-side collision check
    collisionPayload = {
        snake: false,
        food: false,
    }
    xRequest = 0;
    yRequest = 0;

    cursorKeys: Phaser.Types.Input.Keyboard.CursorKeys;

    preload() {
        this.load.image('green_head', greenHead);
        this.load.image('green_blink', greenHeadBlink);
        this.load.image('yellow_head', yellowHead);
        this.load.image('yellow_blink', yellowHeadBlink);
        this.cursorKeys = this.input.keyboard.createCursorKeys();
    }

    async create() {
        console.log("Joining room...")

        try {
            this.foodGroup = new Phaser.Physics.Arcade.Group(this.physics.world, this)
            this.foodGroup.name = "food"
            this.foodGroup.collisionCategory = 1
            this.playerGroup = new Phaser.Physics.Arcade.Group(this.physics.world, this)
            this.playerGroup.collisionCategory = 1

            this.room = await this.client.joinOrCreate("my_room")

            // When Server sends food location and value, add it to the scene
            this.room.state.foodItems.onAdd((item, key) => {
                const food = this.add.circle(item.x, item.y, 5, 0xf0f0f0)
                this.physics.add.existing(food);
                this.foodGroup.add(food)
            })

            // When Server updates player locations, update scene
            this.room.state.players.onAdd((player, sessionId) => {
                const playerHead = this.physics.add.image(
                    player.x,
                    player.y,
                    (sessionId === this.room.sessionId ? "green_head" : "yellow_head")
                )
                // TODO: use phaser logic (anims)
                setInterval(() => {
                    playerHead.setTexture(sessionId === this.room.sessionId ? "green_blink" : "yellow_blink")
                    setTimeout(() => {
                        playerHead.setTexture(sessionId === this.room.sessionId ? "green_head" : "yellow_head")
                    }, 200)
                }, 5000)
                const playerTail = new Snake(this, player.x, player.y, (sessionId === this.room.sessionId ? 0x41c000 : 0xfff118));

                playerHead.body.onOverlap = true;
                playerHead.body.collisionCategory = 1
                playerHead.depth = 2
                // keep a reference of it on `playerEntities`
                this.playerEntities[sessionId] = playerHead;
                this.playerTails[sessionId] = playerTail;

                if (sessionId === this.room.sessionId) {
                    this.currentPlayer = playerHead;
                    this.currentPlayerTail = playerTail;
                    this.playerGroup.add(this.currentPlayer)

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

            // When Players leave the room, clean scene
            this.room.state.players.onRemove((player, sessionId) => {
                const entity = this.playerEntities[sessionId];
                if (entity) {
                    entity.destroy();
                    delete this.playerEntities[sessionId];
                }
                const entityTail = this.playerTails[sessionId]
                if (entityTail) {
                    entityTail.destroy();
                    delete this.playerTails[sessionId];
                }
            });
            this.physics.add.overlap(this.playerGroup, this.foodGroup)

            this.physics.world.on('overlap', (gameObject1, gameObject2, body1, body2) => {
                console.log('Overlap:', gameObject1, gameObject2)
                console.log(gameObject2.parent, body2.parent, body2.parent === this.foodGroup)
                // Check if object is food
                if (gameObject2.type === 'arc') {
                    console.log('ok we pick the right one')
                    gameObject2.setAlpha(0.1);
                }
                console.log(body2)
            });
        }
        catch (e) {
            console.error(e)
        }
    }

    horizontalWarp(x: number) {
        if (x > this.mapWidth) {
            return 0
        } else if (x < 0) {
            return this.mapWidth
        }
        return x
    }

    verticalWarp(y: number) {
        if (y > this.mapHeight) {
            return 0
        } else if (y < 0) {
            return this.mapHeight
        }
        return y
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
            this.currentPlayer.x = this.horizontalWarp(this.currentPlayer.x + this.xRequest * velocity);
            this.currentPlayerTail.moveTo(this.currentPlayer.x, this.currentPlayer.y)
        } else if (this.yRequest !== 0) {
            this.currentPlayer.y = this.verticalWarp(this.currentPlayer.y + this.yRequest * velocity);
            this.currentPlayerTail.moveTo(this.currentPlayer.x, this.currentPlayer.y)
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

            this.playerTails[sessionId].moveTo(entity.x, entity.y)
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
    backgroundColor: '#0C0D5A',
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
