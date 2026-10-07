/* ============================
   أكاديمية الباز — نظام الحماية
   ============================ */

const Security = (() => {
  let active = false;
  let screenshotMonitorActive = false;

  function logAttempt(event, isSecurityBreach = false) {
    if (!isSecurityBreach && DB.settings.get().logAttempts === false) return;
    if (isSecurityBreach && DB.settings.get().notifyBlock !== false) Toast.show('تم رصد حدث أمني: ' + event, 'warning');
    const currentUser = Auth.currentUser();
    const userName = currentUser?.name || 'مجهول';
    const userId = currentUser?.id;
    
    // حفظ محاولة الاختراق فوراً
    DB.logs.add({ 
      event, 
      user: userName, 
      ip: '---', 
      result: 'blocked',
      severity: isSecurityBreach ? 'critical' : 'warning'
    });
    
    // حظر الحساب فوراً عند اكتشاف محاولات أمنية
    if (isSecurityBreach) {
      if (userId) {
        // تحديث الحساب للحالة محظور
        DB.users.block(userId);
      }
      
      // تسجيل إشعار حرج للإدارة
      DB.logs.add({ 
        event: `⛔⛔⛔ حظر الحساب: ${userName} | المستخدم: ${userId || 'غير معروف'} | السبب: ${event}`,
        user: 'نظام-أمان',
        ip: '---',
        result: 'account-blocked',
        severity: 'critical'
      });
      
      // حفظ الجلسة السيئة في sessionStorage
      sessionStorage.setItem('blocked_user_' + userId, JSON.stringify({
        time: new Date().toISOString(),
        reason: event,
        name: userName
      }));
      
      // عرض رسالة الحظر الفوري
      const blockScreen = document.createElement('div');
      blockScreen.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%);
        color: #e74c3c;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: Cairo, sans-serif;
        text-align: center;
        flex-direction: column;
        gap: 16px;
        z-index: 999999;
        padding: 20px;
      `;
      blockScreen.innerHTML = `
        <div style="font-size:64px;animation:pulse 1s infinite">🚫</div>
        <div style="font-size:28px;font-weight:700;color:#e74c3c">تم حظر الحساب فوراً</div>
        <div style="font-size:16px;color:#c0392b;margin-bottom:8px">⚠️ تم رصد محاولة اختراق أمنية</div>
        <div style="font-size:13px;color:#7a7a96;max-width:500px;line-height:1.6;background:rgba(0,0,0,0.3);padding:16px;border-radius:8px;border-left:4px solid #e74c3c">
          <div><strong>السبب:</strong> ${event}</div>
          <div style="margin-top:8px"><strong>اسم المستخدم:</strong> ${userName}</div>
          <div style="margin-top:8px"><strong>الوقت:</strong> ${new Date().toLocaleString('ar')}</div>
          <div style="margin-top:12px;color:#f39c12">يرجى التواصل مع الإدارة لإعادة تفعيل الحساب</div>
        </div>
        <button onclick="location.href='index.html'" style="margin-top:16px;padding:12px 32px;background:#e74c3c;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;font-family:Cairo,sans-serif">العودة للرئيسية</button>
      `;
      document.body.appendChild(blockScreen);
      document.body.style.overflow = 'hidden';
      
      // منع أي تفاعلات أخرى
      setTimeout(() => {
        document.addEventListener('click', (e) => e.stopImmediatePropagation(), true);
        document.addEventListener('keydown', (e) => e.preventDefault(), true);
        document.addEventListener('contextmenu', (e) => e.preventDefault(), true);
      }, 100);
      
    } else {
      Toast.show('⚠ تم رصد محاولة غير مصرح بها وتسجيلها', 'error');
    }
  }

  function enableScreenshotProtection() {
    // منع التقاط الشاشة وحظر الحساب تلقائياً
    document.addEventListener('keydown', (e) => {
      const blocked =
        e.key === 'PrintScreen' ||
        (e.ctrlKey && e.shiftKey && e.key === 'S') ||
        (e.metaKey && e.shiftKey && ['3','4','5','6'].includes(e.key)) ||
        (e.ctrlKey && e.key === 'p') ||
        (e.metaKey && e.key === 'p');

      if (blocked) {
        e.preventDefault(); e.stopPropagation();
        logAttempt('محاولة التقاط شاشة (PrintScreen أو Screenshot)', true);
        // Briefly flash screen white to disrupt attempt
        const flash = document.createElement('div');
        flash.style.cssText = 'position:fixed;inset:0;background:#fff;z-index:99999;pointer-events:none;opacity:0.95';
        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 120);
      }
    }, true);

    // رصد اختفاء الصفحة أو فقدان التركيز أثناء تشغيل الفيديو (خوارزمية مساعدة)
    function checkHiddenWhilePlaying(context) {
      try {
        const v = document.querySelector('video');
        if (v && !v.paused) {
          logAttempt(`خروج/تصغير الصفحة أثناء تشغيل الفيديو (${context}) — احتمال تصوير الشاشة أو تسجيل الشاشة`, true);
        }
      } catch (e) {
        console.error(e);
      }
    }

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) checkHiddenWhilePlaying('visibilitychange');
    });

    window.addEventListener('blur', () => checkHiddenWhilePlaying('blur'));
    window.addEventListener('focus', () => {
      // إذا عاد المستخدم بسرعة بعد فقدان التركيز، احتفظنا بالسجل لكن لا نفعل شيئاً إضافياً
    });
  }

  function enableDevToolsProtection() {
    // Disable right-click context menu
    document.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      logAttempt('محاولة فتح القائمة السياقية على الفيديو', true);
    });

    // Block F12 and Ctrl+Shift+I/J/C
    document.addEventListener('keydown', (e) => {
      const devKeys =
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && ['I','J','C'].includes(e.key.toUpperCase())) ||
        (e.ctrlKey && e.key === 'U');

      if (devKeys) {
        e.preventDefault(); e.stopPropagation();
        logAttempt('محاولة فتح أدوات المطور', true);
      }
    }, true);

    // Detect devtools open via size change (desktop)
    let devOpen = false;
    setInterval(() => {
      const threshold = 160;
      const widthDiff  = window.outerWidth  - window.innerWidth  > threshold;
      const heightDiff = window.outerHeight - window.innerHeight > threshold;
      if ((widthDiff || heightDiff) && !devOpen) {
        devOpen = true;
        logAttempt('تم فتح أدوات المطور — الحساب محظور', true);
      } else if (!widthDiff && !heightDiff) {
        devOpen = false;
      }
    }, 1500);
  }

  function enableWatermark(userName = '') {
    const wm = document.getElementById('watermark-overlay');
    if (!wm) return;
    wm.style.display = 'block';
    // Add dynamic text watermark
    const canvas = document.createElement('canvas');
    canvas.width = 300; canvas.height = 300;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(201,162,39,0.04)';
    ctx.font = '13px Cairo';
    ctx.rotate(-Math.PI / 6);
    ctx.fillText('أكاديمية الباز', 20, 60);
    if (userName) ctx.fillText(userName, 20, 85);
    ctx.fillText(new Date().toLocaleDateString('ar'), 20, 110);
    wm.style.backgroundImage = `url(${canvas.toDataURL()})`;
  }

  function disableSelection() {
    document.addEventListener('selectstart', (e) => {
      // Allow selection in inputs and textareas
      if (!['INPUT','TEXTAREA'].includes(e.target.tagName)) {
        e.preventDefault();
      }
    });
    document.addEventListener('dragstart', (e) => e.preventDefault());
    document.addEventListener('copy', (e) => {
      const sel = window.getSelection().toString();
      if (sel.length > 50) {
        e.preventDefault();
        logAttempt('محاولة نسخ محتوى محمي');
      }
    });
  }

  function applySettings() {
    const settings = DB.settings.get();
    const watermark = document.getElementById('watermark-overlay');
    if (settings.watermark) enableWatermark(Auth.currentUser()?.name || '');
    else if (watermark) watermark.style.display = 'none';
    if (settings.screenshotBlock && !screenshotMonitorActive) {
      document.addEventListener('keydown', event => {
        if (event.key === 'PrintScreen' && DB.settings.get().screenshotBlock) logAttempt('Screenshot key pressed', false);
      }, true);
      screenshotMonitorActive = true;
    }
  }

  function init() {
    if (!active) {
      active = true;
      disableSelection();
    }
    applySettings();
    // Screenshot protection disabled to allow screen capture freely.
    // if (settings.screenshotBlock) enableScreenshotProtection();
    // لا تحظر الحساب بناءً على أبعاد النافذة؛ فحص حجم النافذة يعطي نتائج خاطئة
    // في المعاينة المحلية والمتصفحات ذات الأشرطة الجانبية.
    console.clear();
    // Override console to detect devtools
    const noop = () => {};
    // console.log = console.warn = console.error = noop;
  }

  return { init, enableWatermark, logAttempt, applySettings };
})();
