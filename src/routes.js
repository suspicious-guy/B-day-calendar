import { Router } from 'express';
import { getChatSummaries, getChat, createChat } from './store.js';
import { registerUser, verifyLogin, getUser } from './users.js';

export const router = Router();

/* ---------- Чаты (без изменений в поведении) ---------- */

// Список чатов (для левой панели)
router.get('/chats', async (req, res) => {
  const summaries = await getChatSummaries();
  res.json(summaries);
});

// Полная история конкретного чата
router.get('/chats/:id', async (req, res) => {
  const chat = await getChat(req.params.id);
  if (!chat) return res.status(404).json({ error: 'chat_not_found' });
  res.json(chat);
});

// Создать новый чат (например, при "Обсудить подарок" для друга без чата)
router.post('/chats', async (req, res) => {
  const { id, type, name, color, friendUsername, groupId } = req.body;
  if (!id || !name) return res.status(400).json({ error: 'id_and_name_required' });
  const chat = await createChat({ id, type: type || 'direct', name, color: color || '#6E8F74', friendUsername, groupId });
  res.status(201).json(chat);
});

/* ---------- Пользователи / авторизация (новое, на SQLite) ---------- */

// Регистрация
router.post('/register', async (req, res) => {
  const { username, name, password, birthdate } = req.body;
  if (!username || !name || !password || !birthdate) {
    return res.status(400).json({ error: 'missing_fields' });
  }
  try {
    const user = await registerUser({ username, name, password, birthdate });
    res.status(201).json(user);
  } catch (e) {
    if (e.message === 'username_taken') {
      return res.status(409).json({ error: 'username_taken' });
    }
    console.error(e);
    res.status(500).json({ error: 'server_error' });
  }
});

// Логин
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'missing_fields' });
  const user = await verifyLogin(username, password);
  if (!user) return res.status(401).json({ error: 'invalid_credentials' });
  res.json(user);
});

// Получить данные текущего пользователя по логину (для восстановления сессии)
router.get('/users/:username', async (req, res) => {
  const user = getUser(req.params.username);
  if (!user) return res.status(404).json({ error: 'user_not_found' });
  res.json(user);
});
import { searchUsersInDb } from './users.js'; // Не забудьте импортировать!

// Поиск пользователей в БД
router.get('/users/search', async (req, res) => {
  const { query, currentUser } = req.query;
  
  if (!query || query.length < 2) {
    return res.json([]); // Не ищем, если запрос слишком короткий
  }
  
  try {
    const users = await searchUsersInDb(query, currentUser || '');
    res.json(users);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server_error' });
  }
});