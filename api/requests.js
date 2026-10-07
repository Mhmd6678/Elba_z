const { json, adminCookie, supabase } = require('../lib/server');

module.exports = async (req, res) => {
  try {
    if (req.method === 'POST') {
      const { name, phone, reason = '' } = req.body || {};
      if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 120 ||
          typeof phone !== 'string' || phone.trim().length < 5 || phone.trim().length > 40 ||
          typeof reason !== 'string' || reason.length > 1000) {
        return json(res, 400, { error: 'Please enter a valid name and phone number.' });
      }
      const rows = await supabase('registration_requests', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim(), reason: reason.trim() }),
      });
      return json(res, 201, { request: rows[0] });
    }

    if (!adminCookie(req)) return json(res, 401, { error: 'Admin sign-in is required.' });
    if (req.method === 'GET') {
      const rows = await supabase('registration_requests?select=id,name,phone,reason,requested_at,status&status=eq.pending&order=requested_at.desc');
      return json(res, 200, { requests: rows });
    }
    if (req.method === 'PATCH') {
      const { id, status } = req.body || {};
      if (!Number.isInteger(Number(id)) || !['approved', 'rejected'].includes(status)) {
        return json(res, 400, { error: 'Invalid request.' });
      }
      const rows = await supabase(`registration_requests?id=eq.${encodeURIComponent(id)}&status=eq.pending`, {
        method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ status }),
      });
      if (!rows.length) return json(res, 404, { error: 'Request not found or already handled.' });
      return json(res, 200, { request: rows[0] });
    }
    res.setHeader('Allow', 'GET, POST, PATCH');
    return json(res, 405, { error: 'Method not allowed' });
  } catch (error) {
    console.error('requests API:', error);
    return json(res, error.status || 500, {
      error: error.status === 503 ? error.message : 'Unable to save or load the request right now.',
    });
  }
};
