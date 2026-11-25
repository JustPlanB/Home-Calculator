# تحلیل‌گر درخواست دستیار — ساختار استاندارد (نسخهٔ ۱، مرحلهٔ ۲)

تحلیل‌گر یک تابع است: `hkAsstAnalyze(text, { prev })` در `src/js/18k-assistant-analyzer.js`. متن خام فارسی را به یک **ساختار قابل‌پیش‌بینی** (spec) تبدیل می‌کند تا مرحلهٔ ۳ (تطبیق با داده) و ۴ (محاسبهٔ قطعی و پاسخ) دیگر متن کاربر را تفسیر نکنند.

**اصل‌ها:** فقط تفسیر (هیچ جمع/تعداد/میانگین یا انتخاب ردیفی ندارد) · بدون اثر جانبی (رفتن به بخش، تغییر تم و ذخیرهٔ اصطلاح اجرا نمی‌شود؛ فقط در `app_actions` ثبت می‌شود و وضعیت گفتگو دست‌نخورده برمی‌گردد) · هیچ شرطی بی‌صدا حذف نمی‌شود (یا در `slots` است یا در `gaps`) · مبهم = `ask` با دلیل · آفلاین، بدون مدل و شبکه.
هنوز در مسیر گفتگو **وصل نیست** (`hkAsstAsk` عوض نشده)؛ مرحلهٔ ۳ آن را وصل می‌کند.

## ورودی
`text`: جملهٔ کاربر. `opts.prev`: spec قبلیِ همان گفتگو (برای «ماه قبلش»، «بدون اسنپ»، «فقط ردیف‌های بنزین»، «جمعش» و پاسخ به پرسش روشن‌کننده). بدون `prev` ادامه‌ها ask می‌شوند.

## خروجی (spec)
| فیلد | معنی |
|---|---|
| `v` | نسخهٔ ساختار (۱) |
| `text`, `normalized` | متن (اگر پاسخ به پرسش قبلی بود، جملهٔ بازنویسی‌شده؛ اصل در `rewritten_from`) و نسخهٔ نرمال |
| `action` | `run_tool` · `ask` · `refuse` · `chat` · `navigate` · `app_action` |
| `intent` | `sum count average list_rows max min group compare` + تحلیل‌ها (`status balance savings top trend advice forecast budget goal daily anomaly recurring share chart …`) + `clarify refuse chat navigate app_action` |
| `operations` | همهٔ عملیات خواسته‌شده؛ بیش از یکی ⇒ gap `multi_part` |
| `result_kind` | `sum / count / avg / rows / null` |
| `tab` | `expense / income / null` |
| `time` | `{kind: all\|month\|year\|range, rel: this_month\|prev_month\|this_year\|prev_year\|null, year, month, dateFrom, dateTo, explicit}` — «ماه پیش» ≠ «دو ماه پیش»؛ «۳ ماه اخیر» بازه است نه مبلغ ۳ |
| `slots.include` | `terms` (همهٔ واژه‌ها در یک ردیف)، `any_terms` (اجتماع «و/یا»)، `cats`، `cats_join` (`intersect` یا `union_with_any_terms`)، `project`, `account`, `context`, `status` (`unpaid`)، `cats_via_synonym` (دسته‌هایی که از واژهٔ مترادف آمده‌اند نه نام دسته) |
| `slots.exclude` | `terms`, `cats` (بدون/به‌جز/غیر از…) |
| `slots.amount` | `eq/min/max/gt/lt` |
| `slots.match_mode` | همیشه `whole_word`: تطبیق واژهٔ کامل («نان» ≠ «دانانو»)، با جمع/عامیانهٔ ساده |
| `order` | `{sort: amountDesc\|amountAsc\|dateDesc…, limit}` |
| `group_by`, `compare` | برای گروه‌بندی و مقایسه |
| `follow_up` | `{is_follow_up, uses_reference, inherits[], overrides[]}` — کدام کلیدها از spec قبلی ماند و کدام عوض شد |
| `clarification` | `{needed, reason, question, suggestions, term}`؛ دلیل‌ها: `vague_size missing_scope missing_context contradiction ambiguous_union ambiguous_group_dimension capability_gap unsupported_exclusion unsupported_exception_cue not_understood`؛ برای `refuse`: `market_price investment_advice write_operation out_of_domain forecast_unsupported` |
| `resume` | `{q, term}` وقتی پاسخ کوتاه کاربر باید واژه‌ای را در پرسش قبلی عوض کند (مثلاً «کوچیک» ← «زیر ۵۰ هزار») |
| `gaps` | شکاف قابلیت: `multi_part group_by_category group_by_terms extreme_month out_of_scope future_period arg_not_supported` |
| `app_actions` | کارهای برنامه که اجرا **نشد**: `theme`, `navigate`, `alias`, `guide`, `open_target` |
| `data_dependent` | تصمیم‌هایی که به واژگان دادهٔ کاربر نگاه کرده‌اند (مرحلهٔ ۳ مسئول می‌شود): `typo_correction`, `row_phrase`, `row_word`, `category_via_synonym`, `category_vs_row`, `tab_via_synonym`, `project_name` |
| `warnings` | هشدارهای غیرمسدودکننده (`tab_via_synonym`) |
| `binding` | `{tool, args, explain, intent, yearExplicit, catAmb}` — همان فرمانِ ابزار موجود (`capabilities.json`) برای اجرای قطعی؛ در `prev` نسل بعد هم خوانده می‌شود |
| `trace` | فهرست `{slot, rule, evidence/value}`: چرا هر مقدار آمد (lexicon، negation_cue، conjunction_union، time_phrase، n_months_ago، size_adjective…) |

## قراردادهای مهم
1. **«نان و دانانو»** → `any_terms=[نان,دانانو]`؛ **«فقط ردیف‌های نان»** → `terms=[نان]` بدون دسته؛ **«نان چقدر شد؟»** → `cats=[food]` با `cats_via_synonym=[food]` و `data_dependent=['category_via_synonym:food']` (پیش‌فرض دسته، مرحلهٔ ۳ با داده خوانش ردیف را هم می‌سنجد).
2. **واژهٔ ناشناخته** را تحلیل‌گر نمی‌تواند بداند (به داده بستگی دارد): در `terms/exclude.terms` می‌ماند و مرحلهٔ ۳ می‌پرسد. اگر مرحلهٔ ۳ پرسید، `resume={q,term}` را روی spec بگذارد تا پاسخ کاربر («نه منظورم اسنپ بود») در همان جایگاه جایگزین شود.
3. **صفت اندازه** («کوچیک/بزرگ/ریز/درشت»): با مرز مبلغ شرط نیست؛ بی مرز ⇒ `ask/vague_size` با `resume`.
4. **تناقض** («فقط بنزین بدون بنزین»، در ادامه: «بدون بنزین» روی «فقط بنزین») ⇒ `ask/contradiction`.
5. **بیرون از قابلیت**: «قیمت دلار»، «سهام بخرم؟»، «پرداخت کن/حذف کن»، «حقوق سال آینده» ⇒ `refuse` با دلیل؛ نه ابزار نامربوط.
6. تحلیل‌گر همان `hkAsstSemantic` موجود را در «حالت خشک» (`_hkAsstDry`) صدا می‌زند؛ تفاوت دوگانه: (الف) نشانهٔ صریح «ردیف/تراکنش …» و مترادف‌های فهرست «و/یا» بدون نگاه به داده «مورد/ردیف» حساب می‌شود؛ (ب) همهٔ تصمیم‌های وابسته به داده علامت می‌خورند.

## ورودی مرحلهٔ ۳
مرحلهٔ ۳ باید فقط `spec` را بخواند (نه متن): `action` و `clarification` برای مسیر، `binding` برای ابزار/آرگومان، `slots` + `time` برای تطبیق واقعی (واژه‌ها با ردیف‌ها، دسته‌ها، حساب‌ها)، `data_dependent` برای تصمیم‌هایی که با داده باید بسته شوند (خوانش دسته/ردیف، املا، عبارت دوکلمه‌ای، نام پروژه)، `gaps`/`warnings` برای افشا در پاسخ، `resume` برای پرسش بعدی.

## آزمون و ارزیابی
`tests/assert/batch-1442.spec.js` (ساختار، بدون اثر جانبی، پایداری با/بدون داده) · `node scripts/assistant-bank-analyze.js index.html all` (سنجش روی بانک؛ `--nodata` برای وابستگی به داده).
