import throttle from 'lodash.throttle';
import { isMatches, loadScript } from '../common/utils';
import { DEVTOOL_OVERLAY, HTML_TO_CANVAS_CANVAS } from '../common/constant';
import domToImage from '../common/domToImage';

const HTML_TO_IMAGE = 'https://unpkg.com/html2canvas@1.4.1/dist/html2canvas.min.js';

let useDomToImage = true;
export default class ScreenPreview {
  static elementExclude(element) {
    if (!element || element.tagName === 'SCRIPT') return true;
    if (!element?.style) return false;
    const { display, opacity, visibility } = element.style;
    return isMatches(element, `.${DEVTOOL_OVERLAY}`) ||
      display === 'none' ||
      opacity === 0 ||
      visibility === 'hidden';
  }

  static captureScreen = throttle(() => {
    // Faster and less dom contamination
    if (useDomToImage) {
      return domToImage.toJpeg(document.body, {
        quality: 0.6,
        filter: (ele) => !ScreenPreview.elementExclude(ele)
      }).catch(e => {
        console.info('Failed to capture screen with dom-to-image:', e);
        useDomToImage = false;
      });
    } else {
      const canvas = document.createElement('canvas');
      canvas.className = HTML_TO_CANVAS_CANVAS;
      const renderScreen = () => window.html2canvas(document.body, {
        allowTaint: true,
        backgroundColor: null,
        useCORS: true,
        imageTimeout: 10000,
        scale: 1,
        logging: false,
        foreignObjectRendering: false,
        ignoreElements: ScreenPreview.elementExclude
      }).then(canvas => canvas.toDataURL('image/jpeg'));
  
      if (window.html2canvas) {
        return renderScreen();
      }
  
      return loadScript(HTML_TO_IMAGE).then(renderScreen);
    }
  }, 300)
}
