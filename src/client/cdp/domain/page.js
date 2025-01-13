import ScreenPreview from './screen-preview';
import BaseDomain from './domain';
import { Event } from './protocol';

function cropImage(base64, { left, top }) {
  prevImage = ''

  return new Promise((resolve) => {
    // 创建一个新的 Image 对象
    const img = new Image();
    img.src = base64;
    img.onload = () => {
      // 创建一个 canvas 元素
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
  
      // 设置 canvas 的宽高
      canvas.width = window.innerWidth / 2;
      canvas.height = window.innerHeight / 2;
  
      // 裁切图片
      ctx.drawImage(
        img,
        left, // 裁切的起始 x 坐标
        top,  // 裁切的起始 y 坐标
        window.innerWidth,        // 裁切的宽度
        window.innerHeight,       // 裁切的高度
        0,                        // 在 canvas 上放置的 x 坐标
        0,                        // 在 canvas 上放置的 y 坐标
        window.innerWidth / 2,        // 在 canvas 上绘制的宽度
        window.innerHeight / 2        // 在 canvas 上绘制的高度
      );
      
      // 获取裁切后的图片的 base64 编码
      const croppedBase64 = canvas.toDataURL('image/jpeg');
      resolve(croppedBase64);
    };
  })
}

export default class Page extends BaseDomain {
  namespace = 'Page';
  frame = new Map();

  /**

   * @public
   */
  enable() {
    const xhr = new XMLHttpRequest();
    xhr.$$requestType = 'Document';
    xhr.onload = () => {
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

  startScreencast() {
    const captureScreen = () => {
      if (document.hidden) return;
      ScreenPreview.captureScreen().then((base64) => {
        if (this.prevImage === base64) return;
        this.prevImage = base64;
        const left = document.body.scrollLeft;
        const top = document.body.scrollTop;
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
                scrollOffsetX: left,
                scrollOffsetY: top,
                timestamp: Date.now()
              }
            }
          });
        })
      });
    };

    captureScreen();

    this.intervalTimer = setInterval(captureScreen, 2000);
  }

  stopScreencast() {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
  }
};
