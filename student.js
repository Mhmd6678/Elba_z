/* ============================
   أكاديمية الباز — صفحة الطالب
   ============================ */

const StudentPage = (() => {
  const completionKeyPrefix = 'baz_completed_';

  function getCompletedItems(userId) {
    const raw = localStorage.getItem(completionKeyPrefix + userId);
    return raw ? JSON.parse(raw) : [];
  }

  function saveCompletedItems(userId, items) {
    localStorage.setItem(completionKeyPrefix + userId, JSON.stringify(items));
  }

  function calculateCourseProgress(courseId, completedItems) {
    const content = DB.content.byCourse(courseId);
    if (!content.length) return 0;
    const completedCount = content.filter(item => completedItems.includes(item.id)).length;
    return Math.round((completedCount / content.length) * 100);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  }

  function renderComments(contentId) {
    let comments = [];
    try { comments = JSON.parse(localStorage.getItem(`baz_comments_${contentId}`) || '[]'); } catch (_) {}
    return comments.length ? comments.map(comment => `<div class="activity-item"><div class="activity-body"><strong>${escapeHtml(comment.name)}</strong><div>${escapeHtml(comment.text)}</div><small class="activity-meta">${escapeHtml(comment.time)}</small></div></div>`).join('') : '<small style="color:var(--baz-muted)">لا توجد تعليقات بعد.</small>';
  }

  function addComment(contentId) {
    const input = document.getElementById(`comment-${contentId}`);
    const text = input?.value?.trim();
    if (!text) { Toast.show('اكتب تعليقاً أولاً.', 'warning'); return; }
    const key = `baz_comments_${contentId}`;
    let comments = [];
    try { comments = JSON.parse(localStorage.getItem(key) || '[]'); } catch (_) {}
    comments.push({ name: Auth.currentUser()?.name || 'طالب', text, time: new Date().toLocaleString('ar-EG') });
    localStorage.setItem(key, JSON.stringify(comments));
    document.getElementById(`comments-${contentId}`).innerHTML = renderComments(contentId);
    input.value = '';
  }

  async function shareContent(contentId) {
    const item = DB.content.byId(contentId);
    if (!item) return;
    const payload = { title: item.title, text: `محتوى تعليمي: ${item.title}`, url: location.href };
    try {
      if (navigator.share) await navigator.share(payload);
      else if (navigator.clipboard) { await navigator.clipboard.writeText(payload.url); Toast.show('تم نسخ رابط الصفحة للمشاركة.', 'success'); }
      else window.prompt('انسخ الرابط للمشاركة:', payload.url);
    } catch (error) {
      if (error.name !== 'AbortError') Toast.show('تعذرت المشاركة من هذا المتصفح.', 'warning');
    }
  }

  function getProgressData(user) {
    const completedItems = getCompletedItems(user.id);
    const progress = {};
    (user.courses || []).forEach(courseId => {
      progress[courseId] = calculateCourseProgress(courseId, completedItems);
    });
    return { progress, completedItems };
  }

  function markContentAsCompleted(userId, contentId) {
    if (DB.settings.get().trackProgress === false) return;
    const completedItems = new Set(getCompletedItems(userId));
    if (!completedItems.has(contentId)) {
      completedItems.add(contentId);
      const completedList = Array.from(completedItems);
      saveCompletedItems(userId, completedList);
      const user = DB.users.byId(userId);
      if (user) {
        const progress = {};
        (user.courses || []).forEach(courseId => {
          progress[courseId] = calculateCourseProgress(courseId, completedList);
        });
        DB.users.update(userId, { progress });
        const finishedCourseId = DB.content.byId(contentId)?.courseId;
        if (finishedCourseId && progress[finishedCourseId] === 100 && DB.settings.get().notifyComplete !== false) {
          Toast.show('أكملت جميع محتويات هذا الكورس. أحسنت!', 'success');
        }
      }
    }
  }

  function logout() {
    Auth.logout();
    Toast.show('تم تسجيل الخروج بنجاح', 'info');
    Router.go('login');
  }

  function render() {
    const user    = Auth.currentUser();
    const settings = DB.settings.get();
    if (settings.maintenanceMode && user?.role !== 'admin') {
      return `<div class="page-wrap" style="display:grid;place-items:center;padding:40px"><div class="card" style="max-width:520px;text-align:center"><h2>المنصة في وضع الصيانة</h2><p style="margin:12px 0;color:var(--baz-muted)">سنعود قريباً. شكراً لصبرك.</p><button class="btn btn-danger" onclick="StudentPage.logout()">تسجيل الخروج</button></div></div>`;
    }
    const courses = DB.courses.all().filter(c => user.courses?.includes(c.id));
    const { progress } = getProgressData(user);
    const stats   = DB.stats.summary();

    const totalProgress = courses.length
      ? Math.round(courses.reduce((s, c) => s + (progress[c.id] || 0), 0) / courses.length)
      : 0;

    return `
    <div class="page-wrap">
      <!-- Hero -->
      <div class="student-hero">
        <h1>مرحباً، <span>${user.name}</span> 👋</h1>
        <p>استمر في مسيرتك التعليمية مع أكاديمية الباز</p>
        <div class="hero-stats ${settings.showProgress === false ? 'hide-progress' : ''}">
          <div class="hero-stat">
            <div class="hero-stat-val">${courses.length}</div>
            <div class="hero-stat-lbl">كورساتك</div>
          </div>
          <div class="hero-stat">
            <div class="hero-stat-val">${totalProgress}%</div>
            <div class="hero-stat-lbl">إجمالي التقدم</div>
          </div>
          <div class="hero-stat">
            <div class="hero-stat-val">${DB.content.all().filter(c => user.courses?.includes(c.courseId)).length}</div>
            <div class="hero-stat-lbl">محتوى متاح</div>
          </div>
        </div>
      </div>

      <!-- Alert -->
      <div style="padding:16px 40px 0">
        <div class="alert alert-success">
          <i class="ti ti-file-download"></i>
          <div>المحتوى متاح للعرض والتنزيل. يمكنك حفظ الفيديوهات والتقاط الشاشة بحرية.</div>
        </div>
      </div>

      <!-- Courses -->
      <div class="courses-section">
        <h2><i class="ti ti-books" aria-hidden="true"></i> الكورسات المتاحة لك</h2>
        ${courses.length ? `
        <div class="courses-grid">
          ${courses.map(c => renderCourseCard(c, progress[c.id] || 0)).join('')}
        </div>` : `
        <div style="text-align:center;padding:40px;color:var(--baz-muted)">
          <i class="ti ti-books" style="font-size:40px;opacity:.3;display:block;margin-bottom:12px"></i>
          <p>لم يتم تخصيص أي كورسات لحسابك بعد. تواصل مع الإدارة.</p>
        </div>`}
      </div>

      <!-- Recent Activity -->
      <div style="padding:0 40px 40px">
        <h2 style="font-size:16px;font-weight:600;margin-bottom:16px;display:flex;align-items:center;gap:8px">
          <i class="ti ti-activity" style="color:var(--baz-gold)"></i> آخر النشاطات
        </h2>
        <div class="card">
          ${renderActivity(user)}
        </div>
      </div>

      <!-- Logout Button -->
      <div style="padding:40px;display:flex;justify-content:center;border-top:1px solid var(--baz-border);margin-top:40px">
        <button class="btn btn-danger" onclick="StudentPage.logout()">
          <i class="ti ti-logout"></i> تسجيل الخروج
        </button>
      </div>
    </div>`;
  }

  function renderCourseCard(c, prog) {
    const content = DB.content.byCourse(c.id);
    const thumbStyle = c.cover
      ? `background-image:url('${c.cover}');background-size:cover;background-position:center;`
      : '';
    return `
    <div class="course-card ${DB.settings.get().showProgress === false ? 'hide-progress' : ''}" onclick="StudentPage.openCourse(${c.id})">
      <div class="course-thumb" style="${thumbStyle}">
        ${c.cover ? `<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0.12),rgba(0,0,0,0.4));"></div><span style="position:relative;font-size:32px;color:#fff;text-shadow:0 2px 10px rgba(0,0,0,0.5)">${c.emoji}</span>` : `<span>${c.emoji}</span>`}
        <div class="course-progress-bar-wrap">
          <div class="course-progress-fill" style="width:${prog}%"></div>
        </div>
      </div>
      <div class="course-body">
        <h3>${c.title}</h3>
        <div class="course-meta">
          <span><i class="ti ti-video" aria-hidden="true"></i> ${content.length} درس</span>
          <span><i class="ti ti-clock" aria-hidden="true"></i> ${c.duration}</span>
        </div>
        <div style="margin-bottom:8px">
          <div class="progress-bar-wrap">
            <div class="progress-bar-fill" style="width:${prog}%"></div>
          </div>
        </div>
        <div class="course-progress-text">${prog}% مكتمل</div>
      </div>
    </div>`;
  }

  function renderActivity(user) {
    const items = [
      { color: 'var(--baz-success)', title: 'تسجيل دخول ناجح', meta: 'منذ قليل' },
      { color: 'var(--baz-gold)',    title: `تقدم في كورس ${DB.courses.byId(user.courses?.[0])?.title || '—'}`, meta: 'اليوم' },
    ];
    return items.map(i => `
      <div class="activity-item">
        <div class="activity-dot" style="background:${i.color}"></div>
        <div class="activity-body">
          <div class="activity-title">${i.title}</div>
          <div class="activity-meta">${i.meta}</div>
        </div>
      </div>`).join('');
  }

  function openCourse(courseId) {
    const course   = DB.courses.byId(courseId);
    const contents = DB.content.byCourse(courseId);
    const icons    = { video:'ti-player-play', pdf:'ti-file-type-pdf', quiz:'ti-clipboard-list', live:'ti-broadcast', article:'ti-article' };
    const labels   = { video:'فيديو', pdf:'PDF', quiz:'اختبار', live:'مباشر', article:'مقال' };

    Modal.open({
      title: course.title,
      icon: 'ti-books',
      maxWidth: '600px',
      body: `
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
          <span style="font-size:36px">${course.emoji}</span>
          <div>
            <div style="font-size:13px;color:var(--baz-muted)">${course.description}</div>
            <div style="margin-top:6px;display:flex;gap:10px;font-size:12px;color:var(--baz-muted)">
              <span><i class="ti ti-users"></i> ${course.enrolled} طالب</span>
              <span><i class="ti ti-clock"></i> ${course.duration}</span>
            </div>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${contents.map((item, idx) => `
            <div style="display:flex;align-items:center;gap:12px;padding:12px;background:rgba(255,255,255,.03);border:1px solid var(--baz-border);border-radius:10px;cursor:pointer;transition:background .2s"
              onmouseenter="this.style.background='rgba(201,162,39,.05)'"
              onmouseleave="this.style.background='rgba(255,255,255,.03)'"
              onclick="StudentPage.playContent(${item.id})">
              <div style="width:36px;height:36px;border-radius:8px;background:rgba(201,162,39,.1);display:flex;align-items:center;justify-content:center">
                <i class="ti ${icons[item.type]}" style="color:var(--baz-gold-lt)"></i>
              </div>
              <div style="flex:1">
                <div style="font-size:13px;font-weight:500">${idx+1}. ${item.title}</div>
                <div style="font-size:11px;color:var(--baz-muted)">${labels[item.type]} ${item.duration || item.pages || item.questions+' سؤال' || ''}</div>
              </div>
              <span class="badge badge-gold">${labels[item.type]}</span>
            </div>`).join('')}
        </div>`,
      footer: `<button class="btn btn-ghost" onclick="Modal.close()">إغلاق</button>`
    });
  }

  async function playContent(id) {
    const item = DB.content.byId(id);
    if (!item) return;
    const settings = DB.settings.get();
    if (item.type === 'quiz' && settings.allowQuiz === false) {
      Toast.show('حل الاختبارات متوقف حالياً من الإدارة.', 'warning');
      return;
    }
    if (item.type === 'quiz') return openQuiz(item);
    Modal.close();

    const getMediaHtml = async () => {
      if (item.fileId) {
        try {
          const fileRecord = await DB.files.get(item.fileId);
          if (fileRecord?.data) {
            const url = URL.createObjectURL(fileRecord.data);
            const fileType = fileRecord.type || item.fileType || '';
            if (fileType.startsWith('video/')) {
              // فيديو مع أزرار تحكم، السماح بالتنزيل وفتح القائمة السياقية
              return `<video controls ${!settings.allowDownload || settings.videoEncrypt ? 'controlsList="nodownload"' : ''} style="width:100%;height:100%;border-radius:12px;background:#000;user-select:none;-webkit-user-select:none;-moz-user-select:none" src="${url}"></video>`;
            }
            if (fileType === 'application/pdf') {
              return `<iframe src="${url}" style="width:100%;height:100%;border:none;border-radius:12px"></iframe>`;
            }
            // ملفات أخرى: متاحة للعرض والتنزيل عبر المتصفح
            return `
              <div style="text-align:center;padding:40px;color:var(--baz-muted)">
                <i class="ti ti-download" style="font-size:40px;color:var(--baz-gold);margin-bottom:12px"></i>
                <div>هذا المحتوى متاح للعرض والتنزيل.</div>
                <div style="font-size:11px;margin-top:8px;color:var(--baz-muted)">استخدم خيارات المتصفح لحفظ الملف.</div>
              </div>`;
          }
        } catch (e) {
          console.error(e);
        }
      }
      return `
        <div style="text-align:center;color:var(--baz-muted)">
          <i class="ti ti-player-play" style="font-size:48px;color:var(--baz-gold);opacity:.6;display:block;margin-bottom:10px"></i>
          <div style="font-size:13px">${item.title}</div>
          <div style="font-size:11px;margin-top:6px;color:var(--baz-muted)">المحتوى محمي ومشفر</div>
        </div>`;
    };

    const mediaHtml = await getMediaHtml();
    markContentAsCompleted(Auth.currentUser().id, item.id);

    setTimeout(() => {
      Modal.open({
        title: item.title,
        icon: 'ti-player-play',
        maxWidth: '580px',
        body: `
          <div style="background:var(--baz-dark);border-radius:12px;aspect-ratio:16/9;display:flex;align-items:center;justify-content:center;margin-bottom:16px;position:relative;overflow:hidden;user-select:none;-webkit-user-select:none">
            ${mediaHtml}
            <div style="position:absolute;bottom:10px;right:10px;font-size:10px;color:rgba(201,162,39,.4);pointer-events:none">${Auth.currentUser()?.name} | أكاديمية الباز</div>
          </div>
          <div class="alert alert-success">
            <i class="ti ti-file-download"></i>
            <span>📥 الفيديو متاح للتنزيل ويمكنك التقاط الشاشة أو تسجيل العرض كما تشاء.</span>
          </div>
          ${settings.allowComments ? `<section style="margin-top:16px"><h4 style="margin-bottom:8px">التعليقات</h4><div style="display:flex;gap:8px"><input id="comment-${item.id}" class="form-control" maxlength="500" placeholder="اكتب تعليقك"><button class="btn btn-gold" onclick="StudentPage.addComment(${item.id})">إرسال</button></div><div id="comments-${item.id}" style="margin-top:10px">${renderComments(item.id)}</div></section>` : ''}`,
        footer: `${settings.allowShare ? `<button class="btn btn-info" onclick="StudentPage.shareContent(${item.id})">مشاركة</button>` : ''}<button class="btn btn-ghost" onclick="Modal.close()">إغلاق</button>`
      });
    }, 150);
  }

  function openQuiz(item) {
    const questions = Array.isArray(item.quizQuestions) ? item.quizQuestions : [];
    if (!questions.length) {
      Modal.open({ title: item.title, icon: 'ti-clipboard-list', body: '<div class="alert alert-info">لم يضف المدير أسئلة لهذا الاختبار بعد.</div>', footer: '<button class="btn btn-ghost" onclick="Modal.close()">إغلاق</button>' });
      return;
    }
    Modal.open({
      title: item.title,
      icon: 'ti-clipboard-list',
      maxWidth: '680px',
      body: `<form id="quiz-form-${item.id}">${questions.map((question, index) => `<fieldset class="card" style="margin-bottom:12px"><legend><strong>${index + 1}. ${escapeHtml(question.question)}</strong></legend>${question.options.map((option, optionIndex) => `<label style="display:flex;gap:8px;align-items:center;padding:6px"><input type="radio" name="quiz-${item.id}-${index}" value="${optionIndex}"> ${escapeHtml(option)}</label>`).join('')}</fieldset>`).join('')}</form>`,
      footer: `<button class="btn btn-gold" onclick="StudentPage.submitQuiz(${item.id})">تسليم الإجابات</button><button class="btn btn-ghost" onclick="Modal.close()">إلغاء</button>`,
    });
  }

  function submitQuiz(id) {
    const item = DB.content.byId(id);
    const questions = item?.quizQuestions || [];
    if (!questions.length) return;
    const answers = questions.map((_, index) => document.querySelector(`input[name="quiz-${id}-${index}"]:checked`));
    if (answers.some(answer => !answer)) { Toast.show('أجب عن جميع الأسئلة قبل التسليم.', 'warning'); return; }
    const score = answers.reduce((total, answer, index) => total + (Number(answer.value) === questions[index].answer ? 1 : 0), 0);
    const percent = Math.round(score / questions.length * 100);
    const userId = Auth.currentUser()?.id;
    const key = `baz_quiz_results_${userId}`;
    let results = [];
    try { results = JSON.parse(localStorage.getItem(key) || '[]'); } catch (_) {}
    results.push({ contentId: id, score, total: questions.length, percent, submittedAt: new Date().toISOString() });
    localStorage.setItem(key, JSON.stringify(results));
    Modal.close();
    Toast.show(`نتيجتك ${score} من ${questions.length} (${percent}%).`, percent >= 70 ? 'success' : 'info');
    if (percent >= 70) markContentAsCompleted(userId, id);
  }

  return { render, openCourse, playContent, openQuiz, submitQuiz, addComment, shareContent, logout };
})();
