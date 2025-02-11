import BaseDomain from './domain';
import { getObjectById, objectFormat } from '../common/remoteObject';
import nodes from '../common/nodes';
import Debugger from './debugger';

export default class DomDebugger extends BaseDomain {
  namespace = 'DOMDebugger';

  /**
   * @type { WeakMap<EventTarget, { [key: string]: (AddEventListenerOptions & { listener: Function, type: string, scriptId?: string, lineNumber?: number, columnNumber?: number })[] }> }
   * @static
   * @public
   */
  static eventListenersMap = new WeakMap();

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
        // fileName -> scriptId
        if (!copy.scriptId && copy.fileName) {
          // Get a real scriptId. Make sure devtools can locate the source code correctly, otherwise the handler will not be displayed
          const script = Debugger.getScriptByUrl(copy.fileName)
          if (script) {
            copy.scriptId = script.id
          }
        }
        copy.backendNodeId = nodes.getIdByNode(node);
        return copy;
      })
    };
    const listeners = result.listeners
    for (let prop of Object.getOwnPropertyNames(HTMLElement.prototype)) {
      if (prop.indexOf('on') === 0) {
        const type = prop.substring(0)
        if (node[type] && node[type] instanceof Function) {
            const handler = objectFormat(node[type]);
            listeners.push({
              backendNodeId: nodes.getIdByNode(node),
              // columnNumber: 0,
              // lineNumber: 0,
              // scriptId: '1',
              type, // type.substring(2), // onclick -> click
              handler,
              originalHandler: handler,
              // useCapture: false,
            })
        }
      }
    }
    // TODO: Anonymous code that cannot trace the source code also needs to find a way to construct a scriptId
    listeners.forEach(it => {
      if (!it.scriptId) {
        it.scriptId = '1'
        it.columnNumber = 1
        it.lineNumber = 1
      }
    })

    // console.log('getEventListeners', node, objectId, result)
    return result
  }
}
