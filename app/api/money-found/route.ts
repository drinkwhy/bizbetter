import { NextRequest, NextResponse } from 'next/server';
import { assertLocal } from '@/lib/evidence/access';
import { workspace, changeStage } from '@/lib/evidence/repository';
export const dynamic='force-dynamic';
const bid=(req:NextRequest)=>req.nextUrl.searchParams.get('businessId')||undefined;
export async function GET(req:NextRequest){try{assertLocal(req);}catch{return NextResponse.json({error:'Local access required.'},{status:403});}try{const w=await workspace(bid(req));return NextResponse.json({ledger:w.ledger,findings:w.findings,message:w.message});}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Unable to read the ledger.'},{status:400});}}
export async function PATCH(req:NextRequest){try{assertLocal(req,true);return NextResponse.json({success:true,item:await changeStage(await req.json())});}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Stage rejected.'},{status:400});}}
