'use client';
import { useId, useRef, useState } from 'react';
import GuanxingBirthPicker from './GuanxingBirthPicker';
import { useRouter } from 'next/navigation';
import { PROVINCES } from '@/lib/ziwei/cities';
import { isChinaDST } from '@/lib/ziwei/dst-cn';
import { EMPTY_DRAFT, prepareBirth, SESSION_KEY, type BirthDraft } from '@/lib/guanxing/birth';
export default function GuanxingForm({ onSubmit, initial, autoReading=true }: {autoReading?:boolean;onSubmit?: (draft:BirthDraft)=>void; initial?:BirthDraft}) {
 const id=useId();const form=useRef<HTMLFormElement>(null);const [attempted,setAttempted]=useState(false);const router=useRouter(); const [d,setD]=useState<BirthDraft>(initial || EMPTY_DRAFT); const [error,setError]=useState('');
 const update=(patch:Partial<BirthDraft>)=>{setD(old=>({...old,...patch}));setError('');};
 const province=PROVINCES.find(p=>p.name===d.province); const [y,m,day]=d.date.split('-').map(Number);
 const dstPossible=y>=1986&&y<=1991&&isChinaDST(y,m,day);
 let note='';try{note=prepareBirth(d).note;}catch{}
 function submit(input:BirthDraft,automatic=autoReading){const draft={...input,autoAnalyze:automatic};setAttempted(true);try{prepareBirth(draft);if(onSubmit){onSubmit(draft);}else{sessionStorage.setItem(SESSION_KEY,JSON.stringify(draft));router.push('/chart');}}catch(e){setError(e instanceof Error?e.message:'暂时无法起盘，请检查输入。');requestAnimationFrame(()=>form.current?.querySelector<HTMLButtonElement>('[aria-invalid="true"]')?.focus());}}
 return <form ref={form} className="gx-form" onSubmit={e=>{e.preventDefault();submit(d);}}><div className="gx-form-head"><div><span className="gx-eyebrow">START YOUR CHART</span><h2>从你的出生时刻开始</h2></div><span className="gx-step">出生信息</span></div>
 <div className="gx-field"><label htmlFor={`${id}-name`}>如何称呼你 <span>选填</span></label><input id={`${id}-name`} maxLength={30} value={d.name} onChange={e=>update({name:e.target.value})} placeholder="为这份命盘起个名字" autoComplete="off" /></div>
 <div className="gx-field"><span className="gx-label">排盘性别</span><div className="gx-segment" role="group" aria-label="排盘性别">{(['male','female'] as const).map((g,i)=><button key={g} type="button" aria-pressed={d.gender===g} className={d.gender===g?'active':''} onClick={()=>update({gender:g})}>{i?'女命':'男命'} <span>{d.gender===g?'✓':''}</span></button>)}</div></div>
 <GuanxingBirthPicker date={d.date} time={d.time} timeMode={d.timeMode} invalidDate={attempted&&!d.date} invalidTime={attempted&&!d.time} onDate={date=>update({date,...(date!==d.date?{dst:false}:{})})} onTime={(time,timeMode)=>update({time,timeMode,...(timeMode==='branch'?{solar:false,dst:false}:{})})}/>
 <div className="gx-field"><label htmlFor={`${id}-province`}>出生地 <span>中国大陆 · 北京时间</span></label><div className="gx-form-row"><select id={`${id}-province`} value={d.province} onChange={e=>update({province:e.target.value,city:'',longitude:undefined,solar:false})}><option value="">选择省份（选填）</option>{PROVINCES.map(p=><option key={p.name}>{p.name}</option>)}</select><select aria-label="出生城市" disabled={!province} value={d.city} onChange={e=>update({city:e.target.value,longitude:province?.cities.find(c=>c.name===e.target.value)?.longitude})}><option value="">选择城市</option>{province?.cities.map(c=><option key={c.name}>{c.name}</option>)}</select></div></div>
 <details className="gx-settings"><summary>排盘口径与时间校正 <span>＋</span></summary><label><input type="checkbox" checked={d.solar} disabled={!d.city||d.timeMode==='branch'} onChange={e=>update({solar:e.target.checked})}/> 使用真太阳时（需精确时分和出生城市）</label><label><input type="checkbox" checked={d.dst} disabled={d.timeMode==='branch'} onChange={e=>update({dst:e.target.checked})}/> 按夏令时钟表读数扣除 1 小时（需精确时分）</label><label>晚子时（23:00 后）<select value={d.late} onChange={e=>update({late:e.target.value as BirthDraft['late']})}><option value="next-day">按次日排盘</option><option value="current-day">按当日排盘</option></select></label><p>默认北京时间，不自动扣除夏令时。真太阳时含经度修正及均时差；星曜亮度采用《斗数全书》，闰月按前后半月分界。</p></details>
 {dstPossible&&<p className="gx-notice">此日期可能处于中国夏令时期间。若输入的是当年钟表读数，请在上方选择扣除 1 小时；已换算为标准时间则无需重复扣除。转换边界以出生地记录为准。</p>}
 {note&&<p className="gx-time-note">{note}</p>}{error&&<p role="alert" className="gx-error">{error}</p>}
 <button className="gx-primary" type="submit">{autoReading?'生成我的完整详批':'生成命盘'} <span>↗</span></button><p className="gx-privacy">{autoReading?'提交后自动生成今年、明年详批，完成后直接展示；本站将排盘所需资料发送服务端，推导出的命盘资料交由千问解读。姓名、出生城市不发送给 AI。报告在本机保存。':'浏览器内排盘，命盘本机保存。'}</p><button className="gx-demo" type="button" onClick={()=>submit({...EMPTY_DRAFT,name:'示例命盘',date:'2000-01-01',time:'12:00',timeMode:'exact'},false)}>还没准备好？先看一张示例命盘 →</button></form>;
}
