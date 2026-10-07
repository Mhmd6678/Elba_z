/* ============================
   أكاديمية الباز — نظام المصادقة
   ============================ */

const Auth = (() => {
  const SESSION_KEY = 'baz_session';
  let lastActivityWrite = 0;
  ['pointerdown', 'keydown', 'touchstart'].forEach(eventName => {
    window.addEventListener(eventName, () => {
      const now = Date.now();
      if (now - lastActivityWrite > 60000 && (localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY))) {
        localStorage.setItem('baz_last_activity', String(now));
        lastActivityWrite = now;
      }
    }, { passive: true });
  });
  setInterval(() => {
    if (DB.settings.get().sessionTimeout && (localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY))) session();
  }, 30000);

  async function login(name, password) {
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: name.trim(), password }),
      });
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: 1, role: 'admin', loginAt: new Date().toISOString() }));
        localStorage.setItem('baz_last_activity', String(Date.now()));
        return { ok: true, user: { id: 1, name: data.name, role: 'admin' } };
      }
      if (response.status === 401 && name.trim().toLowerCase() === 'el baz') {
        return { ok: false, msg: 'بيانات دخول الإدارة غير صحيحة. تأكد من ADMIN_PASSWORD في Vercel ثم أعد النشر.' };
      }
      if (response.status !== 401) {
        const data = await response.json().catch(() => ({}));
        return { ok: false, msg: data.error || 'تعذر الاتصال بخدمة تسجيل الدخول.' };
      }
    } catch (_) {
      if (name.trim().toLowerCase() === 'el baz') {
        return { ok: false, msg: 'تعذر الوصول إلى خادم المعاينة. افتح الموقع من http://127.0.0.1:3000 ثم حدّث الصفحة.' };
      }
      /* local student sign-in remains available */
    }
    const user = DB.users.byName(name.trim().toLowerCase());
    if (!user)                    return { ok: false, msg: 'الاسم غير موجود.' };
    if (user.role === 'admin') return { ok: false, msg: 'بيانات الإدارة غير صحيحة.' };
    if (user.password !== password) return { ok: false, msg: 'كلمة المرور غير صحيحة.' };
    if (user.status === 'blocked') return { ok: false, msg: 'حسابك محظور. تواصل مع الإدارة.' };

    if (user.role === 'student' && DB.settings.get().maintenanceMode) {
      return { ok: false, msg: 'المنصة في وضع الصيانة حالياً. حاول لاحقاً.' };
    }
    const session = { userId: user.id, role: user.role, loginAt: new Date().toISOString() };
    const sessionStore = DB.settings.get().singleDevice ? localStorage : sessionStorage;
    sessionStore.setItem(SESSION_KEY, JSON.stringify(session));
    localStorage.setItem('baz_last_activity', String(Date.now()));
    DB.users.setLastLogin(user.id);
    if (DB.settings.get().logAttempts !== false) {
      DB.logs.add({ event: 'تسجيل دخول ناجح', user: user.name, ip: '---', result: 'allowed' });
    }
    return { ok: true, user };
  }

  function logout() {
    fetch('/api/admin/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => {});
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem('baz_last_activity');
    sessionStorage.removeItem(SESSION_KEY);
  }

  function session() {
    const stored = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
    if (!stored) return null;
    const current = JSON.parse(stored);
    if (DB.settings.get().sessionTimeout) {
      const lastActivity = Number(localStorage.getItem('baz_last_activity')) || Date.parse(current.loginAt) || Date.now();
      if (Date.now() - lastActivity > 30 * 60 * 1000) {
        logout();
        return null;
      }
    }
    return current;
  }

  function currentUser() {
    const s = session();
    return s ? DB.users.byId(s.userId) : null;
  }

  function isAdmin() {
    const s = session();
    return s && s.role === 'admin';
  }

  function isLoggedIn() {
    return !!session();
  }

  return { login, logout, session, currentUser, isAdmin, isLoggedIn };
})();
