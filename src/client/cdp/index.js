import uuid from 'string-random';
import ReconnectingWebSocket from 'reconnecting-websocket';
import { getAbsolutePath } from './common/utils';
import ChromeDomain from './domain/index';
import startWatch from './common/routerWatch';
import { Event } from './domain/protocol';

let DEBUG_HOST = process.env.DEBUG_HOST;
let DEBUG_PREFIX = process.env.DEBUG_PREFIX;

function getDocumentFavicon() {
  const links = document.head.querySelectorAll('link');
  const icon = Array.from(links).find((link) => {
    const rel = link.getAttribute('rel');
    return rel.includes('icon') || rel.includes('shortcut');
  });

  let iconUrl = '';
  if (icon) {
    iconUrl = getAbsolutePath(icon.getAttribute('href'));
  }

  return iconUrl;
}

function getQuery() {
  const search = new URLSearchParams();
  search.append('url', location.href);
  search.append('title', document.title);
  search.append('favicon', getDocumentFavicon());
  search.append('time', Date.now());
  search.append('ua', navigator.userAgent);
  return search.toString();
}

// debug id
function getId() {
  let id = sessionStorage.getItem('debug_id');
  if (!id) {
    id = uuid();
    sessionStorage.setItem('debug_id', id);
  }

  return id;
}

function initSocket() {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = DEBUG_HOST.replace(/^(http|https):\/\//ig, '');
  const socket = new ReconnectingWebSocket(`${protocol}//${host}${DEBUG_PREFIX}/client/${getId()}?${getQuery()}`);
  const domain = new ChromeDomain({ socket });

  socket.addEventListener('message', ({ data }) => {
    try {
      const message = JSON.parse(data);
      const ret = domain.execute(message);
      if (ret.result && ret.result instanceof Promise) {
        ret.result.then(result => {
          socket.send(JSON.stringify({
            ...ret,
            result
          }));
        })
      } else {
        socket.send(JSON.stringify(ret));
      }
    } catch (e) {
      console.log(e);
    }
  });


  startWatch((pageInfo) => {
    socket.send(JSON.stringify({
      method: Event.SOCKET_INFO_UPDATE,
      params: pageInfo
    }));
  });
  let heartbeat;
  socket.addEventListener('open', () => {
    // Heartbeat keep alive
    heartbeat = setInterval(() => {
      socket.send('{}');
    }, 10000);
  });
  socket.addEventListener('close', () => {
    clearInterval(heartbeat);
  });
  socket.addEventListener('error', () => {
    clearInterval(heartbeat);
  });
}

function keepScreenDisplay() {
  if (!navigator.wakeLock) return;

  navigator.wakeLock.request('screen').catch(() => { });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      navigator.wakeLock.request('screen').catch(() => { });
    }
  });
}

window.cdp = function (serverHost, invisible) {
  if (serverHost) {
    const { origin, pathname } = new URL(serverHost)
    DEBUG_HOST = origin
    DEBUG_PREFIX = pathname
  };

  const node = document.createElement('div');
  node.innerHTML = `<div style="background: #39a734;
color: #fff;
padding: 0.4em 0.5em;
position: fixed;
left: 0;
top: 0;
transform: scale(0.8);
border-radius: 0.4em;
margin: 0.2em;">
  <div>Debugger</div>
  <div style="font-size: 0.7em;">ID: ${getId()}</div>
</div>`;
  if (!invisible) {
    try {
      const addEle = () => document.body.appendChild(node);
      if (document.body) {
        addEle();
      } else {
        window.addEventListener('load', addEle);
      }
    } catch(e) {
      console.info('[Error] cdp', e.message);
    }
  }
  initSocket();
  keepScreenDisplay();
}
