// ISOLATED DEMO CSV / TEST FIXTURES
import { StandardizedTransaction } from '../../engines/connectors';

export interface CSVParseResult {
  success: boolean;
  totalRows: number;
  validRows: number;
  errorRows: number;
  transactions: StandardizedTransaction[];
  categoryTotals: Record<string, number>;
  totalRevenue: number;
  totalExpenses: number;
  errors: string[];
}

export class CSVDataImporter {
  public static parseTransactionsCSV(csvContent: string): CSVParseResult {
    const lines = csvContent.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) {
      return {
        success: false,
        totalRows: 0,
        validRows: 0,
        errorRows: 0,
        transactions: [],
        categoryTotals: {},
        totalRevenue: 0,
        totalExpenses: 0,
        errors: ['CSV file is empty or missing data rows.']
      };
    }

    const header = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
    const transactions: StandardizedTransaction[] = [];
    const categoryTotals: Record<string, number> = {};
    const errors: string[] = [];
    let totalRevenue = 0;
    let totalExpenses = 0;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Handle simple CSV splitting (handles basic commas)
      const values = line.split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
      
      const dateVal = values[0] ? new Date(values[0]) : new Date();
      const rawCategory = (values[1] || 'OTHER').toUpperCase().trim();
      const desc = values[2] || 'Uncategorized transaction';
      const amount = parseFloat(values[3]?.replace(/[$,]/g, '') || '0');

      if (isNaN(amount)) {
        errors.push(`Row ${i + 1}: Invalid numeric amount "${values[3]}"`);
        continue;
      }

      // Map raw category to BizBetter standard categories
      let category: StandardizedTransaction['category'] = 'OTHER';
      if (rawCategory.includes('REV') || rawCategory.includes('INCOME') || rawCategory.includes('SALES')) {
        category = 'REVENUE';
        totalRevenue += amount;
      } else if (rawCategory.includes('LABOR') || rawCategory.includes('PAYROLL') || rawCategory.includes('WAGE')) {
        category = 'LABOR';
        totalExpenses += amount;
      } else if (rawCategory.includes('MAT') || rawCategory.includes('PARTS') || rawCategory.includes('SUPPLY')) {
        category = 'MATERIALS';
        totalExpenses += amount;
      } else if (rawCategory.includes('ADV') || rawCategory.includes('MARKET') || rawCategory.includes('ADS')) {
        category = 'MARKETING';
        totalExpenses += amount;
      } else if (rawCategory.includes('VEHICLE') || rawCategory.includes('TRUCK') || rawCategory.includes('FUEL')) {
        category = 'VEHICLES';
        totalExpenses += amount;
      } else if (rawCategory.includes('SOFT') || rawCategory.includes('SUB') || rawCategory.includes('SAAS')) {
        category = 'SOFTWARE';
        totalExpenses += amount;
      } else if (rawCategory.includes('INSUR')) {
        category = 'INSURANCE';
        totalExpenses += amount;
      } else if (rawCategory.includes('RENT')) {
        category = 'RENT';
        totalExpenses += amount;
      } else if (rawCategory.includes('DISCOUNT')) {
        category = 'DISCOUNTS';
      } else if (rawCategory.includes('REFUND')) {
        category = 'REFUNDS';
      } else {
        category = 'OVERHEAD';
        totalExpenses += amount;
      }

      categoryTotals[category] = (categoryTotals[category] || 0) + amount;

      transactions.push({
        date: isNaN(dateVal.getTime()) ? new Date() : dateVal,
        category,
        amount,
        description: desc,
        vendorOrCustomer: values[4] || undefined,
        referenceId: values[5] || undefined
      });
    }

    return {
      success: errors.length === 0 || transactions.length > 0,
      totalRows: lines.length - 1,
      validRows: transactions.length,
      errorRows: errors.length,
      transactions,
      categoryTotals,
      totalRevenue,
      totalExpenses,
      errors
    };
  }

  public static getSampleHVACCSV(): string {
    return `Date,Category,Description,Amount,VendorOrCustomer,Reference
2024-09-02,REVENUE,Carrier 16 SEER AC Install & Duct Seal,8450.00,Miller Residence,INV-10941
2024-09-02,MATERIALS,Carrier 3-Ton Heat Pump & Line Set,3820.00,Carrier Wholesale Supply,PO-8821
2024-09-02,LABOR,Field Tech Hours (2 Techs - 6.5 hrs),715.00,Direct Field Payroll,PR-0902
2024-09-03,REVENUE,Furnace Diagnostic & Blower Motor Replacement,680.00,Thompson Family,INV-10942
2024-09-03,MATERIALS,OEM ECM Blower Motor 1/2 HP,210.00,Johnstone Supply,PO-8824
2024-09-03,LABOR,Diagnostic & Repair Labor (1.8 hrs),108.00,Direct Field Payroll,PR-0903
2024-09-04,MARKETING,Google Ads Broad HVAC Campaign,1800.00,Google Ads,CC-9901
2024-09-04,MARKETING,Google Guaranteed Local Services Ads,650.00,Google LLC,CC-9902
2024-09-05,SOFTWARE,FleetPro Legacy GPS Tracking (Unused),450.00,FleetPro Inc,SUB-4410
2024-09-05,SOFTWARE,ReviewBoost Automated SMS (Unused),200.00,ReviewBoost LLC,SUB-4411
2024-09-06,VEHICLES,Fleet Van Fuel & Routine Maintenance,840.00,Shell Fleet / Firestone,FLEET-09
2024-09-07,LABOR,Friday Emergency Overtime Payroll,1420.00,Direct Field Payroll,PR-OT-0907
2024-09-08,OVERHEAD,Shop Facility Rent & Utilities,2200.00,Industrial Park Properties,RENT-SEP`;
  }
}
