/* ============================
   أكاديمية الباز — صفحة الدخول
   ============================ */

const LoginPage = (() => {
  function render() {
    return `
    <div class="page-wrap">
      <div class="login-bg">
        <div class="login-card">
          <div class="login-logo-wrap">
            <div class="login-logo-icon">ب</div>
            <div class="login-title">أكاديمية الباز</div>
            <div class="login-subtitle">منصة التعليم المتميز — وصول محدود</div>
          </div>

          <div class="login-lock-notice">
            <i class="ti ti-lock" aria-hidden="true"></i>
            <div>هذه المنصة مغلقة. الدخول للأعضاء المعتمدين فقط من قِبَل الإدارة. لا يمكن التسجيل الذاتي.</div>
          </div>

          <div class="form-group">
            <label class="form-label">الاسم</label>
            <input class="form-control" type="text" id="loginName" placeholder="أدخل اسمك" autocomplete="off">
          </div>
          <div class="form-group">
            <label class="form-label">كلمة المرور</label>
            <div style="position:relative">
              <input class="form-control" type="password" id="loginPass" placeholder="••••••••" autocomplete="off" onkeydown="if(event.key==='Enter')LoginPage.submit()">
              <button onclick="LoginPage.togglePass()" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--baz-muted);cursor:pointer;font-size:16px" aria-label="إظهار كلمة المرور">
                <i class="ti ti-eye" id="eyeIcon"></i>
              </button>
            </div>
          </div>

          <div id="loginError" style="display:none" class="alert alert-danger" style="margin-bottom:14px">
            <i class="ti ti-alert-circle"></i>
            <span id="loginErrorMsg"></span>
          </div>

          <button class="btn btn-gold btn-block btn-lg" onclick="LoginPage.submit()" id="loginBtn" style="margin-top:4px">
            <i class="ti ti-login" aria-hidden="true"></i> دخول إلى المنصة
          </button>

          <div style="${DB.settings.get().selfRegister ? '' : 'display:none;'}text-align:center;margin-top:20px;font-size:12px;color:var(--baz-muted)">
            لا تملك حساباً؟
            <a href="#" onclick="LoginPage.requestAccess()" style="color:var(--baz-gold-lt);text-decoration:none;font-weight:600"> طلب الانضمام</a>
          </div>
        </div>
      </div>
    </div>`;
  }

  async function submit() {
    const name     = document.getElementById('loginName')?.value?.trim();
    const password = document.getElementById('loginPass')?.value;
    const errDiv   = document.getElementById('loginError');
    const errMsg   = document.getElementById('loginErrorMsg');
    const btn      = document.getElementById('loginBtn');

    if (!name || !password) {
      errMsg.textContent = 'يرجى إدخال الاسم وكلمة المرور.';
      errDiv.style.display = 'flex'; return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="ti ti-loader-2" style="animation:spin 1s linear infinite"></i> جارٍ التحقق...';

    try {
      const result = await Auth.login(name, password);
      btn.disabled = false;
      if (result.ok) {
        Toast.show('مرحباً بك في أكاديمية الباز 🦅', 'success');
        errDiv.style.display = 'none';
        setTimeout(() => {
          if (result.user.role === 'admin') Router.go('admin');
          else Router.go('student');
        }, 600);
      } else {
        errMsg.textContent = result.msg;
        errDiv.style.display = 'flex';
        btn.innerHTML = '<i class="ti ti-login"></i> دخول إلى المنصة';
      }
    } catch (error) {
      btn.disabled = false;
      errMsg.textContent = 'تعذر إتمام تسجيل الدخول.';
      errDiv.style.display = 'flex';
    }
  }

  function togglePass() {
    const inp = document.getElementById('loginPass');
    const icon = document.getElementById('eyeIcon');
    if (inp.type === 'password') { inp.type = 'text'; icon.className = 'ti ti-eye-off'; }
    else { inp.type = 'password'; icon.className = 'ti ti-eye'; }
  }

  function requestAccess() {
    Modal.open({
      title: 'طلب الانضمام للمنصة',
      icon: 'ti-user-plus',
      body: `
        <div class="alert alert-info" style="margin-bottom:16px">
          <i class="ti ti-info-circle"></i>
          <span>سيتم مراجعة طلبك من الإدارة. سيتم التواصل معك عبر رقم الهاتف.</span>
        </div>
        <div class="form-group">
          <label class="form-label">الاسم الكامل</label>
          <input class="form-control" id="reqName" placeholder="اسمك الكامل">
        </div>
        <div class="form-group">
          <label class="form-label">رقم الهاتف</label>
          <input class="form-control" id="reqPhone" type="tel" placeholder="05xxxxxxxx">
        </div>
        <div class="form-group">
          <label class="form-label">سبب الانضمام (اختياري)</label>
          <textarea class="form-control" id="reqReason" placeholder="اكتب سبب رغبتك في الانضمام..."></textarea>
        </div>`,
      footer: `
        <button class="btn btn-gold" onclick="LoginPage.sendRequest()">
          <i class="ti ti-send" aria-hidden="true"></i> إرسال الطلب
        </button>
        <button class="btn btn-ghost" onclick="Modal.close()">إلغاء</button>`
    });
  }

  async function sendRequest() {
    const name = document.getElementById('reqName')?.value?.trim();
    const phone = document.getElementById('reqPhone')?.value?.trim();
    if (!name || !phone) { Toast.show('يرجى ملء الاسم ورقم الهاتف.', 'warning'); return; }
    const sendButton = document.querySelector('.modal-box .btn-gold');
    if (sendButton) sendButton.disabled = true;
    try {
      const response = await fetch('/api/requests', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, reason: document.getElementById('reqReason')?.value || '' }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'تعذر حفظ الطلب.');
    } catch (error) {
      if (sendButton) sendButton.disabled = false;
      Toast.show(error.message || 'تعذر الاتصال بالخادم. حاول لاحقاً.', 'error', 5000);
      return;
    }
    Modal.close();
    Toast.show('تم إرسال طلبك بنجاح. سيتم مراجعته قريباً ✓', 'success', 5000);
  }
  return { render, submit, togglePass, requestAccess, sendRequest };
})();
