import BaseDomain from './domain';
import { getAbsolutePath } from '../common/utils';
import { Event } from './protocol';

export default class Debugger extends BaseDomain {
  namespace = 'Debugger';

  // collection of javascript scripts
  scripts = new Map(); // { id: { url, content } }

  // Unique id for javascript scripts
  scriptId = 0;

  /**
   * @public
   */
  async enable() {
    const scripts = await this.collectScripts();
    scripts.forEach(it => this.sendScriptParsed(it));
  }

  /**
   * Get the content of the js script file
   * @public
   * @param {Object} param
   * @param {Number} param.scriptId
   */
  getScriptSource({ scriptId }) {
    return {
      scriptSource: this.getScriptSourceById(scriptId)
    };
  }

  setScriptSource ({ scriptId, scriptSource }) {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        action: 'cdp_override_add',
        url: this.scripts.get(scriptId).url,
        content: scriptSource,
        contentType: ''
      })
    } else {
      console.info('Script source overrides need to be registered cdp_overrides.js (Worker Service)')
    }
  }

  sendScriptParsed({ scriptId, url, content }) {
    this.send({
      method: Event.scriptParsed,
      params: {
        url,
        scriptId,
        startColumn: 0,
        startLine: 0,
        endColumn: 999999,
        endLine: 999999,
        scriptLanguage: 'JavaScript',
        length: (content || '').length,
      }
    });
  }

  /**
   * fetch the source content of the dynamic script file
   * @public
   * @param {string} url script file url address
   */
  async getDynamicScript(script) {
    const url = script.src || script.getAttribute('src');
    const scriptId = this.getScriptId();
    const content = await this.fetchScriptSource(scriptId, getAbsolutePath(url));
    this.sendScriptParsed({ scriptId, url, content, isModule: script.isModule });
  }

  /**
   * Collect all scripts of the page
   * @private
   */
  async collectScripts() {
    const scriptElements = document.scripts;
    const ret = [];
    for (let script of scriptElements) {
      // Avoid getting script source code repeatedly when socket reconnects
      if (script.scriptId) {
        return;
      }
      const scriptId = this.getScriptId();
      script.scriptId = scriptId;
      const src = script.getAttribute('src');
      if (src) {
        const url = getAbsolutePath(src);
        const scriptInfo = { scriptId, url, isModule: script.isModule };
        ret.push(scriptInfo);
        scriptInfo.content = await this.fetchScriptSource(scriptId, url);
      }
    }
    return ret;
  }

  /**
   * Fetch javascript file source content
   * @private
   * @param {Number} scriptId javascript script unique id
   * @param {String} url javascript file url
   */
  fetchScriptSource(scriptId, url) {
    return new Promise((resovle) => {
      const xhr = new XMLHttpRequest();
      xhr.$$requestType = 'Script';
      xhr.__initiator = null;
      const onCompleted = (content) => {
        this.scripts.set(scriptId, {
          url,
          content: content
        });
        resovle(content);
      }
      xhr.onload = () => onCompleted(xhr.responseText);
      xhr.onerror = () => onCompleted('Cannot get script source code');
      xhr.open('GET', url);
      xhr.send();
    })
  }

  /**
   * Get javascript content
   * @private
   * @param {Object} param
   * @param {Number} param.scriptId javascript script unique id
   */
  getScriptSourceById(scriptId) {
    const script = this.scripts.get(scriptId)
    return script ? script.content : '';
  }

  /**
   * Get unique id of javascript script
   * @private
   */
  getScriptId() {
    this.scriptId += 1;
    return `${this.scriptId}`;
  }
};
