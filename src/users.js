import { db } from './db.js';
import bcrypt from 'bcryptjs';

const insertUser = db.prepare(
  `INSERT INTO users (username, name, password_hash, birthdate) VALUES (?, ?, ?, ?)`
);
const findUserStmt = db.prepare(`SELECT * FROM users WHERE username = ?`);

export function userExists(username) {
  return !!findUserStmt.get(username);
}

export async function registerUser({ username, name, password, birthdate }) {
  if (userExists(username)) {
    throw new Error('username_taken');
  }
  const passwordHash = await bcrypt.hash(password, 10);
  insertUser.run(username, name, passwordHash, birthdate);
  return { username, name, birthdate };
}

export async function verifyLogin(username, password) {
  const user = findUserStmt.get(username);
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return null;
  return { username: user.username, name: user.name, birthdate: user.birthdate };
}

export function getUser(username) {
  const user = findUserStmt.get(username);
  if (!user) return null;
  return { username: user.username, name: user.name, birthdate: user.birthdate };
}

// Подготавливаем SQL-запрос для поиска пользователей по имени (регистронезависимо с LIKE).
// Исключаем текущего пользователя (чтобы не искать самого себя) 
// и выбираем только те поля, которые нужны фронтенду (без хэша пароля!).
// Используем функцию LOWER() для приведения обеих сторон сравнения к нижнему регистру
const searchUsersStmt = db.prepare(`
  SELECT username, name, birthdate 
  FROM users 
  WHERE LOWER(name) LIKE ? AND username != ?
`);

/**
 * Поиск пользователей в БД
 */
export async function searchUsersInDb(query, currentUsername) {
  // Приводим поисковый запрос к нижнему регистру прямо перед передачей в SQLite
  const lowerQuery = query.toLowerCase();
  const rows = searchUsersStmt.all(`%${lowerQuery}%`, currentUsername);
  
  return rows.map(row => ({
    id: row.username, 
    name: row.name,
    birthdate: row.birthdate,
    wishlist: [], 
    groups: [],
    color: '#6E8F74' 
  }));
}