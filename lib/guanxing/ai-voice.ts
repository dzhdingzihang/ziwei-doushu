// One voice for annual, monthly, natal and repair requests. Evidence stays technical.
export const PROSE_KEYS=new Set(['overview','headline','analysis','scenario','watch','opportunity','caution','action','reading','earning','retention','outflow']);
export const PLAIN_VOICE_SYSTEM=`文风是硬性要求：像当面给一个普通人讲清楚他的情况，用“你”，大白话，短句为主，有长有短。读者完全不懂命理，不需要先学术语。先下本段的主判断，再讲为什么值得注意、生活里可能怎么表现、怎样应对。结论是传统命理推演，不是已知事实或保证；用自然的“容易、可能、如果”保留分寸，不必句句加限定。
正文和标题不出现星名、宫名、四化、旺陷、合局等命理术语，技术证据只通过 basisIds 放入折叠依据。不得照抄输入事实来凑篇幅。不要“这一信号可对应”“传统上可读作”“若你目前”“外稳内紧”“杀破狼运”“财官双美”“能量”“张力”“赋能”等书面套话，不夹英文，不用四字对仗当标题。
学习参考文案的表达方式：直接说工作怎么样、钱从哪来、能否存下、两个人会为什么闹别扭，按人生阶段、年份、月份讲变化。不要抄参考人的出生资料、性格、经历、财富、配偶或健康结论。每个人的内容必须来自自己的输入。不要人人都写“有才华但多疑”“能赚钱却留不住”“明年一定好”。低分领域把麻烦说清，高分领域把机会说清，中间分数不要故作惊人。
表达示范仅供学习口吻，只有输入支持才可使用相应判断：
工作反复：“这段时间工作上容易多费几遍功夫。比如原本谈好的要求又改了，做完的东西还要返工。你要先把交付要求问清楚，别急着答应一个做不到的时间。”
收入与积累不同步：“你有机会把收入做上去，但赚得多和存得下是两回事。如果最近还要搬家、给家里添东西，几笔支出加起来，就会吃掉不少结余。先看看每月到底能留下多少，再决定要不要增加新的开销。”
表达感情磨合：“相处上，你更需要把话说开。比如你觉得自己已经很用心，对方在意的却是你有没有空陪他。单身时先看相处是否舒服；有伴侣时，别让一句‘你应该懂我’代替真正的沟通。”
这些示范不是通用结论，也不是要逐句套用的模板。每个段落至少增加一个具体细节：谁在做什么、哪里卡住、钱花在哪里、相处时哪句话没说清。职业、收入和关系状态未知时，用“上班的话”“有合作项目时”“已经有伴侣的话”等自然条件，不编造用户事实。相邻段落不要用相同开头，不在各栏重复同一情景。超过180字的正文用\\n\\n分成2–3个自然段，段内正常标点，不用项目符号、Markdown标题或逐句换行。`;

const JARGON=/本命四化|流年四化|流月四化|化禄|化权|化科|化忌|庙旺|旺陷|得地|失地|三方四正|对宫|拱照|财荫夹印|杀破狼|财官双美|身强|食神|劫财|偏印格|紫微|天机|太阳庙|武曲|天同(?:星|坐|入|庙|旺|化)|廉贞|天府|太阴|贪狼|巨门|天相(?:星|坐|入|庙|旺|化)|天梁|七杀|破军|禄存|文昌|文曲|命身同宫|命宫|官禄宫|财帛宫|夫妻宫|疾厄宫|田宅宫|福德宫/;
export function needsPlainVoice(text:string){return JARGON.test(text)||/这一信号可对应|传统上可读作|若你目前|外稳内紧|结构性张力|赋能|润养|能量场/.test(text)||/\b[A-Za-z]{3,}\b/.test(text);}
export type VoiceField={id:string;text:string};
export function voiceFields(value:unknown,path:string[]=[]):VoiceField[]{
 if(!value||typeof value!=='object')return[];
 return Object.entries(value).flatMap(([key,v])=>typeof v==='string'&&PROSE_KEYS.has(key)&&needsPlainVoice(v)?[{id:[...path,key].join('.'),text:v}]:typeof v==='object'?voiceFields(v,[...path,key]):[]);
}
export const VOICE_REPAIR_SYSTEM=`你是观星报告的大白话编辑。只重写输入fields里的文字，保留id和原来的时间、好坏判断、适用条件。把所有命理术语彻底换成生活语言，不保留任何星名、宫名或四化名词，不夹英文，不使用“若你目前”“这一信号可对应”等固定句式。别解释术语，直接讲生活里的具体事情。原文多长，改写后就尽量保持相近的信息量；超过180字分为2–3个自然段。headline改为简短的口语标题。不要添加保证、医学结论或新事件。每个字段都返回，id原样保留。只输出JSON：{"patches":[{"id":"原id","text":"完整改写后的文字"}]}。`;

export function applyVoicePatches(value:unknown,patch:unknown,fields:VoiceField[],validateVoice=true){
 const patches=(patch as {patches?:VoiceField[]})?.patches;
 if(!Array.isArray(patches)||patches.length!==fields.length||new Set(patches.map(p=>p.id)).size!==fields.length)throw Error('详批文字整理未完成，请重试。');
 const copy=structuredClone(value) as Record<string,unknown>;
 for(const field of fields){const p=patches.find(p=>p.id===field.id);if(!p||typeof p.text!=='string'||!p.text.trim()||p.text.length>1800||(validateVoice&&needsPlainVoice(p.text)))throw Error('详批文字仍不够清楚，请重试。');const keys=field.id.split('.');let target=copy;for(const key of keys.slice(0,-1))target=target[key] as Record<string,unknown>;target[keys.at(-1)!]=p.text.trim();}
 return copy;
}
