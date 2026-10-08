import { NextRequest, NextResponse } from 'next/server';
import { assertLocal } from '@/lib/evidence/access';
import { confirmImportCompleteness } from '@/lib/evidence/repository';
export const runtime='nodejs';
export async function POST(req:NextRequest){
 try{
  assertLocal(req,true);
  const body=await req.json();
  if(body.confirmed!==true||typeof body.importId!=='string'||typeof body.businessId!=='string')throw new Error('Explicit source completeness confirmation and a business import are required.');
  return NextResponse.json(await confirmImportCompleteness(body.importId,body.businessId));
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Confirmation failed.'},{status:400});}
}
