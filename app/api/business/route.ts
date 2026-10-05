import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';

export async function GET() {
  try {
    const business = store.getBusiness();
    const financials = store.getFinancials();
    return NextResponse.json({ success: true, business, financials, source: 'Owner-entered session profile; financial evidence is served separately' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const updated = store.updateBusiness(body);
    return NextResponse.json({ success: true, business: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
