import {PROSE_KEYS} from './ai-voice';
// Validate generated prose only. Chart evidence can contain traditional palace names.
export function unsupportedClaim(text:string){
 return text.split(/[。！？；，,\n]/).some(s=>{
  if(/不能(?:据此)?(?:判断|预测|证明|推断)|无法(?:判断|预测|证明|推断)|不代表|不意味着|不用于|不预测|不是医学/.test(s))return false;
  // Everyday metaphors about tension are not medical predictions.
  s=s.replace(/(?:紧绷|绷紧|放松|松弛)(?:着|的)?神经/g,'情绪');
  return /(身体|身心|健康|睡眠|疲劳).{0,24}(不错|良好|好转|变好|恢复|改善|提升|下降|增强|减弱|平稳|厚实|底子好|能扛|能撑|康复|变少|少了)|(身体|健康).{0,30}(小毛病|出问题|吃不消)|身心舒展|病倒|每一分努力都能|收入就能|(?:一定|必定|保证|稳赚).{0,20}(?:赚钱|盈利|获利|收益|收入)/.test(s)||/(可能|容易|导致|提示|会|本月|今年|流年|命盘|信号|对应).{0,60}(睡眠质量下降|入睡困难|多梦|头痛|头昏|肩颈|亚健康)/.test(s)||/健康预警|体质|免疫力|恢复力|抗病|神经|泌尿|肝火|心血管|血压|病情|疾病|患病|失眠|睡眠问题|睡眠障碍|肠胃|受伤|寿命|怀孕|生育能力|身体.{0,8}(好|坏|弱|强|改善|下降|提升)|将.{0,10}(资金|收入).{0,15}(固定资产|股票|基金)|转化为固定资产/.test(s);
 });
}
const HEALTH_WORDS=/身体|身子|身心|健康|症状|神经|疾病|病倒|免疫|体质|康复|恢复|修复|按摩|泡澡|补品|保健|运动|锻炼|健身|游泳|普拉提|瑜伽|营养|药物|医疗/;
export function claimFields(value:unknown,path:string[]=[],healthContext=false):{id:string;text:string;lifeOnly?:boolean}[]{
 if(!value||typeof value!=='object')return[];
 const lifeOnly=healthContext||(value as {key?:unknown}).key==='health';
 return Object.entries(value).flatMap(([key,v])=>typeof v==='string'&&PROSE_KEYS.has(key)&&(unsupportedClaim(v)||(lifeOnly&&HEALTH_WORDS.test(v)))?[{id:[...path,key].join('.'),text:v,lifeOnly}]:typeof v==='object'?claimFields(v,[...path,key],lifeOnly):[]);
}
export function safeRepairInput(fields:{id:string;text:string;lifeOnly?:boolean}[]){return fields.map(f=>({id:f.id,text:f.text.split(/(?<=[。！？\n])/).filter(s=>!unsupportedClaim(s)&&!(f.lifeOnly&&HEALTH_WORDS.test(s))).join(''),minimumCharacters:f.id.endsWith('headline')?8:f.id.endsWith('analysis')?220:f.id.endsWith('reading')?150:60}));}
export const REPAIR_SYSTEM=`你是生活规划文案编辑。你只处理输入fields中的指定字段，逐个用大白话重写，id原样保留。原文已删掉不可靠的预测。根据剩下的工作、家庭、关系和时间信息展开，保留年份和月内分段，不增添命盘事实。用“你”、短句和具体生活安排；超过180字分成2个自然段，别用术语或四字对仗。headline写8–22字，其他字段达到minimumCharacters。
这些字段原先包含不可靠判断，重写时必须遵守更严格的规则：不要出现身体、健康、睡眠、疲劳、症状、神经、疾病、体质、康复、补品、保健、病倒等词，也不要写运动、营养、医疗或身体效果。只写日程、任务、休息时段、陪伴和沟通，例如“晚上九点后不再处理工作消息，留半小时做自己的事”。这不是取消整份报告的生活参考，只是把指定字段改成可靠的日常安排。财运字段只写收支核对和预算安排，不保证增收，不推荐购买资产。
只输出JSON：{"patches":[{"id":"原id","text":"重写后的完整字段"}]}。每个输入字段都必须返回，不增减id。`;


export function applyClaimPatches(value:unknown,patch:unknown,fields:{id:string;text:string}[],validateClaims=true){
 const p=(patch as {patches?:{id?:unknown;text?:unknown}[]})?.patches;
 if(!Array.isArray(p)||p.length!==fields.length||new Set(p.map(x=>x.id)).size!==fields.length)throw Error('AI 措辞修订未完成，请重试。');
 const copy=structuredClone(value) as Record<string,unknown>;
 for(const field of fields){const row=p.find(x=>x.id===field.id);if(!row||typeof row.text!=='string'||!row.text.trim()||row.text.length>1800||(validateClaims&&unsupportedClaim(row.text)))throw Error('AI 措辞修订未通过，请重试。');const keys=field.id.split('.');let target=copy;for(const key of keys.slice(0,-1))target=target[key] as Record<string,unknown>;target[keys.at(-1)!]=row.text.trim();}
 return copy;
}
