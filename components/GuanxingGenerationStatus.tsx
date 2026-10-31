'use client';
import {defaultReportQueries,queryKey} from '@/lib/guanxing/ai-client';
import {completion,stagesFor} from '@/lib/guanxing/ai-progress';
import {STAGE_LABELS,type AIQuery} from '@/lib/guanxing/ai-types';
import type {AIState} from './GuanxingAI';
function ChartMaster(){return <div className="gx-master-scene" aria-hidden="true"><svg viewBox="0 0 240 200" fill="none"><circle cx="120" cy="98" r="86" fill="#e4ead9"/><g className="gx-master-stars" fill="#ae8a4b"><path d="m40 48 2 6 6 2-6 2-2 6-2-6-6-2 6-2ZM195 36l2 5 5 2-5 2-2 5-2-5-5-2 5-2Z"/><circle cx="205" cy="85" r="2"/><circle cx="65" cy="26" r="2"/></g><path d="M72 137q4-44 48-44t48 44" fill="#395f4c"/><path d="m105 104 15 20 15-20-15 55Z" fill="#e9d5ae"/><g className="gx-master-head"><path d="M91 60q-2-32 29-32t29 32" fill="#283f35"/><rect x="108" y="18" width="24" height="20" rx="8" fill="#283f35"/><path d="M91 58h58v17q-3 28-29 33-26-5-29-33Z" fill="#edcfaa"/><path d="m98 65 13-2m18 0 13 2" stroke="#4b4d3b" strokeWidth="3" strokeLinecap="round"/><path d="m101 74 8 2m22 0 8-2" stroke="#4b4d3b" strokeWidth="2" strokeLinecap="round"/><path d="M108 90q12 7 24 0l-12 31Z" fill="#f7f0dc"/><path d="M99 89q5-7 16-2m10 0q11-5 16 2" stroke="#f7f0dc" strokeWidth="4" strokeLinecap="round"/></g><path d="M38 158h164v12H38Z" fill="#aa8151"/><path d="M53 170v22m134-22v22" stroke="#795c3d" strokeWidth="8"/><ellipse cx="120" cy="151" rx="59" ry="13" fill="#f5e9c9" stroke="#aa8151"/><g className="gx-master-chart" stroke="#9a844f"><ellipse cx="120" cy="151" rx="40" ry="9"/><ellipse cx="120" cy="151" rx="18" ry="5"/><path d="M120 139v24m-58-12h116m-99-9 82 18m0-18-82 18"/></g><path d="m76 119 24 22" stroke="#edcfaa" strokeWidth="12" strokeLinecap="round"/><g className="gx-master-hand"><path d="m164 118-22 24" stroke="#edcfaa" strokeWidth="12" strokeLinecap="round"/><path d="m142 133-11 17" stroke="#4c4a32" strokeWidth="3" strokeLinecap="round"/></g><path className="gx-master-wisp" d="M190 145q-9-9 0-18t0-18" stroke="#9ca888" strokeWidth="2" strokeLinecap="round"/><path d="M181 146h18l-3 10h-12Z" fill="#66806a"/></svg><span>观星 · 为你细看</span></div>}
export default function GuanxingGenerationStatus({state}:{state:AIState}){
 const defaults=defaultReportQueries();const focused=state.busy||state.focus||'';const parts=focused.split('-');
 const activeQuery:AIQuery|undefined=focused?{scope:parts[0] as AIQuery['scope'],year:Number(parts[1]),...(Number(parts[2])?{month:Number(parts[2])}:{})}:undefined;
 const outside=activeQuery&&!defaults.some(q=>queryKey(q)===focused);
 const queries=outside?[activeQuery!]:defaults;
 const {done,total,percent}=completion(queries,state.reports,state.drafts);
 const failed=state.errors[state.busy]||Object.values(state.errors).find(Boolean);
 if(!state.automatic&&!state.busy&&!done&&!failed&&!state.paused)return null;
 const full=done===total;const active=!!state.busy;
 const current=activeQuery||queries.find(q=>!state.reports[queryKey(q)])||queries[0];
 const finished=state.drafts[queryKey(current)]?.completed||[];
 return <section className={`gx-generation-status gx-reading-progress ${active?'is-reading':''} ${full?'complete':''}`} aria-label="详批生成进度">
  <ChartMaster/><div className="gx-progress-content"><span className="gx-progress-eyebrow">一张命盘，慢慢讲清楚</span><h2>{full?'你的详批已准备好':state.paused?'先歇一会儿，内容已经留好':failed&&!active?'已完成的内容留好了，可以接着写':active?'正在细看你的命盘':'准备为你解读命盘'}</h2><p role="status">{full?(outside?'这份报告已完成，可以阅读或导出保存。':'今年与明年的报告可直接阅读，也可以导出保存。'):active?state.progress:state.paused?'继续时会从未完成的章节接着写。':failed||'先看命盘和分数，重点解读写好后会自动出现。'}</p>
  <div className="gx-progress-caption"><span>{full?'全部完成':`${current.year} 年${current.month?` ${current.month} 月`:''} · ${done?'已完成的部分可往下阅读':'正在写第一部分重点解读'}`}</span><strong>{percent}<small>%</small></strong></div>
  <div className="gx-reading-track" role="progressbar" aria-label="报告章节完成进度" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-valuetext={`已完成 ${done} / ${total} 部分`}><i style={{width:`${percent}%`}}/></div>
  <div className="gx-progress-bottom"><small>已完成 {done} / {total} 部分 · 按完成章节更新</small>{active?<button onClick={state.cancel}>暂停，稍后继续</button>:!full?<button onClick={()=>state.run(queries)}>{failed?'接着重试':'继续解读'}</button>:<a href="#gx-report-summary">开始阅读 ↓</a>}</div>
  {!full&&<ol className="gx-progress-steps">{stagesFor(current).map(s=><li key={s} className={finished.includes(s)||state.reports[queryKey(current)]?'done':''}><span>{finished.includes(s)||state.reports[queryKey(current)]?'✓':'·'}</span>{STAGE_LABELS[s]}</li>)}</ol>}
  {state.storageWarning&&<small>{state.storageWarning}</small>}</div>
 </section>
}
