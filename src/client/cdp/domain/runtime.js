import ErrorStackParser from 'error-stack-parser';
import { objectFormat, objectRelease, getObjectProperties, getObjectById } from '../common/remoteObject';
import BaseDomain from './domain';
import { Event } from './protocol';

const callsite = require('callsite');

export const cdpJsName = (function() {
  const me = document.currentScript;
  const src = me.src;
  return src.substring(src.lastIndexOf('/') + 1);
})()

export default class Runtime extends BaseDomain {
  namespace = 'Runtime';

  cacheConsole = [];

  cacheError = [];

  isEnable = false;

  socketSend = (type, data) => {
    if (type === 'console') {
      this.cacheConsole.push(data);
    } else if (type === 'error') {
      this.cacheError.push(data);
    }
    if (this.isEnable) {
      this.send(data);
    }
  };

  /**
   * set Chrome Command Line Api
   *
   * In older versions of Electron,
   * you might see the printout of the following function as:
   * ```js
   * // console.log($x):
   * $x(xpath, [startNode]) { [Command Line API] }
   * ```
   * @static
   */
  static setCommandLineApi() {
    window.$_ = undefined;

    if (typeof window.clear !== 'function') {
      window.clear = () => console.clear();
    }

    if (typeof window.copy !== 'function') {
      window.copy = object => {
        function fallbackCopyTextToClipboard(text) {
          if (typeof document !== 'object') {
            console.error('Copy text failed, running environment is not a browser');
          }
          const textArea = document.createElement('textarea');
          textArea.value = text;
          textArea.style.position = 'fixed';
          textArea.style.top = 0;
          textArea.style.left = 0;
          textArea.style.width = '1px';
          textArea.style.height = '1px';
          textArea.style.padding = 0;
          textArea.style.border = 'none';
          textArea.style.outline = 'none';
          textArea.style.boxShadow = 'none';
          textArea.style.background = 'transparent';
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          try {
            const successful = document.execCommand('copy');
            if (!successful) console.error('Unable to copy using execCommand');
          } catch (err) {
            console.error('Unable to copy using execCommand:', err);
          }
          document.body.removeChild(textArea);
        }
        const str = String(object);
        if ('clipboard' in navigator) {
          navigator.clipboard.writeText(str).catch(() => {
            fallbackCopyTextToClipboard(str);
          });
        } else {
          fallbackCopyTextToClipboard(str);
        }
      };
    }

    if (typeof window.dir !== 'function') {
      window.dir = object => console.dir(object);
    }

    if (typeof window.dirxml !== 'function') {
      window.dirxml = object => console.dirxml(object);
    }

    if (typeof window.keys !== 'function') {
      window.keys = object => Object.keys(object);
    }

    if (typeof window.values !== 'function') {
      window.values = object => Object.values(object);
    }

    if (typeof window.table !== 'function') {
      window.table = object => console.table(object);
    }
  }

  constructor(options) {
    super(options);
    this.hookConsole();
    this.listenError();
  }

  /**
   * Get call stack
   * @static
   * @param {Error} error
   */
  static getCallFrames(error) {
    let callFrames = [];
    if (error) {
      callFrames = ErrorStackParser.parse(error).map(frame => ({
        ...frame,
        url: frame.fileName,
      }));
      // Safari does not support captureStackTrace
    } else if (Error.captureStackTrace) {
      callFrames = callsite().map(val => {
        const frame = {
          functionName: val.getFunctionName(),
          lineNumber: val.getLineNumber(),
          columnNumber: val.getColumnNumber(),
          url: val.getFileName(),
        };
        return frame;
      });
    } else {
      callFrames = ErrorStackParser.parse(new Error()).map(frame => ({
        ...frame,
        url: frame.fileName,
      }));
    }

    return callFrames.filter(it => it.functionName !== 'Runtime.getCallFrames');
  }

  globalLexicalScopeNames () {
    return {
      names: Object.getOwnPropertyNames(window)
    }
  }

  /**
   * @public
   */
  enable() {
    this.isEnable = true;
    this.cacheConsole.forEach(data => this.send(data));
    this.cacheError.forEach(data => this.send(data));

    this.send({
      method: Event.executionContextCreated,
      params: {
        context: {
          id: 1,
          name: 'top',
          origin: location.origin,
        }
      }
    });
    Runtime.setCommandLineApi();
  }

  /**
   * script execution
   * @public
   * @param {Object} param
   * @param {String} param.expression expression string
   * @param {Boolean} param.generatePreview whether to generate a preview
   */
  evaluate({ expression, generatePreview }) {
    try {
      // Modifying the scope to the global scope enables variables defined
      // with var to be accessible globally.
      // eslint-disable-next-line
      const res = window.eval(expression);
      // chrome-api
      window.$_ = res;
      return {
        result: objectFormat(res, { preview: generatePreview }),
      };
    } catch (error) {
      console.error('evaluate', error);
      return {
        exceptionDetails: {
          text: error.message,
          exception: objectFormat(error),
        }
      };
    }
  }

  /**
   * Get object properties
   * @public
   */
  getProperties(params) {
    return {
      result: getObjectProperties(params),
    };
  }

  /**
   * release object
   * @public
   */
  releaseObject(params) {
    objectRelease(params);
  }

  discardConsoleEntries () {
    this.cacheConsole = []
    this.cacheError = []
  }

  /**
   * Intercept method of console object
   * @private
   */
  hookConsole() {
    const methods = {
      log: 'log',
      debug: 'debug',
      info: 'info',
      error: 'error',
      warn: 'warning',
      dir: 'dir',
      dirxml: 'dirxml',
      table: 'table',
      trace: 'trace',
      clear: 'clear',
      group: 'startGroup',
      groupCollapsed: 'startGroupCollapsed',
      groupEnd: 'endGroup',
      // assert: 'assert',
      // profile: 'profile',
      // profileEnd: 'profileEnd',
      // count: 'count',
      // timeEnd: 'timeEnd',
    };

    Object.keys(methods).forEach((key) => {
      const nativeConsoleFunc = window.console[key];
      window.console[key] = (...args) => {
        nativeConsoleFunc?.(...args);
        const data = {
          method: Event.consoleAPICalled,
          params: {
            type: methods[key],
            args: args.map(arg => objectFormat(arg, { preview: true })),
            executionContextId: 1,
            timestamp: Date.now(),
            stackTrace: {
              // processing call stack
              callFrames: ['error', 'warn', 'trace', 'assert'].includes(key) ? Runtime.getCallFrames().slice(1) : [],
            }
          }
        };
        this.socketSend('console', data);
      };
    });
  }

  /**
   * Global error monitor
   * @private
   */
  listenError() {
    const exceptionThrown = (error) => {
      const data = {
        method: Event.exceptionThrown,
        params: {
          timestamp: Date.now(),
          exceptionDetails: {
            text: 'Uncaught',
            exception: {
              type: 'object',
              subtype: 'error',
              className: error ? error.name : 'Error',
              description: error ? error.stack : 'Script error.',
            },
            stackTrace: {
              callFrames: Runtime.getCallFrames(error)
            },
          }
        }
      };
      this.socketSend('error', data);
    };

    window.addEventListener('error', e => exceptionThrown(e.error));
    window.addEventListener('unhandledrejection', e => exceptionThrown(e.reason));
  }

  callFunctionOn({ functionDeclaration, objectId, arguments: args, silent }) {
    /** @type {Function} */
    // eslint-disable-next-line no-eval
    const fun = eval(`(() => ${functionDeclaration})()`);
    if (Array.isArray(args)) {
      args = args.map(v => {
        if ('value' in v) return v.value;
        if ('objectId' in v) return getObjectById(v.objectId);
        return undefined;
      });
    }
    let result;
    let error;
    try {
      result = fun.apply(objectId ? getObjectById(objectId) : null, args);
    } catch (err) {
      error = err;
    }
    if (silent === true) {
      return {
        result: objectFormat(result),
        exceptionDetails: error && {
          text: error.message,
          exception: objectFormat(error),
        }
      }
    } else {
      console.error(error);
      return {
        result: objectFormat(result),
        exceptionDetails: error && {
          text: error.message,
          exception: objectFormat(error),
        }
      }
    }
  }
};
