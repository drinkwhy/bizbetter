import assert from 'node:assert/strict';
import { callAIProvider, configuredAIProvider, type Answer } from '../lib/ai/gateway';
async function main(){
 const originalFetch=globalThis.fetch,oldProvider=process.env.BIZBETTER_AI_PROVIDER,oldKey=process.env.GEMINI_API_KEY,oldModel=process.env.BIZBETTER_AI_GEMINI_MODEL;
 const answer:Answer={summary:'Source evidence is available.',facts:[],patterns:[],hypotheses:[],recommendations:[],additionalDataNeeded:[],confidence:'LOW',limitations:[],questionsForOwner:[]};
 const context={query:'Analyze',items:[],fingerprint:'test'};
 try{
  process.env.BIZBETTER_AI_PROVIDER='gemini';delete process.env.GEMINI_API_KEY;delete process.env.BIZBETTER_AI_GEMINI_MODEL;
  globalThis.fetch=async()=>{throw Error('Unexpected provider call');};
  assert.equal(configuredAIProvider(),'GEMINI');assert.equal(await callAIProvider(context,'FAST'),null);
  process.env.GEMINI_API_KEY='fictional-test-key';
  globalThis.fetch=async(url,options)=>{
   assert.equal(String(url),'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent');
   assert(!String(url).includes('fictional-test-key'));
   assert.equal(new Headers(options?.headers).get('x-goog-api-key'),'fictional-test-key');
   const body=JSON.parse(String(options?.body));
   assert.equal(body.generationConfig.thinkingConfig,undefined);
   assert.equal(body.generationConfig.responseMimeType,'application/json');
   assert(body.generationConfig.responseJsonSchema.required.includes('facts'));
   assert.equal(JSON.parse(body.contents[0].parts[0].text).depth,'FAST');
   return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{thought:true,text:'private reasoning'},{text:JSON.stringify(answer)}]}}]});
  };
  assert.equal((await callAIProvider(context,'FAST'))?.provider,'GEMINI');
  for(const status of [403,429]){
   globalThis.fetch=async()=>Response.json({error:{message:'private provider details'}},{status});
   await assert.rejects(()=>callAIProvider(context,'FAST'),new RegExp(String(status)));
  }
  globalThis.fetch=async()=>Response.json({candidates:[{finishReason:'MAX_TOKENS',content:{parts:[{text:'{}'}]}}]});
  await assert.rejects(()=>callAIProvider(context,'FAST'),/incomplete/);
  globalThis.fetch=async()=>Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({...answer,summary:'Save $999999.'})}]}}]});
  await assert.rejects(()=>callAIProvider(context,'FAST'),/quantitative/);
  let attempts=0;
  globalThis.fetch=async(_url,options)=>{
   attempts++;
   const body=JSON.parse(String(options?.body));
   if(attempts===2)assert.match(body.systemInstruction.parts[0].text,/qualitative explanations only/);
   const response=attempts===1?{...answer,summary:'Save $999999.'}:answer;
   return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(response)}]}}]});
  };
  assert.equal((await callAIProvider(context,'FAST'))?.value.summary,answer.summary);
  assert.equal(attempts,2);
  attempts=0;
  globalThis.fetch=async()=>{attempts++;return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({...answer,summary:'Save $999999.'})}]}}]});};
  await assert.rejects(()=>callAIProvider(context,'FAST'),/quantitative/);
  assert.equal(attempts,2,'retry must be bounded and must never accept the unsupported amount');
  process.env.BIZBETTER_AI_GEMINI_MODEL='../invalid';
  await assert.rejects(()=>callAIProvider(context,'FAST'),/model identifier/);
  console.log('PASS Gemini key isolation, missing-key fallback, JSON schema, response parsing, truncated output, quota/access errors and fabricated-amount rejection');
 }finally{
  globalThis.fetch=originalFetch;
  for(const [key,value] of Object.entries({BIZBETTER_AI_PROVIDER:oldProvider,GEMINI_API_KEY:oldKey,BIZBETTER_AI_GEMINI_MODEL:oldModel})){if(value===undefined)delete process.env[key];else process.env[key]=value;}
 }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
