// 概念片连播 → mp4 录制脚本。
//
// 用法:
//   1) 另开终端: npm run dev    (起 http://localhost:8000)
//   2) npm run record:concept   (默认输出 1080p, 60fps 到 echo-concept.mp4)
//
// 环境变量:
//   PORT      端口, 默认 8000
//   OUT       输出文件名, 默认 echo-concept.mp4
//   WIDTH     视口宽, 默认 1920
//   HEIGHT    视口高, 默认 1080  (16:9 与 stage 一致, 不会有黑边)
//   FPS       帧率, 默认 60
//   EXTRA_MS  连播结束后多录的毫秒, 默认 1500 (给末帧呼吸)
//
// 依赖: puppeteer, puppeteer-screen-recorder, 系统级 ffmpeg.

const path = require('path');
const puppeteer = require('puppeteer');
const { PuppeteerScreenRecorder } = require('puppeteer-screen-recorder');

const PORT     = Number(process.env.PORT    || 8000);
const OUT      = process.env.OUT            || 'echo-concept.mp4';
const WIDTH    = Number(process.env.WIDTH   || 1920);
const HEIGHT   = Number(process.env.HEIGHT  || 1080);
const FPS      = Number(process.env.FPS     || 60);
const EXTRA_MS = Number(process.env.EXTRA_MS|| 1500);

const URL = `http://localhost:${PORT}/%E6%A6%82%E5%BF%B5%E7%89%87/shots/index.html`;

(async () => {
  console.log(`[record] launching headless chrome → ${URL}`);
  const browser = await puppeteer.launch({
    headless: true,
    pipe: true,
    args: [
      '--no-sandbox',
      '--autoplay-policy=no-user-gesture-required',
      '--disable-web-security',
      `--window-size=${WIDTH},${HEIGHT}`,
    ],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 1 });

  await page.goto(URL, { waitUntil: 'networkidle0' });

  // 从页面里读 BEATS 算出 ready 段总时长 (避免脚本里 hard-code, 改 manifest 这里自动跟)
  const totalMs = await page.evaluate(() => {
    const ready = BEATS.filter(b => b.status === 'ready');
    const sumSec = ready.reduce((s, b) => s + parseFloat(b.dur), 0);
    // 每段间 600ms 衔接 (见 index.html sequencePlay) + mount 后 200ms 启动延迟
    return Math.round(sumSec * 1000 + (ready.length - 1) * 600 + ready.length * 200);
  });
  const recordMs = totalMs + EXTRA_MS;
  console.log(`[record] total beats duration = ${totalMs}ms, recording ${recordMs}ms @ ${FPS}fps → ${OUT}`);

  const recorder = new PuppeteerScreenRecorder(page, {
    fps: FPS,
    videoFrame: { width: WIDTH, height: HEIGHT },
    videoCrf: 18,
    videoCodec: 'libx264',
    videoPreset: 'slow',
    videoBitrate: 12000,
    autopad: { color: 'black' },
    aspectRatio: '16:9',
  });
  await recorder.start(path.resolve(OUT));

  // 触发连播 (页面里的 #play-all 走 iframe 链式播放, 每段读自身 EchoBeat.duration)
  await page.click('#play-all');

  await new Promise(r => setTimeout(r, recordMs));

  await recorder.stop();
  await browser.close();
  console.log(`[record] done → ${path.resolve(OUT)}`);
})().catch(err => {
  console.error(err);
  process.exit(1);
});
