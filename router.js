/* ============================
   أكاديمية الباز — نظام التوجيه البسيط
   ============================ */

const Router = (() => {
  const app = document.getElementById('app');
  const routes = { login: LoginPage, admin: AdminPage, student: StudentPage };

  function normalize(route) {
    return (route || '').toString().trim().replace(/^#/, '').toLowerCase();
  }

  function getInitialRoute() {
    if (window.location.hash) return normalize(window.location.hash);
    if (!Auth.isLoggedIn()) return 'login';
    return Auth.isAdmin() ? 'admin' : 'student';
  }

  function buildRoute(route) {
    const name = normalize(route);
    if (name === 'admin' && !Auth.isAdmin()) {
      return Auth.isLoggedIn() ? 'student' : 'login';
    }
    if (name === 'student' && !Auth.isLoggedIn()) {
      return 'login';
    }
    if (!routes[name]) {
      return Auth.isLoggedIn() ? (Auth.isAdmin() ? 'admin' : 'student') : 'login';
    }
    return name;
  }

  function go(route) {
    const target = buildRoute(route || getInitialRoute());
    if (window.location.hash !== '#' + target) {
      history.replaceState(null, '', '#' + target);
    }

    app.innerHTML = routes[target].render();
    Security.init();
  }

  function onHashChange() {
    go(window.location.hash);
  }

  function init() {
    window.addEventListener('hashchange', onHashChange);
    go(getInitialRoute());
  }

  return { init, go };
})();
