// Read-only design examples. This file is OUTSIDE public/ and is never deployed.
(() => {
  const user = { _id: 'owner', name: 'محمد نور المصري', employeeNo: 'ADM-001', profession: 'مدير النظام', role: 'admin', phone: '', active: true, projectId: '' };
  const employees = [user, { _id: 'e1', name: 'موظف معاينة 1', employeeNo: 'DEMO-001', profession: 'مهندس موقع', role: 'employee', active: true, phone: '', projectId: 'p1' }, { _id: 'e2', name: 'موظف معاينة 2', employeeNo: 'DEMO-002', profession: 'مهندس مدني', role: 'employee', active: true, phone: '', projectId: 'p2' }];
  const employeeIdentity = id => employees.find(employee => employee._id === id) || {};
  const projects = [
    { _id: 'p1', name: 'المجمع السكني — المرحلة الأولى', code: 'PRJ-001', status: 'active', description: 'متابعة الهيكل الإنشائي وأعمال التسليح والصب.', location: { address: 'موقع توضيحي — المنطقة الشمالية' } },
    { _id: 'p2', name: 'مبنى المكاتب الإدارية', code: 'PRJ-002', status: 'active', description: 'مراجعة الأعمال الميدانية ومطابقتها للمخططات.', location: { address: 'موقع توضيحي — وسط المدينة' } },
    { _id: 'p3', name: 'تأهيل المركز الخدمي', code: 'PRJ-003', status: 'on_hold', description: 'توثيق أعمال التأهيل ومتابعة الملاحظات.', location: { address: 'موقع توضيحي — المنطقة الغربية' } }
  ].map(p => ({ ...p, createdAt: '2026-09-01', createdBy: { id: 'owner', name: 'محمد نور المصري' }, photos: [] }));
  const inspections = [
    ['i1', 'كشف تسليح أعمدة الطابق الأول', 'p1', 'e1', 'needs_action', 'تسليح'],
    ['i2', 'استلام عزل الأساسات', 'p2', 'e2', 'approved', 'عزل'],
    ['i3', 'فحص القوالب قبل الصب', 'p1', 'e1', 'in_progress', 'صب خرسانة'],
    ['i4', 'كشف أعمال التشطيبات', 'p3', 'owner', 'pending', 'تشطيبات'],
    ['i5', 'استلام حديد البلاطة', 'p2', 'e2', 'approved', 'تسليح'],
    ['i6', 'مراجعة مناسيب الأساسات', 'p1', 'e1', 'approved', 'أساسات']
  ].map(([id, title, projectId, assignedTo, status, category], n) => ({ _id: id, title, projectId, assignedTo, assignedName: employeeIdentity(assignedTo).name, assignedEmployeeNo: employeeIdentity(assignedTo).employeeNo, status, category, date: `2026-09-${String(13 - n).padStart(2, '0')}`, createdAt: '2026-09-10', createdBy: { id: 'owner', name: 'محمد نور المصري' }, location: { address: 'عنوان توضيحي للموقع' }, photos: [], checklist: [{ key: 'drawings', label: 'مطابقة المخططات والتعليمات', status: status === 'approved' ? 'pass' : status === 'needs_action' ? 'fail' : 'pending', note: '' }, { key: 'materials', label: 'المواد المستخدمة', status: status === 'approved' ? 'pass' : 'pending', note: '' }, { key: 'safety', label: 'متطلبات السلامة', status: status === 'needs_action' ? 'fail' : 'pending', note: status === 'needs_action' ? 'تحتاج متابعة ميدانية.' : '' }], notes: n === 0 ? [{ _id: 'n1', text: 'مثال توضيحي: تُراجع المسافات بين الكانات وفق المخطط المعتمد قبل الصب.', by: { id: 'e1', name: 'موظف معاينة 1' }, at: '2026-09-13' }] : [] }));
  const reports = [{ _id: 'r1', title: 'تقرير الأعمال اليومية', number: 'ALM-2026-00001', projectId: 'p1', projectName: projects[0].name, date: '2026-09-15', works: 'مراجعة أعمال التسليح ومطابقتها مع المخططات المعتمدة.\nتوثيق ملاحظات الموقع ومتابعتها مع فريق التنفيذ.', notes: 'بيانات توضيحية للمعاينة فقط.', status: 'draft', author: { id: 'owner', name: 'محمد نور المصري' }, revision: 1, createdAt: '2026-09-15', updatedAt: '2026-09-15', history: [], photos: [] }];
  const contracts = [{ _id: 'c1', number: 'ALM-C-2026-00001', title: 'عقد أعمال الإشراف الهندسي', projectId: 'p1', projectName: projects[0].name, partyA: 'شركة Almasri Engineering', partyB: 'الطرف الثاني', subject: 'الإشراف على الأعمال الإنشائية ومتابعة الكشوفات الميدانية.', value: '', contractDate: '2026-09-15', startDate: '2026-09-16', endDate: '2026-12-31', terms: 'بيانات توضيحية للمعاينة فقط. يمكنك تعديل هذا العقد أو إنشاء عقد جديد من قسم العقود.', signatureA: 'محمد نور المصري', signatureB: '', stampLabel: 'مكان الختم الرسمي', createdBy: { id: 'owner', name: 'محمد نور المصري' }, createdAt: '2026-09-15', updatedAt: '2026-09-15' }];
  const activity = [{ _id: 'a1', by: { id: 'e1', name: 'موظف معاينة 1' }, at: '2026-09-15T09:30:00Z', method: 'POST', path: '/api/inspections/i1/notes' }];
  const KEY = 'almasri-local-v4';
  let state;
  try { state = JSON.parse(localStorage.getItem(KEY)); } catch {}
  state ||= { users: employees, projects, inspections, reports, contracts, activity: [], photos: [], passwords: {}, counter: 1 };
  state.contracts ||= [];
  state.inspections ||= [];
  state.inspections.forEach(item => { if (!Array.isArray(item.checklist)) item.checklist = [{ key: 'drawings', label: 'مطابقة المخططات والتعليمات', status: item.status === 'approved' ? 'pass' : item.status === 'needs_action' ? 'fail' : 'pending', note: '' }, { key: 'materials', label: 'المواد المستخدمة', status: item.status === 'approved' ? 'pass' : 'pending', note: '' }, { key: 'safety', label: 'متطلبات السلامة', status: item.status === 'needs_action' ? 'fail' : 'pending', note: '' }]; });
  state.users[0].employeeNo = state.users[0].employeeNo === 'ADM-001' ? '05340173180' : state.users[0].employeeNo;
  let currentId = null;
  const hash = async value => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))).map(x => x.toString(16).padStart(2,'0')).join('');
  const ready = (async () => { if (!state.passwords.owner) state.passwords.owner = await hash('430353'); })();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { throw new Error('تعذر الحفظ المحلي. مساحة المتصفح ممتلئة أو التخزين غير متاح.'); } };
  const uuid = () => crypto.randomUUID();
  const fail = message => { throw new Error(message); };
  const safe = u => { const { password, ...rest } = u; return structuredClone(rest); };
  window.PORTAL_PREVIEW = {
    editable: true,
    async request(path, options = {}) {
      await ready;
      const url = new URL(path, 'http://local.test'), method = options.method || 'GET';
      const [, , kind, id, action, noteId] = url.pathname.split('/');
      const b = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
      if (kind === 'login') { const u = state.users.find(u => !u.deleted && u.active && u.employeeNo === b.employeeNo); if (!u || state.passwords[u._id] !== await hash(b.password)) fail('رقم الموظف أو كلمة المرور غير صحيحة'); currentId = u._id; return { user: safe(u) }; }
      const u = state.users.find(u => u._id === currentId && u.active && !u.deleted); if (!u) fail('يرجى تسجيل الدخول');
      const isManager = u.role === 'admin'; const requireAdmin = () => { if (!isManager) fail('هذه العملية متاحة للمدير فقط'); };
      const stamp = () => ({ id: u._id, name: u.name });
      const log = () => state.activity.unshift({ _id: uuid(), at: new Date().toISOString(), by: stamp(), method, path: url.pathname, kind, targetId: id || '' });
      const allowed = item => isManager || (kind === 'projects' ? item._id === u.projectId : item.projectId === u.projectId && item.assignedTo === u._id);
      if (kind === 'logout') { currentId = null; return { ok: true }; }
      if (kind === 'password') { if (state.passwords[u._id] !== await hash(b.currentPassword)) fail('كلمة المرور الحالية غير صحيحة'); if (b.password.length < 6) fail('كلمة المرور يجب أن تكون 6 أحرف على الأقل'); state.passwords[u._id] = await hash(b.password); save(); currentId = null; return { ok: true }; }
      if (kind === 'profile' && method === 'GET') { return { user: safe(u), photos: state.photos.filter(photo => photo.parentType === 'user' && photo.parentId === u._id).map(safe) }; }
      if (kind === 'profile') { if (Object.keys(b).some(k => !['name','profession','phone'].includes(k))) fail('يمكنك تعديل بياناتك الشخصية فقط'); Object.assign(u,b); log(); save(); return { ok: true }; }
      if (kind === 'bootstrap') { const projects = state.projects.filter(p => !p.deleted && (isManager || p._id === u.projectId)); const inspections = state.inspections.filter(i => !i.deleted && projects.some(p => p._id === i.projectId) && (isManager || i.assignedTo === u._id)); const employees = state.users.filter(x => !x.deleted && (isManager || x._id === u._id)); return {user:safe(u), projects: structuredClone(projects), employees:employees.map(safe), stats:{projects:projects.length,employees:employees.length,inspections:inspections.length,approved:inspections.filter(i=>i.status==='approved').length,needsAction:inspections.filter(i=>i.status==='needs_action').length}}; }
      if (['users','reports','contracts','activity'].includes(kind)) requireAdmin();
      if (kind === 'photos') {
        const photo = id ? state.photos.find(p => p._id === id) : null;
        if (method === 'DELETE') { if (!photo) fail('الملف غير موجود'); if (!isManager && !(photo.parentType === 'user' && photo.parentId === u._id)) fail('لا يمكنك حذف هذا الملف'); state.photos = state.photos.filter(p => p._id !== id); if (photo.parentType === 'user' && photo.stage === 'profile' && u.profilePhotoId === id) { delete u.profilePhotoId; delete u.profilePhotoPreviewUrl; } log();save();return {ok:true}; }
        if (method !== 'POST') return photo;
        const parentType=b.get('parentType'),parentId=b.get('parentId'); const parentKind={project:'projects',inspection:'inspections',report:'reports',user:'users'}[parentType]; const parent=state[parentKind]?.find(x=>x._id===parentId && !x.deleted); if(!parent) fail('السجل غير موجود');
        if(parentType==='user') { if(!isManager && parentId !== u._id) fail('لا يمكنك رفع ملفات لهذا الموظف'); }
        else if(parentType!=='inspection') requireAdmin(); else if(!isManager && (parent.assignedTo!==u._id || parent.projectId!==u.projectId)) fail('هذا الكشف غير مخصص لك');
        if(parentType==='report' && parent.status==='approved') fail('أعد التقرير إلى مسودة قبل التعديل');
        const file=b.get('file');if(file.size>(parentType==='user'?8:3)*1024*1024)fail(parentType==='user'?'الحد الأقصى للملف 8 ميغابايت':'الحد الأقصى للصورة 3 ميغابايت');
        const previewUrl=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file)});
        const stage=parentType==='user'?(b.get('stage')||'document'):(b.get('stage')||'general'); if(parentType==='user'&&!['profile','document','signature','stamp'].includes(stage))fail('نوع الملف غير صالح'); if(parentType==='user'&&['signature','stamp'].includes(stage)&&!isManager)fail('إضافة توقيع أو ختم الشركة متاحة للمدير فقط'); if(parentType==='user'&&['profile','signature','stamp'].includes(stage)&&!String(file.type||'').startsWith('image/'))fail('هذا الملف يجب أن يكون صورة');
        if(parentType==='user'&&['profile','signature','stamp'].includes(stage))state.photos=state.photos.filter(p=>!(p.parentType==='user'&&p.parentId===parentId&&p.stage===stage));
        const created={_id:uuid(),name:file.name,parentId,parentType,previewUrl,noteId:b.get('noteId')||'',stage,createdAt:new Date().toISOString(),createdBy:stamp(),mime:file.type||''};state.photos.push(created);if(parentType==='user'&&stage==='profile'){parent.profilePhotoId=created._id;parent.profilePhotoPreviewUrl=previewUrl;}log();save();return safe(created);
      }
      const all=state[kind]; if(!all) fail('صفحة غير موجودة');
      const item=id?all.find(x=>x._id===id && !x.deleted):null;
      if(id && !item)fail('السجل غير موجود'); if(item && ['projects','inspections'].includes(kind) && !allowed(item))fail('ليس لديك صلاحية لهذا السجل');
      if(kind==='inspections' && action==='notes') {
        if(method==='POST'){const note={_id:uuid(),text:b.text,status:'open',dueDate:'',at:new Date().toISOString(),by:stamp()};item.notes.push(note);log();save();return safe(note);}
        requireAdmin();const n=item.notes.find(x=>x._id===noteId);if(!n)fail('الملاحظة غير موجودة');if(method==='DELETE')item.notes=item.notes.filter(x=>x._id!==noteId);else Object.assign(n,{text:b.text,status:b.status,dueDate:b.dueDate,editedAt:new Date().toISOString(),editedBy:stamp()});log();save();return {ok:true};
      }
      if(method==='GET') {
        if(item){const result=safe(item);if(['projects','inspections','reports'].includes(kind))result.photos=state.photos.filter(p=>p.parentId===id).map(safe);if(kind==='users')result.photos=state.photos.filter(p=>p.parentType==='user'&&p.parentId===id).map(safe);if(['reports','contracts'].includes(kind))result.officeAssets=state.photos.filter(p=>p.parentType==='user'&&p.parentId==='owner'&&['signature','stamp'].includes(p.stage)).map(safe);return result;}
        let items=all.filter(x=>!x.deleted && (!['projects','inspections'].includes(kind)||allowed(x)));
        if(url.searchParams.get('mine')==='1')items=items.filter(x=>x.assignedTo===u._id);
        for(const key of ['status','projectId','date'])if(url.searchParams.get(key))items=items.filter(x=>x[key]===url.searchParams.get(key));
        const q=url.searchParams.get('q');if(q)items=items.filter(x=>JSON.stringify(x).toLowerCase().includes(q.toLowerCase()));
        const page=Number(url.searchParams.get('page'))||1;return {items:items.slice((page-1)*20,page*20).map(safe),total:items.length,page,pages:Math.ceil(items.length/20)};
      }
      if(kind==='inspections' && method==='POST' && !id && !isManager) { if(b.projectId!==u.projectId || b.assignedTo!==u._id) fail('يمكنك إضافة كشف ضمن مشروعك المخصص فقط'); if(b.status!=='pending') fail('يُرسل الكشف الجديد بحالة انتظار المراجعة'); } else requireAdmin();
      if(kind==='reports' && item) {
        if(b.revision!==item.revision)fail('تم تعديل التقرير. أعد فتحه');
        if(!action && item.status==='approved')fail('أعد التقرير إلى مسودة قبل التعديل');
        item.history.push({at:new Date().toISOString(),by:stamp(),action:action||'edit',revision:item.revision,snapshot:{title:item.title,works:item.works,notes:item.notes}});item.revision++;
        if(action){item.status=action==='approve'?'approved':'draft';item.approvedBy=action==='approve'?stamp():null;item.approvedAt=new Date().toISOString();item.updatedAt=new Date().toISOString();log();save();return {ok:true};}
      }
      if(kind==='users') { if(state.users.some(x=>x.employeeNo===b?.employeeNo && x._id!==id))fail('رقم الموظف مستخدم مسبقًا');if(id==='owner' && (method==='DELETE'||b.role!=='admin'||!b.active))fail('لا يمكن تعطيل المدير الرئيسي أو تخفيض صلاحيته'); }
      if(method==='DELETE'){item.deleted=true;log();save();return {ok:true};}
      const data={...b};delete data.password;delete data.revision;delete data.note;
      if(kind==='reports' || kind==='contracts'){data.projectName=state.projects.find(p=>p._id===b.projectId)?.name||'';}
      if(method==='POST') {const created={...data,_id:uuid(),createdBy:stamp(),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),photos:[],notes:kind==='inspections'?[]:data.notes||'',...(kind==='reports'?{number:'ALM-LOCAL-'+String(++state.counter).padStart(5,'0'),author:stamp(),status:'draft',revision:1,history:[]}: {}),...(kind==='contracts'?{number:data.number||'ALM-C-LOCAL-'+String(++state.counter).padStart(5,'0')}: {})};if(kind==='inspections'&&b.note)created.notes.push({_id:uuid(),text:b.note,status:'open',dueDate:'',at:new Date().toISOString(),by:stamp()});all.unshift(created);if(kind==='users')state.passwords[created._id]=await hash(b.password);log();save();return safe(created);}
      Object.assign(item,data,{updatedAt:new Date().toISOString(),updatedBy:stamp()});if(kind==='users' && b.password)state.passwords[id]=await hash(b.password);log();save();return {ok:true};
    }
  };
})();
