const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');

const root = __dirname;
const previewDataDir = path.join(process.env.LOCALAPPDATA || os.tmpdir(), 'albaz-academy-preview');
fs.mkdirSync(previewDataDir, { recursive: true });
const dataFile = path.join(previewDataDir, 'requests.json');
const port = Number(process.env.PORT || 3000);
const secret = 'local-preview-session-key-change-for-local-only';
const mime = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon',
};

function readRequests() {
  try { return JSON.parse(fs.readFileSync(dataFile, 'utf8')); }
  catch { return []; }
}

function writeJson(res, status, value, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
  res.end(JSON.stringify(value));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > 12000) { reject(new Error('Request too large')); req.destroy(); }
    });
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}); } catch { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

function sessionIsValid(req) {
  const token = (req.headers.cookie || '').split(';').map(x => x.trim())
    .find(x => x.startsWith('baz_preview_admin='))?.slice('baz_preview_admin='.length);
  if (!token) return false;
  const [expires, signature] = token.split('.');
  if (!expires || Number(expires) < Date.now() || !signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(expires).digest('hex');
  const a = Buffer.from(signature); const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function handleApi(req, res, pathname) {
  if (pathname === '/api/admin/login' && req.method === 'POST') {
    const { username, password } = await readBody(req);
    if (!process.env.ADMIN_PASSWORD) return writeJson(res, 503, { error: 'Set ADMIN_PASSWORD before starting the local preview.' });
    if (username !== 'El Baz' || password !== process.env.ADMIN_PASSWORD) return writeJson(res, 401, { error: 'بيانات الإدارة غير صحيحة.' });
    const expires = String(Date.now() + 8 * 60 * 60 * 1000);
    const signature = crypto.createHmac('sha256', secret).update(expires).digest('hex');
    res.setHeader('Set-Cookie', `baz_preview_admin=${expires}.${signature}; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800`);
    return writeJson(res, 200, { ok: true, name: 'El Baz' });
  }
  if (pathname === '/api/admin/logout' && req.method === 'POST') {
    res.setHeader('Set-Cookie', 'baz_preview_admin=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');
    return writeJson(res, 200, { ok: true });
  }
  if (pathname !== '/api/requests') return writeJson(res, 404, { error: 'Not found' });

  if (req.method === 'POST') {
    const { name, phone, reason = '' } = await readBody(req);
    if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 120 ||
        typeof phone !== 'string' || phone.trim().length < 5 || phone.trim().length > 40 ||
        typeof reason !== 'string' || reason.length > 1000) {
      return writeJson(res, 400, { error: 'الرجاء إدخال اسم ورقم هاتف صحيحين.' });
    }
    const requests = readRequests();
    const request = { id: Date.now(), name: name.trim(), phone: phone.trim(), reason: reason.trim(), requested_at: new Date().toISOString(), status: 'pending' };
    requests.unshift(request);
    fs.writeFileSync(dataFile, JSON.stringify(requests, null, 2), 'utf8');
    return writeJson(res, 201, { request });
  }

  if (!sessionIsValid(req)) return writeJson(res, 401, { error: 'يلزم تسجيل دخول الإدارة.' });
  if (req.method === 'GET') return writeJson(res, 200, { requests: readRequests().filter(x => x.status === 'pending') });
  if (req.method === 'PATCH') {
    const { id, status } = await readBody(req);
    if (!['approved', 'rejected'].includes(status)) return writeJson(res, 400, { error: 'طلب غير صالح.' });
    const requests = readRequests();
    const request = requests.find(x => x.id === Number(id) && x.status === 'pending');
    if (!request) return writeJson(res, 404, { error: 'الطلب غير موجود أو تمت معالجته.' });
    request.status = status;
    fs.writeFileSync(dataFile, JSON.stringify(requests, null, 2), 'utf8');
    return writeJson(res, 200, { request });
  }
  res.setHeader('Allow', 'GET, POST, PATCH');
  return writeJson(res, 405, { error: 'Method not allowed' });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url.pathname);
    const requested = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname.slice(1));
    if (['preview-server.js', 'preview-requests.json', 'preview-server.log', 'preview-server-error.log', '.env', '.env.example'].includes(requested)) {
      res.writeHead(404); return res.end('Not found');
    }
    const file = path.resolve(root, requested);
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404); return res.end('Not found');
    }
    res.writeHead(200, {
      'Content-Type': mime[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    });
    fs.createReadStream(file).pipe(res);
  } catch (error) {
    console.error(error);
    if (!res.headersSent) writeJson(res, 500, { error: 'تعذر إتمام الطلب.' });
    else res.end();
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Local preview ready: http://127.0.0.1:${port}`);
  console.log('Preview admin username: El Baz (set ADMIN_PASSWORD before starting)');
});
