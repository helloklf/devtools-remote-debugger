const path = require('path');
const Koa = require('koa');
const KoaRouter = require('@koa/router');
const cors = require('@koa/cors');
const koaCompress = require('koa-compress');
const send = require('koa-send');
const notFound = require('./middleware/404');
const SocketServer = require('./socketServer');
const imageToBase64 = require('image-to-base64');

require('dotenv').config({
  path: path.resolve(process.cwd(), process.env.NODE_ENV === 'development' ? '.env.dev' : '.env'),
});

const { DEBUG_PREFIX, DEBUG_PORT } = process.env;

const compress = koaCompress({
  threshold: 2048,
  filter(contentType) {
    return ['application/javascript', 'application/json', 'text/css'].includes(contentType);
  },
  gzip: {
    flush: require('zlib').constants.Z_SYNC_FLUSH,
  },
  deflate: {
    flush: require('zlib').constants.Z_SYNC_FLUSH,
  },
  br: false,
});

async function start() {
  const app = new Koa();
  const wss = new SocketServer();
  const router = getRouter(wss.clients);

  app.use(cors())
    .use(notFound)
    .use(router)
    .use(compress);

  const server = app.listen(DEBUG_PORT, '0.0.0.0');
  wss.initSocketServer(server);

  console.log(`serve start at:  http://localhost:${DEBUG_PORT}\n\n`);
}

function getRouter(clients) {
  const getFilePath = function (path) {
    return path.replace(`${DEBUG_PREFIX}/`, '');
  }

  const router = new KoaRouter({ DEBUG_PREFIX });

  router.get('/', async (ctx) => {
    await send(ctx, getFilePath(ctx.path + "index.html"), {
      root: path.resolve(__dirname, '../../dist/page'),
    });
  });

  router.get('/index.html', async (ctx) => {
    await send(ctx, getFilePath(ctx.path), {
      root: path.resolve(__dirname, '../../dist/page'),
    });
  });

  router.get('/cdp_overrides.js', async (ctx) => {
    await send(ctx, getFilePath(ctx.path), {
      root: path.resolve(__dirname, '../client'),
    });
  });

  router.get('/dist/(.*)', async (ctx) => {
    await send(ctx, getFilePath(ctx.path));
  });

  router.get('/front_end/(.*)', async (ctx) => {
    await send(ctx, getFilePath(ctx.path).substring(10), {
      root: path.resolve(__dirname, '../../devtools-frontend-classical'),
      maxage: 30 * 24 * 60 * 60 * 1000,
    });
  });

  router.get('/front_end2/(.*)', async (ctx) => {
    await send(ctx, getFilePath(ctx.path).substring(10), {
      root: path.resolve(__dirname, '../../chrome-devtools-built@1.20251602.0/public'),
      maxage: 30 * 24 * 60 * 60 * 1000,
    });
  });

  router.get('/json', async (ctx) => {
    const targets = Object.values(clients).map((item) => {
      const { ws, ...data } = item;
      return data;
    })
      .sort((a, b) => b.time - a.time);

    ctx.body = { targets };
  });

  router.get('/image_base64', async (ctx) => {
    const { url } = ctx.query;
    try {
      const base64 = await imageToBase64(url);
      ctx.body = { base64 };
    } catch {
      ctx.body = { base64: '' };
    }
  });

  // Routing for the example page
  router.get('/example/(.*)', async (ctx) => {
    await send(ctx, getFilePath(ctx.path));
  });

  return router.routes();
}

start();
