(function () {
  // Фронтенд отдаётся тем же сервером (public/), поэтому просто берём текущий origin.
  // Работает и локально (http://localhost:3001), и на реальном сервере (https://your-domain.com).
  const SERVER_URL = window.location.origin;
  const WS_PROTOCOL = window.location.protocol === 'https:' ? 'wss' : 'ws';
  // window.location.host уже включает в себя и IP/домен, и порт (например, 192.168.1.50:3001)
  const WS_URL = `${WS_PROTOCOL}://${window.location.host}/ws`;

  let socket = null;
  let onIncomingMessage = () => {};
  const joinedRooms = new Set();

  function connect() {
    if (socket && socket.readyState === WebSocket.OPEN) return;
    socket = new WebSocket(WS_URL);

    socket.addEventListener('open', () => {
      // если пересоздали соединение, переподписываемся на комнаты
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
      // простая реконнект-логика
      setTimeout(connect, 1500);
    });
  }

  connect();

  window.ChatClient = {
    // подписка на входящие сообщения / историю
    onMessage(cb) {
      onIncomingMessage = cb;
    },

    // получить список чатов (для отрисовки списка слева)
    async fetchChats() {
      const res = await fetch(`${SERVER_URL}/api/chats`);
      return res.json();
    },

    // получить полную историю чата (REST, на случай если WS ещё не готов)
    async fetchChat(chatId) {
      const res = await fetch(`${SERVER_URL}/api/chats/${chatId}`);
      if (!res.ok) return null;
      return res.json();
    },

    // создать чат (например, при "Обсудить подарок")
    async createChat(chat) {
      const res = await fetch(`${SERVER_URL}/api/chats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chat)
      });
      return res.json();
    },

    // подписаться на комнату чата, чтобы получать сообщения в реальном времени
    joinChat(chatId) {
      joinedRooms.add(chatId);
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'join', chatId }));
      }
    },

    leaveChat(chatId) {
      joinedRooms.delete(chatId);
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'leave', chatId }));
      }
    },

    // отправить сообщение — уйдёт всем подписанным клиентам мгновенно
    sendMessage(chatId, text, authorLogin, authorName) {
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