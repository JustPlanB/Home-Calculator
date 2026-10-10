// آدرس فایل اپ برای تست‌ها: پیش‌فرض index.html همین مخزن؛ با HK_INDEX می‌شود فایل دیگری داد.
const path = require('path');
module.exports = 'file://' + path.resolve(process.env.HK_INDEX || path.join(__dirname, '..', '..', 'index.html'));
