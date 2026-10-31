import type { ZiweiChart, Palace } from '../ziwei/types';
import { BRANCHES } from '../ziwei/constants';
export const STAR_NOTES: Record<string, { theme: string; text: string; question: string }> = {
  紫微: { theme:'统筹 · 自主', text:'紫微在传统象义中代表统筹、秩序与自主。可把它理解为观察自己如何承担责任、协调资源的一面镜子。', question:'你愿意承担哪些责任，又有哪些事可以交给别人？' },
  天机: { theme:'思考 · 变化', text:'天机常被用来象征思考、谋划与变化。学习能力与行动节奏，是这一象义可以启发的两个观察方向。', question:'当前的思考是在帮助行动，还是让你迟迟无法开始？' },
  太阳: { theme:'表达 · 付出', text:'太阳的传统象义与公开表达、热情和付出有关。它适合用来反思你在群体中怎样被看见。', question:'你在照顾别人时，有没有给自己留出空间？' },
  武曲: { theme:'执行 · 积累', text:'武曲常被赋予执行、规则与资源管理的象义。这里讨论做事风格，不由星曜推断收入或投资结果。', question:'你能把一个模糊目标拆成哪些可执行的小步骤？' },
  天同: { theme:'温和 · 体验', text:'天同象征温和、舒适与感受生活的能力。它也提醒人留意舒适与主动改变之间的平衡。', question:'什么让你感到安稳，什么又值得你走出舒适区？' },
  廉贞: { theme:'边界 · 热忱', text:'廉贞的传统讨论常涉及原则、情感表达与界限。可以借此观察自己的热忱如何与规则相处。', question:'在哪段关系或哪件事情里，你需要更清楚地表达边界？' },
  天府: { theme:'稳定 · 守成', text:'天府常象征稳定、管理与保存资源。适合作为检查生活秩序和长期积累的反思线索。', question:'你已经拥有的哪些资源值得耐心维护？' },
  太阴: { theme:'感受 · 内省', text:'太阴常与细腻感受、内省和安静的积累联系在一起。它提供的是文化象征，不是对性别或能力的判断。', question:'你最近是否听见了自己的真实感受？' },
  贪狼: { theme:'探索 · 兴趣', text:'贪狼象征多样兴趣、社交与探索。可以用它思考好奇心与专注之间如何取得平衡。', question:'你最愿意长期投入的兴趣是哪一个？' },
  巨门: { theme:'辨析 · 沟通', text:'巨门的象义与言语、辨析和提问有关。既关注表达的力量，也关注倾听与误解的可能。', question:'哪一次沟通可以少一点推测、多一次确认？' },
  天相: { theme:'协作 · 公平', text:'天相常被描述为协调、支持与公平。可以借它观察你在合作中扮演的角色。', question:'在帮助别人时，你的需求是否也被认真对待？' },
  天梁: { theme:'照顾 · 原则', text:'天梁的传统象义包括照顾、经验与原则。这里关注生活中的支持关系，不作疾病或寿命判断。', question:'哪些经验可以分享，哪些答案需要让对方自己寻找？' },
  七杀: { theme:'果决 · 开拓', text:'七杀常象征果决、独立与应对挑战。它适合用来反思行动前的准备和面对变化的方式。', question:'你准备承担的挑战，有没有清楚的边界与退路？' },
  破军: { theme:'更新 · 突破', text:'破军象征打破旧模式与重新组织。它可以启发改变，但不意味着生活一定发生重大变故。', question:'哪些旧习惯值得更新，哪些稳定基础应该保留？' },
};
const DOMAINS: Record<string,string> = { 命宫:'自我认知与做事方式',兄弟:'同辈关系与合作',夫妻:'亲密关系与沟通',子女:'照顾、陪伴与传承',财帛:'资源管理与价值观',疾厄:'日常作息与自我照顾',迁移:'环境变化与外部体验',交友:'社交边界与支持网络',仆役:'社交边界与支持网络',官禄:'工作方式与责任',田宅:'居住体验与归属感',福德:'休息、兴趣与精神生活',父母:'与长辈的联系及边界' };
export function readPalace(chart: ZiweiChart, palace: Palace) {
  const own = palace.stars.filter(s => s.type === 'major');
  const opposite = chart.palaces.find(p => p.branch === (palace.branch + 6) % 12)!;
  const stars = own.length ? own : opposite.stars.filter(s => s.type === 'major');
  const domain = DOMAINS[palace.name] || DOMAINS[palace.name.replace(/宫$/, '')] || '生活体验';
  const evidence = `${palace.name}位于${BRANCHES[palace.branch]}。${own.length ? `主星：${own.map(s => `${s.name}${s.brightnessRaw ? `（${s.brightnessRaw}）` : ''}`).join('、')}。` : `本宫无主星，传统上参考对宫${opposite.name}的${stars.map(s=>s.name).join('、') || '星曜'}，不等于这一领域缺失。`}`;
  const transformations = palace.stars.filter(s => s.siHua).map(s => `${s.name}化${s.siHua}`).join('、');
  const texts = stars.map(s => STAR_NOTES[s.name]?.text).filter(Boolean);
  return { domain, evidence, transformations, stars, texts, question: palace.name.includes('疾厄') ? '最近的作息和休息是否让你感到舒服？身体不适时应寻求正规医疗帮助，不能依据命盘判断疾病。' : stars.map(s => STAR_NOTES[s.name]?.question).filter(Boolean).join(' ') };
}
export function exportReading(chart: ZiweiChart, note: string) {
 return `# ${chart.birthInfo.name || '我的'} · 观星命盘\n\n${note}\n\n${chart.wuxingJuName} · 命主 ${chart.mingZhu} · 身主 ${chart.shenZhu}\n\n仅供传统文化学习与自我反思，不代表可验证的人生预测。\n\n` + chart.palaces.map(p=>{const r=readPalace(chart,p);return `## ${p.name} · ${r.domain}\n\n${r.evidence}\n\n${r.transformations}\n\n${r.texts.join('\n\n')}\n\n反思：${r.question}`;}).join('\n\n') + '\n\n引擎来源：https://github.com/Renhuai123/ziwei-doushu\n个人版本：https://github.com/dzhdingzihang/ziwei-doushu\n解读：观星原创规则解释，非上游商业断语库、非 AI 生成。\n';
}
