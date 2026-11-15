
const express = require('express');

console.log('[START] Starting application...');
console.log('[START] Node:', process.version);
console.log('[START] PORT:', process.env.PORT || 3000);

process.on('uncaughtException', (error) => {
  console.error('[FATAL] Uncaught exception:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('[FATAL] Unhandled rejection:', error);
});

const app = express();

app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.url}`);
  next();
});

app.use(express.json({ limit: '25mb' }));

let parse;
let replacements;
let siteNotice;

try {
  console.log('[START] Loading API modules...');

  parse = require('./api/parse');
  console.log('[START] parse.js loaded:', typeof parse);

  replacements = require('./api/replacements');
  console.log('[START] replacements.js loaded:', typeof replacements);

  siteNotice = require('./api/site-notice');
  console.log('[START] site-notice.js loaded:', typeof siteNotice);

  if (typeof parse !== 'function') {
    throw new Error('api/parse.js does not export a function');
  }

  if (typeof replacements !== 'function') {
    throw new Error('api/replacements.js does not export a function');
  }

  if (typeof siteNotice !== 'function') {
    throw new Error('api/site-notice.js does not export a function');
  }
} catch (error) {
  console.error('[START ERROR] Failed to load API:', error);
  process.exit(1);
}

// Проверка работы сервера
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    status: 'running',
    service: 'istuspo-schedule'
  });
});

app.get('/api/parse', (req, res) => {
  res.json({
    ok: true,
    route: 'parse',
    method: 'GET'
  });
});

// Распознавание фотографий
app.post('/api/parse', async (req, res) => {
  const started = Date.now();

  console.log('[PARSE] POST received');
  console.log('[PARSE] Body exists:', !!req.body);
  console.log('[PARSE] Image exists:', !!req.body?.image);
  console.log('[PARSE] Image size:', req.body?.image?.length || 0);

  try {
    console.log('[PARSE] Starting recognition');

    await parse(req, res);

    console.log('[PARSE] Handler finished in', Date.now() - started, 'ms');

    if (!res.headersSent) {
      console.error('[PARSE] Handler did not send a response');
      res.status(500).json({
        error: 'Обработчик распознавания не вернул ответ'
      });
    }
  } catch (error) {
    console.error('[PARSE ERROR]', error.stack || error);

    if (!res.headersSent) {
      res.status(500).json({
        error: 'Ошибка распознавания',
        details: error.message || String(error)
      });
    }
  }
});

app.all('/api/replacements', replacements);
app.all('/api/site-notice', siteNotice);

// Статические файлы
app.use(express.static(__dirname));

// Неизвестные API
app.use('/api', (req, res) => {
  res.status(404).json({
    error: 'API endpoint not found',
    path: req.path
  });
});

// Обработка ошибок Express
app.use((error, req, res, next) => {
  console.error('[SERVER ERROR]', error.stack || error);

  if (!res.headersSent) {
    res.status(error.status || 500).json({
      error: 'Внутренняя ошибка сервера',
      details: error.message || String(error)
    });
  }
});

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`[START SUCCESS] Server listening on ${PORT}`);
});

server.on('error', (error) => {
  console.error('[SERVER LISTEN ERROR]', error);
});
