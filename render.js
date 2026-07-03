/*Sidebar*/
function renderTodayCard(){
  const subscribedUpcoming = state.friends
    .filter(f=>f.subscribed)
    .map(f=>({f, days:daysUntilBirthday(f.birthdate)}))
    .sort((a,b)=>a.days-b.days)[0];

  const monthName = MONTHS_NOM[TODAY.getMonth()];
  const weekday = TODAY.toLocaleDateString('ru-RU',{weekday:'long'});

  let upcomingHtml;
  if(subscribedUpcoming){
    upcomingHtml = `
      <div class="upcoming-name">${escapeHtml(subscribedUpcoming.f.name)}</div>
      <div class="upcoming-when">${countdownLabel(subscribedUpcoming.days)}</div>`;
  } else {
    upcomingHtml = `<div class="upcoming-empty">Подпишитесь на друзей, чтобы видеть напоминания здесь</div>`;
  }

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
    const icon = btn.querySelector('.ico').outerHTML;
    const label = {account:'Аккаунт', chats:'Чаты', friends:'Друзья', notifications:'Уведомления'}[tab];
    btn.innerHTML = `${icon}${label}${extra}`;
  });
}

/*Account*/
function renderAccount(){
  const u = state.user;
  return `
    <div class="page-head">
      <div class="eyebrow">Профиль</div>
      <h1 class="page-title">Мой аккаунт</h1>
      <p class="page-desc">Ваши данные видят друзья — это помогает им не пропустить ваш день рождения.</p>
    </div>
    <div class="account-grid">
      <div class="panel form-block">
        <div class="field">
          <label for="inpName">Имя</label>
          <input type="text" id="inpName" value="${escapeHtml(u.name)}">
        </div>
        <div class="field">
          <label for="inpDate">Дата рождения</label>
          <input type="date" id="inpDate" value="${u.birthdate}">
        </div>
        <div class="field">
          <label>Группы</label>
          <div class="chip-row" id="groupChips">
            ${u.groups.map((g,i)=>`<span class="chip">${escapeHtml(g)}<button data-action="remove-group" data-idx="${i}">✕</button></span>`).join('') || '<span style="font-size:13px;color:var(--muted)">Групп пока нет</span>'}
          </div>
          <div class="add-group-row">
            <input type="text" id="inpNewGroup" placeholder="Например: Группа 972501, ТГУ">
            <button class="btn btn-ghost btn-small" data-action="add-group">Добавить</button>
          </div>
        </div>
        <div class="save-row">
          <button class="btn btn-primary" data-action="save-account">Сохранить изменения</button>
          <span class="saved-msg" id="savedMsg">Сохранено ✓</span>
          <button class="btn btn-ghost btn-logout" data-action="logout">Выйти</button>
        </div>
      </div>
      <div class="panel profile-card">
        <div class="avatar-big">${initials(u.name)}</div>
        <div class="p-name">${escapeHtml(u.name)}</div>
        <div class="p-date">🎂 ${formatBirthdayFull(u.birthdate)}</div>
        <div class="p-groups">
          ${u.groups.map(g=>`<span>${escapeHtml(g)}</span>`).join('')}
        </div>
      </div>
    </div>
  `;
}

function wireAccount(){
  document.getElementById('inpNewGroup')?.addEventListener('keydown', e=>{
    if(e.key==='Enter'){ e.preventDefault(); addGroup(); }
  });
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
  const sorted = [...state.chats].sort((a,b)=>{
    const at = a.messages.length ? new Date(a.messages[a.messages.length-1].time) : 0;
    const bt = b.messages.length ? new Date(b.messages[b.messages.length-1].time) : 0;
    return bt - at;
  });

  const listHtml = sorted.map(c=>`
    <div class="chat-list-item ${c.id===state.activeChatId?'active':''}" data-action="open-chat" data-id="${c.id}">
      <div class="chat-avatar" style="background:${c.color}">${c.type==='group' ? '👥' : initials(c.name)}</div>
      <div class="chat-meta">
        <div class="cname">${escapeHtml(c.name)} ${c.type==='group' ? '<span class="chat-tag">группа</span>' : ''}</div>
        <div class="clast">${escapeHtml(lastMessage(c))}</div>
      </div>
    </div>
  `).join('');

  const activeChat = findChat(state.activeChatId);
  let threadHtml;
  if(activeChat){
    threadHtml = `
      <div class="thread-head">
        <div class="chat-avatar" style="background:${activeChat.color};width:36px;height:36px;font-size:14px;">${activeChat.type==='group'?'👥':initials(activeChat.name)}</div>
        <div>
          <div class="thn">${escapeHtml(activeChat.name)}</div>
          <div class="ths">${activeChat.type==='group' ? 'групповой чат' : 'личный чат'}</div>
        </div>
      </div>
      <div class="thread-body" id="threadBody">
        ${activeChat.messages.map(m=>`
          <div class="msg ${m.mine?'mine':'theirs'}">
            ${!m.mine ? `<span class="ma">${escapeHtml(m.author)}</span>` : ''}
            ${escapeHtml(m.text)}
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
      <p class="page-desc">Личные и групповые чаты — обсуждайте подарки без участия именинника.</p>
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
  if(!friend.chatId){
    const id = 'chat-' + friend.id;
    state.chats.push({id, type:'direct', name:friend.name, color:friend.color, messages:[]});
    friend.chatId = id;
  }
  state.activeChatId = friend.chatId;
  state.activeTab = 'chats';
  persist();
  renderTabs();
  renderContent();
}

/*Friends*/
function renderFriends(){
  let list = state.friends.filter(f => f.name.toLowerCase().includes(state.friendSearch.toLowerCase()));

  if(state.friendFilter==='alpha'){
    list = list.sort((a,b)=>a.name.localeCompare(b.name,'ru'));
  } else {
    list = list.sort((a,b)=>daysUntilBirthday(a.birthdate)-daysUntilBirthday(b.birthdate));
  }

  const cardsHtml = list.map(f=>{
    const {num, mon} = formatBirthdayShort(f.birthdate);
    const days = daysUntilBirthday(f.birthdate);
    return `
      <div class="friend-card">
        <div class="fc-top">
          <div class="date-block">
            <div class="dnum">${num}</div>
            <div class="dmon">${mon}</div>
          </div>
          <div class="fc-info">
            <div class="fname">${escapeHtml(f.name)}</div>
            <div class="fcountdown">${countdownLabel(days)}</div>
            <div class="fc-groups">${f.groups.map(g=>`<span>${escapeHtml(g)}</span>`).join('')}</div>
          </div>
        </div>
        <details class="fc-wish">
          <summary>Список подарков (${f.wishlist.length})</summary>
          <ul>${f.wishlist.map(w=>`<li>${escapeHtml(w)}</li>`).join('') || '<li>Пока пусто</li>'}</ul>
        </details>
        <div class="fc-actions">
          <button class="btn btn-small ${f.subscribed?'btn-sage':'btn-ghost'}" data-action="toggle-subscribe" data-id="${f.id}">
            ${f.subscribed ? '✓ Подписаны' : 'Подписаться'}
          </button>
          <button class="btn btn-small btn-primary" data-action="discuss-gift" data-id="${f.id}">Обсудить подарок</button>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="page-head">
      <div class="eyebrow">Круг друзей</div>
      <h1 class="page-title">Друзья</h1>
      <p class="page-desc">Даты рождения, вишлисты и статус подписки на напоминания.</p>
    </div>
    <div class="friends-toolbar">
      <div class="search-box">
        <span class="sico">🔍</span>
        <input type="text" id="friendSearch" placeholder="Поиск по имени" value="${escapeHtml(state.friendSearch)}">
      </div>
      <div class="filter-toggle">
        <button data-action="filter-alpha" class="${state.friendFilter==='alpha'?'active':''}">По алфавиту</button>
        <button data-action="filter-date" class="${state.friendFilter==='date'?'active':''}">По дате рождения</button>
      </div>
    </div>
    <div class="friends-grid">
      ${cardsHtml || '<div class="empty-state"><div class="ee">🔍</div>Никого не нашлось</div>'}
    </div>
  `;
}

function wireFriends(){
  const search = document.getElementById('friendSearch');
  if(search){
    search.addEventListener('input', e=>{
      state.friendSearch = e.target.value;
      renderContent(true);
    });
    // restore focus & caret after re-render
    search.focus();
    search.selectionStart = search.selectionEnd = search.value.length;
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