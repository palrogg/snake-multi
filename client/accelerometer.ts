// Old stuff from https://paulronga.ch/space/js/input.js

var accelerationRequested = 0;
var rotationRequested = 0;

/*

ACCELEROMETER

*/

export class AccelerometerInput {
  lastBeta: number;
  lastGamma: number;
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;

  constructor() {
    console.log("create accelerometer control");
    if (window.DeviceOrientationEvent) {
      console.log("DeviceOrientation is available");
      window.addEventListener(
        "deviceorientation",
        (event) => {
          this.tilt(event.beta, event.gamma);
        },
        true
      );
    } else if (window.DeviceMotionEvent) {
      console.log("DeviceMotion is available");
      window.addEventListener(
        "devicemotion",
        (event) => {
          this.tilt(event.acceleration.x * 2, event.acceleration.y * 2);
        },
        true
      );
    }
  }

  resetInput() {
    this.left = false;
    this.right = false;
    this.up = false;
    this.down = false;
  }

  tilt(beta: number, gamma: number, tolerance = 2) {
    if (!this.lastBeta) {
      this.lastBeta = beta;
      this.lastGamma = gamma;
    }

    this.resetInput();

    if (beta < this.lastBeta - tolerance) {
      this.left = true;
      this.lastBeta = beta;
    } else if (beta > this.lastBeta + 2) {
      this.right = true;
      this.lastBeta = beta;
    }
    if (gamma < this.lastGamma - tolerance) {
      this.down = true;
      this.lastGamma = gamma;
    } else if (gamma > this.lastGamma + tolerance) {
      this.up = true;
      this.lastGamma = gamma;
    }
  }
}
