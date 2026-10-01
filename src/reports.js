import { randomUUID } from 'node:crypto';
import { admin, assert, text } from './security.js';
const iso = () => new Date();
async function officeAssets(db, alive) {
  return db.collection('photos').find({ parentType: 'user', parentId: 'owner', stage: { $in: ['signature', 'stamp'] }, ...alive }, { projection: { data: 0 } }).sort({ createdAt: -1 }).toArray();
}
function dateValue(value) {
  assert(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value, 400, 'التاريخ غير صالح');
  return value;
}
export async function reportsApi(request, db, user, { body, json, alive, stamp }) {
  const url = new URL(request.url), path = url.pathname, method = request.method;
  if (path === '/api/activity' && method === 'GET') {
    admin(user); const page = Math.max(1, parseInt(url.searchParams.get('page')) || 1);
    const total = await db.collection('activity').countDocuments({});
    const items = await db.collection('activity').find({}).sort({ at: -1 }).skip((page - 1) * 30).limit(30).toArray();
    return json({ items, total, page, pages: Math.ceil(total / 30) });
  }
  if (!/^\/api\/reports(?:\/|$)/.test(path)) return null;
  admin(user);
  const match = path.match(/^\/api\/reports(?:\/([\w-]+))?(?:\/(approve|reopen))?$/);
  assert(match, 404, 'الصفحة المطلوبة غير موجودة');
  const [, id, action] = match;
  if (!id && method === 'GET') {
    const filter = { ...alive };
    if (url.searchParams.get('projectId')) filter.projectId = url.searchParams.get('projectId');
    if (url.searchParams.get('date')) filter.date = dateValue(url.searchParams.get('date'));
    if (url.searchParams.get('q')) filter.number = { $regex: url.searchParams.get('q').slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    const page = Math.max(1, parseInt(url.searchParams.get('page')) || 1);
    const total = await db.collection('reports').countDocuments(filter);
    const items = await db.collection('reports').find(filter, { projection: { history: 0 } }).sort({ createdAt: -1 }).skip((page - 1) * 20).limit(20).toArray();
    return json({ items, total, page, pages: Math.ceil(total / 20) });
  }
  const col = db.collection('reports');
  let item = id ? await col.findOne({ _id: id, ...alive }) : null;
  if (id) assert(item, 404, 'التقرير غير موجود');
  if (id && method === 'GET' && !action) {
    const photos = await db.collection('photos').find({ parentType: 'report', parentId: id, _id: { $in: item.photoIds || [] }, ...alive }, { projection: { data: 0 } }).toArray();
    return json({ ...item, photos, officeAssets: await officeAssets(db, alive) });
  }
  if (id && action && method === 'POST') {
    const b = await body(request);
    assert(item.history.length < 200, 409, 'وصل التقرير إلى حد المراجعات. أنشئ تقريرًا جديدًا');
    assert(b.revision === item.revision, 409, 'تم تعديل التقرير. أعد فتحه');
    assert(action === 'approve' ? item.status === 'draft' : item.status === 'approved', 409, 'حالة التقرير لا تسمح بهذه العملية');
    const result = await col.updateOne({ _id: id, revision: b.revision, status: item.status }, { $set: { status: action === 'approve' ? 'approved' : 'draft', updatedAt: iso(), updatedBy: stamp(user), ...(action === 'approve' ? { approvedBy: stamp(user), approvedAt: iso() } : { approvedBy: null, approvedAt: null }) }, $inc: { revision: 1 }, $push: { history: { at: iso(), by: stamp(user), action, revision: item.revision, snapshot: snapshot(item) } } });
    assert(result.matchedCount, 409, 'تم تعديل التقرير. أعد فتحه'); return json({ ok: true });
  }
  if ((!id && method === 'POST') || (id && !action && method === 'PATCH')) {
    const b = await body(request);
    if (id) { assert(item.status === 'draft', 409, 'أعد التقرير إلى مسودة قبل التعديل'); assert(b.revision === item.revision, 409, 'تم تعديل التقرير. أعد فتحه'); assert(item.history.length < 200, 409, 'وصل التقرير إلى حد المراجعات. أنشئ تقريرًا جديدًا'); }
    const project = await db.collection('projects').findOne({ _id: text(b.projectId, 'المشروع'), ...alive });
    assert(project, 400, 'المشروع غير متاح');
    const data = { title: text(b.title, 'عنوان التقرير'), projectId: project._id, projectName: project.name, date: dateValue(b.date), works: text(b.works, 'الأعمال المنفذة', 8000), notes: text(b.notes, 'الملاحظات', 8000, false), preparedByName: text(b.preparedByName, 'اسم مُعد التقرير', 200, false), approvedByName: text(b.approvedByName, 'اسم المعتمد', 200, false), updatedAt: iso(), updatedBy: stamp(user) };
    if (!id) {
      const counter = await db.collection('counters').findOneAndUpdate({ _id: 'reports' }, { $inc: { value: 1 } }, { upsert: true, returnDocument: 'after' });
      item = { _id: randomUUID(), ...data, number: `ALM-${new Date().getFullYear()}-${String(counter.value).padStart(5, '0')}`, status: 'draft', author: stamp(user), createdBy: stamp(user), createdAt: iso(), revision: 1, history: [], photoIds: [], deleted: false };
      await col.insertOne(item); return json(item, 201);
    }
    const result = await col.updateOne({ _id: id, revision: b.revision, status: 'draft' }, { $set: data, $inc: { revision: 1 }, $push: { history: { at: iso(), by: stamp(user), action: 'edit', revision: item.revision, snapshot: snapshot(item) } } });
    assert(result.matchedCount, 409, 'تم تعديل التقرير. أعد فتحه'); return json({ ok: true });
  }
  return json({ error: 'العملية غير متاحة' }, 405);
}
function snapshot(r) { return { title: r.title, projectId: r.projectId, projectName: r.projectName, date: r.date, works: r.works, notes: r.notes, preparedByName: r.preparedByName || '', approvedByName: r.approvedByName || '', status: r.status, author: r.author, photoIds: r.photoIds || [] }; }
