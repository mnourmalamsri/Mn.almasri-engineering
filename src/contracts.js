import { randomUUID } from 'node:crypto';
import { admin, assert, text } from './security.js';

const iso = () => new Date();

async function officeAssets(db, alive) {
  return db.collection('photos').find({ parentType: 'user', parentId: 'owner', stage: { $in: ['signature', 'stamp'] }, ...alive }, { projection: { data: 0 } }).sort({ createdAt: -1 }).toArray();
}

function dateValue(value, label, required = true) {
  if (!required && (value == null || value === '')) return '';
  assert(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value, 400, `${label}: التاريخ غير صالح`);
  return value;
}

async function contractData(db, b, alive) {
  const projectId = text(b.projectId, 'المشروع', 80);
  const project = await db.collection('projects').findOne({ _id: projectId, ...alive });
  assert(project, 400, 'المشروع غير متاح');
  const contractDate = dateValue(b.contractDate, 'تاريخ العقد');
  const startDate = dateValue(b.startDate, 'تاريخ البدء', false);
  const endDate = dateValue(b.endDate, 'تاريخ الانتهاء', false);
  if (startDate && endDate) assert(endDate >= startDate, 400, 'تاريخ الانتهاء يجب أن يكون بعد تاريخ البدء');
  return {
    number: text(b.number, 'رقم العقد', 80, false),
    title: text(b.title, 'عنوان العقد', 200),
    projectId,
    projectName: project.name,
    partyA: text(b.partyA, 'الطرف الأول', 200),
    partyB: text(b.partyB, 'الطرف الثاني', 200),
    subject: text(b.subject, 'موضوع العقد', 1000),
    value: text(b.value, 'قيمة العقد', 120, false),
    contractDate,
    startDate,
    endDate,
    terms: text(b.terms, 'بنود العقد', 16000),
    signatureA: text(b.signatureA, 'اسم توقيع الطرف الأول', 200, false),
    signatureB: text(b.signatureB, 'اسم توقيع الطرف الثاني', 200, false),
    stampLabel: text(b.stampLabel, 'بيان الختم', 200, false)
  };
}

export async function contractsApi(request, db, user, { body, json, alive, stamp }) {
  const url = new URL(request.url), path = url.pathname, method = request.method;
  if (!/^\/api\/contracts(?:\/|$)/.test(path)) return null;
  admin(user);
  const match = path.match(/^\/api\/contracts(?:\/([\w-]+))?$/);
  assert(match, 404, 'الصفحة المطلوبة غير موجودة');
  const id = match[1] || '';
  const col = db.collection('contracts');

  if (!id && method === 'GET') {
    const filter = { ...alive };
    const q = (url.searchParams.get('q') || '').slice(0, 100);
    if (q) {
      const regex = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = ['number', 'title', 'projectName', 'partyA', 'partyB'].map(key => ({ [key]: { $regex: regex, $options: 'i' } }));
    }
    if (url.searchParams.get('date')) filter.contractDate = dateValue(url.searchParams.get('date'), 'التاريخ');
    const page = Math.max(1, parseInt(url.searchParams.get('page'), 10) || 1);
    const total = await col.countDocuments(filter);
    const items = await col.find(filter).sort({ createdAt: -1 }).skip((page - 1) * 20).limit(20).toArray();
    return json({ items, total, page, pages: Math.ceil(total / 20) });
  }

  let item = id ? await col.findOne({ _id: id, ...alive }) : null;
  if (id) assert(item, 404, 'العقد غير موجود');
  if (id && method === 'GET') return json({ ...item, officeAssets: await officeAssets(db, alive) });

  if (!id && method === 'POST') {
    const b = await body(request); const data = await contractData(db, b, alive);
    const counter = await db.collection('counters').findOneAndUpdate({ _id: 'contracts' }, { $inc: { value: 1 } }, { upsert: true, returnDocument: 'after' });
    const number = data.number || `ALM-C-${new Date().getFullYear()}-${String(counter.value).padStart(5, '0')}`;
    item = { _id: randomUUID(), ...data, number, createdBy: stamp(user), createdAt: iso(), updatedBy: stamp(user), updatedAt: iso(), deleted: false };
    await col.insertOne(item); return json(item, 201);
  }

  if (id && method === 'PATCH') {
    const b = await body(request); const data = await contractData(db, b, alive);
    if (!data.number) data.number = item.number;
    const result = await col.updateOne({ _id: id, ...alive }, { $set: { ...data, updatedBy: stamp(user), updatedAt: iso() } });
    assert(result.matchedCount, 409, 'تعذر تحديث العقد'); return json({ ok: true });
  }

  if (id && method === 'DELETE') {
    const result = await col.updateOne({ _id: id, ...alive }, { $set: { deleted: true, deletedAt: iso(), deletedBy: stamp(user) } });
    assert(result.matchedCount, 404, 'العقد غير موجود'); return json({ ok: true });
  }
  return json({ error: 'العملية غير متاحة' }, 405);
}
