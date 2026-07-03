/*
  Простое файловое хранилище чатов.
  На проде это стоит заменить на настоящую БД (SQLite/Postgres/Mongo),
  но для локального сервера и демо JSON-файла достаточно.
*/
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'chats.json');

// Сид, согласующийся с вашими id из data.js (chat-nikita, chat-ivan, ...),
// чтобы фронтенд мог сразу подключиться без миграции.
function seedChats() {
  return [
    {
      id: 'chat-nikita',
      type: 'direct',
      name: 'Никита Орлов',
      color: '#E8734A',
      participants: [],
      messages: [
        { id: 'm1', authorLogin: 'nikita', authorName: 'Никита Орлов', text: 'Привет! Скоро мой ДР, никому не говори 😄', time: '2026-07-01T18:22:00' },
        { id: 'm2', authorLogin: 'me', authorName: 'Вы', text: 'Уже думаем, что подарить)', time: '2026-07-01T18:25:00' }
      ]
    },
    {
      id: 'chat-ivan',
      type: 'direct',
      name: 'Иван Петров',
      color: '#6E8F74',
      participants: [],
      messages: [
        { id: 'm3', authorLogin: 'me', authorName: 'Вы', text: 'Может, скинемся на наушники из его списка?', time: '2026-06-29T12:10:00' }
      ]
    },
    {
      id: 'chat-group-972501',
      type: 'group',
      name: 'Группа 972501, ТГУ',
      color: '#4C6E8F',
      participants: [],
      messages: [
        { id: 'm4', authorLogin: 'olga', authorName: 'Ольга Смирнова', text: 'Народ, у Ивана ДР 10 июля, надо собраться', time: '2026-07-02T10:05:00' },
        { id: 'm5', authorLogin: 'dmitry', authorName: 'Дмитрий Волков', text: 'Го скинемся на наушники из вишлиста', time: '2026-07-02T10:12:00' },
        { id: 'm6', authorLogin: 'me', authorName: 'Вы', text: 'Я за, пишите кто сколько может', time: '2026-07-02T10:20:00' }
      ]
    },
    {
      id: 'chat-group-volley',
      type: 'group',
      name: 'Сборная по волейболу',
      color: '#A35FA3',
      participants: [],
      messages: [
        { id: 'm7', authorLogin: 'maria', authorName: 'Мария Соколова', text: 'Тренировка переносится на 19:00', time: '2026-07-02T08:40:00' }
      ]
    }
  ];
}

let cache = null;

async function ensureFile() {
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true });
  }
  if (!existsSync(DATA_FILE)) {
    await writeFile(DATA_FILE, JSON.stringify(seedChats(), null, 2), 'utf-8');
  }
}

async function load() {
  if (cache) return cache;
  await ensureFile();
  const raw = await readFile(DATA_FILE, 'utf-8');
  cache = JSON.parse(raw);
  return cache;
}

async function persist() {
  await writeFile(DATA_FILE, JSON.stringify(cache, null, 2), 'utf-8');
}

export async function getChats() {
  const chats = await load();
  return chats;
}

export async function getChatSummaries() {
  const chats = await load();
  return chats.map(c => ({
    id: c.id,
    type: c.type,
    name: c.name,
    color: c.color,
    lastMessage: c.messages[c.messages.length - 1] || null
  }));
}

export async function getChat(id) {
  const chats = await load();
  return chats.find(c => c.id === id) || null;
}

export async function createChat({ id, type, name, color }) {
  const chats = await load();
  if (chats.find(c => c.id === id)) return chats.find(c => c.id === id);
  const chat = { id, type, name, color, participants: [], messages: [] };
  chats.push(chat);
  await persist();
  return chat;
}

export async function addMessage(chatId, { authorLogin, authorName, text }) {
  const chats = await load();
  const chat = chats.find(c => c.id === chatId);
  if (!chat) return null;
  const message = {
    id: 'm' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    authorLogin,
    authorName,
    text,
    time: new Date().toISOString()
  };
  chat.messages.push(message);
  await persist();
  return message;
}