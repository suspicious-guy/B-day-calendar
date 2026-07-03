/*Data*/
const STORAGE_KEY = 'birthday-app-state-v1';
const MONTHS = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
const MONTHS_FULL = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
const MONTHS_NOM = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];

const NOTIF_THRESHOLDS = [30, 14, 7, 3, 0];

function seedState(){
  return {
    activeTab:'account',
    activeChatId:'chat-nikita',
    currentLogin:null,
    friendFilter:'date',
    friendSearch:'',
    readNotifications:[], // id-шники прочитанных уведомлений (чтобы не показывать их снова)
    user:{
      name:'Введите имя',
      birthdate:'2003-11-08',
      groups:['Группа 972501, ТГУ','Сборная по волейболу'],
      wishlist:['Наушники Sony WH-1000XM5','Книга «Атомные привычки»']
    },
    friends:[
      {id:'f1', name:'Никита Орлов', birthdate:'2002-07-05', groups:['Сборная по волейболу'], wishlist:['Кроссовки для зала','Спортивный термос'], subscribed:true, chatId:'chat-nikita', color:'#E8734A'},
      {id:'f2', name:'Иван Петров', birthdate:'2003-07-10', groups:['Группа 972501, ТГУ'], wishlist:['Наушники Sony WH-1000XM5','Книга «Атомные привычки»'], subscribed:true, chatId:'chat-ivan', color:'#6E8F74'},
      {id:'f3', name:'Ольга Смирнова', birthdate:'2003-08-02', groups:['Группа 972501, ТГУ'], wishlist:['Плед','Набор для рисования'], subscribed:false, chatId:null, color:'#D9A441'},
      {id:'f4', name:'Дмитрий Волков', birthdate:'2004-01-15', groups:['Группа 972501, ТГУ'], wishlist:['Механическая клавиатура'], subscribed:true, chatId:null, color:'#4C6E8F'},
      {id:'f5', name:'Мария Соколова', birthdate:'1998-12-25', groups:['Сборная по волейболу'], wishlist:['Форма для волейбола','Подарочный сертификат'], subscribed:false, chatId:null, color:'#A35FA3'},
      {id:'f6', name:'Екатерина Белова', birthdate:'2003-03-20', groups:['Группа 972501, ТГУ'], wishlist:['Настольная лампа'], subscribed:false, chatId:null, color:'#3F8F82'},
      {id:'f7', name:'Подскребышева Яна', birthdate:'2008-07-03', groups:['Группа 972502, ТГУ'], wishlist:['Джинсы'], subscribed:true, chatId:null, color:'#5e3f8f'}
    ],
    chats:[
      {id:'chat-nikita', type:'direct', name:'Никита Орлов', color:'#E8734A', messages:[
        {author:'Никита Орлов', mine:false, text:'Привет! Скоро мой ДР, никому не говори 😄', time:'2026-07-01T18:22:00'},
        {author:'Вы', mine:true, text:'Уже думаем, что подарить)', time:'2026-07-01T18:25:00'},
      ]},
      {id:'chat-ivan', type:'direct', name:'Иван Петров', color:'#6E8F74', messages:[
        {author:'Вы', mine:true, text:'Может, скинемся на наушники из его списка?', time:'2026-06-29T12:10:00'}
      ]},
      {id:'chat-group-972501', type:'group', name:'Группа 972501, ТГУ', color:'#4C6E8F', messages:[
        {author:'Ольга Смирнова', mine:false, text:'Народ, у Ивана ДР 10 июля, надо собраться', time:'2026-07-02T10:05:00'},
        {author:'Дмитрий Волков', mine:false, text:'Го скинемся на наушники из вишлиста', time:'2026-07-02T10:12:00'},
        {author:'Вы', mine:true, text:'Я за, пишите кто сколько может', time:'2026-07-02T10:20:00'}
      ]},
      {id:'chat-group-volley', type:'group', name:'Сборная по волейболу', color:'#A35FA3', messages:[
        {author:'Мария Соколова', mine:false, text:'Тренировка переносится на 19:00', time:'2026-07-02T08:40:00'}
      ]}
    ]
  };
}

let state = seedState();

async function loadState(){
  try{
    const res = await window.storage.get(STORAGE_KEY);
    if(res && res.value){
      const parsed = JSON.parse(res.value);
      state = Object.assign(seedState(), parsed);
    }
  }catch(e){
    // no saved state yet — keep seed
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