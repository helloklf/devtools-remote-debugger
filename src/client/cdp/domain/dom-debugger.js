import BaseDomain from './domain';
import { getObjectById, objectFormat } from '../common/remoteObject';
import nodes from '../common/nodes';

export default class DomDebugger extends BaseDomain {
  namespace = 'DOMDebugger';

  /**
   * @type { WeakMap<EventTarget, { [key: string]: (AddEventListenerOptions & { listener: Function, type: string, scriptId?: string, lineNumber?: number, columnNumber?: number })[] }> }
   * @static
   * @public
   */
  static eventListenersMap = new WeakMap();

  getFunctionLocation (func) {
    try {
      // 强制抛出一个错误以捕获堆栈信息
      throw new Error();
    } catch (e) {
      // 解析堆栈信息
      const stackLines = e.stack.split('\n');
      for (let line of stackLines) {
        if (line.includes(func.name)) {
          // 提取文件名、行号和列号
          const match = line.match(/(http[s]?:\/\/.*):(\d+):(\d+)/);
          if (match) {
            return {
              file: match[1],
              line: match[2],
              column: match[3]
            };
          }
        }
      }
    }
    return null;
  }

  /**
   * @public
   */
  getEventListeners({ objectId }) {
    const node = getObjectById(objectId);
    const result = {
      listeners: Object.values(DomDebugger.eventListenersMap.get(node) || {}).flat(1).map(v => {
        const copy = { ...v };
        // listener -> handler
        delete copy.listener;
        copy.handler = copy.originalHandler = objectFormat(v.listener);
        // capture -> useCapture
        delete copy.capture;
        // TODO: Get a real scriptId. Make sure devtools can locate the source code correctly, otherwise the handler will not be displayed
        copy.scriptId = '1'
        copy.backendNodeId = nodes.getIdByNode(node);
        return copy;
      })
    };
    const events = Object.getOwnPropertyNames(
      HTMLElement.prototype
    ).filter(it => typeof it === 'string' && it.indexOf('on') === 0);
    const listeners = result.listeners
    events.forEach(event => {
      if (node[event]) {
        const type = event.substring(2);
        listeners.push({
          ...target[event],
          type
        });
      }
    });
    console.log('getEventListeners', node, objectId, listeners)
    return result
  }
}
