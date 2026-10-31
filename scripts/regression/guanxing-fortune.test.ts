import assert from 'node:assert/strict';
import {astro} from 'iztro';
import {generateChart} from '../../lib/ziwei/algorithm';
import {annualFortune,monthlyFortune,monthsFor,fortuneAt,exportFortunes} from '../../lib/guanxing/fortune';
const chart=generateChart({year:2000,month:1,day:1,hour:6,gender:'male'});
const another=generateChart({year:1996,month:7,day:12,hour:3,gender:'female'});
const direct=astro.bySolar('2000-1-1',6,'男',true,'zh-CN').horoscope('2026-6-15',6);
const report=fortuneAt(chart,'2026-6-15','monthly');
assert.equal(report.domains.length,5);
assert.equal(report.signature.split('-')[1],String(direct.monthly.index));
for(const d of report.domains){assert.ok(d.reading.trim());assert.ok(d.focus.trim());assert.ok(d.evidence.length>=2);}
const y26=annualFortune(chart,2026),y27=annualFortune(chart,2027);
assert.equal(y26.range,'2026-02-17 至 2027-02-05');
assert.notEqual(y26.signature,y27.signature);
assert.notDeepEqual(y26.domains.map(d=>d.evidence),annualFortune(another,2026).domains.map(d=>d.evidence));
assert.ok(y26.domains.find(d=>d.key==='health')!.reading.includes('不'));
const months=Array.from({length:12},(_,i)=>monthlyFortune(chart,2026,i+1));
for(const m of months){const days=new Date(Date.UTC(m.year,m.month,0)).getUTCDate();const dates=m.segments.flatMap(s=>{const n=(Date.parse(s.end)-Date.parse(s.start))/86400000+1;return Array.from({length:n},(_,i)=>new Date(Date.parse(s.start)+i*86400000).toISOString().slice(0,10));});assert.equal(dates.length,days);assert.equal(new Set(dates).size,days);assert.ok(m.segments.every(s=>s.report.domains.length===5));}
const feb=months[1];assert.equal(feb.segments[0].report.year,2025);assert.equal(feb.segments.at(-1)!.report.year,2026);
const leapFeb=monthlyFortune(chart,2028,2);assert.ok(leapFeb.segments.at(-1)!.end.endsWith('-29'));
const leapLunar=monthlyFortune(chart,2025,8);assert.ok(leapLunar.segments.some(s=>s.report.lunarMonth<0));assert.ok(leapLunar.segments.length>=3);
assert.equal(monthlyFortune(chart,1999,12).segments.length,0);
const now=new Date('2026-10-31T02:00:00Z');assert.deepEqual(monthsFor('recent',now)[0],{year:2025,month:11});assert.deepEqual(monthsFor('future',now).at(-1),{year:2027,month:10});assert.equal(monthsFor('nextYear',now).length,12);
assert.throws(()=>annualFortune(chart,1998));assert.throws(()=>monthlyFortune(chart,2026,13));
assert.ok(exportFortunes([y26],months).includes('2026 年 12 月'));
console.log('PASS: 5 domains, real horoscope indices, distinct birthdays/years, 12 complete months, Spring Festival transition, leap day/month, rolling windows and export.');
