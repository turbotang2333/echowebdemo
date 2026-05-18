#!/usr/bin/env bash
# 一键启动本地 dev server + ngrok 公网隧道
# 用法: npm run share                                 访问根目录
#       npm run share prototypes/wave-test.html      直接拼出子页面链接

set -euo pipefail

PORT="${PORT:-8000}"
SUBPATH="${1:-}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="$ROOT/.share-logs"
mkdir -p "$LOG_DIR"
SERVER_LOG="$LOG_DIR/server.log"
TUNNEL_LOG="$LOG_DIR/tunnel.log"

cleanup() {
  echo ""
  echo "[share] 停止服务..."
  [[ -n "${SERVER_PID:-}" ]] && kill "$SERVER_PID" 2>/dev/null || true
  [[ -n "${TUNNEL_PID:-}" ]] && kill "$TUNNEL_PID" 2>/dev/null || true
  exit 0
}
trap cleanup INT TERM

if ! command -v ngrok >/dev/null 2>&1; then
  echo "[share] 未安装 ngrok。先执行: brew install ngrok"
  echo "[share] 然后到 https://dashboard.ngrok.com/get-started/your-authtoken 拿 token"
  echo "[share] 再执行: ngrok config add-authtoken <你的token>"
  exit 1
fi

if lsof -iTCP:4040 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "[share] 4040 端口被占用,可能已有 ngrok 在跑。先 Ctrl+C 关掉那个再来。"
  exit 1
fi

if lsof -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "[share] 端口 $PORT 已被占用,直接复用现有服务"
  SERVER_PID=""
else
  echo "[share] 启动本地服务: http://localhost:$PORT"
  ( cd "$ROOT" && python3 -m http.server "$PORT" ) >"$SERVER_LOG" 2>&1 &
  SERVER_PID=$!
  for _ in {1..20}; do
    sleep 0.2
    lsof -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1 && break
  done
fi

echo "[share] 启动 ngrok 隧道..."
: >"$TUNNEL_LOG"
ngrok http "$PORT" --log=stdout --log-format=logfmt >"$TUNNEL_LOG" 2>&1 &
TUNNEL_PID=$!

# 通过 ngrok 本地 API 拿公网地址(比扫日志稳)
PUBLIC_URL=""
for _ in {1..30}; do
  sleep 1
  PUBLIC_URL="$(curl -s http://127.0.0.1:4040/api/tunnels 2>/dev/null \
    | python3 -c "import sys,json; d=json.load(sys.stdin); print(next((t['public_url'] for t in d.get('tunnels',[]) if t['public_url'].startswith('https')), ''))" 2>/dev/null || true)"
  [[ -n "$PUBLIC_URL" ]] && break
done

if [[ -z "$PUBLIC_URL" ]]; then
  echo "[share] 30 秒内未拿到公网地址,查看日志: $TUNNEL_LOG"
  cleanup
fi

FULL_URL="$PUBLIC_URL"
[[ -n "$SUBPATH" ]] && FULL_URL="$PUBLIC_URL/${SUBPATH#/}"

echo ""
echo "================================================================"
echo "  本地:     http://localhost:$PORT${SUBPATH:+/$SUBPATH}"
echo "  公网:     $FULL_URL"
echo "  调试面板: http://127.0.0.1:4040"
echo "================================================================"
echo "  注意: ngrok 免费版首次访问有警告页,需点 Visit Site 才放行"
echo "  按 Ctrl+C 退出(同时停掉 server 和 tunnel)"
echo ""

if command -v qrencode >/dev/null 2>&1; then
  qrencode -t ansiutf8 "$FULL_URL" || true
else
  echo "[提示] brew install qrencode 可在终端直接显示二维码,方便手机扫"
fi

wait "$TUNNEL_PID"
