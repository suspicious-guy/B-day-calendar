/*Sidebar*/
function renderTodayCard(){
  const subscribedFriends = state.friends.filter(f => f.subscribed);
  let upcomingHtml;
  
  if(subscribedFriends.length === 0){
    upcomingHtml = `
      <div class="upcoming-empty">Подпишитесь на друзей, чтобы видеть напоминания здесь</div>
    `;
  } else {
    const subscribedUpcoming = subscribedFriends
      .map(f=>({f, days:daysUntilBirthday(f.birthdate)}))
      .sort((a,b)=>a.days-b.days)[0];
    
    if(subscribedUpcoming){
      upcomingHtml = `
        <div class="upcoming-name">${escapeHtml(subscribedUpcoming.f.name)}</div>
        <div class="upcoming-when">${countdownLabel(subscribedUpcoming.days)}</div>`;
    } else {
      upcomingHtml = `<div class="upcoming-empty">Подпишитесь на друзей, чтобы видеть напоминания здесь</div>`;
    }
  }

  const monthName = MONTHS_NOM[TODAY.getMonth()];
  const weekday = TODAY.toLocaleDateString('ru-RU',{weekday:'long'});

  document.getElementById('todayCard').innerHTML = `
    <div class="day-num">${TODAY.getDate()} ${MONTHS[TODAY.getMonth()]}</div>
    <div class="day-meta">${weekday}, ${monthName.toLowerCase()} ${TODAY.getFullYear()}</div>
    <div class="divider"></div>
    <div class="upcoming-label">Ближайший день рождения</div>
    ${upcomingHtml}
  `;
}

function renderTabs(){
  const upcomingCount = state.friends.filter(f=>f.subscribed && daysUntilBirthday(f.birthdate)<=7).length;
  document.querySelectorAll('.tab-btn').forEach(btn=>{
    const tab = btn.dataset.tab;
    btn.classList.toggle('active', state.activeTab===tab);
    let extra = '';
    if(tab==='notifications' && state.notifications.length){
      extra = `<span class="badge">${state.notifications.length}</span>`;
    }
    if(tab==='chats' && state.chats.length > 0){
      const unreadCount = state.chats.reduce((sum, chat) => {
        const unread = chat.messages.filter(m => !m.mine && m.author !== 'Система').length;
        return sum + unread;
      }, 0);
      if(unreadCount > 0) {
        extra = `<span class="badge">${unreadCount}</span>`;
      }
    }
    const icon = btn.querySelector('.ico').outerHTML;
    const label = {account:'Аккаунт', chats:'Чаты', friends:'Друзья', notifications:'Уведомления'}[tab];
    btn.innerHTML = `${icon}${label}${extra}`;
  });
}

/*Account*/
function renderAccount(){
  const u = state.user;
  const hasData = u.name || u.birthdate || u.groups.length > 0;
  const allGroups = state.groups || [];
  
  return `
    <div class="page-head">
      <div class="eyebrow">Профиль</div>
      <h1 class="page-title">Мой аккаунт</h1>
      <p class="page-desc">${hasData ? 'Ваши данные видят друзья — это помогает им не пропустить ваш день рождения.' : 'Заполните профиль, чтобы друзья могли узнавать о вашем дне рождения 🎉'}</p>
    </div>
    <div class="account-grid">
      <div class="panel form-block">
        <div class="field">
          <label for="inpName">Имя</label>
          <input type="text" id="inpName" placeholder="Введите ваше имя" value="${escapeHtml(u.name)}">
        </div>
        <div class="field">
          <label for="inpDate">Дата рождения</label>
          <input type="date" id="inpDate" value="${u.birthdate}">
        </div>
        <div class="field">
          <label>Группы</label>
          <div class="chip-row" id="groupChips">
            ${u.groups.length > 0 
              ? u.groups.map((g,i)=>`
                  <span class="chip">
                    ${escapeHtml(g)}
                    <button data-action="remove-group" data-idx="${i}">✕</button>
                  </span>
                `).join('')
              : '<span style="font-size:13px;color:var(--muted)">Групп пока нет</span>'}
          </div>
          <div class="group-actions">
            <div class="add-group-row">
              <input type="text" id="inpNewGroup" placeholder="Название группы" list="groupSuggestions">
              <datalist id="groupSuggestions">
                ${allGroups.map(g => `<option value="${escapeHtml(g.name)}">`).join('')}
              </datalist>
              <button class="btn btn-ghost btn-small" data-action="join-group">Добавить</button>
              <button class="btn btn-primary btn-small" data-action="create-group">Создать</button>
            </div>
          </div>
          ${allGroups.length > 0 ? `
            <div style="margin-top:8px;font-size:12px;color:#888;">
              Существующие группы: ${allGroups.map(g => escapeHtml(g.name)).join(', ')}
            </div>
          ` : ''}
        </div>
        <div class="save-row">
          <button class="btn btn-primary" data-action="save-account">Сохранить изменения</button>
          <span class="saved-msg" id="savedMsg">Сохранено ✓</span>
        </div>
      </div>
      <div class="panel profile-card">
        <div class="avatar-big">${u.name ? initials(u.name) : '👤'}</div>
        <div class="p-name">${u.name ? escapeHtml(u.name) : '<span style="color:#aaa;">Имя не указано</span>'}</div>
        <div class="p-date">${u.birthdate ? `🎂 ${formatBirthdayFull(u.birthdate)}` : '<span style="color:#aaa;">Дата не указана</span>'}</div>
        <div class="p-groups">
          ${u.groups.length > 0 
            ? u.groups.map(g=>`<span>${escapeHtml(g)}</span>`).join('')
            : '<span style="color:#aaa;">Нет групп</span>'}
        </div>
        ${!hasData ? '<div class="profile-hint">✨ Заполните профиль, чтобы друзья могли вас найти</div>' : ''}
      </div>
    </div>
  `;
}

function wireAccount(){
  const inp = document.getElementById('inpNewGroup');
  if(inp){
    inp.addEventListener('keydown', e=>{
      if(e.key === 'Enter'){ 
        e.preventDefault(); 
        // По умолчанию пытаемся добавить
        joinGroup();
      }
    });
  }
}

function addGroup(){
  const inp = document.getElementById('inpNewGroup');
  const val = inp.value.trim();
  if(!val) return;
  state.user.groups.push(val);
  inp.value='';
  renderContent();
}

function saveAccount(){
  state.user.name = document.getElementById('inpName').value.trim() || state.user.name;
  state.user.birthdate = document.getElementById('inpDate').value || state.user.birthdate;
  persist();
  renderTodayCard();
  renderContent();
  requestAnimationFrame(()=>{
    const msg = document.getElementById('savedMsg');
    if(msg){
      msg.classList.add('show');
      setTimeout(()=>msg.classList.remove('show'), 1800);
    }
  });
}

/*Chats*/
function lastMessage(chat){
  if(!chat.messages.length) return 'Нет сообщений';
  const m = chat.messages[chat.messages.length-1];
  return (m.mine ? 'Вы: ' : '') + m.text;
}

function renderChats(){
  if(state.chats.length === 0){
    return `
      <div class="page-head">
        <div class="eyebrow">Общение</div>
        <h1 class="page-title">Чаты</h1>
        <p class="page-desc">Здесь будут чаты групп и обсуждения подарков</p>
      </div>
      <div class="empty-state" style="padding:60px 20px;text-align:center;">
        <div style="font-size:48px;margin-bottom:16px;">💬</div>
        <h3 style="color:#333;margin-bottom:8px;">Нет чатов</h3>
        <p style="color:#888;">
          Чаты появляются автоматически при:<br>
          • Создании или присоединении к группе<br>
          • Нажатии "Обсудить подарок" на странице друга
        </p>
      </div>
    `;
  }

  const sorted = [...state.chats].sort((a,b)=>{
    const at = a.messages.length ? new Date(a.messages[a.messages.length-1].time) : 0;
    const bt = b.messages.length ? new Date(b.messages[b.messages.length-1].time) : 0;
    return bt - at;
  });

  const listHtml = sorted.map(c=>{
    const isGroupChat = c.type === 'group';
    const isGiftChat = c.friendId && c.type === 'group';
    const memberCount = c.members ? c.members.length : 0;
    const chatIcon = isGiftChat ? '🎁' : (isGroupChat ? '👥' : '');
    
    return `
      <div class="chat-list-item ${c.id===state.activeChatId?'active':''}" data-action="open-chat" data-id="${c.id}">
        <div class="chat-avatar" style="background:${c.color}">
          ${chatIcon || initials(c.name)}
        </div>
        <div class="chat-meta">
          <div class="cname">
            ${escapeHtml(c.name)} 
            ${isGroupChat ? `<span class="chat-tag">${isGiftChat ? '🎁 обсуждение' : 'группа'}</span>` : ''}
            ${isGroupChat && memberCount > 0 ? `<span class="chat-tag members-tag">👥 ${memberCount}</span>` : ''}
          </div>
          <div class="clast">${escapeHtml(lastMessage(c))}</div>
        </div>
      </div>
    `;
  }).join('');

  const activeChat = findChat(state.activeChatId);
  let threadHtml;
  if(activeChat){
    const isGroupChat = activeChat.type === 'group';
    const isGiftChat = activeChat.friendId && activeChat.type === 'group';
    let friendName = '';
    if(activeChat.friendId){
      const friend = findFriend(activeChat.friendId);
      if(friend) friendName = friend.name;
    }
    const memberCount = activeChat.members ? activeChat.members.length : 0;
    
    threadHtml = `
      <div class="thread-head">
        <div class="chat-avatar" style="background:${activeChat.color};width:36px;height:36px;font-size:14px;">
          ${isGiftChat ? '🎁' : (isGroupChat ? '👥' : initials(activeChat.name))}
        </div>
        <div>
          <div class="thn">${escapeHtml(activeChat.name)}</div>
          <div class="ths">
            ${isGiftChat 
              ? `Обсуждаем подарок для ${escapeHtml(friendName)} 🎁` 
              : (isGroupChat ? `Групповой чат · ${memberCount} участников` : 'Личный чат')}
          </div>
        </div>
      </div>
      <div class="thread-body" id="threadBody">
        ${activeChat.messages.map(m=>`
          <div class="msg ${m.mine?'mine':'theirs'}">
            ${!m.mine && m.author !== 'Система' ? `<span class="ma">${escapeHtml(m.author)}</span>` : ''}
            ${m.author === 'Система' ? `<span class="system-msg">${escapeHtml(m.text)}</span>` : escapeHtml(m.text)}
            <span class="mt">${formatMsgTime(m.time)}</span>
          </div>
        `).join('') || '<div class="empty-thread">Начните переписку — напишите первое сообщение</div>'}
      </div>
      <div class="thread-input">
        <input type="text" id="msgInput" placeholder="Написать сообщение...">
        <button class="btn btn-primary" data-action="send-msg">Отправить</button>
      </div>
    `;
  } else {
    threadHtml = `<div class="empty-thread">Выберите чат слева</div>`;
  }

  return `
    <div class="page-head">
      <div class="eyebrow">Общение</div>
      <h1 class="page-title">Чаты</h1>
      <p class="page-desc">Групповые чаты и обсуждения подарков</p>
    </div>
    <div class="chats-layout">
      <div class="chat-list">${listHtml}</div>
      <div class="chat-thread">${threadHtml}</div>
    </div>
  `;
}

function wireChats(){
  const body = document.getElementById('threadBody');
  if(body) body.scrollTop = body.scrollHeight;
  document.getElementById('msgInput')?.addEventListener('keydown', e=>{
    if(e.key==='Enter'){ e.preventDefault(); sendMessage(); }
  });
}

function sendMessage(){
  const inp = document.getElementById('msgInput');
  const val = inp.value.trim();
  if(!val) return;
  const chat = findChat(state.activeChatId);
  if(!chat) return;
  chat.messages.push({author:'Вы', mine:true, text:val, time:new Date().toISOString()});
  persist();
  renderContent();
}

function openOrCreateChatForFriend(friendId){
  const friend = findFriend(friendId);
  if(!friend) return;
  
  // Проверяем, есть ли уже чат для этого друга
  if(!friend.chatId){
    // Создаем группу для обсуждения
    const groupName = `Обсуждение ДР - ${friend.name}`;
    const groupId = 'chat-gift-' + Date.now();
    
    // Создаем новый групповой чат
    const newChat = {
      id: groupId,
      type: 'group',
      name: groupName,
      color: friend.color || '#4ECDC4',
      messages: [
        {
          author: 'Система',
          mine: false,
          text: `🎁 Чат для обсуждения подарка для ${friend.name} создан! Присоединяйтесь к обсуждению.`,
          time: new Date().toISOString()
        }
      ],
      members: [state.user.id], // Текущий пользователь
      friendId: friend.id // Связь с именинником
    };
    
    // Сохраняем новый чат
    state.chats.push(newChat);
    
    // Связываем чат с другом
    friend.chatId = groupId;
    
    // Добавляем системное сообщение о создании чата
    persist();
  }
  
  // Проверяем, добавлен ли текущий пользователь в группу
  const chat = findChat(friend.chatId);
  if(chat && chat.type === 'group') {
    if (!chat.members) {
      chat.members = [];
    }
    if (!chat.members.includes(state.user.id)) {
      chat.members.push(state.user.id);
      // Добавляем сообщение о присоединении
      chat.messages.push({
        author: 'Система',
        mine: false,
        text: `${state.user.name} присоединился к обсуждению 👋`,
        time: new Date().toISOString()
      });
      persist();
    }
  }
  
  // Устанавливаем активный чат и переключаем вкладку
  state.activeChatId = friend.chatId;
  state.activeTab = 'chats';
  persist();
  renderTabs();
  renderContent();
}

function renderFriends(){
  // Проверяем, какая подвкладка активна
  const subTab = state.friendSubTab || 'my'; // 'my' или 'search'
  
  // ---------- ВКЛАДКА "МОИ ДРУЗЬЯ" ----------
  if (subTab === 'my') {
    let friendsList = state.friends;
    
    // Фильтрация по поиску среди друзей
    if (state.friendSearch) {
      const searchLower = state.friendSearch.toLowerCase();
      friendsList = friendsList.filter(f => 
        f.name.toLowerCase().includes(searchLower)
      );
    }
    
    // Сортировка
    if (state.friendFilter === 'alpha') {
      friendsList = friendsList.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
    } else {
      friendsList = friendsList.sort((a, b) => 
        daysUntilBirthday(a.birthdate) - daysUntilBirthday(b.birthdate)
      );
    }
    
    // Карточки друзей
    const friendsHtml = friendsList.map(f => {
      const {num, mon} = formatBirthdayShort(f.birthdate);
      const days = daysUntilBirthday(f.birthdate);
      const hasChat = f.chatId && findChat(f.chatId);
      const chatExists = !!hasChat;
      
      return `
        <div class="friend-card" data-id="${f.id}">
          <div class="fc-top">
            <div class="date-block">
              <div class="dnum">${num}</div>
              <div class="dmon">${mon}</div>
            </div>
            <div class="fc-info">
              <div class="fname">${escapeHtml(f.name)}</div>
              <div class="fcountdown">${countdownLabel(days)}</div>
              <div class="fc-groups">${f.groups.map(g => `<span>${escapeHtml(g)}</span>`).join('')}</div>
              ${chatExists ? '<div class="chat-indicator">💬 Обсуждение активно</div>' : ''}
            </div>
          </div>
          <details class="fc-wish">
            <summary>Список подарков (${f.wishlist.length})</summary>
            <ul>${f.wishlist.map(w => `<li>${escapeHtml(w)}</li>`).join('') || '<li>Пока пусто</li>'}</ul>
          </details>
          <div class="fc-actions">
            <button class="btn btn-small ${f.subscribed ? 'btn-sage' : 'btn-ghost'}" 
                    data-action="toggle-subscribe" data-id="${f.id}">
              ${f.subscribed ? '✓ Подписаны' : 'Подписаться'}
            </button>
            <button class="btn btn-small btn-primary" 
                    data-action="discuss-gift" data-id="${f.id}">
              ${chatExists ? '💬 Перейти в чат' : 'Обсудить подарок'}
            </button>
            <button class="btn btn-small btn-danger" 
                    data-action="remove-friend" data-id="${f.id}">
              ✕ Удалить
            </button>
          </div>
        </div>
      `;
    }).join('');
    
    return `
      <div class="page-head">
        <div class="eyebrow">Круг друзей</div>
        <h1 class="page-title">Друзья</h1>
        <p class="page-desc">Управляйте списком друзей и находите новых.</p>
      </div>
      
      <!-- ПЕРЕКЛЮЧАТЕЛЬ ВКЛАДОК -->
      <div class="sub-tabs">
        <button class="sub-tab-btn ${subTab === 'my' ? 'active' : ''}" 
                data-action="switch-subtab" data-subtab="my">
          📋 Мои друзья (${state.friends.length})
        </button>
        <button class="sub-tab-btn ${subTab === 'search' ? 'active' : ''}" 
                data-action="switch-subtab" data-subtab="search">
          🔍 Найти друзей
        </button>
      </div>
      
      <!-- ПОИСК СРЕДИ ДРУЗЕЙ -->
      <div class="friends-toolbar">
        <div class="search-box">
          <span class="sico">🔍</span>
          <input type="text" id="friendSearch" placeholder="Поиск по имени..." 
                 value="${escapeHtml(state.friendSearch || '')}">
        </div>
        <div class="filter-toggle">
          <button data-action="filter-alpha" class="${state.friendFilter === 'alpha' ? 'active' : ''}">По алфавиту</button>
          <button data-action="filter-date" class="${state.friendFilter === 'date' ? 'active' : ''}">По дате рождения</button>
        </div>
      </div>
      
      <!-- СПИСОК ДРУЗЕЙ -->
      <div class="friends-section">
        <div class="friends-grid">
          ${friendsHtml || '<div class="empty-state"><div class="ee">👤</div>У вас пока нет друзей. Перейдите на вкладку «Найти друзей».</div>'}
        </div>
      </div>
    `;
  }
  
  // ---------- ВКЛАДКА "НАЙТИ ДРУЗЕЙ" ----------
  else if (subTab === 'search') {
    const searchQuery = state.searchQuery || '';
    const searchResults = searchQuery.length >= 2 ? searchUsers(searchQuery) : [];
    
    // Результаты поиска
    let resultsHtml = '';
    if (searchQuery.length >= 2) {
      if (searchResults.length > 0) {
        resultsHtml = `
          <div class="search-results">
            <h3 class="search-title">🔍 Найдено пользователей: ${searchResults.length}</h3>
            ${searchResults.map(u => `
              <div class="search-result-item">
                <div class="search-info">
                  <div class="search-avatar">${u.name.charAt(0).toUpperCase()}</div>
                  <div>
                    <div class="search-name">${escapeHtml(u.name)}</div>
                    <div class="search-details">
                      <span class="search-birth">🎂 ${formatBirthdayFull(u.birthdate)}</span>
                      <span class="search-groups">${u.groups.map(g => `<span>${escapeHtml(g)}</span>`).join('')}</span>
                    </div>
                    <div class="search-wishlist">🎁 ${u.wishlist.length > 0 ? u.wishlist.join(', ') : 'Нет желаемых подарков'}</div>
                  </div>
                </div>
                <button class="btn btn-small btn-success" 
                        data-action="add-friend" data-id="${u.id}">
                  ➕ Добавить
                </button>
              </div>
            `).join('')}
          </div>
        `;
      } else {
        resultsHtml = `
          <div class="search-empty">
            <div class="empty-icon">😕</div>
            <p>Никого не найдено</p>
            <span class="empty-hint">Попробуйте изменить запрос</span>
          </div>
        `;
      }
    } else {
      resultsHtml = `
        <div class="search-hint">
          <div class="hint-icon">🔍</div>
          <p>Введите имя (минимум 2 символа) и нажмите «Найти»</p>
        </div>
      `;
    }
    
    return `
      <div class="page-head">
        <div class="eyebrow">Круг друзей</div>
        <h1 class="page-title">Друзья</h1>
        <p class="page-desc">Найдите пользователей и добавьте их в друзья.</p>
      </div>
      
      <!-- ПЕРЕКЛЮЧАТЕЛЬ ВКЛАДОК -->
      <div class="sub-tabs">
        <button class="sub-tab-btn ${subTab === 'my' ? 'active' : ''}" 
                data-action="switch-subtab" data-subtab="my">
          📋 Мои друзья (${state.friends.length})
        </button>
        <button class="sub-tab-btn ${subTab === 'search' ? 'active' : ''}" 
                data-action="switch-subtab" data-subtab="search">
          🔍 Найти друзей
        </button>
      </div>
      
      <!-- ПОИСК -->
      <div class="search-section">
        <div class="search-bar">
          <input type="text" id="searchInput" placeholder="Введите имя для поиска..." 
                 value="${escapeHtml(state.searchQuery || '')}">
          <button class="btn btn-primary" data-action="do-search">🔍 Найти</button>
          <button class="btn btn-ghost" data-action="clear-search">✕ Очистить</button>
        </div>
      </div>
      
      <!-- РЕЗУЛЬТАТЫ -->
      ${resultsHtml}
    `;
  }
}

// render.js (добавить в функцию wireFriends)

// render.js

function wireFriends(){
  const search = document.getElementById('friendSearch');
  if(search){
    // Убираем старые обработчики (чтобы не было дублирования)
    const newSearch = search.cloneNode(true);
    search.parentNode.replaceChild(newSearch, search);
    
    newSearch.addEventListener('input', function(e) {
      const query = e.target.value.trim();
      state.friendSearch = query;
      
      // Перерисовываем только контент
      const content = document.getElementById('content');
      if (content) {
        const cursorPos = this.selectionStart;
        content.innerHTML = renderFriends();
        
        // Восстанавливаем фокус
        const newSearchInput = document.getElementById('friendSearch');
        if (newSearchInput) {
          newSearchInput.focus();
          newSearchInput.selectionStart = newSearchInput.selectionEnd = cursorPos;
        }
      }
    });
    
    // Сразу вызываем поиск, если есть запрос
    if (state.friendSearch && state.friendSearch.length >= 2) {
      newSearch.dispatchEvent(new Event('input'));
    }
  }
}

/*Notifications*/
function renderNotifications(){
  const sorted = [...state.notifications].sort((a,b)=>new Date(b.receivedAt)-new Date(a.receivedAt));
  const icons = {today:'🎉', upcoming:'⏰', past:'📅'};
  const labels = {today:'сегодня', upcoming:'скоро', past:'прошло'};

  const itemsHtml = sorted.map(n=>`
    <div class="notif-card">
      <div class="notif-icon ${n.type}">${icons[n.type]}</div>
      <div class="notif-body">
        <div class="notif-top-row">
          <div class="notif-text">${n.text}</div>
          <span class="notif-tag ${n.type}">${labels[n.type]}</span>
        </div>
        <div class="notif-received">${formatReceivedAt(n.receivedAt)}</div>
      </div>
    </div>
  `).join('');

  return `
    <div class="page-head">
      <div class="eyebrow">Напоминания</div>
      <h1 class="page-title">Уведомления</h1>
      <p class="page-desc">О днях рождения друзей, на которых вы подписаны — предстоящих и уже прошедших.</p>
    </div>
    <div class="notif-list">
      ${itemsHtml || '<div class="empty-state"><div class="ee">🔔</div>Уведомлений пока нет. Подпишитесь на друзей на вкладке «Друзья».</div>'}
    </div>
  `;
}

// Присоединение к существующей группе
function joinGroup(){
  const inp = document.getElementById('inpNewGroup');
  const groupName = inp.value.trim();
  if(!groupName) {
    showToast('Введите название группы');
    return;
  }
  
  // Проверяем, существует ли группа
  const existingGroup = state.groups.find(g => g.name.toLowerCase() === groupName.toLowerCase());
  
  if(!existingGroup) {
    showToast(`Группа "${groupName}" не существует. Создайте её!`, 'warning');
    inp.value = '';
    return;
  }
  
  // Проверяем, не состоит ли уже пользователь в группе
  if(state.user.groups.some(g => g.toLowerCase() === groupName.toLowerCase())) {
    showToast(`Вы уже состоите в группе "${groupName}"`);
    inp.value = '';
    return;
  }
  
  // Добавляем пользователя в группу
  state.user.groups.push(existingGroup.name);
  
  // Добавляем пользователя в список участников группы
  if(!existingGroup.members) existingGroup.members = [];
  if(!existingGroup.members.includes(state.user.id)) {
    existingGroup.members.push(state.user.id);
  }
  
  // Создаем или обновляем чат группы
  createOrUpdateGroupChat(existingGroup);
  
  persist();
  renderContent();
  showToast(`Вы присоединились к группе "${groupName}"! 🎉`);
  inp.value = '';
}

// Создание новой группы
function createGroup(){
  const inp = document.getElementById('inpNewGroup');
  const groupName = inp.value.trim();
  if(!groupName) {
    showToast('Введите название группы');
    return;
  }
  
  // Проверяем, существует ли уже группа с таким названием
  if(state.groups.some(g => g.name.toLowerCase() === groupName.toLowerCase())) {
    showToast(`Группа "${groupName}" уже существует. Используйте "Добавить" для присоединения.`, 'warning');
    inp.value = '';
    return;
  }
  
  // Проверяем, не состоит ли уже пользователь в группе с таким названием
  if(state.user.groups.some(g => g.toLowerCase() === groupName.toLowerCase())) {
    showToast(`Вы уже состоите в группе "${groupName}"`);
    inp.value = '';
    return;
  }
  
  // Создаем новую группу
  const newGroup = {
    id: 'group-' + Date.now(),
    name: groupName,
    creator: state.user.id,
    members: [state.user.id],
    createdAt: new Date().toISOString()
  };
  
  state.groups.push(newGroup);
  state.user.groups.push(groupName);
  
  // Создаем чат для группы
  createOrUpdateGroupChat(newGroup);
  
  persist();
  renderContent();
  showToast(`Группа "${groupName}" создана! 🎉`);
  inp.value = '';
}

// Создание или обновление чата группы
function createOrUpdateGroupChat(group){
  // Ищем чат для этой группы
  const chatId = 'chat-group-' + group.id;
  let chat = state.chats.find(c => c.id === chatId);
  
  if(!chat) {
    // Создаем новый чат
    const colors = ['#4C6E8F', '#E8734A', '#6E8F74', '#D9A441', '#A35FA3', '#3F8F82', '#4ECDC4', '#FF6B6B'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    chat = {
      id: chatId,
      type: 'group',
      name: group.name,
      color: color,
      messages: [
        {
          author: 'Система',
          mine: false,
          text: `Группа "${group.name}" создана! 🎉`,
          time: new Date().toISOString()
        }
      ],
      members: group.members || [],
      groupId: group.id
    };
    
    state.chats.push(chat);
  } else {
    // Обновляем список участников
    chat.members = group.members || [];
    
    // Добавляем системное сообщение о новом участнике
    if(group.members && group.members.includes(state.user.id)) {
      const userJoined = chat.messages.some(m => 
        m.author === 'Система' && m.text.includes(`${state.user.name} присоединился`)
      );
      if(!userJoined && state.user.name) {
        chat.messages.push({
          author: 'Система',
          mine: false,
          text: `${state.user.name} присоединился к группе 👋`,
          time: new Date().toISOString()
        });
      }
    }
  }
  
  persist();
}

// Вспомогательная функция для показа уведомлений
function showToast(message, type = 'success'){
  // Удаляем старые тосты
  const oldToast = document.querySelector('.toast-message');
  if(oldToast) oldToast.remove();
  
  const toast = document.createElement('div');
  toast.className = `toast-message ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}