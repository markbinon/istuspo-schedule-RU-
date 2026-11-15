
const express = require('express');
const { randomUUID, createHash } = require('node:crypto');
const { authed } = require('./api/_store');

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

// Список из того же справочника, который использует распознавание.
app.get('/api/parse/groups', (req, res) => {
  res.set('Cache-Control', 'no-store');
  if (!authed(req)) return res.status(401).json({ error: 'Неверный пароль' });
  return res.json({ groups: parse.groups });
});

// Короткие HTTP-запросы вместо ожидания Gemini за прокси с лимитом ~60 с.
// Задачи хранятся в памяти одного Node-процесса и исчезают при перезапуске.
const parseJobs = new Map();
const JOB_TTL_MS = 10 * 60 * 1000;
function pruneJobs() {
  for (const [id, job] of parseJobs) {
    if (job.state === 'done' && Date.now() - job.finishedAt > JOB_TTL_MS) {
      parseJobs.delete(id);
    }
  }
}

app.get('/api/parse/jobs/:id', (req, res) => {
  res.set('Cache-Control', 'no-store');
  if (!authed(req)) return res.status(401).json({ error: 'Неверный пароль' });
  pruneJobs();
  const job = parseJobs.get(req.params.id);
  if (!job) {
    return res.status(404).json({ error: 'Задача потеряна: сервер перезапустился или результат устарел. Запустите распознавание заново.' });
  }
  if (job.state !== 'done') return res.status(202).json({ state: 'running' });
  return res.json({ state: 'done', resultStatus: job.result.status, result: job.result.body });
});

function startParseJob(req, res) {
  res.set('Cache-Control', 'no-store');
  if (!authed(req)) return res.status(401).json({ error: 'Неверный пароль' });
  const { image, media_type } = req.body || {};
  if (typeof image !== 'string' || !image.trim()) {
    return res.status(400).json({ error: 'Нет изображения' });
  }
  const requestId = req.headers['x-parse-request-id'];
  if (typeof requestId !== 'string' || !/^[a-zA-Z0-9-]{16,80}$/.test(requestId)) {
    return res.status(400).json({ error: 'Некорректный идентификатор запроса' });
  }
  const mediaType = media_type || 'image/jpeg';
  const fingerprint = createHash('sha256').update(image).update(String(mediaType)).digest('hex');
  pruneJobs();
  // При потере ответа повторный POST не создаёт ещё один платный вызов Gemini.
  const existing = [...parseJobs.values()].find(job => job.requestId === requestId);
  if (existing) {
    if (existing.fingerprint !== fingerprint) {
      return res.status(409).json({ error: 'Идентификатор запроса уже использован для другого фото' });
    }
    return res.status(202).json({ jobId: existing.id, state: existing.state });
  }
  if ([...parseJobs.values()].filter(job => job.state === 'running').length >= 2) {
    return res.status(429).json({ error: 'Сервер уже распознаёт два фото. Подождите и попробуйте снова.' });
  }
  if (parseJobs.size >= 50) {
    const oldestDone = [...parseJobs.values()].find(job => job.state === 'done');
    if (oldestDone) parseJobs.delete(oldestDone.id);
  }
  const job = { id: randomUUID(), requestId, fingerprint, state: 'running' };
  parseJobs.set(job.id, job);
  res.status(202).json({ jobId: job.id, state: job.state });
  const started = Date.now();
  Promise.resolve().then(() => parse.parseImage(image, mediaType)).then(result => {
    job.result = result;
  }).catch(error => {
    console.error('[PARSE JOB ERROR]', error);
    job.result = { status: 500, body: { error: 'Ошибка распознавания', details: error.message } };
  }).finally(() => {
    job.state = 'done';
    job.finishedAt = Date.now();
    console.log('[PARSE JOB]', job.id, 'HTTP', job.result.status, 'duration', Date.now() - started, 'ms');
  });
}

// Синхронный режим сохранён для старых клиентов; админка использует ?async=1.
app.post('/api/parse', async (req, res) => {
  if (req.query.async === '1') return startParseJob(req, res);
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
