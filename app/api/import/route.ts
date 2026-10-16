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
    // Malformed request bodies are client errors, not server failures.
    const bad = error instanceof SyntaxError;
    return NextResponse.json({ success: false, error: bad ? 'Request body must be JSON with csvContent.' : error.message }, { status: bad ? 400 : 500 });
  }
}

export async function GET() { return NextResponse.json({success:false,error:'Demo samples are isolated at /demo.'},{status:410}); }
