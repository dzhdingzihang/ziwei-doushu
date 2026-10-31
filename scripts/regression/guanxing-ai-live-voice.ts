// Explicit paid QA with synthetic birth data; never logs request headers or secrets.
import {writeFile} from 'node:fs/promises';
import {buildAIContext,callAI} from '../../lib/guanxing/ai-server';
import {claimFields} from '../../lib/guanxing/ai-language';
import {voiceFields} from '../../lib/guanxing/ai-voice';
if(process.env.AI_LIVE_TEST!=='1')throw Error('Set AI_LIVE_TEST=1 to run the provider QA.');
const started=Date.now();let calls=0;
const ctx=buildAIContext({year:2000,month:1,day:1,hour:6,gender:'male'},{scope:'annual',year:2026});
const capture:typeof fetch=async(url,options)=>{
 const id=++calls;const body=JSON.parse(String(options?.body));
 const kind=body.messages[0].content.includes('你是生活规划文案编辑')?'claims':body.messages[0].content.includes('你是观星报告的大白话编辑')?'voice':body.messages[0].content.includes('连贯叙述')?'detail':'main';
 const res=await fetch(url,options);const data=await res.clone().json() as {choices?:{message?:{content?:string};finish_reason?:string}[]};
 const raw=data.choices?.[0]?.message?.content;let value;try{value=JSON.parse(raw||'null');}catch{}
 await writeFile(`/tmp/guanxing-voice-${id}-${kind}.json`,JSON.stringify({input:JSON.parse(body.messages[1].content),output:value,finish:data.choices?.[0]?.finish_reason},null,2));
 console.log(JSON.stringify({id,kind,status:res.status,seconds:Math.round((Date.now()-started)/1000),claims:claimFields(value),voice:voiceFields(value).map(f=>f.id)}));return res;
};
const report=await callAI(ctx,process.env.DASHSCOPE_API_KEY||'',undefined,capture);
await writeFile('/tmp/guanxing-plain-live-2026.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({success:true,seconds:Math.round((Date.now()-started)/1000),version:report.version,months:report.detail?.months.length,years:report.detail?.years.length,overview:report.overview},null,2));
