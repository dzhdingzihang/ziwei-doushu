import assert from 'node:assert/strict';
import {parseAIRequest,buildAIContext,validateAIOutput,callAI,AIError} from '../../lib/guanxing/ai-server';
const birth={year:2000,month:1,day:1,hour:6,gender:'male' as const};
const request={birth:{...birth,name:'SECRET_NAME',city:'SECRET_CITY'},query:{scope:'annual',year:2026}};
assert.deepEqual(parseAIRequest(request).birth,birth);
for(const bad of [{birth:{...birth,month:2,day:30},query:request.query},{birth:{...birth,hour:12},query:request.query},{birth:{...birth,gender:'x'},query:request.query},{birth,query:{scope:'monthly',year:2026,month:13}},{birth,query:{scope:'evil',year:2026}}])assert.throws(()=>parseAIRequest(bad),AIError);
const ctx=buildAIContext(birth,{scope:'annual',year:2026});
assert.equal(ctx.periods[0].cycleYears?.isFirstYear,false);assert.equal(ctx.periods[0].cycleYears?.startLunarYear,2023);assert.equal(ctx.natal.palaces.length,12);assert.equal(ctx.periods[0].domains.length,5);
const fixture={overview:'综合分析',domains:ctx.periods[0].domains.map(d=>({key:d.key,headline:'本期主题',analysis:'结合本期信号分析',scenario:'若正在推进项目，可以观察验收是否反复',watch:'观察返工次数',opportunity:'可关注方向',caution:'协调事项',action:'可执行行动',basisIds:d.facts.slice(0,2).map(f=>f.id)})),timeline:[]};
assert.equal(validateAIOutput(fixture,ctx).domains.length,5);assert.throws(()=>validateAIOutput({...fixture,overview:'天同化禄让恢复力提升'},ctx),AIError);
assert.throws(()=>validateAIOutput({...fixture,domains:fixture.domains.slice(1)},ctx),AIError);
const fabricated=structuredClone(fixture);fabricated.domains[0].basisIds=['fake','fake2'];assert.throws(()=>validateAIOutput(fabricated,ctx),AIError);
const monthly=buildAIContext(birth,{scope:'monthly',year:2027,month:2});assert(monthly.periods.length>=2);assert.throws(()=>validateAIOutput(fixture,monthly),AIError);
let sent='';const fakeFetch:typeof fetch=async(_url,options)=>{sent=String(options?.body);return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify(fixture)}}]});};
await callAI(ctx,'test',undefined,fakeFetch);assert(!sent.includes('SECRET_NAME'));assert(!sent.includes('SECRET_CITY'));assert(!sent.includes('2000-1-1'));assert(!sent.includes('birthInfo'));assert(sent.includes('response_format'));
await assert.rejects(()=>callAI(ctx,'test',undefined,async()=>new Response('',{status:429})),e=>e instanceof AIError&&e.status===429);
await assert.rejects(()=>callAI(ctx,'test',undefined,async()=>Response.json({choices:[{finish_reason:'length',message:{content:'{}'}}]})),AIError);
if(process.env.AI_LIVE_TEST==='1'){
 const report=await callAI(ctx,process.env.DASHSCOPE_API_KEY||'');assert.equal(report.domains.length,5);console.log(JSON.stringify({live:true,model:report.model,title:report.title,domains:report.domains.map(d=>({key:d.key,headline:d.headline})),overview:report.overview}));
 const mr=await callAI(monthly,process.env.DASHSCOPE_API_KEY||'');assert.equal(mr.timeline.length,monthly.periods.length);console.log(JSON.stringify({live:true,title:mr.title,timeline:mr.timeline}));
}
const unsafe=structuredClone(fixture);unsafe.overview='身体耐受力提升';let tries=0;
const repaired=await callAI(ctx,'test',undefined,async()=>{tries++;const output=tries===1?unsafe:{overview:fixture.overview,health:fixture.domains.find(d=>d.key==='health'),timeline:[]};return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify(output)}}]});});
assert.equal(tries,2);assert.equal(repaired.domains.length,5);assert.equal(repaired.score,ctx.score);
assert.equal(validateAIOutput({...fixture,overview:'命盘不能判断身体耐受力提升'},ctx).domains.length,5);
console.log('AI input validation, evidence integrity, privacy, provider errors and output completeness passed.');
