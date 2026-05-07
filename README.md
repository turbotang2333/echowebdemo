# 本地预览

> 项目用了 ES 模块,**不能直接双击 `index.html` 打开**,必须起一个本地服务器。

## 目录结构

- 根目录 `/`:**竖屏版**(主推)— 全程竖屏,Capacitor 构建入口
- `v2/`:v2 demo(节奏方案,见 `plans/v2/`)
- `landscape/`:横屏版(旧版,保留)— 引导段竖屏 → 剧情段横屏
- `prototypes/`:独立测试/原型页(陀螺仪 + 视差)
- `plans/`:方案文档,按版本归档
  - `plans/main/` — 主版设计/剧本/交互问题
  - `plans/v2/` — v2 demo 节奏与剧本
  - `plans/landscape/` — 横屏适配方案
- `src/images/`:三版共享图集
- `docs/`:原始资料 PDF

## 访问入口

- 主版(竖屏):`http://localhost:8000`
- v2 demo:`http://localhost:8000/v2/`
- 横屏版:`http://localhost:8000/landscape/`
- 陀螺仪测试:`http://localhost:8000/prototypes/gyro-test.html`

## 一、启动服务器

打开"终端"(Terminal),`cd` 到项目根目录,执行:

```
python3 -m http.server 8000
```

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

## 改了代码看不到效果?

刷新浏览器。还不行就 `⌘ + Shift + R` 强制刷新 —— 浏览器有时会缓存旧文件。
