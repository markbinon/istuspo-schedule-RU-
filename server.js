
const express = require('express');

const express = require('express');

const app = express();

app.use(express.json({ limit: '25mb' }));

// Подключаем все API
const parse = require('./api/parse');
const replacements = require('./api/replacements');
const siteNotice = require('./api/site-notice');

// Проверка GET
app.get('/api/parse', (req, res) => {
  res.json({
    ok: true,
    route: 'parse',
    method: 'GET'
  });
});

// Настоящее распознавание фотографий
app.post('/api/parse', async (req, res) => {
  console.log('[PARSE] POST received');

  try {
    console.log('[PARSE] Body received:', !!req.body);
    console.log('[PARSE] Starting recognition');

    await parse(req, res);

    console.log('[PARSE] Handler finished');
  } catch (error) {
    console.error('[PARSE ERROR]', error);

    if (!res.headersSent) {
      res.status(500).json({
        error: 'Ошибка распознавания',
        details: error.message || String(error)
      });
    }
  }
});

// Остальные API
app.all('/api/replacements', replacements);
app.all('/api/site-notice', siteNotice);

// Статические файлы сайта
app.use(express.static(__dirname));

// Неизвестные API
app.use('/api', (req, res) => {
  res.status(404).json({
    error: 'API endpoint not found'
  });
});

// Общая обработка ошибок
app.use((error, req, res, next) => {
  console.error('[SERVER ERROR]', error);

  if (!res.headersSent) {
    res.status(500).json({
      error: 'Внутренняя ошибка сервера',
      details: error.message || String(error)
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server started on port ${PORT}`);
});
