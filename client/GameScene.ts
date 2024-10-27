import Phaser from "phaser";
import { Client, Room } from "colyseus.js";
import { Snake, SnakeInterface } from "./snake";
import { ScoreBoard } from "./ScoreBoard";

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: "GameScene" });
  }

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

  // Physics
  foodGroup: Phaser.Physics.Arcade.Group;
  userGroup: Phaser.Physics.Arcade.Group;
  enemyPlayersGroup: Phaser.Physics.Arcade.Group;

  currentPlayerSnake: any;
  currentPlayer: Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
  currentPlayerTail: any; // SnakeInterface; // TODO: add interface again
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

      this.room = await this.client.joinOrCreate("snake_room");

      // When Server sends food location and value, add it to the scene
      this.room.state.foodItems.onAdd((item: Food, key: string) => {
        const color = item.kind === "player-meat" ? 0xfff118 : 0xf0f0f0;
        const food = this.add.circle(item.x, item.y, item.value, color);
        food.setData("category", "food"); // for overlap detection
        food.name = key; // keep track of food id for server sync
        this.physics.add.existing(food);
        this.foodGroup.add(food);
      });

      // When Server updates player locations, update scene
      this.room.state.players.onAdd((player: any, sessionId: string) => {
        console.log(player, player.name);
        // TODO: add player to Scoreboard

        // Work in progress: move everything related to snake creation
        // in snake.ts
        const snake = new Snake(
          this,
          player.x,
          player.y,
          sessionId,
          sessionId === this.room.sessionId
        );
        const playerHead = snake.head;
        const playerTail = snake;

        // keep a reference of it on `playerEntities`
        this.playerEntities[sessionId] = snake;

        player.onChange(() => {
          playerHead.setData("serverX", player.x);
          playerHead.setData("serverY", player.y);
          playerHead.setData("alive", player.alive);
          playerHead.setData("tailSize", player.tailSize);
        });

        if (sessionId === this.room.sessionId) {
          playerHead.name = "User Head";
          playerTail.tail.name = "User Tail";
          snake.bodies.map((body) => {
            body.name = "User TailBody " + sessionId;
            this.userGroup.add(body);
          });

          this.currentPlayerSnake = snake;
          // TODO: get rid of this!
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
            return rect;
          });
          player.onChange(() => {
            // Add new debug rects if needed
            if (player.circles.length > this.debugRects.length) {
              const newRects = player.circles
                .slice(this.debugRects.length)
                .map((i) => {
                  const rect = this.add.rectangle(i.x, i.y, 4, 4, 0xff0000);
                  rect.depth = 5;
                  return rect;
                });
              this.debugRects = this.debugRects.concat(newRects);
            }
            player.circles.map((circle: Circle, i: number) => {
              this.debugRects[i].x = circle.x;
              this.debugRects[i].y = circle.y;
            });
          });
        } else {
          // remote players
          playerHead.name = "Enemy Head " + sessionId;
          playerTail.tail.name = "Enemy Tail " + sessionId;
          this.enemyPlayersGroup.add(playerHead);
          snake.bodies.map((body) => {
            body.name = "Enemy TailBody " + sessionId;
            this.enemyPlayersGroup.add(body);
          });
        }
      });

      // When Players leave the room, clean scene
      this.room.state.players.onRemove((player, sessionId) => {
        // TODO: enable again
        const snakeEntity = this.playerEntities[sessionId];
        if (snakeEntity) {
          snakeEntity.destroy();
          delete this.playerEntities[sessionId];
        }
        // TODO: also remove player from ScoreBoard
      });
      this.room.state.foodItems.onRemove((item: Food, key: string) => {
        console.log("Remove food! Key:", key);
      });
      this.physics.add.overlap(this.userGroup, this.foodGroup);
      this.physics.add.overlap(this.userGroup, this.enemyPlayersGroup);

      this.physics.world.on("overlap", (object1: any, object2: any) => {
        console.log(`Overlap: “${object1.name}” vs “${object2.name}”`);
        console.log(object1.data);

        if (object2.getData("category") === "food") {
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
          }
          this.enemyPlayersGroup.remove(object2);
        }
      });

      // Work in progress ScoreBoard
      const scoreBoard = new ScoreBoard(
        this,
        [
          { playerName: "Ronald", playerId: "string", size: 123, kills: 23 },
          {
            playerName: "Jake",
            playerId: "sdfldsfkj",
            size: 1222233,
            kills: 223,
          },
        ],
        "this.currentPlayer"
      );
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
      this.currentPlayerSnake.head.x = this.horizontalWarp(
        this.currentPlayerSnake.head.x + this.xRequest * velocity
      );
      this.currentPlayerSnake.moveTo(this.currentPlayer.x, this.currentPlayer.y);
    } else if (this.yRequest !== 0) {
      this.currentPlayerSnake.head.y = this.verticalWarp(
        this.currentPlayerSnake.head.y + this.yRequest * velocity
      );
      this.currentPlayerSnake.moveTo(this.currentPlayer.x, this.currentPlayer.y);
    }

    for (let sessionId in this.playerEntities) {
      const snakeEntity = this.playerEntities[sessionId];
      const head = snakeEntity.head;
      const { serverX, serverY, alive, tailSize } =
        snakeEntity.head.data.values;

      if (alive !== true) {
        // Trigger death animations only once
        if (!this.deadPlayers.includes(sessionId)) {
          // If current user
          snakeEntity.animDie();
          if (sessionId === this.room.sessionId) {
            this.isUserAlive = false;
            this.xRequest = 0;
            this.yRequest = 0;
          }
        }
        this.deadPlayers.push(sessionId);
        continue;
      }

      // Make snake grow visually if it ate food,
      // according to server
      if (tailSize > snakeEntity.length) {
        snakeEntity.growTo(
          this,
          tailSize,
          0,
          new Phaser.Math.Vector2(
            snakeEntity.bodies[snakeEntity.bodies.length - 1].x,
            snakeEntity.bodies[snakeEntity.bodies.length - 1].y
          )
        );
      }

      // do not interpolate the current player,
      // unless necessary
      if (sessionId === this.room.sessionId) {
        const tolerance = 5;
        if (Math.abs(snakeEntity.head.x - serverX) > tolerance) {
          snakeEntity.head.x = this.interpolateIfClose(
            snakeEntity.head.x,
            serverX
          );
        }
        if (Math.abs(snakeEntity.head.y - serverY) > tolerance) {
          snakeEntity.head.y = this.interpolateIfClose(
            snakeEntity.head.y,
            serverY
          );
        }
        continue;
      }

      // 3rd argument: interpolation speed
      snakeEntity.head.x = this.interpolateIfClose(snakeEntity.head.x, serverX);
      snakeEntity.head.y = this.interpolateIfClose(snakeEntity.head.y, serverY);
      snakeEntity.tail.moveTo(snakeEntity.head.x, snakeEntity.head.y);
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
