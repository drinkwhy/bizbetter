import { NextRequest,NextResponse } from 'next/server';
import { getConnection } from '@/lib/integrations/qbo/oauth';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(req:NextRequest){if(!['127.0.0.1','localhost','::1'].includes(req.nextUrl.hostname))return NextResponse.json({error:'Local workspace access only.'},{status:403});const c=await getConnection();return NextResponse.json({connection:c?{companyName:c.companyName,environment:c.environment,status:c.status,connectedAt:c.connectedAt,lastSuccessfulSyncAt:c.lastSuccessfulSyncAt,lastSyncStatus:c.lastSyncStatus,lastRecordsCreated:c.lastRecordsCreated,lastSyncErrorCode:c.lastSyncErrorCode}:null},{headers:{'Cache-Control':'no-store'}});}
