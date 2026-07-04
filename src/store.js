import { db } from './db.js';

const insertChat = db.prepare(
  `INSERT INTO chats (id, type, name, color, friend_username, group_id) VALUES (?, ?, ?, ?, ?, ?)`
);
const findChatStmt = db.prepare(`SELECT * FROM chats WHERE id = ?`);
const allChatsStmt = db.prepare(`SELECT * FROM chats`);
const insertMessage = db.prepare(
  `INSERT INTO messages (chat_id, author_username, author_name, text, time) VALUES (?, ?, ?, ?, ?)`
);
const messagesForChatStmt = db.prepare(
  `SELECT * FROM messages WHERE chat_id = ? ORDER BY id ASC`
);
const lastMessageStmt = db.prepare(
  `SELECT * FROM messages WHERE chat_id = ? ORDER BY id DESC LIMIT 1`
);

function mapMessage(row) {
  return {
    id: 'm' + row.id,
    authorLogin: row.author_username,
    authorName: row.author_name,
    text: row.text,
    time: row.time
  };
}

export async function getChats() {
  return allChatsStmt.all().map(c => ({
    ...c,
    messages: messagesForChatStmt.all(c.id).map(mapMessage)
  }));
}

export async function getChatSummaries() {
  return allChatsStmt.all().map(c => {
    const last = lastMessageStmt.get(c.id);
    return {
      id: c.id,
      type: c.type,
      name: c.name,
      color: c.color,
      lastMessage: last ? mapMessage(last) : null
    };
  });
}

export async function getChat(id) {
  const chat = findChatStmt.get(id);
  if (!chat) return null;
  return { ...chat, messages: messagesForChatStmt.all(id).map(mapMessage) };
}

export async function createChat({ id, type, name, color, friendUsername, groupId }) {
  const existing = findChatStmt.get(id);
  if (existing) return getChat(id);
  insertChat.run(id, type || 'direct', name, color || '#6E8F74', friendUsername || null, groupId || null);
  return getChat(id);
}

export async function addMessage(chatId, { authorLogin, authorName, text }) {
  const chat = findChatStmt.get(chatId);
  if (!chat) return null;
  const time = new Date().toISOString();
  const info = insertMessage.run(chatId, authorLogin || null, authorName || null, text, time);
  return {
    id: 'm' + info.lastInsertRowid,
    authorLogin,
    authorName,
    text,
    time
  };
}