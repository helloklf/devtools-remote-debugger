import BaseDomain from './domain';

// Mouse press to release, if the movement distance does not exceed this value, it is considered a click operation
const MOVE_THRESHOLD = 15;

export default class DomStorage extends BaseDomain {
  namespace = 'Input';

  mousePressed = { x: -1, y: -1 }

  dispatchTouchEvent(eventType, { x, y, target }) {
    const touch = new Touch({
      identifier: 666,
      target: target,
      clientX: x,
      clientY: y,
      radiusX: 2.5,
      radiusY: 2.5,
      rotationAngle: 0,
      force: 1
    })
    const touchEvent = new TouchEvent(eventType, {
      cancelable: true,
      bubbles: true,
      touches: [touch],
      targetTouches: [touch],
      changedTouches: [touch]
    })
    target.dispatchEvent(touchEvent)
  }

  emulateTouchFromMouseEvent({ type, x, y, button, ...rest }) {
    const target = document.elementFromPoint(x, y);
    if (!target) {
      return
    }
    switch (type) {
      case 'mouseWheel': {
        const { deltaX, deltaY, deltaZ } = rest;
        let event = new MouseEvent(type, {
          x, y, deltaX, deltaY, deltaZ, target,
          bubbles: true,
          cancelable: true,
        })
        target.dispatchEvent(event)
        break;
      }
      case 'mousePressed': {
        if (button === 'left') {
          this.mousePressed = { x, y }
          this.dispatchTouchEvent('touchstart', { target, x, y })
        }
        break
      }
      case 'mouseMoved': {
        if (button === 'left') {
          this.dispatchTouchEvent('touchmove', { target, x, y })
        }
        break
      }
      case 'mouseReleased': {
        if (button === 'left' && this.mousePressed.x !== -1 && this.mousePressed.y !== -1) {
          this.dispatchTouchEvent('touchend', { target, x, y })

          if (
            Math.abs(this.mousePressed.x - x) < MOVE_THRESHOLD &&
            Math.abs(this.mousePressed.y - y) < MOVE_THRESHOLD
          ) {
            const clickEvent = new MouseEvent('click', {
              target,
              view: window,
              bubbles: true,
              cancelable: true,
              clientX: x,
              clientY: y
            })
            target.dispatchEvent(clickEvent)
          }
          this.mousePressed = { x: -1, y: -1 }
        }
        break
      }
    }
  }

  dispatchKeyEvent(rawData) {
    // 创建一个新的 KeyboardEvent 对象
    const keyboardEvent = new KeyboardEvent(
      (rawData.type || 'keydown').toLowerCase(),
      {
        key: rawData.key,
        code: rawData.code,
        keyCode: rawData.windowsVirtualKeyCode,
        charCode: rawData.nativeVirtualKeyCode,
        which: rawData.windowsVirtualKeyCode,
        shiftKey: (rawData.modifiers & 0x1) !== 0,
        ctrlKey: (rawData.modifiers & 0x2) !== 0,
        altKey: (rawData.modifiers & 0x4) !== 0,
        metaKey: (rawData.modifiers & 0x8) !== 0,
        repeat: rawData.autoRepeat,
        isComposing: false
      }
    );
    window.dispatchEvent(keyboardEvent);
  }
}
