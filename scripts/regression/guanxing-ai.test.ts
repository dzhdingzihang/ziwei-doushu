import assert from 'node:assert/strict';
import {detailFixture} from './guanxing-ai-detail-fixture';
import {claimFields,unsupportedClaim,safeRepairInput} from '../../lib/guanxing/ai-language';
import {validateDetail,detailRepairTasks,applyDetailRepairs} from '../../lib/guanxing/ai-detail';
import {aiReportMarkdown} from '../../lib/guanxing/ai-types';
import {parseAIRequest,buildAIContext,validateAIOutput,callAI,AIError} from '../../lib/guanxing/ai-server';
const birth={year:2000,month:1,day:1,hour:6,gender:'male' as const};
const request={birth:{...birth,name:'SECRET_NAME',city:'SECRET_CITY'},query:{scope:'annual',year:2026}};
assert.deepEqual(parseAIRequest(request).birth,birth);
for(const bad of [{birth:{...birth,month:2,day:30},query:request.query},{birth:{...birth,hour:12},query:request.query},{birth:{...birth,gender:'x'},query:request.query},{birth,query:{scope:'monthly',year:2026,month:13}},{birth,query:{scope:'evil',year:2026}}])assert.throws(()=>parseAIRequest(bad),AIError);
const ctx=buildAIContext(birth,{scope:'annual',year:2026});
assert.equal(ctx.periods[0].cycleYears?.isFirstYear,false);assert.equal(ctx.periods[0].cycleYears?.startLunarYear,2023);assert.equal(ctx.natal.palaces.length,12);assert.equal(ctx.periods[0].domains.length,5);
const fixture={money:{earning:'收入机会来自已有工作成果的兑现',retention:'留意收入与支出不同步',outflow:'关注共同支出的责任边界'},overview:'综合分析',domains:ctx.periods[0].domains.map(d=>({key:d.key,headline:'本期主题',analysis:'结合本期信号分析',scenario:'若正在推进项目，可以观察验收是否反复',watch:'观察返工次数',opportunity:'可关注方向',caution:'协调事项',action:'可执行行动',basisIds:d.facts.slice(0,2).map(f=>f.id)})),timeline:[]};
assert.equal(validateAIOutput(fixture,ctx).domains.length,5);assert.throws(()=>validateAIOutput({...fixture,overview:'天同化禄让恢复力提升'},ctx),AIError);
assert.throws(()=>validateAIOutput({...fixture,domains:fixture.domains.slice(1)},ctx),AIError);
const fabricated=structuredClone(fixture);fabricated.domains[0].basisIds=['fake','fake2'];assert.throws(()=>validateAIOutput(fabricated,ctx),AIError);
const monthly=buildAIContext(birth,{scope:'monthly',year:2027,month:2});assert(monthly.periods.length>=2);assert.throws(()=>validateAIOutput(fixture,monthly),AIError);
const detailed=detailFixture(ctx.detail!);
let sent='';const fakeFetch:typeof fetch=async(_url,options)=>{const body=String(options?.body);sent+=body;return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify(body.includes('连贯叙述')?detailed:fixture)}}]});};
await callAI(ctx,'test',undefined,fakeFetch);assert(!sent.includes('SECRET_NAME'));assert(!sent.includes('SECRET_CITY'));assert(!sent.includes('2000-1-1'));assert(!sent.includes('birthInfo'));assert(sent.includes('response_format'));
await assert.rejects(()=>callAI(ctx,'test',undefined,async()=>new Response('',{status:429})),e=>e instanceof AIError&&e.status===429);
await assert.rejects(()=>callAI(ctx,'test',undefined,async()=>Response.json({choices:[{finish_reason:'length',message:{content:'{}'}}]})),AIError);
if(process.env.AI_LIVE_TEST==='1'){
 const report=await callAI(ctx,process.env.DASHSCOPE_API_KEY||'');assert.equal(report.domains.length,5);console.log(JSON.stringify({live:true,model:report.model,title:report.title,domains:report.domains.map(d=>({key:d.key,headline:d.headline})),overview:report.overview}));
 const mr=await callAI(monthly,process.env.DASHSCOPE_API_KEY||'');assert.equal(mr.timeline.length,monthly.periods.length);console.log(JSON.stringify({live:true,title:mr.title,timeline:mr.timeline}));
}
const unsafe=structuredClone(fixture);unsafe.overview='身体耐受力提升';let tries=0;
const repaired=await callAI(ctx,'test',undefined,async(_url,options)=>{tries++;const body=String(options?.body);const output=body.includes('连贯叙述')?detailed:body.includes('你是生活规划文案编辑')?{patches:[{id:'overview',text:fixture.overview}]}:unsafe;return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify(output)}}]});});
assert.equal(tries,3);assert.equal(repaired.domains.length,5);assert.equal(repaired.score,ctx.score);
assert.equal(validateAIOutput({...fixture,overview:'命盘不能判断身体耐受力提升'},ctx).domains.length,5);
console.log('AI input validation, evidence integrity, privacy, provider errors and output completeness passed.');

assert.equal(repaired.version,4);
assert.equal(repaired.detail?.months.length,12);
assert.equal(repaired.detail?.years.length,10);
assert.equal(repaired.detail?.cycles.find(c=>c.label==='本阶段')?.range,'2023–2032 年（农历年）');
assert.equal(repaired.detail?.months[0].score,ctx.detail!.months[0].score);
assert.equal(repaired.detail?.months[0].domainScores.length,5);
const truncated=structuredClone(detailed);truncated.months.pop();assert.throws(()=>validateDetail(truncated,ctx.detail!));
const duplicated=structuredClone(detailed);duplicated.months[1]=duplicated.months[0];assert.throws(()=>validateDetail(duplicated,ctx.detail!));
const wrongMonth=structuredClone(detailed);wrongMonth.months[0].basisIds=wrongMonth.months[1].basisIds;assert.throws(()=>validateDetail(wrongMonth,ctx.detail!));
const invented=structuredClone(detailed);invented.natal[0].basisIds=['natal-fake','natal-fake2'];assert.throws(()=>validateDetail(invented,ctx.detail!));
const second=buildAIContext({...birth,year:1996,month:6,day:18,hour:2,gender:'female'},{scope:'annual',year:2026});
assert.notDeepEqual(ctx.detail!.natal,second.detail!.natal);
assert.notDeepEqual(ctx.detail!.years.map(y=>y.score),second.detail!.years.map(y=>y.score));
const newborn=buildAIContext({year:2026,month:6,day:18,hour:2,gender:'female'},{scope:'annual',year:2026});
assert.equal(newborn.detail!.months[0].month,6);assert.equal(newborn.detail!.cycles[0].label,'下一阶段');
const end=buildAIContext(birth,{scope:'annual',year:2099});assert.equal(end.detail!.years.length,1);
const exported=aiReportMarkdown(repaired);
for(const heading of ['本命总论','大限阶段','钱从哪里来','全年逐月详批','十年走势'])assert(exported.includes(heading));
assert.equal((exported.match(/^#### 2026 年 \d+ 月/gm)||[]).length,12);
console.log('PASS: personal facts vary by chart; complete natal/cycle/year/month chapters, scoped citations, calendar and score parity, v4 export.');

const unsafeDetail=structuredClone(detailed);unsafeDetail.months[0].reading='本月神经系统疲劳，体质很好。'+unsafeDetail.months[0].reading;assert.throws(()=>validateDetail(unsafeDetail,ctx.detail!));
const badMoney=structuredClone(fixture);badMoney.money.retention='将流入的资金迅速转化为固定资产';assert.throws(()=>validateAIOutput(badMoney,ctx),AIError);

const tasks=detailRepairTasks(wrongMonth,ctx.detail!);assert.equal(tasks.length,1);assert.equal(tasks[0].id,ctx.detail!.months[0].id);
const fixedDetail=applyDetailRepairs(wrongMonth,{sections:[{group:'months',...detailed.months[0]}]},ctx.detail!);
assert.equal(validateDetail(fixedDetail,ctx.detail!).months.length,12);
let completeCalls=0;
const autoFixed=await callAI(ctx,'test',undefined,async(_url,options)=>{
 completeCalls++;const body=String(options?.body);
 const output=body.includes('你为紫微斗数详批补全指定段落')?{sections:[{group:'months',...detailed.months[0]}]}:body.includes('连贯叙述')?wrongMonth:fixture;
 return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify(output)}}]});
});
assert.equal(completeCalls,3);assert.equal(autoFixed.detail?.months.length,12);
assert.equal(unsupportedClaim('关注真实的睡眠质量，按实际日程安排休息。'),false);
assert.equal(unsupportedClaim('流年疾厄宫提示神经系统疲劳。'),true);
assert.equal(unsupportedClaim('今年可能因工作导致睡眠质量下降。'),true);
assert.equal(claimFields(safeRepairInput([{id:'overview',text:'今年神经系统疲劳。可以给日程留出缓冲。'}])).length,0);
console.log('PASS: incomplete section repair, exact citation replacement and descriptive sleep observations remain valid.');

// A jargon-heavy field is rewritten without changing facts, scores or other fields.
const {voiceFields,needsPlainVoice,applyVoicePatches}=await import('../../lib/guanxing/ai-voice');
assert(needsPlainVoice('武曲化禄，财荫夹印。'));
assert(needsPlainVoice('若你目前正在工作，这一信号可对应收入增加。'));
assert(needsPlainVoice('建议准备 Checklist。'));
assert(!needsPlainVoice('第二天同事又改了要求。每天相处时，把自己的想法说清楚。'));
assert.equal(voiceFields({basis:['武曲化禄'],basisIds:['natal-1'],headline:'工作上先把要求问清楚'}).length,0);
const stiff=structuredClone(fixture);stiff.domains[1].analysis='文曲化忌，若你目前推进项目，这一信号可对应交付反复。';
const plain='工作上容易多费几遍功夫。谈好的要求又改了，交完的东西还要修改。接任务前先把要求问清楚。';
const voiceMatches=voiceFields(stiff);assert.equal(voiceMatches.length,1);
const voicePatched=applyVoicePatches(stiff,{patches:[{id:'domains.1.analysis',text:plain}]},voiceMatches) as typeof stiff;
assert.equal(voicePatched.domains[1].analysis,plain);assert.deepEqual(voicePatched.domains[1].basisIds,stiff.domains[1].basisIds);assert.deepEqual(voicePatched.money,stiff.money);
assert.throws(()=>applyVoicePatches(stiff,{patches:[{id:'overview',text:plain}]},voiceMatches));
assert.throws(()=>applyVoicePatches(stiff,{patches:[{id:'domains.1.analysis',text:'文曲化忌，传统上可读作工作不顺。'}]},voiceMatches));
assert.throws(()=>validateAIOutput(stiff,ctx),AIError);
let voiceCalls=0;
const spoken=await callAI(ctx,'test',undefined,async(_url,options)=>{voiceCalls++;const body=String(options?.body);const output=body.includes('你是观星报告的大白话编辑')?{patches:[{id:'domains.1.analysis',text:plain}]}:body.includes('连贯叙述')?detailed:stiff;return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify(output)}}]});});
assert.equal(voiceCalls,3);assert.equal(spoken.domains[1].analysis,plain);assert.equal(spoken.score,ctx.score);assert.deepEqual(spoken.domains[1].basis,validateAIOutput(fixture,ctx).domains[1].basis);
assert.equal(voiceFields(spoken).length,0);
assert(aiReportMarkdown(spoken).indexOf('先说整体怎么样')<aiReportMarkdown(spoken).indexOf('本命总论'));
console.log('PASS: plain-language repair, preserved evidence/scores, safe prose scope, natural everyday phrasing and summary-first export.');

assert.equal(unsupportedClaim('周末换个环境，放松紧绷的神经。'),false);
assert.equal(unsupportedClaim('今年流年导致神经系统疲劳。'),true);
assert.equal(safeRepairInput([{id:'domains.2.headline',text:'身体很好'}])[0].minimumCharacters,8);
const extraTimeline=structuredClone(fixture);extraTimeline.timeline.push({periodId:'invented',reading:'流年导致疾病'} as never);
const withoutInventedTimeline=await callAI(ctx,'test',undefined,async(_url,options)=>Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify(String(options?.body).includes('连贯叙述')?detailed:extraTimeline)}}]}));
assert.deepEqual(withoutInventedTimeline.timeline,[]);
console.log('PASS: normal tension metaphors remain readable; medical predictions and invented annual timeline stay excluded.');

for(const s of ['财运和身体状态都不错。','今年你的身体底子厚实。','睡眠质量也可能有所改善。','你更容易从疲劳中恢复过来。','身体的小毛病自然也就少了。','连续加班后你本来以为会病倒。','身心舒展，适合调养。','每一分努力都能换算成实在的收入。','命盘不能预测健康，但你的身体状态会改善。'])assert(unsupportedClaim(s),s);
assert(!unsupportedClaim('关注真实的睡眠质量，按实际日程安排休息。'));
console.log('PASS: improved health and guaranteed-income claims cannot slip through casual wording or a preceding disclaimer.');

let retryRepairs=0;
const repairRetry=await callAI(ctx,'test',undefined,async(_url,options)=>{const body=String(options?.body);let output:unknown;if(body.includes('你是生活规划文案编辑')){retryRepairs++;output={patches:[{id:'overview',text:retryRepairs===1?'你的身体状态会改善。':'工作上把要求问清楚，晚上给自己留出不处理消息的时间。'}]};}else output=body.includes('连贯叙述')?detailed:unsafe;return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify(output)}}]});});
assert.equal(retryRepairs,2);assert.equal(claimFields(repairRetry).length,0);assert.equal(repairRetry.domains.length,5);
console.log('PASS: only rejected fields retry automatically; completed sections and scores survive.');
