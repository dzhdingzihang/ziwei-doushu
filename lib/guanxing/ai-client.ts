import type {BirthInfo} from '../ziwei/types';
import type {AIQuery,AIReport} from './ai-types';
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
export function clearReportCache(stores:Store[]){for(const s of stores){for(const k of storeKeys(s)){if(k.startsWith('gx-ai-v')||k.startsWith('gx-ai-paused:'))s.removeItem(k);}}}
export type QueueState={reports:Record<string,AIReport>;busy:string;progress:string;errors:Record<string,string>;ready:boolean;paused:boolean;storageWarning:string};
export type QueueEnvironment={load:()=>Record<string,AIReport>;save:(id:string,r:AIReport)=>boolean;getPaused:()=>boolean;setPaused:(v:boolean)=>void;request:(q:AIQuery,signal:AbortSignal)=>Promise<AIReport>};
export class AIReportQueue{
 private state:QueueState={reports:{},busy:'',progress:'',errors:{},ready:false,paused:false,storageWarning:''};
 private listeners=new Set<()=>void>();private controller:AbortController|null=null;private pending:AIQuery[]=[];private promise:Promise<void>|null=null;
 constructor(private env:QueueEnvironment){}
 getSnapshot=()=>this.state;
 subscribe=(fn:()=>void)=>{this.listeners.add(fn);return()=>{this.listeners.delete(fn);};};
 private update(patch:Partial<QueueState>){this.state={...this.state,...patch};this.listeners.forEach(fn=>fn());}
 hydrate(){if(this.state.ready)return;this.update({reports:this.env.load(),paused:this.env.getPaused(),ready:true});}
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
   this.update({busy:id,progress:`正在为你生成 ${q.year} 年${q.month?` ${q.month} 月`:''}详批 · 本轮 ${completed+1}/${completed+1+this.pending.length}，每份通常需要 1–4 分钟`,errors:{...this.state.errors,[id]:''}});
   try{const r=await this.env.request(q,controller.signal);if(controller.signal.aborted){this.pending.unshift(q);break;}if(!validReport(r,id))throw Error('报告尚未完整生成，请重试。');
    const saved=this.env.save(id,r);this.update({reports:{...this.state.reports,[id]:r},storageWarning:saved?'':'报告暂存当前页面；浏览器未允许保存，请导出需要保留的内容。'});completed++;
   }catch(e){this.pending.unshift(q);if(!controller.signal.aborted)this.update({errors:{...this.state.errors,[id]:e instanceof Error?e.message:'连接中断，请重试。'},progress:'这份报告暂未完成。已完成内容已保留，可继续生成剩余报告。'});break;}
  }
 }finally{if(this.controller===controller){this.controller=null;this.promise=null;this.update({busy:'',progress:controller.signal.aborted?'已暂停，完成的报告仍保留。':!this.pending.length?'报告已生成，已保存的内容会直接复用。':this.state.progress});}}}
 cancel=()=>{this.env.setPaused(true);this.update({paused:true});this.controller?.abort();};
 dispose=()=>{this.controller?.abort();};
}
export function browserQueue(b:BirthInfo){
 const fp=reportFingerprint(b),pauseKey=`gx-ai-paused:${fp}`;
 const stores=()=>{const all:Store[]=[];try{all.push(sessionStorage);}catch{}try{all.push(localStorage);}catch{}return all;};
 return new AIReportQueue({
  load:()=>readReports(fp,stores()),
  save:(id,r)=>{try{if(persistReport(localStorage,fp,id,r))return true;}catch{}try{return persistReport(sessionStorage,fp,id,r);}catch{return false;}},
  getPaused:()=>{try{return sessionStorage.getItem(pauseKey)==='1';}catch{return false;}},
  setPaused:v=>{try{if(v)sessionStorage.setItem(pauseKey,'1');else sessionStorage.removeItem(pauseKey);}catch{}},
  request:async(query,signal)=>{const res=await fetch('/api/ai-reading',{method:'POST',headers:{'Content-Type':'application/json'},signal,body:JSON.stringify({birth:{year:b.year,month:b.month,day:b.day,hour:b.hour,gender:b.gender},query})});const data=await res.json() as {report?:AIReport;error?:string};if(!res.ok||!data.report)throw Error(data.error||'分析暂时不可用，请稍后重试。');return data.report;}
 });
}
