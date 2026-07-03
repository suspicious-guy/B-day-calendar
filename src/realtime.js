/*
  Реализация real-time чата поверх WebSocket (ws).

  Протокол (JSON-сообщения в обе стороны):
    Клиент -> Сервер:
      { type: 'join',    chatId }                        // подписаться на комнату чата
      { type: 'leave',   chatId }                         // отписаться
      { type: 'message', chatId, text, authorLogin, authorName }  // отправить сообщение

    Сервер -> Клиент:
      { type: 'history',  chatId, messages }              // при join — вся история
      { type: 'message',  chatId, message }                // новое сообщение (рассылается всем в комнате)
      { type: 'error',    error }
*/
import { WebSocketServer } from 'ws';
import { getChat, addMessage, createChat } from './store.js';

// chatId -> Set<ws>
const rooms = new Map();

function joinRoom(chatId, ws) {
  if (!rooms.has(chatId)) rooms.set(chatId, new Set());
  rooms.get(chatId).add(ws);
}

function leaveRoom(chatId, ws) {
  rooms.get(chatId)?.delete(ws);
}

function leaveAllRooms(ws) {
  for (const set of rooms.values()) set.delete(ws);
}

function broadcast(chatId, payload) {
  const set = rooms.get(chatId);
  if (!set) return;
  const data = JSON.stringify(payload);
  for (const client of set) {
    if (client.readyState === client.OPEN) client.send(data);
  }
}

export function attachRealtime(httpServer) {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws) => {
    ws.on('message', async (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        ws.send(JSON.stringify({ type: 'error', error: 'bad_json' }));
        return;
      }

      if (msg.type === 'join') {
        const chat = await getChat(msg.chatId);
        if (!chat) {
          ws.send(JSON.stringify({ type: 'error', error: 'chat_not_found' }));
          return;
        }
        joinRoom(msg.chatId, ws);
        ws.send(JSON.stringify({ type: 'history', chatId: msg.chatId, messages: chat.messages }));
        return;
      }

      if (msg.type === 'leave') {
        leaveRoom(msg.chatId, ws);
        return;
      }

      if (msg.type === 'message') {
        const { chatId, text, authorLogin, authorName } = msg;
        if (!chatId || !text || !text.trim()) return;

        let chat = await getChat(chatId);
        if (!chat) {
          // на случай, если чат создаётся "на лету" (например, с карточки друга)
          chat = await createChat({ id: chatId, type: 'direct', name: authorName || 'Чат', color: '#6E8F74' });
        }

        const message = await addMessage(chatId, { authorLogin, authorName, text: text.trim() });
        broadcast(chatId, { type: 'message', chatId, message });
        return;
      }
    });

    ws.on('close', () => leaveAllRooms(ws));
  });

  return wss;
}