// Implemented CDP
export default {
  CSS: [
    'enable', 'getStyleSheetText', 'getMatchedStylesForNode', 'getComputedStyleForNode',
    'getInlineStylesForNode', 'addRule', 'createStyleSheet', 'setStyleTexts',  
    /* Note: Non-protocol api, for easy access to index.js by the bind object only */
    'getDynamicLink',
  ],
  Debugger: [
    'enable', 'getScriptSource', 'setScriptSource',
    /* Note: Non-protocol api, for easy access to index.js by the bind object only */
    'getDynamicScript'
  ],
  DOMStorage: ['enable', 'getDOMStorageItems', 'removeDOMStorageItem', 'clear', 'setDOMStorageItem'],
  Storage: ['getStorageKeyForFrame'],
  CacheStorage: ['requestCacheNames', 'requestEntries', 'requestCachedResponse', 'deleteCache', 'deleteEntry'],
  DOM: [
    'enable', 'getDocument', 'removeNode', 'requestChildNodes', 'requestNode', 'getOuterHTML',
    'setOuterHTML', 'setAttributesAsText', 'setInspectedNode', 'pushNodesByBackendIdsToFrontend',
    'performSearch', 'getSearchResults', 'discardSearchResults', 'getNodeForLocation', 'setNodeValue',
    'getBoxModel',
    'moveTo'
  ],
  DOMDebugger: ['getEventListeners'],
  Network: ['enable', 'getCookies', 'setCookie', 'deleteCookies', 'getResponseBody', 'getRequestPostData', 'emulateNetworkConditions'],
  Overlay: ['enable', 'highlightNode', 'hideHighlight', 'setInspectMode'],
  Page: ['enable', 'startScreencast', 'stopScreencast', 'getResourceTree', 'getResourceContent', 'getNavigationHistory', 'reload', 'navigate'],
  Runtime: ['enable', 'evaluate', 'getProperties', 'releaseObject', 'callFunctionOn', 'globalLexicalScopeNames', 'discardConsoleEntries'],
  Input: ['emulateTouchFromMouseEvent', 'dispatchKeyEvent']
};

export const Event = {
  SOCKET_INFO_UPDATE: '__SOCKET_INFO_UPDATE__',

  styleSheetAdded: 'CSS.styleSheetAdded',

  scriptParsed: 'Debugger.scriptParsed',

  domStorageItemAdded: 'DOMStorage.domStorageItemAdded',
  domStorageItemRemoved: 'DOMStorage.domStorageItemRemoved',
  domStorageItemsCleared: 'DOMStorage.domStorageItemsCleared',
  domStorageItemUpdated: 'DOMStorage.domStorageItemUpdated',

  setChildNodes: 'DOM.setChildNodes',
  childNodeCountUpdated: 'DOM.childNodeCountUpdated',
  childNodeInserted: 'DOM.childNodeInserted',
  childNodeRemoved: 'DOM.childNodeRemoved',
  attributeModified: 'DOM.attributeModified',
  attributeRemoved: 'DOM.attributeRemoved',
  characterDataModified: 'DOM.characterDataModified',

  requestWillBeSent: 'Network.requestWillBeSent',
  responseReceivedExtraInfo: 'Network.responseReceivedExtraInfo',
  responseReceived: 'Network.responseReceived',
  loadingFinished: 'Network.loadingFinished',

  screencastFrame: 'Page.screencastFrame',

  executionContextCreated: 'Runtime.executionContextCreated',
  consoleAPICalled: 'Runtime.consoleAPICalled',
  exceptionThrown: 'Runtime.exceptionThrown',

  nodeHighlightRequested: 'Overlay.nodeHighlightRequested',
  inspectNodeRequested: 'Overlay.inspectNodeRequested',
};
