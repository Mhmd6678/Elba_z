const crypto = require('node:crypto');

function config() {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    const error = new Error('Server storage is not configured. Set Supabase environment variables in Vercel.');
    error.status = 503;
    throw error;
  }
  return { url: SUPABASE_URL.replace(/\/$/, ''), key: SUPABASE_SERVICE_ROLE_KEY };
}

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function adminCookie(req) {
  const token = (req.headers.cookie || '').split(';').map(v => v.trim())
    .find(v => v.startsWith('baz_admin='))?.slice('baz_admin='.length);
  const secret = process.env.SESSION_SECRET;
  if (!token || !secret) return false;
  const [expires, signature] = token.split('.');
  if (!expires || Number(expires) < Date.now() || !signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(expires).digest('hex');
  const a = Buffer.from(signature); const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function issueCookie(res) {
  const expires = String(Date.now() + 8 * 60 * 60 * 1000);
  const signature = crypto.createHmac('sha256', process.env.SESSION_SECRET).update(expires).digest('hex');
  res.setHeader('Set-Cookie', `baz_admin=${expires}.${signature}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=28800`);
}

async function supabase(path, options = {}) {
  const { url, key } = config();
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  if (!response.ok) {
    const error = new Error(text || 'Database request failed');
    error.status = response.status >= 500 ? 502 : response.status;
    throw error;
  }
  return text ? JSON.parse(text) : null;
}

module.exports = { json, adminCookie, issueCookie, supabase };
