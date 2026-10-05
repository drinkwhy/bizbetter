export interface IDataConnector {
  provider: string;
  name: string;
  category: 'ACCOUNTING' | 'PAYMENTS' | 'CRM' | 'PAYROLL' | 'MARKETING';
  isConnected: boolean;
  syncFrequency: string;
  lastSyncAt: Date | null;
  sync(): Promise<{ recordsImported: number; status: 'SUCCESS' | 'ERROR'; message: string }>;
}

export interface StandardizedTransaction {
  date: Date;
  category: 
    | 'REVENUE'
    | 'LABOR'
    | 'MATERIALS'
    | 'MARKETING'
    | 'VEHICLES'
    | 'EQUIPMENT'
    | 'SUBSCRIPTIONS'
    | 'INSURANCE'
    | 'RENT'
    | 'UTILITIES'
    | 'SOFTWARE'
    | 'REFUNDS'
    | 'DISCOUNTS'
    | 'OVERHEAD'
    | 'OTHER';
  amount: number;
  description: string;
  vendorOrCustomer?: string;
  referenceId?: string;
}

export class QuickBooksOnlineConnector implements IDataConnector {
  provider = 'QUICKBOOKS';
  name = 'QuickBooks Online';
  category = 'ACCOUNTING' as const;
  isConnected = false;
  syncFrequency = 'Nightly (2:00 AM EST)';
  lastSyncAt: Date | null = null;

  async sync(): Promise<{ recordsImported: number; status: 'SUCCESS' | 'ERROR'; message: string }> {
    // Pipeline: 
    // 1. Authenticate with OAuth 2.0 Token (stored in environment / vault)
    // 2. Fetch Chart of Accounts, P&L Report, Vendor Invoices, Class tracking
    // 3. Map QBO Expense Categories to BizBetter Standard Categories (e.g. "Cost of Labor - Field" -> LABOR)
    // 4. Upsert FinancialPeriod and transaction records
    return { recordsImported: 0, status: 'ERROR', message: 'Legacy demonstration connector disabled. Use the verified integration route.' };
  }
}

export class StripeConnector implements IDataConnector {
  provider = 'STRIPE';
  name = 'Stripe Payments';
  category = 'PAYMENTS' as const;
  isConnected = false;
  syncFrequency = 'Real-time (Webhooks)';
  lastSyncAt: Date | null = null;

  async sync(): Promise<{ recordsImported: number; status: 'SUCCESS' | 'ERROR'; message: string }> {
    return { recordsImported: 0, status: 'ERROR', message: 'Legacy demonstration connector disabled. Use the verified integration route.' };
  }
}

export class ServiceTitanConnector implements IDataConnector {
  provider = 'SERVICETITAN';
  name = 'ServiceTitan Field Management';
  category = 'CRM' as const;
  isConnected = false;
  syncFrequency = 'Hourly';
  lastSyncAt: Date | null = null;

  async sync(): Promise<{ recordsImported: number; status: 'SUCCESS' | 'ERROR'; message: string }> {
    return { recordsImported: 0, status: 'ERROR', message: 'Legacy demonstration connector disabled. Use the verified integration route.' };
  }
}

export class GustoPayrollConnector implements IDataConnector {
  provider = 'GUSTO';
  name = 'Gusto Payroll';
  category = 'PAYROLL' as const;
  isConnected = false;
  syncFrequency = 'Bi-weekly';
  lastSyncAt: Date | null = null;

  async sync(): Promise<{ recordsImported: number; status: 'SUCCESS' | 'ERROR'; message: string }> {
    return { recordsImported: 0, status: 'ERROR', message: 'Legacy demonstration connector disabled. Use the verified integration route.' };
  }
}

export class GoogleAdsConnector implements IDataConnector {
  provider = 'GOOGLE_ADS';
  name = 'Google Ads & Local Services';
  category = 'MARKETING' as const;
  isConnected = false;
  syncFrequency = 'Daily';
  lastSyncAt: Date | null = null;

  async sync(): Promise<{ recordsImported: number; status: 'SUCCESS' | 'ERROR'; message: string }> {
    return { recordsImported: 0, status: 'ERROR', message: 'Legacy demonstration connector disabled. Use the verified integration route.' };
  }
}
