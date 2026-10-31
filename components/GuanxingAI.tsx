'use client';
import {useEffect,useMemo,useSyncExternalStore} from 'react';
import {browserQueue,defaultReportQueries,queryKey,reportFingerprint,type QueueState} from '@/lib/guanxing/ai-client';
export {queryKey} from '@/lib/guanxing/ai-client';
import GuanxingDetailedReading,{DetailedOutlook} from './GuanxingDetailedReading';
import type {ZiweiChart} from '@/lib/ziwei/types';
import {aiReportMarkdown,type AIReport,type AIQuery} from '@/lib/guanxing/ai-types';
const labels={wealth:'赚钱和存钱',career:'工作和事业',health:'作息与休息',family:'家里的事',love:'感情和相处'};
const readingOrder=['career','wealth','love','family','health'];
const EMPTY_STATE:QueueState={reports:{},drafts:{},busy:'',progress:'',errors:{},ready:false,paused:false,storageWarning:''};
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
 const id=queryKey(query);const complete=state.reports[id];const quick=state.drafts[id]?.summary;const report=complete||state.drafts[id]?.report;const active=state.busy===id;const error=state.errors[id];
 return <section className={`gx-ai-panel${report?.detail?' gx-full-reading':''}`} aria-label={`${query.year}${query.month?` 年 ${query.month} 月`:' 年'} AI 分析`}><div className="gx-ai-heading"><div><span className="gx-ai-badge">✦ 结合命盘的 AI 详批</span><h3>{report?(complete?'你的专属详批':'重点已写好，可以先读起来'):quick?'先说结论，你可以先看这一段':active?'正在为你撰写详批':state.busy?'正在生成其他报告，可先查看已完成内容':query.scope==='annual'?'你的个人详批':'细看这个月，具体会怎样？'}</h3><p>{query.scope==='annual'?'先说整体好不好，再讲工作、钱、感情和家里的事。每个月也会展开说，看看机会在哪里，哪些事需要多留心。':'把这个月的工作、钱和生活展开说清楚，也看看前后几段时间有什么不同。'}</p></div>{complete?<button className="gx-outline" onClick={()=>exportAIReports([complete])}>导出 AI 报告 ↗</button>:<button className="gx-ai-button" disabled={!!state.busy} onClick={()=>state.run([query])}>{active?'其余章节正在补全…':state.busy?'正在处理…':error?'重试这份报告':state.paused?'继续生成':query.scope==='annual'?'查看本年详批':'查看本月详批'}</button>}</div>
 {!report&&<p className="gx-ai-privacy">生成详批时，本站仅将推导出的命盘资料交给千问，不发送姓名、出生城市或原始生日。已完成的报告在本机保存并复用。<a href="/privacy">了解详情 ↗</a></p>}
 {report&&!complete&&<p className="gx-partial-note">以下章节已完成。{active?'其余内容会陆续出现，可以边等边读。':'剩余章节可继续生成，已完成内容会保留。'}</p>}
 {error&&<p className="gx-ai-error" role="alert">{error} 未生成的内容不会以规则文案替代。</p>}
 {quick&&!report&&<div className="gx-quick-reading" id="gx-report-summary"><p>{quick.overview}</p><div>{quick.highlights.map(h=><article key={h.key}><span>{labels[h.key]} <b>{h.score}分</b></span><h4>{h.headline}</h4><details><summary>看看依据</summary><p>{h.basis.join('；')}</p></details></article>)}</div><small>{active?'详细解读正在补全，写好后会直接显示。':'简短结论已保留，点击继续生成可补齐详细解读。'} · {quick.model}</small></div>}
 {report&&<><div className="gx-ai-overview" id="gx-report-summary"><span>{query.year} 年{query.month?` ${query.month} 月`:""} · 先说整体怎么样</span><p>{report.overview}</p></div>{!!report.detail?.natal.length&&<GuanxingDetailedReading report={report}/>}<div className="gx-money-reading" id="gx-report-annual"><h4>钱从哪里来，又能否留下</h4><div>{([['earning','钱更容易从哪里来'],['retention','赚到的钱能留下多少'],['outflow','哪些地方容易多花钱']] as const).map(([key,label])=><section key={key}><span>{label}</span><p>{report.money[key]}</p></section>)}</div></div><div className="gx-ai-grid">{[...report.domains].sort((a,b)=>readingOrder.indexOf(a.key)-readingOrder.indexOf(b.key)).map(d=><article className="gx-ai-card" key={d.key}><span>{labels[d.key]}</span><h4>{d.headline} <small className="gx-inline-score">{d.score}分</small></h4><p>{d.analysis}</p><div className="gx-ai-scenario"><span>生活里可能是这样的</span><p>{d.scenario}</p></div><p className="gx-ai-watch"><b>你可以留意：</b>{d.watch}</p><dl><dt>可以争取</dt><dd>{d.opportunity}</dd><dt>别太着急</dt><dd>{d.caution}</dd><dt>先做这件事</dt><dd>{d.action}</dd></dl><details><summary>想看命盘依据，点这里 ＋</summary><ul>{d.basis.map((s,i)=><li key={i}>{s}</li>)}</ul></details></article>)}</div><DetailedOutlook report={report}/>{report.timeline.length>0&&<div className="gx-ai-timeline"><h4>月内节奏</h4>{report.timeline.map(t=><div key={t.range}><b>{t.range}</b><p>{t.reading}</p></div>)}</div>}<p className="gx-ai-meta">由 {report.model} 生成于 {new Date(report.generatedAt).toLocaleString('zh-CN')} · AI 可能有误，请结合现实理解；健康栏仅作生活节奏参考。</p></>}
 </section>
}
