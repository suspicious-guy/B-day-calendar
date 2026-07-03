import { Router } from 'express';
import { getChatSummaries, getChat, createChat } from './store.js';

export const router = Router();

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
  const { id, type, name, color } = req.body;
  if (!id || !name) return res.status(400).json({ error: 'id_and_name_required' });
  const chat = await createChat({ id, type: type || 'direct', name, color: color || '#6E8F74' });
  res.status(201).json(chat);
});