export type DateParts = {year:string;month:string;day:string};
export type TimeParts = {hour:string;minute:string};
export function todayInChina(now=new Date()){return new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);}
export function daysInMonth(year:string,month:string){const y=Number(year),m=Number(month);return /^\d{4}$/.test(year)&&y>=1900&&m>=1&&m<=12?new Date(Date.UTC(y,m,0)).getUTCDate():0;}
export function dateValue(parts:DateParts,today=todayInChina()){
 const {year,month,day}=parts;const y=Number(year),m=Number(month),d=Number(day);
 if(!/^\d{4}$/.test(year)||y<1900||y>Number(today.slice(0,4)))return '';
 if(!/^\d{1,2}$/.test(month)||!/^\d{1,2}$/.test(day)||m<1||m>12||d<1||d>daysInMonth(year,month))return '';
 const value=`${year}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
 return value<=today?value:'';
}
export function timeValue({hour,minute}:TimeParts){return /^\d{1,2}$/.test(hour)&&/^\d{1,2}$/.test(minute)&&Number(hour)<24&&Number(minute)<60?`${hour.padStart(2,'0')}:${minute.padStart(2,'0')}`:'';}
export function pastedDate(text:string):DateParts|null{const m=text.trim().match(/^(\d{4})(?:[-/.年\s]?)(\d{2})(?:[-/.月\s]?)(\d{2})日?$/)||text.trim().match(/^(\d{4})[-/.年\s](\d{1,2})[-/.月\s](\d{1,2})日?$/);return m?{year:m[1],month:String(Number(m[2])),day:String(Number(m[3]))}:null;}
export function pastedTime(text:string):TimeParts|null{const m=text.trim().match(/^(\d{1,2})[:：](\d{1,2})$/);return m?{hour:m[1],minute:m[2]}:null;}

export type BirthTimeMode='branch'|'exact';
export const BIRTH_BRANCHES=[
 {time:'00:00',name:'早子时',range:'00:00–00:59'},
 ...['丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'].map((name,i)=>({time:`${String(i*2+1).padStart(2,'0')}:00`,name:`${name}时`,range:`${String(i*2+1).padStart(2,'0')}:00–${String(i*2+2).padStart(2,'0')}:59`})),
 {time:'23:00',name:'晚子时',range:'23:00–23:59'},
];
export function branchChoice(time:string){if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))return undefined;const hour=Number(time.slice(0,2));return BIRTH_BRANCHES[hour===23?12:hour===0?0:Math.floor((hour+1)/2)];}
export function birthTimeLabel(d:{time:string;timeMode?:BirthTimeMode}){const branch=branchChoice(d.time);return d.timeMode==='branch'&&branch?`${branch.name}（${branch.range}）`:d.time;}
