import { NextRequest,NextResponse } from 'next/server';
import { assertLocal } from '@/lib/evidence/access';
import { intakeWorkspace,rejectImport } from '@/lib/evidence/repository';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function POST(req:NextRequest){try{assertLocal(req,true);const {importId,businessId}=await req.json();if(typeof importId!=='string'||typeof businessId!=='string')throw new Error('Import and business IDs are required.');const result=await rejectImport(importId,businessId);const data=await intakeWorkspace(businessId);return NextResponse.json({success:true,result,analysis:data.analysis});}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Unable to reject import.'},{status:400});}}
