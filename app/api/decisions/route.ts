import { NextRequest, NextResponse } from 'next/server';
import { assertLocal } from '@/lib/evidence/access';
import { workspace, recordDecision } from '@/lib/evidence/repository';
export const dynamic='force-dynamic';
const bid=(req:NextRequest)=>req.nextUrl.searchParams.get('businessId')||undefined;
export async function GET(req:NextRequest){try{assertLocal(req);}catch{return NextResponse.json({error:'Local access required.'},{status:403});}try{return NextResponse.json({decisions:(await workspace(bid(req))).decisions});}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Unable to read decisions.'},{status:400});}}
export async function POST(req:NextRequest){try{assertLocal(req,true);const record=await recordDecision(await req.json());return NextResponse.json({success:true,record});}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Decision rejected.'},{status:400});}}
