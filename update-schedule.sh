#!/bin/bash
# FC RADIX NIIGATA ジュニアユース スケジュール自動更新スクリプト
# sgrum公式（schedule.ajax）から U13/U14/U15 の予定を取得して schedule-data.js を生成する
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
OUTPUT="$SCRIPT_DIR/schedule-data.js"

echo "スケジュール更新中..."

python3 - "$OUTPUT" <<'EOF'
import urllib.request, json, sys, re
from datetime import date, datetime

output_path = sys.argv[1]

def fetch(year, month):
    url = f"https://sgrum.com/web/fcradixniigata/schedule.ajax?year={year}&month={month:02d}"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=10) as r:
            return json.loads(r.read())
    except Exception as e:
        print(f"  取得失敗 {year}/{month:02d}: {e}", file=sys.stderr)
        return None

CATS = ("U13", "U14", "U15")

def extract(data):
    out = {}
    if not data:
        return out
    detail = data.get("detailData", {})
    for dateKey, items in data.get("dayCalendarData", {}).items():
        for item in items:
            t = item.get("title", "")
            # スクール（U10/U12）はジュニアユースサイトでは扱わない
            if "スクール" in t:
                continue
            cat = next((c for c in CATS if c in t), None)
            if not cat:
                continue
            d = detail.get(str(item["seq"]), {})
            is_off = "OFF" in t.upper()
            if is_off:
                time_str = "OFF"
            elif d.get("startTime") and d.get("endTime"):
                time_str = d["startTime"] + "〜" + d["endTime"]
            else:
                # OFF以外で時間未設定のものは種別名を表示（試合・TRM等）
                label = re.sub(r"［.*?］|\[.*?\]", "", t).strip()
                time_str = label
            cls = cat.lower() + (" off" if is_off else "")
            out.setdefault(dateKey, []).append(
                {"cls": cls, "label": cat, "time": time_str}
            )
    # カテゴリ順（U13→U14→U15）で並べる
    for k in out:
        out[k].sort(key=lambda e: e["label"])
    return out

today = date.today()
all_events = {}

for delta in range(3):
    m = today.month + delta
    y = today.year + (m - 1) // 12
    m = ((m - 1) % 12) + 1
    print(f"  取得中: {y}/{m:02d}")
    all_events.update(extract(fetch(y, m)))

# 既存データと同一なら書き込まない（不要なデプロイを防ぐ）
import os
json_path = os.path.join(os.path.dirname(output_path), "schedule.json")
if os.path.exists(json_path):
    try:
        with open(json_path, encoding="utf-8") as f:
            if json.load(f) == all_events:
                print(f"  変更なし: {len(all_events)}日分（ファイルは更新しません）")
                sys.exit(0)
    except Exception:
        pass

now_str = datetime.now().strftime("%Y-%m-%d %H:%M")
lines = [f"// 自動更新: {now_str}"]
lines.append("const SCHEDULE_DATA = {")
for k in sorted(all_events.keys()):
    v = json.dumps(all_events[k], ensure_ascii=False)
    lines.append(f'  "{k}": {v},')
lines.append("};")

with open(output_path, "w", encoding="utf-8") as f:
    f.write("\n".join(lines) + "\n")

# JSON版も出力（ブラウザからキャッシュ回避付きで取得する用）
with open(json_path, "w", encoding="utf-8") as f:
    json.dump(all_events, f, ensure_ascii=False)

print(f"  完了: {len(all_events)}日分 → {output_path} / {json_path}")
EOF
