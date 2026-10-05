import { StandardizedTransaction } from './connectors';
export interface CSVParseResult { success:boolean; transactions:StandardizedTransaction[]; errors:string[]; warnings:string[]; totalRevenue:number|null;totalExpenses:number|null; }
export class CSVDataImporter {
 static parseTransactionsCSV(content:string):CSVParseResult {
  const errors:string[]=[],warnings:string[]=[],transactions:StandardizedTransaction[]=[];
  const lines=content.trim().split(/\r?\n/);if(lines.length<2)return {success:false,transactions,errors:['A header and records are required.'],warnings,totalRevenue:null,totalExpenses:null};
  if(lines.length>10001)errors.push('At most 10,000 CSV records are supported.');
  const expected=['date','category','description','amount'];const header=lines[0].toLowerCase().split(',').map(s=>s.trim());if(expected.some((v,i)=>header[i]!==v))errors.push('Required columns: Date, Category, Description, Amount.');
  for(let i=1;i<Math.min(lines.length,10001);i++){const cells=lines[i].split(',').map(s=>s.trim());if(cells.length!==4||lines[i].includes('"')){errors.push('Row '+(i+1)+': quoted or extra columns require a proper export adapter.');continue;}const [date,category,description,raw]=cells;
   if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date){errors.push('Row '+(i+1)+': invalid or missing date.');continue;}
   if(!description||!category||raw===''||!Number.isFinite(Number(raw))){errors.push('Row '+(i+1)+': missing description/category/amount.');continue;}
   const allowed=['REVENUE','LABOR','MATERIALS','MARKETING','VEHICLES','EQUIPMENT','SUBSCRIPTIONS','INSURANCE','RENT','UTILITIES','SOFTWARE','REFUNDS','DISCOUNTS','OVERHEAD','OTHER'];if(!allowed.includes(category.toUpperCase())){errors.push('Row '+(i+1)+': unmapped category; no category is guessed.');continue;}
   transactions.push({date:new Date(date),category:category.toUpperCase() as StandardizedTransaction['category'],amount:Number(raw),description});
  }
  warnings.push('Preview only: no currency, reporting basis or source IDs supplied; these rows cannot create production findings.');
  return {success:errors.length===0,transactions,errors,warnings,totalRevenue:null,totalExpenses:null};
 }
}
