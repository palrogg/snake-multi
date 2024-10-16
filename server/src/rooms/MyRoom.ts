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
        this.state.foodItems.set(`food_${this.foodCount}`, new Food({ x: randomLocation.x, y: randomLocation.y, value: 5 }))
        this.foodCount++;
      }
    }, 3000);

  }

  onJoin(client: Client, options: any) {
    console.log(client.sessionId, "joined!");
    const player = new Player();

    // place Player at a random position
    const randomLocation = this.getRandomLocation()
    player.x = randomLocation.x
    player.y = randomLocation.y

    // x/y input requests
    player.xRequest = 0;
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
        player.tick = input.tick;
      }
      player.x = this.horizontalWarp(player.x + player.xRequest * velocity);
      player.y = this.verticalWarp(player.y + player.yRequest * velocity);
      shiftPosition(player.bodies, player.x, player.y)
    });
  }

}
