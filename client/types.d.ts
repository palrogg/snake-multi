declare module "*.png" {
  const value: any;
  export = value;
}

interface Food {
  x: number;
  y: number;
  value: number;
  kind: "random" | "player-meat";
}

interface Circle {
  x: number;
  y: number;
}

interface Score {
  playerName: string;
  playerId: string;
  size: number;
  kills: number;
}

interface Player {
  x: number;
  y: number;
  xRequest: number;
  yRequest: number;
  tailSize: number;
  kills: number;
  alive: boolean;
  name: string;
  circles: Circle[];
  onChange: () => any;
}
