import { NextRequest,NextResponse } from 'next/server';
import { disconnectQuickBooks } from '@/lib/integrations/qbo/oauth';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(req:NextRequest){if(!['127.0.0.1','localhost','::1'].includes(req.nextUrl.hostname))return NextResponse.json({error:'Local workspace access only.'},{status:403});const origin=req.headers.get('origin');if(origin&&origin!=='http://'+req.headers.get('host'))return NextResponse.json({error:'Invalid request origin.'},{status:403});try{return NextResponse.json({success:true,...await disconnectQuickBooks()},{headers:{'Cache-Control':'no-store'}});}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Disconnect failed.'},{status:400});}}
