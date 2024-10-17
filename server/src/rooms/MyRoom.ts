import { Room, Client, Delayed } from "@colyseus/core";
import { InputData, MyRoomState, Player, Food } from "./schema/MyRoomState";
import { shiftPosition } from "./common";


export class MyRoom extends Room<MyRoomState> {
  maxClients = 4;
  foodCount = 0;
  mapWidth = 800;
  mapHeight = 600;
  fixedTimeStep = 1000 / 60;
  bodies: any[] = [];
  public delayedInterval!: Delayed;


  getRandomLocation() {
    const margin = 20
    return {
      x: Math.floor(margin + (Math.random() * (this.mapWidth - 2 * margin))),
      y: Math.floor(margin + (Math.random() * (this.mapHeight - 2 * margin)))
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

  validateOverlap(x1: number, y1: number, x2: number, y2: number, xTolerance = 50, yTolerance = 50) {
    // TODO: check overlap
    console.log(`Validating overlap: (${x1}, ${y1}) vs (${x2}, ${y2})`)
    const xDistance = Math.abs(x2 - x1)
    const yDistance = Math.abs(y2 - y1)
    return (xDistance < xTolerance && yDistance < yTolerance)
  }

  onCreate(options: any) {
    let elapsedTime = 0;

    this.setSimulationInterval((deltaTime) => {
      elapsedTime += deltaTime

      while (elapsedTime >= this.fixedTimeStep) {
        elapsedTime -= this.fixedTimeStep;
        this.fixedTick(this.fixedTimeStep);
      }
    })
    this.setState(new MyRoomState());

    this.onMessage(0, (client, payload) => {
      // get reference to the player who sent the message
      const player = this.state.players.get(client.sessionId);
      // enqueue input to user input buffer.
      player.inputQueue.push(payload);
    });

    // Add food periodically
    this.clock.start()
    this.delayedInterval = this.clock.setInterval(() => {
      // Set food limit to 5
      if (this.state.foodItems.size < 5) {
        const randomLocation = this.getRandomLocation()
        // From 5 to 10
        const randomValue = 5 + Math.round(Math.random() * 5)
        this.state.foodItems.set(
          `food_${this.foodCount}`,
          new Food({ x: randomLocation.x, y: randomLocation.y, value: randomValue })
        )
        this.foodCount++;
      }
    }, 3000);

  }

  onJoin(client: Client, options: any) {
    console.log(client.sessionId, "joined!");
    const player = new Player();

    // place Player at a random position
    const randomLocation = this.getRandomLocation()
    player.x = randomLocation.x;
    player.y = randomLocation.y;
    player.tailSize = 20;
    player.kills = 0;
    player.alive = true;

    // x/y input requests
    player.xRequest = -1;
    player.yRequest = 0;

    const length = 20;
    const spacing = 2;

    // player tail
    let x = player.x + spacing;
    const newBodies = []
    for (let i = 0; i < length; i++) {
      newBodies.push([x, player.y])
      x += spacing;
    }
    this.bodies = newBodies;

    // identify player by its sessionId
    this.state.players.set(client.sessionId, player);
  }

  onLeave(client: Client, consented: boolean) {
    console.log(client.sessionId, "left!");
    this.state.players.delete(client.sessionId);
  }

  onDispose() {
    console.log("room", this.roomId, "disposing...");
  }

  fixedTick(timeStep: number) {
    const velocity = 2;
    this.state.players.forEach(player => {
      let input: InputData;

      // dequeue player inputs
      while (input = player.inputQueue.shift()) {
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
          console.log('Eat request:', input.eatRequest);
          const targetFood = this.state.foodItems.get(input.eatRequest);
          if (targetFood) {
            // TODO: applly server check
            const validOverlap = this.validateOverlap(player.x, player.y, targetFood.x, targetFood.y);
            console.log('Overlap validity:', validOverlap);
            if (validOverlap) {
              // Make player grow
              player.tailSize += targetFood.value;
              this.state.foodItems.delete(input.eatRequest);
            }
          } else {
            console.warn('Target food “', input.eatRequest, '” not found!');
          }
        }
        if (input.killRequest) {
          console.log('KILL request:', input.killRequest)
          const targetEnemy = this.state.players.get(input.killRequest)
          if (targetEnemy) {
            // TODO: applly server check
            const validOverlap = this.validateOverlap(player.x, player.y, targetEnemy.x, targetEnemy.y);
            console.log('Kill Overlap validity:', validOverlap);
            if (validOverlap) {
              // Flag enemy player as dead
              targetEnemy.alive = false;
            }
          } else {
            console.warn('Target food “', input.eatRequest, '” not found!')
          }
        }
        player.tick = input.tick;
      }
      player.x = this.horizontalWarp(player.x + player.xRequest * velocity);
      player.y = this.verticalWarp(player.y + player.yRequest * velocity);
      shiftPosition(player.bodies, player.x, player.y, 1)
    });
  }

}
