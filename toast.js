/* ============================
   أكاديمية الباز — الإشعارات
   ============================ */

const Toast = (() => {
  let container;

  function ensure() {
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }
    return container;
  }

  function show(msg, type = 'success', duration = 3500) {
    const c = ensure();
    const icons = { success: 'ti-check', error: 'ti-alert-circle', info: 'ti-info-circle', warning: 'ti-alert-triangle' };
    const el = document.createElement('div');
    el.className = `toast-item toast-${type}`;
    el.innerHTML = `<i class="ti ${icons[type] || 'ti-check'}" aria-hidden="true"></i><span>${msg}</span>`;
    c.appendChild(el);
    setTimeout(() => {
      el.style.animation = 'toastOut 0.3s ease forwards';
      setTimeout(() => el.remove(), 300);
    }, duration);
  }

  return { show };
})();