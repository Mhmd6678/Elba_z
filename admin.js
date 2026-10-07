/* ============================
   أكاديمية الباز — لوحة الإدارة
   ============================ */

const AdminPage = (() => {
  let currentSection = 'overview';
  let addContentFile = null;

  // ===== RENDER SHELL =====
  function render() {
    const s = DB.stats.summary();
    if (DB.settings.get().weeklyReport) scheduleWeeklyReport();
    setTimeout(loadOverviewRequests, 0);
    return `
    <div class="page-wrap">
      <div class="admin-wrap">
        <!-- Sidebar -->
        <aside class="sidebar">
          <div class="sidebar-logo">
            <div class="sidebar-logo-icon">ب</div>
            <div class="sidebar-logo-text">أكاديمية الباز</div>
          </div>

          <div class="sidebar-section-title">الرئيسية</div>
          <div class="sidebar-item active" id="sb-overview" onclick="AdminPage.section('overview')">
            <i class="ti ti-dashboard" aria-hidden="true"></i> نظرة عامة
          </div>

          <div class="sidebar-section-title">الطلاب</div>
          <div class="sidebar-item" id="sb-users" onclick="AdminPage.section('users')">
            <i class="ti ti-users" aria-hidden="true"></i> قائمة الطلاب
          </div>
          <div class="sidebar-item" id="sb-requests" onclick="AdminPage.section('requests')">
            <i class="ti ti-user-plus" aria-hidden="true"></i> طلبات الانضمام
            ${s.pendingRequests > 0 ? `<span class="count" id="pendingRequestsBadge">${s.pendingRequests}</span>` : ''}
          </div>

          <div class="sidebar-section-title">المحتوى</div>
          <div class="sidebar-item" id="sb-courses" onclick="AdminPage.section('courses')">
            <i class="ti ti-books" aria-hidden="true"></i> الكورسات
          </div>
          <div class="sidebar-item" id="sb-content" onclick="AdminPage.section('content')">
            <i class="ti ti-files" aria-hidden="true"></i> المحتوى
          </div>
          <div class="sidebar-item" id="sb-add" onclick="AdminPage.section('add')">
            <i class="ti ti-circle-plus" aria-hidden="true"></i> إضافة محتوى
          </div>

          <div class="sidebar-section-title">الإعدادات</div>
          <div class="sidebar-item" id="sb-permissions" onclick="AdminPage.section('permissions')">
            <i class="ti ti-shield-check" aria-hidden="true"></i> الصلاحيات
          </div>
          <div class="sidebar-item" id="sb-security" onclick="AdminPage.section('security')">
            <i class="ti ti-lock" aria-hidden="true"></i> سجل الأمان
          </div>
          <div class="sidebar-item" id="sb-settings" onclick="AdminPage.section('settings')">
            <i class="ti ti-settings" aria-hidden="true"></i> الإعدادات
          </div>

          <div style="height:1px;background:var(--baz-border);margin:16px 0"></div>
          <div class="sidebar-item" onclick="AdminPage.logout()">
            <i class="ti ti-logout" aria-hidden="true"></i> تسجيل الخروج
          </div>
        </aside>

        <!-- Main -->
        <main class="admin-main" id="adminMain">
          ${renderSection('overview')}
        </main>
      </div>
    </div>`;
  }

  function section(name) {
    currentSection = name;
    document.querySelectorAll('.sidebar-item').forEach(el => el.classList.remove('active'));
    const sb = document.getElementById('sb-' + name);
    if (sb) sb.classList.add('active');
    document.getElementById('adminMain').innerHTML = renderSection(name);
    if (name === 'requests') loadRegistrationRequests();
  }

  async function loadRegistrationRequests() {
    const host = document.getElementById('adminMain');
    try {
      const response = await fetch('/api/requests', { credentials: 'same-origin' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'تعذر تحميل الطلبات.');
      if ((data.requests || []).length && DB.settings.get().notifyRequests !== false) {
        Toast.show(`لديك ${(data.requests || []).length} طلبات انضمام معلقة.`, 'info');
      }
      if (currentSection === 'requests' && host) host.innerHTML = renderRequests(data.requests || []);
    } catch (error) {
      if (host) host.innerHTML = `<div class="alert alert-danger">${error.message}</div>`;
    }
  }

  async function loadOverviewRequests() {
    try {
      const response = await fetch('/api/requests', { credentials: 'same-origin' });
      if (!response.ok) return;
      const data = await response.json();
      const requests = data.requests || [];
      const count = document.getElementById('overviewPendingCount');
      if (count) count.textContent = String(requests.length);
      const alert = document.getElementById('overviewRequestAlert');
      if (alert && requests.length && DB.settings.get().notifyRequests !== false) {
        alert.innerHTML = `<div class="alert alert-gold"><i class="ti ti-bell-ringing"></i><div>لديك <strong>${requests.length}</strong> طلبات انضمام جديدة بانتظار المراجعة. <a href="#" onclick="AdminPage.section('requests')" style="color:var(--baz-gold-lt);margin-right:8px">مراجعة الطلبات ←</a></div></div>`;
      }
      const badge = document.getElementById('pendingRequestsBadge');
      if (badge) { badge.textContent = requests.length; badge.style.display = requests.length ? '' : 'none'; }
    } catch (_) { /* the requests section displays database errors */ }
  }

  function scheduleWeeklyReport() {
    const key = 'baz_weekly_report_last';
    const last = Number(localStorage.getItem(key) || 0);
    if (Date.now() - last < 7 * 24 * 60 * 60 * 1000) return;
    localStorage.setItem(key, String(Date.now()));
    setTimeout(() => {
      const stats = DB.stats.summary();
      Toast.show(`ملخص الأسبوع: ${stats.totalStudents} طالباً، ${stats.pendingRequests} طلباً محلياً معلّقاً، و${stats.totalCourses} كورساً.`, 'info', 7000);
    }, 900);
  }

  function renderSection(name) {
    const map = {
      overview:    renderOverview,
      users:       renderUsers,
      requests:    renderRequests,
      courses:     renderCourses,
      content:     renderContent,
      add:         renderAdd,
      permissions: renderPermissions,
      security:    renderSecurity,
      settings:    renderSettings,
    };
    return (map[name] || renderOverview)();
  }

  // ===== OVERVIEW =====
  function renderOverview() {
    const s   = DB.stats.summary();
    const logs = DB.logs.all().slice(0, 5);
    const reqs = [];
    return `
      <div class="section-header">
        <h2><i class="ti ti-dashboard"></i> نظرة عامة</h2>
        <div style="font-size:12px;color:var(--baz-muted)"><i class="ti ti-clock"></i> ${new Date().toLocaleString('ar-EG')}</div>
      </div>

      <div class="stats-grid">
        <div class="stat-card s-gold">
          <div class="stat-label">إجمالي الطلاب</div>
          <div class="stat-value">${s.totalStudents}</div>
          <div class="stat-trend stat-up"><i class="ti ti-trending-up"></i> نشطون على المنصة</div>
          <i class="ti ti-users stat-icon"></i>
        </div>
        <div class="stat-card s-red">
          <div class="stat-label">طلبات الانضمام</div>
          <div class="stat-value" id="overviewPendingCount">—</div>
          <div class="stat-trend" style="color:var(--baz-warning)"><i class="ti ti-clock"></i> تنتظر المراجعة</div>
          <i class="ti ti-user-plus stat-icon"></i>
        </div>
        <div class="stat-card s-blue">
          <div class="stat-label">المحتوى التعليمي</div>
          <div class="stat-value">${s.totalContent}</div>
          <div class="stat-trend stat-up">${s.totalCourses} كورسات نشطة</div>
          <i class="ti ti-books stat-icon"></i>
        </div>
        <div class="stat-card s-green">
          <div class="stat-label">نشاط اليوم</div>
          <div class="stat-value">${s.activeToday}</div>
          <div class="stat-trend stat-up"><i class="ti ti-circle-check"></i> دخلوا اليوم</div>
          <i class="ti ti-activity stat-icon"></i>
        </div>
      </div>

      ${reqs.length ? `
      <div class="alert alert-gold">
        <i class="ti ti-bell-ringing"></i>
        <div>يوجد <strong>${reqs.length}</strong> طلب انضمام جديد ينتظر موافقتك.
          <a href="#" onclick="AdminPage.section('requests')" style="color:var(--baz-gold-lt);margin-right:8px">مراجعة الطلبات ←</a>
        </div>
      </div>` : ''}

      <div id="overviewRequestAlert"></div>
      <div class="section-header" style="margin-top:8px">
        <h2><i class="ti ti-activity"></i> آخر الأحداث</h2>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>الحدث</th><th>المستخدم</th><th>الوقت</th><th>النتيجة</th></tr></thead>
          <tbody>
            ${logs.map(l => `
            <tr>
              <td>${l.event}</td>
              <td><span class="avatar" style="width:28px;height:28px;font-size:10px">${(l.user||'م').slice(0,2)}</span> ${l.user}</td>
              <td style="color:var(--baz-muted);font-size:12px">${fmtTime(l.time)}</td>
              <td><span class="badge ${l.result==='allowed'?'badge-active':'badge-blocked'}">${l.result==='allowed'?'مسموح':'محجوب'}</span></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  }

  // ===== USERS =====
  function renderUsers() {
    const users = DB.users.students();
    return `
      <div class="section-header">
        <h2><i class="ti ti-users"></i> إدارة الطلاب</h2>
        <div style="display:flex;gap:10px;align-items:center">
          <div class="search-bar">
            <i class="ti ti-search"></i>
            <input type="text" placeholder="بحث..." oninput="AdminPage.filterUsers(this.value)" id="userSearch">
          </div>
          <button class="btn btn-gold btn-sm" onclick="AdminPage.addUserModal()">
            <i class="ti ti-user-plus"></i> إضافة طالب
          </button>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>الطالب</th><th>الكورسات</th><th>آخر دخول</th><th>الحالة</th><th>إجراء</th></tr></thead>
          <tbody id="usersBody">${renderUsersRows(users)}</tbody>
        </table>
      </div>`;
  }

  function renderUsersRows(users) {
    return users.map(u => `
      <tr id="urow-${u.id}">
        <td>
          <div class="user-cell">
            <div class="avatar">${u.name.slice(0,2)}</div>
            <div class="user-info">
              <div class="name">${u.name}</div>
              <div class="email">${u.email}</div>
            </div>
          </div>
        </td>
        <td>${u.courses?.length || 0} كورسات</td>
        <td style="font-size:12px;color:var(--baz-muted)">${fmtTime(u.lastLogin)}</td>
        <td><span class="badge ${u.status==='active'?'badge-active':'badge-blocked'}">${u.status==='active'?'نشط':'محظور'}</span></td>
        <td>
          <div style="display:flex;gap:6px;align-items:center">
            <button class="btn ${u.status==='active'?'btn-danger':'btn-success'} btn-sm"
              onclick="AdminPage.toggleBlock(${u.id})">
              <i class="ti ${u.status==='active'?'ti-ban':'ti-circle-check'}"></i>
              ${u.status==='active'?'حظر':'رفع الحظر'}
            </button>
            <button class="btn btn-info btn-sm" onclick="AdminPage.manageUserCourses(${u.id})">
              <i class="ti ti-books"></i> الكورسات
            </button>
            <button class="btn btn-danger btn-sm" onclick="AdminPage.deleteUser(${u.id})">
              <i class="ti ti-trash"></i>
            </button>
          </div>
        </td>
      </tr>`).join('');
  }

  function filterUsers(q) {
    const users = DB.users.students().filter(u =>
      u.name.includes(q) || u.email.includes(q));
    document.getElementById('usersBody').innerHTML = renderUsersRows(users);
  }

  function toggleBlock(id) {
    const u = DB.users.byId(id);
    if (u.status === 'active') { DB.users.block(id);   Toast.show(`تم حظر ${u.name}`, 'warning'); }
    else                       { DB.users.unblock(id); Toast.show(`تم رفع الحظر عن ${u.name}`, 'success'); }
    section('users');
  }

  function deleteUser(id) {
    const u = DB.users.byId(id);
    if (!u) return;
    if (!confirm(`هل أنت متأكد من حذف حساب ${u.name}؟ سيتم إزالة الطالب نهائياً.`)) return;
    DB.users.delete(id);
    Toast.show(`تم حذف حساب ${u.name} بنجاح.`, 'warning');
    section('users');
  }

  function addUserModal() {
    Modal.open({
      title: 'إضافة طالب جديد', icon: 'ti-user-plus',
      body: `
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">الاسم الكامل</label>
            <input class="form-control" id="nuName" placeholder="اسم الطالب">
          </div>
          <div class="form-group">
            <label class="form-label">كلمة المرور</label>
            <input class="form-control" id="nuPass" type="password" placeholder="كلمة مرور مؤقتة">
          </div>
          <div class="form-group">
            <label class="form-label">الكورسات المتاحة</label>
            <div style="display:flex;flex-direction:column;gap:6px;margin-top:4px">
              ${DB.courses.all().map(c => `
              <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer">
                <input type="checkbox" value="${c.id}" class="nu-course"> ${c.emoji} ${c.title}
              </label>`).join('')}
            </div>
          </div>
        </div>`,
      footer: `
        <button class="btn btn-gold" onclick="AdminPage.createUser()"><i class="ti ti-check"></i> إنشاء الحساب</button>
        <button class="btn btn-ghost" onclick="Modal.close()">إلغاء</button>`
    });
  }

  function createUser() {
    const name  = document.getElementById('nuName')?.value?.trim();
    const pass  = document.getElementById('nuPass')?.value;
    const courseIds = [...document.querySelectorAll('.nu-course:checked')].map(c => +c.value);
    if (!name || !pass) { Toast.show('يرجى ملء الاسم وكلمة المرور', 'warning'); return; }
    if (DB.users.byName(name)) { Toast.show('الاسم مسجل بالفعل', 'error'); return; }
    const emailSafe = name.trim().toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9\.]/g, '') || `user${Date.now()}`;
    const email = `${emailSafe}@student.local`;
    DB.users.add({ name, email, password: pass, role: 'student', status: 'active', courses: courseIds, progress: {} });
    Modal.close();
    Toast.show(`تم إنشاء حساب ${name} بنجاح ✓`, 'success');
    section('users');
  }

  function manageUserCourses(id) {
    const u = DB.users.byId(id);
    Modal.open({
      title: `كورسات ${u.name}`, icon: 'ti-books',
      body: `
        <div style="display:flex;flex-direction:column;gap:10px">
          ${DB.courses.all().map(c => `
          <label style="display:flex;align-items:center;gap:12px;padding:12px;border:1px solid var(--baz-border);border-radius:10px;cursor:pointer;transition:background .2s"
            onmouseenter="this.style.background='rgba(201,162,39,.04)'"
            onmouseleave="this.style.background='transparent'">
            <input type="checkbox" ${u.courses?.includes(c.id)?'checked':''} value="${c.id}" class="uc-course" style="width:16px;height:16px">
            <span style="font-size:20px">${c.emoji}</span>
            <div>
              <div style="font-size:13px;font-weight:500">${c.title}</div>
              <div style="font-size:11px;color:var(--baz-muted)">${c.contentCount} درس — ${c.duration}</div>
            </div>
          </label>`).join('')}
        </div>`,
      footer: `
        <button class="btn btn-gold" onclick="AdminPage.saveUserCourses(${id})"><i class="ti ti-device-floppy"></i> حفظ</button>
        <button class="btn btn-ghost" onclick="Modal.close()">إلغاء</button>`
    });
  }

  function saveUserCourses(id) {
    const ids = [...document.querySelectorAll('.uc-course:checked')].map(c => +c.value);
    DB.users.update(id, { courses: ids });
    Modal.close();
    Toast.show('تم تحديث الكورسات ✓', 'success');
    section('users');
  }

  // ===== REQUESTS =====
  function renderRequests(reqs = DB.requests.pending()) {
    return `
      <div class="section-header">
        <h2><i class="ti ti-user-plus"></i> طلبات الانضمام</h2>
        <span class="badge badge-gold">${reqs.length} طلب معلق</span>
      </div>
      <div class="alert alert-info">
        <i class="ti ti-shield-lock"></i>
        <div>لا يستطيع أي شخص الدخول للمنصة قبل الموافقة اليدوية من المدير. هذا الإجراء تلقائي ومحمي.</div>
      </div>
      ${reqs.length ? `
      <div class="table-wrap">
        <table>
          <thead><tr><th>الاسم</th><th>الهاتف</th><th>تاريخ الطلب</th><th>إجراء</th></tr></thead>
          <tbody id="reqBody">
            ${reqs.map(r => `
            <tr id="req-${r.id}">
              <td><strong>${r.name}</strong></td>
              <td style="color:var(--baz-muted)">${r.phone}</td>
              <td style="font-size:12px;color:var(--baz-muted)">${fmtTime(r.requested_at || r.requestedAt)}</td>
              <td>
                <div style="display:flex;gap:6px">
                  <button class="btn btn-success btn-sm" onclick="AdminPage.approveReq(${r.id})">
                    <i class="ti ti-check"></i> قبول
                  </button>
                  <button class="btn btn-danger btn-sm" onclick="AdminPage.rejectReq(${r.id})">
                    <i class="ti ti-x"></i> رفض
                  </button>
                </div>
              </td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>` : `
      <div style="text-align:center;padding:48px;color:var(--baz-muted)">
        <i class="ti ti-circle-check" style="font-size:40px;opacity:.3;display:block;margin-bottom:12px;color:var(--baz-success)"></i>
        <p>لا توجد طلبات معلقة حالياً</p>
      </div>`}`;
  }

  async function approveReq(id) {
    await updateRegistrationRequest(id, 'approved');
  }

  async function rejectReq(id) {
    await updateRegistrationRequest(id, 'rejected');
  }

  async function updateRegistrationRequest(id, status) {
    try {
      const response = await fetch('/api/requests', {
        method: 'PATCH', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'تعذر تحديث الطلب.');
      Toast.show(status === 'approved' ? 'تم قبول الطلب.' : 'تم رفض الطلب.', status === 'approved' ? 'success' : 'warning');
      await loadRegistrationRequests();
    } catch (error) {
      Toast.show(error.message || 'تعذر تحديث الطلب.', 'error');
    }
  }

  // ===== COURSES =====
  function renderCourses() {
    const courses = DB.courses.all();
    return `
      <div class="section-header">
        <h2><i class="ti ti-books"></i> الكورسات</h2>
        <button class="btn btn-gold btn-sm" onclick="AdminPage.addCourseModal()">
          <i class="ti ti-plus"></i> كورس جديد
        </button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px">
        ${courses.map(c => `
        <div class="card card-gold-top">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
            <span style="font-size:32px">${c.emoji}</span>
            <div>
              <div style="font-size:14px;font-weight:600">${c.title}</div>
              <div style="font-size:11px;color:var(--baz-muted)">${c.enrolled} طالب مسجل</div>
            </div>
          </div>
          <div style="font-size:12px;color:var(--baz-muted);margin-bottom:12px">${c.description}</div>
          <div style="display:flex;gap:8px;font-size:11px;color:var(--baz-muted);margin-bottom:14px">
            <span><i class="ti ti-files"></i> ${c.contentCount} محتوى</span>
            <span><i class="ti ti-clock"></i> ${c.duration}</span>
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-ghost btn-sm" onclick="AdminPage.editCourse(${c.id})"><i class="ti ti-edit"></i> تعديل</button>
            <button class="btn btn-danger btn-sm" onclick="AdminPage.deleteCourse(${c.id})"><i class="ti ti-trash"></i></button>
          </div>
        </div>`).join('')}
        <div class="add-card card" onclick="AdminPage.addCourseModal()">
          <i class="ti ti-plus"></i>
          <span>إضافة كورس جديد</span>
        </div>
      </div>`;
  }

  function addCourseModal() {
    const modal = Modal.open({
      title: 'إضافة كورس جديد', icon: 'ti-books',
      body: `
        <div class="form-group">
          <label class="form-label">اسم الكورس</label>
          <input class="form-control" id="ncTitle" placeholder="مثال: الرياضيات المتقدمة">
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">الرمز التعبيري</label>
            <input class="form-control" id="ncEmoji" placeholder="📚" maxlength="2">
          </div>
          <div class="form-group">
            <label class="form-label">صورة الغلاف</label>
            <input class="form-control" type="file" id="ncCoverFile" accept="image/*">
          </div>
          <div class="form-group">
            <label class="form-label">المدة الإجمالية</label>
            <input class="form-control" id="ncDuration" placeholder="مثال: 20 ساعة">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">الوصف</label>
          <textarea class="form-control" id="ncDesc" placeholder="وصف مختصر للكورس..."></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">فيديوهات الكورس</label>
          <div id="ncVideos" style="display:flex;flex-direction:column;gap:10px">
            <div class="course-video-row" style="display:grid;grid-template-columns:1fr 120px 40px;gap:10px;align-items:center">
              <input class="form-control nv-title" placeholder="عنوان الفيديو">
              <input class="form-control nv-duration" placeholder="المدة">
              <button class="btn btn-danger btn-sm" type="button" onclick="AdminPage.removeCourseVideoRow(this)">&times;</button>
            </div>
          </div>
          <button id="ncAddVideoBtn" class="btn btn-ghost btn-sm" type="button" style="margin-top:10px">
            <i class="ti ti-plus"></i> إضافة فيديو
          </button>
        </div>`,
      footer: `
        <button class="btn btn-gold" onclick="AdminPage.createCourse()"><i class="ti ti-check"></i> إنشاء الكورس</button>
        <button class="btn btn-ghost" onclick="Modal.close()">إلغاء</button>`
    });

    const addBtn = modal.querySelector('#ncAddVideoBtn');
    if (addBtn) addBtn.addEventListener('click', addCourseVideoRow);
  }

  function addCourseVideoRow() {
    const container = document.getElementById('ncVideos');
    if (!container) return;
    const row = document.createElement('div');
    row.className = 'course-video-row';
    row.style.cssText = 'display:grid;grid-template-columns:1fr 120px 40px;gap:10px;align-items:center';
    row.innerHTML = `
      <input class="form-control nv-title" placeholder="عنوان الفيديو">
      <input class="form-control nv-duration" placeholder="المدة">
      <button class="btn btn-danger btn-sm" type="button" onclick="AdminPage.removeCourseVideoRow(this)">&times;</button>
    `;
    container.appendChild(row);
  }

  function removeCourseVideoRow(btn) {
    const row = btn.closest('.course-video-row');
    if (row) row.remove();
  }

  function createCourse() {
    const title    = document.getElementById('ncTitle')?.value?.trim();
    const emoji    = document.getElementById('ncEmoji')?.value || '📚';
    const duration = document.getElementById('ncDuration')?.value || '—';
    const desc     = document.getElementById('ncDesc')?.value || '';
    const fileInput = document.getElementById('ncCoverFile');
    const videoRows = Array.from(document.querySelectorAll('#ncVideos .course-video-row'));
    const videos = videoRows.map(row => ({
      title: row.querySelector('.nv-title')?.value?.trim(),
      duration: row.querySelector('.nv-duration')?.value?.trim() || '—'
    })).filter(v => v.title);
    
    if (!title) { Toast.show('يرجى إدخال اسم الكورس', 'warning'); return; }
    if (!videos.length) { Toast.show('يرجى إضافة فيديو واحد على الأقل للكورس', 'warning'); return; }
    
    let coverData = null;
    if (fileInput && fileInput.files.length > 0) {
      const file = fileInput.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        coverData = e.target.result;
        const course = DB.courses.add({ title, emoji, cover: coverData, description: desc, duration, contentCount: videos.length, enrolled: 0, status: 'active' });
        videos.forEach(video => {
          DB.content.add({ courseId: course.id, title: video.title, type: 'video', duration: video.duration, views: 0 });
        });
        Modal.close();
        Toast.show(`تم إنشاء كورس "${title}" مع ${videos.length} فيديو ✓`, 'success');
        AdminPage.section('courses');
      };
      reader.readAsDataURL(file);
    } else {
      const course = DB.courses.add({ title, emoji, description: desc, duration, contentCount: videos.length, enrolled: 0, status: 'active' });
      videos.forEach(video => {
        DB.content.add({ courseId: course.id, title: video.title, type: 'video', duration: video.duration, views: 0 });
      });
      Modal.close();
      Toast.show(`تم إنشاء كورس "${title}" مع ${videos.length} فيديو ✓`, 'success');
      AdminPage.section('courses');
    }
  }

  function deleteCourse(id) {
    if (!confirm('هل أنت متأكد من حذف هذا الكورس؟')) return;
    DB.courses.delete(id);
    Toast.show('تم حذف الكورس', 'warning');
    section('courses');
  }

  function editCourse(id) {
    const c = DB.courses.byId(id);
    Modal.open({
      title: 'تعديل الكورس', icon: 'ti-edit',
      body: `
        <div class="form-group">
          <label class="form-label">اسم الكورس</label>
          <input class="form-control" id="ecTitle" value="${c.title}">
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">الرمز</label>
            <input class="form-control" id="ecEmoji" value="${c.emoji}" maxlength="2">
          </div>
          <div class="form-group">
            <label class="form-label">صورة الغلاف</label>
            <input class="form-control" type="file" id="ecCoverFile" accept="image/*">
          </div>
          <div class="form-group">
            <label class="form-label">المدة</label>
            <input class="form-control" id="ecDuration" value="${c.duration}">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">الوصف</label>
          <textarea class="form-control" id="ecDesc">${c.description}</textarea>
        </div>`,
      footer: `
        <button class="btn btn-gold" onclick="AdminPage.updateCourse(${id})"><i class="ti ti-device-floppy"></i> حفظ</button>
        <button class="btn btn-ghost" onclick="Modal.close()">إلغاء</button>`
    });
  }

  function updateCourse(id) {
    const fileInput = document.getElementById('ecCoverFile');
    
    if (fileInput && fileInput.files.length > 0) {
      const file = fileInput.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        const coverData = e.target.result;
        DB.courses.update(id, {
          title:    document.getElementById('ecTitle').value,
          emoji:    document.getElementById('ecEmoji').value,
          cover:    coverData,
          duration: document.getElementById('ecDuration').value,
          description: document.getElementById('ecDesc').value,
        });
        Modal.close();
        Toast.show('تم تحديث الكورس ✓', 'success');
        AdminPage.section('courses');
      };
      reader.readAsDataURL(file);
    } else {
      DB.courses.update(id, {
        title:    document.getElementById('ecTitle').value,
        emoji:    document.getElementById('ecEmoji').value,
        duration: document.getElementById('ecDuration').value,
        description: document.getElementById('ecDesc').value,
      });
      Modal.close();
      Toast.show('تم تحديث الكورس ✓', 'success');
      AdminPage.section('courses');
    }
  }

  // ===== CONTENT =====
  function renderContent() {
    const content = DB.content.all();
    const icons   = { video:'ti-player-play', pdf:'ti-file-type-pdf', quiz:'ti-clipboard-list', live:'ti-broadcast', article:'ti-article' };
    const colors  = { video:'tag-video', pdf:'tag-pdf', quiz:'tag-quiz', live:'tag-live', article:'tag-article' };
    const labels  = { video:'فيديو', pdf:'PDF', quiz:'اختبار', live:'مباشر', article:'مقال' };

    return `
      <div class="section-header">
        <h2><i class="ti ti-files"></i> المحتوى التعليمي</h2>
        <button class="btn btn-gold btn-sm" onclick="AdminPage.section('add')">
          <i class="ti ti-plus"></i> إضافة محتوى
        </button>
      </div>
      <div class="content-grid">
        ${content.map(item => `
        <div class="content-card">
          <div class="content-thumb" style="background:linear-gradient(135deg,var(--baz-surface),var(--baz-dark))">
            <i class="ti ${icons[item.type] || 'ti-file'}" style="color:var(--baz-gold);opacity:.7"></i>
            <span class="content-type-tag ${colors[item.type]}">${labels[item.type]}</span>
          </div>
          <div class="content-info">
            <h4>${item.title}</h4>
            <div class="content-meta">
              <span>${DB.courses.byId(item.courseId)?.title || '—'}</span>
              <span>${item.fileName ? item.fileName : item.duration || item.pages || (item.questions ? item.questions+' سؤال' : '') || ''}</span>
            </div>
            <div style="display:flex;gap:6px;margin-top:10px">
              <button class="btn btn-ghost btn-sm" onclick="AdminPage.previewContent(${item.id})"><i class="ti ti-eye"></i></button>
              <button class="btn btn-ghost btn-sm" onclick="AdminPage.editContent(${item.id})"><i class="ti ti-edit"></i></button>
              <button class="btn btn-danger btn-sm" onclick="AdminPage.deleteContent(${item.id})"><i class="ti ti-trash"></i></button>
            </div>
          </div>
        </div>`).join('')}
        <div class="add-card content-card" onclick="AdminPage.section('add')">
          <i class="ti ti-plus"></i>
          <span>إضافة محتوى جديد</span>
        </div>
      </div>`;
  }

  function deleteContent(id) {
    if (!confirm('هل أنت متأكد من حذف هذا المحتوى؟')) return;
    DB.content.delete(id);
    Toast.show('تم حذف المحتوى', 'warning');
    section('content');
  }

  async function previewContent(id) {
    const item = DB.content.byId(id);
    if (!item) return;
    const mediaHtml = await getAdminContentMediaHtml(item);
    Modal.open({
      title: item.title,
      icon: 'ti-eye',
      maxWidth: '580px',
      body: `
        <div style="background:var(--baz-dark);border-radius:12px;aspect-ratio:16/9;display:flex;align-items:center;justify-content:center;margin-bottom:16px;position:relative;overflow:hidden">
          ${mediaHtml}
        </div>
        <div class="alert alert-gold">
          <i class="ti ti-shield"></i>
          <span>هذه المعاينة تُظهر الملف المرفوع. إذا كان فيديو، سيعمل هنا.</span>
        </div>`,
      footer: `<button class="btn btn-ghost" onclick="Modal.close()">إغلاق</button>`
    });
  }

  async function getAdminContentMediaHtml(item) {
    if (item.fileId) {
      try {
        const fileRecord = await DB.files.get(item.fileId);
        if (fileRecord?.data) {
          const url = URL.createObjectURL(fileRecord.data);
          const fileType = fileRecord.type || item.fileType || '';
          if (fileType.startsWith('video/')) {
            // فيديو مع أزرار تحكم، السماح بالتنزيل وفتح القائمة السياقية
            return `<video controls style="width:100%;height:100%;border-radius:12px;background:#000;user-select:none" src="${url}"></video>`;
          }
          if (fileType === 'application/pdf') {
            return `<iframe src="${url}" style="width:100%;height:100%;border:none;border-radius:12px"></iframe>`;
          }
          return `
            <div style="text-align:center;padding:40px;color:var(--baz-muted)">
              <i class="ti ti-download" style="font-size:40px;color:var(--baz-gold);margin-bottom:12px"></i>
              <div>هذا المحتوى متاح للعرض والتنزيل.</div>
              <div style="font-size:11px;margin-top:8px;color:var(--baz-muted)">استخدم خيارات المستعرض لحفظ الملف.</div>
            </div>`;
        }
      } catch (e) {
        console.error(e);
      }
    }
    return `<div style="text-align:center;color:var(--baz-muted)">لا يوجد ملف قابل للعرض.</div>`;
  }

  function editContent(id) {
    const item = DB.content.byId(id);
    Modal.open({
      title: 'تعديل المحتوى', icon: 'ti-edit',
      body: `
        <div class="form-group">
          <label class="form-label">العنوان</label>
          <input class="form-control" id="ecTitle" value="${item.title}">
        </div>
        <div class="form-group">
          <label class="form-label">الكورس</label>
          <select class="form-control" id="ecCourse">
            ${DB.courses.all().map(c => `<option value="${c.id}" ${c.id===item.courseId?'selected':''}>${c.title}</option>`).join('')}
          </select>
        </div>`,
      footer: `
        <button class="btn btn-gold" onclick="AdminPage.saveContent(${id})"><i class="ti ti-device-floppy"></i> حفظ</button>
        <button class="btn btn-ghost" onclick="Modal.close()">إلغاء</button>`
    });
  }

  function saveContent(id) {
    DB.content.update(id, {
      title: document.getElementById('ecTitle').value,
      courseId: +document.getElementById('ecCourse').value,
    });
    Modal.close();
    Toast.show('تم تحديث المحتوى ✓', 'success');
    section('content');
  }

  // ===== ADD CONTENT =====
  function renderAdd() {
    return `
      <div class="section-header">
        <h2><i class="ti ti-circle-plus"></i> إضافة محتوى جديد</h2>
      </div>
      <div class="card" style="max-width:700px">
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">عنوان المحتوى *</label>
            <input class="form-control" id="addTitle" placeholder="عنوان الدرس أو المادة">
          </div>
          <div class="form-group">
            <label class="form-label">نوع المحتوى *</label>
            <select class="form-control" id="addType" onchange="AdminPage.toggleQuizFields(this.value)">
              <option value="video">🎥 فيديو</option>
              <option value="pdf">📄 ملف PDF</option>
              <option value="quiz">📝 اختبار تفاعلي</option>
              <option value="live">📡 بث مباشر</option>
              <option value="article">📰 مقال نصي</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">الكورس المرتبط *</label>
            <select class="form-control" id="addCourse">
              ${DB.courses.all().map(c => `<option value="${c.id}">${c.emoji} ${c.title}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">المدة / الحجم</label>
            <input class="form-control" id="addDuration" placeholder="مثال: 45 دقيقة أو 12 صفحة">
          </div>
        </div>

        <div id="quizFields" class="form-group" style="display:none">
          <label class="form-label">أسئلة الاختبار بصيغة JSON: question، options، answer (رقم الخيار بدءاً من 0)</label>
          <textarea class="form-control" id="quizData" rows="7" dir="ltr" placeholder='[{"question":"نص السؤال","options":["الخيار الأول","الخيار الثاني"],"answer":0}]'></textarea>
        </div>

        <div class="form-group">
          <label class="form-label">وصف المحتوى</label>
          <textarea class="form-control" id="addDesc" placeholder="وصف مختصر للمحتوى..."></textarea>
        </div>

        <div class="form-group">
          <label class="form-label">الوصول المسموح</label>
          <select class="form-control" id="addAccess">
            <option>جميع الطلاب المعتمدين</option>
            <option>المستوى المتقدم فقط</option>
            <option>طلاب محددين</option>
          </select>
        </div>

        <div id="uploadZone" class="upload-zone" onclick="AdminPage.openUploadPicker()" ondragover="event.preventDefault()" ondrop="AdminPage.handleUploadDrop(event)">
          <i class="ti ti-cloud-upload"></i>
          <p>اسحب الملف هنا أو انقر للاختيار</p>
          <small>MP4, PDF, DOCX, ZIP — حجم أقصى 2GB</small>
        </div>
        <input id="addFileInput" type="file" accept="video/*,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/zip" style="display:none" onchange="AdminPage.onAddFileSelected(event)">
        <div id="uploadPreview" style="margin-top:10px;font-size:13px;color:var(--baz-muted)"></div>

        <div class="section-footer">
          <button class="btn btn-gold" onclick="AdminPage.publishContent()">
            <i class="ti ti-check"></i> نشر المحتوى
          </button>
          <button class="btn btn-ghost" onclick="AdminPage.draftContent()">
            <i class="ti ti-file"></i> حفظ كمسودة
          </button>
        </div>
      </div>`;
  }

  async function publishContent() {
    const title    = document.getElementById('addTitle')?.value?.trim();
    const type     = document.getElementById('addType')?.value;
    const courseId = +document.getElementById('addCourse')?.value;
    const duration = document.getElementById('addDuration')?.value;
    if (!title) { Toast.show('يرجى إدخال عنوان المحتوى', 'warning'); return; }

    let quizQuestions;
    if (type === 'quiz') {
      try {
        quizQuestions = JSON.parse(document.getElementById('quizData')?.value || '[]');
        if (!Array.isArray(quizQuestions) || !quizQuestions.length || quizQuestions.some(q =>
          typeof q.question !== 'string' || !q.question.trim() || !Array.isArray(q.options) ||
          q.options.length < 2 || q.options.length > 6 || !Number.isInteger(q.answer) ||
          q.answer < 0 || q.answer >= q.options.length || q.options.some(o => typeof o !== 'string' || !o.trim()))) {
          throw new Error('أدخل سؤالاً واحداً على الأقل، ولكل سؤال خياران على الأقل وإجابة صحيحة.');
        }
      } catch (error) {
        Toast.show(error instanceof SyntaxError ? 'صيغة JSON غير صحيحة.' : error.message, 'warning');
        return;
      }
    }

    let fileId = null;
    if (addContentFile) {
      fileId = await DB.files.add(addContentFile);
    }

    DB.content.add({
      title,
      type,
      courseId,
      duration,
      status: 'published',
      views: 0,
      fileId,
      fileName: addContentFile?.name || '',
      fileType: addContentFile?.type || '',
      quizQuestions,
    });
    const c = DB.courses.byId(courseId);
    DB.courses.update(courseId, { contentCount: (c.contentCount || 0) + 1 });
    Toast.show(`تم نشر "${title}" بنجاح ✓`, 'success');
    addContentFile = null;
    clearUploadPreview();
    section('content');
  }

  async function draftContent() {
    const title    = document.getElementById('addTitle')?.value?.trim();
    const type     = document.getElementById('addType')?.value;
    const courseId = +document.getElementById('addCourse')?.value;
    if (!title) { Toast.show('يرجى إدخال عنوان المحتوى', 'warning'); return; }

    let fileId = null;
    if (addContentFile) {
      fileId = await DB.files.add(addContentFile);
    }

    DB.content.add({
      title,
      type,
      courseId,
      status: 'draft',
      views: 0,
      fileId,
      fileName: addContentFile?.name || '',
      fileType: addContentFile?.type || ''
    });
    Toast.show('تم الحفظ كمسودة', 'info');
    addContentFile = null;
    clearUploadPreview();
    section('content');
  }

  function onAddFileSelected(ev) {
    const file = ev.target.files?.[0];
    if (file) {
      addContentFile = file;
      updateUploadPreview(file);
    }
    ev.target.value = '';
  }

  function handleUploadDrop(ev) {
    ev.preventDefault();
    const file = ev.dataTransfer?.files?.[0];
    if (file) {
      addContentFile = file;
      updateUploadPreview(file);
    }
  }

  function openUploadPicker() {
    const input = document.getElementById('addFileInput');
    input?.click();
  }

  function updateUploadPreview(file) {
    const preview = document.getElementById('uploadPreview');
    if (preview) {
      preview.textContent = `الملف المحدد: ${file.name} — ${(file.size/1024/1024).toFixed(2)} MB`;
    }
  }

  function clearUploadPreview() {
    const preview = document.getElementById('uploadPreview');
    if (preview) preview.textContent = '';
    const input = document.getElementById('addFileInput');
    if (input) input.value = '';
  }

  // ===== PERMISSIONS =====
  function renderPermissions() {
    const s = DB.settings.get();
    function tog(key, label) {
      const initial = {
        allowDownload: true, allowComments: true, allowShare: false, showProgress: true, allowQuiz: true,
        screenshotBlock: false, watermark: true, videoEncrypt: true, selfRegister: false, singleDevice: false,
        notifyRequests: true, notifyBlock: true, notifyComplete: true, weeklyReport: false,
        logAttempts: true, trackProgress: true, sessionTimeout: false, maintenanceMode: false,
      };
      const checked = Object.prototype.hasOwnProperty.call(s, key) ? s[key] : initial[key];
      return `<div class="perm-item">
        <span>${label}</span>
        <label class="toggle">
          <input type="checkbox" ${checked?'checked':''} onchange="AdminPage.savePerm('${key}',this.checked)">
          <span class="toggle-slider"></span>
        </label>
      </div>`;
    }
    return `
      <div class="section-header">
        <h2><i class="ti ti-shield-check"></i> الصلاحيات والأمان</h2>
        <span class="badge badge-active"><i class="ti ti-shield"></i> الحماية مفعلة</span>
      </div>
      <div class="perms-grid">
        <div class="perm-card">
          <div class="perm-card-title"><i class="ti ti-user"></i> صلاحيات الطالب</div>
          ${tog('allowDownload',    'السماح بالتحميل')}
          ${tog('allowComments',    'السماح بالتعليق')}
          ${tog('allowShare',       'مشاركة المحتوى')}
          ${tog('showProgress',     'إظهار تقدم الطالب')}
          ${tog('allowQuiz',        'حل الاختبارات')}
        </div>
        <div class="perm-card">
          <div class="perm-card-title"><i class="ti ti-lock"></i> حماية المحتوى</div>
          ${tog('screenshotBlock',  'تسجيل محاولات التقاط الشاشة')}
          ${tog('watermark',        'العلامة المائية')}
          ${tog('videoEncrypt',     'حماية عرض الفيديو')}
          ${tog('selfRegister',     'السماح بطلب الانضمام')}
        ${tog('singleDevice',     'جلسة واحدة عبر تبويبات المتصفح')}
        </div>
        <div class="perm-card">
          <div class="perm-card-title"><i class="ti ti-bell"></i> الإشعارات</div>
          ${tog('notifyRequests',   'طلب انضمام جديد')}
          ${tog('notifyBlock',      'محاولة اختراق')}
          ${tog('notifyComplete',   'إتمام كورس')}
          ${tog('weeklyReport',     'تقرير أسبوعي')}
        </div>
        <div class="perm-card">
          <div class="perm-card-title"><i class="ti ti-activity"></i> المراقبة</div>
          ${tog('logAttempts',      'تسجيل المحاولات')}
          ${tog('trackProgress',    'تتبع التقدم')}
          ${tog('sessionTimeout',   'انتهاء الجلسة التلقائي')}
          ${tog('maintenanceMode',  'وضع الصيانة')}
        </div>
      </div>`;
  }

  function savePerm(key, val) {
    DB.settings.save({ [key]: val });
    if (typeof Security !== 'undefined') Security.applySettings();
    Toast.show(`تم ${val?'تفعيل':'إيقاف'} الإعداد ✓`, 'success');
  }

  // ===== SECURITY LOG =====
  function renderSecurity() {
    const logs = DB.logs.all();
    return `
      <div class="section-header">
        <h2><i class="ti ti-lock"></i> سجل الأمان</h2>
        <button class="btn btn-ghost btn-sm" onclick="AdminPage.clearLogs()">
          <i class="ti ti-trash"></i> مسح السجل
        </button>
      </div>
      <div class="alert alert-success">
        <i class="ti ti-shield-check"></i>
        <div>جميع أنظمة الحماية تعمل: تشفير المحتوى ✓ — مراقبة الجلسات ✓ — تسجيل المحاولات ✓</div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>الحدث</th><th>المستخدم</th><th>IP</th><th>الوقت</th><th>النتيجة</th></tr></thead>
          <tbody>
            ${logs.length ? logs.map(l => `
            <tr>
              <td>${l.event}</td>
              <td>${l.user || '—'}</td>
              <td style="font-size:12px;color:var(--baz-muted)">${l.ip || '—'}</td>
              <td style="font-size:12px;color:var(--baz-muted)">${fmtTime(l.time)}</td>
              <td><span class="badge ${l.result==='allowed'?'badge-active':'badge-blocked'}">${l.result==='allowed'?'مسموح':'محجوب'}</span></td>
            </tr>`).join('') : `
            <tr><td colspan="5" style="text-align:center;color:var(--baz-muted);padding:40px">لا توجد سجلات</td></tr>`}
          </tbody>
        </table>
      </div>`;
  }

  function clearLogs() {
    if (!confirm('هل أنت متأكد من مسح سجل الأمان؟')) return;
    localStorage.setItem('baz_security_logs', JSON.stringify([]));
    Toast.show('تم مسح السجل', 'info');
    section('security');
  }

  // ===== SETTINGS =====
  function renderSettings() {
    const s = DB.settings.get();
    return `
      <div class="section-header">
        <h2><i class="ti ti-settings"></i> إعدادات المنصة</h2>
      </div>
      <div class="card" style="max-width:600px">
        <div class="form-group">
          <label class="form-label">اسم المنصة</label>
          <input class="form-control" id="setPlatName" value="${s.platformName || 'أكاديمية الباز'}">
        </div>
        <div class="form-group">
          <label class="form-label">البريد الإلكتروني للإدارة</label>
          <input class="form-control" id="setAdminEmail" value="admin@albaz.com">
        </div>
        <div class="form-group">
          <label class="form-label">رسالة الترحيب</label>
          <textarea class="form-control" id="setWelcome" placeholder="مرحباً بكم في أكاديمية الباز..."></textarea>
        </div>
        <div class="divider"></div>
        <div class="form-group">
          <label class="form-label">تغيير كلمة مرور المدير</label>
          <div class="form-grid">
            <input class="form-control" type="password" id="setNewPass" placeholder="كلمة المرور الجديدة">
            <input class="form-control" type="password" id="setConfPass" placeholder="تأكيد كلمة المرور">
          </div>
        </div>
        <div class="section-footer">
          <button class="btn btn-gold" onclick="AdminPage.saveSettings()">
            <i class="ti ti-device-floppy"></i> حفظ الإعدادات
          </button>
        </div>
      </div>`;
  }

  function saveSettings() {
    const name = document.getElementById('setPlatName')?.value;
    const np   = document.getElementById('setNewPass')?.value;
    const cp   = document.getElementById('setConfPass')?.value;
    if (np && np !== cp) { Toast.show('كلمتا المرور غير متطابقتين', 'error'); return; }
    DB.settings.save({ platformName: name });
    if (np) {
      const admin = DB.users.byEmail('admin@albaz.com');
      if (admin) DB.users.update(admin.id, { password: np });
    }
    Toast.show('تم حفظ الإعدادات ✓', 'success');
  }

  // ===== LOGOUT =====
  function logout() {
    Auth.logout();
    Toast.show('تم تسجيل الخروج بنجاح', 'info');
    Router.go('login');
  }

  // ===== UTILS =====
  function fmtTime(iso) {
    if (!iso) return '—';
    try {
      const d   = new Date(iso);
      const now = new Date();
      const diff= Math.floor((now - d) / 1000);
      if (diff < 60)   return 'منذ قليل';
      if (diff < 3600) return `قبل ${Math.floor(diff/60)} دقيقة`;
      if (diff < 86400)return `قبل ${Math.floor(diff/3600)} ساعة`;
      return d.toLocaleDateString('ar-EG');
    } catch { return '—'; }
  }

  return {
    render, section,
    toggleBlock, addUserModal, createUser, manageUserCourses, saveUserCourses, filterUsers, deleteUser,
    approveReq, rejectReq,
    addCourseModal, createCourse, addCourseVideoRow, removeCourseVideoRow, deleteCourse, editCourse, updateCourse,
    deleteContent, editContent, saveContent, previewContent,
    publishContent, draftContent,
    toggleQuizFields(value) { const el = document.getElementById('quizFields'); if (el) el.style.display = value === 'quiz' ? 'block' : 'none'; },
    openUploadPicker, onAddFileSelected, handleUploadDrop, updateUploadPreview, clearUploadPreview,
    savePerm,
    clearLogs,
    saveSettings,
    logout,
  };
})();
