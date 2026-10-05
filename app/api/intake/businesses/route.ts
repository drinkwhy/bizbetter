import { NextRequest,NextResponse } from 'next/server';
import { assertLocal } from '@/lib/evidence/access';
import { createBusiness,listBusinesses } from '@/lib/evidence/repository';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(req:NextRequest){try{assertLocal(req);return NextResponse.json({businesses:await listBusinesses()},{headers:{'Cache-Control':'no-store'}});}catch{return NextResponse.json({error:'Unable to list local businesses.'},{status:403});}}
export async function POST(req:NextRequest){try{assertLocal(req,true);const b=await req.json();const business=await createBusiness(String(b.name||''),typeof b.industry==='string'?b.industry:undefined);return NextResponse.json({business},{status:201});}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Unable to create business workspace.'},{status:400});}}
