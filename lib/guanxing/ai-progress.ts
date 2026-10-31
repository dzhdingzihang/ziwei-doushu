import {ANNUAL_STAGES,STAGE_LABELS,type AIQuery,type AIReport,type AIDraft,type AIChunk,type AIStage} from './ai-types';
export const validSummary=(s:unknown):s is NonNullable<AIDraft['summary']>=>!!s&&typeof (s as any).overview==='string'&&typeof (s as any).model==='string'&&Array.isArray((s as any).highlights)&&(s as any).highlights.length===5;
export const stagesFor=(q:AIQuery):readonly AIStage[]=>q.scope==='annual'?ANNUAL_STAGES:['core'];
export function mergeChunk(draft:AIDraft,chunk:AIChunk):AIDraft{
 if(!ANNUAL_STAGES.includes(chunk.stage))throw Error('报告章节不正确，请重试。');
 const expectedModel=draft.report?.model||draft.summary?.model;
 if(expectedModel&&chunk.model&&expectedModel!==chunk.model)throw Error('模型配置已更新。请在隐私页清除旧报告缓存后重新生成。');
 if(chunk.stage==='summary'){
  if(!validSummary(chunk.summary))throw Error('简短结论尚未完整生成，请重试。');
  return {...draft,summary:chunk.summary,completed:[...new Set([...draft.completed,'summary' as const])]};
 }
 let report=draft.report;
 if(chunk.stage==='core'){
  if(!chunk.report||chunk.report.domains?.length!==5||!chunk.report.overview||!chunk.report.money)throw Error('重点解读尚未完整生成，请重试。');
  report=chunk.report;
 }else{
  const detail=chunk.detail;
  if(!report||!detail||!['natal','cycles','years','months'].every(k=>Array.isArray(detail[k as keyof typeof detail])))throw Error('章节内容不完整，请重试。');
  const previous=report.detail||{natal:[],cycles:[],years:[],months:[]};
  report={...report,detail:{
   natal:chunk.stage==='foundation'?detail.natal:previous.natal,
   cycles:chunk.stage==='foundation'?detail.cycles:previous.cycles,
   years:chunk.stage==='outlook'?detail.years:previous.years,
   months:chunk.stage.startsWith('months-')?[...previous.months.filter(m=>!detail.months.some(n=>n.id===m.id)),...detail.months].sort((a,b)=>a.month-b.month):previous.months
  }};
 }
 return {...draft,report,completed:[...new Set([...draft.completed,chunk.stage])]};
}
// Each percentage step corresponds to a validated, saved chapter. It is not an elapsed-time estimate.
export function completion(queries:AIQuery[],reports:Record<string,AIReport>,drafts:Record<string,AIDraft>){
 let done=0,total=0;
 for(const q of queries){const id=`${q.scope}-${q.year}-${q.month||0}`,stages=stagesFor(q);total+=stages.length;done+=reports[id]?stages.length:stages.filter(s=>drafts[id]?.completed.includes(s)).length;}
 return {done,total,percent:total?Math.floor(done/total*100):0};
}
export async function generateInStages(query:AIQuery,signal:AbortSignal,prior:AIDraft|undefined,onProgress:(draft:AIDraft,label:string)=>void,request:(stage:AIStage,signal:AbortSignal)=>Promise<AIChunk>){
 let draft: AIDraft=prior||{completed:[]};
 const get=async(stage:AIStage)=>{const chunk=await request(stage,signal);if(signal.aborted)throw new DOMException('已暂停','AbortError');if(chunk.stage!==stage)throw Error('报告章节不匹配，请重试。');draft=mergeChunk(draft,chunk);onProgress(draft,`${STAGE_LABELS[stage]}已完成`);};
 if(query.scope==='annual'&&!draft.completed.includes('summary')&&!draft.report)await get('summary');
 if(draft.report&&!draft.completed.includes('summary')&&query.scope==='annual')draft={...draft,completed:['summary',...draft.completed]};
 if(!draft.completed.includes('core'))await get('core');
 const rest=stagesFor(query).filter(s=>!draft.completed.includes(s));
 for(let i=0;i<rest.length;i+=2){
  if(signal.aborted)throw new DOMException('已暂停','AbortError');
  // Wait for both to settle so successful chapters survive a sibling failure.
  const results=await Promise.allSettled(rest.slice(i,i+2).map(get));
  const failed=results.find(r=>r.status==='rejected');if(failed?.status==='rejected')throw failed.reason;
 }
 if(!draft.report)throw Error('报告未完成，请重试。');
 return draft.report;
}
