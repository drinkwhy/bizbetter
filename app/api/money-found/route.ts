import { NextRequest, NextResponse } from 'next/server';
import { assertLocal } from '@/lib/evidence/access';
import { workspace, changeStage } from '@/lib/evidence/repository';
export const dynamic='force-dynamic';
export async function GET(req:NextRequest){try{assertLocal(req);const w=await workspace(req.nextUrl.searchParams.get('businessId')||undefined);return NextResponse.json({ledger:w.ledger,findings:w.findings,message:w.message});}catch{return NextResponse.json({error:'Local access required.'},{status:403});}}
export async function PATCH(req:NextRequest){try{assertLocal(req,true);return NextResponse.json({success:true,item:await changeStage(await req.json())});}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Stage rejected.'},{status:400});}}
