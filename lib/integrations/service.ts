import { createHash, randomUUID } from 'crypto';
import { appendRecords, BUSINESS_ID } from '../evidence/repository';
import { SourceRecord } from '../evidence/model';
import { promises as fs } from 'fs';
import path from 'path';
import { providers } from './catalog';
import { analyzeEvidence, Evidence } from './analysis';
const folder=path.join(process.cwd(),'.bizbetter-data');
type idMetric=['revenue'|'net_profit'|'fees'|'payment_net',number|undefined];
const busy=new Set<string>();
export async function saved(id:string) { try { return JSON.parse(await fs.readFile(path.join(folder,id+'.json'),'utf8')); } catch { return null; } }
export async function integrationState() { return Promise.all(providers.map(async p=>{if(p.id==='qbo')return {...p,status:'OAuth setup required',snapshot:null};const snapshot=await saved(p.id);const safeSnapshot=snapshot?{syncedAt:snapshot.syncedAt,periodStart:snapshot.periodStart,periodEnd:snapshot.periodEnd,records:snapshot.records,reports:snapshot.reports,syncId:snapshot.syncId,normalizedRecordIds:snapshot.normalizedRecordIds}:null;return {...p,status:snapshot?'Previously verified':p.adapter?'Setup required':'Not implemented',snapshot:safeSnapshot};})); }
async function json(url:string,token:string) {
 const r=await fetch(url,{headers:{Authorization:'Bearer '+token,Accept:'application/json'},cache:'no-store',signal:AbortSignal.timeout(20000)});
 if(!r.ok) throw new Error(r.status===401||r.status===403?'Provider authorization failed. Check account access and token expiry.':'Provider request failed; retry later.');
 return r.json();
}
export async function syncProvider(id:string) {
 const provider=providers.find(p=>p.id===id); if(!provider?.adapter) throw new Error('This connector is not implemented.');
 if(busy.has(id)) throw new Error('A sync is already running.'); busy.add(id);
 try {
 const end=new Date();const start=new Date(end);start.setUTCDate(start.getUTCDate()-90);
 const periodStart=start.toISOString().slice(0,10),periodEnd=end.toISOString().slice(0,10);
 const results:Evidence[]=[];const sourceDetails:any[]=[];const syncId=randomUUID();
 if(id==='stripe') {
 const key=process.env.BIZBETTER_STRIPE_SECRET_KEY;if(!key) throw new Error('Stripe read-only key is not configured.');
 const currencies=new Map<string,Evidence>();let cursor='';let complete=false;
 for(let page=0;page<100;page++) {
 const q=new URLSearchParams({limit:'100','created[gte]':String(Math.floor(start.getTime()/1000)),'created[lte]':String(Math.floor(end.getTime()/1000))});if(cursor)q.set('starting_after',cursor);
 const data=await json('https://api.stripe.com/v1/balance_transactions?'+q,key);
 if(!Array.isArray(data.data))throw new Error('Unexpected Stripe response.');
 for(const t of data.data) {
 sourceDetails.push({source_record_id:t.id,currency:t.currency,fee:t.fee,net:t.net,created:t.created,type:t.type});
 if(typeof t.currency!=='string'||!Number.isFinite(t.fee)||!Number.isFinite(t.net))throw new Error('Incomplete Stripe financial record.');
 const currency=t.currency.toUpperCase();
 // Stripe zero-decimal currencies use whole units, other supported currencies use cents.
 const zero=['BIF','CLP','DJF','GNF','JPY','KMF','KRW','MGA','PYG','RWF','UGX','VND','VUV','XAF','XOF','XPF'];
 if(['ISK','HUF','TWD','BHD','JOD','KWD','OMR','TND'].includes(currency))throw new Error('This currency needs a verified conversion adapter before analysis.');
 const divisor=zero.includes(currency)?1:100;
 const e=currencies.get(currency)||{source:'Stripe balance transactions',periodStart,periodEnd,currency,complete:false,fees:0,paymentNet:0,records:0};
 e.fees!+=t.fee/divisor;e.paymentNet!+=t.net/divisor;e.records++;currencies.set(currency,e);
 }
 if(!data.has_more){complete=true;break;}cursor=data.data.at(-1)?.id;if(!cursor)throw new Error('Provider pagination is incomplete.');
 }
 for(const e of Array.from(currencies.values())){e.complete=complete;results.push(e);}
 } else {
 throw new Error('QuickBooks must be connected with OAuth before syncing. Use the Connect button on the integrations page.');
 }
 const requestedId:string=id;
 const normalized:SourceRecord[]=results.flatMap(e=>{const zero=['BIF','CLP','DJF','GNF','JPY','KMF','KRW','MGA','PYG','RWF','UGX','VND','VUV','XAF','XOF','XPF'];const decimals=zero.includes(e.currency)?0:2;const values:idMetric[]=id==='stripe'?[['fees',e.fees],['payment_net',e.paymentNet]]:[['revenue',e.revenue],['net_profit',e.netProfit]];return values.filter(([,value])=>value!==undefined).map(([metric,value])=>{const sourceRecordId=requestedId==='qbo'?'ProfitAndLoss:'+process.env.BIZBETTER_QBO_REALM_ID+':'+metric:'balance_transactions:'+e.currency+':'+metric;const base={businessId:BUSINESS_ID,environment:'REAL' as const,sourceSystem:requestedId==='qbo'?'QuickBooks Online':'Stripe',sourceRecordId,syncId,periodStart:e.periodStart,periodEnd:e.periodEnd,importedAt:new Date().toISOString(),metric,value:Math.round(value!*10**decimals),currency:e.currency,decimals,basis:requestedId==='qbo'?'accrual':'payment balance',complete:e.complete,verification:'PROVIDER' as const,sourcePayload:id==='stripe'?sourceDetails.filter(t=>String(t.currency).toUpperCase()===e.currency):sourceDetails,sourceDigest:createHash('sha256').update(JSON.stringify(id==='stripe'?sourceDetails.filter(t=>String(t.currency).toUpperCase()===e.currency):sourceDetails)).digest('hex')};return {...base,id:createHash('sha256').update(JSON.stringify({sourceRecordId,periodStart:e.periodStart,periodEnd:e.periodEnd,value:base.value,currency:e.currency,complete:e.complete})).digest('hex')};});});
 await appendRecords(normalized);
 const snapshot={syncId,sourceDetails,normalizedRecordIds:normalized.map(r=>r.id),syncedAt:new Date().toISOString(),periodStart,periodEnd,records:results.reduce((n,e)=>n+e.records,0),reports:results.map(e=>({evidence:e,analysis:analyzeEvidence(e)}))};
 await fs.mkdir(folder,{recursive:true});const temp=path.join(folder,id+'.tmp');await fs.writeFile(temp,JSON.stringify(snapshot),{mode:0o600});await fs.rename(temp,path.join(folder,id+'.json'));return snapshot;
 } finally {busy.delete(id);}
}
