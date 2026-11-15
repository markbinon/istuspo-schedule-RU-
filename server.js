
const express = require('express');
const path = require('path');

const app = express();

// Принимаем JSON, включая фотографии в Base64
app.use(express.json({ limit: '25mb' }));

// Подключаем API
const parse = require('./api/parse');
const replacements = require('./api/replacements');
const siteNotice = require('./api/site-notice');

// Проверка доступности маршрута распознавания
app.get('/api/parse', (req, res) => {
  res.status(200).json({
    ok: true,
    route: 'parse',
    method: 'GET'
  });
});

// Основной маршрут распознавания фотографий

app.post('/api/parse', async (req, res) => {
  console.log('[PARSE TEST] POST RECEIVED');

  try {
    console.log('[PARSE TEST] Body received');

    if (!req.body) {
      return res.status(400).json({
        stage: 'body',
        error: 'Request body is empty'
      });
    }

    console.log('[PARSE TEST] Calling parse.js');

    await parse(req, res);

    console.log('[PARSE TEST] parse.js finished');

  } catch (error) {
    console.error('[PARSE TEST] ERROR:', error);

    if (!res.headersSent) {
      return res.status(500).json({
        stage: 'express_handler',
        error: error.message || String(error)
      });
    }
  }
});


// Остальные API
app.all('/api/replacements', replacements);
app.all('/api/site-notice', siteNotice);

// Раздаём файлы сайта
app.use(express.static(__dirname));

// Неизвестные API
app.use('/api', (req, res) => {
  res.status(404).json({
    error: 'API endpoint not found'
  });
});

// Обработка ошибок Express
app.use((error, req, res, next) => {
  console.error('[SERVER ERROR]', error);

  if (!res.headersSent) {
    res.status(500).json({
      error: 'Внутренняя ошибка сервера',
      details: error.message
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server started on port ${PORT}`);
});
