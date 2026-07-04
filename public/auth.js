/*Auth*/
const USERS_KEY = 'birthday-app-users-v1';
const SESSION_KEY = 'birthday-app-session-v1';

let authMode = 'login';
let users = {};

async function loadUsers(){
  try{
    const res = await window.storage.get(USERS_KEY);
    if(res && res.value) users = JSON.parse(res.value);
  }catch(e){
    users = {};
  }
}

async function saveUsers(){
  try{
    await window.storage.set(USERS_KEY, JSON.stringify(users));
  }catch(e){ /* ignore */ }
}

async function getSession(){
  try{
    const res = await window.storage.get(SESSION_KEY);
    if(res && res.value) return res.value;
  }catch(e){ /* no session yet */ }
  return null;
}

async function setSession(login){
  try{
    await window.storage.set(SESSION_KEY, login || '');
  }catch(e){ /* ignore */ }
}

function showAuthOverlay(mode){
  authMode = mode || 'login';
  document.getElementById('app').style.display = 'none';
  document.getElementById('authOverlay').classList.add('show');
  renderAuthForm();
}

function hideAuthOverlay(){
  document.getElementById('authOverlay').classList.remove('show');
}

function renderAuthForm(){
  const title = document.getElementById('authTitle');
  const fields = document.getElementById('authFields');
  const submitBtn = document.getElementById('authSubmitBtn');
  const switchEl = document.getElementById('authSwitch');
  const error = document.getElementById('authError');
  error.textContent = '';

  if(authMode === 'login'){
    title.textContent = 'Вход';
    fields.innerHTML = `
      <div class="field">
        <label for="authLogin">Логин</label>
        <input type="text" id="authLogin" autocomplete="username">
      </div>
      <div class="field">
        <label for="authPassword">Пароль</label>
        <input type="password" id="authPassword" autocomplete="current-password">
      </div>
    `;
    submitBtn.textContent = 'Вход';
    switchEl.innerHTML = `Нет аккаунта? <a href="#" id="authSwitchLink">Зарегистрироваться</a>`;
  } else {
    title.textContent = 'Регистрация';
    fields.innerHTML = `
      <div class="field">
        <label for="authName">Имя</label>
        <input type="text" id="authName" autocomplete="name">
      </div>
      <div class="field">
        <label for="authLogin">Логин</label>
        <input type="text" id="authLogin" autocomplete="username">
      </div>
      <div class="field">
        <label for="authPassword">Пароль</label>
        <input type="password" id="authPassword" autocomplete="new-password">
      </div>
      <div class="field">
        <label for="authBirthdate">Дата рождения</label>
        <input type="date" id="authBirthdate">
      </div>
    `;
    submitBtn.textContent = 'Регистрация';
    switchEl.innerHTML = `Уже есть аккаунт? <a href="#" id="authSwitchLink">Войти</a>`;
  }

  document.getElementById('authSwitchLink').addEventListener('click', e=>{
    e.preventDefault();
    showAuthOverlay(authMode === 'login' ? 'register' : 'login');
  });

  fields.querySelectorAll('input').forEach(inp=>{
    inp.addEventListener('keydown', e=>{
      if(e.key === 'Enter'){ e.preventDefault(); handleAuthSubmit(); }
    });
  });
}

async function handleAuthSubmit(){
  const error = document.getElementById('authError');
  error.textContent = '';

  const loginInp = document.getElementById('authLogin');
  const passInp = document.getElementById('authPassword');
  const login = loginInp.value.trim();
  const password = passInp.value;

  if(authMode === 'login'){
    if(!login || !password || !users[login] || users[login].password !== password){
      error.textContent = 'Неправильный логин или пароль';
      return;
    }
    await setSession(login);
    await enterApp(login);
  } else {
    const nameInp = document.getElementById('authName');
    const dateInp = document.getElementById('authBirthdate');
    const name = nameInp.value.trim();
    const birthdate = dateInp.value;

    if(!name || !login || !password || !birthdate){
      error.textContent = 'Заполните все поля';
      return;
    }
    if(users[login]){
      error.textContent = 'Такой логин уже занят';
      return;
    }
    const isAdmin = (login === 'admin' && password === 'qwerty');
    users[login] = {name, password, birthdate, isAdmin : isAdmin};
    await saveUsers();
    await setSession(login);
    await enterApp(login);
  }
}

async function enterApp(login){
  const u = users[login];
  state.user.name = u.name;
  state.user.birthdate = u.birthdate;
  state.user.isAdmin = u.isAdmin === true;
  state.currentLogin = login;
  await persist();
  hideAuthOverlay();
  document.getElementById('app').style.display = 'flex';
  await loadChatsList();
  render();
}

async function logout(){
  await setSession(null);
  state.currentLogin = null;
  showAuthOverlay('login');
}

async function initAuth(){
  document.getElementById('authSubmitBtn').addEventListener('click', handleAuthSubmit);
  await loadUsers();
  const session = await getSession();

  if(session && users[session]){
    await loadState();
    await enterApp(session);
  } else {
    showAuthOverlay('login');
  }
}