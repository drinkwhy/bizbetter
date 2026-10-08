import fs from 'node:fs/promises';
const out=process.argv[2];
if(!out)throw new Error('Pass a destination directory for the synthetic CSV exports.');
await fs.mkdir(out,{recursive:true});
const fin=[],svc=[],pay=[],ads=[];
const staff=['Alex Morgan','Jordan Reed','Casey Bennett','Taylor Brooks'];
const people=['Jamie Miller','Patricia Nelson','Morgan Davis','Chris Anderson','Dana Larson','Riley Thompson','Robin Johnson','Sam Peterson','Lee Wilson','Avery Olson','Cameron Brown','Jess Martin'];
const vendors=['North Central HVAC Supply','Prairie Equipment Rental','Lakeview Fuel Depot','Clearwater Commercial Insurance','DispatchWorks Software','Northside Parts Warehouse'];
const tasks=[['Furnace diagnostic and ignition repair',425,82,2],['Central air tune-up',245,26,1.5],['Blower motor replacement',1125,420,18],['Heat pump installation',7650,4100,14],['Thermostat installation',375,110,2],['Duct leak repair',865,180,5],['Air conditioner capacitor replacement',385,68,2],['Furnace replacement',6400,3200,12],['Indoor coil replacement',2875,1050,48],['Condensate drain service',295,32,2],['Zone damper replacement',965,315,4],['Annual maintenance agreement visit',185,12,1.5]];
const sources=['Google Ads','Facebook Ads','Local referral'];
const date=(m,d)=>`2026-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
const plusDays=(s,n)=>new Date(Date.parse(s+'T00:00:00Z')+n*86400000).toISOString().slice(0,10);
let revenue=0,paidTotal=0,jobCost=0,jobMaterials=0,callbackCount=0;
for(let m=2;m<=9;m++){
 for(let j=0;j<12;j++){
  const n=(m-2)*12+j+1,id=`WO-${18000+n}`,inv=`INV-${4200+n}`,customer=`${people[(j+m)%12]} (C-${1000+n})`,tech=staff[j%4];
  const dt=date(m,2+j*2),[desc,base,mat,hrs]=tasks[j];
  const price=base+((m+j)%3)*25+.5,loadedLabor=hrs*44.5,source=sources[j%3];
  const due=plusDays(dt,30),paid=m===9&&j%4===0?0:m===9&&j%4===1?price*.5:price;
  const paymentDate=paid===0?'':[plusDays(dt,7+j%10),'2026-09-30'].sort()[0],status=paid===0?'Open':paid<price?'Partial':'Paid';
  revenue+=price;paidTotal+=paid;jobCost+=loadedLabor;jobMaterials+=mat;
  fin.push([dt,'Invoice',inv,id,customer,'', 'Service Income',desc,price,'',due,paid,paymentDate,status,'USD']);
  fin.push([dt,'Bill',`BILL-${7800+n}`,id,'',vendors[j%6],'Direct Materials',`Parts for ${id} - ${desc}`,'',mat,'','','','','USD']);
  svc.push([dt,id,'Completed',customer,tech,tech,desc,source,price,loadedLabor,mat,hrs,0,'No','','', 'USD']);
  if(j===2||j===8){
   const cbd=plusDays(dt,5),cbid=`CB-${500+n}`;callbackCount++;
   svc.push([cbd,id,'Callback completed',customer,tech,tech,j===2?'Warranty follow-up - blower vibration':'Warranty follow-up - refrigerant leak check',source,'',89,j===2?0:35,2,0,'Yes',id,cbid,'USD']);
  }
  const spend=source==='Local referral'?12.5:source==='Google Ads'?85+(m-2)*2.5:65+(m-2)*2.5;
  ads.push([dt,`ATTR-${900+n}`,id,customer,source,source==='Local referral'?'Customer referral program':source==='Google Ads'?'St Cloud HVAC Search':'Central MN Service Calls',spend,price,1,1,'invoice revenue','USD']);
 }
 // Twice-monthly payroll for four technicians. Job time is a subset of total paid time.
 for(const day of [15,28])for(let e=0;e<4;e++){
  const regular=80,ot=((m+e+day)%4)*2,rate=28+e*2,gross=regular*rate+ot*rate*1.5,taxes=gross*.062+gross*.0145;
  const employer=Math.round((taxes+210)*100)/100;
  pay.push([date(m,day),`PR-${m}${day}-${e+1}`,staff[e],regular,ot,rate,gross,employer,Math.round((gross+employer)*100)/100,'USD']);
 }
 for(let v=0;v<6;v++){
  const amt=[625,385.5,740.25,865,249.5,510][v]+(m-2)*12.5;
  fin.push([date(m,27),'Expense',`EXP-${m}${v}-2026`,'','',vendors[v],['Shop Supplies','Equipment Rental','Vehicle Fuel','Insurance','Software','Shop Supplies'][v],['Shop consumables','Lift rental - service calls','Fleet fuel','Commercial coverage','Monthly dispatch subscription','Stock replenishment'][v],'',amt,'','','','','USD']);
 }
}
// Posted payroll and campaign expenses, plus clearly identified monthly P&L results.
for(let m=2;m<=9;m++){
 const prefix=date(m,1).slice(0,7), monthPay=pay.filter(r=>r[0].startsWith(prefix)).reduce((n,r)=>n+r[8],0),monthAds=ads.filter(r=>r[0].startsWith(prefix)).reduce((n,r)=>n+r[6],0);
 fin.push([date(m,28),'Expense',`PAYROLL-${m}-2026`,'','','Payroll clearing','Payroll expense','Gross wages and actual employer cost','',monthPay,'','','','','USD']);
 fin.push([date(m,28),'Expense',`ADS-${m}-2026`,'','','Campaign billing','Advertising','Paid campaigns and referral rewards','',monthAds,'','','','','USD']);
}
// Deliberate posted supplier credit, with its original negative sign.
fin.push([date(9,29),'Vendor Credit','VC-0929','','',vendors[0],'Direct Materials','Returned unused thermostat - supplier credit','',-110,'','','','','USD']);
let totalNetLoss=0;
for(let m=2;m<=9;m++){
 const prefix=date(m,1).slice(0,7),monthRows=fin.filter(r=>r[0].startsWith(prefix));
 const sales=monthRows.reduce((n,r)=>n+(r[8]||0),0),expenses=monthRows.reduce((n,r)=>n+(r[9]||0),0),net=Math.round((sales-expenses)*100)/100;
 const last=new Date(Date.UTC(2026,m,0)).getUTCDate();
 totalNetLoss-=net;
 fin.push([date(m,last),'Monthly P&L summary',`PNL-${m}-2026`,'','','','','Monthly accounting net result (summary metric only)','','','','','','','USD',net]);
}
const files=[
 ['QuickBooks_Transactions_Feb-Sep_2026.csv',['Transaction date','Transaction type','Invoice number','Job ID','Customer','Vendor','Category','Description','Revenue','Expense','Due date','Amount paid','Payment date','Payment status','Currency','Net profit'],fin],
 ['Service_Completed_Jobs_Feb-Sep_2026.csv',['Completed date','Job ID','Status','Customer','Technician','Employee','Description','Marketing source','Revenue','Labor cost','Material cost','Labor hours','Overtime hours','Callback indicator','Original job ID','Callback ID','Currency'],svc],
 ['Payroll_Detail_Feb-Sep_2026.csv',['Date','Payroll reference','Employee','Regular hours','Overtime hours','Hourly rate','Gross wages','Employer cost','Labor cost','Currency'],pay],
 ['Marketing_Attribution_Feb-Sep_2026.csv',['Date','Attribution ID','Job ID','Customer','Marketing source','Campaign','Marketing spend','Revenue','Leads','Booked jobs','Revenue basis','Currency'],ads],
];
const escape=(v)=>{const s=String(typeof v==='number'?Math.round(v*100)/100:v??'');return /[",\r\n]/.test(s)?'"'+s.replaceAll('"','""')+'"':s;};
for(const [name,headers,rows] of files)await fs.writeFile(`${out}/${name}`,[headers,...rows].map(r=>r.map(escape).join(',')).join('\r\n')+'\r\n');
const money=v=>v.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
await fs.writeFile(`${out}/IMPORT-INSTRUCTIONS.txt`,`REALISTIC CONTRACTOR EXPORT TEST PACK\n\nAll people, suppliers, transactions, and amounts are fictional. THIS IS A LOSS-SCENARIO TEST FIXTURE. Create a separate business named Synthetic Loss Test. These are realistic custom export fixtures, not files downloaded from a real QuickBooks account.\nPeriod: February 1 through September 30, 2026. Dates use YYYY-MM-DD. Monetary fields are USD dollars, not cents.\n\nUPLOAD\nUnzip this pack. Select the four CSV files together, then click Stage selected files. Do not upload this text file or the ZIP itself.\nUse a separate test business workspace. Review each sheet's field mapping, select USD, use accrual as the revenue basis, and confirm the synthetic export is complete before committing.\n\nSuggested dataset classifications:\nQuickBooks_Transactions: transactions (includes invoices and vendor expenses)\nService_Completed_Jobs: jobs\nPayroll_Detail: payroll\nMarketing_Attribution: marketing\nThe current automatic classifier may infer invoices/customers instead. Review classifications and mappings. Exact financial headers map automatically. Payroll reference, attribution ID, status, and other descriptive fields may remain unmapped.\n\nCOMPLETENESS AND EXPECTED FINDINGS\nThe fixtures contain the entire modeled eight-month source period. On the review screen, explicitly check that the export is complete for each file. A file cannot silently make that owner confirmation for you. Existing partial imports in your test workspace should be rejected first, or use a new test workspace.\nExpect 16 negative direct-job contribution findings and 8 monthly accounting-loss findings. These overlap in economic scope; never add them as separate recoverable savings. There is no realized recovery in this fixture.\nThe updated importer accepts labor and overtime hours. Advanced analyses without implemented engines may remain partially available.\n\nWHAT THE EXPORTS REPRESENT\nQuickBooks: 96 invoices, 96 direct-material bills, 48 operating expenses, 16 payroll/advertising postings, one supplier credit, and 8 monthly P&L summary rows. P&L summaries are not additional revenue or expenses. Map Net profit to net_profit and confirm classification as transactions. Open/part-paid September invoices have due dates and payment amounts. Amount paid is a to-date invoice attribute, not a second revenue transaction.\nService logs: 96 completed jobs plus ${callbackCount} warranty callback visits. Callback rows link to the original job, carry actual rework costs, and intentionally have blank revenue because no new customer charge was made. Original job revenue is not copied onto callbacks. Two underquoted repair jobs per month have actual labor and materials exceeding the invoice amount.\nPayroll: 64 twice-monthly employee records. Gross wages and employer cost include total paid time, so they need not equal job-attributed labor.\nMarketing: 96 source-attributed jobs. Spend is allocated per job once. It is a marketing attribution export; that revenue is the SAME revenue as the matching invoice/job.\nAll job and customer keys match explicitly. Invoices preserve stable invoice IDs.\n\nAVOID DOUBLE COUNTING\nDo not add revenue across invoice, service, and marketing exports. They describe the same 96 jobs from three source views. Do not add service labor allocations to payroll as if they are extra wage expense. The fixture tests whether the app keeps source views and joins separate.\n\nCONTROL TOTALS\nUnique jobs: 96\nInvoices: 96\nRevenue in each of the invoice, original-job, and marketing views: USD ${money(revenue)}\nOriginal-job labor cost: USD ${money(jobCost)}\nOriginal-job material cost: USD ${money(jobMaterials)}\nInvoice payments to date: USD ${money(paidTotal)}\nOutstanding invoice balance: USD ${money(revenue-paidTotal)}\nCallbacks: ${callbackCount} (with zero added revenue)\n\nMonthly net accounting loss summed across eight months: USD ${money(totalNetLoss)}\n\nLimits: each file is well below 8 MB, 10,000 rows, and 128 columns. CSV only: no formulas, macros, external links, or embedded content.\n`);
console.log(JSON.stringify({files:files.map(([name,h,r])=>({name,rows:r.length,columns:h.length})),revenue,paidTotal,jobCost,jobMaterials,callbackCount}));
