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

document.getElementById('tabs').addEventListener('click', e=>{
  const btn = e.target.closest('.tab-btn');
  if(!btn) return;
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
      
      if (f.subscribed) {
        updateNotificationsForFriend(f);
      } else {
        removeNotificationsForFriend(f.id);
      }
      
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
        removeNotificationsForFriend(friendId);
        showToast(`✅ ${friendName} удалён из друзей`);
        persist();
        renderContent();
        renderTodayCard();
        renderTabs();
      }
    }
  } 
  else if (action === 'add-wishlist') {
    addWishlistItem();
  } 
  else if (action === 'remove-wishlist') {
    const idx = Number(el.dataset.idx);
    removeWishlistItem(idx);
  } 
  else if (action === 'open-friend-profile') {
    const friendId = el.dataset.id;
    openFriendProfileModal(friendId);
  } 
  else if (action === 'switch-tab') {
    state.activeTab = el.dataset.tab;
    persist();
    renderTabs();
    renderContent();
  }
  else if(action==='logout') logout();
  else if (action === 'save-notification-settings') {
    const checkboxes = document.querySelectorAll('.setting-checkbox input[type="checkbox"]');
    const selectedDays = [];
    checkboxes.forEach(cb => {
      if (cb.checked) {
        selectedDays.push(Number(cb.dataset.day));
      }
    });
    
    if (selectedDays.length === 0) {
      showToast('❌ Выберите хотя бы один период', 'error');
      return;
    }
    
    state.notificationSettings.daysBefore = selectedDays.sort((a,b)=>b-a);
    persist();
    
    // Обновляем уведомления
    refreshNotifications();
    renderContent();
    showToast('✅ Настройки сохранены!', 'success');
  }
  else if (action === 'refresh-notifications') {
    refreshNotifications();
    renderContent();
    showToast('🔄 Уведомления обновлены', 'success');
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
  
  const wishInput = document.getElementById('inpNewWishlist');
  if (wishInput) {
    wishInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        addWishlistItem();
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

function updateNotificationsForFriend(friend) {
  const days = daysUntilBirthday(friend.birthdate);
  
  const existingIndex = state.notifications.findIndex(n => n.friendId === friend.id);
  if (existingIndex > -1) {
    state.notifications.splice(existingIndex, 1);
  }
  
  let type = 'upcoming';
  let text = '';
  
  if (days === 0) {
    type = 'today';
    text = `🎉 Сегодня день рождения у ${friend.name}!`;
  } else if (days === 1) {
    type = 'upcoming';
    text = `⏰ Завтра день рождения у ${friend.name}!`;
  } else if (days <= 7) {
    type = 'upcoming';
    text = `⏰ Через ${days} дней день рождения у ${friend.name}`;
  } else if (days < 0) {
    type = 'past';
    const daysAgo = Math.abs(days);
    text = `📅 ${daysAgo} дней назад был день рождения у ${friend.name}`;
  } else {
    text = `📅 День рождения у ${friend.name} через ${days} дней`;
  }
  
  const notification = {
    id: 'notif-' + Date.now() + '-' + friend.id,
    friendId: friend.id,
    type: type,
    text: text,
    receivedAt: new Date().toISOString()
  };
  
  state.notifications.push(notification);
  persist();
  
  updateNotificationBadge();
}

function removeNotificationsForFriend(friendId) {
  state.notifications = state.notifications.filter(n => n.friendId !== friendId);
  persist();
  updateNotificationBadge();
}

function updateNotificationBadge() {
  const unreadCount = state.notifications.length;
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    if (btn.dataset.tab === 'notifications') {
      const existingBadge = btn.querySelector('.badge');
      if (existingBadge) existingBadge.remove();
      
      if (unreadCount > 0) {
        const badge = document.createElement('span');
        badge.className = 'badge';
        badge.textContent = unreadCount;
        btn.appendChild(badge);
      }
    }
  });
}

function checkAllNotifications() {
  state.friends.forEach(friend => {
    if (friend.subscribed) {
      const days = daysUntilBirthday(friend.birthdate);
      
      const existingIndex = state.notifications.findIndex(n => n.friendId === friend.id);
      
      if (days === 0 && existingIndex === -1) {
        const notification = {
          id: 'notif-' + Date.now() + '-' + friend.id,
          friendId: friend.id,
          type: 'today',
          text: `🎉 Сегодня день рождения у ${friend.name}!`,
          receivedAt: new Date().toISOString()
        };
        state.notifications.push(notification);
        showToast(`🎉 Сегодня день рождения у ${friend.name}!`, 'success');
      } else if (days === 1 && existingIndex === -1) {
        const notification = {
          id: 'notif-' + Date.now() + '-' + friend.id,
          friendId: friend.id,
          type: 'upcoming',
          text: `⏰ Завтра день рождения у ${friend.name}!`,
          receivedAt: new Date().toISOString()
        };
        state.notifications.push(notification);
        showToast(`⏰ Завтра день рождения у ${friend.name}!`, 'warning');
      } else if (days >= 2 && days <= 7 && existingIndex === -1) {
        const notification = {
          id: 'notif-' + Date.now() + '-' + friend.id,
          friendId: friend.id,
          type: 'upcoming',
          text: `⏰ Через ${days} дней день рождения у ${friend.name}`,
          receivedAt: new Date().toISOString()
        };
        state.notifications.push(notification);
      }
    }
  });
  
  persist();
  updateNotificationBadge();
  renderTabs();
}

function markNotificationsAsRead() {
  state.notifications = [];
  persist();
  updateNotificationBadge();
  renderTabs();
  renderContent();
}

// ----- МОДАЛЬНОЕ ОКНО ПРОФИЛЯ ДРУГА -----
function openFriendProfileModal(friendId) {
  const modal = document.getElementById('friendProfileModal');
  const body = document.getElementById('friendProfileBody');
  
  if (!modal || !body) return;
  
  body.innerHTML = renderFriendProfileModal(friendId);
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeFriendProfileModal() {
  const modal = document.getElementById('friendProfileModal');
  if (!modal) return;
  
  modal.classList.remove('active');
  document.body.style.overflow = '';
}

document.getElementById('closeProfileModal')?.addEventListener('click', closeFriendProfileModal);

document.getElementById('friendProfileModal')?.addEventListener('click', function(e) {
  if (e.target === this) {
    closeFriendProfileModal();
  }
});

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    closeFriendProfileModal();
  }
});

document.getElementById('friendProfileBody')?.addEventListener('click', function(e) {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const action = el.dataset.action;
  
  if (action === 'modal-toggle-subscribe') {
    const friendId = el.dataset.id;
    const f = findFriend(friendId);
    if (f) {
      f.subscribed = !f.subscribed;
      persist();
      
      if (f.subscribed) {
        updateNotificationsForFriend(f);
      } else {
        removeNotificationsForFriend(f.id);
      }
      
      renderTodayCard();
      renderTabs();
      renderContent(true);
      
      const body = document.getElementById('friendProfileBody');
      if (body) {
        body.innerHTML = renderFriendProfileModal(friendId);
      }
    }
  }
  else if (action === 'modal-discuss-gift') {
    const friendId = el.dataset.id;
    openOrCreateChatForFriend(friendId);
    closeFriendProfileModal();
  }
  else if (action === 'modal-open-chat') {
    state.activeChatId = el.dataset.id;
    state.activeTab = 'chats';
    persist();
    renderTabs();
    renderContent();
    closeFriendProfileModal();
  }
  else if (action === 'modal-remove-friend') {
    const friendId = el.dataset.id;
    const friendName = state.friends.find(f => f.id === friendId)?.name || 'Пользователь';
    
    if (confirm(`Удалить ${friendName} из друзей?`)) {
      const success = removeFriendById(friendId);
      if (success) {
        removeNotificationsForFriend(friendId);
        showToast(`✅ ${friendName} удалён из друзей`);
        persist();
        renderContent();
        renderTodayCard();
        renderTabs();
        closeFriendProfileModal();
      }
    }
  }
});

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
  
  setTimeout(function() {
    checkAllNotifications();
    updateNotificationBadge();
  }, 500);
});

initAuth();
loadState();

