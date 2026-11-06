/* ارتقای داده‌ی ذخیره‌شده بین نسخه‌ها (بدون از دست رفتن چیزی). */
export function migrate(s) {
  if (s.v === 1) {
    // نسخه‌ی ۱: هر عملیات فقط یک بازه با درصد دستی بود. نسخه‌ی ۲: هر «کار» یک جعبه با متراژ و کارکرد روزانه.
    const tradeName = (id) => s.trades.find((t) => t.id === id)?.name || 'کار';
    s.plans = s.plans.map((p) => ({
      id: p.id, tradeId: p.tradeId, title: p.title || tradeName(p.tradeId), start: p.start, end: p.end,
      unit: 'متر', qty: 0, progress: p.progress || 0,
      people: s.people.filter((x) => x.tradeId === p.tradeId).map((x) => x.id), log: [],
    }));
    s.v = 2;
  }
  return s;
}
