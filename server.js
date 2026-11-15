
const express = require('express');
const path = require('path');

const app = express();

// Принимаем JSON, включая фотографии в Base64
app.use(express.json({ limit: '25mb' }));

// Подключаем существующие API
const parse = require('./api/parse');
const replacements = require('./api/replacements');
const siteNotice = require('./api/site-notice');

app.post('/api/parse', parse);

app.all('/api/replacements', replacements);

app.all('/api/site-notice', siteNotice);

// Раздаём файлы сайта
app.use(express.static(__dirname));

// Для неизвестных адресов API возвращаем JSON,
// а не главную страницу сайта
app.use('/api', (req, res) => {
  res.status(404).json({
    error: 'API endpoint not found'
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server started on port ${PORT}`);
});
