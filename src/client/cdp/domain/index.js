import Dom from './dom';
import DomStorage from './dom-storage';
import CacheStorage from './cache-storage';
import DomDebugger from './dom-debugger';
import Storage from './storage';
import Overlay from './overlay';
import Runtime from './runtime';
import Page from './page';
import Network from './network';
import Css from './css';
import SourceDebugger from './debugger';
import Input from './input';
import protocol from './protocol';

export default class ChromeDomain {
  protocol = {};

  constructor(options) {
    this.registerProtocol(options);
    this.proxyAppendChild();
    this.proxyEventListeners();
  }

  /**
   * Execution CDP method
   * @public
   * @param {Object} message socket data
   */
  execute(message = {}) {
    const { id, method, params } = message;
    const methodCall = this.protocol[method];
    if (typeof methodCall !== 'function') return { id };

    return { id, result: methodCall(params) };
  }

  /**
   * @private
   */
  registerProtocol(options) {
    const domains = [
      new Dom(options),
      new DomDebugger(options),
      new DomStorage(options),
      new CacheStorage(options),
      new Storage(options),
      new Overlay(options),
      new Runtime(options),
      new Page(options),
      new Network(options),
      new Css(options),
      new SourceDebugger(options),
      new Input(options),
    ];

    domains.forEach((domain) => {
      const { namespace } = domain;
      const cmds = protocol[namespace];
      cmds.forEach((cmd) => {
        this.protocol[`${namespace}.${cmd}`] = domain[cmd].bind(domain);
      });
    });
  }

  proxyAppendChild() {
    const originHeadAppendChild = HTMLHeadElement.prototype.appendChild;
    const originBodyAppendChild = HTMLBodyElement.prototype.appendChild;

    const fetchSource = (node) => {
      const tag = node?.tagName?.toLowerCase();
      if (tag === 'link') {
        const url = node.getAttribute('href');
        const rel = node.getAttribute('rel');
        if (url && (!rel || rel === 'stylesheet')) {
          setTimeout(() => {
            this.protocol['CSS.getDynamicLink'](url);
          }, 300);
        }
      }

      if (tag === 'script' && node.getAttribute('src')) {
        node.addEventListener('load', () => {
          console.log('1231232', node.getAttribute('src'))
        })
        setTimeout(() => {
          this.protocol['Debugger.getDynamicScript'](node);
        }, 300);
      }
    };

    HTMLHeadElement.prototype.appendChild = function (node) {
      const result = originHeadAppendChild.call(this, node);
      fetchSource(node);
      return result;
    };
    HTMLBodyElement.prototype.appendChild = function (node) {
      const result = originBodyAppendChild.call(this, node);
      fetchSource(node);
      return result;
    };
  }

  proxyEventListener (eventTarget) {
    const originalAddEventListener = eventTarget.prototype.addEventListener;
    const originalRemoveEventListener = eventTarget.prototype.removeEventListener;
    const eventListenersMap = DomDebugger.eventListenersMap;

    /**
     * @type { EventTarget['addEventListener'] }
     */
    eventTarget.prototype.addEventListener = function(type, listener, optionOrUseCapture) {
      let options;
      if (typeof optionOrUseCapture === 'object' && optionOrUseCapture !== null) {
        options = optionOrUseCapture;
      } else {
        options = { capture: Boolean(optionOrUseCapture) };
      }

      const targetListeners = eventListenersMap.get(this) || {};
      if (!targetListeners[type]) {
        targetListeners[type] = [];
      }
      const data = {
        listener,
        once: options.once || false,
        passive: options.passive || false,
        capture: options.capture || false,
        useCapture: options.capture || false,
        type,
      };
      const callFrames = Runtime.getCallFrames(new Error('addEventListener'));
      for (let i = 0; i < callFrames.length; i++) {
        const callFrame = callFrames[i];
        if (callFrame.lineNumber && callFrame.columnNumber) {
          Object.assign(data, {
            // todo: get scriptId
            // scriptId: '1',
            lineNumber: callFrame.lineNumber,
            columnNumber: callFrame.columnNumber
          });
          break;
        }
      }
      targetListeners[type].push(data);
      eventListenersMap.set(this, targetListeners);

      return originalAddEventListener.apply(this, [type, listener, options]);
    };

    /**
     * @type { EventTarget['removeEventListener'] }
     */
    eventTarget.prototype.removeEventListener = function(type, listener, optionOrUseCapture) {
      let options;
      if (typeof optionOrUseCapture === 'object' && optionOrUseCapture !== null) {
        options = optionOrUseCapture;
      } else {
        options = { capture: Boolean(optionOrUseCapture) };
      }

      const targetListeners = eventListenersMap.get(this) || {};
      if (targetListeners[type]) {
        const index = targetListeners[type].findIndex(item =>
          item.listener === listener &&
          item.once === (options.once || false) &&
          item.passive === (options.passive || false) &&
          item.capture === (options.capture || false)
        );
        if (index > -1) {
          targetListeners[type].splice(index, 1);
          if (targetListeners[type].length === 0) {
            delete targetListeners[type];
          }
        }
      }
      eventListenersMap.set(this, targetListeners);

      return originalRemoveEventListener.apply(this, [type, listener, options]);
    };
  }

  /**
   * inject getEventListeners
   */
  proxyEventListeners() {
    this.proxyEventListener(EventTarget)
    this.proxyEventListener(HTMLElement)

    const eventListenersMap = DomDebugger.eventListenersMap;
    window.eventListenersMap = eventListenersMap;
    window.getEventListeners = function(target) {
      let listenersMap = {};
      if (eventListenersMap.has(target)) {
        listenersMap = Object.fromEntries(Object.entries(eventListenersMap.get(target)).map(([key, value]) => {
          return [key, value.map(v => {
            const { capture, listener, once, passive, type } = v;
            return { capture, listener, once, passive, type };
          })];
        }));
      }
      const events = Object.getOwnPropertyNames(
        HTMLElement.prototype
      ).filter(it => typeof it === 'string' && it.indexOf('on') === 0);
      events.forEach(event => {
        if (target[event]) {
          const type = event.substring(2);
          console.log(listenersMap[type]);
          const listeners = listenersMap[type] || [];
          listeners.push(target[event]);
          listenersMap[type] = listeners;
        }
      });
      return listenersMap;
    };
  }
};
