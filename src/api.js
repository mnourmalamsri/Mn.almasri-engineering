import { reportsApi } from './reports.js';
import { contractsApi } from './contracts.js';
import { randomUUID } from 'node:crypto';
import { indexes } from './db.js';
import { HttpError, assert, text, password, verifyPassword, equal, digest, token, admin, location, visibleUser, cookie, getToken } from './security.js';

const now = () => new Date();
const alive = { deleted: { $ne: true } };
const json = (data, status = 200, extra = {}) => Response.json(data, { status, headers: extra });
const stamp = user => ({ id: user._id, name: user.name });
const pickStatus = (s, allowed) => { assert(allowed.includes(s), 400, 'الحالة غير صالحة'); return s; };
async function boundedBody(request, max) {
  const reader = request.body?.getReader(); const chunks = []; let size = 0;
  assert(reader, 400, 'الطلب فارغ');
  while (true) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength;
    if (size > max) { await reader.cancel(); throw new HttpError(413, 'حجم الطلب أكبر من المسموح'); } chunks.push(value); }
  return Buffer.concat(chunks);
}
async function body(request) {
  assert((request.headers.get('content-type') || '').includes('application/json'), 415, 'صيغة الطلب غير صالحة');
  try { const result = JSON.parse((await boundedBody(request, 24000)).toString()); assert(result && typeof result === 'object' && !Array.isArray(result), 400, 'البيانات غير صالحة'); return result; }
  catch (e) { if (e instanceof HttpError) throw e; throw new HttpError(400, 'البيانات غير صالحة'); }
}
export async function authenticate(db, request) {
  const raw = getToken(request); assert(raw, 401, 'يرجى تسجيل الدخول');
  const session = await db.collection('sessions').findOne({ _id: digest(raw), expiresAt: { $gt: now() } });
  assert(session, 401, 'انتهت الجلسة، سجّل الدخول مجددًا');
  const user = await db.collection('users').findOne({ _id: session.userId, ...alive, active: true });
  assert(user, 401, 'هذا الحساب غير متاح'); return user;
}
async function rateLimit(db, key, limit) {
  const window = Math.floor(Date.now() / 900000);
  const record = await db.collection('attempts').findOneAndUpdate({ _id: digest(`${key}:${window}`) }, {
    $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((window + 1) * 900000) }
  }, { upsert: true, returnDocument: 'after' });
  assert(record.count <= limit, 429, 'محاولات كثيرة. جرّب بعد 15 دقيقة');
}
export async function getProject(db, id, user) {
  const item = await db.collection('projects').findOne({ _id: id, ...alive });
  assert(item, 404, 'المشروع غير موجود');
  assert(user.role === 'admin' || user.projectId === id, 403, 'ليس لديك صلاحية لهذا المشروع'); return item;
}
export async function getInspection(db, id, user) {
  const item = await db.collection('inspections').findOne({ _id: id, ...alive });
  assert(item, 404, 'الكشف غير موجود');
  assert(user.role === 'admin' || (item.assignedTo === user._id && item.projectId === user.projectId), 403, 'هذا الكشف غير مخصص لك');
  await getProject(db, item.projectId, user); return item;
}
async function parent(db, type, id, user, writing = false) {
  if (type === 'report') { admin(user); const report = await db.collection('reports').findOne({ _id: id, ...alive }); assert(report, 404, 'التقرير غير موجود'); if (writing) assert(report.status !== 'approved', 409, 'أعد التقرير إلى مسودة قبل التعديل'); return report; }
  if (type === 'user') {
    assert(user.role === 'admin' || user._id === id, 403, 'لا يمكنك الوصول إلى ملفات هذا الموظف');
    const profile = await db.collection('users').findOne({ _id: id, ...alive });
    assert(profile, 404, 'حساب الموظف غير موجود');
    return profile;
  }
  assert(['project', 'inspection'].includes(type), 400, 'نوع المرفق غير صالح');
  if (type === 'project') { if (writing) admin(user); return getProject(db, id, user); }
  return getInspection(db, id, user);
}
async function validAssignment(db, projectId, assignedTo) {
  const project = await db.collection('projects').findOne({ _id: projectId, ...alive });
  assert(project, 400, 'اختر مشروعًا متاحًا');
  const assigned = await db.collection('users').findOne({ _id: assignedTo, ...alive, active: true });
  assert(assigned && (assigned.role === 'admin' || assigned.projectId === projectId), 400, 'الموظف يجب أن يكون فعالًا ومخصصًا لهذا المشروع');
  return assigned;
}
function inspectionData(b) {
  const date = text(b.date, 'التاريخ', 10);
  assert(/^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date, 400, 'التاريخ غير صالح');
  return { title: text(b.title, 'عنوان الكشف'), projectId: text(b.projectId, 'المشروع'), assignedTo: text(b.assignedTo, 'الموظف'),
    date, category: text(b.category, 'نوع الكشف', 80), status: pickStatus(b.status, ['pending', 'in_progress', 'approved', 'needs_action']), location: location(b.location), checklist: checklistData(b.checklist) };
}
function checklistData(value) {
  if (value == null || value === '') return [];
  assert(Array.isArray(value), 400, 'قائمة الفحص غير صالحة');
  assert(value.length <= 30, 400, 'قائمة الفحص طويلة جدًا');
  return value.map(item => {
    assert(item && typeof item === 'object' && !Array.isArray(item), 400, 'عنصر قائمة الفحص غير صالح');
    return {
      key: text(item.key, 'معرّف عنصر الفحص', 80),
      label: text(item.label, 'اسم عنصر الفحص', 180),
      status: pickStatus(item.status || 'pending', ['pending', 'pass', 'fail', 'na']),
      note: text(item.note, 'ملاحظة عنصر الفحص', 600, false)
    };
  });
}
async function list(db, name, user, url) {
  if (name === 'users') admin(user);
  const filter = { ...alive }; const q = (url.searchParams.get('q') || '').slice(0, 100);
  if (user.role !== 'admin') {
    if (name === 'projects') filter._id = user.projectId || '__none__';
    else if (name === 'inspections') { filter.assignedTo = user._id; filter.projectId = user.projectId || '__none__'; }
  }
  if (name === 'inspections') {
    const activeProjects = await db.collection('projects').find({ ...alive }, { projection: { _id: 1 } }).toArray();
    filter.projectId = { $in: activeProjects.map(p => p._id).filter(id => !filter.projectId || id === filter.projectId) };
    if (url.searchParams.get('mine') === '1') filter.assignedTo = user._id;
  }
  if (q) { const regex = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); filter.$or = (name === 'users' ? ['name', 'employeeNo', 'profession'] : name === 'projects' ? ['name', 'code', 'location.address'] : ['title', 'category']).map(k => ({ [k]: { $regex: regex, $options: 'i' } })); }
  const status = url.searchParams.get('status'); if (status && name !== 'users') filter.status = status;
  const page = Math.max(1, Math.min(100000, parseInt(url.searchParams.get('page'), 10) || 1));
  const total = await db.collection(name).countDocuments(filter);
  const items = await db.collection(name).find(filter, { projection: { passwordHash: 0, notes: 0 } }).sort({ createdAt: -1 }).skip((page - 1) * 20).limit(20).toArray();
  return json({ items, total, page, pages: Math.ceil(total / 20) });
}

async function dispatchApi(request, env, db) {
  const url = new URL(request.url), path = url.pathname, method = request.method;
  if (!['GET', 'HEAD'].includes(method)) {
    assert(request.headers.get('x-requested-with') === 'EngineeringPortal', 403, 'الطلب غير مسموح');
    const origin = request.headers.get('origin'); assert(!origin || origin === url.origin, 403, 'مصدر الطلب غير مسموح');
  }
  if (path === '/api/status' && method === 'GET') {
    return json({ initialized: !!await db.collection('users').findOne({ _id: 'owner' }), database: true });
  }
  if (path === '/api/setup' && method === 'POST') {
    await rateLimit(db, `setup:${request.headers.get('cf-connecting-ip') || 'local'}`, 5);
    assert(env.SETUP_TOKEN?.length >= 32, 503, 'رمز التهيئة غير مضبوط لدى المسؤول');
    const b = await body(request); assert(equal(b.setupToken, env.SETUP_TOKEN), 403, 'رمز التهيئة غير صحيح');
    assert(!await db.collection('users').findOne({ _id: 'owner' }), 409, 'تم إنشاء حساب المدير مسبقًا');
    await indexes(db);
    const user = { _id: 'owner', employeeNo: text(b.employeeNo, 'رقم المدير', 40), name: text(b.name, 'الاسم'), profession: 'مدير النظام', phone: '', projectId: '', role: 'admin', active: true, deleted: false, passwordHash: password(b.password), createdAt: now() };
    await db.collection('users').insertOne(user); return json({ message: 'تم إنشاء المدير. يمكنك تسجيل الدخول الآن' }, 201);
  }
  if (path === '/api/login' && method === 'POST') {
    const b = await body(request); const employeeNo = text(b.employeeNo, 'رقم الموظف', 40);
    await rateLimit(db, `ip:${request.headers.get('cf-connecting-ip') || 'local'}`, 40);
    await rateLimit(db, `account:${employeeNo}`, 10);
    const user = await db.collection('users').findOne({ employeeNo, active: true, ...alive });
    // Run a real KDF even for unknown accounts to avoid a fast username oracle.
    const hash = user?.passwordHash || '0123456789abcdef0123456789abcdef:' + '0'.repeat(64);
    assert(verifyPassword(b.password, hash) && user, 401, 'رقم الموظف أو كلمة المرور غير صحيحة');
    const raw = token(); await db.collection('sessions').insertOne({ _id: digest(raw), userId: user._id, expiresAt: new Date(Date.now() + 43200000) });
    return json({ user: visibleUser(user) }, 200, { 'Set-Cookie': cookie(request, raw) });
  }
  const user = await authenticate(db, request);
  if (path === '/api/logout' && method === 'POST') {
    await db.collection('sessions').deleteOne({ _id: digest(getToken(request)) });
    return json({ ok: true }, 200, { 'Set-Cookie': cookie(request, '', 0) });
  }
  if (path === '/api/password' && method === 'POST') {
    const b = await body(request); await rateLimit(db, `password:${user._id}`, 10);
    assert(verifyPassword(b.currentPassword, user.passwordHash), 400, 'كلمة المرور الحالية غير صحيحة');
    await db.collection('users').updateOne({ _id: user._id }, { $set: { passwordHash: password(b.password) } });
    await db.collection('sessions').deleteMany({ userId: user._id });
    return json({ ok: true }, 200, { 'Set-Cookie': cookie(request, '', 0) });
  }
  if (path === '/api/bootstrap' && method === 'GET') {
    const projects = await db.collection('projects').find(user.role === 'admin' ? alive : { _id: user.projectId || '__none__', ...alive }, { projection: { _id: 1, name: 1, status: 1 } }).toArray();
    const employees = user.role === 'admin' ? await db.collection('users').find(alive, { projection: { _id: 1, name: 1, employeeNo: 1, profession: 1, projectId: 1, role: 1, active: 1, profilePhotoId: 1 } }).toArray() : [visibleUser(user)];
    const f = { ...alive, projectId: { $in: projects.map(p => p._id) }, ...(user.role === 'admin' ? {} : { assignedTo: user._id }) };
    const counts = await Promise.all([db.collection('inspections').countDocuments(f), db.collection('inspections').countDocuments({ ...f, status: 'needs_action' }), db.collection('inspections').countDocuments({ ...f, status: 'approved' })]);
    return json({ user: visibleUser(user), projects, employees, stats: { projects: projects.length, employees: employees.length, inspections: counts[0], needsAction: counts[1], approved: counts[2] } });
  }
  if (path === '/api/profile' && method === 'GET') {
    const photos = await db.collection('photos').find({ parentType: 'user', parentId: user._id, ...alive }, { projection: { data: 0 } }).sort({ createdAt: -1 }).toArray();
    return json({ user: visibleUser(user), photos });
  }
  if (path === '/api/profile' && method === 'PATCH') {
    const b = await body(request);
    assert(Object.keys(b).every(k => ['name', 'profession', 'phone'].includes(k)), 403, 'يمكنك تعديل بياناتك الشخصية فقط');
    const data = { name: text(b.name, 'الاسم'), profession: text(b.profession, 'المهنة', 100), phone: text(b.phone, 'الهاتف', 40, false), updatedAt: now() };
    await db.collection('users').updateOne({ _id: user._id }, { $set: data }); return json({ ok: true });
  }
  const reportsResponse = await reportsApi(request, db, user, { body, json, alive, stamp });
  if (reportsResponse) return reportsResponse;
  const contractsResponse = await contractsApi(request, db, user, { body, json, alive, stamp });
  if (contractsResponse) return contractsResponse;
  const collectionMatch = path.match(/^\/api\/(users|projects|inspections)$/);
  if (collectionMatch && method === 'GET') return list(db, collectionMatch[1], user, url);
  if (path === '/api/users' && method === 'POST') {
    admin(user); const b = await body(request); const data = await userData(db, b);
    const created = { _id: randomUUID(), ...data, passwordHash: password(b.password), createdAt: now(), createdBy: stamp(user), deleted: false };
    await db.collection('users').insertOne(created); return json(visibleUser(created), 201);
  }
  if (path === '/api/projects' && method === 'POST') {
    admin(user); const b = await body(request); const data = { _id: randomUUID(), ...projectData(b), createdAt: now(), createdBy: stamp(user), deleted: false };
    await db.collection('projects').insertOne(data); return json(data, 201);
  }
  if (path === '/api/inspections' && method === 'POST') {
    const b = await body(request); const data = inspectionData(b); let assigned;
    if (user.role === 'admin') assigned = await validAssignment(db, data.projectId, data.assignedTo);
    else {
      assert(data.projectId === user.projectId && data.assignedTo === user._id, 403, 'يمكنك إضافة كشف ضمن مشروعك المخصص فقط');
      assert(data.status === 'pending', 403, 'يُرسل الكشف الجديد بحالة انتظار المراجعة');
      await getProject(db, data.projectId, user); assigned = user;
    }
    const created = { _id: randomUUID(), ...data, assignedName: assigned.name, assignedEmployeeNo: assigned.employeeNo, notes: [], createdAt: now(), createdBy: stamp(user), deleted: false };
    if (b.note) created.notes.push({ _id: randomUUID(), text: text(b.note, 'الملاحظة', 4000), by: stamp(user), at: now() });
    await db.collection('inspections').insertOne(created); return json(created, 201);
  }
  const match = path.match(/^\/api\/(users|projects|inspections)\/([\w-]+)$/);
  if (match) {
    const [, name, id] = match;
    const item = name === 'projects' ? await getProject(db, id, user) : name === 'inspections' ? await getInspection(db, id, user) : (admin(user), await db.collection('users').findOne({ _id: id, ...alive }));
    assert(item, 404, 'السجل غير موجود');
    if (method === 'GET') {
      const photos = await db.collection('photos').find({ parentType: name === 'users' ? 'user' : name === 'projects' ? 'project' : 'inspection', parentId: id, ...alive }, { projection: { data: 0 } }).sort({ createdAt: -1 }).toArray();
      return json({ ...visibleUser(item), photos });
    }
    admin(user);
    if (method === 'PATCH') {
      const b = await body(request); let data;
      if (name === 'users') {
        data = await userData(db, b);
        assert(id !== 'owner' || (data.role === 'admin' && data.active), 400, 'لا يمكن تعطيل المدير الرئيسي أو تخفيض صلاحيته');
        assert(id !== user._id || (data.role === 'admin' && data.active), 400, 'لا يمكنك تعطيل حسابك أو تخفيض صلاحيته');
        if (b.password) data.passwordHash = password(b.password);
      } else if (name === 'projects') data = projectData(b);
      else {
        data = inspectionData(b); const assigned = await validAssignment(db, data.projectId, data.assignedTo); data.assignedName = assigned.name; data.assignedEmployeeNo = assigned.employeeNo;
      }
      await db.collection(name).updateOne({ _id: id }, { $set: { ...data, updatedAt: now(), updatedBy: stamp(user) } });
      if (name === 'users') await db.collection('sessions').deleteMany({ userId: id });
      return json({ ok: true });
    }
    if (method === 'DELETE') {
      if (name === 'users') assert(id !== 'owner' && id !== user._id, 400, 'لا يمكن حذف المدير الرئيسي أو حسابك الحالي');
      await db.collection(name).updateOne({ _id: id }, { $set: { deleted: true, deletedAt: now(), deletedBy: stamp(user) } });
      if (name === 'users') await db.collection('sessions').deleteMany({ userId: id });
      return json({ ok: true });
    }
  }
  const noteMatch = path.match(/^\/api\/inspections\/([\w-]+)\/notes(?:\/([\w-]+))?$/);
  if (noteMatch) {
    const [, id, noteId] = noteMatch; await getInspection(db, id, user);
    if (method === 'POST' && !noteId) {
      const b = await body(request); const note = { _id: randomUUID(), text: text(b.text, 'الملاحظة', 4000), status: 'open', dueDate: '', by: stamp(user), at: now() };
      const result = await db.collection('inspections').updateOne({ _id: id, 'notes.199': { $exists: false } }, { $push: { notes: note }, $set: { updatedAt: now(), updatedBy: stamp(user) } });
      assert(result.matchedCount, 409, 'وصل الكشف إلى الحد الأقصى: 200 ملاحظة'); return json(note, 201);
    }
    if (noteId && ['PATCH', 'DELETE'].includes(method)) {
      admin(user);
      const b = method === 'PATCH' ? await body(request) : {};
      if (b.dueDate) assert(/^\d{4}-\d{2}-\d{2}$/.test(b.dueDate) && !Number.isNaN(Date.parse(b.dueDate)), 400, 'التاريخ غير صالح');
      const update = method === 'DELETE' ? { $pull: { notes: { _id: noteId } } } : { $set: { 'notes.$.text': text(b.text, 'الملاحظة', 4000), 'notes.$.status': pickStatus(b.status || 'open', ['open', 'in_progress', 'closed']), 'notes.$.dueDate': text(b.dueDate, 'موعد المعالجة', 10, false), 'notes.$.editedBy': stamp(user), 'notes.$.editedAt': now() } };
      const result = await db.collection('inspections').updateOne({ _id: id, 'notes._id': noteId }, update);
      assert(result.matchedCount, 404, 'الملاحظة غير موجودة'); return json({ ok: true });
    }
  }
  if (path === '/api/photos' && method === 'POST') {
    const bytes = await boundedBody(request, 8 * 1024 * 1024);
    let form; try { form = await new Response(bytes, { headers: { 'Content-Type': request.headers.get('content-type') || '' } }).formData(); } catch { throw new HttpError(400, 'صيغة رفع الصورة غير صالحة'); }
    const parentType = text(form.get('parentType'), 'النوع', 20), parentId = text(form.get('parentId'), 'السجل', 80);
    const stage = parentType === 'user' ? pickStatus(form.get('stage') || 'document', ['profile', 'document', 'signature', 'stamp']) : pickStatus(form.get('stage') || 'general', ['general', 'before', 'after']);
    if (parentType === 'user' && ['signature', 'stamp'].includes(stage)) admin(user);
    const ownerRecord = await parent(db, parentType, parentId, user, true);
    const file = form.get('file'); assert(file && typeof file.arrayBuffer === 'function', 400, 'اختر ملفًا');
    const maxSize = parentType === 'user' ? 8 * 1024 * 1024 : 3 * 1024 * 1024;
    assert(file.size > 0 && file.size <= maxSize, 400, parentType === 'user' ? 'الحد الأقصى للملف 8 ميغابايت' : 'الحد الأقصى للصورة 3 ميغابايت');
    const data = Buffer.from(await file.arrayBuffer());
    const mime = data[0] === 255 && data[1] === 216 && data[2] === 255 ? 'image/jpeg' : data.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? 'image/png' : data.subarray(0, 4).toString() === 'RIFF' && data.subarray(8, 12).toString() === 'WEBP' ? 'image/webp' : data.subarray(0, 4).toString() === '%PDF' ? 'application/pdf' : '';
    assert(mime && (parentType === 'user' || mime.startsWith('image/')), 400, parentType === 'user' ? 'الملفات المدعومة: JPG وPNG وWebP وPDF فقط' : 'الصور المدعومة: JPG وPNG وWebP فقط');
    const noteId = text(form.get('noteId') || '', 'الملاحظة', 80, false);
    if (noteId) { assert(parentType === 'inspection', 400, 'نوع المرفق غير صالح'); const inspection = await getInspection(db, parentId, user); assert(inspection.notes.some(n => n._id === noteId), 400, 'الملاحظة غير موجودة'); }
    if (parentType === 'user' && ['profile', 'signature', 'stamp'].includes(stage)) assert(mime.startsWith('image/'), 400, 'هذا الملف يجب أن يكون صورة وليس PDF');
    const photo = { _id: randomUUID(), noteId, stage, parentType, parentId, name: text(file.name || 'image', 'اسم الصورة', 200), mime, size: data.length, data, createdAt: now(), createdBy: stamp(user), deleted: false };
    await db.collection('photos').insertOne(photo);
    if (parentType === 'user' && ['profile', 'signature', 'stamp'].includes(stage)) {
      await db.collection('photos').updateMany({ parentType: 'user', parentId, stage, _id: { $ne: photo._id }, ...alive }, { $set: { deleted: true, deletedAt: now() } });
      if (stage === 'profile') await db.collection('users').updateOne({ _id: parentId }, { $set: { profilePhotoId: photo._id, updatedAt: now() } });
    }
    if (parentType === 'report') {
      const changed = await db.collection('reports').updateOne({ _id: parentId, status: 'draft', revision: ownerRecord.revision }, { $push: { photoIds: photo._id, history: { at: now(), by: stamp(user), action: 'photo', revision: ownerRecord.revision, snapshot: { title: ownerRecord.title, works: ownerRecord.works, notes: ownerRecord.notes, photoIds: ownerRecord.photoIds || [] } } }, $inc: { revision: 1 }, $set: { updatedAt: now(), updatedBy: stamp(user) } });
      if (!changed.matchedCount) { await db.collection('photos').deleteOne({ _id: photo._id }); throw new HttpError(409, 'تم تعديل التقرير. أعد فتحه'); }
    }
    const { data: _, ...safe } = photo; return json(safe, 201);
  }
  const photoMatch = path.match(/^\/api\/photos\/([\w-]+)$/);
  if (photoMatch) {
    const photo = await db.collection('photos').findOne({ _id: photoMatch[1], ...alive }); assert(photo, 404, 'الصورة غير موجودة');
    await parent(db, photo.parentType, photo.parentId, user, method === 'DELETE');
    if (method === 'GET') return new Response(photo.data, { headers: { 'Content-Type': photo.mime, 'Content-Disposition': 'inline' } });
    if (method === 'DELETE') {
      assert(user.role === 'admin' || (photo.parentType === 'user' && photo.parentId === user._id), 403, 'لا يمكنك حذف هذا الملف');
      assert(photo.parentType !== 'report', 409, 'صور التقارير محفوظة في سجل المراجعات');
      await db.collection('photos').deleteOne({ _id: photo._id });
      if (photo.parentType === 'user' && photo.stage === 'profile') await db.collection('users').updateOne({ _id: photo.parentId, profilePhotoId: photo._id }, { $unset: { profilePhotoId: '' } });
      return json({ ok: true });
    }
  }
  throw new HttpError(404, 'الصفحة المطلوبة غير موجودة');
}
async function userData(db, b) {
  const role = pickStatus(b.role, ['admin', 'employee']); const projectId = text(b.projectId, 'المشروع', 80, false);
  if (projectId) assert(await db.collection('projects').findOne({ _id: projectId, ...alive }), 400, 'المشروع غير متاح');
  assert(typeof b.active === 'boolean', 400, 'حالة الحساب غير صالحة');
  return { employeeNo: text(b.employeeNo, 'رقم الموظف', 40), name: text(b.name, 'الاسم'), profession: text(b.profession, 'المهنة', 100), phone: text(b.phone, 'الهاتف', 40, false), projectId, role, active: b.active };
}
function projectData(b) {
  return { name: text(b.name, 'اسم المشروع'), code: text(b.code, 'رمز المشروع', 40), description: text(b.description, 'وصف المشروع', 2000, false), status: pickStatus(b.status, ['active', 'on_hold', 'completed']), location: location(b.location) };
}

// Audit metadata only: never record passwords, setup tokens, sessions or request bodies.
export async function handleApi(request, env, db) {
  const mutation = !['GET', 'HEAD'].includes(request.method);
  let actor;
  if (mutation) { try { actor = await authenticate(db, request); } catch {} }
  const response = await dispatchApi(request, env, db);
  if (mutation && response.ok && actor) {
    const path = new URL(request.url).pathname, parts = path.split('/');
    const kind = parts[2]; let targetId = parts[3] || '';
    if (!targetId) { const result = await response.clone().json().catch(() => ({})); targetId = result._id || ''; }
    let targetName = '';
    if (targetId && ['users', 'projects', 'inspections', 'reports', 'contracts', 'photos'].includes(kind)) {
      const target = await db.collection(kind).findOne({ _id: targetId }); targetName = target?.title || target?.name || target?.number || '';
    }
    await db.collection('activity').insertOne({ _id: randomUUID(), by: stamp(actor), at: now(), method: request.method, path, kind: parts[4] === 'notes' ? 'notes' : kind, targetId, targetName });
  }
  return response;
}
