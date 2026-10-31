import Link from 'next/link';
import GuanxingNav,{GuanxingFooter} from '@/components/GuanxingNav';
import {STAR_NOTES} from '@/lib/guanxing/reading';
import {STAR_TO_SLUG} from '@/lib/seo/knowledge';
export const metadata={title:'十四主星 · 观星百科',description:'用清楚的语言认识紫微斗数十四主星的传统文化象义。'};
export default function Knowledge(){return <div className="gx"><GuanxingNav/><main className="gx-inner"><span className="gx-eyebrow">THE FOURTEEN STARS</span><h1 className="gx-page-title">十四主星，十四种视角。</h1><p>先认识星曜的象征，再回到真实生活。这里的描述是文化释义，不是固定的人格标签。</p><div className="gx-stars">{Object.entries(STAR_NOTES).map(([star,data])=><article className="gx-star-card" key={star}><h2>{star}</h2><h3>{data.theme}</h3><p>{data.text}</p><Link href={`/knowledge/${STAR_TO_SLUG[star]}/overview`}>走近这颗星 ↗</Link></article>)}</div></main><GuanxingFooter/></div>}
