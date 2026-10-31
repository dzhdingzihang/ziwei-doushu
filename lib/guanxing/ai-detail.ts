import {PLAIN_VOICE_SYSTEM,voiceFields} from './ai-voice';
import {claimFields} from './ai-language';
import type {ZiweiChart} from '../ziwei/types';
import {getDaXianIndexForYear} from '../ziwei/yunxian-context';
import {getDaXianSiHua} from '../ziwei/sihua';
import {BRANCHES} from '../ziwei/constants';
import {annualFortune,monthlyFortune} from './fortune';
import type {AIDetail} from './ai-types';

export function buildDetailContext(chart:ZiweiChart,year:number){
 const bases:Record<string,string>={};
 const fact=(id:string,text:string)=>{bases[id]=text;return{id,text};};
 const natal=chart.palaces.map((p,i)=>fact(`natal-${i}`,`本命${p.name}（${BRANCHES[p.branch]}）${p.isMingGong?'，命宫':''}${p.isShenGong?'，身宫':''}：${p.stars.map(s=>`${s.name}${s.brightnessRaw||''}${s.siHua?`本命化${s.siHua}`:''}`).join('、')||'空宫'}。`));
 const index=getDaXianIndexForYear(chart,year);
 const indices=index>=0?[index-1,index,index+1]:year<chart.lunarInfo.lunarYear+(chart.daXians[0]?.startAge||1)-1?[0]:[];
 const cycles=indices.filter(i=>i>=0&&i<chart.daXians.length).map(i=>{
  const dx=chart.daXians[i],p=chart.palaces.find(p=>p.branch===dx.palaceBranch)!;
  const hua=getDaXianSiHua(chart,i);
  const startYear=chart.lunarInfo.lunarYear+dx.startAge-1,endYear=chart.lunarInfo.lunarYear+dx.endAge-1;
  return{id:`cycle-${i}`,label:i===index?'本阶段':i<index?'上一阶段':'下一阶段',range:`${startYear}–${endYear} 年（农历年）`,ageRange:`${dx.startAge}–${dx.endAge} 虚岁`,facts:[fact(`cycle-${i}-palace`,`${dx.palaceName}大限落${BRANCHES[dx.palaceBranch]}，本宫星曜：${p.stars.map(s=>s.name).join('、')||'空宫'}。`),fact(`cycle-${i}-hua`,`此大限四化：${Object.entries(hua?.transforms||{}).map(([h,s])=>`${s}化${h}`).join('、')}。`)]};
 });
 const years=Array.from({length:Math.min(10,2100-year)},(_,i)=>{
  const r=annualFortune(chart,year+i);
  return{id:`year-${r.year}`,year:r.year,age:r.age,score:r.score,cycle:r.cycle,range:r.range!,domains:r.domains.map(d=>({key:d.key,label:d.label,score:d.score.value,facts:d.evidence.map((s,j)=>fact(`year-${r.year}-${d.key}-${j}`,s))}))};
 });
 const months=Array.from({length:12},(_,i)=>monthlyFortune(chart,year,i+1)).filter(m=>m.segments.length).map(m=>({
  id:`month-${year}-${m.month}`,year,month:m.month,age:m.segments[0].report.age,score:m.score,domainScores:m.summaries.map(d=>({key:d.key,score:d.score.value})),
  segments:m.segments.map((s,i)=>({range:`${s.start} 至 ${s.end}`,lunarYear:s.report.year,lunarMonth:s.report.lunarMonth,cycle:s.report.cycle,domains:s.report.domains.map(d=>({key:d.key,score:d.score.value,facts:d.evidence.map((text,j)=>fact(`month-${year}-${m.month}-p${i}-${d.key}-${j}`,text))}))}))
 }));
 return{year,age:year-chart.lunarInfo.lunarYear+1,natal,cycles,years,months,bases};
}
export type DetailContext=ReturnType<typeof buildDetailContext>;
export const DETAIL_SYSTEM=`你为「观星」写一份有连贯叙述的紫微斗数个人详批。${PLAIN_VOICE_SYSTEM}\n输入是本人的真实本命宫位、相邻大限、十年流年以及所选公历年逐月分段。直接用“你”交流，像认真解释一张命盘，先给主判断，再把依据翻译成具体生活情景。既讲有利的一面，也讲相应的成本或盲点；不要每段重复“有机会也有挑战”。不同人和不同年份必须由各自输入得到不同结论。明确区分赚钱机会与能否留住钱、职责增加与实际晋升。不能仅凭命盘知道真实经历，过去也用回顾性推演；不把未提供的职业、婚姻、收入当事实，不编造学历/结婚/失业年份，不承诺财富级别、疾病、寿命、灾祸、外貌、第三者或补五行后的效果。没有八字输入，不得使用身强、食神、劫财、偏印格等八字结论。不要抄写某个示例人的特征。
只能引用输入里的事实，不自行计算四化、流日或吉日。大限起止、年龄、年份以输入为准，比较前后阶段的侧重点，不保证换大限自动转好。年份必须写具体年份，不用今年/明年代指；公历月可能包含不同农历年份/月份，须综合每个分段，不能把公历1月等同农历正月。分数原样解释，不输出自己发明的分数、概率或收益。健康只给繁忙日程、休息安排的生活参考，不判断疾病、症状、身体好坏或器官，星曜不是医学依据。幼年以成长学习和家庭支持描述，高龄不假设仍在职；感情兼顾未知关系状态，不假定性取向。
只输出JSON，结构如下：
{"natal":[{"id":"character","headline":"性格与做事方式的明确主题","reading":"200-280字，优势、盲点与真实可观察表现，把做事习惯讲成生活表现，不说宫位星名","basisIds":["natal-..."]},{"id":"work","headline":"事业与求财方式","reading":"200-280字，能力如何发挥、资源如何变成收入、什么情况容易有投入而少积累","basisIds":["natal-..."]},{"id":"relationship","headline":"家庭与感情相处","reading":"200-280字，表达、边界、家庭分工以及可能的磨合方式","basisIds":["natal-..."]}],"cycles":[{"id":"输入cycle id","headline":"22字内口语阶段判断","reading":"150-210字，解释这一大限的重心，和相邻阶段的具体差别，明确什么事更容易办成、什么事更费力，不预设都向好","basisIds":["对应cycle的事实id"]}],"years":[{"id":"输入year id","headline":"22字内口语年度判断","reading":"110-160字，明确相对于相邻年的变化，事业/财运主要情景，以及家庭或感情最需要注意的变化；强弱必须符合所给分数与事实","basisIds":["对应year的事实id"]}],"months":[{"id":"输入month id","headline":"22字内口语本月判断","reading":"180-250字，以连贯段落讲事业、收入与支出、家庭/感情的侧重，再给一项具体安排；重点领域多写，平稳领域简写；存在分段差异需写具体日期范围与变化，不能一律同一句模板","basisIds":["对应month的事实id"]}]}
逐月不能仅写“财旺、注意口舌、平稳”几个标签；每月先下判断，再展开2个最突出的生活方面，最后说一件本月适合安排的事。月份之间可以有相同主题，但具体细节不能照抄。每个natal条目引用2-4个本命事实；每个cycle引用自己的2个事实；每个year和month引用2-5个自己的事实，至少包含两个不同生活领域。cycles/years/months条目必须和输入一一对应、全部覆盖，不得省略或重复。不要返回输入数据原文，写你的综合解释。`;

export function validateDetail(value:unknown,ctx:DetailContext):AIDetail{
 const v=value as Record<string,unknown>;
 const fail=(reason='字段缺失')=>{throw new Error(`详批校验未通过（${reason}），请重试。`);};
 const str=(x:unknown,min=1,max=1800)=>{if(typeof x!=='string'||x.trim().length<min||x.length>max)return fail(`段落长度需为 ${min}–${max} 字`);return x.trim();};
 function read(raw:unknown,expected:string[],prefix:(id:string)=>string,min:number){
  if(!Array.isArray(raw)||raw.length!==expected.length)return fail(`${expected[0]||'空章节'} 数量不完整`);
  if(new Set(raw.map(x=>x?.id)).size!==expected.length)return fail('章节重复');
  return expected.map(id=>{const r=raw.find(x=>x?.id===id);if(!r||!Array.isArray(r.basisIds)||new Set(r.basisIds).size<2||r.basisIds.length>8||r.basisIds.some((b:unknown)=>typeof b!=='string'||!b.startsWith(prefix(id))||!ctx.bases[b]))return fail(`${id} 引用不匹配`);return{id,headline:str(r.headline,1,100),reading:str(r.reading,min),basis:[...new Set(r.basisIds as string[])].map(b=>ctx.bases[b])};});
 }
 if(!v||claimFields(v).length||voiceFields(v).length)return fail();
 const natal=read(v.natal,['character','work','relationship'],()=> 'natal-',80);
 const cycles=read(v.cycles,ctx.cycles.map(c=>c.id),id=>`${id}-`,60).map((r,i)=>({...r,label:ctx.cycles[i].label,range:ctx.cycles[i].range,ageRange:ctx.cycles[i].ageRange}));
 const years=read(v.years,ctx.years.map(y=>y.id),id=>`${id}-`,40).map((r,i)=>({...r,year:ctx.years[i].year,score:ctx.years[i].score,domainScores:ctx.years[i].domains.map(d=>({key:d.key,score:d.score}))}));
 const months=read(v.months,ctx.months.map(m=>m.id),id=>`${id}-`,70).map((r,i)=>({...r,year:ctx.months[i].year,month:ctx.months[i].month,score:ctx.months[i].score,domainScores:ctx.months[i].domainScores,ranges:ctx.months[i].segments.map(s=>`${s.range} · 农历 ${s.lunarYear} 年 ${s.lunarMonth<0?'闰':''}${Math.abs(s.lunarMonth)} 月`)}));
 return{natal,cycles,years,months};
}

// Repair only incomplete sections; retain already valid generated prose.
export function detailRepairTasks(value:unknown,ctx:DetailContext){
 const v=value as Record<string,unknown>;
 const groups=[
  {group:'natal',items:['character','work','relationship'].map(id=>({id,facts:ctx.natal})),min:80},
  {group:'cycles',items:ctx.cycles,min:60},
  {group:'years',items:ctx.years,min:40},
  {group:'months',items:ctx.months,min:70}
 ];
 return groups.flatMap(({group,items,min})=>items.flatMap(item=>{
  const rows=Array.isArray(v?.[group])?v[group] as Record<string,unknown>[]:[];
  const row=rows.find(r=>r.id===item.id);
  const prefix=group==='natal'?'natal-':`${item.id}-`;
  const valid=row&&typeof row.headline==='string'&&row.headline.trim()&&typeof row.reading==='string'&&row.reading.trim().length>=min&&row.reading.length<=1800&&Array.isArray(row.basisIds)&&new Set(row.basisIds).size>=2&&row.basisIds.length<=8&&row.basisIds.every(id=>typeof id==='string'&&id.startsWith(prefix)&&!!ctx.bases[id]);
  return valid?[]:[{group,id:item.id,minimumCharacters:min+30,context:item}];
 }));
}
export function applyDetailRepairs(value:unknown,repair:unknown,ctx:DetailContext){
 const tasks=detailRepairTasks(value,ctx);const patches=(repair as {sections?:Record<string,unknown>[]})?.sections;
 if(!Array.isArray(patches)||patches.length!==tasks.length)throw Error('详批补全未完成，请重试。');
 const out=structuredClone(value) as Record<string,unknown>;
 for(const task of tasks){const matches=patches.filter(p=>p.group===task.group&&p.id===task.id);if(matches.length!==1)throw Error('详批补全条目不匹配，请重试。');const rows=Array.isArray(out[task.group])?out[task.group] as Record<string,unknown>[]:[];out[task.group]=[...rows.filter(r=>r.id!==task.id),matches[0]];}
 const ids={natal:['character','work','relationship'],cycles:ctx.cycles.map(x=>x.id),years:ctx.years.map(x=>x.id),months:ctx.months.map(x=>x.id)};
 for(const [group,expected] of Object.entries(ids)){const rows=out[group] as Record<string,unknown>[];out[group]=expected.map(id=>rows?.find(r=>r.id===id));}
 return out;
}
export const DETAIL_REPAIR_SYSTEM=`${PLAIN_VOICE_SYSTEM}\n你为紫微斗数详批补全指定段落。只返回要求的tasks，每项使用给定context里的真实事实。按根级age适配，儿童只写学习成长和家庭支持，高龄不默认在职。用自然中文给出明确侧重、具体生活情景和可执行安排，至少达到minimumCharacters字。natal的character写性格做事方式，work写事业求财，relationship写家庭感情；cycles写大限重心；years写年度变化；months写公历月内变化。不可编造医学、症状、器官、体质、寿命或收益保证，不使用八字结论。每项basisIds必须从该context中的facts原样选择2-4个不同id；年份和月份的事实在domains或segments内。不要创造或改写id。仅返回JSON：{"sections":[{"group":"原group","id":"原id","headline":"16字内主题","reading":"完整详批段落","basisIds":["原事实id"]}]}。`;
