import assert from 'node:assert/strict';
import { mkdtemp,readFile,readdir,rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { parseCsv } from '../lib/intake/interpreter';
import { normalizeSheet } from '../lib/intake/normalize';
import { analyze } from '../lib/evidence/engine';
import { buildEvidence } from '../lib/ai/gateway';

async function main(){
 const fixtures=process.argv[2];
 if(!fixtures)throw new Error('Pass the generated synthetic fixture directory.');
 const tmp=await mkdtemp(path.join(os.tmpdir(),'bizbetter-loss-flow-')),cwd=process.cwd();
 try{
  process.chdir(tmp);
  const repo=await import('../lib/evidence/repository');
  const business=await repo.createBusiness('Synthetic Loss Test'),other=await repo.createBusiness('Unrelated business');
  for(const file of (await readdir(fixtures)).filter(f=>f.endsWith('.csv'))){
   const sheet=parseCsv(await readFile(path.join(fixtures,file),'utf8'),file)[0];
   const importId=crypto.randomUUID();
   const result=normalizeSheet({businessId:business.id,importId,fileName:file,fileType:'csv',sheet,mappings:sheet.mappings,currency:'USD',complete:false,basis:'accrual',sourceSystem:file,existing:[]});
   assert(result.records.length>0,file+' should generate evidence');
   assert(result.records.every(r=>Number.isSafeInteger(r.value)));
   const batch={id:importId,businessId:business.id,fileName:file,fileType:'csv' as const,datasetType:sheet.classification,sourceSystem:file,status:'COMMITTED' as const,rowCount:sheet.rows.length,acceptedCount:result.normalized.length,duplicateCount:0,invalidCount:0,sourceDigest:'d'.repeat(64),mappingVersion:'test',mappings:sheet.mappings,createdAt:new Date().toISOString(),warnings:result.warnings};
   await repo.commitIntake({batch,normalized:result.normalized,records:result.records});
   await assert.rejects(()=>repo.confirmImportCompleteness(importId,other.id),/not found/);
  }
  const blocked=await repo.workspace(business.id);
  assert.equal(blocked.quality.score,80);
  assert.match(blocked.message,/confirm source completeness/);
  assert.equal(buildEvidence(blocked.records,blocked.findings,'losses').items.length,0);
  const before=await repo.readDatabase();
  for(const item of before.imports!)await repo.confirmImportCompleteness(item.id,business.id);
  const ready=await repo.workspace(business.id);
  assert.equal(ready.quality.score,100);
  assert.equal(ready.records.length,blocked.records.length);
  assert.equal(ready.findings.filter(f=>f.title.startsWith('Negative direct job')).length,16);
  assert.equal(ready.findings.filter(f=>f.title==='Reported accounting loss').length,8);
  assert(buildEvidence(ready.records,ready.findings,'losses').items.length>0);
  const db=await repo.readDatabase();
  assert(db.records.some(r=>!r.complete),'original partial records must remain in audit storage');
  assert.equal(db.audit.filter(a=>a.action==='SOURCE_COMPLETENESS_CONFIRMED').length,4);
  for(const item of db.imports!)await repo.confirmImportCompleteness(item.id,business.id);
  assert.equal((await repo.workspace(business.id)).records.length,ready.records.length,'reconfirm must not duplicate active evidence');
  const healthy=ready.records.filter(r=>r.metric==='job_revenue'&&r.value>0).slice(0,1);
  assert.match(analyze(healthy,business.id).message,/no supported loss/);
  const rejected=db.imports![0];await repo.rejectImport(rejected.id,business.id);
  await assert.rejects(()=>repo.confirmImportCompleteness(rejected.id,business.id),/not found/);
  assert((await repo.workspace(business.id)).records.every(r=>r.importId!==rejected.id));
  console.log('PASS 80→100 completeness, retained originals, business isolation, repeat confirmation, rejected imports, nonempty gateway, 16 job losses and 8 accounting losses');
 }finally{process.chdir(cwd);await rm(tmp,{recursive:true,force:true});}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
