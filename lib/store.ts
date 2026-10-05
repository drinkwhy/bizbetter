export interface BusinessDataState {
  id: string;
  name: string;
  industry: string;
  employeeCount: number;
  approxAnnualRevenue: number;
  location: string;
  primaryServices: string;
  avgJobValue: number;
  jobsPerMonth: number;
  notes?: string;
  hasConnectedRecords: boolean;
}

export const CLEAN_BUSINESS_STATE: BusinessDataState = {
  id: 'biz_active',
  name: 'My Service Business',
  industry: 'HVAC',
  employeeCount: 0,
  approxAnnualRevenue: 0,
  location: '',
  primaryServices: '',
  avgJobValue: 0,
  jobsPerMonth: 0,
  notes: '',
  hasConnectedRecords: false
};

class BizBetterStore {
 private business={...CLEAN_BUSINESS_STATE};
 getBusiness(){return {...this.business};}
 updateBusiness(data:Partial<BusinessDataState>){
  const allowed=['name','industry','employeeCount','approxAnnualRevenue','location','primaryServices','avgJobValue','jobsPerMonth','notes'] as const;
  for(const key of allowed){const value=data[key];if(value!==undefined){if(typeof value==='number'&&(!Number.isFinite(value)||value<0))throw new Error('Invalid owner-entered profile value.');(this.business as any)[key]=value;}}
  return this.getBusiness();
 }
 getFinancials(){return null;}
 getMonthlyTrends(){return [];}
 getProfitLeaks(){return [];}
 getOpportunities(){return [];}
 getRecommendations(){return [];}
 getDecisionRecords(){return [];}
 getHealthScores(){return [];}
 getIntegrations(){return [];}
 getMoneyFoundLedger(){throw new Error('Use the evidence-backed ledger API.');}
 updateMoneyFoundStatus(..._args:unknown[]){throw new Error('Evidence-backed stage transitions are required.');}
 recordDecision(..._args:unknown[]){throw new Error('Use the durable evidence-backed decision API.');}
 triggerIntegrationSync(..._args:unknown[]){throw new Error('Simulated synchronization is disabled.');}
 ingestRealFinancials(..._args:unknown[]){throw new Error('Source provenance is required. Import normalized source records instead.');}
 resetToCleanState(){this.business={...CLEAN_BUSINESS_STATE};}
 loadDemoSandbox(){throw new Error('Demo data is isolated at /demo and cannot mutate the real workspace.');}
}
const globalForBiz=globalThis as unknown as {bizBetterEvidenceProfile?:BizBetterStore};
export const store=globalForBiz.bizBetterEvidenceProfile??new BizBetterStore();
globalForBiz.bizBetterEvidenceProfile=store;
