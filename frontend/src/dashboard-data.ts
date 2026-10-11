/** Fictional, local-only examples for the dashboard design preview. */
export const periods = {
  week: { label: 'Last 7 days', range: '5 – 11 Oct 2026', conversations: '1,284', handled: '1,052', orders: '86', response: '24s', change: '+18.6%', values: [120, 178, 138, 212, 170, 276, 190], ai: [98, 148, 108, 173, 137, 229, 159], labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
  month: { label: 'Last 30 days', range: '12 Sep – 11 Oct 2026', conversations: '5,420', handled: '4,390', orders: '348', response: '28s', change: '+12.4%', values: [580, 760, 680, 840, 790, 950, 820], ai: [470, 610, 548, 670, 642, 777, 673], labels: ['12 Sep', '17 Sep', '22 Sep', '27 Sep', '2 Oct', '7 Oct', '11 Oct'] },
  quarter: { label: 'Last 90 days', range: '14 Jul – 11 Oct 2026', conversations: '15,760', handled: '12,608', orders: '1,024', response: '31s', change: '+24.2%', values: [1400, 1700, 1950, 2210, 2480, 2760, 3260], ai: [1050, 1300, 1540, 1770, 1980, 2220, 2748], labels: ['14 Jul', '29 Jul', '13 Aug', '28 Aug', '12 Sep', '27 Sep', '11 Oct'] },
};
export type Period = keyof typeof periods;
export function periodSummary(period: Period) {
  const data = periods[period];
  const total = Number(data.conversations.replaceAll(',', ''));
  const handled = Number(data.handled.replaceAll(',', ''));
  return { total, handled, percent: Math.round(handled / total * 100), human: total - handled, hoursSaved: (handled / 60).toFixed(1) };
}
export const conversations = [
  { name: 'Aisha Rahman', initials: 'AR', color: 'peach', message: 'Can I collect my order at 6 pm instead?', topic: 'Pickup change', status: 'Needs you', time: '2 min ago', order: '#WB-1086', amount: 'RM 68.00', detail: 'Aisha would like to move collection from 4 pm to 6 pm. Her order is confirmed; the new collection time needs your approval.' },
  { name: 'Daniel Lim', initials: 'DL', color: 'sage', message: 'Hi! Is the matcha cake nut-free?', topic: 'Product question', status: 'Knowledge gap', time: '8 min ago', order: '#WB-1085', amount: 'RM 120.00', detail: 'The published menu does not include allergen information for the matcha cake. Buddy has left the question for a team member.' },
  { name: 'Nur Izzati', initials: 'NI', color: 'lilac', message: 'Just transferred. Here is the receipt.', topic: 'Payment check', status: 'Review payment', time: '12 min ago', order: '#WB-1084', amount: 'RM 45.00', detail: 'A payment receipt was shared. This order remains awaiting payment verification; a receipt alone does not confirm funds received.' },
  { name: 'Jason Tan', initials: 'JT', color: 'sand', message: 'Thank you! See you tomorrow morning.', topic: 'Order confirmed', status: 'AI handled', time: '24 min ago', order: '#WB-1083', amount: 'RM 96.00', detail: 'A breakfast box order is confirmed for tomorrow morning. No follow-up is needed in this sample conversation.' },
];
export type Conversation = typeof conversations[number];
export const activities = [
  { title: 'Order confirmed', detail: 'Jason Tan · Breakfast order', time: '24 min ago', kind: 'order' },
  { title: '12 questions answered', detail: 'Menu questions · AI handled', time: '38 min ago', kind: 'reply' },
  { title: 'Daily report ready', detail: 'Orders and pending follow-ups', time: '1 hour ago', kind: 'report' },
];
