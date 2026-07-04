/*
  Подключение к SQLite и создание схемы.

  Схема вдохновлена tables.py (Flask/SQLAlchemy), но адаптирована:
  - пароли хранятся как bcrypt-хэш, а не открытым текстом
  - чаты обобщены: chat может быть привязан либо к другу (friend_username),
    либо к группе (group_id), либо быть произвольным — это нужно, чтобы
    поддержать то, что уже умеет фронтенд (групповые чаты и чаты "обсудить подарок")
*/
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'birthday.db');

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  username      TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  birthdate     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS friends (
  owner      TEXT NOT NULL REFERENCES users(username) ON DELETE CASCADE,
  friend     TEXT NOT NULL REFERENCES users(username) ON DELETE CASCADE,
  subscribed INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (owner, friend)
);

CREATE TABLE IF NOT EXISTS wishlist_items (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL REFERENCES users(username) ON DELETE CASCADE,
  gift     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS groups (
  id   TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS group_members (
  group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  username TEXT NOT NULL REFERENCES users(username) ON DELETE CASCADE,
  PRIMARY KEY (group_id, username)
);

CREATE TABLE IF NOT EXISTS chats (
  id              TEXT PRIMARY KEY,
  type            TEXT NOT NULL,           -- 'group' | 'direct'
  name            TEXT NOT NULL,
  color           TEXT,
  friend_username TEXT REFERENCES users(username),  -- если чат "обсудить подарок для..."
  group_id        TEXT REFERENCES groups(id)        -- если это чат группы
);

CREATE TABLE IF NOT EXISTS chat_members (
  chat_id  TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  username TEXT NOT NULL REFERENCES users(username) ON DELETE CASCADE,
  PRIMARY KEY (chat_id, username)
);

CREATE TABLE IF NOT EXISTS messages (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id         TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  author_username TEXT,
  author_name     TEXT,
  text            TEXT NOT NULL,
  time            TEXT NOT NULL
);
`);

export default db;