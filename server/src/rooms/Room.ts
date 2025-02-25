import { Room, Client, Delayed } from "@colyseus/core";
import { ArraySchema } from "@colyseus/schema";
import {
  InputData,
  MyRoomState,
  Player,
  Food,
  Circle,
} from "./schema/RoomState";
import { createBodies, shiftPosition } from "./common";

export class MyRoom extends Room<MyRoomState> {
  maxClients = 10;
  foodCount = 0;
  mapWidth = 800;
  mapHeight = 600;
  fixedTimeStep = 1000 / 60;
  playerIndex = 0;
  playerNames = [
    "Ronald",
    "Ada",
    "Claude",
    "Jess",
    "Niki",
    "Jessie",
    "Teddy",
    "Noobeo",
    "Elsana",
    "Potato",
  ];
  bodies: any[] = [];
  maxTailSize = 500;
  public delayedInterval!: Delayed;
  circles: ArraySchema<Circle>;
  debug = true;

  getRandomLocation() {
    const margin = 20;
    return {
      x: Math.floor(margin + Math.random() * (this.mapWidth - 2 * margin)),
      y: Math.floor(margin + Math.random() * (this.mapHeight - 2 * margin)),
    };
  }

  horizontalWarp(x: number) {
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

  validateOverlap(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    xTolerance = 20,
    yTolerance = 20
  ) {
    // console.log(`Validating overlap: (${x1}, ${y1}) vs (${x2}, ${y2})`);
    const xDistance = Math.abs(x2 - x1);
    const yDistance = Math.abs(y2 - y1);
    return xDistance < xTolerance && yDistance < yTolerance;
  }

  createPlayer(name?: string | null) {
    const player = new Player();

    // place Player at a random position
    const randomLocation = this.getRandomLocation();
    player.x = randomLocation.x;
    player.y = randomLocation.y;
    player.tailSize = 20;
    player.kills = 0;
    player.alive = true;
    player.name = name ? name : this.playerNames[this.playerIndex];
    this.playerIndex++;
    if (this.playerIndex > 9) {
      this.playerIndex = 0;
    }

    // x/y input requests
    player.xRequest = -1;
    player.yRequest = 0;

    const length = 20;
    const spacing = 2;

    // player tail
    // The Collection only serves for debug
    player.bodies = createBodies(player.x, player.y, spacing, length);
    const collection = new ArraySchema<Circle>();
    player.bodies.forEach((body, i) => {
      collection.push(new Circle({ x: body.x, y: body.y }));
    });
    player.circles = collection;
    return player;
  }

  onCreate(options: any) {
    let elapsedTime = 0;

    this.setSimulationInterval((deltaTime) => {
      elapsedTime += deltaTime;

      while (elapsedTime >= this.fixedTimeStep) {
        elapsedTime -= this.fixedTimeStep;
        this.fixedTick(this.fixedTimeStep);
      }
    });

    this.setState(new MyRoomState());

    // Enqueue player input to buffer
    this.onMessage(0, (client, payload) => {
      const player = this.state.players.get(client.sessionId);
      if (player && player.hasOwnProperty("inputQueue")) {
        player.inputQueue.push(payload);
      } else {
        console.warn("No player or no property!");
      }
    });

    // Add food periodically
    this.clock.start();
    this.delayedInterval = this.clock.setInterval(() => {
      // Set food limit to 5
      if (this.state.foodItems.size < 5) {
        const randomLocation = this.getRandomLocation();
        // From 5 to 10
        const randomValue = 5 + Math.round(Math.random() * 5);
        this.state.foodItems.set(
          `food_${this.foodCount}`,
          new Food({
            x: randomLocation.x,
            y: randomLocation.y,
            value: randomValue,
            kind: "random", // versus player-mean (when a player dies)
          })
        );
        this.foodCount++;
      }
    }, 3000);
  }

  onJoin(client: Client, options: any) {
    console.log(client.sessionId, "joined!");
    const player = this.createPlayer();

    // identify player by its sessionId
    this.state.players.set(client.sessionId, player);

    if (this.state.players.size === 1) {
      // Create bot player
      const botPlayer = this.createPlayer("bot");
      this.state.players.set("bot", botPlayer);
    }
    // To work on  death sequence
    // setTimeout(() => {
    //   const thePlayer = this.state.players.get(client.sessionId);
    //   console.log("diiiiie");
    //   if (thePlayer) {
    //     thePlayer.alive = false;
    //     this.addSnakeMeat(thePlayer);
    //     thePlayer.x = 200;
    //   }
    // }, 1000);

    // Check grown tail more easily
    // setTimeout(() => {
    //   const player = this.state.players.get(client.sessionId);
    //   if (player) {
    //     player.tailSize += 100;
    //     const lastBody = player.bodies[player.bodies.length - 1];
    //     console.log(lastBody);
    //     const newBodies = createBodies(lastBody.x, lastBody.y, 0, 100);
    //     player.bodies = player.bodies.concat(newBodies);
    //   }
    // }, 1000);
  }

  onLeave(client: Client, consented: boolean) {
    console.log(client.sessionId, "left!");
    this.state.players.delete(client.sessionId);
  }

  onDispose() {
    console.log("room", this.roomId, "disposing...");
  }

  addSnakeMeat(player: Player) {
    console.log("Adding snake meat! Body length:", player.bodies.length);
    for (let body of player.bodies) {
      this.state.foodItems.set(
        `food_meat_${this.foodCount}`,
        new Food({
          x: body.x,
          y: body.y,
          value: 1,
          kind: "player-meat",
        })
      );
      this.foodCount++;
    }
  }

  fixedTick(timeStep: number) {
    const velocity = 2;
    this.state.players.forEach((player) => {
      let input: InputData;

      // dequeue player inputs
      while ((input = player.inputQueue.shift())) {
        if (player.alive === false) {
          continue;
        }
        if (input.left) {
          player.xRequest = -1;
          player.yRequest = 0;
        } else if (input.right) {
          player.xRequest = 1;
          player.yRequest = 0;
        } else if (input.up) {
          player.xRequest = 0;
          player.yRequest = -1;
        } else if (input.down) {
          player.xRequest = 0;
          player.yRequest = 1;
        }
        if (input.eatRequest) {
          console.log("Eat request:", input.eatRequest);
          const targetFood = this.state.foodItems.get(input.eatRequest);
          if (targetFood) {
            // Server validation
            const validOverlap = this.validateOverlap(
              player.x,
              player.y,
              targetFood.x,
              targetFood.y,
              40,
              40
            );
            console.log("Overlap validity:", validOverlap);
            if (validOverlap) {
              // Make player grow

              // “tailSize” value gets displayed in the score board
              player.tailSize += targetFood.value;
              const lastBody = player.bodies[player.bodies.length - 1];

              // Actual tail doesn't exceed “maxTailSize”
              const growCount =
                player.tailSize <= this.maxTailSize
                  ? targetFood.value
                  : this.maxTailSize - player.tailSize;
              const newBodies = createBodies(
                lastBody.x,
                lastBody.y,
                0,
                growCount
              );
              player.bodies = player.bodies.concat(newBodies);

              // If debug is active,
              // update the synchronized tail
              if (this.debug === true) {
                const c = new ArraySchema<Circle>();
                player.bodies.forEach((body, i) => {
                  c.push(new Circle({ x: body.x, y: body.y }));
                });
                player.circles = c;
              }
              this.state.foodItems.delete(input.eatRequest);
            }
          } else {
            console.warn("Target food “", input.eatRequest, "” not found!");
          }
        }
        if (input.killRequest) {
          console.log("KILL request:", input.killRequest);
          if (player.alive !== true) {
            console.log("Requesting player is already dead.");
          } else {
            const targetEnemy = this.state.players.get(input.killRequest);
            if (targetEnemy) {
              // Case: head-head
              const headOverlap = this.validateOverlap(
                player.x,
                player.y,
                targetEnemy.x,
                targetEnemy.y,
                32,
                32
              );
              if (headOverlap) {
                console.log("Head overlap!!!");
                const xSum = targetEnemy.xRequest + player.xRequest;
                const ySum = targetEnemy.yRequest + player.yRequest;
                if (xSum === 0 && ySum === 0) {
                  console.log("Opposite direction: both players die.");
                  player.alive = false;
                  targetEnemy.alive = false;
                } else if (xSum === 2 || ySum === 2) {
                  console.log("Same direction: should not occur...");
                  player.alive = false;
                  targetEnemy.alive = false;
                } else {
                  // Take both player directions;
                  // Player which direction is clear is safe
                  console.log(
                    "Need to test which player lives or die; For now: both die"
                  );
                  player.alive = false;
                  targetEnemy.alive = false;
                }
              } else {
                // Server validation: player head and tail
                const validOverlap = player.bodies
                  .map((body) =>
                    this.validateOverlap(
                      body.x,
                      body.y,
                      targetEnemy.x,
                      targetEnemy.y
                    )
                  )
                  .some((result: boolean) => result === true);
                if (validOverlap) {
                  // Check direction of both players

                  // Flag enemy player as dead
                  targetEnemy.alive = false;
                  // And turn him into meat
                  this.addSnakeMeat(targetEnemy);
                }
              }
            } else {
              console.warn("Target enemy “", input.eatRequest, "” not found!");
            }
          }
        }
        player.tick = input.tick;
      }
      if (player.alive === true) {
        player.x = this.horizontalWarp(player.x + player.xRequest * velocity);
        player.y = this.verticalWarp(player.y + player.yRequest * velocity);
        shiftPosition(player.bodies, player.x, player.y, 1);
        if (this.debug === true) {
          for (let i = 0; i < player.circles.length; i++) {
            player.circles[i].x = player.bodies[i].x;
            player.circles[i].y = player.bodies[i].y;
          }
        }
      }
    });
  }
}
