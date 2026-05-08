#!/usr/bin/env bash
# 把当前工作树的 v2/ + src/images/ 同步到 gitlab/main，作为一个新 commit。
# 不动本地 main，不动未提交状态。GitLab 仓库保持"v2 部署子集"语义。
#
# 用法： ./scripts/deploy-gitlab.sh [commit-message]

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

if ! git remote get-url gitlab >/dev/null 2>&1; then
  echo "error: 没有名为 'gitlab' 的 remote。先执行: git remote add gitlab <url>" >&2
  exit 1
fi

MSG="${1:-deploy: sync v2 $(date +%Y-%m-%d)}"
BRANCH="_gitlab-deploy-$$"
TMP="$(mktemp -d -t v2-deploy.XXXXXX)"

cleanup() {
  git worktree remove --force "$TMP" >/dev/null 2>&1 || true
  git branch -D "$BRANCH" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "→ fetch gitlab"
git fetch gitlab --quiet

echo "→ 在 gitlab/main 之上建 worktree: $TMP"
git worktree add "$TMP" gitlab/main -b "$BRANCH" >/dev/null

echo "→ 覆盖 v2/ 与 src/images/"
rm -rf "$TMP/v2"
cp -R v2 "$TMP/"
mkdir -p "$TMP/src/images"
# 同步所有 src/images/ 下的资源（webp/png/jpg/jpeg/gif/svg）
shopt -s nullglob
for f in src/images/*.{webp,png,jpg,jpeg,gif,svg}; do
  cp "$f" "$TMP/src/images/"
done
shopt -u nullglob

cd "$TMP"
git add -A

if git diff --cached --quiet; then
  echo "✓ 无变化，跳过推送"
  exit 0
fi

echo "→ 提交"
git -c user.name="$(git -C "$REPO_ROOT" config user.name)" \
    -c user.email="$(git -C "$REPO_ROOT" config user.email)" \
    commit -m "$MSG" --quiet

echo "→ push gitlab → main"
git push gitlab "$BRANCH:main"

echo "✓ 完成"
