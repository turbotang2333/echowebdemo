# Echo Web Demo

本项目是 Echo 的本地 Web Demo 仓库，当前主要开发页面是 `prototypes/june-demo/`。

## 常用入口

- 根目录入口：`http://localhost:8000/`
- 6 月 Demo：`http://localhost:8000/prototypes/june-demo/`
- 方案文档：`plans/README.md`

## 启动方式

项目需要通过本地服务打开，不能直接双击 HTML 文件。

```bash
npm run dev
```

启动后浏览器打开根目录入口：

```text
http://localhost:8000/
```

根目录入口会引导到 6 月 Demo。也可以直接打开：

```text
http://localhost:8000/prototypes/june-demo/
```

## 目录说明

- `index.html`：根目录入口页，指向 6 月 Demo。
- `style.css` / `js/`：旧主项目遗留内容，暂时保留。
- `prototypes/`：独立 Demo 和测试页面，当前重点是 `prototypes/june-demo/`。
- `plans/`：当前方案文档和旧资料归档。
- `docs/`：原始资料。
- `src/`：图片、视频等素材。
- `scripts/`：本地分享等脚本。
- `android/`：安卓壳相关内容。
- `www/`：打包生成目录，可以重新生成。
- `概念片/`：概念片方案和录制脚本。

## 手机预览

确保手机和电脑连同一个 Wi-Fi。

先查电脑 IP：

```bash
ipconfig getifaddr en0
```

手机浏览器打开：

```text
http://<电脑IP>:8000/prototypes/june-demo/
```

## 临时分享

生成一个公网临时链接：

```bash
npm run share prototypes/june-demo/
```

链接关闭终端后失效。

## 安卓壳

```bash
npm run build
npm run sync
npm run open:android
```

`npm run build` 会把根目录入口、旧主项目资源和 `prototypes/june-demo/` 复制到 `www/`。

## 常见问题

如果页面没更新，先强制刷新浏览器。

如果 `8000` 端口被占用，可以查占用进程：

```bash
lsof -iTCP:8000 -sTCP:LISTEN
```

需要直接停止占用：

```bash
kill $(lsof -tiTCP:8000 -sTCP:LISTEN)
```
