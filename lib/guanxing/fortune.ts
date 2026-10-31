import { astro } from 'iztro';
import { Solar, Lunar } from 'lunar-javascript';
import type { ZiweiChart, SiHua } from '../ziwei/types';
import { BRANCHES } from '../ziwei/constants';
import { getDaXianIndexForYear } from '../ziwei/yunxian-context';
import { getDaXianSiHua } from '../ziwei/sihua';
import { STAR_NOTES } from './reading';
export type DomainKey = 'wealth'|'career'|'health'|'family'|'love';
export type Tone = 'open'|'steady'|'care'|'mixed';
export type DomainReading = { key:DomainKey; label:string; tone:Tone; headline:string; reading:string; focus:string; evidence:string[] };
export type PeriodReading = { title:string; date:string; year:number; lunarMonth:number; age:number; scope:'yearly'|'monthly'; cycle:string; domains:DomainReading[]; signature:string; range?:string };
export type MonthSegment = { start:string; end:string; report:PeriodReading };
export type MonthReport = { year:number; month:number; title:string; segments:MonthSegment[]; summaries:{key:DomainKey;label:string;text:string;tone:Tone}[] };
export const DOMAIN_LABELS:Record<DomainKey,string>={wealth:'财运',career:'事业',health:'健康',family:'家庭',love:'感情'};
const definitions:{key:DomainKey;palace:string}[]=[{key:'wealth',palace:'财帛'},{key:'career',palace:'官禄'},{key:'health',palace:'疾厄'},{key:'family',palace:'田宅'},{key:'love',palace:'夫妻'}];
const wording:Record<DomainKey,Record<Tone,[string,string,string]>>={
 wealth:{open:['资源打开，重在兑现','传统推演把这一阶段读作资源与合作更容易进入视野的时期，收入议题可能随项目、职责或人脉变化而活跃。机会的价值仍取决于实际回报与兑现条件。','核对报酬、交付和到账条件，把新的机会落到可核实的细节。'],steady:['稳步积累，梳理收支','这一阶段的四化没有对财帛位置形成明显的同宫拉动，传统解读偏向维护既有收入与日常安排。重点是让资源运用更有秩序，而非期待突然跃升。','回顾固定支出与长期计划，优先完成已经有把握的事项。'],care:['收支有牵制，先理清账目','这一阶段财帛相关位置出现化忌牵动，传统解读偏向反复、等待或资源分配上的压力。可能更需要关注回款节奏、共同支出和承诺的边界；这不表示必然破财。','重要金额和责任先核实，不凭运势文案作投资或借贷决定。'],mixed:['进出并见，兼顾机会与成本','财帛位置同时出现助力与牵制信号，传统上常解作“有机会，也有代价”。新增项目、报酬讨论与额外投入可能一起成为这一阶段的主题。','把机会、投入、责任分别写清，避免只看到收入一侧。']},
 career:{open:['适合主动争取与呈现成果','事业位置得到禄、权或科的牵动，传统解读偏向工作可见度、职责或协作机会增加。这是一段可以更主动表达方案、推动已有成果的象征性窗口。','提前准备作品、数据和沟通方案，让能力被具体看见。'],steady:['打磨基本功，稳定推进','事业位置的直接四化牵动较少，传统上偏向持续积累与日常推进。与其频繁变换方向，不如留意已有任务的质量、技能和协作方式。','选择一项关键能力持续练习，按实际反馈调整节奏。'],care:['任务易反复，沟通要更明确','事业相关位置出现化忌牵动，传统上更强调流程阻力、职责不清或反复修改的议题。它不等同于失业或失败，重点在于减少信息落差。','明确优先级、交付边界与验收标准，重要安排留下记录。'],mixed:['机会伴随责任，节奏要稳','事业位置的助力和牵制并见，传统上可读作“能见度上升，也更考验协调”。可能会围绕新的要求、成果展示或职责调整进行更多沟通。','争取机会时同步确认资源，不把所有任务都揽到自己身上。']},
 health:{open:['有意识地建立生活节律','此处的禄、权、科只被解释为主动安排日常生活的主题，不能据此判断体质更好、疾病消失或医疗结果。可以把这一阶段当作重新安排作息和休息的提示。','留意真实的睡眠、精力和身体感受；是否检查与治疗依据医生建议。'],steady:['规律维护，关注真实感受','盘面缺少直接牵动不代表身体没有问题。健康栏只把本期理解为保持日常节律的提醒，不能由命盘判断疾病风险或寿命。','记录睡眠与疲劳情况，身体不适时按现实症状寻求医疗帮助。'],care:['给休息留白，减少过度消耗','传统上将疾厄位置的化忌视作需要留意节奏的象征。本网站不将它转换成患病、受伤或某个器官的问题，也不预测健康恶化。','在紧张安排中留出休息，不用命理结果替代检查或延误就医。'],mixed:['安排与消耗并存，重视平衡','这一位置同时出现不同四化信号，可作“主动安排与休息需求并存”的文化提示。它无法推断任何具体疾病或康复情况。','把精力分配纳入日程，健康决策仍以实际症状和专业意见为准。']},
 family:{open:['适合改善居住与家庭协作','家庭相关位置有助力牵动，传统上偏向生活环境、家庭安排和归属感更受重视。可把它作为共同商量、改善相处习惯的时间提示。','讨论家务分工、共同计划与居住需求，让每个人都有表达空间。'],steady:['日常陪伴，比重大变化更重要','家庭位置较少直接四化牵动，传统解读侧重日常维护。稳定的联系、小事上的支持与清楚的边界，比猜测家庭会发生什么更有意义。','安排一次不被打断的交流，了解家人最近真实的需要。'],care:['家庭事务需协调，先说清期待','家庭相关位置出现牵制，传统上更容易被解释为居住安排、责任或家人期待上的反复。不能据此断言亲人发生灾祸或家庭必然不和。','把分工、费用和时间安排具体化，避免替别人做未经确认的决定。'],mixed:['改善的机会，也伴随磨合','家庭位置的助力与牵制并见，传统上常对应“想调整，但需要共同协商”的主题。居住、照顾与生活习惯可能需要更多耐心。','先确定共同目标，再逐项协商，不一次解决所有分歧。']},
 love:{open:['互动增多，适合主动表达','感情位置有助力牵动，传统上可读作互动、表达与关系议题更活跃。单身者可关注自然的社交机会；已有关系者可主动创造相处时间，但不保证脱单或结婚。','表达自己的真实想法，也尊重对方的意愿和节奏。'],steady:['慢慢建立信任，珍惜日常','感情位置缺少直接四化拉动，传统上偏向稳定经营。关系的进展仍取决于实际互动，不应把平稳理解为没有缘分。','把注意力放在回应、兑现承诺和共同体验上。'],care:['容易多想，及时确认误解','感情相关位置出现化忌牵动，传统上更强调期待、沟通和边界的课题。它不意味着背叛、分手或婚姻失败，不应据此怀疑某个具体的人。','对不确定的事直接而温和地确认，避免用猜测替代对话。'],mixed:['靠近与磨合并存','助力与牵制同时进入感情主题，传统上可理解为互动变多、期待也变多。关系中既有靠近的空间，也需要留意表达方式和各自边界。','讨论彼此愿意投入什么、需要什么，给关系留出调整空间。']}
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
  const starStyle=major.map(s=>STAR_NOTES[s.name]?.theme).filter(Boolean).join(' / ');
  return {key,label:DOMAIN_LABELS[key],tone,headline,reading:reading+(starStyle?` 此位置的${stars}带来「${starStyle}」的象义侧重。`:''),focus,evidence};
 });
 const cycle=dx?`${dx.startAge}–${dx.endAge} 虚岁 · ${dx.palaceName}大限`:age<(chart.daXians[0]?.startAge||1)?'童限 · 不套用成人大限':'超出大限范围 · 仅显示流年流月';
 return {title:`${year} ${h.yearly.heavenlyStem}${h.yearly.earthlyBranch}年`,date,year,lunarMonth:lunar.getMonth(),age,scope,cycle,domains,signature:[year,item.index,item.heavenlyStem,item.earthlyBranch,dxIndex].join('-')};
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
 const summaries=definitions.map(({key})=>{const ds=segments.map(s=>s.report.domains.find(x=>x.key===key)!);const tones=new Set(ds.map(d=>d.tone));const tone:Tone=tones.size>1?'mixed':ds[0]?.tone||'steady';return{key,label:DOMAIN_LABELS[key],text:ds.length?[...new Set(ds.map(d=>d.headline))].join(' → '):'出生前，不作推演',tone};});
 return {year,month,title:`${year} 年 ${month} 月`,segments,summaries};
}
export function monthsFor(mode:'recent'|'future'|'thisYear'|'nextYear',now=new Date()):{year:number;month:number}[]{const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'numeric'}).formatToParts(now);const year=Number(parts.find(p=>p.type==='year')!.value),month=Number(parts.find(p=>p.type==='month')!.value);const start=mode==='recent'?month-1-11:mode==='future'?month:0;const y=year+(mode==='nextYear'?1:0);return Array.from({length:12},(_,i)=>{const d=new Date(Date.UTC(y,start+i,1));return{year:d.getUTCFullYear(),month:d.getUTCMonth()+1};});}
export function exportFortunes(annuals:PeriodReading[],months:MonthReport[]){return '# 观星 · 年度与月度运势\n\n传统文化规则推演，不是对真实事件的保证；健康内容不能用于诊断。\n年度按农历年；月度按公历月，并列出月内农历运限交界。\n\n'+annuals.map(r=>`## ${r.title}（${r.range}）\n\n${r.cycle}\n\n`+r.domains.map(d=>`### ${d.label} · ${d.headline}\n\n${d.reading}\n\n关注：${d.focus}\n\n依据：${d.evidence.join(' ')}`).join('\n\n')).join('\n\n')+'\n\n'+months.map(m=>`## ${m.title}\n\n`+m.segments.map(s=>`### ${s.start} — ${s.end}\n\n`+s.report.domains.map(d=>`**${d.label}：${d.headline}**\n\n${d.reading}\n\n关注：${d.focus}\n\n依据：${d.evidence.join(' ')}`).join('\n\n')).join('\n\n')).join('\n\n')+'\n\n运限计算：https://docs.iztro.com/posts/horoscope\n引擎来源：https://github.com/Renhuai123/ziwei-doushu\n';}
