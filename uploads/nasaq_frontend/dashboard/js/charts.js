/* Lightweight SVG charts (RTL: first point is drawn on the right). */
(function(){
  const NS = 'http://www.w3.org/2000/svg';
  const mounted = new Set();
  const fmt = n => n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '') + 'k' : String(Math.round(n));

  function niceMax(v){
    if (v <= 0) return 10;
    const p = Math.pow(10, Math.floor(Math.log10(v)));
    const n = v / p;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
  }

  function smooth(pts){
    if (pts.length < 2) return '';
    let d = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++){
      const [x0, y0] = pts[i - 1] || pts[i], [x1, y1] = pts[i], [x2, y2] = pts[i + 1], [x3, y3] = pts[i + 2] || pts[i + 1];
      const t = 0.18;
      d += ` C${x1 + (x2 - x0) * t},${y1 + (y2 - y0) * t} ${x2 - (x3 - x1) * t},${y2 - (y3 - y1) * t} ${x2},${y2}`;
    }
    return d;
  }

  function tipEl(host){
    let t = host.querySelector('.chart-tip');
    if (!t){ t = document.createElement('div'); t.className = 'chart-tip'; host.appendChild(t); }
    return t;
  }

  function area(host, o){
    const W = host.clientWidth || 600, H = o.height || 260;
    const pad = { t:14, r:10, b:28, l:40 };
    const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
    const n = o.labels.length;
    const max = niceMax(Math.max(...o.series.flatMap(s => s.data)) * 1.08);
    const X = i => pad.l + iw - (n === 1 ? iw / 2 : (i / (n - 1)) * iw);
    const Y = v => pad.t + ih - (v / max) * ih;
    const uid = 'g' + Math.random().toString(36).slice(2, 8);

    let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><defs>`;
    o.series.forEach((se, k) => {
      s += `<linearGradient id="${uid}${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${se.color}" stop-opacity="${k ? .12 : .28}"/><stop offset="1" stop-color="${se.color}" stop-opacity="0"/></linearGradient>`;
    });
    s += '</defs>';
    for (let g = 0; g <= 4; g++){
      const y = pad.t + (ih / 4) * g;
      s += `<line class="grid-line" x1="${pad.l}" x2="${W - pad.r}" y1="${y}" y2="${y}"/>`;
      s += `<text class="axis" x="${pad.l - 8}" y="${y + 4}" text-anchor="end">${fmt(max - (max / 4) * g)}</text>`;
    }
    const step = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(iw / 70))));
    o.labels.forEach((l, i) => { if ((n - 1 - i) % step === 0) s += `<text class="axis" x="${X(i)}" y="${H - 6}" text-anchor="middle">${l}</text>`; });
    o.series.slice().reverse().forEach((se) => {
      const k = o.series.indexOf(se);
      const pts = se.data.map((v, i) => [X(i), Y(v)]);
      const line = smooth(pts);
      s += `<path d="${line} L${pts[pts.length - 1][0]},${pad.t + ih} L${pts[0][0]},${pad.t + ih} Z" fill="url(#${uid}${k})"/>`;
      s += `<path d="${line}" fill="none" stroke="${se.color}" stroke-width="${k ? 2 : 2.6}" stroke-linecap="round" ${se.dash ? 'stroke-dasharray="5 5"' : ''} class="c-line"/>`;
    });
    s += `<line class="hover-line" x1="0" x2="0" y1="${pad.t}" y2="${pad.t + ih}" stroke="var(--muted)" stroke-dasharray="3 3" opacity="0"/>`;
    o.series.forEach((se, k) => { s += `<circle class="hover-dot" data-k="${k}" r="5" fill="var(--card)" stroke="${se.color}" stroke-width="2.5" opacity="0"/>`; });
    s += `<rect x="${pad.l}" y="${pad.t}" width="${iw}" height="${ih}" fill="transparent" class="hit"/></svg>`;
    host.innerHTML = s;

    host.querySelectorAll('.c-line').forEach(p => {
      const len = p.getTotalLength();
      p.style.strokeDasharray = p.getAttribute('stroke-dasharray') || len;
      if (!p.getAttribute('stroke-dasharray')){
        p.style.strokeDashoffset = len;
        p.animate([{ strokeDashoffset:len }, { strokeDashoffset:0 }], { duration:1100, easing:'cubic-bezier(.4,0,.2,1)', fill:'forwards' });
      }
    });

    const tip = tipEl(host), svg = host.querySelector('svg'), hl = svg.querySelector('.hover-line'), dots = svg.querySelectorAll('.hover-dot');
    svg.querySelector('.hit').addEventListener('mousemove', e => {
      const r = svg.getBoundingClientRect();
      const x = (e.clientX - r.left) * (W / r.width);
      const i = Math.max(0, Math.min(n - 1, Math.round(((pad.l + iw - x) / iw) * (n - 1))));
      hl.setAttribute('x1', X(i)); hl.setAttribute('x2', X(i)); hl.setAttribute('opacity', 1);
      dots.forEach(dt => { const k = +dt.dataset.k; dt.setAttribute('cx', X(i)); dt.setAttribute('cy', Y(o.series[k].data[i])); dt.setAttribute('opacity', 1); });
      tip.innerHTML = `<b>${o.tipLabels ? o.tipLabels[i] : o.labels[i]}</b>` + o.series.map(se => `<span><i style="background:${se.color}"></i>${se.name}: ${se.data[i].toLocaleString('en')}${o.unit || ''}</span>`).join('');
      tip.style.left = (X(i) / W * r.width) + 'px';
      tip.style.top = (Y(Math.max(...o.series.map(se => se.data[i]))) / H * r.height) + 'px';
      tip.classList.add('show');
    });
    svg.querySelector('.hit').addEventListener('mouseleave', () => { tip.classList.remove('show'); hl.setAttribute('opacity', 0); dots.forEach(dt => dt.setAttribute('opacity', 0)); });
  }

  function bars(host, o){
    const W = host.clientWidth || 600, H = o.height || 240;
    const pad = { t:14, r:10, b:30, l:40 };
    const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
    const n = o.labels.length, m = o.series.length;
    const max = niceMax(Math.max(...o.series.flatMap(s => s.data)) * 1.1);
    const gw = iw / n, bw = Math.min(26, (gw * 0.62) / m);
    let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`;
    for (let g = 0; g <= 4; g++){
      const y = pad.t + (ih / 4) * g;
      s += `<line class="grid-line" x1="${pad.l}" x2="${W - pad.r}" y1="${y}" y2="${y}"/><text class="axis" x="${pad.l - 8}" y="${y + 4}" text-anchor="end">${fmt(max - (max / 4) * g)}</text>`;
    }
    o.labels.forEach((l, i) => {
      const cx = pad.l + iw - gw * i - gw / 2;
      s += `<text class="axis" x="${cx}" y="${H - 8}" text-anchor="middle">${l.length > 14 ? l.slice(0, 13) + '…' : l}</text>`;
      o.series.forEach((se, k) => {
        const h = (se.data[i] / max) * ih, x = cx + (m / 2 - k - 1) * (bw + 3) + 1.5;
        s += `<rect class="bar" data-i="${i}" x="${x}" y="${pad.t + ih - h}" width="${bw}" height="${Math.max(h, 0)}" rx="5" fill="${se.color}" style="transform-origin:${x}px ${pad.t + ih}px;animation:barUp .8s ${i * 0.05}s cubic-bezier(.34,1.3,.64,1) both"/>`;
      });
      s += `<rect class="bhit" data-i="${i}" x="${cx - gw / 2}" y="${pad.t}" width="${gw}" height="${ih}" fill="transparent"/>`;
    });
    s += '<style>@keyframes barUp{from{transform:scaleY(0)}}</style></svg>';
    host.innerHTML = s;
    const tip = tipEl(host), svg = host.querySelector('svg');
    svg.querySelectorAll('.bhit').forEach(h => {
      h.addEventListener('mouseenter', () => {
        const i = +h.dataset.i, r = svg.getBoundingClientRect();
        svg.querySelectorAll('.bar').forEach(b => b.style.opacity = +b.dataset.i === i ? 1 : .45);
        tip.innerHTML = `<b>${o.labels[i]}</b>` + o.series.map(se => `<span><i style="background:${se.color}"></i>${se.name}: ${se.data[i].toLocaleString('en')}${o.unit || ''}</span>`).join('');
        const cx = pad.l + iw - gw * i - gw / 2;
        tip.style.left = (cx / W * r.width) + 'px';
        tip.style.top = ((pad.t + ih - (Math.max(...o.series.map(se => se.data[i])) / max) * ih) / H * r.height) + 'px';
        tip.classList.add('show');
      });
      h.addEventListener('mouseleave', () => { tip.classList.remove('show'); svg.querySelectorAll('.bar').forEach(b => b.style.opacity = 1); });
    });
  }

  function donut(host, o){
    const size = o.size || 170, sw = o.stroke || 22, r = (size - sw) / 2, c = 2 * Math.PI * r;
    const total = o.data.reduce((a, b) => a + b.value, 0);
    let off = 0;
    let s = `<div style="position:relative;width:${size}px;height:${size}px;flex-shrink:0"><svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" style="transform:rotate(-90deg)">`;
    s += `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--hover)" stroke-width="${sw}"/>`;
    o.data.forEach((d, i) => {
      const len = (d.value / total) * c;
      s += `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${d.color}" stroke-width="${sw}" stroke-dasharray="${Math.max(len - 3, 0)} ${c}" stroke-dashoffset="${-off}" stroke-linecap="butt" style="animation:dIn 1s ${i * .12}s both"><title>${d.label}: ${Math.round(d.value / total * 100)}%</title></circle>`;
      off += len;
    });
    s += `<style>@keyframes dIn{from{stroke-dasharray:0 ${c}}}</style></svg><div class="donut-center"><div><b>${o.center || total}</b><small>${o.centerLabel || ''}</small></div></div></div>`;
    s += '<div class="donut-legend">' + o.data.map(d => `<div><i style="background:${d.color}"></i>${d.label}<b>${Math.round(d.value / total * 100)}%</b></div>`).join('') + '</div>';
    host.innerHTML = s;
  }

  function spark(data, color){
    const W = 96, H = 36, max = Math.max(...data), min = Math.min(...data);
    const pts = data.map((v, i) => [W - (i / (data.length - 1)) * W, H - 3 - ((v - min) / (max - min || 1)) * (H - 6)]);
    const line = smooth(pts);
    const id = 's' + Math.random().toString(36).slice(2, 7);
    return `<svg class="kpi-spark" viewBox="0 0 ${W} ${H}"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".25"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs><path d="${line} L0,${H} L${W},${H} Z" fill="url(#${id})"/><path d="${line}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round"/></svg>`;
  }

  function mount(host, type, opts){
    if (!host) return;
    const draw = () => (type === 'area' ? area : type === 'bars' ? bars : donut)(host, opts);
    host._draw = draw;
    mounted.add(host);
    draw();
  }

  let rt;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => mounted.forEach(h => { if (!document.body.contains(h)) mounted.delete(h); else if (h._draw && !h.classList.contains('no-redraw')) h._draw(); }), 150);
  });

  window.Charts = { mount, spark, fmt, redrawAll(){ mounted.forEach(h => document.body.contains(h) ? h._draw() : mounted.delete(h)); } };
})();
