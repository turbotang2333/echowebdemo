// Stage helpers: 16:9 letterbox + timeline runner + dev overlay.
//
// Every beat HTML follows the same contract:
//   - has a #stage element (the letterboxed container)
//   - calls EchoStage.mount({ stage, duration, steps, reset, title })
//   - exposes window.EchoBeat = { play, reset, duration, title } for the index page's 连播.
window.EchoStage = (function () {
  function fitToWindow(el, aspect) {
    aspect = aspect || 16 / 9;
    function fit() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      let sw, sh;
      if (w / h > aspect) { sh = h; sw = h * aspect; }
      else { sw = w; sh = w / aspect; }
      el.style.width = sw + 'px';
      el.style.height = sh + 'px';
    }
    fit();
    window.addEventListener('resize', fit);
  }

  // Schedule a list of { at: ms, run: () => void } actions. Returns a cancel handle.
  function runTimeline(steps) {
    const timers = steps.map(function (s) { return setTimeout(s.run, s.at); });
    return { cancel: function () { timers.forEach(clearTimeout); } };
  }

  // Full mount: wires play/reset, dev overlay, keyboard shortcuts, auto-play.
  function mount(opts) {
    fitToWindow(opts.stage, opts.aspect || 16 / 9);

    let controller = null;
    let startedAt = 0;

    function play() {
      reset();
      // 把 stage 内所有 <video> 拽回 0 帧 — 否则 Replay/刷新(bfcache) 后,
      // 视频自走时钟会与 beat 时间线脱锚.
      opts.stage.querySelectorAll('video').forEach(function (v) {
        try { v.currentTime = 0; } catch (e) {}
        var p = v.play(); if (p && p.catch) p.catch(function () {});
      });
      startedAt = performance.now();
      controller = runTimeline(opts.steps());
    }
    function reset() {
      if (controller) { controller.cancel(); controller = null; }
      if (opts.reset) opts.reset();
    }

    // Dev overlay
    const overlay = document.createElement('div');
    overlay.className = 'echo-dev';
    overlay.innerHTML =
      '<button class="echo-dev-replay">▶ replay</button>' +
      '<span class="echo-dev-time">0.00s / ' + (opts.duration / 1000).toFixed(2) + 's</span>' +
      '<button class="echo-dev-clean">clean</button>' +
      '<span class="echo-dev-hint">[r] replay · [c] clean</span>';
    document.body.appendChild(overlay);
    const timeEl = overlay.querySelector('.echo-dev-time');
    overlay.querySelector('.echo-dev-replay').addEventListener('click', play);
    overlay.querySelector('.echo-dev-clean').addEventListener('click', function () {
      document.body.classList.toggle('echo-clean');
    });
    (function tick() {
      const t = Math.min(performance.now() - startedAt, opts.duration);
      timeEl.textContent = (t / 1000).toFixed(2) + 's / ' + (opts.duration / 1000).toFixed(2) + 's';
      requestAnimationFrame(tick);
    })();

    document.addEventListener('keydown', function (e) {
      if (e.key === 'r' || e.key === 'R') play();
      if (e.key === 'c' || e.key === 'C') document.body.classList.toggle('echo-clean');
    });

    // Expose to index page for 连播.
    window.EchoBeat = {
      play: play,
      reset: reset,
      duration: opts.duration,
      title: opts.title || '',
    };

    setTimeout(play, 200);

    // bfcache 还原(前进/后退) 时, 脚本不重跑但页面元素被复原 — 用 pageshow.persisted
    // 再点一次 play, 让视频和时间线一起回到 0.
    window.addEventListener('pageshow', function (e) {
      if (e.persisted) play();
    });
  }

  return { mount: mount, fitToWindow: fitToWindow, runTimeline: runTimeline };
})();
