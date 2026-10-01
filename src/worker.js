import { connect } from './db.js';
import { handleApi } from './api.js';
import { headers } from './security.js';

function databaseMessage(error) {
  if (error?.code === 'DATABASE_NOT_CONFIGURED') return ['أضف رابط MongoDB في ملف .dev.vars أولًا.', 'NOT_CONFIGURED'];
  if (error?.code === 'DATABASE_URI_INVALID') return ['رابط MongoDB في ملف .dev.vars غير صالح.', 'INVALID_URI'];
  if (error?.code === 'DATABASE_NAME_INVALID') return ['اسم قاعدة بيانات MongoDB غير صالح.', 'INVALID_DATABASE_NAME'];
  if (error?.code === 8000 || error?.codeName === 'AtlasError') return ['رفض MongoDB بيانات تسجيل الدخول. تحقق من اسم المستخدم وكلمة المرور.', 'AUTH_FAILED'];
  if (error?.name === 'MongoServerSelectionError') return ['تعذر الوصول إلى MongoDB. تحقق من الإنترنت وNetwork Access في MongoDB Atlas.', 'CONNECTION_FAILED'];
  return ['تعذر الاتصال أو حفظ البيانات في MongoDB. تحقق من إعدادات قاعدة البيانات.', 'DATABASE_ERROR'];
}

export default {
  async fetch(request, env) {
    let connection, response;
    try {
      if (new URL(request.url).pathname.startsWith('/api/')) {
        connection = await connect(env);
        response = await handleApi(request, env, connection.db);
      } else response = await env.ASSETS.fetch(request);
    } catch (e) {
      const status = e.status || (e.code === 11000 ? 409 : 503);
      let message, code;
      if (e.status) {
        message = e.message;
        code = 'REQUEST_ERROR';
      } else if (e.code === 11000) {
        message = 'رقم الموظف مستخدم مسبقًا أو يوجد سجل بنفس الرقم.';
        code = 'DUPLICATE_RECORD';
      } else {
        [message, code] = databaseMessage(e);
      }
      if (!e.status && e.code !== 11000) {
        console.error('API failure', e.name || 'Error', 'code:', e.code ?? e.codeName ?? 'UNKNOWN');
      }
      response = Response.json({ error: message, code }, { status });
    } finally {
      if (connection) await connection.close().catch(() => {});
    }
    const result = new Response(response.body, response);
    for (const [key, value] of Object.entries(headers)) result.headers.set(key, value);
    return result;
  }
};
