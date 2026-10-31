import {PLAIN_VOICE_SYSTEM,PROSE_KEYS} from './ai-voice';
// Validate generated prose only. Chart evidence can contain traditional palace names.
export function unsupportedClaim(text:string){
 return text.split(/[。！？；，,\n]/).some(s=>{
  if(/不能(?:据此)?(?:判断|预测|证明|推断)|无法(?:判断|预测|证明|推断)|不代表|不意味着|不用于|不预测|不是医学/.test(s))return false;
  // Everyday metaphors about tension are not medical predictions.
  s=s.replace(/(?:紧绷|绷紧|放松|松弛)(?:着|的)?神经/g,'情绪');
  return /(身体|身心|健康|睡眠|疲劳).{0,24}(不错|良好|好转|变好|恢复|改善|提升|下降|增强|减弱|平稳|厚实|底子好|能扛|能撑|康复|变少|少了)|身心舒展|病倒|每一分努力都能|收入就能|(?:一定|必定|保证|稳赚).{0,20}(?:赚钱|盈利|获利|收益|收入)/.test(s)||/(可能|容易|导致|提示|会|本月|今年|流年|命盘|信号|对应).{0,60}(睡眠质量下降|入睡困难|多梦|头痛|头昏|肩颈|亚健康)/.test(s)||/健康预警|体质|免疫力|恢复力|抗病|神经|泌尿|肝火|心血管|血压|病情|疾病|患病|失眠|睡眠问题|睡眠障碍|肠胃|受伤|寿命|怀孕|生育能力|身体.{0,8}(好|坏|弱|强|改善|下降|提升)|将.{0,10}(资金|收入).{0,15}(固定资产|股票|基金)|转化为固定资产/.test(s);
 });
}
export function claimFields(value:unknown,path:string[]=[]):{id:string;text:string}[]{
 if(!value||typeof value!=='object')return[];
 return Object.entries(value).flatMap(([key,v])=>typeof v==='string'&&PROSE_KEYS.has(key)&&unsupportedClaim(v)?[{id:[...path,key].join('.'),text:v}]:typeof v==='object'?claimFields(v,[...path,key]):[]);
}
export function safeRepairInput(fields:{id:string;text:string}[]){return fields.map(f=>({id:f.id,text:f.text.split(/(?<=[。！？\n])/).filter(s=>!unsupportedClaim(s)).join(''),minimumCharacters:f.id.endsWith('headline')?8:f.id.endsWith('analysis')?220:f.id.endsWith('reading')?150:60}));}
export const REPAIR_SYSTEM=`你是生活规划文案编辑。输入已经移除了不可靠的医学预测和资产配置指令。根据剩余文字重新完成每个字段，原文为空时只写时间、任务、休息与沟通的具体安排。健康相关字段完全不谈星曜、身体状况、症状、病情、器官或医学结论；写安排缓冲时间、确定任务优先级、保留休息时段等可执行的内容，不能预测某种身体感受。不添加任何资产购买或配置指令。保留仍然存在的具体年份和月内分段，不添加新星曜、新预测或依据。达到每个字段minimumCharacters的长度，用有意义的具体生活场景展开，避免套话。输出JSON：{"patches":[{"id":"原id","text":"重写后的完整字段"}]}。每个字段都返回，id原样保留。\n${PLAIN_VOICE_SYSTEM}\n最后检查：健康相关字段仅写日程、任务、休息时间、沟通安排；不说身体好坏、不说睡眠变好或疲劳恢复、不谈补品或保健效果。财运保持可能情景，不把努力、控制开销或高分说成必然能增收。`;

export function applyClaimPatches(value:unknown,patch:unknown,fields:{id:string;text:string}[]){
 const p=(patch as {patches?:{id?:unknown;text?:unknown}[]})?.patches;
 if(!Array.isArray(p)||p.length!==fields.length||new Set(p.map(x=>x.id)).size!==fields.length)throw Error('AI 措辞修订未完成，请重试。');
 const copy=structuredClone(value) as Record<string,unknown>;
 for(const field of fields){const row=p.find(x=>x.id===field.id);if(!row||typeof row.text!=='string'||!row.text.trim()||row.text.length>1800||unsupportedClaim(row.text))throw Error('AI 措辞修订未通过，请重试。');const keys=field.id.split('.');let target=copy;for(const key of keys.slice(0,-1))target=target[key] as Record<string,unknown>;target[keys.at(-1)!]=row.text.trim();}
 return copy;
}
