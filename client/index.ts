import Phaser from "phaser";
import CheckboxPlugin from "./plugins/checkbox-plugin";
import { TitleScene } from "./TitleScene";
import { GameScene } from "./GameScene";

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
  scene: [TitleScene, GameScene],

  plugins: {
    global: [
      {
        key: "CheckboxPlugin",
        plugin: CheckboxPlugin,
        start: true,
      },
    ],
  },
};

// instantiate the game
const game = new Phaser.Game(config);
