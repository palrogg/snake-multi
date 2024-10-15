import { Room, Client } from "@colyseus/core";
import { InputData, MyRoomState, Player } from "./schema/MyRoomState";
import { shiftPosition } from "./common";

export class MyRoom extends Room<MyRoomState> {
  maxClients = 4;
  fixedTimeStep = 1000 / 60;

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

  }

  onJoin(client: Client, options: any) {
    console.log(client.sessionId, "joined!");

    const mapWidth = 800
    const mapHeight = 600

    const player = new Player();

    // place Player at a random position
    player.x = (Math.random() * mapWidth);
    player.y = (Math.random() * mapHeight);

    player.xRequest = 0;
    player.yRequest = 0;

    // place player in the map of players by its sessionId
    // (client.sessionId is unique per connection!)
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
        player.x += player.xRequest * velocity;
        player.y += player.yRequest * velocity;
        player.tick = input.tick;
      }
    });
  }

}
