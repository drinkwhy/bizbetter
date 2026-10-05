import { NextRequest,NextResponse } from 'next/server';
import { consumeAuthorizationState,exchangeCode,callbackCookieOptions } from '@/lib/integrations/qbo/oauth';
import { qboConfig } from '@/lib/integrations/qbo/config';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(req:NextRequest){
 const code=req.nextUrl.searchParams.get('code')||'',state=req.nextUrl.searchParams.get('state')||'',realm=req.nextUrl.searchParams.get('realmId')||'';const error=req.nextUrl.searchParams.get('error');
 const response=NextResponse.redirect(new URL('/integrations',req.url));
 try{qboConfig();const saved=await consumeAuthorizationState(state,req.cookies.get('bizbetter_qbo_oauth_state')?.value||'');if(error)throw new Error('QuickBooks authorization was declined or failed.');await exchangeCode(code,realm,saved.environment as 'sandbox'|'production');response.cookies.set('bizbetter_notice','QuickBooks is connected. Financial sync is not implemented yet; use reviewed uploads to provide evidence for analysis.',{httpOnly:false,sameSite:'lax',secure:req.nextUrl.protocol==='https:',path:'/',maxAge:60});}catch(e){response.cookies.set('bizbetter_notice',e instanceof Error?e.message:'QuickBooks connection failed.',{httpOnly:false,sameSite:'lax',secure:req.nextUrl.protocol==='https:',path:'/',maxAge:60});}
 response.cookies.set('bizbetter_qbo_oauth_state','',{...callbackCookieOptions('http://127.0.0.1'),path:'/api/integrations/qbo/callback',maxAge:0,secure:req.nextUrl.protocol==='https:'});
 return response;
}
