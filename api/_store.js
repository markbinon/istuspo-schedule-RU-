
const find = (re) => {
  const k = Object.keys(process.env).find((n) => re.test(n));
  return k ? process.env[k] : undefined;
};

// Поддержка переменных Upstash и совместимых названий
const URL_ = (
  find(/^UPSTASH_REDIS_REST_URL$/) ||
  find(/^REST(_API)?_URL$/) ||
  ''
).trim().replace(/\/+$/, '');

const TOKEN = (
  find(/^UPSTASH_REDIS_REST_TOKEN$/) ||
  find(/^REST(_API)?_TOKEN$/) ||
  ''
).trim();

const KEY = 'schedule-replacements';
const NOTICE_KEY = 'site-notice';

async function load() {
  if (!URL_ || !TOKEN) {
    throw new Error('Redis не подключён: проверь UPSTASH_REDIS_REST_URL и UPSTASH_REDIS_REST_TOKEN');
  }

  const r = await fetch(`${URL_}/get/${KEY}`, {
    headers: {
      Authorization: `Bearer ${TOKEN}`
    }
  });

  if (!r.ok) {
    throw new Error(`Redis GET завершился с HTTP ${r.status}`);
  }

  let j;

  try {
    j = await r.json();
  } catch {
    throw new Error('Redis вернул некорректный JSON при чтении замен');
  }

  try {
    return j.result ? JSON.parse(j.result) : {};
  } catch {
    return {};
  }
}

async function save(obj) {
  if (!URL_ || !TOKEN) {
    throw new Error('Redis не подключён: проверь UPSTASH_REDIS_REST_URL и UPSTASH_REDIS_REST_TOKEN');
  }

  const r = await fetch(`${URL_}/set/${KEY}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(obj)
  });

  if (!r.ok) {
    throw new Error(`Redis SET завершился с HTTP ${r.status}`);
  }
}

async function loadNotice() {
  if (!URL_ || !TOKEN) {
    throw new Error('Redis не подключён: проверь UPSTASH_REDIS_REST_URL и UPSTASH_REDIS_REST_TOKEN');
  }

  const r = await fetch(`${URL_}/get/${NOTICE_KEY}`, {
    headers: {
      Authorization: `Bearer ${TOKEN}`
    }
  });

  if (!r.ok) {
    throw new Error(`Redis GET завершился с HTTP ${r.status}`);
  }

  let j;

  try {
    j = await r.json();
  } catch {
    throw new Error('Redis вернул некорректный JSON при чтении уведомления');
  }

  try {
    return j.result
      ? JSON.parse(j.result)
      : {
          show: false,
          title: 'Временно не работает',
          sub: 'Ведутся технические работы. Загляните позже.'
        };
  } catch {
    return {
      show: false,
      title: 'Временно не работает',
      sub: 'Ведутся технические работы. Загляните позже.'
    };
  }
}

async function saveNotice(notice) {
  if (!URL_ || !TOKEN) {
    throw new Error('Redis не подключён: проверь UPSTASH_REDIS_REST_URL и UPSTASH_REDIS_REST_TOKEN');
  }

  const r = await fetch(`${URL_}/set/${NOTICE_KEY}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(notice)
  });

  if (!r.ok) {
    throw new Error(`Redis SET завершился с HTTP ${r.status}`);
  }
}

// Проверка пароля администратора
function authed(req) {
  const p = String(process.env.ADMIN_PASSWORD || '').trim();
  const h = String(req.headers['x-admin-password'] || '').trim();

  return Boolean(p) && h === p;
}

module.exports = {
  load,
  save,
  loadNotice,
  saveNotice,
  authed
};
