import assert from 'node:assert/strict';
import {generateInStages,completion} from '../../lib/guanxing/ai-progress';
import {callAIStage,buildAIContext} from '../../lib/guanxing/ai-server';
import {detailFixture} from './guanxing-ai-detail-fixture';
import {ANNUAL_STAGES,type AIStage,type AIChunk,type AIDraft} from '../../lib/guanxing/ai-types';
import {AIReportQueue,queryKey} from '../../lib/guanxing/ai-client';
const ctx=buildAIContext({year:2000,month:1,day:1,hour:6,gender:'male'},{scope:'annual',year:2026});
const main={overview:'这一年可以把重要的工作往前推，钱的安排要先说清楚。',money:{earning:'把报酬约定清楚。',retention:'看看实际收到了多少钱。',outflow:'核对每一笔支出的安排。'},domains:ctx.domainScores.map(d=>({key:d.key,headline:'先把手上的事情安排好',analysis:'把要做的事情一项项列出来，先处理有明确时间要求的事。',scenario:'如果有人临时找你帮忙，先看看自己的时间安排。',watch:'留意约好的时间有没有变化。',opportunity:'把已经准备好的事情推进。',caution:'不清楚的地方先确认。',action:'写下一件今天可以完成的事。',basisIds:Object.keys(ctx.bases).filter(id=>id.includes(`-${d.key}-`)).slice(0,2)})),timeline:[]};
const chunks={} as Record<AIStage,AIChunk>;
for(const stage of ANNUAL_STAGES){
 const fake:typeof fetch=async(_url,opt)=>{
  const request=JSON.parse(String(opt?.body));const detail=request.messages[0].content.includes('连贯叙述');
  let result:unknown=request.messages[0].content.includes('只写一段先读结论')?{overview:main.overview,highlights:main.domains.map(d=>({key:d.key,headline:d.headline,basisIds:d.basisIds}))}:main;
  if(detail){const input=JSON.parse(request.messages[1].content);const all=detailFixture(ctx.detail!);result={...all,natal:input.natal.length?all.natal:[],cycles:all.cycles.filter(c=>input.cycles.some((x:any)=>x.id===c.id)),years:all.years.filter(c=>input.years.some((x:any)=>x.id===c.id)),months:all.months.filter(c=>input.months.some((x:any)=>x.id===c.id))};}
  return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify(result)}}]});
 };
 chunks[stage]=await callAIStage(ctx,'test',stage,undefined,fake);
}
assert.equal(chunks.core.report?.detail,undefined);
assert.equal(chunks.foundation.detail?.natal.length,3);
assert.equal(chunks['months-first'].detail?.months.length,6);
assert.equal(chunks['months-last'].detail?.months[0].month,7);
assert.equal(chunks.outlook.detail?.years.length,10);
const query={scope:'annual' as const,year:2026},id=queryKey(query);let draft:AIDraft|undefined;const seen:number[]=[];
let fail=true,requested:AIStage[]=[];
const request=async(stage:AIStage)=>{requested.push(stage);if(fail&&stage==='months-first')throw Error('network');return chunks[stage];};
const record=(d:AIDraft)=>{draft=d;seen.push(completion([query],{}, {[id]:d}).percent);};
await assert.rejects(()=>generateInStages(query,new AbortController().signal,undefined,record,request),/network/);
assert(draft?.report?.overview);assert(draft?.completed.includes('foundation'));assert(!draft?.completed.includes('months-first'));
assert.deepEqual(seen,[16,33,50]);fail=false;requested=[];
const complete=await generateInStages(query,new AbortController().signal,draft,record,request);
assert(!requested.includes('summary'));assert(!requested.includes('core'));assert(!requested.includes('foundation'));assert.equal(complete.detail?.months.length,12);assert.equal(new Set(complete.detail?.months.map(m=>m.id)).size,12);assert.equal(seen.at(-1),100);
assert.equal(completion([query,{scope:'annual',year:2027}],{[id]:complete},{}).percent,50);
let storedDraft:AIDraft|null=null;const controller=new AbortController();let partialSeen=false;
await assert.rejects(()=>generateInStages(query,controller.signal,undefined,d=>{partialSeen=!!d.summary;controller.abort();},request),/已暂停/);assert(partialSeen);
const queue=new AIReportQueue({load:()=>({}),save:()=>true,getPaused:()=>false,setPaused:()=>{},saveDraft:(_id,d)=>{storedDraft=d;},request:async(_q,_signal,progress)=>{progress({completed:['core'],report:chunks.core.report},'重点完成');throw Error('断线');}});
await queue.run([query]);assert(storedDraft);assert(queue.getSnapshot().drafts[id].report);assert(!queue.getSnapshot().reports[id]);assert(!queue.getSnapshot().busy);
console.log('PASS: validated staged responses, first content before completion, real percentages, retained chapters, interrupted generation and resume.');

const badMain={...main,domains:main.domains.map((d,i)=>i===0?{...d,basisIds:['not-a-real-id']}:d)};
let citationRepairs=0;
const fixed=await callAIStage(ctx,'test','core',undefined,async(_url,options)=>{
 const request=JSON.parse(String(options?.body));let result:unknown=badMain;
 if(request.messages[0].content.includes('为已有解读核对引用')){citationRepairs++;result={citations:[{key:'wealth',basisIds:main.domains[0].basisIds}]};}
 return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify(result)}}]});
});
assert.equal(citationRepairs,1);assert.equal(fixed.report?.domains[0].basis.length,2);assert.equal(fixed.report?.overview,main.overview);
console.log('PASS: malformed citations repair without regenerating or discarding the completed prose.');

queue.focus({scope:'annual',year:2035});assert.equal(queue.getSnapshot().focus,'annual-2035-0');assert(queue.getSnapshot().drafts[id]);
