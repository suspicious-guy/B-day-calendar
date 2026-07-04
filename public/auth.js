/*Auth — теперь через сервер + SQLite, а не через window.storage*/
const SESSION_KEY = 'birthday-app-session-v1';
const SERVER_URL = window.location.origin;

let authMode = 'login';

function getSession(){
  try{
    return localStorage.getItem(SESSION_KEY) || null;
  }catch(e){
    return null;
  }
}

function setSession(login){
  try{
    if(login) localStorage.setItem(SESSION_KEY, login);
    else localStorage.removeItem(SESSION_KEY);
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
    if(!login || !password){
      error.textContent = 'Заполните все поля';
      return;
    }
    try{
      const res = await fetch(`${SERVER_URL}/api/login`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ username: login, password })
      });
      if(!res.ok){
        error.textContent = 'Неправильный логин или пароль';
        return;
      }
      const user = await res.json();
      setSession(login);
      await enterApp(login, user);
    }catch(e){
      error.textContent = 'Не удалось связаться с сервером';
    }
  } else {
    const nameInp = document.getElementById('authName');
    const dateInp = document.getElementById('authBirthdate');
    const name = nameInp.value.trim();
    const birthdate = dateInp.value;

    if(!name || !login || !password || !birthdate){
      error.textContent = 'Заполните все поля';
      return;
    }

    try{
      const res = await fetch(`${SERVER_URL}/api/register`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ username: login, name, password, birthdate })
      });
      if(res.status === 409){
        error.textContent = 'Такой логин уже занят';
        return;
      }
      if(!res.ok){
        error.textContent = 'Не удалось зарегистрироваться';
        return;
      }
      const user = await res.json();
      setSession(login);
      await enterApp(login, user);
    }catch(e){
      error.textContent = 'Не удалось связаться с сервером';
    }
  }
}

async function enterApp(login, user){
  state.user.name = user.name;
  state.user.birthdate = user.birthdate;
  state.currentLogin = login;
  await persist();
  hideAuthOverlay();
  document.getElementById('app').style.display = 'flex';
  await loadChatsList();
  render();
}

async function logout(){
  setSession(null);
  state.currentLogin = null;
  showAuthOverlay('login');
}

async function initAuth(){
  document.getElementById('authSubmitBtn').addEventListener('click', handleAuthSubmit);
  const session = getSession();

  if(session){
    try{
      const res = await fetch(`${SERVER_URL}/api/users/${encodeURIComponent(session)}`);
      if(res.ok){
        const user = await res.json();
        await loadState();
        await enterApp(session, user);
        return;
      }
    }catch(e){ /* сервер недоступен — уходим на форму логина */ }
    // сессия есть, но пользователь на сервере не найден (например, БД была очищена)
    setSession(null);
  }
  showAuthOverlay('login');
}