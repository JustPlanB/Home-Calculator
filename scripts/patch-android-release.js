// آماده‌سازی انتشار در استور (idempotent؛ بعد از `npx cap add android` اجرا می‌شود)
// - نسخه: versionName از package.json و versionCode از HK_VERSION_CODE (شمارهٔ اجرای CI)
// - امضای release فقط اگر کی‌استور در محیط موجود باشد (بدون آن، ساخت debug دست‌نخورده می‌ماند)
// - سخت‌سازی مانیفست: بدون پشتیبان ابری داده‌های مالی، بدون ترافیک HTTP ناامن
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const base = path.join(root, 'android');
const gradle = path.join(base, 'app/build.gradle');
const manifest = path.join(base, 'app/src/main/AndroidManifest.xml');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

if (fs.existsSync(gradle)) {
  let s = fs.readFileSync(gradle, 'utf8');
  const vc = parseInt(process.env.HK_VERSION_CODE || '', 10);
  if (vc > 0) s = s.replace(/versionCode\s+\d+/, 'versionCode ' + vc);
  const vn = String(pkg.version || '1.0.0').replace(/[^0-9A-Za-z.\-]/g, '');
  s = s.replace(/versionName\s+"[^"]*"/, 'versionName "' + vn + '"');

  const ks = process.env.HK_KEYSTORE_FILE;
  if (ks && fs.existsSync(ks) && !s.includes('hkRelease')) {
    s = s.replace(/buildTypes\s*\{/, [
      'signingConfigs {',
      '        hkRelease {',
      '            storeFile file(System.getenv("HK_KEYSTORE_FILE"))',
      '            storePassword System.getenv("HK_KEYSTORE_PASSWORD")',
      '            keyAlias System.getenv("HK_KEY_ALIAS")',
      '            keyPassword System.getenv("HK_KEY_PASSWORD")',
      '        }',
      '    }',
      '    buildTypes {'
    ].join('\n'));
    s = s.replace(/release\s*\{(\s*)minifyEnabled false/, (m, ws) => 'release {' + ws + 'signingConfig signingConfigs.hkRelease' + ws + 'minifyEnabled false');
    console.log('[release] signing config added');
  }
  fs.writeFileSync(gradle, s);
  console.log('[release] version ' + vn + (vc > 0 ? ' (' + vc + ')' : ''));
} else {
  console.log('[release] app/build.gradle not found — skipped');
}

if (fs.existsSync(manifest)) {
  let s = fs.readFileSync(manifest, 'utf8');
  s = s.replace('android:allowBackup="true"', 'android:allowBackup="false"');
  if (!s.includes('android:usesCleartextTraffic')) {
    s = s.replace(/<application\b/, '<application\n        android:usesCleartextTraffic="false"');
  }
  if (!s.includes('android:dataExtractionRules')) {
    s = s.replace(/<application\b/, '<application\n        android:dataExtractionRules="@xml/data_extraction_rules"\n        android:fullBackupContent="false"');
  }
  fs.writeFileSync(manifest, s);

  const xmlDir = path.join(base, 'app/src/main/res/xml');
  fs.mkdirSync(xmlDir, { recursive: true });
  // پشتیبان ابری خودکار اندروید برای داده‌های مالی غیرفعال؛ انتقال مستقیم گوشی‌به‌گوشی (بدون ابر) مثل قبل
  fs.writeFileSync(path.join(xmlDir, 'data_extraction_rules.xml'),
`<?xml version="1.0" encoding="utf-8"?>
<data-extraction-rules>
    <cloud-backup>
        <exclude domain="root" path="." />
        <exclude domain="file" path="." />
        <exclude domain="database" path="." />
        <exclude domain="sharedpref" path="." />
        <exclude domain="external" path="." />
    </cloud-backup>
</data-extraction-rules>
`);
  console.log('[release] manifest hardened');
}
