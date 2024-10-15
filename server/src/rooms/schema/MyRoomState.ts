import { Schema, MapSchema, Context, type } from "@colyseus/schema";


export interface InputData {
  left: false;
  right: false;
  up: false;
  down: false;
  tick: number;
}

export class Player extends Schema {
  @type("number") x: number
  @type("number") y: number
  @type("number") xRequest: number
  @type("number") yRequest: number
  @type("number") tick: number
  bodies: any[] = [];
  inputQueue: any[] = [];
}

export class MyRoomState extends Schema {
  @type("number") mapWidth: number;
  @type("number") mapHeight: number;

  @type({ map: Player }) players = new MapSchema<Player>()
}