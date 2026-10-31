'use client';
import {useEffect,useMemo,useSyncExternalStore} from 'react';
import {browserQueue,defaultReportQueries,queryKey,reportFingerprint,type QueueState} from '@/lib/guanxing/ai-client';
export {queryKey} from '@/lib/guanxing/ai-client';
import GuanxingDetailedReading,{DetailedOutlook} from './GuanxingDetailedReading';
import type {ZiweiChart} from '@/lib/ziwei/types';
import {aiReportMarkdown,type AIReport,type AIQuery} from '@/lib/guanxing/ai-types';
const labels={wealth:'财运',career:'事业',health:'健康',family:'家庭',love:'情感'};
const EMPTY_STATE:QueueState={reports:{},busy:'',progress:'',errors:{},ready:false,paused:false,storageWarning:''};
const emptySubscribe=()=>()=>{};const emptySnapshot=()=>EMPTY_STATE;
export function useAIReports(chart:ZiweiChart|null,automatic=false){
 const fp=chart?reportFingerprint(chart.birthInfo):'';
 const queue=useMemo(()=>chart?browserQueue(chart.birthInfo):null,[fp]);
 const state=useSyncExternalStore(queue?.subscribe||emptySubscribe,queue?.getSnapshot||emptySnapshot,queue?.getSnapshot||emptySnapshot);
 useEffect(()=>{
  if(!queue)return;queue.hydrate();
  const timer=setTimeout(()=>{if(automatic&&!queue.getSnapshot().paused)void queue.run(defaultReportQueries());},0);
  return()=>{clearTimeout(timer);queue.dispose();};
 },[queue,automatic]);
 return{...state,automatic,run:(queries:AIQuery[])=>queue?.run(queries),cancel:()=>queue?.cancel()};
}
export type AIState=ReturnType<typeof useAIReports>;
function download(content:string,name:string){const url=URL.createObjectURL(new Blob([content],{type:'text/markdown;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export function exportAIReports(reports:AIReport[]){download('# 观星 · AI 运势报告\n\n传统文化解读，仅供学习与反思，不是确定预测；不能替代医疗、投资或其他专业意见。\n\n'+reports.map(aiReportMarkdown).join('\n\n---\n\n'),'观星-AI运势报告.md');}
export default function GuanxingAI({state,query}:{state:AIState;query:AIQuery}){
 const id=queryKey(query);const report=state.reports[id];const active=state.busy===id;const error=state.errors[id];
 return <section className={`gx-ai-panel${report?.detail?' gx-full-reading':''}`} aria-label={`${query.year}${query.month?` 年 ${query.month} 月`:' 年'} AI 分析`}><div className="gx-ai-heading"><div><span className="gx-ai-badge">✦ 结合命盘的 AI 详批</span><h3>{report?'你的专属详批':active?'正在为你撰写详批':state.busy?'正在生成其他报告，可先查看已完成内容':query.scope==='annual'?'你的个人详批':'细看这个月，具体会怎样？'}</h3><p>{query.scope==='annual'?'包含本命总论、大限阶段、五领域年运、全年逐月判断与十年走势。每一份都根据本人的命盘生成。':'结合分数与流月，预估具体情景，并指出月内各阶段的差别。'}</p></div>{report?<button className="gx-outline" onClick={()=>exportAIReports([report])}>导出 AI 报告 ↗</button>:<button className="gx-ai-button" disabled={!!state.busy} onClick={()=>state.run([query])}>{active?'正在撰写…':state.busy?'正在处理…':error?'重试这份报告':state.paused?'继续生成':query.scope==='annual'?'查看本年详批':'查看本月详批'}</button>}</div>
 {!report&&<p className="gx-ai-privacy">生成详批时，本站仅将推导出的命盘资料交给千问，不发送姓名、出生城市或原始生日。已完成的报告在本机保存并复用。<a href="/privacy">了解详情 ↗</a></p>}
 {active&&<div className="gx-ai-status" role="status"><span className="gx-ai-pulse"/>{state.progress}<button onClick={state.cancel}>停止</button></div>}
 {error&&<p className="gx-ai-error" role="alert">{error} 未生成的内容不会以规则文案替代。</p>}
 {report&&<><GuanxingDetailedReading report={report}/><div className="gx-ai-overview" id="gx-report-annual"><span>本期主线</span><p>{report.overview}</p></div><div className="gx-money-reading"><h4>钱从哪里来，又能否留下</h4><div>{([['earning','赚钱机会'],['retention','留财能力'],['outflow','开销压力']] as const).map(([key,label])=><section key={key}><span>{label}</span><p>{report.money[key]}</p></section>)}</div></div><div className="gx-ai-grid">{report.domains.map(d=><article className="gx-ai-card" key={d.key}><span>{labels[d.key]}</span><h4>{d.headline} <small className="gx-inline-score">{d.score}分</small></h4><p>{d.analysis}</p><div className="gx-ai-scenario"><span>具体情景预估 · 供现实对照</span><p>{d.scenario}</p></div><p className="gx-ai-watch"><b>观察信号：</b>{d.watch}</p><dl><dt>可关注</dt><dd>{d.opportunity}</dd><dt>需留意</dt><dd>{d.caution}</dd><dt>行动建议</dt><dd>{d.action}</dd></dl><details><summary>查看 AI 引用的排盘依据 ＋</summary><ul>{d.basis.map((s,i)=><li key={i}>{s}</li>)}</ul></details></article>)}</div><DetailedOutlook report={report}/>{report.timeline.length>0&&<div className="gx-ai-timeline"><h4>月内节奏</h4>{report.timeline.map(t=><div key={t.range}><b>{t.range}</b><p>{t.reading}</p></div>)}</div>}<p className="gx-ai-meta">由 {report.model} 生成于 {new Date(report.generatedAt).toLocaleString('zh-CN')} · AI 可能有误，请结合现实理解；健康栏仅作生活节奏参考。</p></>}
 </section>
}
