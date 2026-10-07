/* ============================
   أكاديمية الباز — قاعدة البيانات
   ============================ */

const DB = (() => {
  const KEYS = {
    users:    'baz_users',
    content:  'baz_content',
    courses:  'baz_courses',
    requests: 'baz_requests',
    sessions: 'baz_sessions',
    settings: 'baz_settings',
    logs:     'baz_security_logs',
  };

  // ===== seed data =====
  const defaults = {
    users: [
      { id: 1, name: 'Mohamed Elbaz', email: 'admin@albaz.com', password: 'M01556879244@', role: 'admin',   status: 'active',   courses: [1,2,3], createdAt: '2025-01-10', lastLogin: new Date().toISOString() },
      { id: 2, name: 'أحمد محمد علي',   email: 'ahmed@email.com',  password: 'ahmed123',  role: 'student', status: 'active',   courses: [1,2],   createdAt: '2025-02-15', lastLogin: new Date().toISOString(), progress: {1:72, 2:40} },
      { id: 3, name: 'سارة خالد',        email: 'sara@email.com',   password: 'sara123',   role: 'student', status: 'active',   courses: [1,3],   createdAt: '2025-03-01', lastLogin: new Date().toISOString(), progress: {1:55, 3:20} },
      { id: 4, name: 'محمد إبراهيم',     email: 'moh@email.com',    password: 'moh123',    role: 'student', status: 'blocked',  courses: [2],     createdAt: '2025-03-10', lastLogin: '2025-05-10T10:00:00Z',  progress: {2:85} },
      { id: 5, name: 'نور عبد الله',     email: 'noor@email.com',   password: 'noor123',   role: 'student', status: 'active',   courses: [1,2,3], createdAt: '2025-04-05', lastLogin: new Date().toISOString(), progress: {1:30, 2:60, 3:10} },
    ],

    courses: [
      { id: 1, title: 'الرياضيات المتقدمة',  emoji: '🧮', description: 'كورس شامل في التفاضل والتكامل والجبر الخطي', contentCount: 24, duration: '18 ساعة',  enrolled: 12, status: 'active' },
      { id: 2, title: 'الكيمياء العضوية',    emoji: '⚗️', description: 'أسرار الكيمياء العضوية من الأساسيات للمتقدمة',  contentCount: 18, duration: '14 ساعة', enrolled: 9,  status: 'active' },
      { id: 3, title: 'الفيزياء الحديثة',   emoji: '⚡', description: 'ميكانيكا الكم والنسبية وفيزياء الجسيمات',       contentCount: 20, duration: '16 ساعة', enrolled: 7,  status: 'active' },
    ],

    content: [
      { id: 1, courseId: 1, title: 'مقدمة في التفاضل',    type: 'video',   duration: '45 د',   views: 38, createdAt: '2025-02-01', status: 'published' },
      { id: 2, courseId: 1, title: 'التكامل المحدود',      type: 'video',   duration: '52 د',   views: 30, createdAt: '2025-02-05', status: 'published' },
      { id: 3, courseId: 1, title: 'ملخص الفصل الأول',    type: 'pdf',     pages: '24 صفحة',   downloads: 55, createdAt: '2025-02-10', status: 'published' },
      { id: 4, courseId: 1, title: 'اختبار منتصف الفصل',  type: 'quiz',    questions: 20,     attempts: 29, createdAt: '2025-02-15', status: 'published' },
      { id: 5, courseId: 2, title: 'مقدمة الكيمياء العضوية', type: 'video', duration: '38 د',  views: 22, createdAt: '2025-03-01', status: 'published' },
      { id: 6, courseId: 3, title: 'محاضرة مباشرة — الجمعة', type: 'live', date: 'الجمعة 8 مساءً', registered: 15, createdAt: '2025-05-20', status: 'scheduled' },
    ],

    requests: [
      { id: 1, name: 'عمر فاروق',   email: 'omar@email.com',   phone: '0501234567', requestedAt: new Date().toISOString(), status: 'pending' },
      { id: 2, name: 'ليلى كريم',   email: 'laila@email.com',  phone: '0507654321', requestedAt: new Date().toISOString(), status: 'pending' },
      { id: 3, name: 'كريم طاهر',   email: 'karim@email.com',  phone: '0509876543', requestedAt: new Date(Date.now()-86400000).toISOString(), status: 'pending' },
    ],

    settings: {
      screenshotBlock: false,
      selfRegister: false,
      watermark: true,
      singleDevice: false,
      logAttempts: true,
      videoEncrypt: true,
      allowDownload: true,
      maintenanceMode: false,
      platformName: 'أكاديمية الباز',
    },

    logs: [
      { id: 1, event: 'محاولة التقاط شاشة', user: 'محمد إبراهيم', ip: '192.168.1.45', time: new Date(Date.now()-1800000).toISOString(), result: 'blocked' },
      { id: 2, event: 'تسجيل دخول فاشل',     user: 'مجهول',        ip: '77.42.11.99',  time: new Date(Date.now()-4600000).toISOString(), result: 'blocked' },
      { id: 3, event: 'فتح أدوات المطور',    user: 'أحمد محمد',     ip: '192.168.1.23', time: new Date(Date.now()-6000000).toISOString(), result: 'blocked' },
      { id: 4, event: 'تسجيل دخول ناجح',     user: 'سارة خالد',     ip: '192.168.1.67', time: new Date(Date.now()-36000000).toISOString(), result: 'allowed' },
    ],
  };

  // ===== init =====
  function init() {
    Object.entries(defaults).forEach(([key, val]) => {
      if (!localStorage.getItem(KEYS[key])) {
        localStorage.setItem(KEYS[key], JSON.stringify(val));
      }
    });

    // Reset admin credentials to default if the admin account already exists.
    const defaultAdmin = defaults.users.find(u => u.email === 'admin@albaz.com');
    if (defaultAdmin) {
      const storedUsers = get('users');
      const adminUser = storedUsers.find(u => u.email === 'admin@albaz.com');
      if (adminUser) {
        const updatedAdmin = {
          ...adminUser,
          name: defaultAdmin.name,
          password: defaultAdmin.password,
          status: 'active'
        };
        save('users', storedUsers.map(u => u.email === 'admin@albaz.com' ? updatedAdmin : u));
      }
    }
  }

  // ===== getters =====
  function get(key)       { return JSON.parse(localStorage.getItem(KEYS[key]) || '[]'); }
  function save(key, val) { localStorage.setItem(KEYS[key], JSON.stringify(val)); }

  // ===== Users =====
  const users = {
    all()       { return get('users'); },
    students()  { return get('users').filter(u => u.role === 'student'); },
    byId(id)    { return get('users').find(u => u.id === id); },
    byEmail(e)  { return get('users').find(u => u.email === e); },
    byName(n)   { return get('users').find(u => u.name.trim().toLowerCase() === n.trim().toLowerCase()); },
    add(user)   {
      const list = get('users');
      user.id = Date.now();
      user.createdAt = new Date().toISOString();
      list.push(user);
      save('users', list);
      return user;
    },
    update(id, patch) {
      const list = get('users').map(u => u.id === id ? { ...u, ...patch } : u);
      save('users', list);
    },
    delete(id)  { save('users', get('users').filter(u => u.id !== id)); },
    block(id)   { users.update(id, { status: 'blocked' }); },
    unblock(id) { users.update(id, { status: 'active' }); },
    setLastLogin(id) { users.update(id, { lastLogin: new Date().toISOString() }); },
  };

  // ===== Courses =====
  const courses = {
    all()    { return get('courses'); },
    byId(id) { return get('courses').find(c => c.id === id); },
    add(course) {
      const list = get('courses');
      course.id = Date.now();
      list.push(course);
      save('courses', list);
      return course;
    },
    update(id, patch) {
      save('courses', get('courses').map(c => c.id === id ? { ...c, ...patch } : c));
    },
    delete(id) { save('courses', get('courses').filter(c => c.id !== id)); },
  };

  // ===== Content =====
  const content = {
    all()           { return get('content'); },
    byCourse(cId)   { return get('content').filter(c => c.courseId === cId); },
    byId(id)        { return get('content').find(c => c.id === id); },
    add(item) {
      const list = get('content');
      item.id = Date.now();
      item.createdAt = new Date().toISOString();
      item.status = 'published';
      list.push(item);
      save('content', list);
      return item;
    },
    update(id, patch) {
      save('content', get('content').map(c => c.id === id ? { ...c, ...patch } : c));
    },
    delete(id) { save('content', get('content').filter(c => c.id !== id)); },
  };

  const FILE_DB_NAME = 'baz_files';
  const FILE_STORE = 'baz_content_files';
  let fileDbPromise = null;

  function openFileDB() {
    if (!fileDbPromise) {
      fileDbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(FILE_DB_NAME, 1);
        req.onupgradeneeded = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains(FILE_STORE)) {
            db.createObjectStore(FILE_STORE, { keyPath: 'id', autoIncrement: true });
          }
        };
        req.onsuccess = (event) => resolve(event.target.result);
        req.onerror = (event) => reject(event.target.error);
      });
    }
    return fileDbPromise;
  }

  async function saveFile(file) {
    const db = await openFileDB();
    const buffer = await file.arrayBuffer();
    const blob = new Blob([buffer], { type: file.type });
    return new Promise((resolve, reject) => {
      const tx = db.transaction(FILE_STORE, 'readwrite');
      const store = tx.objectStore(FILE_STORE);
      const req = store.add({ name: file.name, type: file.type, size: file.size, data: blob });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  function getFile(id) {
    return openFileDB().then(db => new Promise((resolve, reject) => {
      const tx = db.transaction(FILE_STORE, 'readonly');
      const store = tx.objectStore(FILE_STORE);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    }));
  }

  function deleteFile(id) {
    return openFileDB().then(db => new Promise((resolve, reject) => {
      const tx = db.transaction(FILE_STORE, 'readwrite');
      const store = tx.objectStore(FILE_STORE);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    }));
  }

  const files = {
    add(file)   { return saveFile(file); },
    get(id)     { return getFile(id); },
    delete(id)  { return deleteFile(id); },
  };

  // ===== Registration Requests =====
  const requests = {
    all()     { return get('requests'); },
    pending() { return get('requests').filter(r => r.status === 'pending'); },
    add(req)  {
      const list = get('requests');
      req.id = Date.now();
      req.requestedAt = new Date().toISOString();
      req.status = 'pending';
      list.push(req);
      save('requests', list);
      return req;
    },
    approve(id) {
      const list = get('requests');
      const req  = list.find(r => r.id === id);
      if (!req) return null;
      req.status = 'approved';
      save('requests', list);
      const emailSafe = req.phone && req.phone !== '—'
        ? req.phone.replace(/[^0-9]/g, '')
        : req.name.trim().toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9\.]/g, '') || `user${Date.now()}`;
      const passwordSafe = req.phone && req.phone !== '—'
        ? req.phone.replace(/[^0-9]/g, '')
        : 'temp1234';
      return users.add({
        name: req.name,
        email: `${emailSafe}@joinreq.local`,
        password: passwordSafe,
        role: 'student',
        status: 'active',
        courses: [],
        progress: {}
      });
    },
    reject(id) {
      const list = get('requests').map(r => r.id === id ? { ...r, status: 'rejected' } : r);
      save('requests', list);
    },
  };

  // ===== Settings =====
  const settings = {
    get()       { return JSON.parse(localStorage.getItem(KEYS.settings) || '{}'); },
    save(patch) {
      const cur = settings.get();
      localStorage.setItem(KEYS.settings, JSON.stringify({ ...cur, ...patch }));
    },
  };

  // ===== Logs =====
  const logs = {
    all()  { return get('logs'); },
    add(entry) {
      const list = get('logs');
      entry.id   = Date.now();
      entry.time = new Date().toISOString();
      list.unshift(entry);
      if (list.length > 200) list.pop();
      save('logs', list);
    },
  };

  // ===== Stats =====
  const stats = {
    summary() {
      const allUsers    = users.all();
      const allContent  = content.all();
      const pendingReqs = requests.pending();
      const today       = new Date().toDateString();
      const activeToday = allUsers.filter(u => u.lastLogin && new Date(u.lastLogin).toDateString() === today);
      return {
        totalStudents:  allUsers.filter(u => u.role === 'student').length,
        activeToday:    activeToday.length,
        pendingRequests: pendingReqs.length,
        totalContent:   allContent.length,
        totalCourses:   courses.all().length,
      };
    },
  };

  init();
  return { users, courses, content, files, requests, settings, logs, stats };
})();