import Phaser from "phaser";
import { Client, Room } from "colyseus.js";
import { Snake } from "./snake";
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
  debug: boolean;
  deadPlayers: string[] = [];
  scoreTimeout;

  // Players
  playerEntities: { [sessionId: string]: any } = {};
  scoreBoard: any;

  // Food dictionary
  foodEntities: { [foodId: string]: any } = {};

  // Physics
  foodGroup: Phaser.Physics.Arcade.Group;
  userGroup: Phaser.Physics.Arcade.Group;
  enemyPlayersGroup: Phaser.Physics.Arcade.Group;

  currentPlayerSnake: any;
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

  async create(data: { debug: boolean; playAgain: boolean }) {
    console.log("Joining room...");

    this.debug = data.debug;
    if (data.playAgain) {
      console.warn("Player plays again. Reset RESET!");
      this.xRequest = -1;
      this.yRequest = 0;
      this.isUserAlive = true;
      this.playerEntities = {};
    }

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
        const food = this.add.circle(item.x, item.y, item.value * 2, color);
        food.setData("category", "food"); // for overlap detection
        food.name = key; // keep track of food id for server sync
        this.physics.add.existing(food);
        this.foodGroup.add(food);
        this.foodEntities[key] = food;
      });

      // When Server updates player locations, update scene
      this.room.state.players.onAdd((player: any, sessionId: string) => {
        console.log(player.name, "joined the room. ID =", sessionId);

        // Create Score Board if needed and add new player
        if (!this.scoreBoard) {
          this.scoreBoard = new ScoreBoard(this, this.room.sessionId);
        }
        this.scoreBoard.addPlayer(player, sessionId);

        // Create snake entity for the new player
        const snake = new Snake(
          this,
          player.x,
          player.y,
          sessionId,
          sessionId === this.room.sessionId
        );

        // keep a reference of it on "playerEntities"
        this.playerEntities[sessionId] = snake;

        player.onChange(() => {
          snake.head.setData("serverX", player.x);
          snake.head.setData("serverY", player.y);
          snake.head.setData("alive", player.alive);
          if (player.tailSize != snake.head.getData("tailSize")) {
            snake.head.setData("tailSize", player.tailSize);
            if (this.scoreTimeout) {
              this.time.removeEvent(this.scoreTimeout);
            }
            this.scoreTimeout = this.time.addEvent({
              delay: 200,
              callback: () => {
                this.scoreBoard.updateScore(player, sessionId);
              },
              loop: false,
            });
          }
        });

        // Debug
        if (this.debug) {
          snake.createDebugRectangles(player.circles);
          player.onChange(() => {
            snake.updateDebugRectangles(player.x, player.y, player.circles);
          });
        }

        // If snake is current player
        if (sessionId === this.room.sessionId) {
          snake.bodies.map((body) => {
            this.userGroup.add(body);
          });

          this.currentPlayerSnake = snake;
          this.userGroup.add(this.currentPlayerSnake.head);
        } else {
          // remote players
          this.enemyPlayersGroup.add(snake.head);
          snake.bodies.map((body) => {
            this.enemyPlayersGroup.add(body);
          });
        }
      });

      // When Players leave the room, clean scene
      this.room.state.players.onRemove((player, sessionId) => {
        const snakeEntity = this.playerEntities[sessionId];
        if (snakeEntity) {
          this.userGroup.remove(snakeEntity.head);
          snakeEntity.destroy();
          delete this.playerEntities[sessionId];
        }
        if (sessionId === this.room.sessionId) {
          console.warn("destroy !!!");
          this.remoteRef.destroy();
          this.debugRects.map((r) => r.destroy());
        }
        // Remove player from the Score Board
        this.scoreBoard.removePlayer(sessionId);
      });

      this.room.state.foodItems.onRemove((item: Food, key: string) => {
        // Sync removed food from server, using dictionary key
        const foodEntity = this.foodEntities[key];
        if (foodEntity) {
          foodEntity.destroy();
          delete this.foodEntities[key];
        }
      });

      this.physics.add.overlap(
        this.userGroup,
        this.foodGroup,
        (object1: any, object2: any) => {
          if (object2.getData("category") === "food") {
            // Food object
            this.eatRequest = object2.name;
            object2.setAlpha(0);
            // Remove object from its physics group, so
            // the overlap won't be triggered anymore
            this.foodGroup.remove(object2);
          }
        }
      );
      this.physics.add.collider(
        this.userGroup,
        this.enemyPlayersGroup,
        (object1: any, object2: any) => {
          if (
            object1.getData("category") === "tail" &&
            object2.getData("category") === "head"
          ) {
            const targetUserId = object2.getData("userId");
            if (Object.keys(this.playerEntities).includes(targetUserId)) {
              if (!this.playerEntities[targetUserId].killRequested === true) {
                console.log("Flag user: killRequested", targetUserId);
                this.playerEntities[targetUserId].markForKill();
                console.log(this.playerEntities[targetUserId]);
                // Send kill request to server
                this.killRequest = object2.getData("userId");
              }
            }
          }
        }
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

    const velocity = 2; // This value also impacts tail spacing for now

    // Send input to the server
    if (this.isUserAlive) {
      this.inputPayload.left = this.cursorKeys.left.isDown;
      this.inputPayload.right = this.cursorKeys.right.isDown;
      this.inputPayload.up = this.cursorKeys.up.isDown;
      this.inputPayload.down = this.cursorKeys.down.isDown;
      if (this.eatRequest !== null) {
        // console.log("We send an “eatRequest” for", this.eatRequest);
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
      this.currentPlayerSnake.moveTo(
        this.currentPlayerSnake.head.x,
        this.currentPlayerSnake.head.y
      );
    } else if (this.yRequest !== 0) {
      this.currentPlayerSnake.head.y = this.verticalWarp(
        this.currentPlayerSnake.head.y + this.yRequest * velocity
      );
      this.currentPlayerSnake.moveTo(
        this.currentPlayerSnake.head.x,
        this.currentPlayerSnake.head.y
      );
    }

    for (let sessionId in this.playerEntities) {
      const snakeEntity = this.playerEntities[sessionId];
      if (!snakeEntity?.head?.data?.values) {
        // create it again?
        console.warn("continue");
        continue;
      }
      const { serverX, serverY, alive, tailSize } =
        snakeEntity.head.data.values;

      if (alive !== true) {
        // Trigger death animations only once
        if (!this.deadPlayers.includes(sessionId)) {
          snakeEntity.animDie();
          this.enemyPlayersGroup.remove(snakeEntity.head);

          // If current user
          if (sessionId === this.room.sessionId) {
            this.isUserAlive = false;
            this.xRequest = 0;
            this.yRequest = 0;
            // this.scoreBoard.destroy();

            this.time.addEvent({
              delay: 1000,
              callback: () => {
                // this.scene.stop();
                this.room.leave();
                this.scene.start("GameOver");
              },
              loop: false,
            });
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
          ),
          sessionId === this.room.sessionId
            ? this.userGroup
            : this.enemyPlayersGroup
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
      snakeEntity.moveTo(snakeEntity.head.x, snakeEntity.head.y);
    }
  }

  elapsedTime = 0;
  fixedTimeStep = 1000 / 60;

  update(time: number, delta: number): void {
    // skip loop if not connected yet.
    if (!this.currentPlayerSnake) {
      return;
    }

    this.elapsedTime += delta;
    while (this.elapsedTime >= this.fixedTimeStep) {
      this.elapsedTime -= this.fixedTimeStep;
      this.fixedTick(time, this.fixedTimeStep);
    }
  }
}
