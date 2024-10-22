import Phaser from "phaser";
import { Client, Room } from "colyseus.js";
import { Snake, SnakeInterface } from "./snake";

// Sprites
import greenHead from "./assets/img/snake_green_head_32.png";
import greenHeadBlink from "./assets/img/snake_green_eyes_32.png";
import greenHeadXX from "./assets/img/snake_green_xx_32.png";
import yellowHead from "./assets/img/snake_yellow_head_32.png";
import yellowHeadBlink from "./assets/img/snake_yellow_eyes_32.png";
import yellowHeadXX from "./assets/img/snake_yellow_xx_32.png";

export class GameScene extends Phaser.Scene {
  mapWidth = 800;
  mapHeight = 600;
  client = new Client(
    window.location.hostname === "localhost"
      ? "ws://localhost:2567"
      : "https://fr-cdg-226fc197.colyseus.cloud"
  );
  room: Room;
  deadPlayers: string[] = [];

  // Players
  playerEntities: { [sessionId: string]: any } = {};
  playerTails: { [sessionId: string]: any } = {};

  // Physics
  foodGroup: Phaser.Physics.Arcade.Group;
  userGroup: Phaser.Physics.Arcade.Group;
  enemyPlayersGroup: Phaser.Physics.Arcade.Group;

  currentPlayer: Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
  currentPlayerTail: SnakeInterface;
  remoteRef: Phaser.GameObjects.Rectangle;
  debugRects: Phaser.GameObjects.Rectangle[];

  // Local input cache
  inputPayload = {
    left: false,
    right: false,
    up: false,
    down: false,
    eatRequest: null,
    killRequest: null,
  };

  // Player will be able to trigger server-side collision check
  eatRequest: string | null = null;
  killRequest: string | null = null;
  xRequest = -1;
  yRequest = 0;
  isUserAlive = true;

  cursorKeys: Phaser.Types.Input.Keyboard.CursorKeys;

  preload() {
    this.load.image("green_head", greenHead);
    this.load.image("green_blink", greenHeadBlink);
    this.load.image("green_xx", greenHeadXX);
    this.load.image("yellow_head", yellowHead);
    this.load.image("yellow_blink", yellowHeadBlink);
    this.load.image("yellow_xx", yellowHeadXX);
    this.cursorKeys = this.input.keyboard.createCursorKeys();
  }

  async create() {
    console.log("Joining room...");

    try {
      // Physics group for edible stuff
      this.foodGroup = new Phaser.Physics.Arcade.Group(
        this.physics.world,
        this
      );

      // Physics group for current user
      this.userGroup = new Phaser.Physics.Arcade.Group(
        this.physics.world,
        this
      );

      // Physics group for other players
      this.enemyPlayersGroup = new Phaser.Physics.Arcade.Group(
        this.physics.world,
        this
      );

      this.room = await this.client.joinOrCreate("my_room");

      // When Server sends food location and value, add it to the scene
      this.room.state.foodItems.onAdd((item: Food, key: string) => {
        // console.log(item, item.kind);
        const color = item.kind === "player-meat" ? 0xfff118 : 0xf0f0f0;
        const food = this.add.circle(item.x, item.y, item.value, color);
        food.name = key;
        this.physics.add.existing(food);
        this.foodGroup.add(food);
      });

      // When Server updates player locations, update scene
      this.room.state.players.onAdd((player, sessionId) => {
        const playerHead = this.physics.add.image(
          player.x,
          player.y,
          sessionId === this.room.sessionId ? "green_head" : "yellow_head"
        );
        // TODO: use phaser logic (anims)
        setInterval(() => {
          playerHead.setTexture(
            sessionId === this.room.sessionId ? "green_blink" : "yellow_blink"
          );
          setTimeout(() => {
            playerHead.setTexture(
              sessionId === this.room.sessionId ? "green_head" : "yellow_head"
            );
          }, 200);
        }, 5000);
        const playerTail = new Snake(
          this,
          player.x,
          player.y,
          sessionId === this.room.sessionId
        );

        playerHead.body.onOverlap = true;
        playerHead.body.collisionCategory = 1;
        playerHead.depth = 2;
        // keep a reference of it on `playerEntities`
        this.playerEntities[sessionId] = playerHead;
        this.playerTails[sessionId] = playerTail;

        player.onChange(() => {
          // if(this.inputPayload.down){
          //   console.log(player.circles);
          // }
          playerHead.setData("serverX", player.x);
          playerHead.setData("serverY", player.y);
          playerHead.setData("alive", player.alive);
          playerHead.setData("tailSize", player.tailSize);
        });

        if (sessionId === this.room.sessionId) {
          playerHead.depth = 4;
          playerHead.name = "User Head";
          playerTail.name = "User Tail";
          playerTail.bodies.map((body) => {
            body.name = "User TailBody " + sessionId;
            this.userGroup.add(body);
          });
          this.currentPlayer = playerHead;
          this.currentPlayerTail = playerTail;
          this.userGroup.add(this.currentPlayer);

          // Show current server position for debug
          this.remoteRef = this.add.rectangle(
            0,
            0,
            playerHead.width,
            playerHead.height
          );
          this.remoteRef.setStrokeStyle(1, 0xff0000);
          player.onChange(() => {
            this.remoteRef.x = player.x;
            this.remoteRef.y = player.y;
          });
          this.debugRects = player.circles.map((i) => {
            const rect = this.add.rectangle(i.x, i.y, 4, 4, 0xff0000);
            rect.depth = 5;
            return rect
          });
          player.onChange(() => {
            player.circles.map((circle: Circle, i: number) => {
              this.debugRects[i].x = circle.x
              this.debugRects[i].y = circle.y
            })
          });
        } else {
          // remote players
          playerHead.name = "Enemy Head " + sessionId;
          playerTail.name = "Enemy Tail " + sessionId;
          this.enemyPlayersGroup.add(playerHead);
          playerTail.bodies.map((body) => {
            body.name = "Enemy TailBody " + sessionId;
            this.enemyPlayersGroup.add(body);
          });
        }
      });
      

      // When Players leave the room, clean scene
      this.room.state.players.onRemove((player, sessionId) => {
        const entity = this.playerEntities[sessionId];
        if (entity) {
          entity.destroy();
          delete this.playerEntities[sessionId];
        }
        const entityTail = this.playerTails[sessionId];
        if (entityTail) {
          entityTail.bodies.map((body) => {
            body.destroy();
          });
          delete this.playerTails[sessionId];
        }
      });
      this.room.state.foodItems.onRemove((item, key) => {
        console.log("Remove food! Key:", key);
      });
      this.physics.add.overlap(this.userGroup, this.foodGroup);
      this.physics.add.overlap(this.userGroup, this.enemyPlayersGroup);
      console.log('...')

      this.physics.world.on("overlap", (object1, object2, body1, body2) => {
        console.log(`Overlap: “${object1.name}” vs “${object2.name}”`);
        // TODO: Check if object is food: use group / collision mask / ...

        if (object2.name.substring(0, 4) === "food") {
          // Food object
          this.eatRequest = object2.name;
          object2.setAlpha(0);
          // Remove object from its physics group, so
          // the overlap won't be triggered anymore
          this.foodGroup.remove(object2);
        } else {
          // “Good” Kill: only in following case
          // Overlap: “User TailBody ZvqQvrtow” vs “Enemy Head oaAYhkXZ7”
          if (
            object1.name.substring(0, 9) === "User Tail" &&
            object2.name.substring(0, 10) === "Enemy Head"
          ) {
            this.killRequest = object2.name.split(" ")[2];
            this.enemyPlayersGroup.remove(object2);
          } else if (
            object1.name.substring(0, 9) === "User Head" &&
            object2.name.substring(0, 10) === "Enemy Head"
          ) {
            // Both will die
            this.killRequest = object2.name.split(" ")[2];
            this.enemyPlayersGroup.remove(object2);
          }
          this.enemyPlayersGroup.remove(object2);
        }

        // TODO: send "validate overlap" input to server; remove food
      });
    } catch (e) {
      console.error(e);
    }
  }

  interpolateIfClose(value: number, serverValue: number) {
    /**
     * Returns an interpolation, unless the player is currently
     * warping from one bound to the other.
     */
    if (Math.abs(serverValue - value) < 300) {
      return Phaser.Math.Linear(value, serverValue, 0.2);
    } else {
      return serverValue;
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
    const velocity = 2; // Warning: this value also changes the tail spacing for now!
    // send input to the server

    if (this.isUserAlive) {
      this.inputPayload.left = this.cursorKeys.left.isDown;
      this.inputPayload.right = this.cursorKeys.right.isDown;
      this.inputPayload.up = this.cursorKeys.up.isDown;
      this.inputPayload.down = this.cursorKeys.down.isDown;
      if (this.eatRequest !== null) {
        console.log("We send an “eatRequest” for", this.eatRequest);
        this.inputPayload.eatRequest = this.eatRequest;
        this.eatRequest = null;
      }
      if (this.killRequest !== null) {
        console.log("We send a KILL REQUEST for", this.killRequest);
        this.inputPayload.killRequest = this.killRequest;
        this.killRequest = null;
      }
      this.room.send(0, this.inputPayload);
      this.inputPayload.eatRequest = null;
      this.inputPayload.killRequest = null;
    }

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
      this.currentPlayer.x = this.horizontalWarp(
        this.currentPlayer.x + this.xRequest * velocity
      );
      this.currentPlayerTail.moveTo(this.currentPlayer.x, this.currentPlayer.y);
    } else if (this.yRequest !== 0) {
      this.currentPlayer.y = this.verticalWarp(
        this.currentPlayer.y + this.yRequest * velocity
      );
      this.currentPlayerTail.moveTo(this.currentPlayer.x, this.currentPlayer.y);
    }

    for (let sessionId in this.playerEntities) {
      const entity = this.playerEntities[sessionId];
      const entityTail = this.playerTails[sessionId];
      const { serverX, serverY, alive, tailSize } = entity.data.values;

      if (alive !== true) {
        // Trigger death animations only once
        if (!this.deadPlayers.includes(sessionId)) {
          // If current user
          if (sessionId === this.room.sessionId) {
            this.isUserAlive = false;
            entity.setTexture("green_xx");
            this.xRequest = 0;
            this.yRequest = 0;
          } else {
            entity.setTexture("yellow_xx");
          }
          this.tweens.add({
            targets: entity,
            angle: -120,
            duration: 500,
            ease: "Power2",
            yoyo: false,
            loop: 0,
            onComplete: () => {
              this.tweens.add({
                targets: entityTail.bodies,
                alpha: 0,
                duration: 1000,
                yoyo: false,
                loop: 0,
                onComplete: () => {
                  if (sessionId === this.room.sessionId) {
                    const text = this.add.text(
                      400,
                      300,
                      "~RERFRESH\nto play again~",
                      { align: "center" }
                    );
                    text.setOrigin(0.5, 0.5);
                    text.setResolution(window.devicePixelRatio);
                    text.setFontFamily("Arial");
                    text.setFontStyle("bold");
                    text.setFontSize(100);
                    text.preFX.setPadding(32);
                    const fx = text.preFX.addShadow(
                      0,
                      0,
                      0.06,
                      0.75,
                      0x000000,
                      4,
                      0.8
                    );
                  }
                  this.tweens.add({
                    targets: entity,
                    alpha: 0,
                    duration: 1000,
                    yoyo: false,
                    loop: 0,
                  });
                },
              });
            },
          });
        }
        this.deadPlayers.push(sessionId);
        continue;
      }

      // Make snake grow visually if it ate food,
      // according to server
      if (tailSize > entityTail.length) {
        entityTail.growTo(
          this,
          tailSize,
          0,
          new Phaser.Math.Vector2(
            entityTail.bodies[entityTail.bodies.length - 1].x,
            entityTail.bodies[entityTail.bodies.length - 1].y
          )
        );
      }

      // do not interpolate the current player,
      // unless necessary
      if (sessionId === this.room.sessionId) {
        const tolerance = 5;
        if (Math.abs(entity.x - serverX) > tolerance) {
          entity.x = this.interpolateIfClose(entity.x, serverX);
        }
        if (Math.abs(entity.y - serverY) > tolerance) {
          entity.y = this.interpolateIfClose(entity.y, serverY);
        }
        continue;
      }

      // 3rd argument: interpolation speed
      entity.x = this.interpolateIfClose(entity.x, serverX);
      entity.y = this.interpolateIfClose(entity.y, serverY);
      this.playerTails[sessionId].moveTo(entity.x, entity.y);
    }
  }

  elapsedTime = 0;
  fixedTimeStep = 1000 / 60;

  update(time: number, delta: number): void {
    // skip loop if not connected yet.
    if (!this.currentPlayer) {
      return;
    }

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
  backgroundColor: "#0C0D5A",
  parent: "phaser-example",
  physics: {
    default: "arcade",
    arcade: {
      debug: false,
    },
  },
  pixelArt: true,
  scene: [GameScene],
};

// instantiate the game
const game = new Phaser.Game(config);
