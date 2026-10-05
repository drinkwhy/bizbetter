export const ENGINE_VERSION='evidence-1.0.0';
export const INSUFFICIENT='Insufficient data to determine this reliably.';
export type Metric='revenue'|'net_profit'|'fees'|'payment_net'|'job_revenue'|'job_labor'|'job_materials'|'invoice_paid'|'invoice_contract'|'labor_cost'|'jobs'|'hours'|'marketing_cost'|'customers'|'expenses'|'vendor_spend'|'gross_profit'|'cogs'|'receivable'|'payroll_cost'|'overtime_hours';
export type DatasetType='profit_and_loss'|'balance_sheet'|'general_ledger'|'transactions'|'invoices'|'payments'|'bills'|'expenses'|'customers'|'vendors'|'jobs'|'technicians'|'payroll'|'time_entries'|'estimates'|'callbacks'|'materials'|'inventory'|'marketing'|'lead_sources'|'advertising'|'generic';
export interface NormalizedBusinessRecord {id:string;businessId:string;importId:string;datasetType:DatasetType;sourceSystem:string;sourceProvider?:string;sourceFile:string;sourceSheet?:string;sourceRow:number;originalRecordIdentifier?:string;originalValues:Record<string,string|number|boolean|null>;normalizedValues:Record<string,string|number|boolean|null>;mappingVersion:string;sourceComplete:boolean;importedAt:string;quality:'ACCEPTED'|'POSSIBLE_DUPLICATE'|'INVALID';duplicateOf?:string;relationshipConfidence?:Record<string,number>;}
export interface MappingReceipt {sourceColumn:string;targetField:string;confidence:number;reason:string;confirmed:boolean;}
export interface IntakeImport {id:string;businessId:string;fileName:string;fileType:'csv'|'xlsx'|'manual';datasetType:DatasetType;sourceSystem:string;status:'COMMITTED'|'REJECTED';rowCount:number;acceptedCount:number;duplicateCount:number;invalidCount:number;sourceDigest:string;mappingVersion:string;mappings:MappingReceipt[];createdAt:string;warnings:string[];}
export interface BusinessWorkspace {id:string;name:string;industry?:string;createdAt:string;}
export interface SourceRecord {
 id:string; businessId:string; environment:'REAL'|'DEMO'; sourceSystem:string; sourceRecordId:string; syncId:string;
 periodStart:string; periodEnd:string; importedAt:string; sourcePayload?:unknown; sourceDigest?:string; metric:Metric; value:number; currency:string; decimals:number;
 basis:string; entityId?:string; complete:boolean; supersedesId?:string; verification:'PROVIDER'|'OWNER_ENTERED'; importId?:string; normalizedRecordId?:string; sourceFile?:string; sourceSheet?:string; sourceRow?:number; originalRecordIdentifier?:string;
}
export type Classification='FACT'|'CALCULATION'|'ESTIMATE'|'HYPOTHESIS'|'FORECAST'|'BENCHMARK'|'REALIZED RESULT';
export interface Finding {
 id:string; businessId:string; title:string; classification:Classification; impactMinor:number|null; currency:string; decimals:number;
 periodStart:string; periodEnd:string; sourceRecordIds:string[]; syncIds:string[]; sourceSystems:string[]; inputs:Record<string,number>;
 formula:string; assumptions:string[]; confounders:string[]; contradictions:string[]; method:string; engineVersion:string;
 createdAt:string; confidence:{level:'HIGH'|'MEDIUM'|'LOW';criteria:Record<string,boolean>;explanation:string[]};
 completeness:string; recovery:string[]; prevention:string[]; measurementPlan:string; opportunity:boolean;
}
export interface Benchmark {source:string;publishedAt:string;industry:string;companySize:string;geography:string;metricDefinition:string;value:number;}
export interface Decision {id:string;findingId:string;businessId:string;decision:'ACCEPTED'|'MODIFIED'|'REJECTED';notes:string;createdAt:string;evidenceSnapshot?:Finding;implementationDate?:string;owner:string;baselineIds:string[];afterIds:string[];confounderReview?:Record<string,string>;}
export interface LedgerItem {id:string;findingId:string;businessId:string;state:'POTENTIAL'|'VALIDATED'|'IMPLEMENTED'|'REALIZED';findingSnapshot?:Finding;validatedAt?:string;validatedBy?:string; validationNotes?:string;decisionId?:string;result?:Finding;}
export interface EvidenceDatabase {version:1;businessId:string;records:SourceRecord[];decisions:Decision[];ledger:LedgerItem[];audit:Array<{id:string;at:string;action:string;objectId:string;previousHash:string;hash:string}>;businesses?:BusinessWorkspace[];imports?:IntakeImport[];normalizedRecords?:NormalizedBusinessRecord[];}
