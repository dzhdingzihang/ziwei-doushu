// Server-only orchestration. The provider receives derived chart facts, never a name or birth location/date.
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
 return {score:overallScore(domainScores.map(d=>d.score)),domainScores,scoreVersion:SCORE_VERSION,title:query.scope==='annual'?`${query.year} 年度运势`:`${query.year} 年 ${query.month} 月运势`,bases,scope:query.scope,periods:contexts,natal:{wuxingJu:chart.wuxingJuName,mingZhu:chart.mingZhu,shenZhu:chart.shenZhu,palaces:chart.palaces.map(p=>({name:p.name,branch:p.branch,ming:p.isMingGong,shen:p.isShenGong,stars:p.stars.map(s=>({name:s.name,type:s.type,brightness:s.brightnessRaw,mutagen:s.siHua})),selfSihua:p.selfSihua}))}};
}
export type AIContext=ReturnType<typeof buildAIContext>;
const SYSTEM=`你是「观星」的紫微斗数文化解读助手。根据服务端给出的真实十二宫星曜、本命四化、目标年份大限和流年/流月证据，综合分析财运、事业、健康、家庭、情感。分析必须个性化，解释不同星曜与四化如何共同作用，结合本期年龄和大限，不能只改写通用标签。资料不是统计预测，使用「传统上可读作、可能更需要、可以留意」等自然而不机械的措辞，不声称必然发生。过去月份也只能回顾性推演，不能冒充已发生事实。
严格边界：只能引用输入已有的星曜/四化/期间，不计算或编造新落宫、流日、吉日、概率、收益、婚期、灾祸。不得编造书籍原句或研究。财运不推荐具体证券、不提供买卖时点或收益保证。健康只讨论作息、精力分配与身体感受，不判断器官、疾病、寿命、怀孕或医疗结果，不把星曜当医学证据。关系不能断言第三者、背叛或分手。未知婚恋状态时兼顾单身与伴侣关系，不假定性取向。儿童以学习、成长及家庭支持解释，不套成人投资、工作、婚恋建议；高龄不假定仍在职。身体不适按实际症状寻求医疗帮助。
严格区分本命四化和流年/流月四化，不得把本命武曲化禄等说成当期新发生的化禄。大限起止年以 cycleYears 为准，isFirstYear=false 时绝不能说本年是大限开始。健康不得预测具体感受（如晨倦、晚亢、失眠），不得从化禄推断体质、恢复力、免疫力增强或身体状态改善。综述和月内节奏中只提精力分配的生活建议，不判断健康好坏。每个领域给出有依据的主题、80-130字直白综合分析、一个可关注方向、一个协调点、一个具体可执行的生活行动。综合分析要串联本命特点、本期作用、现实中的可观察情境。basisIds引用该领域输入facts里的2-5个id，至少包括本期宫位或四化依据；不要引用别的领域。月度需跨全部农历分段做综合，并在timeline中对每段分别解释变化；年度timeline为空，不凭空猜月份。只输出合法JSON，不要Markdown包裹。
用户要的是直接判断与具体预估，避免「能量、张力、润养、觉察、支点」等抽象套话。scores里的分数由网站透明规则计算，非真实概率，原样解释，不自行改分。先明确本期偏顺、平稳或有阻，再具体解释钱、项目、分工、居住、相处等可能表现。每项增加scenario：60-100字情景预估，写出1-2种日常情境，例如项目反复修改验收标准、收入增长被共同支出抵消。情景用「若你目前…，这一信号可对应…」条件形式，不假装知道用户的工作、家庭或资产，不保证发生。watch：1-2个现实可核实信号，如返工次数增加、到账延迟、共同支出变化，帮助用户判断情景是否贴近现实。健康scenario仅写繁忙安排下的生活管理场景，不预测症状或身体状态变化。overview只用日常语言说整体、事业、财运、家庭、情感，不涉及健康或身体状态，也不罗列术语。健康仅放在health领域。所有文字不复述数字分数、大限第几年或具体年龄，页面已展示，避免重复或算错。不可改写四化星名，例如文曲化忌与廉贞化忌同宫不能说成廉贞双忌。
JSON结构：{"overview":"100-180字全期综述，指出五领域之间的联系与本期主线","domains":[{"key":"wealth","headline":"16字内主题","analysis":"综合分析","scenario":"条件式具体情景预估","watch":"可核实的现实信号","opportunity":"可关注方向","caution":"需协调事项","action":"具体行动","basisIds":["输入事实id"]},...五项key依次wealth,career,health,family,love],"timeline":[{"periodId":"period-1","reading":"40-90字这段的侧重点"},...]}`;
export function validateAIOutput(value:unknown,ctx:AIContext):Omit<AIReport,'version'|'model'|'generatedAt'|'title'>{
 const v=value as Record<string,unknown>;
 function str(x:unknown,max=1800){if(typeof x!=='string'||!x.trim()||x.length>max)throw new AIError('AI 返回内容不完整，请重试。',502);return x.trim();}
 if(!v||!Array.isArray(v.domains)||v.domains.length!==5||!Array.isArray(v.timeline))throw new AIError('AI 返回格式不完整，请重试。',502);
 const domains=KEYS.map(key=>{const d=(v.domains as Record<string,unknown>[]).find(d=>d?.key===key);if(!d||!Array.isArray(d.basisIds)||d.basisIds.length<2||d.basisIds.length>8||d.basisIds.some(id=>typeof id!=='string'||!ctx.bases[id]||!id.includes(`-${key}-`)))throw new AIError('AI 的排盘依据校验未通过，请重试。',502);return{key,score:ctx.domainScores.find(d=>d.key===key)!.score.value,headline:str(d.headline,80),analysis:str(d.analysis),scenario:str(d.scenario,1000),watch:str(d.watch,500),opportunity:str(d.opportunity,500),caution:str(d.caution,500),action:str(d.action,500),basis:[...new Set(d.basisIds as string[])].map(id=>ctx.bases[id])};});
 const timeline=ctx.scope==='monthly'?ctx.periods.map(p=>{const t=(v.timeline as Record<string,unknown>[]).find(t=>t?.periodId===p.id);return{range:p.range,reading:str(t?.reading,800)};}):[];
 const overview=str(v.overview);
 const healthText=[overview,...domains.filter(d=>d.key==='health').flatMap(d=>[d.headline,d.analysis,d.scenario,d.watch,d.opportunity,d.caution,d.action]),...timeline.map(t=>t.reading)].join(' ');
 if(healthText.split(/[。！？\n]/).some(s=>/(恢复力|免疫力|体质|病情|身体状况|耐力|耐受力|体能|身体).{0,10}(提升|增强|下降|改善|恶化|好转|变差|变好|尚可|偏弱)|易(失眠|晨倦|晚亢|头痛|心悸)/.test(s)&&!/(不代表|不能|不意味着|并不|不应|不可|不作|无法|不用于|不预测)/.test(s)))throw new AIError('AI 健康描述超出了生活参考范围，请重试。',502);
 return {overview,domains,timeline,score:ctx.score};
}
export async function callAI(ctx:AIContext,key:string,signal?:AbortSignal,fetcher:typeof fetch=fetch):Promise<AIReport>{
 if(!key)throw new AIError('AI 服务尚未配置，请联系网站维护者。',503);
 const abort=AbortSignal.any([AbortSignal.timeout(120000),...(signal?[signal]:[])]);
 async function complete(messages:{role:string;content:string}[],maxTokens:number){
 let response:Response;
 try{response=await fetcher('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',{method:'POST',signal:abort,headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({model:'qwen3.7-plus',messages,response_format:{type:'json_object'},enable_thinking:false,temperature:0.5,max_tokens:maxTokens})});}catch{throw new AIError(abort.aborted?'本次分析已取消或超时，请稍后重试。':'暂时无法连接 AI 服务，请稍后重试。',504);}
 if(!response.ok){throw new AIError(response.status===429?'AI 服务繁忙或额度不足，请稍后重试。':'AI 服务暂时不可用，请稍后重试。',response.status===429?429:502);}
 const data=await response.json() as {choices?:{message?:{content?:string};finish_reason?:string}[]};
 if(data.choices?.[0]?.finish_reason!=='stop')throw new AIError('AI 分析未完整生成，请重试。',502);
 let content:unknown;try{content=JSON.parse(data.choices[0].message?.content||'');}catch{throw new AIError('AI 返回格式异常，请重试。',502);}
 return content;
 }
 const content=await complete([{role:'system',content:SYSTEM},{role:'user',content:JSON.stringify({title:ctx.title,scope:ctx.scope,scores:{overall:ctx.score,domains:ctx.domainScores,method:ctx.scoreVersion},natal:ctx.natal,periods:ctx.periods})}],5500);
 let checked:ReturnType<typeof validateAIOutput>;
 try{checked=validateAIOutput(content,ctx);}catch(error){
  if(!(error instanceof AIError)||!error.message.includes('健康描述'))throw error;
  const raw=content as {overview:string;domains:Record<string,unknown>[];timeline:unknown[]};
  const health=raw.domains.find(d=>d.key==='health')!;
  const patch=await complete([{role:'system',content:'你是文字编辑。给定报告含不恰当的身体预测，请只做修订：overview和timeline删除所有关于身体状态、健康好坏的判断；health只保留日程、休息、实际感受记录、工作生活分配等生活建议，禁止推断任何身体能力、病情、症状或康复变化。不要用否定句重复有害预测，直接改成生活安排建议。保留health全部字段及原basisIds，timeline原periodId保持不变。仅返回JSON：{overview:string,health:原health结构,timeline:原数组结构}。不要修改其他领域。'},{role:'user',content:JSON.stringify({overview:raw.overview,health,timeline:raw.timeline})}],2300) as {overview:unknown;health:Record<string,unknown>;timeline:unknown};
  checked=validateAIOutput({...raw,overview:patch.overview,timeline:patch.timeline,domains:raw.domains.map(d=>d.key==='health'?{...patch.health,key:'health',basisIds:health.basisIds}:d)},ctx);
 }
 return{version:2,title:ctx.title,model:'qwen3.7-plus',generatedAt:new Date().toISOString(),...checked};
}
