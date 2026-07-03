// events.js

document.getElementById('tabs').addEventListener('click', function(e) {
  const btn = e.target.closest('.tab-btn');
  if (!btn) return;
  state.activeTab = btn.dataset.tab;
  persist();
  renderTabs();
  renderContent();
});

document.getElementById('content').addEventListener('click', function(e) {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const action = el.dataset.action;
  
  if (action === 'add-group') {
    addGroup();
  } 
  else if (action === 'join-group') {
    joinGroup();
  } 
  else if (action === 'create-group') {
    createGroup();
  } 
  else if (action === 'remove-group') {
    const groupName = state.user.groups[Number(el.dataset.idx)];
    state.user.groups.splice(Number(el.dataset.idx), 1);
    
    const group = state.groups.find(g => g.name === groupName);
    if (group && group.members) {
      const idx = group.members.indexOf(state.user.id);
      if (idx > -1) group.members.splice(idx, 1);
    }
    
    persist();
    renderContent();
    showToast(`Вы покинули группу "${groupName}"`);
  } 
  else if (action === 'save-account') {
    saveAccount();
  } 
  else if (action === 'open-chat') {
    state.activeChatId = el.dataset.id;
    persist();
    renderContent();
  } 
  else if (action === 'send-msg') {
    sendMessage();
  } 
  else if (action === 'toggle-subscribe') {
    const f = findFriend(el.dataset.id);
    if (f) {
      f.subscribed = !f.subscribed;
      persist();
      renderTodayCard();
      renderTabs();
      renderContent(true);
    }
  } 
  else if (action === 'discuss-gift') {
    openOrCreateChatForFriend(el.dataset.id);
  } 
  else if (action === 'filter-alpha') {
    state.friendFilter = 'alpha';
    persist();
    renderContent(true);
  } 
  else if (action === 'filter-date') {
    state.friendFilter = 'date';
    persist();
    renderContent(true);
  } 
  else if (action === 'switch-subtab') {
    state.friendSubTab = el.dataset.subtab;
    persist();
    renderContent();
  } 
  else if (action === 'do-search') {
    const input = document.getElementById('searchInput');
    if (input) {
      state.searchQuery = input.value.trim();
      persist();
      renderContent();
    }
  } 
  else if (action === 'clear-search') {
    state.searchQuery = '';
    const input = document.getElementById('searchInput');
    if (input) input.value = '';
    persist();
    renderContent();
  } 
  else if (action === 'add-friend') {
    const friendId = el.dataset.id;
    const success = addFriendById(friendId);
    
    if (success) {
      const friendName = state.allUsers.find(u => u.id === friendId)?.name || 'Пользователь';
      showToast(`✅ ${friendName} добавлен в друзья!`);
      state.searchQuery = '';
      state.friendSearch = '';
      persist();
      renderContent();
      renderTodayCard();
      renderTabs();
    } else {
      showToast('❌ Не удалось добавить пользователя', 'error');
    }
  } 
  else if (action === 'remove-friend') {
    const friendId = el.dataset.id;
    const friendName = state.friends.find(f => f.id === friendId)?.name || 'Пользователь';
    
    if (confirm(`Удалить ${friendName} из друзей?`)) {
      const success = removeFriendById(friendId);
      if (success) {
        showToast(`✅ ${friendName} удалён из друзей`);
        persist();
        renderContent();
        renderTodayCard();
        renderTabs();
      }
    }
  }
});

function wireFriends() {
  const search = document.getElementById('friendSearch');
  if (search) {
    const newSearch = search.cloneNode(true);
    search.parentNode.replaceChild(newSearch, search);
    
    newSearch.addEventListener('input', function(e) {
      const query = e.target.value.trim();
      state.friendSearch = query;
      
      const content = document.getElementById('content');
      if (content) {
        const cursorPos = this.selectionStart;
        content.innerHTML = renderFriends();
        
        const newSearchInput = document.getElementById('friendSearch');
        if (newSearchInput) {
          newSearchInput.focus();
          newSearchInput.selectionStart = newSearchInput.selectionEnd = cursorPos;
        }
      }
    });
    
    if (state.friendSearch && state.friendSearch.length >= 2) {
      newSearch.dispatchEvent(new Event('input'));
    }
  }
}

function wireAccount() {
  const inp = document.getElementById('inpNewGroup');
  if (inp) {
    inp.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        joinGroup();
      }
    });
  }
}

function wireChats() {
  const body = document.getElementById('threadBody');
  if (body) body.scrollTop = body.scrollHeight;
  
  const msgInput = document.getElementById('msgInput');
  if (msgInput) {
    msgInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        sendMessage();
      }
    });
  }
}

function renderContent(skipWire) {
  const content = document.getElementById('content');
  if (state.activeTab === 'account') content.innerHTML = renderAccount();
  else if (state.activeTab === 'chats') content.innerHTML = renderChats();
  else if (state.activeTab === 'friends') content.innerHTML = renderFriends();
  else content.innerHTML = renderNotifications();

  if (!skipWire) {
    if (state.activeTab === 'account') wireAccount();
    if (state.activeTab === 'chats') wireChats();
    if (state.activeTab === 'friends') wireFriends();
  } else {
    if (state.activeTab === 'friends') wireFriends();
    if (state.activeTab === 'chats') wireChats();
  }
}

function render() {
  renderTodayCard();
  renderTabs();
  renderContent();
}

document.addEventListener('DOMContentLoaded', function() {
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      const input = e.target;
      if (input && input.id === 'searchInput') {
        e.preventDefault();
        const searchBtn = document.querySelector('[data-action="do-search"]');
        if (searchBtn) searchBtn.click();
      }
    }
  });
});

loadState();