import { createHash } from 'crypto';
import { SourceRecord, Finding, Benchmark, ENGINE_VERSION, INSUFFICIENT, Decision, LedgerItem } from './model';
const metrics=new Set(['revenue','net_profit','fees','payment_net','job_revenue','job_labor','job_materials','invoice_paid','invoice_contract','labor_cost','jobs','hours','marketing_cost','customers','expenses','vendor_spend','gross_profit','cogs','receivable','payroll_cost','overtime_hours']);
export function validDate(s:string){return /^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;}
export function validateRecords(records:SourceRecord[],businessId:string){
 if(records.length>100000)throw new Error('Record limit exceeded.');
 const ids=new Set<string>();
 for(const r of records){
  if(r.environment!=='REAL'||r.businessId!==businessId)throw new Error('Demo or different-business data is prohibited in production.');
  if(!r.id||ids.has(r.id)||!r.sourceSystem?.trim()||!r.sourceRecordId?.trim()||!r.syncId?.trim()||!r.basis?.trim())throw new Error('Missing or duplicate provenance.');ids.add(r.id);
  if(r.sourceDigest&&createHash('sha256').update(JSON.stringify(r.sourcePayload)).digest('hex')!==r.sourceDigest)throw new Error('Source payload digest does not match.');
  if(!metrics.has(r.metric)||!Number.isFinite(r.value)||!Number.isSafeInteger(r.value)||!/^([A-Z]{3})$/.test(r.currency)||![0,2,3].includes(r.decimals))throw new Error('Invalid metric, currency or minor-unit value.');
  if(typeof r.complete!=='boolean'||!['PROVIDER','OWNER_ENTERED'].includes(r.verification))throw new Error('Missing quality criteria.');
  if(!validDate(r.periodStart)||!validDate(r.periodEnd)||r.periodStart>r.periodEnd||!Number.isFinite(Date.parse(r.importedAt))||Date.parse(r.importedAt)>Date.now()+60000)throw new Error('Invalid period or import timestamp.');
 }
}
export function confidence(records:SourceRecord[],now=Date.now()){
 const criteria={complete:records.length>0&&records.every(r=>r.complete),fresh:records.length>0&&records.every(r=>now-Date.parse(r.importedAt)<=30*86400000),providerVerified:records.length>0&&records.every(r=>r.verification==='PROVIDER'),traceable:records.length>0&&records.every(r=>!!r.sourceRecordId&&!!r.syncId),independentSources:new Set(records.map(r=>r.sourceSystem)).size>=2,patternSample:records.length>=8};
 const level:'HIGH'|'MEDIUM'|'LOW'=criteria.complete&&criteria.fresh&&criteria.providerVerified&&criteria.traceable&&criteria.independentSources&&criteria.patternSample?'HIGH':criteria.complete&&criteria.traceable?'MEDIUM':'LOW';
 return {level,criteria,explanation:Object.entries(criteria).map(([k,v])=>k+': '+(v?'satisfied':'not established')).concat('Confidence describes the recorded calculation, not a causal explanation or guaranteed recovery.')};
}
export function makeFinding(title:string,records:SourceRecord[],impactMinor:number|null,formula:string,inputs:Record<string,number>,extra:Partial<Finding>={}):Finding{
 if(!records.length)throw new Error(INSUFFICIENT);validateRecords(records,records[0].businessId);
 if(impactMinor!==null&&!Number.isSafeInteger(impactMinor))throw new Error('Invalid financial calculation.');
 const r=records[0];if(records.some(x=>x.currency!==r.currency||x.decimals!==r.decimals))throw new Error('Currencies or units cannot be combined.');
 return {id:createHash('sha256').update(JSON.stringify({title,ids:records.map(r=>r.id).sort(),formula,inputs,ENGINE_VERSION})).digest('hex'),businessId:r.businessId,title,classification:'CALCULATION',impactMinor,currency:r.currency,decimals:r.decimals,periodStart:records.map(x=>x.periodStart).sort()[0],periodEnd:records.map(x=>x.periodEnd).sort().at(-1)!,sourceRecordIds:records.map(x=>x.id),syncIds:Array.from(new Set(records.map(x=>x.syncId))),sourceSystems:Array.from(new Set(records.map(x=>x.sourceSystem))),inputs,formula,assumptions:[],confounders:['Accounting classification, period boundaries and one-time entries may affect interpretation.'],contradictions:[],method:'Deterministic calculation from normalized source records',engineVersion:ENGINE_VERSION,createdAt:new Date().toISOString(),confidence:confidence(records),completeness:records.every(x=>x.complete)?'Complete for the supplied source records; not the entire business.':'Partial data; conclusions are restricted.',recovery:['Reconcile the cited source records and confirm their category and reporting basis.','Assign an owner and due date to investigate the specific variance before changing operations.'],prevention:['Review the same metric against reconciled business history at each close.'],measurementPlan:'Record the implementation date, comparable baseline and post-change data; review confounders before reporting impact.',opportunity:false,...extra};
}
export function dataQuality(records:SourceRecord[]){
 const duplicateKeys=new Map<string,number>();for(const r of records){const k=[r.sourceSystem,r.sourceRecordId,r.metric,r.periodStart,r.periodEnd].join('|');duplicateKeys.set(k,(duplicateKeys.get(k)||0)+1);}
 const duplicates=Array.from(duplicateKeys.values()).filter(n=>n>1).reduce((n,v)=>n+v-1,0);
 const criteria={nonempty:records.length>0,noDuplicates:duplicates===0,complete:records.length>0&&records.every(r=>r.complete),fresh:records.length>0&&records.every(r=>Date.now()-Date.parse(r.importedAt)<=30*86400000),provenance:records.length>0&&records.every(r=>r.sourceRecordId&&r.syncId&&r.sourceSystem)};
 const score=records.length?Math.round(Object.values(criteria).filter(Boolean).length/Object.keys(criteria).length*100):null;
 return {score,formula:'100 × satisfied criteria / 5 equally weighted criteria; no score without records',criteria,duplicateCount:duplicates,limitations:['This score measures ingestion readiness, not accounting accuracy.','Payroll, job, invoice, categorization, identity and calendar coverage require their corresponding records.']};
}
export function analyze(records:SourceRecord[],businessId:string){
 validateRecords(records,businessId);const quality=dataQuality(records);const findings:Finding[]=[];
 const missing=['Job-level revenue, labor and materials matched by job ID','Due dates, outstanding balances and payment dates','Payroll hours, overtime, callbacks and service mix','Marketing acquisition spend linked to acquired customers','Comparable monthly history and confounder documentation'];
 if(!records.length||quality.duplicateCount)return {message:INSUFFICIENT,quality,findings,missing,analysesRun:[]};
 const usable=records.filter(r=>r.complete);
 for(const r of usable){
  if(r.metric==='net_profit'&&r.value<0)findings.push(makeFinding('Reported accounting loss',[r],-r.value,'max(0, -net_profit)',{net_profit:r.value},{recovery:['Reconcile this report to the ledger and review one-time entries.','Rank expense-account changes for this same period and investigate job margins once job costs are complete.','Assign the bookkeeper and operations manager a review date; compare the next reconciled period.']}));
  if(r.metric==='fees'&&r.value>0)findings.push(makeFinding('Processing fees — review, not proven waste',[r],r.value,'fees',{fees:r.value},{classification:'FACT',recovery:['Match the cited charges to your processing contract and payment methods.','Request a rate review only if actual volume and contracted terms support it.','Verify any reduction on subsequent statements; do not book the full fee total as savings.']}));
 }
 const grouped=new Map<string,SourceRecord[]>();for(const r of usable){const key=[r.sourceSystem,r.entityId||'',r.periodStart,r.periodEnd,r.currency,r.decimals,r.basis].join('|');grouped.set(key,[...(grouped.get(key)||[]),r]);}
 for(const rows of Array.from(grouped.values())){
  const one=(m:string)=>{const found=rows.filter(r=>r.metric===m);return found.length===1?found[0]:undefined;};
  const rev=one('job_revenue'),labor=one('job_labor'),materials=one('job_materials');
  if(rev&&labor&&materials&&rev.entityId){const margin=rev.value-labor.value-materials.value;if(margin<0)findings.push(makeFinding('Negative direct job contribution: '+rev.entityId,[rev,labor,materials],-margin,'max(0, labor + materials - job_revenue)',{job_revenue:rev.value,labor:labor.value,materials:materials.value},{assumptions:['Direct contribution excludes overhead, subcontractors and any costs not explicitly supplied.'],recovery:['Verify the job invoice, timecards and material purchases identified in the evidence.','Check scope changes, rework and omitted change orders for this job before assigning a cause.','Use verified costs to review the next comparable quote; measure contribution per job.']}));}
  const paid=one('invoice_paid'),contract=one('invoice_contract');if(paid&&contract&&paid.entityId&&paid.value>contract.value)findings.push(makeFinding('Payment exceeds documented invoice amount: '+paid.entityId,[paid,contract],paid.value-contract.value,'paid - contract',{paid:paid.value,contract:contract.value},{opportunity:true,assumptions:['The contract amount must include all authorized change orders and taxes.'],recovery:['Reconcile invoice amount, tax and approved change orders with the payment.','Ask the vendor to confirm any verified overpayment and agree a refund or credit.','Track the actual credit or refund against this same invoice; do not mark it realized from a status change.'],prevention:['Require a matched invoice and authorized change order before payment.']}));
 }
 // Cross-system comparisons require identical definitions, basis, period, currency and entity.
 const comparisons=new Map<string,SourceRecord[]>();for(const r of usable){const key=[r.metric,r.periodStart,r.periodEnd,r.currency,r.decimals,r.basis,r.entityId||''].join('|');comparisons.set(key,[...(comparisons.get(key)||[]),r]);}
 for(const rows of Array.from(comparisons.values())){if(rows.length===2&&rows[0].sourceSystem!==rows[1].sourceSystem&&rows[0].value!==rows[1].value){const [a,b]=rows;findings.push(makeFinding('Unreconciled cross-system '+a.metric,[a,b],['jobs','hours','customers'].includes(a.metric)?null:Math.abs(a.value-b.value),'abs(source_a - source_b)',{source_a:a.value,source_b:b.value},{classification:'HYPOTHESIS',assumptions:['Definitions and periods are explicitly matched; differences are not proven financial leakage.'],confounders:['Timing, cash versus accrual recognition, fees, refunds and missing mapping may explain differences.'],recovery:['Match the cited records by invoice or transaction ID.','Reconcile timing, fees, taxes and refunds before classifying any loss.','Document the explanation and rerun the comparison.']}));}}
 const runs=['Deterministic loss and fee checks','Complete direct job contribution','Matched invoice payment variance','Definition-matched cross-system reconciliation'];
 const histories=new Map<string,SourceRecord[]>();for(const r of usable){const key=[r.sourceSystem,r.metric,r.currency,r.decimals,r.basis,r.entityId||''].join('|');histories.set(key,[...(histories.get(key)||[]),r]);}
 const statistics:Array<Record<string,unknown>>=Array.from(histories.entries()).map(([series,rows])=>({series,...historicalTrend(rows)}));
 const series=Array.from(histories.entries()).filter(([,rows])=>rows.length>=12).slice(0,20);for(let i=0;i<series.length;i++)for(let j=i+1;j<series.length;j++){if(series[i][1][0].metric===series[j][1][0].metric)continue;statistics.push({series:series[i][0]+' vs '+series[j][0],...correlateSeries(series[i][1],series[j][1])});}
 const message=findings.length?'Evidence-supported observations; recovery is not yet proven.':usable.length===0?'Analysis blocked: confirm source completeness for your imported exports.':usable.length<records.length?'Analysis used confirmed records only. Confirm completeness for the remaining exports to include them.':'Analysis completed: no supported loss identified by the available checks. This does not establish that the business has no profit leaks.';
 return {message,quality,findings,missing,statistics,analysesRun:usable.length?runs:[]};
}
export function validateBenchmark(b:Benchmark){if(!b||!/^https:\/\//.test(b.source)||!validDate(b.publishedAt)||!b.industry?.trim()||!b.companySize?.trim()||!b.geography?.trim()||!b.metricDefinition?.trim()||!Number.isFinite(b.value))throw new Error('Benchmark requires source, publication, applicability and metric definition.');return b;}
export function guardedNarrative(claims:Array<{findingId:string;title:string;impactMinor:number|null}>,findings:Finding[]){
 const verified=new Map(findings.map(f=>[f.id,f]));
 return claims.map(c=>{const f=verified.get(c.findingId);if(!f||c.title!==f.title||c.impactMinor!==f.impactMinor)throw new Error('Unsupported AI claim rejected.');return {evidenceId:f.id,title:f.title,impactMinor:f.impactMinor,classification:f.classification};});
}
const factors=['revenue','jobVolume','seasonality','employeeCount','hoursWorked','serviceMix','pricing','materialPrices','marketingVolume','oneTimeExpenses','otherChanges'];
export function measuredResult(decision:Decision,records:SourceRecord[],businessId:string):Finding{
 validateRecords(records,businessId);
 if(decision.businessId!==businessId||decision.decision==='REJECTED'||!decision.implementationDate||!validDate(decision.implementationDate)||!decision.owner?.trim()||!decision.notes?.trim())throw new Error('Implementation evidence and owner decision are required.');
 if(factors.some(f=>!decision.confounderReview?.[f]?.trim()))throw new Error('Review every required confounding factor.');
 const before=records.filter(r=>decision.baselineIds.includes(r.id)),after=records.filter(r=>decision.afterIds.includes(r.id));
 if(before.length!==1||after.length!==1||!before[0].complete||!after[0].complete)throw new Error('A complete matched before/after source pair is required.');
 const a=before[0],b=after[0];const days=(r:SourceRecord)=>(Date.parse(r.periodEnd)-Date.parse(r.periodStart))/86400000+1;
 if(a.metric!==b.metric||!['labor_cost','fees','job_labor','job_materials','marketing_cost','invoice_paid'].includes(a.metric)||a.currency!==b.currency||a.decimals!==b.decimals||a.basis!==b.basis||a.sourceSystem!==b.sourceSystem||a.entityId!==b.entityId||days(a)!==days(b)||a.periodEnd>=decision.implementationDate||b.periodStart<decision.implementationDate||b.periodEnd>=new Date().toISOString().slice(0,10)||a.value<=b.value)throw new Error('Non-comparable or invalid before/after evidence.');
 return makeFinding('Measured cost reduction after recorded implementation',[a,b],a.value-b.value,'before_cost - after_cost',{before_cost:a.value,after_cost:b.value},{classification:'REALIZED RESULT',assumptions:['Comparable periods and reviewed confounders are owner-attested; causal attribution to BizBetter is not established.'],confounders:Object.entries(decision.confounderReview!).map(([k,v])=>k+': '+v),contradictions:['No reliable counterfactual is established by this before/after comparison.']});
}
export function historicalTrend(records:SourceRecord[]){
 if(records.length<8)return {message:INSUFFICIENT,reason:'At least eight complete consecutive monthly observations are required.'};
 validateRecords(records,records[0].businessId);const rows=[...records].sort((a,b)=>a.periodStart.localeCompare(b.periodStart)),first=rows[0];
 for(let i=0;i<rows.length;i++){const r=rows[i],d=new Date(r.periodStart),month=d.getUTCFullYear()*12+d.getUTCMonth();const prev=i?new Date(rows[i-1].periodStart):null;if(!r.complete||r.metric!==first.metric||r.sourceSystem!==first.sourceSystem||r.currency!==first.currency||r.decimals!==first.decimals||r.basis!==first.basis||r.entityId!==first.entityId||d.getUTCDate()!==1||new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).toISOString().slice(0,10)!==r.periodEnd||(prev&&month!==prev.getUTCFullYear()*12+prev.getUTCMonth()+1))return {message:INSUFFICIENT,reason:'Monthly coverage, metric, source, currency and basis must match.'};}
 const n=rows.length,mx=(n-1)/2,my=rows.reduce((s,r)=>s+r.value,0)/n;const xx=rows.reduce((s,_,i)=>s+(i-mx)**2,0),xy=rows.reduce((s,r,i)=>s+(i-mx)*(r.value-my),0),slope=xy/xx;
 const residual=rows.reduce((s,r,i)=>s+(r.value-(my+slope*(i-mx)))**2,0),total=rows.reduce((s,r)=>s+(r.value-my)**2,0);
 return {method:'Ordinary least squares descriptive trend',sourceRecordIds:rows.map(r=>r.id),slopeMinorPerMonth:slope,rSquared:total===0?null:1-residual/total,sampleSize:n,classification:'CALCULATION',limitations:['Descriptive relationship only; no causal claim or savings estimate.','Seasonality and counterfactual forecasting require additional history and validation.']};
}

export function validateOpportunityOutcome(finding:Finding,decision:Decision,records:SourceRecord[]){
 if(!finding.opportunity||finding.businessId!==decision.businessId||decision.findingId!==finding.id)throw new Error('Outcome must belong to this same opportunity.');
 const baseline=records.find(r=>decision.baselineIds.includes(r.id));
 if(!baseline||!finding.sourceRecordIds.includes(baseline.id)||baseline.metric!=='invoice_paid')throw new Error('Baseline must be the cited original invoice payment.');
 const result=measuredResult(decision,records,finding.businessId);
 if(result.impactMinor!>finding.impactMinor!)throw new Error('Measured recovery exceeds the validated opportunity.');
 return result;
}

export function correlateSeries(a:SourceRecord[],b:SourceRecord[]){
 if(a.length<12||a.length!==b.length)return {message:INSUFFICIENT,reason:'At least 12 matched monthly observations are required.'};
 const ta=historicalTrend(a),tb=historicalTrend(b);if('message' in ta||'message' in tb)return {message:INSUFFICIENT,reason:'Each series needs consistent complete monthly coverage.'};
 const x=[...a].sort((m,n)=>m.periodStart.localeCompare(n.periodStart)),y=[...b].sort((m,n)=>m.periodStart.localeCompare(n.periodStart));
 if(x.some((r,i)=>r.businessId!==y[i].businessId||r.periodStart!==y[i].periodStart||r.periodEnd!==y[i].periodEnd))return {message:INSUFFICIENT,reason:'Business and periods must match.'};
 const mean=(rows:SourceRecord[])=>rows.reduce((s,r)=>s+r.value,0)/rows.length,mx=mean(x),my=mean(y);
 const sx=x.reduce((s,r)=>s+(r.value-mx)**2,0),sy=y.reduce((s,r)=>s+(r.value-my)**2,0);if(sx===0||sy===0)return {message:INSUFFICIENT,reason:'A constant series cannot establish correlation.'};
 const covariance=x.reduce((s,r,i)=>s+(r.value-mx)*(y[i].value-my),0);
 return {classification:'HYPOTHESIS',method:'Pearson correlation of aligned monthly observations',formula:'sum((x-mean_x)*(y-mean_y)) / sqrt(sum((x-mean_x)^2)*sum((y-mean_y)^2))',coefficient:covariance/Math.sqrt(sx*sy),sampleSize:x.length,sourceRecordIds:[...x,...y].map(r=>r.id),inputs:{x:x.map(r=>r.value),y:y.map(r=>r.value)},limitations:['Association is not causation. Shared trends, seasonality and other variables can explain the relationship.','No financial savings or causal root cause is inferred.']};
}

export function learnOutcomes(records:SourceRecord[],decisions:Decision[],ledger:LedgerItem[]){
 const valid:Array<{decision:Decision;result:Finding}>=[];
 for(const item of ledger){if(item.state!=='REALIZED'||!item.result)continue;const decision=decisions.find(d=>d.id===item.decisionId);if(!decision||!item.findingSnapshot)continue;try{const result=validateOpportunityOutcome(item.findingSnapshot,decision,records);if(result.impactMinor!==item.result.impactMinor)continue;valid.push({decision,result});}catch{continue;}}
 const groups=new Map<string,typeof valid>();for(const row of valid){const key=JSON.stringify([row.decision.notes,row.result.currency,row.result.decimals,row.result.formula]);groups.set(key,[...(groups.get(key)||[]),row]);}
 const patterns=Array.from(groups.values()).filter(rows=>rows.length>=3).map(rows=>{const values=rows.map(r=>r.result.impactMinor!).sort((a,b)=>a-b);return {intervention:rows[0].decision.notes,sampleSize:rows.length,currency:rows[0].result.currency,decimals:rows[0].result.decimals,medianMeasuredReductionMinor:values.length%2?values[Math.floor(values.length/2)]:(values[values.length/2-1]+values[values.length/2])/2,sourceRecordIds:rows.flatMap(r=>r.result.sourceRecordIds),decisionIds:rows.map(r=>r.decision.id),classification:'CALCULATION',limitation:'Descriptive observed outcomes only. Small samples and owner-reviewed confounders do not establish causality or generalize to other businesses.'};});
 return {message:patterns.length?'Descriptive patterns from recorded, revalidated outcomes.':INSUFFICIENT,minimumSamplePolicy:3,patterns,limitations:['At least three revalidated outcomes for the same documented intervention and currency are required.','No intervention success rates, counterfactual impact or cross-business knowledge are manufactured.']};
}
