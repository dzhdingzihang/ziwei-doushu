// Explicit opt-in QA. Uses synthetic data and the existing provider secret in the environment.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {buildAIContext,callAI} from '../../lib/guanxing/ai-server';
if(process.env.AI_LIVE_TEST!=='1')throw Error('Set AI_LIVE_TEST=1 to run a paid provider integration check.');
const started=Date.now();
const ctx=buildAIContext({year:1996,month:6,day:18,hour:2,gender:'female'},{scope:'annual',year:2027});
let calls=0;
const capture:typeof fetch=async(url,options)=>{const number=++calls;const res=await fetch(url,options);const payload=await res.clone().json();await writeFile(`/tmp/guanxing-live-provider-${number}.json`,JSON.stringify(payload,null,2));return res;};
const report=await callAI(ctx,process.env.DASHSCOPE_API_KEY||'',undefined,capture);
assert.equal(report.detail?.months.length,12);assert.equal(report.detail?.years.length,10);assert.equal(report.domains.length,5);
await writeFile('/tmp/guanxing-detailed-live-2027.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({elapsedSeconds:Math.round((Date.now()-started)/1000),title:report.title,chapters:report.detail?.natal.length,months:report.detail?.months.length,years:report.detail?.years.length,overview:report.overview,character:report.detail?.natal[0].reading,money:report.money,firstMonth:report.detail?.months[0]},null,2));
