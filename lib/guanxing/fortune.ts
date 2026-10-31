import {calculateScore,weightedScore,overallScore,type FortuneScore} from './scores';
import { astro } from 'iztro';
import { Solar, Lunar } from 'lunar-javascript';
import type { ZiweiChart, SiHua } from '../ziwei/types';
import { BRANCHES } from '../ziwei/constants';
import { getDaXianIndexForYear } from '../ziwei/yunxian-context';
import { getDaXianSiHua } from '../ziwei/sihua';
export type DomainKey = 'wealth'|'career'|'health'|'family'|'love';
export type Tone = 'open'|'steady'|'care'|'mixed';
export type DomainReading = { key:DomainKey; label:string; tone:Tone; headline:string; reading:string; focus:string; evidence:string[];score:FortuneScore };
export type PeriodReading = { title:string; date:string; year:number; lunarMonth:number; age:number; scope:'yearly'|'monthly'; cycle:string; domains:DomainReading[]; signature:string; range?:string;score:number };
export type MonthSegment = { start:string; end:string; report:PeriodReading };
export type MonthReport = { year:number; month:number; title:string; segments:MonthSegment[]; summaries:{key:DomainKey;label:string;text:string;tone:Tone;score:FortuneScore}[];score:number };
export const DOMAIN_LABELS:Record<DomainKey,string>={wealth:'财运',career:'事业',health:'健康',family:'家庭',love:'感情'};
const definitions:{key:DomainKey;palace:string}[]=[{key:'wealth',palace:'财帛'},{key:'career',palace:'官禄'},{key:'health',palace:'疾厄'},{key:'family',palace:'田宅'},{key:'love',palace:'夫妻'}];
const wording:Record<DomainKey,Record<Tone,[string,string,string]>>={
 "wealth": {
  "open": [
   "赚钱的机会多些，先谈清报酬",
   "这一阶段更值得留意新的项目、合作和报酬讨论。有人找你帮忙，或者原来的工作多出一项收入来源，都可以认真了解。先问清要做多少事、何时结账，再判断这笔钱值不值得赚。",
   "拿到一份合作方案后，先列出报酬、成本和到账时间。"
  ],
  "steady": [
   "收入以稳为主，少花冤枉钱",
   "这一阶段的重点是把已有收入和日常开销安排好。比起到处找新机会，先把手上的事情做完、该收的钱收回，更容易看清自己能留下多少。",
   "翻一遍最近的账单，找出一项用不上的固定开销。"
  ],
  "care": [
   "钱的事容易拖，收支要盯紧",
   "钱的安排可能比预想费心：约好的款项需要再确认，或者一笔共同支出迟迟没说清楚。先弄清自己要付多少、对方什么时候付，别因为不好意思开口，把问题一直搁着。",
   "大笔支出前核实金额与责任，给付款时间留些余地。"
  ],
  "mixed": [
   "有进账机会，也容易多花钱",
   "新的赚钱机会可能伴着新的投入，比如要先买工具、请人帮忙，或者花更多时间。只看报酬数字容易心动，扣掉成本和时间，再看看是否值得接。",
   "把每个机会的预计收入和投入写在一起，再作决定。"
  ]
 },
 "career": {
  "open": [
   "有事值得争取，让人看见你的本事",
   "这段时间可以多留意表现能力的机会。比如把做好的方案拿出来讨论，或者主动申请一件自己有把握的事。任务增加与正式升职是两回事，接之前要问清职责和支持。",
   "准备一份做过的成果，找合适的人谈下一步。"
  ],
  "steady": [
   "工作慢慢往前，先把手头事做好",
   "工作更适合按计划推进。进展不一定一下就很明显，重复做的小事也可能影响别人对你的信任。先把最重要的任务交好，再根据反馈调整，不必每天换方向。",
   "挑出本周最重要的一件事，安排固定时间完成。"
  ],
  "care": [
   "事情可能反复，先问清要求",
   "工作上需要多花时间确认要求。同一件事反复改、几个人说法不一致，都可能拖慢进度。着急开始之前，先确认谁作决定、做到什么程度算完成。",
   "把截止时间和验收要求写下来，交给相关的人确认。"
  ],
  "mixed": [
   "有新机会，但别什么都揽下来",
   "新的任务可能让你更容易被注意到，也会增加沟通和协调的时间。争取机会时，把自己能做什么、还需要谁配合说清楚，别先答应一大堆再独自扛着。",
   "接新任务时，一起确认能获得的人手和时间。"
  ]
 },
 "health": {
  "open": [
   "把作息排好，给自己留点空闲",
   "这一栏只提醒你怎样安排日常。可以重新看看每天的时间花在了哪里，把吃饭、休息和不处理工作消息的时段先排进去，再安排其他事。分数不能判断身体好坏。",
   "给日历留一段没有任务的时间，不把一天排满。"
  ],
  "steady": [
   "按时吃饭休息，别总往后拖",
   "这段时间可以从保持日常安排做起。忙完一件事再吃饭、看完消息再休息，很容易一拖再拖。先给这些日常小事定个时间，遇到临时任务再商量调整。",
   "把吃饭和休息当作日程的一部分。"
  ],
  "care": [
   "事情多也别硬撑，留出休息时间",
   "这一栏的重点是别把日程排得太满。遇到几件事同时来，先分清哪些今天必须做、哪些能延后。没有空档时，就少接一件事。这里不预测疾病，也不以分数判断身体状况。",
   "删掉或延后一件不急的事，给自己留一个空档。"
  ],
  "mixed": [
   "想做的事多，别挤掉休息时间",
   "可能会有不少想推进的安排。答应新的邀约或任务之前，先看看它会占用哪段时间。原本留给休息的空档，也应该像工作约定一样受到重视。",
   "每天只挑几件重要的事，剩下的排到以后。"
  ]
 },
 "family": {
  "open": [
   "家里的事适合坐下来一起商量",
   "想改变居住习惯、调整家务分工，可以找时间和家人一起商量。先听清每个人在意什么，再从一件小事开始做，比一个人替全家作决定更容易得到配合。",
   "找个大家不赶时间的时候，商量一项家里的安排。"
  ],
  "steady": [
   "家里以平稳为主，多陪伴就好",
   "家里的重点在平时相处。一次认真听对方说话、顺手分担一件家务，比一直等有空再陪伴更实在。也可以问问家人最近有什么需要帮忙的事。",
   "安排一次不看手机的吃饭或聊天。"
  ],
  "care": [
   "家务家用容易有分歧，提前说清",
   "家庭安排可能需要反复商量，尤其是谁出钱、谁出时间、谁负责照顾。别把自己的想法当成大家都同意的决定，把事情拆开，一项一项确认。",
   "把费用和分工说具体，避免只说“到时再看”。"
  ],
  "mixed": [
   "想把家里安排好，还得互相让一步",
   "家里有些事想调整，但每个人的习惯和期待可能不一样。先找大家都愿意做的一小步，试过再改；不要一次把所有旧问题都翻出来。",
   "先商量一件共同在意的小事，并约好回头看看效果。"
  ]
 },
 "love": {
  "open": [
   "多些接触和表达，关系更有机会往前",
   "单身时，可以留意自然认识人的机会，聊得来就多了解一些。有伴侣时，适合主动安排相处时间，把关心说出来。关系能走到哪一步，还要看双方的回应和意愿。",
   "约一次轻松的见面，认真听听对方最近在想什么。"
  ],
  "steady": [
   "感情慢慢来，重在平时的回应",
   "关系更适合靠日常相处慢慢积累。单身不用催着自己得出结果；有伴侣也别因为熟悉了，就省去回应和关心。答应的小事有没有做到，往往比说了多少好听的话更重要。",
   "把一件答应过对方的小事认真完成。"
  ],
  "care": [
   "别光靠猜，不明白就好好问",
   "相处中更需要确认彼此的想法。对方回复慢、临时改安排，不一定是你猜的原因。先把实际发生的事说清，再问对方怎么想，别把猜测当成结论。",
   "用具体事情开口，少用“你总是”或“你从来不”。"
  ],
  "mixed": [
   "有靠近的机会，也要磨合相处方式",
   "接触增多时，期待和分歧也可能一起出现。单身时慢慢了解彼此习惯；有伴侣时，把相处时间和各自需要的空间谈清楚，别要求对方自动懂你。",
   "说出一个自己的需要，也问问对方需要什么。"
  ]
 }
};
const cache=new WeakMap<ZiweiChart,ReturnType<typeof astro.bySolar>>();
function getAstrolabe(chart:ZiweiChart){let a=cache.get(chart);if(!a){const b=chart.birthInfo;a=astro.bySolar(`${b.year}-${b.month}-${b.day}`,b.hour,b.gender==='male'?'男':'女',true,'zh-CN');cache.set(chart,a);}return a;}
const chars:SiHua[]=['禄','权','科','忌'];
function dateString(y:number,m:number,d:number){return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;}
function solarString(s:Solar){return dateString(s.getYear(),s.getMonth(),s.getDay());}
export function fortuneAt(chart:ZiweiChart,date:string,scope:'yearly'|'monthly'):PeriodReading{
 const [y,m,d]=date.split('-').map(Number);const lunar=Solar.fromYmd(y,m,d).getLunar();const year=lunar.getYear();
 if(year<chart.lunarInfo.lunarYear||year>2099)throw new RangeError('查询时间需在出生后，且不晚于 2099 年。');
 const h=getAstrolabe(chart).horoscope(date,6);const item=h[scope];const age=year-chart.lunarInfo.lunarYear+1;
 const dxIndex=getDaXianIndexForYear(chart,year);const dx=chart.daXians[dxIndex];const dxHua=dxIndex>=0?getDaXianSiHua(chart,dxIndex):null;
 const label=scope==='yearly'?'流年':'流月';
 const domains=definitions.map(({key,palace})=>{
  const idx=item.palaceNames.findIndex(p=>p===palace);const branch=(idx+2)%12;const p=chart.palaces.find(p=>p.branch===branch)!;const own=p.stars.filter(s=>s.type==='major');const opposite=chart.palaces.find(p=>p.branch===(branch+6)%12)!;const major=own.length?own:opposite.stars.filter(s=>s.type==='major');
  const layers:{label:string;mutagen:string[]}[]=[{label,mutagen:item.mutagen}];
  if(scope==='monthly')layers.push({label:'流年背景',mutagen:h.yearly.mutagen});
  if(dxHua)layers.push({label:'大限背景',mutagen:chars.map(c=>dxHua.transforms[c])});
  const signals:{label:string;star:string;hua:SiHua;opposite:boolean}[]=[];
  for(const layer of layers)layer.mutagen.forEach((star,i)=>{if(p.stars.some(s=>s.name===star))signals.push({label:layer.label,star,hua:chars[i],opposite:false});else if(i===3&&opposite.stars.some(s=>s.name===star))signals.push({label:layer.label,star,hua:'忌',opposite:true});});
  const focusSignals=signals.filter(s=>s.label===label);const scoped=focusSignals.length?focusSignals:signals;const positive=scoped.some(s=>s.hua!=='忌');const caution=scoped.some(s=>s.hua==='忌');const tone:Tone=positive&&caution?'mixed':caution?'care':positive?'open':'steady';
  const [headline,reading,focus]=wording[key][tone];const stars=major.map(s=>s.name).join('、');
  const evidence=[`${label}${palace}宫落${BRANCHES[branch]}，叠本命${p.name}。`,`${own.length?'本宫主星':'本宫空宫，借对宫主星'}：${stars||'无'}。`,...signals.map(s=>`${s.label}：${s.star}化${s.hua}${s.opposite?'在对宫冲照':'同宫'}。`)];
  if(!signals.length)evidence.push('本期、流年背景与所选大限未出现该位置同宫四化或对宫化忌。');
  return {key,label:DOMAIN_LABELS[key],tone,headline,score:calculateScore(p.stars,major,!own.length,signals,label),reading,focus,evidence};
 });
 const cycle=dx?`${dx.startAge}–${dx.endAge} 虚岁 · ${dx.palaceName}大限`:age<(chart.daXians[0]?.startAge||1)?'童限 · 不套用成人大限':'超出大限范围 · 仅显示流年流月';
 return {title:`${year} ${h.yearly.heavenlyStem}${h.yearly.earthlyBranch}年`,date,year,lunarMonth:lunar.getMonth(),age,scope,cycle,domains,score:overallScore(domains.map(d=>d.score)),signature:[year,item.index,item.heavenlyStem,item.earthlyBranch,dxIndex].join('-')};
}
export function annualFortune(chart:ZiweiChart,year:number){if(!Number.isInteger(year)||year<chart.lunarInfo.lunarYear||year>2099)throw Error('年份超出可查询范围。');const start=Lunar.fromYmd(year,1,1).getSolar();const next=Lunar.fromYmd(year+1,1,1).getSolar();const end=new Date(Date.UTC(next.getYear(),next.getMonth()-1,next.getDay()-1));const b=chart.birthInfo.origInput||chart.birthInfo;const born=dateString(b.year,b.month,b.day);const begin=solarString(start)<born?born:solarString(start);const r=fortuneAt(chart,begin,'yearly');r.range=`${begin} 至 ${dateString(end.getUTCFullYear(),end.getUTCMonth()+1,end.getUTCDate())}`;return r;}
export function monthlyFortune(chart:ZiweiChart,year:number,month:number):MonthReport{
 if(!Number.isInteger(year)||!Number.isInteger(month)||month<1||month>12||year<1900||year>2099)throw Error('月份超出可查询范围。');
 const days=new Date(Date.UTC(year,month,0)).getUTCDate();const segments:MonthSegment[]=[];let key='';
 const b=chart.birthInfo.origInput||chart.birthInfo;const birthDate=dateString(b.year,b.month,b.day);
 for(let d=1;d<=days;d++){
  const date=dateString(year,month,d);if(date<birthDate)continue;
  const l=Solar.fromYmd(year,month,d).getLunar();const current=[l.getYear(),l.getMonth(),l.getMonth()<0&&l.getDay()>15?'late':'early'].join('-');
  if(current!==key){const report=fortuneAt(chart,date,'monthly');segments.push({start:date,end:date,report});key=current;}else segments[segments.length-1].end=date;
 }
 const summaries=definitions.map(({key})=>{const ds=segments.map(s=>s.report.domains.find(x=>x.key===key)!);const tones=new Set(ds.map(d=>d.tone));const tone:Tone=tones.size>1?'mixed':ds[0]?.tone||'steady';const score=weightedScore(segments.map((s,i)=>({score:ds[i].score,weight:Math.round((Date.parse(s.end)-Date.parse(s.start))/86400000)+1,label:`${s.start}—${s.end}`})));return{key,label:DOMAIN_LABELS[key],score,text:ds.length?[...new Set(ds.map(d=>d.headline))].join(' → '):'出生前，不作推演',tone};});
 return {year,month,title:`${year} 年 ${month} 月`,segments,summaries,score:overallScore(summaries.map(d=>d.score))};
}
export function monthsFor(mode:'recent'|'future'|'thisYear'|'nextYear',now=new Date()):{year:number;month:number}[]{const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'numeric'}).formatToParts(now);const year=Number(parts.find(p=>p.type==='year')!.value),month=Number(parts.find(p=>p.type==='month')!.value);const start=mode==='recent'?month-1-11:mode==='future'?month:0;const y=year+(mode==='nextYear'?1:0);return Array.from({length:12},(_,i)=>{const d=new Date(Date.UTC(y,start+i,1));return{year:d.getUTCFullYear(),month:d.getUTCMonth()+1};});}
export function exportFortunes(annuals:PeriodReading[],months:MonthReport[]){return '# 观星 · 年度与月度运势\n\n传统文化规则推演，不是对真实事件的保证；健康内容不能用于诊断。\n年度按农历年；月度按公历月，并列出月内农历运限交界。\n\n'+annuals.map(r=>`## ${r.title}（${r.range}）\n\n${r.cycle} · 总分 ${r.score}/100（命理参考指数，非概率）\n\n`+r.domains.map(d=>`### ${d.label} · ${d.score.value}/100 · ${d.headline}\n\n${d.reading}\n\n关注：${d.focus}\n\n依据：${d.evidence.join(' ')}`).join('\n\n')).join('\n\n')+'\n\n'+months.map(m=>`## ${m.title} · 总分 ${m.score}/100（命理参考指数）\n\n`+m.segments.map(s=>`### ${s.start} — ${s.end}\n\n`+s.report.domains.map(d=>`**${d.label}：${d.score.value}/100 · ${d.headline}**\n\n${d.reading}\n\n关注：${d.focus}\n\n依据：${d.evidence.join(' ')}`).join('\n\n')).join('\n\n')).join('\n\n')+'\n\n运限计算：https://docs.iztro.com/posts/horoscope\n引擎来源：https://github.com/Renhuai123/ziwei-doushu\n';}
