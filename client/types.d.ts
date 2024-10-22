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
