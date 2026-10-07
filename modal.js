/* ============================
   أكاديمية الباز — المودال
   ============================ */

const Modal = (() => {
  let current;

  function open({ title, icon = 'ti-settings', body, footer, maxWidth = '500px' }) {
    close();
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.id = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal-box" style="max-width:${maxWidth}">
        <div class="modal-header">
          <h3><i class="ti ${icon}" aria-hidden="true"></i> ${title}</h3>
          <button class="modal-close" onclick="Modal.close()" aria-label="إغلاق"><i class="ti ti-x"></i></button>
        </div>
        <div class="modal-body">${body}</div>
        ${footer ? `<div class="section-footer">${footer}</div>` : ''}
      </div>`;
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
    document.body.appendChild(backdrop);
    current = backdrop;
    return backdrop;
  }

  function close() {
    if (current) { current.remove(); current = null; }
  }

  return { open, close };
})();