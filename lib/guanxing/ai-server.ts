import {PLAIN_VOICE_SYSTEM,voiceFields,VOICE_REPAIR_SYSTEM,applyVoicePatches} from './ai-voice';
// Server-only orchestration. The provider receives derived chart facts, never a name or birth location/date.
import {claimFields,REPAIR_SYSTEM,applyClaimPatches,safeRepairInput} from './ai-language';
import {buildDetailContext,DETAIL_SYSTEM,validateDetail,detailRepairTasks,applyDetailRepairs,DETAIL_REPAIR_SYSTEM} from './ai-detail';
import {weightedScore,overallScore,SCORE_VERSION} from './scores';
import {generateChart} from '../ziwei/algorithm';
import {getDaXianIndexForYear} from '../ziwei/yunxian-context';
import type {BirthInfo} from '../ziwei/types';
import {annualFortune,monthlyFortune,DOMAIN_LABELS,type DomainKey} from './fortune';
import type {AIQuery,AIReport} from './ai-types';
const KEYS=Object.keys(DOMAIN_LABELS) as DomainKey[];
export class AIError extends Error{constructor(message:string,public status=400){super(message);}}
export function parseAIRequest(raw:unknown):{birth:BirthInfo;query:AIQuery}{
 if(!raw||typeof raw!=='object')throw new AIError('请先生成有效命盘。');
 const {birth:b,query:q}=raw as {birth?:Record<string,unknown>;query?:Record<string,unknown>};
 if(!b||!q)throw new AIError('缺少命盘或查询时间。');
 const {year,month,day,hour,gender}=b;
 if(![year,month,day,hour].every(Number.isInteger)||typeof year!=='number'||typeof month!=='number'||typeof day!=='number'||typeof hour!=='number'||year<1900||year>2099||month<1||month>12||day<1||hour<0||hour>11||!['male','female'].includes(String(gender)))throw new AIError('出生资料格式不正确。');
 const dt=new Date(Date.UTC(year,month-1,day));
 if(dt.getUTCMonth()!==month-1||dt.getUTCDate()!==day||dt.getTime()>Date.now()+86400000)throw new AIError('出生日期无效。');
 if(!['annual','monthly'].includes(String(q.scope))||!Number.isInteger(q.year)||Number(q.year)<year-1||Number(q.year)>2099)throw new AIError('查询年份超出范围。');
 if(q.scope==='monthly'&&(!Number.isInteger(q.month)||Number(q.month)<1||Number(q.month)>12))throw new AIError('请选择有效月份。');
 return {birth:{year,month,day,hour,gender:gender as BirthInfo['gender']},query:{scope:q.scope as AIQuery['scope'],year:Number(q.year),...(q.scope==='monthly'?{month:Number(q.month)}:{})}};
}
export function buildAIContext(birth:BirthInfo,query:AIQuery){
 const chart=generateChart(birth);
 const periods=query.scope==='annual'?(()=>{const r=annualFortune(chart,query.year);return[{range:r.range!,report:r}];})():monthlyFortune(chart,query.year,query.month!).segments.map(s=>({range:`${s.start} 至 ${s.end}`,report:s.report}));
 if(!periods.length)throw new AIError('这个月份早于出生时间，无法生成分析。');
 const bases:Record<string,string>={};
 const contexts=periods.map(({range,report:r},i)=>({id:`period-${i+1}`,range,lunarYear:r.year,lunarMonth:query.scope==='monthly'?r.lunarMonth:undefined,age:r.age,cycle:r.cycle,cycleYears:(()=>{const dx=chart.daXians[getDaXianIndexForYear(chart,r.year)];return dx?{startAge:dx.startAge,endAge:dx.endAge,ordinalYear:r.age-dx.startAge+1,startLunarYear:chart.lunarInfo.lunarYear+dx.startAge-1,endLunarYear:chart.lunarInfo.lunarYear+dx.endAge-1,isFirstYear:r.age===dx.startAge}:null;})(),domains:r.domains.map(d=>({key:d.key,label:d.label,referenceScore:d.score.value,scoreFactors:d.score.factors,facts:d.evidence.map((text,j)=>{const id=`p${i+1}-${d.key}-${j+1}`;bases[id]=text;return{id,text};})}))}));
 const domainScores=KEYS.map(key=>({key,score:query.scope==='annual'?periods[0].report.domains.find(d=>d.key===key)!.score:weightedScore(periods.map(p=>({score:p.report.domains.find(d=>d.key===key)!.score,weight:Math.round((Date.parse(p.range.slice(-10))-Date.parse(p.range.slice(0,10)))/86400000)+1,label:p.range})))}));
 return {detail:query.scope==='annual'?buildDetailContext(chart,query.year):undefined,score:overallScore(domainScores.map(d=>d.score)),domainScores,scoreVersion:SCORE_VERSION,title:query.scope==='annual'?`${query.year} 年度运势`:`${query.year} 年 ${query.month} 月运势`,bases,scope:query.scope,periods:contexts,natal:{wuxingJu:chart.wuxingJuName,mingZhu:chart.mingZhu,shenZhu:chart.shenZhu,palaces:chart.palaces.map(p=>({name:p.name,branch:p.branch,ming:p.isMingGong,shen:p.isShenGong,stars:p.stars.map(s=>({name:s.name,type:s.type,brightness:s.brightnessRaw,mutagen:s.siHua})),selfSihua:p.selfSihua}))}};
}
export type AIContext=ReturnType<typeof buildAIContext>;
const SYSTEM=`你是「观星」的紫微斗数文化解读助手。根据输入的本人命盘、目标年份大限、流年/流月事实和固定评分，写一份直接对本人说的详细生活解读。先弄清五个领域的强弱，综合证据后用生活语言讲出来。不是把技术事实逐条翻译，也不是通用的人生建议。
${PLAIN_VOICE_SYSTEM}
信息边界：只能引用输入已有的星曜/四化/期间，不计算或编造新落宫、流日、吉日、概率、收益、婚期、灾祸、书籍原句或研究。命盘不能证明真实经历，过去月份也只能回顾推演。财运不推荐证券、买卖时点或资产购买，不保证收益或财富级别。健康只写作息、时间和任务安排，不从命盘推断身体好坏、症状、器官、疾病、体质、寿命、怀孕或医疗结果。不能把“健康分低”写成健康预警。关系不认定第三者、背叛或分手；未知婚恋状态时兼顾单身和有伴侣，不假定性取向。儿童写学习、成长、照顾和家庭支持，不套成年人的求职理财婚恋；高龄不假定在职。身体不适按实际症状寻求医疗帮助。
事实口径：本命四化与本期四化不能混淆；大限起止以cycleYears为准，isFirstYear=false时不说本年开始换运。scores是网站固定规则的参考分，原样解释，不自行改分、不写成现实概率；文字不复述数字评分、具体年龄、大限第几年。不要因某个领域低分就把其余全部写差，也不要把每个人都写成留不住钱。
正文安排：
1. overview写250–350字，分2–3段。第一句直接说这一年/这个月整体怎么样，指出最值得把握的事和最费心的事，再说工作、钱、家人或感情之间会怎样互相影响；最后给一个明确安排。不要涉及健康，不罗列术语，不作章节预告。
2. domains五项key依次wealth,career,health,family,love。headline用8–22字的大白话下判断，不用“正财稳健，细水长流”之类四字对仗。analysis年度260–360字、月度180–260字，分2–3段：先讲顺不顺，再讲2个具体表现、造成的实际麻烦或收益，最后讲处理办法。事业区分任务变多、被重用、岗位变化和正式升职；财运区分进账和结余；家庭讲分工、家用、陪伴；感情讲认识人、相处、回应和冲突，结合实际状态用条件句；健康只写日程和休息的具体安排。不要每段都劝“保持平和”。
3. scenario写80–120字，补一个analysis没有展开的日常小场景，有具体的人、事情、问题，结论是可能情景，别假装知道用户经历。watch写1–2个能核对的现象，比如同一份方案反复修改、账款到账时间改变；opportunity、caution、action分别写值得争取什么、哪里别着急、一件具体能做的事，每项25–60字，不互相重复。
4. money分别写earning（钱更容易从哪来）、retention（能否存下）、outflow（哪些开销值得留意），各90–140字。只依据wealth输入，不编造另三个分数；说清楚进账与支出为何可能不同步，别把“有财”写成必赚大钱。
5. basisIds引用本领域facts中的2–5个原id，至少包括本期宫位或四化依据，不引用别的领域。技术证据只保存在这些引用中，正文不写术语。月度分析覆盖全部农历分段，timeline每段80–120字讲具体变化；年度timeline必须为空，不凭空分配月份。
只输出合法JSON，不要Markdown包裹：{"money":{"earning":"内容","retention":"内容","outflow":"内容"},"overview":"全期综述","domains":[{"key":"wealth","headline":"口语标题","analysis":"详细分析","scenario":"具体场景","watch":"现实中可以核对什么","opportunity":"值得争取的事","caution":"注意什么","action":"具体安排","basisIds":["输入事实id"]},...五项],"timeline":[{"periodId":"period-1","reading":"月内这段的安排"},...]}`;
export function validateAIOutput(value:unknown,ctx:AIContext):Omit<AIReport,'version'|'model'|'generatedAt'|'title'>{
 const v=value as Record<string,unknown>;
 function str(x:unknown,max=1800){if(typeof x!=='string'||!x.trim()||x.length>max)throw new AIError('AI 返回内容不完整，请重试。',502);return x.trim();}
 if(!v||!Array.isArray(v.domains)||v.domains.length!==5||!Array.isArray(v.timeline))throw new AIError('AI 返回格式不完整，请重试。',502);
 const domains=KEYS.map(key=>{const d=(v.domains as Record<string,unknown>[]).find(d=>d?.key===key);if(!d||!Array.isArray(d.basisIds)||d.basisIds.length<2||d.basisIds.length>8||d.basisIds.some(id=>typeof id!=='string'||!ctx.bases[id]||!id.includes(`-${key}-`)))throw new AIError('AI 的排盘依据校验未通过，请重试。',502);return{key,score:ctx.domainScores.find(d=>d.key===key)!.score.value,headline:str(d.headline,80),analysis:str(d.analysis),scenario:str(d.scenario,1000),watch:str(d.watch,500),opportunity:str(d.opportunity,500),caution:str(d.caution,500),action:str(d.action,500),basis:[...new Set(d.basisIds as string[])].map(id=>ctx.bases[id])};});
 const timeline=ctx.scope==='monthly'?ctx.periods.map(p=>{const t=(v.timeline as Record<string,unknown>[]).find(t=>t?.periodId===p.id);return{range:p.range,reading:str(t?.reading,800)};}):[];
 const overview=str(v.overview);
 if(claimFields(v).length)throw new AIError('AI 健康描述或财务措辞超出了生活参考范围，请重试。',502);
 if(voiceFields(v).length)throw new AIError('详批文字还需整理，请重试。',502);
 const money=v.money as Record<string,unknown>|undefined;
 if(!money)throw new AIError('AI 财运详批不完整，请重试。',502);
 return {overview,domains,timeline,score:ctx.score,money:{earning:str(money.earning,800),retention:str(money.retention,800),outflow:str(money.outflow,800)}};
}
export async function callAI(ctx:AIContext,key:string,signal?:AbortSignal,fetcher:typeof fetch=fetch):Promise<AIReport>{
 if(!key)throw new AIError('AI 服务尚未配置，请联系网站维护者。',503);
 const abort=AbortSignal.any([AbortSignal.timeout(240000),...(signal?[signal]:[])]);
 async function complete(messages:{role:string;content:string}[],maxTokens:number){
 let response:Response;
 try{response=await fetcher('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',{method:'POST',signal:abort,headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({model:'qwen3.7-plus',messages,response_format:{type:'json_object'},enable_thinking:false,temperature:0.5,max_tokens:maxTokens})});}catch{throw new AIError(abort.aborted?'本次分析已取消或超时，请稍后重试。':'暂时无法连接 AI 服务，请稍后重试。',504);}
 if(!response.ok){throw new AIError(response.status===429?'AI 服务繁忙或额度不足，请稍后重试。':'AI 服务暂时不可用，请稍后重试。',response.status===429?429:502);}
 const data=await response.json() as {choices?:{message?:{content?:string};finish_reason?:string}[]};
 if(data.choices?.[0]?.finish_reason!=='stop')throw new AIError('AI 分析未完整生成，请重试。',502);
 let content:unknown;try{content=JSON.parse(data.choices[0].message?.content||'');}catch{throw new AIError('AI 返回格式异常，请重试。',502);}
 return content;
 }
 async function checkLanguage(value:unknown){
  let checked=value;
  for(let attempt=0;attempt<3;attempt++){
   const fields=claimFields(checked);if(!fields.length)return checked;
   const patch=await complete([{role:'system',content:REPAIR_SYSTEM},{role:'user',content:JSON.stringify({fields:safeRepairInput(fields),attempt:attempt+1,reminder:attempt?'上次仍有不合要求的文字。这次严格只写任务、时间、陪伴、沟通或收支核对，不写任何身体效果或收入保证。':undefined})}],Math.min(9000,1200+fields.length*800));
   try{checked=applyClaimPatches(checked,patch,fields,false);}catch(error){if(attempt===2)throw new AIError(error instanceof Error?error.message:'AI 措辞校验失败，请重试。',502);}
  }
  if(claimFields(checked).length)throw new AIError('个别段落仍需整理，请稍后重试。',502);
  return checked;
 }
 async function checkProse(value:unknown){
  let checked=await checkLanguage(value);
  for(let attempt=0;attempt<3;attempt++){
   const fields=voiceFields(checked);if(!fields.length)return checked;
   const patches=await complete([{role:'system',content:VOICE_REPAIR_SYSTEM},{role:'user',content:JSON.stringify({fields,attempt:attempt+1,reminder:attempt?'这些字段仍有术语、英文或固定套话。这次全部改成日常说话的方式，不复述原来的专业词。':undefined})}],Math.min(16000,1500+fields.reduce((n,f)=>n+Math.ceil(f.text.length*2.5),0)));
   try{checked=applyVoicePatches(checked,patches,fields,false);}catch(e){if(attempt===2)throw new AIError(e instanceof Error?e.message:'详批文字整理失败，请重试。',502);}
   checked=await checkLanguage(checked);
  }
  if(voiceFields(checked).length)throw new AIError('个别段落仍需整理，请稍后重试。',502);
  return checked;
 }
 const [content,detailContent]=await Promise.all([
  complete([{role:'system',content:SYSTEM},{role:'user',content:JSON.stringify({title:ctx.title,scope:ctx.scope,scores:{overall:ctx.score,domains:ctx.domainScores,method:ctx.scoreVersion},natal:ctx.natal,periods:ctx.periods})}],9000).then(value=>checkProse(ctx.scope==='annual'&&value&&typeof value==='object'?{...value,timeline:[]}:value)),
  ctx.detail?complete([{role:'system',content:DETAIL_SYSTEM},{role:'user',content:JSON.stringify({...ctx.detail,bases:undefined})}],14000).then(checkProse):Promise.resolve(undefined)
 ]);
 let detail:AIReport['detail'];
 if(ctx.detail){
  try{detail=validateDetail(detailContent,ctx.detail);}catch{
   const tasks=detailRepairTasks(detailContent,ctx.detail);
   const sections:Record<string,unknown>[]=[];
   // A long multi-section repair sometimes drops rows. Repair one section per call.
   for(let i=0;i<tasks.length;i+=3){
    const batch=await Promise.all(tasks.slice(i,i+3).map(async task=>{
     for(let attempt=0;attempt<2;attempt++){
      const result=await complete([{role:'system',content:DETAIL_REPAIR_SYSTEM},{role:'user',content:JSON.stringify({age:ctx.detail!.age,year:ctx.detail!.year,tasks:[task]})}],2200) as {sections?:Record<string,unknown>[]};
      const rows=result?.sections;
      const row=Array.isArray(rows)?rows.find(r=>r.group===task.group&&r.id===task.id)||(rows.length===1?rows[0]:undefined):undefined;
      const prefix=task.group==='natal'?'natal-':`${task.id}-`;
      if(row&&typeof row.headline==='string'&&row.headline.trim()&&row.headline.length<=100&&typeof row.reading==='string'&&row.reading.length>=task.minimumCharacters-30&&row.reading.length<=1800&&Array.isArray(row.basisIds)&&new Set(row.basisIds).size>=2&&row.basisIds.length<=8&&row.basisIds.every(id=>typeof id==='string'&&id.startsWith(prefix)&&!!ctx.detail!.bases[id]))return{...row,group:task.group,id:task.id};
     }
     throw new AIError('个别段落暂未补全，请稍后重试。',502);
    }));sections.push(...batch);
   }
   const patched={sections};
   try{detail=validateDetail(await checkProse(applyDetailRepairs(detailContent,patched,ctx.detail)),ctx.detail);}catch(error){throw new AIError(error instanceof Error?error.message:'详批生成不完整，请重试。',502);}
  }
 }
 const checked=validateAIOutput(content,ctx);
 return{version:4,detail,title:ctx.title,model:'qwen3.7-plus',generatedAt:new Date().toISOString(),...checked};
}
