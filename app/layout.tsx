import type { Metadata } from 'next';
import './globals.css';
import './guanxing.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import { SITE_URL } from '@/lib/site';
export const metadata: Metadata = { title:'观星 · 紫微斗数',description:'输入出生时刻，探索你的十二宫星图。紫微排盘、星曜象义、古籍学习与本地命盘收藏。',metadataBase:new URL(SITE_URL),openGraph:{title:'观星 · 紫微斗数',description:'观星有时，人生由己。',siteName:'观星',locale:'zh_CN',type:'website'} };
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="zh-CN" data-theme="light" suppressHydrationWarning><body className="min-h-screen"><ThemeProvider>{children}</ThemeProvider></body></html>}
