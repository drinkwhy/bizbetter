import { SourceRecord } from './model';
export function parseEvidenceCSV(content:string):Partial<SourceRecord>[] {
 const lines=content.trim().split(/\r?\n/);if(lines.length<2||lines.length>10001)throw new Error('Provide a header and at most 10,000 records.');
 const required=['SourceRecordId','Metric','ValueMinor','Currency','Decimals','Basis','PeriodStart','PeriodEnd','Complete','EntityId'];
 const headers=lines[0].split(',').map(s=>s.trim());if(required.some((s,i)=>headers[i]!==s)||headers.length!==required.length)throw new Error('CSV headers must match the documented normalized record format.');
 return lines.slice(1).map((line,i)=>{if(line.includes('"'))throw new Error('Row '+(i+2)+': quoted CSV fields need an export adapter.');const c=line.split(',').map(s=>s.trim());if(c.length!==required.length||c[2]===''||c[4]===''||!['true','false'].includes(c[8]))throw new Error('Row '+(i+2)+': incomplete values or invalid completeness flag.');return {sourceRecordId:c[0],metric:c[1] as SourceRecord['metric'],value:Number(c[2]),currency:c[3],decimals:Number(c[4]),basis:c[5],periodStart:c[6],periodEnd:c[7],complete:c[8]==='true',entityId:c[9]||undefined};});
}
