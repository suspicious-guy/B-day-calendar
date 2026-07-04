(function () {
  // ПЕРЕКЛЮЧАТЕЛЬ ДЛЯ ДЕБАГА
  // true  -> чаты берутся из локального chats.json
  // false -> сервер + WS
  const LOCAL_DEBUG_MODE = false;
  const LOCAL_CHATS_URL = 'chats.json';

  const SERVER_URL = window.location.origin;
  const WS_PROTOCOL = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const WS_URL = `${WS_PROTOCOL}://${window.location.host}/ws`;

  let socket = null;
  let onIncomingMessage = () => {};
  const joinedRooms = new Set();

  // ЛОКАЛЬНОЕ ХРАНИЛИЩЕ ЧАТОВ
  let localChats = null;

  async function loadLocalChats() {
    if (localChats) return localChats;
    const res = await fetch(LOCAL_CHATS_URL);
    const raw = await res.json();
    localChats = raw.map(c => ({
      ...c,
      members: c.members || c.participants || [],
      lastMessage: c.messages && c.messages.length
        ? { ...c.messages[c.messages.length - 1], authorLogin: c.messages[c.messages.length - 1].authorLogin }
        : null
    }));
    return localChats;
  }

  function findLocalChat(chatId) {
    return (localChats || []).find(c => c.id === chatId);
  }

  // СЕТЕВАЯ ЧАСТЬ
  function connect() {
    if (LOCAL_DEBUG_MODE) return;
    if (socket && socket.readyState === WebSocket.OPEN) return;
    socket = new WebSocket(WS_URL);

    socket.addEventListener('open', () => {
      joinedRooms.forEach(chatId => {
        socket.send(JSON.stringify({ type: 'join', chatId }));
      });
    });

    socket.addEventListener('message', (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'message') {
        onIncomingMessage(data.chatId, data.message);
      }
      if (data.type === 'history') {
        onIncomingMessage(data.chatId, null, data.messages);
      }
    });

    socket.addEventListener('close', () => {
      setTimeout(connect, 1500);
    });
  }

  connect();

  window.ChatClient = {
    onMessage(cb) {
      onIncomingMessage = cb;
    },

    async fetchChats() {
      if (LOCAL_DEBUG_MODE) {
        const chats = await loadLocalChats();
        return chats.map(c => ({
          id: c.id,
          type: c.type,
          name: c.name,
          color: c.color,
          members: c.members,
          friendId: c.friendId,
          lastMessage: c.lastMessage
        }));
      }
      const res = await fetch(`${SERVER_URL}/api/chats`);
      return res.json();
    },

    async fetchChat(chatId) {
      if (LOCAL_DEBUG_MODE) {
        await loadLocalChats();
        const chat = findLocalChat(chatId);
        return chat ? { ...chat } : null;
      }
      const res = await fetch(`${SERVER_URL}/api/chats/${chatId}`);
      if (!res.ok) return null;
      return res.json();
    },

    async createChat(chat) {
      if (LOCAL_DEBUG_MODE) {
        await loadLocalChats();
        localChats.push({ ...chat, lastMessage: chat.messages?.[chat.messages.length - 1] || null });
        return chat;
      }
      const res = await fetch(`${SERVER_URL}/api/chats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chat)
      });
      return res.json();
    },

    joinChat(chatId) {
      joinedRooms.add(chatId);
      if (LOCAL_DEBUG_MODE) return;
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'join', chatId }));
      }
    },

    leaveChat(chatId) {
      joinedRooms.delete(chatId);
      if (LOCAL_DEBUG_MODE) return;
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'leave', chatId }));
      }
    },

    sendMessage(chatId, text, authorLogin, authorName) {
      if (LOCAL_DEBUG_MODE) {
        const chat = findLocalChat(chatId);
        if (!chat) return;
        const message = {
          id: 'm-local-' + Date.now(),
          authorLogin,
          authorName,
          text,
          time: new Date().toISOString()
        };
        chat.messages.push(message);
        chat.lastMessage = message;
        onIncomingMessage(chatId, message);
        return;
      }
      if (!socket || socket.readyState !== WebSocket.OPEN) return;
      socket.send(JSON.stringify({
        type: 'message',
        chatId,
        text,
        authorLogin,
        authorName
      }));
    }
  };
})();