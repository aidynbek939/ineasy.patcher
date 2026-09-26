require('dotenv').config();
const express = require('express');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { Telegraf } = require('telegraf');

const BOT_TOKEN = process.env.BOT_TOKEN;
const BOT_USERNAME = process.env.BOT_USERNAME || 'ineasy_4k_bot';
const PORT = process.env.PORT || 3000;
const ADMIN_ID = process.env.ADMIN_ID ? String(process.env.ADMIN_ID).trim() : null;
const DEFAULT_BALANCE = 2;
const CARD_INFO = '4400 4300 4955 5771\nИмя: Айдынбек Н.';

if (!BOT_TOKEN) {
  console.error('Не найден BOT_TOKEN. Скопируйте .env.example в .env и вставьте токен от @BotFather.');
  process.exit(1);
}

// --- Хранилище сессий авторизации (в памяти) ---
const sessions = new Map();

// --- Баланс видео по Telegram ID (в памяти) ---
const balances = new Map();

function getBalance(telegramId) {
  const key = String(telegramId);
  if (!balances.has(key)) balances.set(key, DEFAULT_BALANCE);
  return balances.get(key);
}

setInterval(() => {
  const now = Date.now();
  for (const [id, s] of sessions.entries()) {
    if (!s.authorized && now - s.createdAt > 30 * 60 * 1000) {
      sessions.delete(id);
    }
  }
}, 60 * 60 * 1000);

// --- Телеграм-бот ---
const bot = new Telegraf(BOT_TOKEN);

bot.start((ctx) => {
  const payload = ctx.startPayload ? ctx.startPayload.trim() : null;

  if (payload && payload.startsWith('buy_')) {
    const [, count, price] = payload.split('_');
    ctx.reply(
      `🛒 Купить ${count} видео за ${Number(price).toLocaleString('ru-RU')} тенге\n\n` +
      `💳 Способ оплаты:\n${CARD_INFO}\n\n` +
      `✅ После перевода отправьте сюда чек и ваш Telegram ID.\n\n` +
      `🔎 Как найти ваш Telegram ID?\nЗайдите на сайт, затем скопируйте ID, который указан в углу экрана.`
    );
    return;
  }

  const sessionId = payload;
  if (!sessionId || !sessions.has(sessionId)) {
    ctx.reply(
      'Похоже, ссылка устарела. Вернитесь на сайт и нажмите «Войти через Telegram» ещё раз.'
    );
    return;
  }

  const session = sessions.get(sessionId);
  session.authorized = true;
  session.telegramId = ctx.from.id;
  session.username = ctx.from.username || null;
  session.firstName = ctx.from.first_name || '';
  sessions.set(sessionId, session);

  ctx.reply('✅ Успешно авторизовались!\n\nЗайдите в сайт — вам там ждут.');
});

bot.command('addvideo', (ctx) => {
  if (!ADMIN_ID || String(ctx.from.id) !== ADMIN_ID) {
    return;
  }

  const parts = ctx.message.text.trim().split(/\s+/);
  const targetId = parts[1];
  const amount = parseInt(parts[2], 10);

  if (!targetId || !Number.isFinite(amount) || amount <= 0) {
    ctx.reply('Формат: /addvideo <telegram_id> <количество>\nНапример: /addvideo 123456789 10');
    return;
  }

  const current = getBalance(targetId);
  balances.set(String(targetId), current + amount);

  ctx.reply(`✅ Зачислено ${amount} видео пользователю ${targetId}.\nНовый баланс: ${balances.get(String(targetId))}`);
});

// --- Веб-сервер ---
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/session', (req, res) => {
  const sessionId = uuidv4();
  sessions.set(sessionId, { authorized: false, createdAt: Date.now() });
  res.json({
    sessionId,
    botLink: `https://t.me/${BOT_USERNAME}?start=${sessionId}`,
  });
});

app.get('/api/session/:id', (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) {
    return res.status(404).json({ error: 'session_not_found' });
  }
  res.json({
    authorized: session.authorized,
    telegramId: session.telegramId || null,
    username: session.username || null,
    firstName: session.firstName || null,
  });
});

app.get('/api/balance/:telegramId', (req, res) => {
  res.json({ balance: getBalance(req.params.telegramId) });
});

app.get('/api/buy-link/:count/:price', (req, res) => {
  const { count, price } = req.params;
  res.json({ url: `https://t.me/${BOT_USERNAME}?start=buy_${count}_${price}` });
});

const WEBHOOK_PATH = `/telegram-webhook/${BOT_TOKEN}`;
app.use(bot.webhookCallback(WEBHOOK_PATH));

app.listen(PORT, async () => {
  console.log(`Сайт запущен: http://localhost:${PORT}`);

  const publicUrl = process.env.RENDER_EXTERNAL_URL;

  if (publicUrl) {
    await bot.telegram.setWebhook(`${publicUrl}${WEBHOOK_PATH}`);
    console.log(`Бот @${BOT_USERNAME} слушает через вебхук: ${publicUrl}${WEBHOOK_PATH}`);
  } else {
    await bot.telegram.deleteWebhook();
    bot.launch();
    console.log(`Бот @${BOT_USERNAME} слушает команды (локальный polling)...`);
  }

  if (!ADMIN_ID) {
    console.log('⚠️  ADMIN_ID не задан — команда /addvideo для пополнения баланса работать не будет.');
  }
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
