import type {Star,SiHua} from '../ziwei/types';
export type ScoreFactor={label:string;delta:number};
export type FortuneScore={value:number;label:string;factors:ScoreFactor[]};
export const SCORE_VERSION='gx-score-v1';
export const scoreLabel=(n:number)=>n>=80?'较为顺遂':n>=65?'稳中有进':n>=50?'平稳有阻':'宜稳慎行';
const huaValue:Record<SiHua,number>={禄:16,权:12,科:10,忌:-18};
const brightValue:Record<string,number>={庙:8,旺:6,得:4,利:2,平:0,不:-3,闲:-2,陷:-6,地:0};
const round=(n:number)=>Math.round(n*10)/10;
export function calculateScore(stars:Star[],majors:Star[],borrowed:boolean,signals:{label:string;star:string;hua:SiHua;opposite:boolean}[],periodLabel:string):FortuneScore{
 const factors:ScoreFactor[]=[{label:'基础参考值',delta:60}];
 if(majors.length){const n=majors.reduce((s,x)=>s+(brightValue[x.brightnessRaw||'平']||0),0)/majors.length*(borrowed?.6:1);factors.push({label:`${borrowed?'借对宫':'本宫'}主星亮度：${majors.map(x=>`${x.name}${x.brightnessRaw||'平'}`).join('、')}`,delta:round(n)});}
 for(const s of stars.filter(s=>s.siHua))factors.push({label:`本命${s.name}化${s.siHua}（权重 0.5）`,delta:huaValue[s.siHua!]*.5});
 for(const s of signals){const weight=s.label===periodLabel?1:s.label==='流年背景'?.45:.35;factors.push({label:`${s.label}${s.star}化${s.hua}${s.opposite?'对宫冲照':'同宫'}（权重 ${weight}）`,delta:round((s.opposite?-10:huaValue[s.hua])*weight)});}
 const value=Math.max(0,Math.min(100,Math.round(factors.reduce((s,x)=>s+x.delta,0))));return{value,label:scoreLabel(value),factors};
}
export function weightedScore(items:{score:FortuneScore;weight:number;label:string}[]):FortuneScore{
 if(!items.length)return{value:0,label:'无可评分期间',factors:[]};
 const days=items.reduce((s,x)=>s+x.weight,0);const value=Math.round(items.reduce((s,x)=>s+x.score.value*x.weight,0)/days);
 return{value,label:scoreLabel(value),factors:items.map(x=>({label:`${x.label}：${x.score.value} 分 × ${x.weight} 天 / ${days} 天`,delta:round(x.score.value*x.weight/days)}))};
}
export function overallScore(scores:FortuneScore[]){return scores.length?Math.round(scores.reduce((s,x)=>s+x.value,0)/scores.length):0;}
