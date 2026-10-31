import type {DetailContext} from '../../lib/guanxing/ai-detail';
export function detailFixture(ctx:DetailContext){
 const paragraph='这是一段用于验证数据结构的测试文字。这里按输入中的宫位和四化讨论具体事务的安排，比较工作责任、收入兑现与家庭分工的侧重。测试文字不用于展示真实分析，也不表示对未来的判断。';
 const entry=(id:string,ids:string[])=>({id,headline:'测试主题',reading:paragraph,basisIds:ids.slice(0,2)});
 return{natal:['character','work','relationship'].map(id=>entry(id,ctx.natal.map(n=>n.id))),cycles:ctx.cycles.map(c=>entry(c.id,c.facts.map(f=>f.id))),years:ctx.years.map(y=>entry(y.id,y.domains.slice(0,2).map(d=>d.facts[0].id))),months:ctx.months.map(m=>entry(m.id,m.segments[0].domains.slice(0,2).map(d=>d.facts[0].id)))};
}
