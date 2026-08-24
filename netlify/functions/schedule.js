// Netlify Function: sgrumのスケジュールAPIをプロキシして返す（ジュニアユース U13/U14/U15）
exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=300' // 5分キャッシュ（更新が多いため短め）
  };

  const CATS = ['U13', 'U14', 'U15'];

  try {
    const today = new Date();
    const months = [];

    // 今月〜2ヶ月先の3ヶ月分を取得
    for (let i = 0; i < 3; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
      months.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
    }

    const allEvents = {};

    for (const { year, month } of months) {
      const mm = String(month).padStart(2, '0');
      const url = `https://sgrum.com/web/fcradixniigata/schedule.ajax?year=${year}&month=${mm}`;

      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!res.ok) continue;
      const data = await res.json();

      for (const [dateKey, items] of Object.entries(data.dayCalendarData || {})) {
        for (const item of items) {
          const t = item.title || '';
          if (t.includes('スクール')) continue;           // U10/U12スクールは対象外
          const cat = CATS.find(c => t.includes(c));
          if (!cat) continue;

          const d = (data.detailData || {})[String(item.seq)] || {};
          const isOff = t.toUpperCase().includes('OFF');
          let timeStr;
          if (isOff) {
            timeStr = 'OFF';
          } else if (d.startTime && d.endTime) {
            timeStr = `${d.startTime}〜${d.endTime}`;
          } else {
            timeStr = t.replace(/［.*?］|\[.*?\]/g, '').trim();
          }

          const cls = cat.toLowerCase() + (isOff ? ' off' : '');
          if (!allEvents[dateKey]) allEvents[dateKey] = [];
          allEvents[dateKey].push({ cls, label: cat, time: timeStr });
        }
      }
    }

    // カテゴリ順に整列
    for (const k of Object.keys(allEvents)) {
      allEvents[k].sort((a, b) => a.label.localeCompare(b.label));
    }

    return { statusCode: 200, headers, body: JSON.stringify(allEvents) };

  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
