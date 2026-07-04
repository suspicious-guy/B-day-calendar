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
  else if (action === 'discuss-gift') {
    // Если кликнули «Обсудить подарок» на карточке друга
    const friendId = el.dataset.id;
    if (typeof openOrCreateChatForFriend === 'function') {
      await openOrCreateChatForFriend(friendId);
    }
  }
  else if (action === 'mark-read') {
    state.readNotifications.push(el.dataset.id);
    persist();
    renderTabs();
    renderContent();
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
  else if (action === 'open-admin') {
    openAdminModal();
  }
  else if (action === 'admin-toggle-role') {
    const login = el.dataset.login;
    const user = state.users.find(u => u.login === login);
    if (user && user.login !== state.currentLogin) {
      user.isAdmin = !user.isAdmin;
      persist();
      document.getElementById('adminModalBody').innerHTML = renderAdminModal();
      showToast(`✅ ${user.isAdmin ? 'Админ' : 'Пользователь'} — права обновлены`);
    }
  }
  else if (action === 'admin-delete-user') {
    const login = el.dataset.login;
    if (login === state.currentLogin) {
      showToast('❌ Нельзя удалить самого себя', 'error');
      return;
    }
    const user = state.users.find(u => u.login === login);
    if (!user) return;
    
    if (confirm(`Удалить пользователя "${user.name || login}"?`)) {
      state.users = state.users.filter(u => u.login !== login);
      state.friends = state.friends.filter(f => f.login !== login);
      state.allUsers = state.allUsers.filter(u => u.login !== login);
      persist();
      document.getElementById('adminModalBody').innerHTML = renderAdminModal();
      showToast(`✅ Пользователь удалён`);
    }
  }
  else if (action === 'admin-delete-group') {
  
  const groupId = el.dataset.id;
  console.log('ID группы:', groupId);
  console.log('Все группы:', state.groups);
  
  // Ищем группу по id
  const group = state.groups.find(g => g.id === groupId);
  console.log('Найдена группа:', group);
  
  if (!group) {
    showToast('❌ Группа не найдена', 'error');
    return;
  }
  
  if (confirm(`Удалить группу "${group.name}"?`)) {
    // Удаляем из state.groups
    state.groups = state.groups.filter(g => g.id !== groupId);
    console.log('Группы после удаления:', state.groups);
    
    // Удаляем из user.groups (если есть)
    state.user.groups = state.user.groups.filter(g => g !== group.name);
    
    // Сохраняем
    persist();
    
    // Обновляем админку
    const body = document.getElementById('adminModalBody');
    if (body) {
      body.innerHTML = renderAdminModal();
    }
    
    showToast(`✅ Группа "${group.name}" удалена`);
  }
}
  else if (action === 'admin-import-csv') {
    const fileInput = document.getElementById('csvFile');
    const file = fileInput?.files?.[0];
    if (!file) {
      showToast('❌ Выберите CSV-файл', 'error');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
      const text = e.target.result;
      const lines = text.split('\n').filter(line => line.trim());
      let imported = 0;
      
      lines.forEach(line => {
        const parts = line.split(',').map(s => s.trim());
        if (parts.length >= 3) {
          const login = parts[0];
          const password = parts[1];
          const name = parts[2];
          const birthdate = parts[3] || '2000-01-01';
          
          if (login && password && name && !state.users.find(u => u.login === login)) {
            state.users.push({ login, password, name, birthdate, isAdmin: false });
            if (!state.allUsers.find(u => u.login === login)) {
              state.allUsers.push({
                id: 'u-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
                login: login,
                name: name,
                birthdate: birthdate,
                groups: [],
                wishlist: [],
                color: '#' + Math.floor(Math.random()*16777215).toString(16)
              });
            }
            imported++;
          }
        }
      });
      
      persist();
      document.getElementById('adminModalBody').innerHTML = renderAdminModal();
      showToast(`✅ Импортировано ${imported} пользователей`);
    };
    reader.readAsText(file, 'UTF-8');
  }
  else if (action === 'admin-clear-all') {
    if (confirm('⚠️ Удалить все данные? Это действие необратимо!')) {
      if (confirm('Точно удалить всех пользователей, друзей, чаты и группы?')) {
        state.users = [{ 
          login: state.currentLogin, 
          password: 'admin', 
          name: state.user.name, 
          birthdate: state.user.birthdate,
          isAdmin: true 
        }];
        state.friends = [];
        state.allUsers = [];
        state.groups = [];
        state.chats = [];
        state.notifications = [];
        state.user.groups = [];
        state.user.wishlist = [];
        persist();
        document.getElementById('adminModalBody').innerHTML = renderAdminModal();
        showToast('🗑️ Все данные очищены');
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

// админовская часть

function openAdminModal() {
  const modal = document.getElementById('adminModal');
  const body = document.getElementById('adminModalBody');
  
  if (!modal || !body) return;
  
  body.innerHTML = renderAdminModal();
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeAdminModal() {
  const modal = document.getElementById('adminModal');
  if (!modal) return;
  
  modal.classList.remove('active');
  document.body.style.overflow = '';
}

document.getElementById('closeAdminModal')?.addEventListener('click', closeAdminModal);

document.getElementById('adminModal')?.addEventListener('click', function(e) {
  if (e.target === this) {
    closeAdminModal();
  }
});

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    closeAdminModal();
  }
});

function renderAdminModal() {
  if (state.user.isAdmin !== true) {
    return `
      <div style="text-align:center;padding:40px;">
        <h2>⛔ Доступ запрещён</h2>
        <p>У вас нет прав администратора.</p>
      </div>
    `;
  }

  const usersList = state.users || [];
  const usersHtml = usersList.map(u => `
    <tr>
      <td><strong>${escapeHtml(u.login)}</strong></td>
      <td>${escapeHtml(u.name || '—')}</td>
      <td>${u.birthdate ? formatBirthdayFull(u.birthdate) : '—'}</td>
      <td>
        ${u.isAdmin 
          ? '<span class="admin-badge">👑 Админ</span>' 
          : '<span class="user-badge">👤 Пользователь</span>'}
      </td>
      <td>
        ${u.login !== state.currentLogin ? `
          <button class="btn btn-small ${u.isAdmin ? 'btn-ghost' : 'btn-sage'}" 
                  data-action="admin-toggle-role" data-login="${u.login}">
            ${u.isAdmin ? 'Снять админа' : 'Сделать админом'}
          </button>
          <button class="btn btn-small btn-danger" 
                  data-action="admin-delete-user" data-login="${u.login}">
            ✕
          </button>
        ` : '<span style="color:#888;font-size:12px;">Это вы</span>'}
      </td>
    </tr>
  `).join('');

  const groupsList = state.groups || [];
  const groupsHtml = groupsList.map(g => `
    <tr>
      <td>${escapeHtml(g.name)}</td>
      <td>${g.members ? g.members.length : 0}</td>
      <td>
        <button class="btn btn-small btn-danger" 
                data-action="admin-delete-group" data-id="${g.id}">
          ✕ Удалить
        </button>
      </td>
    </tr>
  `).join('');

  return `
    <div class="admin-modal-content">
      <h2 class="admin-modal-title">⚙️ Админ-панель</h2>
      <p class="admin-modal-desc">Управление пользователями, группами и данными системы.</p>

      <!-- СТАТИСТИКА -->
      <div class="admin-stats">
        <div class="stat-card">
          <span class="stat-number">${usersList.length}</span>
          <span class="stat-label">Пользователей</span>
        </div>
        <div class="stat-card">
          <span class="stat-number">${state.friends ? state.friends.length : 0}</span>
          <span class="stat-label">Друзей</span>
        </div>
        <div class="stat-card">
          <span class="stat-number">${groupsList.length}</span>
          <span class="stat-label">Групп</span>
        </div>
      </div>

      <!-- ПОЛЬЗОВАТЕЛИ -->
      <div class="admin-section">
        <h3 class="admin-section-title">👥 Пользователи (${usersList.length})</h3>
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Логин</th>
                <th>Имя</th>
                <th>Дата рождения</th>
                <th>Роль</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              ${usersHtml || '<tr><td colspan="5">Нет пользователей</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>

      <!-- ГРУППЫ -->
      <div class="admin-section">
        <h3 class="admin-section-title">📂 Группы (${groupsList.length})</h3>
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Название</th>
                <th>Участников</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              ${groupsHtml || '<tr><td colspan="3">Нет групп</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>

      <!-- ИМПОРТ -->
      <div class="admin-section">
        <h3 class="admin-section-title">📥 Импорт пользователей</h3>
        <p class="admin-hint">Загрузите CSV-файл с пользователями (логин, пароль, имя, дата рождения)</p>
        <div class="admin-import-row">
          <input type="file" id="csvFile" accept=".csv">
          <button class="btn btn-primary btn-small" data-action="admin-import-csv">
            📤 Импортировать
          </button>
        </div>
      </div>

      <!-- ОЧИСТКА ДАННЫХ -->
      <div class="admin-section admin-danger">
        <h3 class="admin-section-title" style="color:#dc3545;">⚠️ Опасные действия</h3>
        <button class="btn btn-danger" data-action="admin-clear-all">
          🗑️ Очистить все данные
        </button>
        <span style="font-size:12px;color:#888;margin-left:12px;">Удаляет всех пользователей, друзей, чаты и группы</span>
      </div>
    </div>
  `;
}

loadState();
