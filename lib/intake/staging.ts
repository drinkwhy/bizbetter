import { promises as fs } from 'fs';
import path from 'path';
import type { ParsedSheet } from './interpreter';
import { newUploadId } from './interpreter';

const directory=path.join(process.cwd(),'.bizbetter-data','intake-staging');
export interface StagedUpload {id:string;businessId:string;fileName:string;fileType:'csv'|'xlsx'|'manual';createdAt:string;digest:string;sheets:ParsedSheet[];}
export async function stage(input:Omit<StagedUpload,'id'|'createdAt'>){await fs.mkdir(directory,{recursive:true,mode:0o700});const id=newUploadId(),item:StagedUpload={...input,id,createdAt:new Date().toISOString()};const tmp=path.join(directory,id+'.tmp'),dest=path.join(directory,id+'.json');await fs.writeFile(tmp,JSON.stringify(item),{mode:0o600,flag:'wx'});await fs.rename(tmp,dest);return item;}
export async function staged(id:string,businessId:string){if(!/^[a-f0-9-]{36}$/.test(id)||!/^[-a-zA-Z0-9_]{1,80}$/.test(businessId))throw new Error('Invalid staged upload reference.');const p=path.join(directory,id+'.json');const item=JSON.parse(await fs.readFile(p,'utf8')) as StagedUpload;if(item.id!==id||item.businessId!==businessId)throw new Error('Upload does not belong to this business workspace.');if(Date.now()-Date.parse(item.createdAt)>24*60*60*1000){await fs.rm(p,{force:true});throw new Error('Staged upload expired; upload the file again.');}return item;}
export async function removeStage(id:string){if(!/^[a-f0-9-]{36}$/.test(id))return;await fs.rm(path.join(directory,id+'.json'),{force:true});}
