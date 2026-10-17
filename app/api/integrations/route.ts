import { hostAllowed, originAllowed, requestHost } from '@/lib/evidence/access';
import { NextRequest, NextResponse } from 'next/server';
import { integrationState, syncProvider } from '@/lib/integrations/service';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(req:NextRequest){if(!hostAllowed(requestHost(req)))return NextResponse.json({error:'Local workspace access only.'},{status:403});return NextResponse.json({integrations:await integrationState()},{headers:{'Cache-Control':'no-store'}});}
export async function POST(req:NextRequest){
 if(!hostAllowed(requestHost(req)))return NextResponse.json({error:'Local workspace access only. Configure authentication before hosting integrations.'},{status:403});
 const origin=req.headers.get('origin');if(origin&&!originAllowed(req))return NextResponse.json({error:'Invalid request origin.'},{status:403});
 try {const {id}=await req.json();if(typeof id!=='string')return NextResponse.json({error:'Provider ID required.'},{status:400});const snapshot=await syncProvider(id);return NextResponse.json({success:true,syncedAt:snapshot.syncedAt,records:snapshot.records});}
 catch(error){return NextResponse.json({success:false,error:error instanceof Error?error.message:'Sync failed.'},{status:400});}
}
