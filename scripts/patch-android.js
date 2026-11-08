const fs=require('fs'), path=require('path');
const root=path.resolve(__dirname,'..');
const pkg='ir.hesabketab.app';
const base=path.join(root,'android');
const javaDir=path.join(base,'app/src/main/java',...pkg.split('.'));
fs.mkdirSync(javaDir,{recursive:true});
/* ۱.۳.۸۴: کد بومی در فایل‌های جاوای واقعی (android-src/)؛ این‌جا فقط کپی می‌شوند */
const readJava=f=>fs.readFileSync(path.join(root,'android-src',f),'utf8');

const receiver=readJava('BankSmsReceiver.java');

const bankPlugin=readJava('BankSmsPlugin.java');

/* ۱.۳.۴۳: پاسخ مستقیم از اعلان تراکنش. متن «بابت چه بود؟» کنار همان پیامک در صف ذخیره می‌شود (quickDesc)؛
   نرم‌افزار (اگر باز است در چند ثانیه، وگرنه در باز شدن بعدی) ردیف را بی‌سؤال می‌سازد یا اگر تکمیل لازم است منوی ثبت را با همین شرح باز می‌کند. */
const quickReply=readJava('HkQuickReplyReceiver.java');

/* ۱.۳.۵۰: دکمهٔ دسته / ثبت سریع اعلان: شرح و دسته را کنار پیامک در صف می‌گذارد، اعلان را برمی‌دارد و نرم‌افزار را باز می‌کند.
   نرم‌افزار ثبت می‌کند و اگر همه‌چیز درست بود خودش را کوچک می‌کند؛ اگر مغایرت یا حساب ناموجود بود باز می‌ماند تا کاربر تکمیل کند. */
const catActivity=readJava('HkCatActivity.java');

/* ۱.۳.۴۴: باکس شناور ثبت (حباب کنار اعلان، مثل پیامک‌ها): متن پیامک، فیلد «بابت چی بود؟» با قلم درشت و دکمهٔ «ثبت»؛
   شرح مثل «ثبت سریع» کنار همان پیامک در صف می‌رود و نرم‌افزار ردیف را می‌سازد (یا اگر تکمیل لازم است منوی ثبت را با همین شرح باز می‌کند). */
const quickActivity=readJava('HkQuickActivity.java');

const nativeExport=readJava('NativeFileExportPlugin.java');


const appLockPlugin=readJava('AppLockPlugin.java');

// یادآورهای کاربر: نوتیف سیستمی زمان‌بندی‌شده (AlarmManager) + تنظیم دوباره بعد از ری‌استارت/آپدیت
const hkReminders=readJava('HkRemindersPlugin.java');

const hkReminderReceiver=readJava('HkReminderReceiver.java');

const hkBootReceiver=readJava('HkBootReceiver.java');

// گفتار به متن (برای فیلد شرح): ترجیح پردازش روی خود گوشی (بدون اینترنت)
const hkSpeech=readJava('HkSpeechPlugin.java');

// رنگ زمینهٔ نوارهای سیستم (پشت نوار وضعیت و ناوبری) هم‌رنگ تم نرم‌افزار + رنگ آیکن‌های نوار
const appChrome=readJava('AppChromePlugin.java');

const hkUpdater=readJava('HkUpdaterPlugin.java');

const hkWidgetDraw=readJava('HkWidgetDraw.java');

const hkWidget=readJava('HkWidgetProvider.java');

const hkWidgetAccounts=readJava('HkWidgetAccountsProvider.java');

const hkWidgetTx=readJava('HkWidgetTxProvider.java');

const hkWidgetTxService=readJava('HkWidgetTxService.java');

const hkWidgetTxConfig=readJava('HkWidgetTxConfig.java');

const hkWidgetPlugin=readJava('HkWidgetPlugin.java');

const hkMedia=readJava('HkMediaPlugin.java');

const main=readJava('MainActivity.java');

fs.writeFileSync(path.join(javaDir,'BankSmsReceiver.java'),receiver);
fs.writeFileSync(path.join(javaDir,'BankSmsPlugin.java'),bankPlugin);
fs.writeFileSync(path.join(javaDir,'HkQuickReplyReceiver.java'),quickReply);
fs.writeFileSync(path.join(javaDir,'HkQuickActivity.java'),quickActivity);
fs.writeFileSync(path.join(javaDir,'HkCatActivity.java'),catActivity);
fs.writeFileSync(path.join(javaDir,'AppLockPlugin.java'),appLockPlugin);
fs.writeFileSync(path.join(javaDir,'NativeFileExportPlugin.java'),nativeExport);
fs.writeFileSync(path.join(javaDir,'MainActivity.java'),main);
fs.writeFileSync(path.join(javaDir,'AppChromePlugin.java'),appChrome);
fs.writeFileSync(path.join(javaDir,'HkRemindersPlugin.java'),hkReminders);
fs.writeFileSync(path.join(javaDir,'HkReminderReceiver.java'),hkReminderReceiver);
fs.writeFileSync(path.join(javaDir,'HkBootReceiver.java'),hkBootReceiver);
fs.writeFileSync(path.join(javaDir,'HkSpeechPlugin.java'),hkSpeech);
fs.writeFileSync(path.join(javaDir,'HkUpdaterPlugin.java'),hkUpdater);
fs.writeFileSync(path.join(javaDir,'HkWidgetProvider.java'),hkWidget);
fs.writeFileSync(path.join(javaDir,'HkWidgetPlugin.java'),hkWidgetPlugin);
fs.writeFileSync(path.join(javaDir,'HkWidgetDraw.java'),hkWidgetDraw);
fs.writeFileSync(path.join(javaDir,'HkWidgetAccountsProvider.java'),hkWidgetAccounts);
fs.writeFileSync(path.join(javaDir,'HkWidgetTxProvider.java'),hkWidgetTx);
fs.writeFileSync(path.join(javaDir,'HkWidgetTxService.java'),hkWidgetTxService);
fs.writeFileSync(path.join(javaDir,'HkWidgetTxConfig.java'),hkWidgetTxConfig);
fs.writeFileSync(path.join(javaDir,'HkMediaPlugin.java'),hkMedia);

const gradle=path.join(base,'app/build.gradle');
if(fs.existsSync(gradle)){
  let s=fs.readFileSync(gradle,'utf8');
  if(!s.includes('androidx.core:core')) s=s.replace(/dependencies\s*\{/, 'dependencies {\n    implementation "androidx.core:core:1.15.0"');
  if(!s.includes('androidx.biometric:biometric')) s=s.replace(/dependencies\s*\{/, 'dependencies {\n    implementation "androidx.biometric:biometric:1.1.0"');
  if(!s.includes('androidx.exifinterface:exifinterface')) s=s.replace(/dependencies\s*\{/, 'dependencies {\n    implementation "androidx.exifinterface:exifinterface:1.3.7"');
  fs.writeFileSync(gradle,s);
}
const manifest=path.join(base,'app/src/main/AndroidManifest.xml');
if(fs.existsSync(manifest)){
  let s=fs.readFileSync(manifest,'utf8');
  if(!s.includes('android.permission.RECEIVE_SMS')){
    s=s.replace(/(<manifest\b[^>]*>)/, '$1\n    <uses-permission android:name="android.permission.RECEIVE_SMS"/>\n    <uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>');
  }
  const receiverTag='<receiver android:name=".BankSmsReceiver" android:exported="true" android:permission="android.permission.BROADCAST_SMS">\n            <intent-filter android:priority="999">\n                <action android:name="android.provider.Telephony.SMS_RECEIVED"/>\n            </intent-filter>\n        </receiver>';
  if(!s.includes('.BankSmsReceiver')) s=s.replace('</application>', receiverTag+'\n    </application>');
  // ۱.۳.۴۳: گیرندهٔ «ثبت» از خود اعلان (فقط از PendingIntent همین برنامه؛ از بیرون قابل صدا زدن نیست)
  if(!s.includes('.HkQuickReplyReceiver')) s=s.replace('</application>', '        <receiver android:name=".HkQuickReplyReceiver" android:exported="false"/>\n    </application>');
  // ۱.۳.۴۴: باکس شناور ثبت (حباب اعلان) — فقط از PendingIntent خود برنامه باز می‌شود
  if(!s.includes('.HkCatActivity')) s=s.replace('</application>', '        <activity android:name=".HkCatActivity" android:exported="false" android:excludeFromRecents="true" android:noHistory="true" android:taskAffinity="" android:theme="@android:style/Theme.Translucent.NoTitleBar"/>\n    </application>');
  if(!s.includes('.HkQuickActivity')) s=s.replace('</application>', '        <activity android:name=".HkQuickActivity" android:exported="false" android:allowEmbedded="true" android:resizeableActivity="true" android:documentLaunchMode="always" android:excludeFromRecents="true" android:theme="@android:style/Theme.DeviceDefault.Dialog.NoActionBar" android:windowSoftInputMode="stateVisible|adjustResize"/>\n    </application>');
  if(!s.includes('android.permission.RECORD_AUDIO')) s=s.replace(/(<manifest\b[^>]*>)/, '$1\n    <uses-permission android:name="android.permission.RECORD_AUDIO"/>');
  // ضبط صدا داخل صفحه (getUserMedia) بدون این مجوز بی‌صدا رد می‌شود
  if(!s.includes('android.permission.MODIFY_AUDIO_SETTINGS')) s=s.replace(/(<manifest\b[^>]*>)/, '$1\n    <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS"/>');
  // اندروید ۱۱+: پیدا کردن برنامهٔ دوربین برای «گرفتن عکس»
  if(!s.includes('android.media.action.IMAGE_CAPTURE')) s=s.replace('</manifest>', '    <queries>\n        <intent>\n            <action android:name="android.media.action.IMAGE_CAPTURE"/>\n        </intent>\n    </queries>\n</manifest>');
  // باز کردن فایل پشتیبان با زدن رویش (Downloads / اشتراک‌گذاری)
  if(!s.includes('hk-open-backup')){
    const openFilters =
      '            <!-- hk-open-backup -->\n' +
      '            <intent-filter>\n' +
      '                <action android:name="android.intent.action.VIEW"/>\n' +
      '                <category android:name="android.intent.category.DEFAULT"/>\n' +
      '                <category android:name="android.intent.category.BROWSABLE"/>\n' +
      '                <data android:scheme="content"/>\n' +
      '                <data android:scheme="file"/>\n' +
      '                <data android:mimeType="application/json"/>\n' +
      '                <data android:mimeType="application/octet-stream"/>\n' +
      '            </intent-filter>\n' +
      '            <intent-filter>\n' +
      '                <action android:name="android.intent.action.SEND"/>\n' +
      '                <category android:name="android.intent.category.DEFAULT"/>\n' +
      '                <data android:mimeType="application/json"/>\n' +
      '                <data android:mimeType="application/octet-stream"/>\n' +
      '            </intent-filter>\n';
    s=s.replace(/(<activity\b[^>]*android:name="[.\w]*MainActivity"[\s\S]*?)(<\/activity>)/, function(m0,a,b){ return a+openFilters+'        '+b; });
  }
  // ۱.۳.۳۷: اشتراک‌گذاری عکس/PDF از برنامه‌های دیگر (رسید بانک، گالری) → پیوست ردیف
  if(!s.includes('hk-share-attach')){
    const shareFilter =
      '            <!-- hk-share-attach -->\n' +
      '            <intent-filter>\n' +
      '                <action android:name="android.intent.action.SEND"/>\n' +
      '                <action android:name="android.intent.action.SEND_MULTIPLE"/>\n' +
      '                <category android:name="android.intent.category.DEFAULT"/>\n' +
      '                <data android:mimeType="image/*"/>\n' +
      '                <data android:mimeType="application/pdf"/>\n' +
      '            </intent-filter>\n';
    s=s.replace(/(<activity\b[^>]*android:name="[.\w]*MainActivity"[\s\S]*?)(<\/activity>)/, function(m0,a,b){ return a+shareFilter+'        '+b; });
  }
  // ثبت گروهی پیامک‌ها: خواندن صندوق ورودی (فقط با اجازهٔ کاربر، از منوی «ثبت دستی پیامک»)
  if(!s.includes('android.permission.READ_SMS')) s=s.replace(/(<manifest\b[^>]*>)/, '$1\n    <uses-permission android:name="android.permission.READ_SMS"/>');
  // اندروید ۱۱+: برای پیدا کردن سرویس تشخیص گفتار باید اعلام شود
  if(!s.includes('android.speech.RecognitionService')) s=s.replace('</manifest>', '    <queries>\n        <intent>\n            <action android:name="android.speech.RecognitionService"/>\n        </intent>\n    </queries>\n</manifest>');
  // بروزرسانی داخل نرم‌افزار: باز کردن نصب‌کنندهٔ اندروید برای APK دانلودشده
  if(!s.includes('android.permission.REQUEST_INSTALL_PACKAGES')) s=s.replace(/(<manifest\b[^>]*>)/, '$1\n    <uses-permission android:name="android.permission.REQUEST_INSTALL_PACKAGES"/>');
  if(!s.includes('android.permission.RECEIVE_BOOT_COMPLETED')) s=s.replace(/(<manifest\b[^>]*>)/, '$1\n    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED"/>');
  if(!s.includes('.HkReminderReceiver')) s=s.replace('</application>', '        <receiver android:name=".HkReminderReceiver" android:exported="false"/>\n    </application>');
  if(!s.includes('.HkBootReceiver')) s=s.replace('</application>',
    '        <receiver android:name=".HkBootReceiver" android:exported="true">\n' +
    '            <intent-filter>\n' +
    '                <action android:name="android.intent.action.BOOT_COMPLETED"/>\n' +
    '                <action android:name="android.intent.action.MY_PACKAGE_REPLACED"/>\n' +
    '                <action android:name="android.intent.action.QUICKBOOT_POWERON"/>\n' +
    '            </intent-filter>\n' +
    '        </receiver>\n    </application>');
  // ویجت صفحهٔ اصلی گوشی
  if(!s.includes('.HkWidgetProvider')) s=s.replace('</application>',
    '        <receiver android:name=".HkWidgetProvider" android:exported="true" android:label="حساب‌کتاب">\n' +
    '            <intent-filter>\n' +
    '                <action android:name="android.appwidget.action.APPWIDGET_UPDATE"/>\n' +
    '            </intent-filter>\n' +
    '            <meta-data android:name="android.appwidget.provider" android:resource="@xml/hk_widget_info"/>\n' +
    '        </receiver>\n    </application>');
  // ویجت حساب‌ها (موجودی هر کارت + خرج امروز)
  if(!s.includes('.HkWidgetAccountsProvider')) s=s.replace('</application>',
    '        <receiver android:name=".HkWidgetAccountsProvider" android:exported="true" android:label="حساب‌کتاب (حساب‌ها)">\n' +
    '            <intent-filter>\n' +
    '                <action android:name="android.appwidget.action.APPWIDGET_UPDATE"/>\n' +
    '            </intent-filter>\n' +
    '            <meta-data android:name="android.appwidget.provider" android:resource="@xml/hk_widget_accounts_info"/>\n' +
    '        </receiver>\n    </application>');
  // ۱.۳.۷۸: ویجت ردیف‌ها (مخارج / درآمدها) + صفحهٔ انتخاب + سرویس فهرست
  if(!s.includes('.HkWidgetTxProvider')) s=s.replace('</application>',
    '        <receiver android:name=".HkWidgetTxProvider" android:exported="true" android:label="حساب‌کتاب (ردیف‌ها)">\n' +
    '            <intent-filter>\n' +
    '                <action android:name="android.appwidget.action.APPWIDGET_UPDATE"/>\n' +
    '            </intent-filter>\n' +
    '            <meta-data android:name="android.appwidget.provider" android:resource="@xml/hk_widget_tx_info"/>\n' +
    '        </receiver>\n    </application>');
  if(!s.includes('.HkWidgetTxConfig')) s=s.replace('</application>',
    '        <activity android:name=".HkWidgetTxConfig" android:exported="true" android:excludeFromRecents="true" android:theme="@android:style/Theme.DeviceDefault.Dialog.NoActionBar">\n' +
    '            <intent-filter>\n' +
    '                <action android:name="android.appwidget.action.APPWIDGET_CONFIGURE"/>\n' +
    '            </intent-filter>\n' +
    '        </activity>\n    </application>');
  if(!s.includes('.HkWidgetTxService')) s=s.replace('</application>',
    '        <service android:name=".HkWidgetTxService" android:permission="android.permission.BIND_REMOTEVIEWS" android:exported="false"/>\n    </application>');
  // FileProvider for Sharesheet
  if(!s.includes('.fileprovider')){
    const providerTag =
      '        <provider\n' +
      '            android:name="androidx.core.content.FileProvider"\n' +
      '            android:authorities="${applicationId}.fileprovider"\n' +
      '            android:exported="false"\n' +
      '            android:grantUriPermissions="true">\n' +
      '            <meta-data\n' +
      '                android:name="android.support.FILE_PROVIDER_PATHS"\n' +
      '                android:resource="@xml/file_paths" />\n' +
      '        </provider>';
    s=s.replace('</application>', providerTag+'\n    </application>');
  }
  fs.writeFileSync(manifest,s);
}

// res/xml/file_paths.xml for FileProvider
const xmlDir=path.join(base,'app/src/main/res/xml');
fs.mkdirSync(xmlDir,{recursive:true});
const filePaths=path.join(xmlDir,'file_paths.xml');
// امنیت: FileProvider فقط پوشهٔ موقت اشتراک‌گذاری را در اختیار دیگر برنامه‌ها می‌گذارد (نه کل حافظهٔ نرم‌افزار/حافظهٔ خارجی)
fs.writeFileSync(filePaths,
`<?xml version="1.0" encoding="utf-8"?>
<paths xmlns:android="http://schemas.android.com/apk/res/android">
    <cache-path name="share_cache" path="share/" />
    <cache-path name="updates" path="updates/" />
    <cache-path name="capture" path="capture/" />
</paths>
`);

// منابع ویجت (چیدمان، پس‌زمینه، مشخصات)
const resDir=path.join(base,'app/src/main/res');
fs.mkdirSync(path.join(resDir,'layout'),{recursive:true});
fs.mkdirSync(path.join(resDir,'drawable'),{recursive:true});
// ۱.۳.۴۶: چیدمان اختصاصی اعلان تراکنش (راست‌چین)
for(const [fn,lines] of [['hk_sms_small.xml',2],['hk_sms_big.xml',14]]){
  fs.writeFileSync(path.join(resDir,'layout',fn),
`<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:orientation="vertical"
    android:layoutDirection="rtl">
    <TextView
        android:id="@+id/hk_sms_title"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:textAppearance="@style/TextAppearance.Compat.Notification.Title"
        android:textStyle="bold"
        android:gravity="start"
        android:textDirection="rtl"
        android:textAlignment="viewStart"
        android:maxLines="1"
        android:ellipsize="end"/>
    <TextView
        android:id="@+id/hk_sms_text"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:layout_marginTop="1dp"
        android:textAppearance="@style/TextAppearance.Compat.Notification"
        android:gravity="start"
        android:textDirection="rtl"
        android:textAlignment="viewStart"
        android:lineSpacingMultiplier="1.1"
        android:maxLines="${lines}"
        android:ellipsize="end"/>
</LinearLayout>
`);
}
// ۱.۳.۴۵: چیدمان پیام «ثبت شد» بعد از ثبت سریع/باکس شناور
// ۱.۳.۵۰: اعلان اختصاصی پیامک با دکمه‌های دسته
fs.writeFileSync(path.join(resDir,'layout','hk_tx.xml'),
`<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:orientation="vertical"
    android:layoutDirection="rtl">
    <TextView
        android:id="@+id/hk_tx_text"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:textAppearance="@style/TextAppearance.Compat.Notification"
        android:gravity="start"
        android:textDirection="rtl"
        android:maxLines="6"
        android:ellipsize="end"/>
    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:layout_marginTop="8dp"
        android:orientation="horizontal"
        android:layoutDirection="rtl">
        <TextView android:id="@+id/hk_c0" style="@style/HkChip"/>
        <TextView android:id="@+id/hk_c1" style="@style/HkChip"/>
        <TextView android:id="@+id/hk_c2" style="@style/HkChip"/>
        <TextView android:id="@+id/hk_c3" style="@style/HkChip"/>
        <TextView android:id="@+id/hk_c4" style="@style/HkChip"/>
    </LinearLayout>
</LinearLayout>
`);
fs.writeFileSync(path.join(resDir,'drawable','hk_chip_bg.xml'),
`<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="#26888888"/>
    <corners android:radius="14dp"/>
</shape>
`);
fs.mkdirSync(path.join(resDir,'values'),{recursive:true});
fs.writeFileSync(path.join(resDir,'values','hk_chip.xml'),
`<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="HkChip">
        <item name="android:layout_width">0dp</item>
        <item name="android:layout_height">32dp</item>
        <item name="android:layout_weight">1</item>
        <item name="android:layout_marginStart">2dp</item>
        <item name="android:layout_marginEnd">2dp</item>
        <item name="android:gravity">center</item>
        <item name="android:background">@drawable/hk_chip_bg</item>
        <item name="android:textSize">11.5sp</item>
        <item name="android:maxLines">1</item>
        <item name="android:ellipsize">end</item>
        <item name="android:textAppearance">@style/TextAppearance.Compat.Notification</item>
    </style>
</resources>
`);
fs.writeFileSync(path.join(resDir,'layout','hk_done.xml'),
`<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:orientation="vertical"
    android:layoutDirection="rtl"
    android:paddingBottom="4dp">
    <TextView
        android:id="@+id/hk_done_desc"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:textAppearance="@style/TextAppearance.Compat.Notification.Info"
        android:textSize="12.5sp"
        android:gravity="start"
        android:textDirection="rtl"
        android:maxLines="2"
        android:ellipsize="end"/>
    <LinearLayout
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:layout_marginTop="2dp"
        android:orientation="horizontal"
        android:gravity="center_vertical"
        android:layoutDirection="rtl">
        <TextView
            android:id="@+id/hk_done_ok"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="ثبت شد"
            android:textSize="18sp"
            android:textStyle="bold"
            android:textColor="#30D158"/>
        <ImageView
            android:id="@+id/hk_done_tick"
            android:layout_width="22dp"
            android:layout_height="22dp"
            android:layout_marginStart="6dp"/>
    </LinearLayout>
</LinearLayout>
`);
fs.writeFileSync(path.join(resDir,'layout','hk_widget.xml'),
`<?xml version="1.0" encoding="utf-8"?>
<FrameLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/hk_w_root"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="@drawable/hk_widget_bg">
    <ImageView android:id="@+id/hk_w_img" android:layout_width="match_parent" android:layout_height="match_parent"
        android:scaleType="fitCenter" android:contentDescription="حساب‌کتاب"/>
    <ImageView android:id="@+id/hk_w_eye" android:layout_width="34dp" android:layout_height="34dp"
        android:layout_gravity="top|left" android:layout_marginLeft="4dp" android:layout_marginTop="2dp"
        android:padding="8dp" android:src="@drawable/hk_ic_eye" android:contentDescription="پنهان کردن مبالغ"/>
</FrameLayout>
`);
// ۱.۳.۸۶: ویجت پشته‌ای (یک‌خطی) حذف شد
// ۱.۳.۶۹: آیکن چشم ویجت (باز / بسته)
fs.writeFileSync(path.join(resDir,'drawable','hk_ic_eye.xml'),
`<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="24dp" android:height="24dp" android:viewportWidth="24" android:viewportHeight="24">
    <path android:fillColor="#00000000" android:strokeColor="#FFFFFFFF" android:strokeWidth="2" android:strokeLineCap="round" android:strokeLineJoin="round"
        android:pathData="M2,12C4.5,7 8,5 12,5s7.5,2 10,7c-2.5,5 -6,7 -10,7s-7.5,-2 -10,-7z"/>
    <path android:fillColor="#00000000" android:strokeColor="#FFFFFFFF" android:strokeWidth="2" android:pathData="M12,12m-3,0a3,3 0,1 1,6 0a3,3 0,1 1,-6 0"/>
</vector>
`);
fs.writeFileSync(path.join(resDir,'drawable','hk_ic_eye_off.xml'),
`<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="24dp" android:height="24dp" android:viewportWidth="24" android:viewportHeight="24">
    <path android:fillColor="#00000000" android:strokeColor="#FFFFFFFF" android:strokeWidth="2" android:strokeLineCap="round" android:strokeLineJoin="round"
        android:pathData="M3.5,8.5C2.9,9.6 2.4,10.7 2,12c2.5,5 6,7 10,7c1.6,0 3.1,-0.3 4.5,-1M8.5,5.5C9.6,5.2 10.8,5 12,5c4,0 7.5,2 10,7c-0.6,1.2 -1.3,2.3 -2.1,3.2"/>
    <path android:fillColor="#00000000" android:strokeColor="#FFFFFFFF" android:strokeWidth="2" android:strokeLineCap="round" android:pathData="M3,3L21,21"/>
</vector>
`);
// فونت وزیرمتن برای متن ویجت
fs.mkdirSync(path.join(resDir,'font'),{recursive:true});
['hk_vazir_regular.ttf','hk_vazir_bold.ttf'].forEach(function(f){
  fs.copyFileSync(path.join(root,'resources','widget-fonts',f), path.join(resDir,'font',f));
});
fs.writeFileSync(path.join(resDir,'drawable','hk_widget_bg.xml'),
`<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="#F21B1B1B"/>
    <corners android:radius="22dp"/>
    <stroke android:width="1dp" android:color="#22FFFFFF"/>
</shape>
`);
fs.writeFileSync(path.join(resDir,'drawable','hk_widget_bg_light.xml'),
`<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="#F7FFFFFF"/>
    <corners android:radius="22dp"/>
    <stroke android:width="1dp" android:color="#1A000000"/>
</shape>
`);
fs.writeFileSync(path.join(xmlDir,'hk_widget_info.xml'),
`<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="180dp"
    android:minHeight="110dp"
    android:targetCellWidth="3"
    android:targetCellHeight="2"
    android:updatePeriodMillis="0"
    android:resizeMode="horizontal|vertical"
    android:widgetCategory="home_screen"
    android:initialLayout="@layout/hk_widget"/>
`);

// ۱.۳.۷۸: ویجت ردیف‌ها (مخارج / درآمدها)
fs.writeFileSync(path.join(resDir,'layout','hk_widget_tx.xml'),
`<?xml version="1.0" encoding="utf-8"?>
<FrameLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/hk_wt_root"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="@drawable/hk_widget_bg">
    <LinearLayout android:layout_width="match_parent" android:layout_height="match_parent" android:orientation="vertical" android:paddingBottom="8dp">
        <ImageView android:id="@+id/hk_wt_head" android:layout_width="match_parent" android:layout_height="wrap_content"
            android:adjustViewBounds="true" android:scaleType="fitXY" android:contentDescription="ردیف‌ها"/>
        <FrameLayout android:layout_width="match_parent" android:layout_height="0dp" android:layout_weight="1">
            <ListView android:id="@+id/hk_wt_list" android:layout_width="match_parent" android:layout_height="match_parent"
                android:divider="@null" android:dividerHeight="0dp" android:scrollbars="none"
                android:listSelector="@android:color/transparent"/>
            <ImageView android:id="@+id/hk_wt_empty" android:layout_width="match_parent" android:layout_height="wrap_content"
                android:layout_gravity="center" android:adjustViewBounds="true" android:scaleType="fitXY" android:contentDescription="ردیفی نیست"/>
        </FrameLayout>
    </LinearLayout>
    <ImageView android:id="@+id/hk_wt_eye" android:layout_width="34dp" android:layout_height="34dp"
        android:layout_gravity="top|left" android:layout_marginLeft="6dp" android:layout_marginTop="3dp"
        android:padding="8dp" android:src="@drawable/hk_ic_eye" android:contentDescription="پنهان کردن مبالغ"/>
</FrameLayout>
`);
fs.writeFileSync(path.join(resDir,'layout','hk_widget_tx_item.xml'),
`<?xml version="1.0" encoding="utf-8"?>
<ImageView xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/hk_wti_img"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:adjustViewBounds="true"
    android:scaleType="fitXY"
    android:contentDescription="ردیف"/>
`);
/* ۱.۳.۹۱: ردیف «در حال بارگذاری» ته فهرست ویجت (مثل پایین آمدن پست‌ها): دایرهٔ چرخان کوچک آبی نرم‌افزار */
fs.writeFileSync(path.join(resDir,'layout','hk_widget_tx_more.xml'),
`<?xml version="1.0" encoding="utf-8"?>
<FrameLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/hk_wtm_root"
    android:layout_width="match_parent"
    android:layout_height="40dp">
    <ProgressBar
        android:id="@+id/hk_wtm_spin"
        style="?android:attr/progressBarStyleSmall"
        android:layout_width="20dp"
        android:layout_height="20dp"
        android:layout_gravity="center"
        android:indeterminate="true"
        android:indeterminateTint="#FF08B5F5"
        android:contentDescription="در حال بارگذاری"/>
</FrameLayout>
`);
fs.writeFileSync(path.join(xmlDir,'hk_widget_tx_info.xml'),
`<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="180dp"
    android:minHeight="110dp"
    android:targetCellWidth="3"
    android:targetCellHeight="2"
    android:updatePeriodMillis="0"
    android:resizeMode="horizontal|vertical"
    android:widgetCategory="home_screen"
    android:configure="ir.hesabketab.app.HkWidgetTxConfig"
    android:widgetFeatures="reconfigurable"
    android:initialLayout="@layout/hk_widget_tx"/>
`);

fs.writeFileSync(path.join(xmlDir,'hk_widget_accounts_info.xml'),
`<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="180dp"
    android:minHeight="110dp"
    android:targetCellWidth="3"
    android:targetCellHeight="2"
    android:updatePeriodMillis="0"
    android:resizeMode="horizontal|vertical"
    android:widgetCategory="home_screen"
    android:initialLayout="@layout/hk_widget"/>
`);

console.log('Android SMS + Downloads/PDF + FileProvider Share bridge patched');
