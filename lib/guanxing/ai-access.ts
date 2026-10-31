export type AnalysisLimiter = {limit(options:{key:string}):Promise<{success:boolean}>};

/** Cloudflare supplies this header; visitors cannot choose their quota key. */
export async function allowAnalysis(request:Request, limiter?:AnalysisLimiter):Promise<boolean>{
 if(!limiter)throw new Error('AI rate limiter binding is missing');
 const ip=request.headers.get('cf-connecting-ip')||'local-preview';
 return (await limiter.limit({key:`ai:${ip}`})).success;
}
