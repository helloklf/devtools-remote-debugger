import ScreenPreview from './screen-preview';
import BaseDomain from './domain';
import { Event } from './protocol';
import { throttle } from '../common/utils';

function cropImage(base64, { left, top }) {
  return new Promise((resolve) => {
    // 创建一个新的 Image 对象
    const img = new Image();
    const scale = window.innerWidth > 720 ? 2 : 1;
    img.src = base64;
    img.onload = () => {
      // 创建一个 canvas 元素
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
  
      // 设置 canvas 的宽高
      canvas.width = window.innerWidth / scale;
      canvas.height = window.innerHeight / scale;
  
      // 裁切图片
      ctx.drawImage(
        img,
        left, // 裁切的起始 x 坐标
        top,  // 裁切的起始 y 坐标
        window.innerWidth,        // 裁切的宽度
        window.innerHeight,       // 裁切的高度
        0,                        // 在 canvas 上放置的 x 坐标
        0,                        // 在 canvas 上放置的 y 坐标
        window.innerWidth / scale,        // 在 canvas 上绘制的宽度
        window.innerHeight / scale        // 在 canvas 上绘制的高度
      );
      
      // 获取裁切后的图片的 base64 编码
      const croppedBase64 = canvas.toDataURL('image/jpeg');
      resolve(croppedBase64);
    };
  })
}

export default class Page extends BaseDomain {
  namespace = 'Page';
  prevImage = '';
  prevOffset = '';
  observerInst = null;
  frame = new Map();
  sent = false;
  static MAINFRAME_ID = 1;

  /**

   * @public
   */
  enable() {
    // Avoid getting html content repeatedly when the socket is reconnected
    if (this.sent) {
      return;
    }

    const xhr = new XMLHttpRequest();
    xhr.$$requestType = 'Document';
    xhr.__initiator = null;
    xhr.onload = () => {
      this.sent = true;
      this.frame.set(location.href, xhr.responseText);
    };
    xhr.onerror = () => {
      this.frame.set(location.href, 'Cannot get script source code');
    };

    xhr.open('GET', location.href);
    xhr.send();
  }

  /**
   * Get root frame
   * @public
   */
  getResourceTree() {
    return {
      frameTree: {
        frame: {
          id: 1,
          mimeType: 'text/html',
          securityOrigin: location.origin,
          url: location.href,
        },
        resources: [],
      },
    };
  }

  /**
   * Get html content
   * @public
   * @param {Object} param
   * @param {String} param.url page url
   */
  getResourceContent({ url }) {
    return {
      content: this.frame.get(url),
    };
  }

  getNavigationHistory() {
    return {
      currentIndex: 0,
      entries: [
        {
          id: 0,
          url: window.location.href,
          userTypedURL: window.location.href,
          title: window.document.title,
          transitionType: {
            x: 0,
            y: 0,
            width: window.innerWidth,
            height: window.innerHeight,
            scale: 1,
          }
        }
      ]
    }
  }

  reload() {
    window.location.reload();
  }

  navigate ({ url }) {
    window.location.href = url
  }

  startScreencast() {
    const captureScreen = throttle(() => {
      if (document.hidden) return;
      ScreenPreview.captureScreen().then((base64) => {
        const left = document.body.scrollLeft || window.document.documentElement.scrollLeft;
        const top = document.body.scrollTop || window.document.documentElement.scrollTop;
        if (this.prevImage === base64 && `${left}|${top}` === this.prevOffset) return;
        this.prevImage = base64;
        this.prevOffset = `${left}|${top}`;
        cropImage(base64, { left, top }).then((data) => {
          this.send({
            method: Event.screencastFrame,
            params: {
              data: data.replace(/^data:image\/\w+;base64,/, ''),
              sessionId: 1,
              metadata: {
                deviceHeight: window.innerHeight,
                deviceWidth: window.innerWidth,
                pageScaleFactor: 1,
                offsetTop: 0,
                scrollOffsetX: 0,
                scrollOffsetY: 0,
                timestamp: Date.now()
              }
            }
          });
        })
      });
    }, 350);

    captureScreen();

    // Observe the changes of the document
    this.observerInst = new MutationObserver(captureScreen);

    this.observerInst.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    });

    this.intervalTimer = setInterval(captureScreen, 1000);
  }

  stopScreencast() {
    this.observerInst && this.observerInst.disconnect();
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
  }
};

Page.MAINFRAME_ID = Number(sessionStorage.getItem('debug_frame_id') || '0') + 1;
sessionStorage.setItem('debug_frame_id', Page.MAINFRAME_ID);
