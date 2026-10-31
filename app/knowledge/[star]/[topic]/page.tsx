import Link from 'next/link';
import {notFound} from 'next/navigation';
import GuanxingNav,{GuanxingFooter} from '@/components/GuanxingNav';
import {STAR_NOTES} from '@/lib/guanxing/reading';
import {STAR_TO_SLUG,SLUG_TO_STAR} from '@/lib/seo/knowledge';
export const dynamicParams=false;
export function generateStaticParams(){return Object.keys(STAR_NOTES).map(s=>({star:STAR_TO_SLUG[s],topic:'overview'}));}
export async function generateMetadata({params}:{params:Promise<{star:string;topic:string}>}){const p=await params;return{title:`${SLUG_TO_STAR[p.star]||'星曜'} · 观星百科`};}
export default async function StarPage({params}:{params:Promise<{star:string;topic:string}>}){const p=await params;const star=SLUG_TO_STAR[p.star];const data=STAR_NOTES[star];if(!data||p.topic!=='overview')notFound();return <div className="gx"><GuanxingNav/><main className="gx-inner gx-prose"><Link href="/knowledge">← 十四主星</Link><h1 className="gx-page-title">{star}</h1><span className="gx-eyebrow">{data.theme}</span><h2>理解这颗星</h2><p>{data.text}</p><h2>放回完整命盘中理解</h2><p>同一颗星落在不同宫位，传统解释会关注不同的生活主题。主星、同宫辅星、对宫与三方四正应一并阅读，不能只凭一个标签判断一个人的性格或未来。</p><div className="gx-question"><span>留一个问题给自己</span><p>{data.question}</p></div><h2>继续探索</h2><p><Link href={`/library/search?q=${encodeURIComponent(star)}`}>在古籍中搜索「{star}」 ↗</Link></p><Link href="/chart" className="gx-primary">在我的命盘中找它 ↗</Link></main><GuanxingFooter/></div>}
