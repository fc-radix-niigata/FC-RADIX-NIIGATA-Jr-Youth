// Netlify Function: sgrumのスケジュールAPIをプロキシして返す（スクール U10/U12）
exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=3600' // 1時間キャッシュ
  };

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

      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });

      if (!res.ok) continue;
      const data = await res.json();

      for (const [dateKey, items] of Object.entries(data.dayCalendarData || {})) {
        for (const item of items) {
          const t = item.title;
          if ((t.includes('U12') || t.includes('U10')) && t.includes('スクール')) {
            const d = (data.detailData || {})[String(item.seq)] || {};
            const timeStr = d.startTime && d.endTime ? `${d.startTime}〜${d.endTime}` : '';
            const cls = t.includes('U12') ? 'u12' : 'u10';
            if (!allEvents[dateKey]) allEvents[dateKey] = [];
            allEvents[dateKey].push({ cls, label: cls.toUpperCase(), time: timeStr });
          }
        }
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(allEvents)
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message })
    };
  }
};
