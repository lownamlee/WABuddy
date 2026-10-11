export const BUSINESS_STORAGE = 'wabuddy-business-ui-v1';
export const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export type HoursMode = 'specific' | 'always' | 'appointment';
export type DayHours = { enabled: boolean; intervals: { open: string; close: string }[] };
export type BusinessProfile = { name: string; description: string; address: string; coverage: string; notes: string; email: string; phone: string; websites: string[]; categories: string[]; hoursMode: HoursMode; hours: DayHours[]; photo: string; cover: string; about: string; duration: string };
export type Product = { id: string; name: string; price: string; sale: string; description: string; link: string; code: string; country: string; hidden: boolean; images: string[] };
export type QuickReply = { id: string; shortcut: string; message: string };
export type CustomerList = { id: string; name: string; color: string; members: string[] };
export type BusinessData = { profile: BusinessProfile; products: Product[]; replies: QuickReply[]; lists: CustomerList[]; currency: string };
export const categories = ['Other Business', 'Automotive Service', 'Apparel & clothing', 'Arts & entertainment', 'Beauty, cosmetic & personal care', 'Education', 'Event Planner', 'Finance', 'Grocery Store', 'Hotel', 'Medical & health', 'Nonprofit organization', 'Restaurant', 'Shopping & retail', 'Travel & Transportation'];
export const listSuggestions = ['New customer', 'New order', 'Pending payment', 'Follow up', 'Paid', 'Order complete', 'Lead', 'Important'];
export const contacts = [{ id: 'alex', name: 'Alex Morgan', initial: 'A' }, { id: 'jamie', name: 'Jamie Lee', initial: 'J' }, { id: 'maya', name: 'Maya Chen', initial: 'M' }];
export function newBusinessData(): BusinessData {
  return { currency: 'MYR', profile: { name: 'Your business', description: '', address: '', coverage: 'Exact location', notes: '', email: '', phone: '+60 12-000 0000', websites: [''], categories: ['Other Business'], hoursMode: 'always', hours: days.map(() => ({ enabled: true, intervals: [{ open: '09:00', close: '18:00' }] })), photo: '', cover: '', about: '', duration: '1 day' }, products: [], replies: [{ id: 'thanks', shortcut: 'thanks', message: 'Thank you for your business! We look forward to working with you again.' }], lists: [] };
}
export function hoursError(mode: HoursMode, hours: DayHours[]): string {
  if (mode !== 'specific') return '';
  for (let i = 0; i < hours.length; i++) {
    if (!hours[i].enabled) continue;
    const ranges = [...hours[i].intervals].sort((a,b) => a.open.localeCompare(b.open));
    if (!ranges.length || ranges.some(r => !/^\d{2}:\d{2}$/.test(r.open) || !/^\d{2}:\d{2}$/.test(r.close) || r.open >= r.close)) return `${days[i]} needs a closing time after its opening time.`;
    if (ranges.some((r,j) => j > 0 && r.open < ranges[j-1].close)) return `${days[i]} has overlapping hours.`;
  }
  return '';
}
export function productError(product: Product): string {
  if (!product.name.trim()) return 'Enter an item name.';
  if (!product.images.length) return 'Add at least one image.';
  if (!product.country) return 'Select a country of origin.';
  if ([product.price, product.sale].some(v => v !== '' && (!Number.isFinite(Number(v)) || Number(v) < 0))) return 'Enter a valid positive price.';
  if (product.sale && (!product.price || Number(product.sale) >= Number(product.price))) return 'Sale price must be less than the regular price.';
  if (product.link && !/^https?:\/\//i.test(product.link)) return 'Use a link starting with https:// or http://.';
  return '';
}
export function formatHours(profile: BusinessProfile, day: number): string {
  const h = profile.hours[day];
  if (!h.enabled) return 'Closed';
  if (profile.hoursMode === 'always') return 'Open 24 hours';
  if (profile.hoursMode === 'appointment') return 'By appointment only';
  return h.intervals.map(r => `${r.open}–${r.close}`).join(', ');
}
