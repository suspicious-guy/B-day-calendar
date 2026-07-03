import express from 'express';
import cors from 'cors';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { router as apiRouter } from './src/routes.js';
import { attachRealtime } from './src/realtime.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api', apiRouter);

// Отдаём вспомогательный клиентский модуль (public/chat-client.js),
// можно подключить прямо в index.html: <script src="http://localhost:3001/chat-client.js"></script>
app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', (req, res) => res.json({ ok: true }));

const server = http.createServer(app);
attachRealtime(server);

server.listen(PORT, () => {
  console.log(`Chat server running on http://localhost:${PORT}`);
  console.log(`WebSocket endpoint: ws://localhost:${PORT}/ws`);
});