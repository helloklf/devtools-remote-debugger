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
            if (target !== document.activeElement) {
              document.activeElement.blur()
            }
            target.focus()
          }
          this.mousePressed = { x: -1, y: -1 }
        }
        break
      }
    }
  }

  dispatchKeyEvent(rawData) {
    const target = document.activeElement || window
    switch (rawData.type) {
      case 'keyDown':
      case 'keyUp': {
        const attrs = {
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
        const keydownEvent = new KeyboardEvent(rawData.type.toLowerCase(), attrs);
        target.dispatchEvent(keydownEvent);
        if (rawData.type === 'keyDown') {
          if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
            let change = false
            if (rawData.key === 'Backspace') {
              if (target.value) {
                target.value = target.value.slice(0, -1)
                change = true
              }
            }
            if (change) {
              const inputEvent = new InputEvent('input', {
                bubbles: true,
                cancelable: true,
                data: rawData.text
              });
              target.dispatchEvent(inputEvent)
            }
          }
        }
        break
      }
      case 'char': {
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
          let change = false
          if (rawData.text) {
            const len = target.maxlength
            if (len !== undefined) {
              const nextValue = target.value.slice(0, len)
              if (nextValue !== target.value) {
                target.value = nextValue
                change = true
              }
            } else {
              target.value += rawData.text
              change = true
            }
          }
          if (change) {
            const inputEvent = new InputEvent('input', {
              bubbles: true,
              cancelable: true,
              data: rawData.text
            });
            target.dispatchEvent(inputEvent)
          }
        }
      }
    }
  }
}
