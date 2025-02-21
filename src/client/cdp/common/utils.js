import ErrorStackParser from "error-stack-parser";

/**
 * get absolute path
 * @param {String} url
 */
export function getAbsolutePath(url) {
  if (!url || typeof url !== 'string') return '';
  const a = document.createElement('a');
  a.href = url;
  return a.href;
}

export function key2UpperCase(key) {
  return key.replace(/^\S|-[a-z]/g, s => s.toUpperCase());
}

export function isMatches(element, selector) {
  // When some selectors in the safair kernel cannot be parsed, calling the matches method will throw an exception, which is captured here
  try {
    if (element.matches) {
      return element.matches(selector);
    }
    // deprecated
    if (element.webkitMatchesSelector) {
      return element.webkitMatchesSelector(selector);
    }
    if (element.mozMatchesSelector) {
      return element.mozMatchesSelector(selector);
    }
  } catch {
    return false;
  }
}

export function isMobile() {
  return /ios|iphone|ipod|android/.test(navigator.userAgent.toLowerCase());
}

export function isElement(node) {
  return node instanceof Element;
}

export function loadScript(url) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.onload = resolve;
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

export function escapeRegString(string) {
  return string.replace(/[\\$*+?.^|(){}[\]]/g, '\\$&');
}

export function getResponseLength (xhr) {
  let len = Number(xhr.getResponseHeader('Content-Length'));
  if (!len) {
    if (xhr.responseType === '' || xhr.responseType === 'text') {
      len = xhr.responseText.length;
    } else if (xhr.responseType === 'arraybuffer') {
      len = xhr.response.byteLength;
    } else if (xhr.responseType === 'blob') {
      len = xhr.response.size;
    }
  }

  return len;
}

export function getFunctionLocation (func, before) {
  // 解析堆栈信息
  let stackLines = ErrorStackParser.parse(new Error())
  /*
  [
    {
        columnNumber: 93310,
        fileName: ".../dist/cdp.js",
        functionName: "e.addEventListener",
        lineNumber: 2,
        source: "    at e.addEventListener (.../cdp.js:2:93310)"
    },
    ...
  ]
  */

  if (before) {
    stackLines = stackLines.slice(stackLines.findIndex(it => it.functionName && it.functionName.indexOf(`.${before}`) > -1) + 1)
  }
  if (func) {
  const fun = func.name;
    if (fun) {
      return stackLines.find(it => it.functionName && /{fun}$/.test(it.functionName))
    } else {
      return stackLines.find(it => !it.functionName)
    }
  }
  return stackLines[0]
}

export function throttle(func, wait) {
  let lastTime = 0;
  return function(...args) {
      const now = Date.now();
      if (now - lastTime >= wait) {
          lastTime = now;
          func.apply(this, args);
      }
  };
}
