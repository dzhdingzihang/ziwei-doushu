import {env} from 'cloudflare:workers';
import {AIError,parseAIRequest,buildAIContext,callAI,callAIStage} from '@/lib/guanxing/ai-server';
import {ANNUAL_STAGES,type AIStage} from '@/lib/guanxing/ai-types';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 const headers={'Cache-Control':'no-store','Content-Type':'application/json'};
 try{
  // The Site is owner-private; Sites authenticates access before this Worker.
  const origin=request.headers.get('origin');
  if(origin&&origin!==new URL(request.url).origin)throw new AIError('请从本站发起分析。',403);
  if(!request.headers.get('content-type')?.includes('application/json'))throw new AIError('请求格式不正确。',415);
  const body=await request.text();if(body.length>2048)throw new AIError('请求内容过长。',413);
  let raw:unknown;try{raw=JSON.parse(body);}catch{throw new AIError('请求内容无效。');}
  const {birth,query}=parseAIRequest(raw);
  const ctx=buildAIContext(birth,query);
  const key=(env as unknown as Record<string,string>).DASHSCOPE_API_KEY||process.env.DASHSCOPE_API_KEY||'';
  const stage=(raw as {stage?:unknown}).stage;
  if(stage!==undefined){
   if(!ANNUAL_STAGES.includes(stage as AIStage))throw new AIError('未知的报告章节。');
   return Response.json({chunk:await callAIStage(ctx,key,stage as AIStage,request.signal)},{headers});
  }
  return Response.json({report:await callAI(ctx,key,request.signal)},{headers});
 }catch(error){const known=error instanceof AIError;return Response.json({error:known?error.message:'暂时无法分析这张命盘，请检查时间或稍后重试。'},{status:known?error.status:500,headers});}
}
