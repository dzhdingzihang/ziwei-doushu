'use client';
import {useEffect,useRef,useState} from 'react';
import type {ZiweiChart} from '@/lib/ziwei/types';
import {aiReportMarkdown,type AIReport,type AIQuery} from '@/lib/guanxing/ai-types';
const labels={wealth:'财运',career:'事业',health:'健康',family:'家庭',love:'情感'};
export const queryKey=(q:AIQuery)=>`${q.scope}-${q.year}-${q.month||0}`;
export function useAIReports(chart:ZiweiChart){
 const b=chart.birthInfo;const fingerprint=`${b.year}-${b.month}-${b.day}-${b.hour}-${b.gender}`;
 const [reports,setReports]=useState<Record<string,AIReport>>({});const cache=useRef<Record<string,AIReport>>({});
 const [busy,setBusy]=useState('');const [progress,setProgress]=useState('');const [errors,setErrors]=useState<Record<string,string>>({});const controller=useRef<AbortController|null>(null);
 useEffect(()=>{const saved:Record<string,AIReport>={};try{for(let i=0;i<sessionStorage.length;i++){const k=sessionStorage.key(i)!;if(k.startsWith(`gx-ai-v2:${fingerprint}:`)){const r=JSON.parse(sessionStorage.getItem(k)!);if(r.version===2&&r.model==='qwen3.7-plus'&&r.domains?.length===5)saved[k.split(':')[2]]=r;}}}catch{}cache.current=saved;setReports(saved);setErrors({});return()=>controller.current?.abort();},[fingerprint]);
 async function run(queries:AIQuery[]){
  if(controller.current)return;
  const abort=new AbortController();controller.current=abort;
  const todo=queries.filter(q=>!cache.current[queryKey(q)]);let finished=0;
  try{for(const q of todo){if(abort.signal.aborted)break;const id=queryKey(q);setBusy(id);setErrors(e=>({...e,[id]:''}));setProgress(todo.length>1?`正在分析 ${q.year} 年 ${q.month?`${q.month} 月`:''} · ${finished+1} / ${todo.length}`:'AI 正在综合命盘与运限，通常需要 30–90 秒…');
   try{const res=await fetch('/api/ai-reading',{method:'POST',headers:{'Content-Type':'application/json'},signal:abort.signal,body:JSON.stringify({birth:{year:b.year,month:b.month,day:b.day,hour:b.hour,gender:b.gender},query:q})});const data=await res.json() as {report?:AIReport;error?:string};if(!res.ok||!data.report)throw Error(data.error||'AI 暂时不可用，请重试。');if(abort.signal.aborted)break;
    const r=data.report as AIReport;cache.current={...cache.current,[id]:r};setReports({...cache.current});try{sessionStorage.setItem(`gx-ai-v2:${fingerprint}:${id}`,JSON.stringify(r));}catch{}finished++;
   }catch(e){if(abort.signal.aborted)break;setErrors(prev=>({...prev,[id]:e instanceof Error?e.message:'连接中断，请重试。'}));setProgress(todo.length>1?`已完成 ${finished} 份，其余暂停。展开未完成的月份可重试。`:'');break;}
  }}finally{controller.current=null;setBusy('');setProgress(p=>abort.signal.aborted?'已停止。完成的分析仍保留，可继续生成剩余报告。':finished===todo.length?(todo.length>1?`已完成本组 ${finished} 份新分析。`:''):p);}
 }
 return{reports,busy,progress,errors,run,cancel:()=>controller.current?.abort()};
}
export type AIState=ReturnType<typeof useAIReports>;
function download(content:string,name:string){const url=URL.createObjectURL(new Blob([content],{type:'text/markdown;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export function exportAIReports(reports:AIReport[]){download('# 观星 · AI 运势报告\n\n传统文化解读，仅供学习与反思，不是确定预测；不能替代医疗、投资或其他专业意见。\n\n'+reports.map(aiReportMarkdown).join('\n\n---\n\n'),'观星-AI运势报告.md');}
export default function GuanxingAI({state,query}:{state:AIState;query:AIQuery}){
 const id=queryKey(query);const report=state.reports[id];const active=state.busy===id;const error=state.errors[id];
 return <section className="gx-ai-panel" aria-label={`${query.year}${query.month?` 年 ${query.month} 月`:' 年'} AI 分析`}><div className="gx-ai-heading"><div><span className="gx-ai-badge">✦ 千问 AI · Qwen3.7 Plus</span><h3>{report?'你的专属 AI 解读':'这些分数，具体意味着什么？'}</h3><p>{query.scope==='annual'?'根据本命、大限与流年，说明分数背后的具体机会、阻力和可能情景。':'结合分数与流月，预估具体情景，并指出月内各阶段的差别。'}</p></div>{report?<button className="gx-outline" onClick={()=>exportAIReports([report])}>导出 AI 报告 ↗</button>:<button className="gx-ai-button" disabled={!!state.busy} onClick={()=>state.run([query])}>{active?'正在分析…':`✦ 生成${query.scope==='annual'?'本年':'本月'} AI 分析`}</button>}</div>
 {!report&&<p className="gx-ai-privacy">点击后将提交排盘所需日期、时辰与性别至本站服务端；仅将推导出的命盘资料交给千问，不发送姓名、出生城市或原始生日。结果暂存在当前浏览器会话。<a href="/privacy">了解详情 ↗</a></p>}
 {active&&<div className="gx-ai-status" role="status"><span className="gx-ai-pulse"/>{state.progress}<button onClick={state.cancel}>停止</button></div>}
 {error&&<p className="gx-ai-error" role="alert">{error} 未生成的内容不会以规则文案替代。</p>}
 {report&&<><div className="gx-ai-overview"><span>本期主线</span><p>{report.overview}</p></div><div className="gx-ai-grid">{report.domains.map(d=><article className="gx-ai-card" key={d.key}><span>{labels[d.key]}</span><h4>{d.headline} <small className="gx-inline-score">{d.score}分</small></h4><p>{d.analysis}</p><div className="gx-ai-scenario"><span>具体情景预估 · 供现实对照</span><p>{d.scenario}</p></div><p className="gx-ai-watch"><b>观察信号：</b>{d.watch}</p><dl><dt>可关注</dt><dd>{d.opportunity}</dd><dt>需留意</dt><dd>{d.caution}</dd><dt>行动建议</dt><dd>{d.action}</dd></dl><details><summary>查看 AI 引用的排盘依据 ＋</summary><ul>{d.basis.map((s,i)=><li key={i}>{s}</li>)}</ul></details></article>)}</div>{report.timeline.length>0&&<div className="gx-ai-timeline"><h4>月内节奏</h4>{report.timeline.map(t=><div key={t.range}><b>{t.range}</b><p>{t.reading}</p></div>)}</div>}<p className="gx-ai-meta">由 {report.model} 生成于 {new Date(report.generatedAt).toLocaleString('zh-CN')} · AI 可能有误，请结合现实理解；健康栏仅作生活节奏参考。</p></>}
 </section>
}
