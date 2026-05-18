// The Echo curve family.
//
// Master shape: a circle. Every visible 弧/圆 in the concept film is an
// arc-segment of this same circle, scaled/rotated from one source. This is the
// "all arcs share one curve equation" hard constraint from 投资人概念片方案 §5.4.
//
// Angle convention: math-style (0 = right, π/2 = up, counterclockwise positive).
// SVG y-axis is flipped inside arcPath().
window.EchoCurves = (function () {
  const TAU = Math.PI * 2;

  // Arc from aStart to aEnd on a circle of radius r centered at (cx, cy).
  function arcPath(cx, cy, r, aStart, aEnd) {
    const x0 = cx + r * Math.cos(aStart);
    const y0 = cy - r * Math.sin(aStart);
    const x1 = cx + r * Math.cos(aEnd);
    const y1 = cy - r * Math.sin(aEnd);
    const delta = aEnd - aStart;
    const largeArc = Math.abs(delta) > Math.PI ? 1 : 0;
    const sweep = delta < 0 ? 1 : 0;
    return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${largeArc} ${sweep} ${x1.toFixed(2)} ${y1.toFixed(2)}`;
  }

  // The signature 回响弧 — wide flat quadratic bezier matching demo's
  // M 60 230 Q 500 30 940 230 shape (style.css .edge-arc-main).
  //   cx: horizontal center of arc
  //   baseY: y of the two endpoints
  //   halfWidth: distance from cx to each endpoint
  //   peakRise: how far the *visible* peak (at t=0.5) rises above baseY
  // Visible peak satisfies (y0 + 2*yc + y2)/4 = baseY - peakRise → yc = baseY - 2*peakRise.
  function signatureArc(cx, baseY, halfWidth, peakRise) {
    // Demo proportions: width 880, visible peak rise 100 → rise = width * 0.114.
    if (peakRise == null) peakRise = halfWidth * 2 * 0.114;
    const yc = baseY - 2 * peakRise;
    return `M ${(cx - halfWidth).toFixed(2)} ${baseY.toFixed(2)} ` +
           `Q ${cx.toFixed(2)} ${yc.toFixed(2)} ` +
           `${(cx + halfWidth).toFixed(2)} ${baseY.toFixed(2)}`;
  }

  // Full closed circle — Beat 7 终点.
  function fullCircle(cx, cy, r) {
    return `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy} Z`;
  }

  // Rounded-rect 手机轮廓. Corners are arc-segments of the same circle family
  // (radius = cornerR), keeping the curve motif consistent.
  function phoneOutline(cx, cy, w, h, cornerR) {
    const x0 = cx - w / 2, x1 = cx + w / 2;
    const y0 = cy - h / 2, y1 = cy + h / 2;
    const r = cornerR;
    return [
      `M ${x0 + r} ${y0}`,
      `H ${x1 - r}`,
      `A ${r} ${r} 0 0 1 ${x1} ${y0 + r}`,
      `V ${y1 - r}`,
      `A ${r} ${r} 0 0 1 ${x1 - r} ${y1}`,
      `H ${x0 + r}`,
      `A ${r} ${r} 0 0 1 ${x0} ${y1 - r}`,
      `V ${y0 + r}`,
      `A ${r} ${r} 0 0 1 ${x0 + r} ${y0}`,
      'Z',
    ].join(' ');
  }

  // Approximate perimeter for stroke-dash draw-in.
  function arcLen(r, angleSpan) { return r * angleSpan; }
  function circleLen(r) { return TAU * r; }
  function phoneOutlineLen(w, h, cornerR) {
    return 2 * (w - 2 * cornerR) + 2 * (h - 2 * cornerR) + TAU * cornerR;
  }

  return { arcPath, signatureArc, fullCircle, phoneOutline, arcLen, circleLen, phoneOutlineLen, TAU };
})();
