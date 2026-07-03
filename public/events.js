function renderContent(skipWire){
  const content = document.getElementById('content');
  if(state.activeTab==='account') content.innerHTML = renderAccount();
  else if(state.activeTab==='chats') content.innerHTML = renderChats();
  else if(state.activeTab==='friends') content.innerHTML = renderFriends();
  else content.innerHTML = renderNotifications();

  if(!skipWire){
    if(state.activeTab==='account') wireAccount();
    if(state.activeTab==='chats') wireChats();
    if(state.activeTab==='friends') wireFriends();
  } else {
    if(state.activeTab==='friends') wireFriends();
    if(state.activeTab==='chats') wireChats();
  }
}

function render(){
  renderTodayCard();
  renderTabs();
  renderContent();
}

document.getElementById('tabs').addEventListener('click', async e => {
  const btn = e.target.closest('.tab-btn');
  if (!btn) return;
  
  const targetTab = btn.dataset.tab;
  
  // Перед переходом в чаты — скачиваем актуальный список с сервера
  if (targetTab === 'chats') {
    try {
      if (typeof loadChatsList === 'function') {
        await loadChatsList();
      }
    } catch (err) {
      console.error("Ошибка загрузки чатов с сервера:", err);
    }
  }

  state.activeTab = targetTab;
  persist();
  renderTabs();
  renderContent();
});

document.getElementById('content').addEventListener('click', async e => { // добавили async
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const action = el.dataset.action;

  if(action==='add-group') addGroup();
  else if(action==='remove-group'){
    state.user.groups.splice(Number(el.dataset.idx),1);
    renderContent();
  }
  else if(action==='add-wishlist') addWishlistItem();
  else if(action==='remove-wishlist'){
    state.user.wishlist.splice(Number(el.dataset.idx),1);
    renderContent();
  }
  else if(action==='save-account') saveAccount();
  if (action === 'open-chat') {
    const chatId = el.dataset.id;
    state.activeChatId = chatId;
    persist();
    if (typeof openChat === 'function') {
      await openChat(chatId); // Ждем загрузки истории чата с сервера
    } else {
      renderContent();
    }
  }
  else if (action === 'send-msg') {
    if (typeof sendMessage === 'function') {
      sendMessage(); // вызываем отправку на сервер
    }
  }
  else if(action==='toggle-subscribe'){
    const f = findFriend(el.dataset.id);
    f.subscribed = !f.subscribed;
    persist();
    renderTodayCard();
    renderTabs();
    renderContent(true);
  }
  else if (action === 'discuss-gift') {
    // Если кликнули «Обсудить подарок» на карточке друга
    const friendId = el.dataset.id;
    if (typeof openOrCreateChatForFriend === 'function') {
      await openOrCreateChatForFriend(friendId);
    }
  }
  else if(action==='filter-alpha'){ state.friendFilter='alpha'; persist(); renderContent(true); }
  else if(action==='filter-date'){ state.friendFilter='date'; persist(); renderContent(true); }
  else if(action==='mark-read'){
    state.readNotifications.push(el.dataset.id);
    persist();
    renderTabs();
    renderContent();
  }
  else if(action==='logout') logout();
});

initAuth();