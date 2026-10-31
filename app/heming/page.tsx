'use client';
import {useState} from 'react';
import GuanxingNav,{GuanxingFooter} from '@/components/GuanxingNav';
import GuanxingForm from '@/components/GuanxingForm';
import GuanxingReading from '@/components/GuanxingReading';
import {generateChart} from '@/lib/ziwei/algorithm';
import {prepareBirth,type BirthDraft} from '@/lib/guanxing/birth';
import type {ZiweiChart} from '@/lib/ziwei/types';
export default function Compare(){const [charts,setCharts]=useState<(ZiweiChart|null)[]>([null,null]);return <div className="gx"><GuanxingNav/><main className="gx-inner"><span className="gx-eyebrow">SIDE BY SIDE</span><h1 className="gx-page-title">两张星图，一起认识。</h1><p>并排阅读两个人的命宫象义，不给关系打分。真实的相处，来自彼此的沟通与选择。</p><div className="gx-comparison">{[0,1].map(i=><section key={i}><h2 className="gx-page-title">{i?'第二位':'第一位'}</h2>{charts[i]?<><button className="gx-demo" onClick={()=>setCharts(c=>c.map((x,j)=>j===i?null:x))}>修改出生信息</button><GuanxingReading chart={charts[i]!} palace={charts[i]!.palaces.find(p=>p.isMingGong)!}/></>:<GuanxingForm onSubmit={(d:BirthDraft)=>{const chart=generateChart(prepareBirth(d).info);setCharts(c=>c.map((x,j)=>j===i?chart:x));}}/>}</section>)}</div></main><GuanxingFooter/></div>}
