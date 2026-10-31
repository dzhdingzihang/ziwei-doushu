import type {BirthInfo} from '../ziwei/types';
import type {AIQuery,AIReport,AIDraft,AIChunk} from './ai-types';
import {generateInStages,stagesFor,validSummary} from './ai-progress';
export const REPORT_PREFIX='gx-ai-v4:';
export const queryKey=(q:AIQuery)=>`${q.scope}-${q.year}-${q.month||0}`;
export const reportFingerprint=(b:BirthInfo)=>`${b.year}-${b.month}-${b.day}-${b.hour}-${b.gender}`;
export function defaultReportQueries(now=new Date()):AIQuery[]{const year=Number(new Intl.DateTimeFormat('en',{year:'numeric',timeZone:'Asia/Shanghai'}).format(now));return[year,year+1].filter(y=>y<=2099).map(year=>({scope:'annual',year}));}
type Store=Pick<Storage,'length'|'key'|'getItem'|'setItem'|'removeItem'>;
const storeKeys=(s:Store)=>Array.from({length:s.length},(_,i)=>s.key(i)).filter((k):k is string=>!!k);
export function validReport(value:unknown,query?:string):value is AIReport{
 const r=value as AIReport|undefined;
 return !!r&&r.version===4&&r.model==='qwen3.7-plus'&&Array.isArray(r.domains)&&r.domains.length===5&&!!r.money&&Array.isArray(r.timeline)&&typeof r.overview==='string'&&(!query?.startsWith('annual-')||!!r.detail&&Array.isArray(r.detail.months)&&Array.isArray(r.detail.years)&&Array.isArray(r.detail.natal)&&r.detail.natal.length===3&&r.detail.years.length>=1);
}
export function readReports(fp:string,stores:Store[]){
 const result:Record<string,AIReport>={};
 for(const s of stores){try{for(const k of storeKeys(s)){const prefix=`${REPORT_PREFIX}${fp}:`;if(!k.startsWith(prefix))continue;const id=k.slice(prefix.length);if(!/^(annual|monthly)-\d{4}-\d{1,2}$/.test(id))continue;try{const r=JSON.parse(s.getItem(k)||'null');if(validReport(r,id)&&(!result[id]||r.generatedAt>=result[id].generatedAt))result[id]=r;}catch{}}}catch{}}
 return result;
}
export function persistReport(store:Store,fp:string,id:string,r:AIReport){
 const key=`${REPORT_PREFIX}${fp}:${id}`;
 try{
  const keys=storeKeys(store).filter(k=>k.startsWith(REPORT_PREFIX)&&k!==key).map(k=>{try{return{key:k,date:JSON.parse(store.getItem(k)||'{}').generatedAt||''};}catch{return{key:k,date:''};}}).sort((a,b)=>a.date.localeCompare(b.date));
  while(keys.length>=24)store.removeItem(keys.shift()!.key);
  const raw=JSON.stringify(r);
  for(;;){try{store.setItem(key,raw);return true;}catch{if(!keys.length)return false;store.removeItem(keys.shift()!.key);}}
 }catch{return false;}
}
export function clearReportCache(stores:Store[]){for(const s of stores){for(const k of storeKeys(s)){if(k.startsWith('gx-ai-v')||k.startsWith('gx-ai-paused:')||k.startsWith('gx-ai-draft-v1:'))s.removeItem(k);}}}
export type QueueState={reports:Record<string,AIReport>;drafts:Record<string,AIDraft>;focus?:string;busy:string;progress:string;errors:Record<string,string>;ready:boolean;paused:boolean;storageWarning:string};
export type QueueEnvironment={loadDrafts?:()=>Record<string,AIDraft>;saveDraft?:(id:string,d:AIDraft|null)=>void;load:()=>Record<string,AIReport>;save:(id:string,r:AIReport)=>boolean;getPaused:()=>boolean;setPaused:(v:boolean)=>void;request:(q:AIQuery,signal:AbortSignal,onProgress:(draft:AIDraft,label:string)=>void,prior?:AIDraft)=>Promise<AIReport>};
export class AIReportQueue{
 private state:QueueState={reports:{},drafts:{},busy:'',progress:'',errors:{},ready:false,paused:false,storageWarning:''};
 private listeners=new Set<()=>void>();private controller:AbortController|null=null;private pending:AIQuery[]=[];private promise:Promise<void>|null=null;
 constructor(private env:QueueEnvironment){}
 getSnapshot=()=>this.state;
 subscribe=(fn:()=>void)=>{this.listeners.add(fn);return()=>{this.listeners.delete(fn);};};
 private update(patch:Partial<QueueState>){this.state={...this.state,...patch};this.listeners.forEach(fn=>fn());}
 hydrate(){if(this.state.ready)return;const drafts=this.env.loadDrafts?.()||{};this.update({reports:this.env.load(),drafts,focus:queryKey(defaultReportQueries()[0]),paused:this.env.getPaused(),ready:true});}
 run=(queries:AIQuery[])=>{
  this.hydrate();
  for(const q of queries){const id=queryKey(q);if(!this.state.reports[id]&&id!==this.state.busy&&!this.pending.some(p=>queryKey(p)===id))this.pending.push(q);}
  if(this.controller)return this.promise||Promise.resolve();
  if(!this.pending.length)return Promise.resolve();
  this.env.setPaused(false);this.update({paused:false});
  const controller=new AbortController();this.controller=controller;
  this.promise=this.drain(controller);return this.promise;
 };
 private async drain(controller:AbortController){let completed=0;try{
  while(this.pending.length&&!controller.signal.aborted){
   const q=this.pending.shift()!,id=queryKey(q);if(this.state.reports[id])continue;
   this.update({busy:id,focus:id,progress:`正在为你生成 ${q.year} 年${q.month?` ${q.month} 月`:''}详批 · 本轮 ${completed+1}/${completed+1+this.pending.length}，完成一部分就可以先读`,errors:{...this.state.errors,[id]:''}});
   try{const r=await this.env.request(q,controller.signal,(draft,label)=>{
     if(controller.signal.aborted)return;
     this.env.saveDraft?.(id,draft);
     this.update({drafts:{...this.state.drafts,[id]:draft},progress:`${q.year} 年${q.month?` ${q.month} 月`:''} · ${label}，可以先往下阅读`});
    },this.state.drafts[id]);if(controller.signal.aborted){this.pending.unshift(q);break;}if(!validReport(r,id))throw Error('报告尚未完整生成，请重试。');
    const saved=this.env.save(id,r);this.env.saveDraft?.(id,null);const drafts={...this.state.drafts};delete drafts[id];this.update({drafts,reports:{...this.state.reports,[id]:r},storageWarning:saved?'':'报告暂存当前页面；浏览器未允许保存，请导出需要保留的内容。'});completed++;
   }catch(e){this.pending.unshift(q);if(!controller.signal.aborted)this.update({errors:{...this.state.errors,[id]:e instanceof Error?e.message:'连接中断，请重试。'},progress:'这份报告暂未完成。已完成章节已保留，重试会接着往下写。'});break;}
  }
 }finally{if(this.controller===controller){this.controller=null;this.promise=null;this.update({busy:'',progress:controller.signal.aborted?'已暂停，已完成的章节仍保留。':!this.pending.length?'报告已生成，已保存的内容会直接复用。':this.state.progress});}}}
 focus=(q:AIQuery)=>this.update({focus:queryKey(q)});
 cancel=()=>{this.env.setPaused(true);this.update({paused:true});this.controller?.abort();};
 dispose=()=>{this.controller?.abort();};
}
export function browserQueue(b:BirthInfo){
 const fp=reportFingerprint(b),pauseKey=`gx-ai-paused:${fp}`;
 const stores=()=>{const all:Store[]=[];try{all.push(sessionStorage);}catch{}try{all.push(localStorage);}catch{}return all;};
 return new AIReportQueue({
  load:()=>readReports(fp,stores()),
  loadDrafts:()=>{
   const result:Record<string,AIDraft>={};const prefix=`gx-ai-draft-v1:${fp}:`;
   for(const store of stores())try{for(const key of storeKeys(store).filter(k=>k.startsWith(prefix))){try{
    const id=key.slice(prefix.length),d=JSON.parse(store.getItem(key)||'null') as AIDraft;
    const parts=id.split('-');const query={scope:parts[0],year:Number(parts[1]),month:Number(parts[2])} as AIQuery;
    if(!/^(annual|monthly)-\d{4}-\d{1,2}$/.test(id)||!d||!Array.isArray(d.completed)||!(d.completed.includes('core')&&validReport(d.report)||d.completed.includes('summary')&&validSummary(d.summary))||d.completed.some(s=>!stagesFor(query).includes(s)))continue;
    if(!result[id]||d.completed.length>result[id].completed.length)result[id]=d;
   }catch{}}}catch{}return result;
  },
  saveDraft:(id,draft)=>{
   const key=`gx-ai-draft-v1:${fp}:${id}`;
   for(const store of stores())try{
    if(!draft){store.removeItem(key);continue;}
    const keys=storeKeys(store).filter(k=>k.startsWith('gx-ai-draft-v1:')&&k!==key);
    while(keys.length>=12)store.removeItem(keys.shift()!);
    store.setItem(key,JSON.stringify(draft));
   }catch{}
  },
  save:(id,r)=>{try{if(persistReport(localStorage,fp,id,r))return true;}catch{}try{return persistReport(sessionStorage,fp,id,r);}catch{return false;}},
  getPaused:()=>{try{return sessionStorage.getItem(pauseKey)==='1';}catch{return false;}},
  setPaused:v=>{try{if(v)sessionStorage.setItem(pauseKey,'1');else sessionStorage.removeItem(pauseKey);}catch{}},
  request:(query,signal,onProgress,prior)=>generateInStages(query,signal,prior,onProgress,async(stage,partSignal)=>{
   const res=await fetch('/api/ai-reading',{method:'POST',headers:{'Content-Type':'application/json'},signal:partSignal,body:JSON.stringify({birth:{year:b.year,month:b.month,day:b.day,hour:b.hour,gender:b.gender},query,stage})});
   const data=await res.json() as {chunk?:AIChunk;error?:string};if(!res.ok||!data.chunk)throw Error(data.error||'分析暂时不可用，请稍后重试。');return data.chunk;
  })
 });
}
