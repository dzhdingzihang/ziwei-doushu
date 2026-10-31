'use client';
import {defaultReportQueries,queryKey} from '@/lib/guanxing/ai-client';
import type {AIState} from './GuanxingAI';
export default function GuanxingGenerationStatus({state}:{state:AIState}){
 const queries=defaultReportQueries();const count=queries.filter(q=>state.reports[queryKey(q)]).length;const failed=Object.values(state.errors).find(Boolean);
 if(!state.automatic&&!state.busy&&!count)return null;
 return <section className={`gx-generation-status ${count===queries.length?'complete':''}`} aria-label="详批生成进度"><div><span>{state.busy?'✦ 正在撰写你的报告':count===queries.length?'✓ 你的详批已准备好':state.paused?'报告已暂停':failed?'还有报告未完成':!state.automatic?'已有报告，可继续生成':'✦ 正在准备个人详批'}</span><p role="status">{state.busy?state.progress:count===queries.length?'今年与明年的详批已完成，可直接切换阅读。':state.paused?'已完成的内容会保留，点击继续即可生成剩余报告。':failed||(!state.automatic?'点击继续，可生成尚未完成的今年、明年报告。':'先显示命盘和分数，完整解读会在生成后自动出现。')}</p>{state.busy&&<small>可以先看命盘或已完成的报告，切换页面内的视图不会中断生成。</small>}{state.storageWarning&&<small>{state.storageWarning}</small>}</div><div className="gx-generation-actions"><strong>{count}<small> / {queries.length} 份</small></strong>{state.busy?<button onClick={state.cancel}>暂停</button>:count<queries.length&&(failed||state.paused||!state.automatic)?<button onClick={()=>state.run(queries)}>{failed?'重试未完成报告':'继续生成'}</button>:null}</div></section>
}
