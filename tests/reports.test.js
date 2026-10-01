import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reportsApi } from '../src/reports.js';
import { handleApi } from '../src/api.js';
import { digest } from '../src/security.js';
const manager = { _id: 'owner', name: 'Muhammed Nour', role: 'admin' };
function fixture() {
  const rows = []; const audit = []; const employee = { _id: 'e1', name: 'Staff', profession: 'Engineer', phone: '', role: 'employee', projectId: 'p1', active: true };
  return { rows, audit, employee, collection(name) { return {
    async findOne(f) { if (name === 'sessions') return { userId: 'e1' }; if (name === 'users') return employee; if (name === 'projects') return { _id: f._id, name: 'Project A' }; return rows.find(r => r._id === f._id); },
    async findOneAndUpdate() { return { value: 1 }; },
    async insertOne(r) { (name === 'activity' ? audit : rows).push(structuredClone(r)); },
    async updateOne(f, update) {
      const r = name === 'users' ? employee : rows.find(r => r._id === f._id && (f.revision === undefined || r.revision === f.revision) && (!f.status || r.status === f.status));
      if (!r) return { matchedCount: 0 };
      Object.assign(r, update.$set); if (update.$inc?.revision) r.revision += update.$inc.revision; if (update.$push?.history) r.history.push(structuredClone(update.$push.history)); return { matchedCount: 1 };
    }
  }; } };
}
const helpers = { body: req => req.json(), json: (v,s=200) => Response.json(v,{status:s}), alive: {deleted:{$ne:true}}, stamp: u => ({id:u._id,name:u.name}) };
const request = (path,method='GET',data) => new Request('https://portal.test/api'+path, { method, headers: {'Content-Type':'application/json','X-Requested-With':'EngineeringPortal',cookie:'engineering_session='+'a'.repeat(64)}, ...(data ? {body:JSON.stringify(data)} : {}) });
test('employee can save own profile; role, project and login number escalation is rejected',async()=>{
 const db=fixture();
 const r=await handleApi(request('/profile','PATCH',{name:'Updated Staff',profession:'Civil engineer',phone:'123'}),{},db);
 assert.equal(r.status,200);assert.equal(db.employee.name,'Updated Staff');assert.equal(db.employee.role,'employee');assert.equal(db.audit.length,1);
 for(const key of ['role','projectId','employeeNo','active','passwordHash']) await assert.rejects(handleApi(request('/profile','PATCH',{name:'X',profession:'X',phone:'', [key]:'admin'}),{},db),{status:403});
});
test('reports and activity are forbidden to employees at API boundary',async()=>{
 const db=fixture(); for(const [p,m] of [['/reports','GET'],['/reports','POST'],['/reports/r1','GET'],['/reports/r1','PATCH'],['/reports/r1/approve','POST'],['/activity','GET']]) await assert.rejects(reportsApi(request(p,m),db,{role:'employee'},helpers),{status:403});
});
test('reports retain manager identity and prior versions; approval blocks edits; stale writes rejected',async()=>{
 const db=fixture(), data={title:'Daily report',projectId:'p1',date:'2026-09-15',works:'Rebar checked',notes:'Follow up',author:{name:'Spoofed'}};
 let response=await reportsApi(request('/reports','POST',data),db,manager,helpers);assert.equal(response.status,201);let r=await response.json();const id=r._id;
 assert.equal(r.author.name,'Muhammed Nour');assert.equal(r.revision,1);
 await reportsApi(request('/reports/'+id+'/approve','POST',{revision:1}),db,manager,helpers);
 await assert.rejects(reportsApi(request('/reports/'+id,'PATCH',{...data,revision:2}),db,manager,helpers),{status:409});
 await reportsApi(request('/reports/'+id+'/reopen','POST',{revision:2}),db,manager,helpers);
 await assert.rejects(reportsApi(request('/reports/'+id,'PATCH',{...data,revision:1}),db,manager,helpers),{status:409});
 await reportsApi(request('/reports/'+id,'PATCH',{...data,works:'Updated work',revision:3}),db,manager,helpers);
 assert.equal(db.rows[0].revision,4);assert.equal(db.rows[0].history[2].snapshot.works,'Rebar checked');assert.equal(db.rows[0].works,'Updated work');assert.equal(db.rows[0].author.name,'Muhammed Nour');
 await assert.rejects(reportsApi(request('/reports','POST',{...data,date:'2026-02-30'}),db,manager,helpers),{status:400});
});
