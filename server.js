require('dotenv').config();
const express = require('express');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { Telegraf } = require('telegraf');

const BOT_TOKEN = process.env.BOT_TOKEN;
const BOT_USERNAME = process.env.BOT_USERNAME || 'ineasy_4k_bot';
const PORT = process.env.PORT || 3000;

if (!BOT_TOKEN) {
  console.error('Не найден BOT_TOKEN. Скопируйте .env.example в .env и вставьте токен от @BotFather.');
  process.exit(1);
}

// --- Хранилище сессий авторизации (в памяти) ---
// sessionId -> { authorized: bool, telegramId, username, firstName, createdAt }
const sessions = new Map();

// Чистим старые неиспользованные сессии раз в час (старше 30 минут и не авторизованы)
setInterval(() => {
  const now = Date.now();
  for (const [id, s] of sessions.entries()) {
    if (!s.authorized && now - s.createdAt > 30 * 60 * 1000) {
      sessions.delete(id);
    }
  }
}, 60 * 60 * 1000);

// --- Телеграм-бот (long polling через telegraf) ---
const bot = new Telegraf(BOT_TOKEN);

bot.start((ctx) => {
  const sessionId = ctx.startPayload ? ctx.startPayload.trim() : null;

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

bot.launch();
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

// --- Веб-сервер ---
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Создать новую сессию авторизации
app.post('/api/session', (req, res) => {
  const sessionId = uuidv4();
  sessions.set(sessionId, { authorized: false, createdAt: Date.now() });
  res.json({
    sessionId,
    botLink: `https://t.me/${BOT_USERNAME}?start=${sessionId}`,
  });
});

// Проверить статус сессии (фронтенд опрашивает этот эндпоинт)
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

app.listen(PORT, () => {
  console.log(`Сайт запущен: http://localhost:${PORT}`);
  console.log(`Бот @${BOT_USERNAME} слушает команды...`);
});
