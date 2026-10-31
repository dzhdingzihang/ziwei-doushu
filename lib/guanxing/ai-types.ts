import type {DomainKey} from './fortune';
export type AIQuery={scope:'annual'|'monthly';year:number;month?:number};
export type AIDomain={key:DomainKey;headline:string;score:number;analysis:string;scenario:string;watch:string;opportunity:string;caution:string;action:string;basis:string[]};
export type AISection={id:string;headline:string;reading:string;basis:string[]};
export type AIScoredSection=AISection&{year:number;score:number;domainScores:{key:DomainKey;score:number}[]};
export type AIDetail={natal:AISection[];cycles:(AISection&{label:string;range:string;ageRange:string})[];years:AIScoredSection[];months:(AIScoredSection&{month:number;ranges:string[]})[]};
export type AIReport={version:4;score:number;model:string;generatedAt:string;title:string;overview:string;money:{earning:string;retention:string;outflow:string};domains:AIDomain[];timeline:{range:string;reading:string}[];detail?:AIDetail};
export const AI_DOMAIN_LABELS={wealth:'财运',career:'事业',health:'健康节奏',family:'家庭',love:'感情'};
const basis=(s:AISection)=>`\n\n排盘依据：${s.basis.join(' ')}`;
const section=(s:AISection)=>`### ${s.headline}\n\n${s.reading}${basis(s)}`;
const scores=(s:AIScoredSection)=>`综合 ${s.score}/100 · ${s.domainScores.map(d=>`${AI_DOMAIN_LABELS[d.key]} ${d.score}/100`).join(' · ')}`;
export function aiReportMarkdown(r:AIReport){
 const d=r.detail;
 return `## ${r.title} · 个人详批\n\n综合参考分：${r.score}/100（命理指数，不是概率）\n\n模型：${r.model} · 生成于 ${r.generatedAt}\n\n`+
 `### 先说整体怎么样\n\n${r.overview}\n\n`+
 (d?`### 本命总论\n\n${d.natal.map(section).join('\n\n')}\n\n### 大限阶段\n\n${d.cycles.map(s=>`#### ${s.label} · ${s.range} · ${s.ageRange}\n\n${s.headline}\n\n${s.reading}${basis(s)}`).join('\n\n')}\n\n`:'')+
 `### 钱从哪里来，又能否留下\n\n赚钱机会：${r.money.earning}\n\n留财能力：${r.money.retention}\n\n开销压力：${r.money.outflow}\n\n`+
 r.domains.map(d=>`### ${AI_DOMAIN_LABELS[d.key]} · ${d.score}/100 · ${d.headline}\n\n${d.analysis}\n\n生活里可能是这样的：${d.scenario}\n\n你可以留意：${d.watch}\n\n可关注：${d.opportunity}\n\n需留意：${d.caution}\n\n行动：${d.action}\n\n排盘依据：${d.basis.join(' ')}`).join('\n\n')+
 (d?`\n\n### 全年逐月详批（公历月）\n\n${d.months.map(s=>`#### ${s.year} 年 ${s.month} 月 · ${s.headline}\n\n${scores(s)}\n\n${s.reading}\n\n农历分段：${s.ranges.join('；')}${basis(s)}`).join('\n\n')}\n\n### 从所选年份看十年走势\n\n${d.years.map(s=>`#### ${s.year} 年 · ${s.headline}\n\n${scores(s)}\n\n${s.reading}${basis(s)}`).join('\n\n')}`:'')+
 (r.timeline.length?'\n\n### 月内节奏\n\n'+r.timeline.map(t=>`**${t.range}** ${t.reading}`).join('\n\n'):'');
}
