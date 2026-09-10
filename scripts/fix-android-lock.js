const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const pkg = 'ir.hesabketab.app';
const base = path.join(root, 'android');
const javaDir = path.join(base, 'app/src/main/java', ...pkg.split('.'));
const mainJava = path.join(javaDir, 'MainActivity.java');
const manifest = path.join(base, 'app/src/main/AndroidManifest.xml');

// The previous Android patch deliberately added these flags. They make the
// activity appear over Android's lock screen, which is the opposite of the
// desired behavior. Remove them from both generated files on every build.
if (fs.existsSync(mainJava)) {
  let s = fs.readFileSync(mainJava, 'utf8');
  s = s.replace(/\s*getWindow\(\)\.addFlags\([^;]*FLAG_SHOW_WHEN_LOCKED[^;]*;?/g, '');
  s = s.replace(/\s*getWindow\(\)\.addFlags\([^;]*FLAG_TURN_SCREEN_ON[^;]*;?/g, '');
  s = s.replace(/\s*setShowWhenLocked\([^;]*\);?/g, '');
  s = s.replace(/\s*setTurnScreenOn\([^;]*\);?/g, '');
  fs.writeFileSync(mainJava, s);
}

if (fs.existsSync(manifest)) {
  let s = fs.readFileSync(manifest, 'utf8');
  s = s.replace(/\s+android:showWhenLocked="true"/g, '');
  s = s.replace(/\s+android:turnScreenOn="true"/g, '');
  fs.writeFileSync(manifest, s);
}

console.log('Android lock-screen bypass flags removed');
