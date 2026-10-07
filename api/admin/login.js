const { json, issueCookie } = require('../../lib/server');

module.exports = (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  const { username, password } = req.body || {};
  const expectedUser = 'El Baz';
  const expectedPass = process.env.ADMIN_PASSWORD;
  if (!expectedPass || !process.env.SESSION_SECRET) {
    return json(res, 503, { error: 'Admin sign-in is not configured. Set ADMIN_PASSWORD and SESSION_SECRET in Vercel.' });
  }
  if (username !== expectedUser || password !== expectedPass) {
    return json(res, 401, { error: 'Invalid admin credentials.' });
  }
  issueCookie(res);
  return json(res, 200, { ok: true, name: expectedUser });
};
