#!/usr/bin/env bash
# انتشار APK امضاشده در Releases و به‌روزرسانی version.json در شاخهٔ update-feed.
# ورودی‌ها: APK_SRC (مسیر APK امضاشده)، HK_VERSION_CODE، REPO، GH_TOKEN، GITHUB_SHA، RUNNER_TEMP.
# DRY_RUN=1: همهٔ فراخوانی‌های gh فقط چاپ می‌شوند و هیچ چیزی منتشر یا تغییر داده نمی‌شود (برای آزمون در CI).
set -euo pipefail
if [ "${DRY_RUN:-0}" = "1" ]; then
  gh() { echo "[dry-run] gh $*" >&2; if [ "$1 $2" = "api repos/$REPO/branches/update-feed" ]; then return 0; fi; return 0; }
fi
test -n "${APK_SRC:-}" && test -f "$APK_SRC"
test -n "${HK_VERSION_CODE:-}" && test -n "${REPO:-}"
VN=$(node -p "require('./package.json').version")
TAG="v${VN}-b${HK_VERSION_CODE}"
cp "$APK_SRC" "$RUNNER_TEMP/hesab-ketab.apk"
node scripts/make-update-feed.js "$RUNNER_TEMP/version.json"
node -e "const n=(require('./version.json').notes||[]);require('fs').writeFileSync(process.env.RUNNER_TEMP+'/notes.md',(n.length?n.map(x=>'- '+x).join('\n'):'بهبودها و رفع اشکال')+'\n')"
gh release create "$TAG" "$RUNNER_TEMP/hesab-ketab.apk" "$RUNNER_TEMP/version.json" \
  --repo "$REPO" --title "حساب‌کتاب ${VN} (بیلد ${HK_VERSION_CODE})" --notes-file "$RUNNER_TEMP/notes.md" --latest
if ! gh api "repos/$REPO/branches/update-feed" >/dev/null 2>&1; then
  gh api -X POST "repos/$REPO/git/refs" -f ref=refs/heads/update-feed -f sha="$GITHUB_SHA" >/dev/null
fi
SHA=$(gh api "repos/$REPO/contents/version.json?ref=update-feed" --jq .sha 2>/dev/null || true)
CONTENT=$(base64 -w0 "$RUNNER_TEMP/version.json")
if [ -n "$SHA" ]; then
  gh api -X PUT "repos/$REPO/contents/version.json" -f message="Update feed: build ${HK_VERSION_CODE}" -f branch=update-feed -f content="$CONTENT" -f sha="$SHA" >/dev/null
else
  gh api -X PUT "repos/$REPO/contents/version.json" -f message="Update feed: build ${HK_VERSION_CODE}" -f branch=update-feed -f content="$CONTENT" >/dev/null
fi
echo "Published $TAG"
if [ "${DRY_RUN:-0}" = "1" ]; then echo "--- version.json (dry-run) ---"; cat "$RUNNER_TEMP/version.json"; echo; echo "--- notes.md ---"; cat "$RUNNER_TEMP/notes.md"; fi
