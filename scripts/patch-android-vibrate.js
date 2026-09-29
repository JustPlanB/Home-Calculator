// اطمینان از وجود پرمیشن VIBRATE در AndroidManifest.xml (idempotent؛ چندبار اجرا شود مشکلی نیست)
// بعد از scripts/patch-android.js اجرا می‌شود.
const fs = require('fs');
const path = require('path');

const manifest = path.join('android', 'app', 'src', 'main', 'AndroidManifest.xml');
const PERM = '<uses-permission android:name="android.permission.VIBRATE" />';

if (!fs.existsSync(manifest)) {
  console.log('[vibrate] AndroidManifest.xml not found — skipped (run after `npx cap add android`).');
  process.exit(0);
}

let xml = fs.readFileSync(manifest, 'utf8');
if (xml.includes('android.permission.VIBRATE')) {
  console.log('[vibrate] VIBRATE permission already present.');
  process.exit(0);
}

const idx = xml.lastIndexOf('</manifest>');
if (idx === -1) {
  console.error('[vibrate] </manifest> not found — manifest format unexpected.');
  process.exit(1);
}
xml = xml.slice(0, idx) + '    ' + PERM + '\n' + xml.slice(idx);
fs.writeFileSync(manifest, xml);
console.log('[vibrate] VIBRATE permission added to AndroidManifest.xml.');
