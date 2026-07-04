/*Data*/
const STORAGE_KEY = 'birthday-app-state-v1';
const MONTHS = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
const MONTHS_FULL = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
const MONTHS_NOM = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const NOTIF_THRESHOLDS = [30, 14, 7, 3, 0];


function seedState(){
  return {
    activeTab: 'account',
    activeChatId: null,
    activeFriendId: null, 
    friendFilter: 'date',
    friendSearch: '',
    searchQuery: '',        
    friendSubTab: 'my', 
    isAdmin: false,
    user: {
      id: 'current-user',
      name: '',          
      birthdate: '0000-00-00',  
      groups: [],
      wishlist: [] 
    },
    groups: [               
      {id: 'group-1', name: 'ТГУ 972501', members: ['current-user', 'f2', 'f3', 'f4']},
      {id: 'group-2', name: 'Сборная по волейболу', members: ['f1', 'f5']}
    ],
    friends: [],               
    
    allUsers: [               
      {id:'f1', name:'Никита Орлов', birthdate:'2002-07-07', groups:['Сборная по волейболу'], wishlist:['Кроссовки для зала','Спортивный термос'], color:'#E8734A'},
      {id:'f2', name:'Иван Петров', birthdate:'2003-07-10', groups:['ТГУ 972501'], wishlist:['Наушники Sony','Книга «Атомные привычки»'], color:'#6E8F74'},
      {id:'f3', name:'Ольга Смирнова', birthdate:'2003-08-02', groups:['ТГУ 972501'], wishlist:['Плед','Набор для рисования'], color:'#D9A441'},
      {id:'f4', name:'Дмитрий Волков', birthdate:'2004-01-15', groups:['ТГУ 972501'], wishlist:['Механическая клавиатура'], color:'#4C6E8F'},
      {id:'f5', name:'Мария Соколова', birthdate:'1998-12-25', groups:['Сборная по волейболу'], wishlist:['Форма для волейбола','Сертификат'], color:'#A35FA3'},
      {id:'f6', name:'Екатерина Белова', birthdate:'2003-03-20', groups:['ТГУ 972501'], wishlist:['Настольная лампа'], color:'#3F8F82'}
    ],
    chats: [],
    readNotifications: [],
    notifications: [],
    notificationSettings: {
      enabled: true,
      daysBefore: [30, 14, 7, 3, 0] 
    },
  };
}

let state = seedState();


async function loadState() {
  try {
    const res = await window.storage.get(STORAGE_KEY);
    if (res && res.value) {
      const parsed = JSON.parse(res.value);
      // Если в сохранённых данных нет activeFriendId - добавляем
      if (!parsed.activeFriendId) {
        parsed.activeFriendId = null;
      }
      state = Object.assign(seedState(), parsed);
      if (parsed.user) {
        state.user.isAdmin = parsed.user.isAdmin === true;
      }
    }
  } catch (e) {
    // нет сохранённых данных - используем seed
  }
  render();
}

async function persist(){
  try{
    await window.storage.set(STORAGE_KEY, JSON.stringify(state));
  }catch(e){ /* ignore storage errors, app still works in-memory */ }
}

/*Helpers*/
const TODAY = new Date();
TODAY.setHours(0,0,0,0);

function parseDate(str){
  const [y,m,d] = str.split('-').map(Number);
  return new Date(y, m-1, d);
}

function nextBirthdayDate(birthdateStr){
  const b = parseDate(birthdateStr);
  let next = new Date(TODAY.getFullYear(), b.getMonth(), b.getDate());
  if(next < TODAY) next = new Date(TODAY.getFullYear()+1, b.getMonth(), b.getDate());
  return next;
}

function daysUntilBirthday(birthdateStr){
  const next = nextBirthdayDate(birthdateStr);
  return Math.round((next - TODAY) / 86400000);
}

function pluralDays(n){
  const mod10 = n % 10, mod100 = n % 100;
  if(mod10===1 && mod100!==11) return 'день';
  if([2,3,4].includes(mod10) && ![12,13,14].includes(mod100)) return 'дня';
  return 'дней';
}

function countdownLabel(days){
  if(days===0) return 'Сегодня 🎉';
  if(days===1) return 'Завтра';
  return `через ${days} ${pluralDays(days)}`;
}

function formatBirthdayShort(str){
  const d = parseDate(str);
  return {num:d.getDate(), mon:MONTHS[d.getMonth()]};
}

function formatBirthdayFull(str){
  const d = parseDate(str);
  return `${d.getDate()} ${MONTHS_FULL[d.getMonth()]} ${d.getFullYear()}`;
}

function formatReceivedAt(iso){
  const d = new Date(iso);
  const day = d.getDate();
  const mon = MONTHS_FULL[d.getMonth()];
  const hh = String(d.getHours()).padStart(2,'0');
  const mm = String(d.getMinutes()).padStart(2,'0');
  return `Получено ${day} ${mon}, ${hh}:${mm}`;
}

function formatMsgTime(iso){
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2,'0');
  const mm = String(d.getMinutes()).padStart(2,'0');
  return `${d.getDate()} ${MONTHS[d.getMonth()]}, ${hh}:${mm}`;
}

function initials(name){
  return name.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
}

function escapeHtml(s){
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function findFriend(id){ return state.friends.find(f=>f.id===id); }
function findChat(id){ return state.chats.find(c=>c.id===id); }

/*Notifications — генерируются автоматически на основе дат рождения друзей,
  на которых оформлена подписка. Уведомление появляется, когда до дня
  рождения друга остаётся ровно 30, 14, 7, 3 или 0 дней. */
function generateNotifications(){
  const list = [];
  state.friends.filter(f=>f.subscribed).forEach(f=>{
    const days = daysUntilBirthday(f.birthdate);
    if(NOTIF_THRESHOLDS.includes(days)){
      const year = nextBirthdayDate(f.birthdate).getFullYear();
      const id = `n-${f.id}-${days}-${year}`;
      const type = days===0 ? 'today' : 'upcoming';
      const text = days===0
        ? `Сегодня день рождения у <b>${escapeHtml(f.name)}</b> 🎉`
        : `Через ${days} ${pluralDays(days)} день рождения у <b>${escapeHtml(f.name)}</b>`;
      list.push({id, friendId:f.id, type, days, text});
    }
  });
  return list.sort((a,b)=>a.days-b.days);
}

function unreadNotifications(){
  return generateNotifications().filter(n=>!state.readNotifications.includes(n.id));
}

function searchUsers(query) {
  if (!query || query.length < 2) return [];
  
  const lowerQuery = query.toLowerCase();
  
  // Ищем среди всех пользователей (кроме себя)
  return state.allUsers.filter(user => {
    const nameMatch = user.name.toLowerCase().includes(lowerQuery);
    const isNotMe = user.id !== state.user.id;
    const isNotFriend = !state.friends.some(f => f.id === user.id);
    
    return nameMatch && isNotMe && isNotFriend;
  });
}

// ---------- ДОБАВИТЬ В ДРУЗЬЯ ----------
function addFriendById(friendId) {
  const userToAdd = state.allUsers.find(u => u.id === friendId);
  if (!userToAdd) return false;
  
  // Проверяем, не добавлен ли уже
  if (state.friends.some(f => f.id === friendId)) return false;
  
  // Добавляем в друзья (с копированием данных)
  state.friends.push({
    ...userToAdd,
    subscribed: false,
    chatId: null
  });
  
  persist();
  return true;
}

function removeFriendById(friendId) {
  const index = state.friends.findIndex(f => f.id === friendId);
  if (index === -1) return false;
  
  state.friends.splice(index, 1);
  persist();
  return true;
}

function getAllUsersForSearch() {
  return state.allUsers.filter(u => u.id !== state.user.id);
}

// data.js — добавить функцию

function refreshNotifications() {
  const settings = state.notificationSettings || { daysBefore: [30, 14, 7, 3, 0] };
  const thresholds = settings.daysBefore;
  
  // Очищаем старые уведомления
  state.notifications = [];
  
  // Генерируем новые на основе настроек
  state.friends.filter(f => f.subscribed).forEach(f => {
    const days = daysUntilBirthday(f.birthdate);
    
    // Проверяем, есть ли текущий день в выбранных порогах
    if (thresholds.includes(days)) {
      const type = days === 0 ? 'today' : 'upcoming';
      const text = days === 0
        ? `🎉 Сегодня день рождения у ${f.name}!`
        : `⏰ Через ${days} ${pluralDays(days)} день рождения у ${f.name}`;
      
      state.notifications.push({
        id: 'notif-' + Date.now() + '-' + f.id + '-' + days,
        friendId: f.id,
        type: type,
        text: text,
        receivedAt: new Date().toISOString()
      });
    }
  });
  
  persist();
  updateNotificationBadge();
}