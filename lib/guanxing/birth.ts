import { calculateTrueSolarTime, resolveZiweiDayOffset, shiftGregorianDate, isValidGregorianDate, formatTrueSolarClock } from '../ziwei/true-solar-time';
import type { BirthInfo } from '../ziwei/types';
export type BirthDraft = { name: string; date: string; time: string; gender: 'male' | 'female'; province: string; city: string; longitude?: number; solar: boolean; dst: boolean; late: 'next-day' | 'current-day' };
export const EMPTY_DRAFT: BirthDraft = { name: '', date: '', time: '', gender: 'male', province: '', city: '', solar: false, dst: false, late: 'next-day' };
export function prepareBirth(d: BirthDraft): { info: BirthInfo; note: string } {
  const [year, month, day] = d.date.split('-').map(Number);
  const [clockHour, clockMinute] = d.time.split(':').map(Number);
  if (!isValidGregorianDate(year, month, day) || year < 1900 || year > new Date().getFullYear()) throw Error('请填写有效的公历出生日期（1900 年至今）。');
  const today = new Date();
  if (Date.UTC(year, month - 1, day) > Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) throw Error('出生日期不能晚于今天。');
  if (!Number.isInteger(clockHour) || !Number.isInteger(clockMinute) || clockHour < 0 || clockHour > 23 || clockMinute < 0 || clockMinute > 59) throw Error('请填写准确的出生时间；时辰不详时不宜生成确定命盘。');
  if (d.gender !== 'male' && d.gender !== 'female') throw Error('请选择排盘性别。');
  if (d.solar && (!d.city || !Number.isFinite(d.longitude))) throw Error('请先选择出生城市，再启用真太阳时。');
  const original = { year, month, day, clockHour, clockMinute };
  // A separate explicit toggle records consent to subtract daylight saving time.
  const minutes = clockHour * 60 + clockMinute - (d.dst ? 60 : 0);
  const standardDay = shiftGregorianDate(original, Math.floor(minutes / 1440));
  const normalized = ((minutes % 1440) + 1440) % 1440;
  const solar = calculateTrueSolarTime({ ...standardDay, clockHour: Math.floor(normalized / 60), clockMinute: normalized % 60, longitude: d.solar ? d.longitude : undefined });
  const offset = resolveZiweiDayOffset(solar, d.late);
  const date = shiftGregorianDate(standardDay, offset);
  const note = `${d.solar ? '真太阳时' : '北京时间（标准时）'} ${formatTrueSolarClock(solar, true)} · ${d.dst ? '已按你的选择扣除夏令时 1 小时 · ' : ''}排盘日 ${date.year}-${date.month}-${date.day} · 晚子时${d.late === 'next-day' ? '换日' : '不换日'}`;
  return { info: { ...date, hour: solar.branch, gender: d.gender, name: d.name.trim().slice(0, 30), province: d.province, city: d.city, longitude: d.solar ? d.longitude : undefined, origInput: original }, note };
}
export const SESSION_KEY = 'guanxing-current-v1';
export const HISTORY_KEY = 'guanxing-history-v1';
export type SavedChart = { id: string; draft: BirthDraft; savedAt: string };
export function getSaved(): SavedChart[] { try { const rows = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); return Array.isArray(rows) ? rows.filter(r => r?.draft?.date && r?.id).slice(0, 30) : []; } catch { return []; } }
