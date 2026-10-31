import assert from 'node:assert/strict';
import {dateValue, daysInMonth, pastedDate, pastedTime, timeValue, todayInChina} from '../../lib/guanxing/birth-picker';

const today='2026-10-31';
const date=(year:string,month:string,day:string)=>dateValue({year,month,day},today);
assert.equal(date('2000','2','29'),'2000-02-29');
assert.equal(date('1900','2','29'),'');
assert.equal(date('2001','2','29'),'');
assert.equal(daysInMonth('2000','2'),29);
assert.equal(daysInMonth('2001','2'),28);
assert.equal(date('2000','4','31'),'');
assert.equal(date('2000','0','1'),'');
assert.equal(date('2000','2',''),'');
assert.equal(date('1899','12','31'),'');
assert.equal(date('2026','10','31'),today);
assert.equal(date('2026','11','1'),'');
assert.equal(todayInChina(new Date('2026-10-30T16:00:00Z')),today);
for(const text of ['20000229','2000-02-29','2000/2/29','2000年2月29日']){
  assert.equal(dateValue(pastedDate(text)!,today),'2000-02-29');
}
assert.equal(pastedDate('2/29/2000'),null);
assert.equal(dateValue(pastedDate('2001-02-29')!,today),'');
assert.equal(timeValue({hour:'4',minute:'3'}),'04:03');
assert.equal(timeValue({hour:'0',minute:'0'}),'00:00');
assert.equal(timeValue({hour:'23',minute:'59'}),'23:59');
for(const parts of [{hour:'24',minute:'0'},{hour:'1',minute:'60'},{hour:'',minute:'0'},{hour:'1',minute:''}])assert.equal(timeValue(parts),'');
assert.equal(timeValue(pastedTime('04：03')!),'04:03');
console.log('PASS: leap dates, future date rejection, China date boundary, pasted dates and exact minute preservation.');
