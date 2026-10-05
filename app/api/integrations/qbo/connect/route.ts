import { NextRequest,NextResponse } from 'next/server';
import { createAuthorization,callbackCookieOptions } from '@/lib/integrations/qbo/oauth';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(req:NextRequest){
 if(!['127.0.0.1','localhost','::1'].includes(req.nextUrl.hostname))return NextResponse.json({error:'Local workspace access only.'},{status:403});
 try{const {url,state}=await createAuthorization();const cfg=new URL(process.env.BIZBETTER_QBO_REDIRECT_URI!);const response=NextResponse.redirect(url);response.cookies.set('bizbetter_qbo_oauth_state',state,{...callbackCookieOptions(cfg.toString()),path:'/api/integrations/qbo/callback'});return response;}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Unable to start authorization.'},{status:400});}
}
