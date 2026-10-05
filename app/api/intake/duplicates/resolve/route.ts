import { NextRequest,NextResponse } from 'next/server';
import { assertLocal } from '@/lib/evidence/access';
import { intakeWorkspace,resolveDuplicate } from '@/lib/evidence/repository';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function POST(req:NextRequest){try{assertLocal(req,true);const b=await req.json();if(typeof b.recordId!=='string'||typeof b.businessId!=='string'||!['distinct','duplicate'].includes(b.decision))throw new Error('Record, business and review decision are required.');const result=await resolveDuplicate(b.recordId,b.businessId,b.decision);const data=await intakeWorkspace(b.businessId);return NextResponse.json({success:true,result,analysis:data.analysis});}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Duplicate review failed.'},{status:400});}}
