# 本地预览

> 项目用了 ES 模块,**不能直接双击 `index.html` 打开**,必须起一个本地服务器。

## 目录结构

- 根目录 `/`:主项目(竖屏短剧体验)— 入口 `index.html` / `style.css` / `js/`
- `prototypes/`:独立测试/原型页(陀螺仪 + 视差、上滑涟漪)
- `plans/`:方案文档(节奏起伏、规范制作文档、上滑涟漪手册)
- `src/images/`:场景与角色素材
- `src/videos/`:剧情视频素材(回响视频等)
- `docs/`:原始资料 PDF(世界观、原论文、剧情大纲)
- `scripts/`:`share.sh`(本地分享) + `deploy-gitlab.sh`(GitLab 部署)
- `viewer.html`:项目内 Markdown 浏览器(扫 plans/ scripts/ prototypes/)

## 访问入口

- 主项目: `http://localhost:8000`
- 文档浏览器: `http://localhost:8000/viewer.html`
- 原型页: `http://localhost:8000/prototypes/gyro-test.html`、`http://localhost:8000/prototypes/wave-test.html`

## 一、启动服务器

打开"终端"(Terminal),`cd` 到项目根目录,执行:

```
npm run dev
```

(等价于 `python3 -m http.server 8000`)

终端会停在那等请求 —— 这是正常的,**不要关掉这个窗口**。

## 二、在电脑上看

浏览器打开:

```
http://localhost:8000
```

## 三、在手机上看

确保**手机和电脑连同一个 Wi-Fi**,新开一个终端查当前 IP(每次都要现查,IP 会变):

```
ipconfig getifaddr en0
```

手机浏览器打开 `http://<查到的IP>:8000`

## 四、关掉服务器

回到运行服务器的那个终端窗口,按 `Control + C`

如果忘了哪个窗口在跑、或者下次启动报 `Address already in use`,可以这样查:

```bash
# 看 8000 端口被谁占着(有输出就是有进程在跑)
lsof -iTCP:8000 -sTCP:LISTEN

# 看所有本地 http.server 进程
ps aux | grep http.server | grep -v grep

# 直接杀掉占 8000 端口的进程
kill $(lsof -tiTCP:8000 -sTCP:LISTEN)
```

## 五、分享给手机/同事看(公网临时链接)

不在同一 Wi-Fi 也想测?用 ngrok 临时隧道:

```bash
npm run share                              # 分享根目录
npm run share prototypes/wave-test.html    # 直接拼出子页面链接
```

终端会打印一个 `https://xxxx.ngrok-free.app` 地址,关掉(Ctrl+C)就失效。
装了 `qrencode`(`brew install qrencode`)还会顺手画二维码方便手机扫。

**首次准备**(只做一次):

```bash
brew install ngrok
# 到 https://dashboard.ngrok.com/get-started/your-authtoken 拿 token,然后:
ngrok config add-authtoken <你的token>
```

注意:ngrok 免费版的链接对方第一次访问会看到一个警告页,点 "Visit Site" 才能进。

**找出并杀掉残留的 ngrok 进程**(忘了哪个窗口在跑,或链接还活着):

```bash
# 查 ngrok 进程
ps aux | grep ngrok | grep -v grep

# 一键杀掉所有 ngrok
pkill -f ngrok          # 不行就 pkill -9 -f ngrok

# 验证(没输出就是干净了)
pgrep -fl ngrok
```

## 六、Capacitor / 安卓壳(可选)

主项目已是纯 Web,以后想给它套安卓壳走 Capacitor:

```bash
npm run build           # 把根目录运行时文件拷到 www/
npm run sync            # build + npx cap sync
npm run open:android    # sync + 打开 Android Studio
```

`capacitor.config.json` 的 `webDir` 指向 `www/`,build 脚本会把 `index.html / style.css / js/ / src/` 复制进去。

## 改了代码看不到效果?

刷新浏览器。还不行就 `⌘ + Shift + R` 强制刷新 —— 浏览器有时会缓存旧文件。
