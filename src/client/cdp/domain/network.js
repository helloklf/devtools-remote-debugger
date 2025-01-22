import jsCookie from 'js-cookie';
import mime from 'mime/lite';
import { getAbsolutePath, getResponseLength, key2UpperCase } from '../common/utils';
import BaseDomain from './domain';
import { Event } from './protocol';
import Runtime, { cdpJsName } from './runtime';

const getTimestamp = () => Date.now() / 1000;

const originFetch = window.fetch;

export default class Network extends BaseDomain {
  namespace = 'Network';
  networkConditions = {
    offline: false,
    latency: 0,
    downloadThroughput: 0,
    uploadThroughput: 0,
    // none, cellular2g, cellular3g, cellular4g, bluetooth, ethernet, wifi, wimax, other
    connectionType: null
  }

  // the unique id of the request
  requestId = 0;

  responseData = new Map();
  requestData = new Map();

  cacheRequest = [];

  isEnable = false;

  socketSend = (data) => {
    this.cacheRequest.push(data);
    if (this.isEnable) {
      this.send(data);
    }
  };

  constructor(options) {
    super(options);
    this.hookXhr();
    this.hookFetch();
  }

  /**
   * Format http response header
   * @static
   * @param {String} header http response header eg：content-type: application/json; charset=UTF-8\n date: Wed, 15 Sep 2021 07:20:26 GMT
   */
  static formatResponseHeader(header) {
    const headers = {};
    header.split('\n').filter(val => val)
      .forEach((item) => {
        const [key, val] = item.split(':');
        headers[key2UpperCase(key)] = val;
      });
    return headers;
  }

  /**
   * Get the default http request header, currently only ua, cookie
   * @static
   */
  static getDefaultHeaders() {
    const headers = {
      'User-Agent': navigator.userAgent,
      Origin: window.location.origin,
    };
    if (document.cookie) {
      headers.Cookie = document.cookie;
    }

    return headers;
  }

  /**
   * @public
   */
  enable() {
    this.isEnable = true;
    this.cacheRequest.forEach(data => this.send(data));
    this.reportImageNetwork();
  }

  /**
   * Get network response content
   * @public
   * @param {Object} param
   * @param {Number} param.requestId
   */
  getResponseBody({ requestId }) {
    let body = '';
    let base64Encoded = false;
    const response = this.responseData.get(requestId);

    if (typeof response === 'string') {
      body = response;
    } else {
      body = response?.data;
      base64Encoded = true;
    }

    return { body, base64Encoded };
  }

  getRequestPostData ({ requestId }) {
    return { postData: { requestId } }
  }

  /**
   * @public
   */
  getCookies() {
    const cookies = jsCookie.get();
    return {
      cookies: Object.keys(cookies).map(name => ({ name, value: cookies[name] }))
    };
  }

  /**
   * @public
   * @param {Object} param
   * @param {String} param.name cookie name
   */
  deleteCookies({ name }) {
    jsCookie.remove(name, { path: '/' });
  }

  /**
   * @public
   * @param {Object} param
   * @param {String} param.name cookie name
   * @param {String} param.value cookie value
   * @param {String} param.path path
   */
  setCookie({ name, value, path }) {
    jsCookie.set(name, value, { path });
  }

  /**
   * Get the unique id of the request
   * @private
   */
  getRequestId() {
    this.requestId += 1;
    return this.requestId;
  }

  emulateNetworkConditions ({ offline, latency, downloadThroughput, uploadThroughput, connectionType }) {
    Object.assign(
      this.networkConditions,
      // Limiting speed is difficult, and latency alone is easier to achieve
      { offline, latency: latency << 2 }
    )
  }

  /**
   * Intercept XMLHttpRequest request
   * @private
   */
  hookXhr() {
    const instance = this;
    const xhrSend = XMLHttpRequest.prototype.send;
    const xhrOpen = XMLHttpRequest.prototype.open;
    const xhrSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
    XMLHttpRequest.prototype.open = function (...params) {
      const [method, url] = params;
      this.$$request = {
        method,
        url: getAbsolutePath(url),
        requestId: instance.getRequestId(),
        headers: Network.getDefaultHeaders(),
      };

      xhrOpen.apply(this, params);
    };

    XMLHttpRequest.prototype.send = function (data) {
      window.setTimeout(() => {
        xhrSend.call(this, data);
      }, instance.networkConditions.latency || 0)

      const request = this.$$request;
      const { requestId, url, method } = request;
      if (method.toLowerCase() === 'post') {
        request.postData = data;
        request.hasPostData = !!data;
      }

      if (!this.__cdp) {
        instance.requestData[requestId] = request.postData
        instance.socketSend({
          method: Event.requestWillBeSent,
          params: {
            requestId,
            request,
            documentURL: location.href,
            timestamp: getTimestamp(),
            wallTime: Date.now(),
            initiator: this.__initiator === undefined ? {
              type: 'script',
              stack: {
                callFrames: Runtime.getCallFrames().filter(it => {
                  return !(
                    it.functionName === 'XMLHttpRequest.send' && ((it.url || '').lastIndexOf(cdpJsName) > -1)
                  )
                }),
              }
            } : this.__initiator,
            type: this.$$requestType || 'XHR',
          }
        });

        this.addEventListener('readystatechange', () => {
          // After the request is completed, get the http response header
          if (this.readyState === 4) {
            // 未由 Access-Control-Expose-Headers 指定的请求头，可能读取不到
            const headers = this.getAllResponseHeaders();

            const responseHeaders = Network.formatResponseHeader(headers);
            const responseType = this.responseType || (this.getResponseHeader('Content-Type') || '').split(';')[0];
            const responseLength = getResponseLength(this);
            instance.sendNetworkEvent({
              requestId,
              url: getAbsolutePath(url),
              headers: responseHeaders,
              blockedCookies: [],
              headersText: headers,
              type: this.$$requestType || 'XHR',
              mimeType: responseType,
              status: this.status,
              statusText: this.statusText,
              encodedDataLength: responseLength,
            });
          }
        });
  
        this.addEventListener('load', () => {
          if (this.responseType === '' || this.responseType === 'text') {
            // Cache the response result after the request ends, which will be used when getResponseBody
            instance.responseData.set(this.$$request.requestId, this.responseText);
          }
        });
      }
    };

    XMLHttpRequest.prototype.setRequestHeader = function (key, value) {
      if (this.$$request) {
        this.$$request.headers[key] = String(value);
      }
      xhrSetRequestHeader.call(this, key, value);
    };
  }

  /**
   * Intercept Fetch requests
   * @private
   */
  hookFetch() {
    const instance = this;
    window.fetch = function (request, initConfig = {}) {
      let url;
      let method;
      let data = '';
      // When request is a string, it is the requested url
      if (typeof request === 'string' || request instanceof URL) {
        url = request;
        method = initConfig.method || 'get';
        data = initConfig.body;
      } else {
        // Otherwise it is a Request object
        ({ url, method } = request);
      }

      url = getAbsolutePath(url);
      const requestId = instance.getRequestId();
      const sendRequest = {
        url,
        method,
        requestId,
        headers: Network.getDefaultHeaders(),
      };

      if (method.toLowerCase() === 'post') {
        sendRequest.postData = data;
        sendRequest.hasPostData = !!data;
      }

      instance.socketSend({
        method: Event.requestWillBeSent,
        params: {
          requestId,
          documentURL: location.href,
          timestamp: getTimestamp(),
          wallTime: Date.now(),
          type: 'Fetch',
          request: sendRequest,
        }
      });

      let oriResponse;
      return new Promise(function (r) {
        window.setTimeout(
          () => r(originFetch(request, initConfig)),
          instance.networkConditions.latency || 0
        )
      }).then(r => r).then((response) => {
        // Temporarily save the raw response to the request
        oriResponse = response;

        const { headers, status, statusText } = response;
        const responseHeaders = {};
        let headersText = '';
        headers.forEach((val, key) => {
          key = key2UpperCase(key);
          responseHeaders[key] = val;
          headersText += `${key}: ${val}\r\n`;
        });

        const contentType = headers.get('Content-Type') || "";
        let responseLength = Number(headers.get('Content-Length'));
        let responseText = '';
        if (['application/json', 'application/javascript', 'text/plain', 'text/html', 'text/css'].some(type => contentType.includes(type))) {
          responseText = response.clone().text();
        }
        responseLength = responseLength || responseText.length;
        instance.sendNetworkEvent({
          url,
          requestId,
          status,
          statusText,
          headersText,
          type: 'Fetch',
          mimeType: (contentType || '').split(';')[0],
          blockedCookies: [],
          headers: responseHeaders,
          encodedDataLength: responseLength,
        });

        return responseText;
      })
        .then((responseBody) => {
          instance.responseData.set(requestId, responseBody);
          // Returns the raw response to the request
          return oriResponse;
        })
        .catch((error) => {
          instance.sendNetworkEvent({
            url,
            requestId,
            blockedCookies: [],
            type: 'Fetch',
          });
          throw error;
        });
    };
  }

  reloadImage2(src, resovle, reject) {
    const xhr = new XMLHttpRequest();
    xhr.__cdp = true;
    xhr.onload = function () {
      const length = getResponseLength(xhr);
      const reader = new FileReader();
      reader.onloadend = function () {
        var base64 = reader.result;
        resovle({ base64, length });
      };
      reader.onerror = reject;
      reader.readAsDataURL(this.response);
    };
    xhr.open('GET', src, true);
    xhr.responseType = 'blob';
    xhr.send();
  }

  /*
    // Compatible with Internet Explorer
    reloadImage(src, resovle, reject) {
      const xhr = new XMLHttpRequest();
      xhr.__cdp = true;
      xhr.onload = function () {
        const length = getResponseLength(xhr);
        const url = URL.createObjectURL(this.response);
        const image = new Image();
        image.onload = function () {
          const canvas = document.createElement('canvas');
          canvas.width = image.width;
          canvas.height = image.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(image, 0, 0, image.width, image.height);
          const base64 = canvas.toDataURL('image/png');
          resovle({ base64, length });
          URL.revokeObjectURL(url);
        };
        image.onerror = reject;
        image.src = url;
      };
      xhr.open('GET', src, true);
      xhr.responseType = 'blob';
      xhr.send();
    }
  */

  getImageBase64(image) {
    return new Promise((resovle, reject) => {
      const onLoad = () => {
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext('2d');
        try {
          ctx.drawImage(image, 0, 0, image.width, image.height);
          const dataURL = canvas.toDataURL('image/png');
          resovle(dataURL)
        } catch {
          this.reloadImage2(image.src, resovle, reject)
        }
      }
      if (image.complete) {
        onLoad();
      } else {
        image.addEventListener('load', onLoad);
        image.addEventListener('error', reject);
      }
    });
  }

  /**
   * @private
   * report image request for Network panel
   */
  reportImageNetwork() {
    const imgUrls = new Set();

    const reportNetwork = (images) => {
      images.forEach(async (image) => {
        const url = image.src
        const requestId = this.getRequestId();

        try {
          const base64 = url.startsWith('data:image') ? url : await this.getImageBase64(image);

          this.responseData.set(requestId, {
            data: base64.split(',')[1],
            base64Encoded: true,
          });
        } catch (e) {
          console.log('cdp image', image, e.message)
          // nothing to do
        }

        this.send({
          method: Event.requestWillBeSent,
          params: {
            requestId,
            documentURL: location.href,
            timestamp: getTimestamp(),
            wallTime: Date.now(),
            type: 'Image',
            request: { method: 'GET', url },
          }
        });

        this.sendNetworkEvent({
          url,
          requestId,
          status: 200,
          statusText: '',
          headersText: '',
          type: 'Image',
          mimeType: 'image/png',
          blockedCookies: [],
          encodedDataLength: 0,
        });
      });
    };

    const getNewImages = () => {
      const images = [];
      Object.values(document.images).forEach(image => {
        const url = image.getAttribute('src');
        if (!imgUrls.has(url)) {
          imgUrls.add(url);
          images.push(image);
        }
      });
      return images;
    };

    const observerBodyMutation = () => {
      const observer = new MutationObserver(() => {
        const images = getNewImages();
        if (images.length) {
          reportNetwork(images);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
    };

    reportNetwork(getNewImages());
    observerBodyMutation();
  }

  /**
   * @private
   */
  sendNetworkEvent(params) {
    const {
      requestId, headers, headersText, type, mimeType, url,
      status, statusText, encodedDataLength,
    } = params;

    this.socketSend({
      method: Event.responseReceivedExtraInfo,
      params: { requestId, headers, blockedCookies: [], headersText },
    });

    this.socketSend({
      method: Event.responseReceived,
      params: {
        type,
        mimeType,
        requestId,
        timestamp: getTimestamp(),
        response: {
          url,
          status,
          statusText,
          headers,
          mimeType: mimeType || mime.getType(url)
        }
      },
    });

    setTimeout(() => {
      // loadingFinished event delay report
      this.socketSend({
        method: Event.loadingFinished,
        params: {
          requestId,
          encodedDataLength,
          timestamp: getTimestamp(),
        },
      });
    }, 10);
  }
};
