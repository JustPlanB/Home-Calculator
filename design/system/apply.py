# اعمال سیستم طراحی روی index.html (یک بار؛ تکرارش بی‌اثر است چون نشانه‌گذاری دارد)
# - توکن‌ها اول بلوک <style>، لایهٔ نقش‌ها (refine.css) آخر همان بلوک
# - یک آبی (#08b5f5) برای هر دو حالت به‌جای شش آبی، در CSS و JS
# - خاکستری‌های کم‌اهمیت، قرمزهای کار مخرب و خط تکراری ← توکن
# - وزن ۸۰۰/۹۰۰ ← ۷۰۰ و ۵۰۰ ← ۴۰۰ (فونت جاسازی‌شده همین سه وزن را دارد)
# - اندازهٔ فونت‌ها به نزدیک‌ترین پلهٔ مقیاس ۹ پله‌ای (1rem/16px/em/٪ و اندازه‌های نمایشی ≥۲۷px دست نمی‌خورند)
import re, sys, os
ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
P = os.path.join(ROOT, 'index.html')
src = open(P, encoding='utf-8').read()
if 'HK-DS-TOKENS' in src: sys.exit('already applied')

s_open = src.index('<style>') + len('<style>')
s_close = src.index('</style>', s_open)
head, css, tail = src[:s_open], src[s_open:s_close], src[s_close:]
stats = {}
def count(k, n): stats[k] = stats.get(k, 0) + n

# ---- ۱) یک آبی ----
BLUE = '#08b5f5'
blue_re = re.compile(r'#(?:0a84ff|00b7ff|0090d4|007aff|0086c3)\b', re.I)
rgba_re = re.compile(r'rgba\(\s*(?:10\s*,\s*132\s*,\s*255|0\s*,\s*183\s*,\s*255|0\s*,\s*144\s*,\s*212|0\s*,\s*122\s*,\s*255|0\s*,\s*134\s*,\s*195)\s*,', re.I)
def blues(t, key):
    t, n1 = blue_re.subn(BLUE, t); t, n2 = rgba_re.subn('rgba(8,181,245,', t); count(key, n1 + n2); return t

# ---- ۲) فقط داخل CSS: توکن‌های معنایی ----
def protect_data(t):
    keep = []
    def sv(m): keep.append(m.group(0)); return '\x00%d\x00' % (len(keep) - 1)
    return re.sub(r'url\(data:[^)]*\)', sv, t), keep
def restore(t, keep): return re.sub(r'\x00(\d+)\x00', lambda m: keep[int(m.group(1))], t)
css, keep = protect_data(css)
css = blues(css, 'blue_css')
for pat, rep, key in [
    (r'#(?:8e8e93|9a9a9a|a1a1a6)\b', 'var(--hk-muted)', 'muted'),
    (r'#(?:ff453a|ff3b30|e0443a)\b', 'var(--hk-danger)', 'danger'),
    (r'#3a3a3e\b', '#3a3a3c', 'line'),
]:
    css, n = re.subn(pat, rep, css, flags=re.I); count(key, n)
# وزن
css, n = re.subn(r'font-weight:\s*(?:800|900|bold)\b', 'font-weight: 700', css); count('fw', n)
css, n = re.subn(r'font-weight:\s*500\b', 'font-weight: 400', css); count('fw', n)
# اندازهٔ فونت ← پله‌ها
STEPS = [(11.5, 'var(--hk-fs-caption)'), (12.5, 'var(--hk-fs-label)'), (13.5, 'var(--hk-fs-small)'), (14.5, 'var(--hk-fs-body)'),
         (15.8, 'var(--hk-fs-control)'), (18.5, 'var(--hk-fs-title)'), (21.5, 'var(--hk-fs-heading)'), (27, 'var(--hk-fs-figure)')]
EXC = re.compile(r'(hk-ar-tick small|rec-row-tag|sp-cat-chip\.sm|\.st-ax|\.st-dc2|\.ring|svg|text\b)')
out, pos = [], 0
for m in re.finditer(r'([^{}]*)\{([^{}]*)\}', css):
    sel, body = m.group(1), m.group(2)
    if not EXC.search(sel):
        def fs(mm):
            v, u = float(mm.group(1)), mm.group(2)
            px = v * 16 if u == 'rem' else v
            if (u == 'rem' and v == 1) or (u == 'px' and v == 16) or px >= 27: return mm.group(0)
            for lim, tok in STEPS:
                if px < lim: count('fs', 1); return 'font-size: ' + tok
            return mm.group(0)
        body = re.sub(r'font-size:\s*([0-9.]+)(rem|px)\b', fs, body)
    out.append(css[pos:m.start()] + sel + '{' + body + '}'); pos = m.end()
out.append(css[pos:]); css = ''.join(out)
css = restore(css, keep)

tokens = open(os.path.join(os.path.dirname(__file__), 'tokens.css'), encoding='utf-8').read()
refine = open(os.path.join(os.path.dirname(__file__), 'refine.css'), encoding='utf-8').read()
css = '\n    /* ===== HK-DS-TOKENS: سیستم طراحی (توکن‌ها) — design/system/tokens.css ===== */\n' + tokens + css.rstrip() + \
      '\n    /* ===== HK-DS-ROLES: قواعد نقش‌ها (دکمه، پنجره، فیلد، نوشته، لمس) — design/system/refine.css ===== */\n' + refine + '\n'

# ---- ۳) JS و HTML: فقط آبی‌ها (رنگ‌های مستقیم دکمه‌ها، آیکن‌ها، نمودارها و PDF) ----
head = blues(head, 'blue_html'); tail = blues(tail, 'blue_js')
open(P, 'w', encoding='utf-8').write(head + css + tail)
print(stats)
