import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'chats.json');

let cache = null;

async function ensureFile() {
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true });
  }
  if (!existsSync(DATA_FILE)) {
    await writeFile(DATA_FILE, JSON.stringify([], null, 2), 'utf-8');
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