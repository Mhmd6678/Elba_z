const { json } = require('../../lib/server');

module.exports = (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  res.setHeader('Set-Cookie', 'baz_admin=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0');
  return json(res, 200, { ok: true });
};
