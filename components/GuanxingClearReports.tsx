'use client';
import {useState} from 'react';
import {clearReportCache} from '@/lib/guanxing/ai-client';
export default function GuanxingClearReports(){const [message,setMessage]=useState('');return <><button className="gx-outline" onClick={()=>{try{clearReportCache([localStorage,sessionStorage]);setMessage('本机 AI 报告缓存已清除。');}catch{setMessage('浏览器阻止了清除操作，请通过浏览器设置清除本站数据。');}}}>清除本机 AI 报告</button>{message&&<p role="status">{message}</p>}</>}
