# تطبیق درخواست با دادهٔ واقعی — مرحلهٔ ۳ (نسخهٔ ۱)

تابع: `hkAsstMatch(spec, opts)` در `src/js/18l-assistant-matcher.js`. فقط ساختار استاندارد مرحلهٔ ۲ (`hkAsstAnalyze`) را می‌خواند؛ متن خام را دوباره تفسیر نمی‌کند (متن فقط برای ساخت پیشنهاد/پرسش به کار می‌رود). **هیچ جمع، تعداد، میانگین یا محاسبهٔ مالی ندارد**؛ فقط انتخاب ردیف‌ها و گزارش شرط‌ها. بدون اثر جانبی (حالت dry)، بدون ابزار یا وابستگی تازه. هنوز در مسیر گفتگو وصل نیست؛ مرحلهٔ ۴ از آن استفاده می‌کند.

## ورودی
`spec` خروجی `hkAsstAnalyze`. `opts` اختیاری.

## خروجی
| فیلد | معنی |
|---|---|
| `v`, `stage` | `1` و `3` |
| `status` | `ready` · `clarify` · `refuse` · `chat` · `navigate` · `app_action` |
| `exec` | `{tool, args, explain, intent, result_kind, operations, order, group_by}` نهایی؛ در غیر `ready` برابر `null` |
| `selection` | `basis` (`transactions`/`tool`/`none`)، `refs[{id,key,tab,sec,idx}]` ردیف‌های انتخاب‌شده، `incomplete_refs` (ردیف بی‌مبلغ؛ جدا گزارش می‌شود)، `empty`، `applied_args` |
| `conditions[]` | برای هر شرط spec: `slot`, `value`, `outcome` (`applied/no_rows/unknown/resolved/alternative/same_rows/no_row_named/not_evaluated`)، `how`، `data_basis`، `hits`، `incomplete_hits`، `removed_hits` |
| `readings` | `primary` (`category`/`tab_total`/`null`) و `alternatives[{reading:'row',word,category,args,refs,disclose}]` برای افشای خوانش دیگر |
| `clarification` | `{needed, reason, question, suggestions, term, side}` |
| `gaps`, `warnings`, `app_actions` | بی‌تغییر از تحلیل‌گر + هشدارهای تطبیق (مثل `explicit_search_unknown_term`) |
| `data_coverage` | `periods_with_rows`, `has_any_rows`, `requested_period_has_rows` |
| `closed_data_decisions`, `open_data_decisions` | تصمیم‌های data_dependent بسته‌شده؛ باز باید خالی باشد |
| `resume` | `{q, term}` برای پاسخ کوتاه به پرسش واژهٔ ناشناخته |
| `trace` | `[{step, detail}]` |

## قواعد تطبیق
- **واژهٔ کامل:** «نان» ≠ «دانانو»؛ جمع/عامیانه (ها، های، ا) و نیم‌فاصله تحمل می‌شود؛ عبارت چندواژه‌ای («قبض برق») پشت‌سرهم تطبیق می‌خورد.
- **نوع/زمان/مبلغ/وضعیت/حساب/پروژه:** روی ردیف‌های واقعی اعمال و با `hits` گزارش می‌شود؛ بازهٔ بی‌داده = `no_rows` با انتخاب خالی (نه خطا، نه عدد).
- **نفی/استثنا:** `removed_hits` تعداد ردیف کنارگذاشته‌شده؛ نام دسته یا واژه یا عبارت.
- **واژهٔ ناشناخته** (نه ردیف، نه دسته، نه حساب/پروژه): `clarify/unknown_term` با سؤال کوتاه و `resume`؛ عبارت کاملاً ناشناخته («ماهی قرمز») یک‌جا پرسیده می‌شود؛ غلط املایی بی‌صدا اصلاح نمی‌شود. تنها استثنا: فعل جست‌وجوی صریح («سرچ کن …») ⇒ `ready` با انتخاب خالی و هشدار.
- **نام دسته در شرح ردیف:** پیش‌فرض خوانش دسته است، خوانش «فقط ردیف‌های با این واژه» در `readings.alternatives` با `disclose` می‌آید؛ نشانهٔ «ردیف» خوانش ردیف را اولیه می‌کند. مترادف نوع (مثل «حقوق») پیش‌فرض جمع تب است با جایگزین ردیف.
- **حساب/پروژهٔ ناموجود:** `clarify`.
- **هیچ شرطی بی‌علامت حذف نمی‌شود:** هر شرط spec یک ورودی در `conditions` دارد (تست `batch-1443`).

## کمبودها (به مرحلهٔ ۴/بعد)
اعمالِ همهٔ ابزارها فقط در حد قابلیت‌های فعلی؛ gapهای تحلیل‌گر (`multi_part`, `group_by_category`, `extreme_month`…) بی‌تغییر منتقل می‌شوند و قابلیت تازه ساخته نمی‌شود.

## ارزیابی
`node scripts/assistant-bank-match.js index.html all` — بانک مرحلهٔ ۱ با جمع مستقل از ماتچر؛ `tests/assert/batch-1443.spec.js` (۵۲ بررسی، دادهٔ ساختگی).
