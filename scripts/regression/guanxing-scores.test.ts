import assert from 'node:assert/strict';
import {generateChart} from '../../lib/ziwei/algorithm';
import {annualFortune,monthlyFortune} from '../../lib/guanxing/fortune';
import {calculateScore,weightedScore,overallScore} from '../../lib/guanxing/scores';
import {buildAIContext} from '../../lib/guanxing/ai-server';
assert.equal(calculateScore([],[],false,[],'流年').value,60);
assert.equal(calculateScore([],[],false,[{label:'流年',star:'测试',hua:'禄',opposite:false}],'流年').value,76);
assert.equal(calculateScore([],[],false,[{label:'流年',star:'测试',hua:'忌',opposite:true}],'流年').value,50);
assert.equal(calculateScore([],[],false,[{label:'流年背景',star:'测试',hua:'禄',opposite:false}],'流月').value,67);
const birth={year:2000,month:1,day:1,hour:6,gender:'male' as const};const chart=generateChart(birth);
for(const year of [2000,2026,2027,2055,2099]){const r=annualFortune(chart,year);assert.equal(r.score,overallScore(r.domains.map(d=>d.score)));for(const d of r.domains){assert(Number.isInteger(d.score.value)&&d.score.value>=0&&d.score.value<=100);assert.equal(d.score.value,Math.max(0,Math.min(100,Math.round(d.score.factors.reduce((s,f)=>s+f.delta,0)))));}}
const m=monthlyFortune(chart,2027,2);for(const d of m.summaries){const expected=Math.round(m.segments.reduce((s,p)=>s+p.report.domains.find(x=>x.key===d.key)!.score.value*((Date.parse(p.end)-Date.parse(p.start))/86400000+1),0)/28);assert.equal(d.score.value,expected);}
const ai=buildAIContext(birth,{scope:'monthly',year:2027,month:2});assert.equal(ai.score,m.score);assert.deepEqual(ai.domainScores.map(d=>d.score.value),m.summaries.map(d=>d.score.value));
const same=annualFortune(generateChart(birth),2026);assert.deepEqual(same.domains.map(d=>d.score),annualFortune(chart,2026).domains.map(d=>d.score));
assert.equal(weightedScore([{score:{value:80,label:'',factors:[]},weight:1,label:'a'},{score:{value:40,label:'',factors:[]},weight:3,label:'b'}]).value,50);
console.log('PASS: bounded deterministic scores, factor sums, period weights, calendar-day month aggregation, overall mean and AI/UI parity.');
console.log(JSON.stringify({sample:'2000-01-01 12:00 male',year:2026,overall:same.score,domains:same.domains.map(d=>({label:d.label,score:d.score.value})),month:m.score}));
