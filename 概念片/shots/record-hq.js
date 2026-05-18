// 概念片高码率/真 60fps 录制 — macOS avfoundation 直录显示器版.
//
// 用法:
//   1) 另开终端: npm run dev
//   2) 给"终端"在 系统设置 → 隐私 → 屏幕与系统录制 里勾上 (首次)
//   3) npm run record:concept:hq
//   4) Chromium 会全屏接管约 95s, 期间不要碰键盘鼠标
//
// 环境变量:
//   PORT=8000           dev server 端口
//   OUT=echo-hq.mp4     输出文件
//   FPS=60              录制帧率
//   DISPLAY_IDX=1       avfoundation 显示器编号 (ffmpeg -f avfoundation -list_devices true -i "" 可看)
//   TARGET_W=1920       输出宽
//   TARGET_H=1080       输出高
//   CRF=17              x264 crf, 越小越清, 18 通常视觉无损
//   AUTO_OPEN=1         结束后自动 open 文件
//
// 原理: 用 Chromium --app 模式开一个无 chrome chrome 的全屏窗口(纯页面),
// ffmpeg 通过 macOS avfoundation 抓整个显示器, 自动从中心裁出 16:9 再缩到 1080p.
// 不走 CDP 的 JPEG screencast, 真 GPU 渲染 + 真 60fps.

const path = require('path');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer');

const PORT       = Number(process.env.PORT       || 8000);
const OUT        = process.env.OUT               || 'echo-concept-hq.mp4';
const FPS        = Number(process.env.FPS        || 60);
const DISPLAY    = process.env.DISPLAY_IDX       || '1';
const TARGET_W   = Number(process.env.TARGET_W   || 1920);
const TARGET_H   = Number(process.env.TARGET_H   || 1080);
const CRF        = Number(process.env.CRF        || 17);
const EXTRA_MS   = 1500;
const AUTO_OPEN  = process.env.AUTO_OPEN !== '0';

const URL = `http://localhost:${PORT}/%E6%A6%82%E5%BF%B5%E7%89%87/shots/index.html`;

(async () => {
  console.log(`[record-hq] launching chromium → ${URL}`);
  const browser = await puppeteer.launch({
    headless: false,
    pipe: true,
    defaultViewport: null,
    args: [
      '--no-default-browser-check',
      '--no-first-run',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows',
      '--disable-features=CalculateNativeWinOcclusion',
      '--autoplay-policy=no-user-gesture-required',
    ],
  });

  const page = (await browser.pages())[0];
  await page.goto(URL, { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => typeof BEATS !== 'undefined', { timeout: 10000 });

  const totalMs = await page.evaluate(() => {
    const ready = BEATS.filter(b => b.status === 'ready');
    return Math.round(
      ready.reduce((s, b) => s + parseFloat(b.dur), 0) * 1000
      + (ready.length - 1) * 600
      + ready.length * 200
    );
  });
  const captureSec = (totalMs + EXTRA_MS) / 1000;

  // 整屏抓 → 从中心裁 16:9 → 缩到 TARGET_W × TARGET_H.
  // 页面 fitToWindow 已把舞台 letterbox 到 16:9 居中, 与中心裁正好对齐.
  const vf = `crop=in_w:in_w*9/16:0:(in_h-in_w*9/16)/2,scale=${TARGET_W}:${TARGET_H}:flags=lanczos`;

  console.log(`[record-hq] beats = ${totalMs}ms, capturing ${captureSec.toFixed(1)}s @ ${FPS}fps → ${OUT}`);
  console.log(`[record-hq] ⚠️  不要碰键盘鼠标, ${captureSec.toFixed(0)}s 内全屏被接管`);

  // 把首页 UI 抹黑 + 注入隐形按钮触发 requestFullscreen (用户手势 fullscreen API 才允许).
  await page.evaluate(() => {
    document.body.style.background = '#000';
    document.querySelectorAll('h1, .sub, .actions, .grid').forEach(el => el.style.opacity = '0');
    const b = document.createElement('button');
    b.id = '__record_fs__';
    b.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;z-index:999999;';
    b.addEventListener('click', () => {
      document.documentElement.requestFullscreen({ navigationUI: 'hide' }).then(() => b.remove());
    });
    document.body.appendChild(b);
  });
  await page.click('#__record_fs__');
  await page.waitForFunction(() => !!document.fullscreenElement, { timeout: 5000 });
  await new Promise(r => setTimeout(r, 800)); // 等 macOS fullscreen 动画结束

  const ff = spawn('ffmpeg', [
    '-y', '-hide_banner', '-loglevel', 'warning', '-stats',
    '-f', 'avfoundation',
    '-framerate', String(FPS),
    '-capture_cursor', '0',
    '-pixel_format', 'uyvy422',
    '-i', `${DISPLAY}:none`,
    '-t', captureSec.toFixed(2),
    '-vf', vf,
    '-c:v', 'libx264',
    '-preset', 'medium',
    '-crf', String(CRF),
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    path.resolve(OUT),
  ], { stdio: ['ignore', 'inherit', 'inherit'] });

  // ffmpeg 起预热 ~1.5s 后再点连播 (确保前几帧已经在录)
  await new Promise(r => setTimeout(r, 1500));
  console.log('[record-hq] clicking #play-all');
  await page.click('#play-all');

  await new Promise((resolve, reject) => {
    ff.on('exit', code => code === 0 ? resolve() : reject(new Error(`ffmpeg exit ${code}`)));
    ff.on('error', reject);
  });

  await browser.close();
  console.log(`[record-hq] done → ${path.resolve(OUT)}`);

  if (AUTO_OPEN) spawn('open', [path.resolve(OUT)], { detached: true });
})().catch(e => { console.error(e); process.exit(1); });
