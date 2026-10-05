import { NextRequest, NextResponse } from 'next/server';
import { CSVDataImporter } from '@/lib/engines/csv-importer';

export async function POST(req: NextRequest) {
  try {
    const { csvContent } = await req.json();
    if (!csvContent) {
      return NextResponse.json({ error: 'csvContent is required' }, { status: 400 });
    }

    const result = CSVDataImporter.parseTransactionsCSV(csvContent);
    return NextResponse.json({ success: result.success, result },{status:result.success?200:400});
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET() { return NextResponse.json({success:false,error:'Demo samples are isolated at /demo.'},{status:410}); }
