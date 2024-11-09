export class SwipeInput {
  startX: number;
  startY: number;
  gestureZone: HTMLElement;
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;

  constructor(containerId: string) {
    this.gestureZone = document.getElementById(containerId);
    this.gestureZone.addEventListener(
      "touchstart",
      (e) => {
        this.startX = e.touches[0].clientX;
        this.startY = e.touches[0].clientY;
      },
      false
    );

    this.gestureZone.addEventListener(
      "touchend",
      (e) => {
        this.evaluateSwipe(e.changedTouches[0]);
      },
      false
    );
  }
  reset() {
    this.left = false;
    this.right = false;
    this.up = false;
    this.down = false;
  }
  evaluateSwipe(touch: Touch) {
    const minDistance = 10;
    const deltaX = touch.clientX - this.startX;
    const deltaY = touch.clientY - this.startY;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);
    if (absDeltaX > absDeltaY) {
      if (absDeltaX > minDistance) {
        this.reset();
        if (deltaX > 0) {
          this.right = true;
        } else {
          this.left = true;
        }
      }
    } else {
      if (absDeltaY > minDistance) {
        this.reset();
        if (deltaY > 0) {
          this.down = true;
        } else {
          this.up = true;
        }
      }
    }
  }
}
