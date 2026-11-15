
const express = require('express');

const app = express();

// Принимаем JSON
app.use(express.json({ limit: '25mb' }));

// Подключаем API
const replacements = require('./api/replacements');
const siteNotice = require('./api/site-notice');

// Проверяем GET
app.get('/api/parse', (req, res) => {
  res.status(200).json({
    ok: true,
    route: 'parse',
    method: 'GET'
  });
});

// ВРЕМЕННЫЙ ТЕСТ POST — без Gemini и Redis
app.post('/api/parse', (req, res) => {
  console.log('[TEST] POST reached Express');

  return res.status(200).json({
    ok: true,
    message: 'POST успешно дошёл до Express',
    bodyReceived: !!req.body
  });
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

// Запуск
const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server started on port ${PORT}`);
});
