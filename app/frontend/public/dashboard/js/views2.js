/* Views: campaigns, analytics, brand, library, automation, settings. */
(function(){
  const { U, D, on } = App;
  const { icon, esc, num, plat, PLAT } = U;
  const { series, dayLabels } = App.chartData;

  /* ================= CAMPAIGNS ================= */
  const OBJ = { 'وصول':'i-eye', 'زيارات':'i-link', 'تفاعل':'i-heart', 'عملاء محتملون':'i-target', 'مبيعات':'i-coin' };
  const CF = { tab:'all' };

  App.newCampaign = function(src){
    const st = { objective:'عملاء محتملون', platform:'ig' };
    App.modal({ title:'حملة إعلانية جديدة', sub:'ستُحفظ الحملة كمسودة في «إعلانات Meta» مع ربطها بنص المنشور.', size:'lg',
      body:`<div class="field"><label>اسم الحملة</label><input class="input" id="cName" placeholder="مثال: عرض الصيف — ريتارغتنج" value="${esc(src ? src.name : '')}"></div>
        <div class="label" style="margin-bottom:8px">هدف الحملة</div>
        <div class="chips" id="cObj" style="margin-bottom:16px">${Object.entries(OBJ).map(([k, ic]) => `<button class="chip ${k === st.objective ? 'on' : ''}" data-obj="${k}">${icon(ic, 'icon-sm')}${k}</button>`).join('')}</div>
        <div class="f-row">
          <div class="field"><label>المنصة</label><select class="select" id="cPlat"><option value="ig">إنستغرام</option><option value="fb">فيسبوك</option></select></div>
          <div class="field"><label>الجمهور</label><input class="input" id="cAud" value="${esc(D.brand.audience.split('،')[0])}"></div>
        </div>
        <div class="f-row">
          <div class="field"><label>الميزانية الكلية (₪)</label><input class="input" type="number" id="cBudget" value="300" min="20"></div>
          <div class="field"><label>المدة (أيام)</label><input class="input" type="number" id="cDays" value="7" min="1"></div>
        </div>
        ${src ? `<div class="field"><label>نص الإعلان</label><textarea class="textarea" id="cText">${esc(src.caption)}</textarea></div>` : ''}
        <div class="brand-note" id="cEst">${icon('i-spark', 'icon-sm')}<span></span></div>`,
      foot:`<button class="btn btn-ghost" data-close>إلغاء</button><button class="btn btn-gold" id="cSave">${icon('i-check', 'icon-sm')}حفظ الحملة</button>`,
      onMount:m => {
        const est = () => {
          const b = +m.querySelector('#cBudget').value || 0, d = +m.querySelector('#cDays').value || 1;
          m.querySelector('#cEst span').innerHTML = `<b>التقدير المتوقع:</b> وصول ${num(Math.round(b * 95))}–${num(Math.round(b * 140))} شخص · ${num(Math.round(b / 4.6))} عميل محتمل تقريبًا · ${Math.round(b / d)} ₪ يوميًا`;
        };
        est();
        m.querySelectorAll('#cBudget,#cDays').forEach(i => i.addEventListener('input', est));
        m.querySelectorAll('[data-obj]').forEach(b => b.onclick = () => { st.objective = b.dataset.obj; m.querySelectorAll('[data-obj]').forEach(x => x.classList.toggle('on', x === b)); });
        m.querySelector('#cSave').onclick = () => {
          const name = m.querySelector('#cName').value.trim();
          if (!name){ App.toast('اكتب اسم الحملة', 'error'); m.querySelector('#cName').focus(); return; }
          const days = +m.querySelector('#cDays').value || 7;
          const s = new Date(); s.setDate(s.getDate() + 1); const e = new Date(s); e.setDate(e.getDate() + days);
          D.campaigns.unshift({ id:Date.now(), name, objective:st.objective, status:'draft', budget:+m.querySelector('#cBudget').value || 0, spent:0, impressions:0, clicks:0, leads:0, platform:m.querySelector('#cPlat').value, start:s.toISOString(), end:e.toISOString() });
          App.closeModal();
          App.toast('أُضيفت الحملة إلى «إعلانات Meta» كمسودة 🎯', 'success');
          if (App.current === 'campaigns') App.rerender();
        };
      }});
  };

  App.register('campaigns', {
    title:'إعلانات Meta', crumb:'الحملات الإعلانية',
    render(){
      if (!D.campaigns.length){
        return `<div class="page-head"><div><h2>إعلانات Meta</h2><p>لما تنشئ أول حملة، الميزانية والنتائج بتظهر هون.</p></div>
          <button class="btn btn-gold" data-c="new">${icon('i-plus', 'icon-sm')}حملة جديدة</button></div>
          <div class="card"><div class="empty" style="padding:70px 20px"><div class="empty-ic">${icon('i-mega')}</div><b>ما في حملات بعد</b><p style="max-width:420px;margin:8px auto 0">الحساب الجديد ما فيه بيانات إعلانية. أنشئ حملة مسودة، أو ولّد إعلان من الاستوديو.</p></div></div>`;
      }
      const all = D.campaigns;
      const spent = all.filter(c => c.status !== 'ended').reduce((a, c) => a + c.spent, 0);
      const imp = all.filter(c => c.status !== 'ended').reduce((a, c) => a + c.impressions, 0);
      const clicks = all.filter(c => c.status !== 'ended').reduce((a, c) => a + c.clicks, 0);
      const leads = all.filter(c => c.status !== 'ended').reduce((a, c) => a + c.leads, 0);
      const ctr = imp ? (clicks / imp * 100).toFixed(1) : '0.0';
      const cpl = leads ? (spent / leads).toFixed(1) : '—';
      const list = all.filter(c => CF.tab === 'all' || c.status === CF.tab);
      const cnt = k => all.filter(c => c.status === k).length;
      const kp = [
        { l:'الإنفاق', v:num(spent), u:'₪', d:'+12%', up:true, ic:'i-coin', c:'ic-gold' },
        { l:'مرات الظهور', v:Charts.fmt(imp), d:'+31%', up:true, ic:'i-eye', c:'ic-blue' },
        { l:'النقرات', v:num(clicks), sub:`CTR ${ctr}%`, d:'+18%', up:true, ic:'i-link', c:'ic-purple' },
        { l:'العملاء المحتملون', v:num(leads), sub:leads ? `${cpl} ₪ للعميل` : '—', d:'-8% تكلفة', up:true, ic:'i-target', c:'ic-green' }
      ];
      return `
      <div class="page-head"><div><h2>إعلانات Meta</h2><p>حملات فيسبوك وإنستغرام: الميزانية، الإنفاق، والنتائج — بمكان واحد.</p></div>
        <div class="row"><button class="btn btn-outline" onclick="location.hash='#/studio'">${icon('i-spark', 'icon-sm')}من الاستوديو</button><button class="btn btn-gold" data-c="new">${icon('i-plus', 'icon-sm')}حملة جديدة</button></div></div>
      <div class="grid g-4">${kp.map(k => `<div class="card kpi"><div class="kpi-top"><span class="kpi-ic ${k.c}">${icon(k.ic)}</span><span class="delta ${k.up ? 'up' : 'down'}">${k.d}</span></div>
        <div class="kpi-label">${k.l}</div><div class="kpi-val">${k.v}${k.u ? `<small>${k.u}</small>` : ''}</div>${k.sub ? `<small class="muted" style="font-weight:700">${k.sub}</small>` : ''}</div>`).join('')}</div>
      <div class="grid g-main mt">
        <div class="card"><div class="card-head"><div><h3>الميزانية مقابل الإنفاق</h3><p>أعلى الحملات في Meta</p></div><div class="legend"><span><i style="background:#1f3b5a"></i>الميزانية</span><span><i style="background:var(--gold-500)"></i>المصروف</span></div></div>
          <div class="card-body"><div class="chart" id="cBars" style="height:250px"></div></div></div>
        <div class="card"><div class="card-head"><div><h3>قمع التحويل</h3><p>من الظهور حتى العميل</p></div></div>
          <div class="card-body"><div class="funnel">
            ${[['مرات الظهور', imp, 100], ['نقرات', clicks, 62], ['رسائل واتساب', Math.round(clicks * .21), 38], ['عملاء محتملون', leads, 22]].map((f, i) => `<div class="fn-step"><span style="color:var(--ink)">${f[0]}</span><div><div class="fn-bar" style="width:${imp ? f[2] : 0}%">${Charts.fmt(f[1])}</div></div><span>${i === 0 ? '100%' : (imp ? ((f[1] / imp) * 100).toFixed(1) + '%' : '0%')}</span></div>`).join('')}
          </div>
          <div class="brand-note" style="margin-top:18px">${icon('i-spark', 'icon-sm')}<span>ربط الإعلانات بواتساب رفع التحويل 2.4× — فعّل «التقاط عميل محتمل» من البوت.</span></div></div></div>
      </div>
      <div class="card mt">
        <div class="card-head" style="padding-bottom:0"><div class="tabs" style="margin:0;border:0">
          ${[['all', 'الكل', all.length], ['active', 'نشطة', cnt('active')], ['paused', 'متوقفة', cnt('paused')], ['draft', 'مسودات', cnt('draft')], ['ended', 'منتهية', cnt('ended')]].map(([k, l, n]) => `<button data-tab="${k}" class="${CF.tab === k ? 'on' : ''}">${l}<span class="count">${n}</span></button>`).join('')}
        </div></div>
        <div class="table-wrap" style="margin-top:10px"><table class="table">
          <thead><tr><th>الحملة</th><th>الحالة</th><th>الهدف</th><th>الإنفاق / الميزانية</th><th>الظهور</th><th>النقرات</th><th>العملاء</th><th>تكلفة العميل</th><th>تشغيل</th><th></th></tr></thead>
          <tbody>${list.map(c => { const p = c.budget ? Math.round(c.spent / c.budget * 100) : 0; return `<tr>
            <td><div class="t-name">${plat(c.platform)}<div>${esc(c.name)}<small>${U.dateShort(c.start)} — ${U.dateShort(c.end)}</small></div></div></td>
            <td>${U.statusPill(c.status)}</td>
            <td><span class="row" style="gap:6px">${icon(OBJ[c.objective], 'icon-sm muted')}${c.objective}</span></td>
            <td><div class="camp-bar"><div class="progress ${p > 90 ? 'red' : ''}"><i style="width:${p}%"></i></div><small>${num(c.spent)} / ${num(c.budget)} ₪</small></div></td>
            <td>${Charts.fmt(c.impressions)}</td><td>${num(c.clicks)}</td><td><b>${num(c.leads)}</b></td>
            <td>${c.leads ? (c.spent / c.leads).toFixed(1) + ' ₪' : '—'}</td>
            <td>${['active', 'paused'].includes(c.status) ? `<button class="switch ${c.status === 'active' ? 'on' : ''}" data-toggle="${c.id}" aria-label="تشغيل/إيقاف"></button>` : c.status === 'draft' ? `<button class="btn btn-navy btn-sm" data-launch="${c.id}">إطلاق</button>` : '—'}</td>
            <td><button class="icon-btn sm" data-del="${c.id}" aria-label="حذف">${icon('i-trash')}</button></td>
          </tr>`; }).join('') || `<tr><td colspan="10"><div class="empty"><b>ما في حملات هون</b></div></td></tr>`}</tbody>
        </table></div>
      </div>`;
    },
    mount(el){
      const bars = el.querySelector('#cBars');
      if (bars){
        const top = D.campaigns.filter(c => c.budget).slice(0, 6);
        Charts.mount(bars, 'bars', { labels:top.map(c => c.name.split('—')[0].trim()), unit:' ₪', height:250,
          series:[{ name:'الميزانية', color:'#1f3b5a', data:top.map(c => c.budget) }, { name:'المصروف', color:'#d59938', data:top.map(c => c.spent) }] });
      }
      on(el, 'click', '[data-c="new"]', () => App.newCampaign());
      on(el, 'click', '[data-tab]', b => { CF.tab = b.dataset.tab; App.rerender(); });
      on(el, 'click', '[data-toggle]', b => {
        const c = D.campaigns.find(x => x.id === +b.dataset.toggle);
        c.status = c.status === 'active' ? 'paused' : 'active';
        b.classList.toggle('on', c.status === 'active');
        b.closest('tr').children[1].innerHTML = U.statusPill(c.status);
        App.toast(c.status === 'active' ? `تم تشغيل «${c.name}» ▶️` : `تم إيقاف «${c.name}» مؤقتًا ⏸️`, 'success');
      });
      on(el, 'click', '[data-launch]', b => { const c = D.campaigns.find(x => x.id === +b.dataset.launch); c.status = 'active'; App.toast(`انطلقت حملة «${c.name}» 🚀 — المراجعة من Meta خلال ساعة`, 'success'); App.rerender(); });
      on(el, 'click', '[data-del]', async b => {
        const c = D.campaigns.find(x => x.id === +b.dataset.del);
        if (await App.confirm('حذف الحملة', `متأكد بدك تحذف «${esc(c.name)}»؟ ما بتقدر ترجعها.`, 'حذف', true)){ D.campaigns.splice(D.campaigns.indexOf(c), 1); App.toast('تم حذف الحملة', 'success'); App.rerender(); }
      });
    }
  });

  /* ================= ANALYTICS ================= */
  const AN = { range:30 };
  App.register('analytics', {
    title:'المؤشرات', crumb:'المؤشرات والتحليلات',
    render(){
      if (D.fresh){
        return `<div class="page-head"><div><h2>المؤشرات</h2><p>بتظهر بعد ما تنشر محتوى وتربط حساباتك.</p></div></div>
          <div class="card"><div class="empty" style="padding:70px 20px"><div class="empty-ic">${icon('i-chart')}</div><b>لسا ما في مؤشرات</b><p style="max-width:440px;margin:8px auto 18px">حسابك الجديد ما فيه وصول أو تفاعل. ولّد محتوى، اربطه بمنصاتك، وارجع لهون بعد أول نشر.</p><a href="#/studio" class="btn btn-gold">${icon('i-spark', 'icon-sm')}روح للاستوديو</a></div></div>`;
      }
      const r = AN.range, f = r / 30;
      const posts = D.content.filter(c => c.status === 'published').sort((a, b) => b.reach - a.reach);
      const hours = ['9ص', '12م', '3م', '6م', '8م', '9م', '10م', '11م'];
      const days = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
      const rnd = App.chartData.rng(42);
      return `
      <div class="page-head"><div><h2>المؤشرات</h2><p>نظرة موحّدة على أداء المحتوى، واتساب، والإعلانات.</p></div>
        <div class="row"><div class="seg" id="anRange">${[7, 30, 90].map(x => `<button data-r="${x}" class="${r === x ? 'on' : ''}">${x} يوم</button>`).join('')}</div>
        <button class="btn btn-outline btn-sm" data-an="export">${icon('i-download', 'icon-sm')}تصدير CSV</button></div></div>
      <div class="grid g-4">${[
        { l:'الوصول', v:Charts.fmt(48200 * f), d:'+18%', ic:'i-eye', c:'ic-blue' },
        { l:'التفاعلات', v:Charts.fmt(6400 * f), d:'+9%', ic:'i-heart', c:'ic-red' },
        { l:'متابعون جدد', v:num(Math.round(642 * f)), d:'+27%', ic:'i-users', c:'ic-purple' },
        { l:'متوسط زمن الرد', v:'1.8', u:'دقيقة', d:'-64%', ic:'i-clock', c:'ic-green' }
      ].map(k => `<div class="card kpi"><div class="kpi-top"><span class="kpi-ic ${k.c}">${icon(k.ic)}</span><span class="delta up">${k.d}</span></div><div class="kpi-label">${k.l}</div><div class="kpi-val">${k.v}${k.u ? `<small>${k.u}</small>` : ''}</div></div>`).join('')}</div>

      <div class="card mt"><div class="card-head"><div><h3>النمو عبر الوقت</h3><p>الوصول، التفاعل، ورسائل واتساب</p></div>
        <div class="legend"><span><i style="background:var(--gold-500)"></i>الوصول</span><span><i style="background:#2b4f78"></i>التفاعل</span><span><i style="background:#25d366"></i>رسائل واتساب</span></div></div>
        <div class="card-body"><div class="chart" id="anArea" style="height:300px"></div></div></div>

      <div class="grid g-3 mt">
        <div class="card"><div class="card-head"><div><h3>${icon('i-spark', 'icon-sm')}رؤى الـ AI</h3><p>ملاحظات من بياناتك</p></div></div>
          <div class="card-body" style="display:grid;gap:12px">
            ${[['i-up', 'ic-green', 'الريلز بتجيب وصول أعلى بـ 3.2× من الصور. زيد الريلز لـ 3 بالأسبوع.'], ['i-clock', 'ic-gold', 'جمهورك أنشط الخميس 8-10 مساءً. جدولنا منشوراتك الجاية بهالوقت.'], ['i-wa', 'ic-blue', '41% من رسائل واتساب بتسأل عن الأسعار — ضيف قائمة الأسعار لمعرفة العلامة.']].map(x => `<div class="row" style="align-items:flex-start;gap:12px"><span class="kpi-ic ${x[1]}" style="width:34px;height:34px;border-radius:10px">${icon(x[0], 'icon-sm')}</span><p style="font-size:13.5px;line-height:1.75">${x[2]}</p></div>`).join('')}
          </div></div>
        <div class="card"><div class="card-head"><div><h3>التفاعل حسب المنصة</h3></div></div><div class="card-body"><div class="donut-wrap" id="anDonut"></div></div></div>
        <div class="card"><div class="card-head"><div><h3>الجمهور حسب المدينة</h3></div></div><div class="card-body"><div class="bars-h">
          ${[['رام الله', 48], ['البيرة', 21], ['نابلس', 12], ['بيت لحم', 9], ['الخليل', 6], ['أخرى', 4]].map(x => `<div class="bar-row"><span>${x[0]}</span><div class="progress"><i style="width:${x[1] * 2}%"></i></div><b>${x[1]}%</b></div>`).join('')}
        </div></div></div>
      </div>

      <div class="grid g-main mt">
        <div class="card"><div class="card-head"><div><h3>أفضل المنشورات أداءً</h3></div></div>
          <div class="table-wrap" style="margin-top:12px"><table class="table"><thead><tr><th>المنشور</th><th>المنصة</th><th>الوصول</th><th>التفاعل</th><th>معدل التفاعل</th><th>النشر</th></tr></thead>
          <tbody>${posts.map(p => { const eng = Math.round(p.reach * (.05 + (p.id % 5) * .012)); return `<tr>
            <td><div class="t-name"><span style="width:40px;height:40px;border-radius:10px;background:${p.grad};display:grid;place-items:center;font-size:20px">${p.emoji}</span><div>${esc(p.title)}<small>${p.format}</small></div></div></td>
            <td>${plat(p.platform)}</td><td><b>${num(p.reach)}</b></td><td>${num(eng)}</td>
            <td><span class="pill ${eng / p.reach > .07 ? 'p-green' : 'p-gold'} no-dot">${(eng / p.reach * 100).toFixed(1)}%</span></td><td class="muted">${U.dateShort(p.at)}</td></tr>`; }).join('')}</tbody></table></div></div>
        <div class="card"><div class="card-head"><div><h3>${icon('i-flame', 'icon-sm')}خريطة أفضل أوقات النشر</h3><p>كل ما غمق اللون، زاد التفاعل</p></div></div>
          <div class="card-body"><div class="heat">
            <span></span>${hours.map(h => `<span class="h">${h}</span>`).join('')}
            ${days.map((d, di) => `<span class="d">${d.replace('ال', '')}</span>` + hours.map((h, hi) => { let v = .12 + rnd() * .45 + (hi >= 3 && hi <= 5 ? .3 : 0) + (di === 5 ? .15 : 0); v = Math.min(1, v); return `<span class="c" style="opacity:${v.toFixed(2)}" title="${d} ${h}: ${Math.round(v * 100)}% تفاعل"></span>`; }).join('')).join('')}
          </div></div></div>
      </div>`;
    },
    mount(el){
      if (!el.querySelector('#anArea')) return;
      const r = AN.range, days = dayLabels(r);
      Charts.mount(el.querySelector('#anArea'), 'area', { height:300,
        labels:days.map(d => `${d.getDate()}/${d.getMonth() + 1}`), tipLabels:days.map(d => `${U.dayName(d.toISOString())} ${U.dateShort(d.toISOString())}`),
        series:[{ name:'الوصول', color:'#d59938', data:series(r, 1300, 700, 26 * 30 / r, r + 1) }, { name:'التفاعل', color:'#2b4f78', data:series(r, 420, 240, 7 * 30 / r, r + 2) }, { name:'رسائل واتساب', color:'#25d366', data:series(r, 120, 90, 3 * 30 / r, r + 3) }] });
      Charts.mount(el.querySelector('#anDonut'), 'donut', { size:150, stroke:20, center:'6.4k', centerLabel:'تفاعل', data:[
        { label:'إنستغرام', value:46, color:'#dd2a7b' }, { label:'فيسبوك', value:26, color:'#1877f2' }, { label:'تيك توك', value:21, color:'#14283e' }, { label:'لينكدإن', value:7, color:'#d59938' }] });
      on(el, 'click', '#anRange button', b => { AN.range = +b.dataset.r; App.rerender(); });
      on(el, 'click', '[data-an="export"]', () => {
        const rows = [['المنشور', 'المنصة', 'الوصول'], ...D.content.filter(c => c.status === 'published').map(c => [c.title, PLAT[c.platform].name, c.reach])];
        const blob = new Blob(['\ufeff' + rows.map(r => r.join(',')).join('\n')], { type:'text/csv;charset=utf-8' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'nasaq-analytics.csv'; a.click();
        App.toast('تم تصدير التقرير ⬇️', 'success');
      });
    }
  });

  /* ================= BRAND ================= */
  const KB_CATS = ['الكل', 'هوية', 'منتجات', 'الجمهور', 'عروض', 'أسئلة شائعة'];
  const BR = { cat:'الكل', logo:null, studying:false };
  const sliders = [['رسمي', 'ودّي', 78], ['جدّي', 'مرح', 62], ['مختصر', 'مفصّل', 40]];

  function brandPreview(){
    const [c1, c2, c3, c4] = D.brand.colors.map(c => c.hex);
    return `<div class="design" style="background:linear-gradient(135deg,${c1},${c4});aspect-ratio:1.15">
      <div class="blob" style="width:220px;height:220px;background:${c2};opacity:.35;top:-80px;left:-60px"></div>
      <div class="blob" style="width:140px;height:140px;background:${c3};opacity:.15;bottom:-40px;right:-30px"></div>
      <span class="d-emoji">${(D.brand.sample && D.brand.sample.emoji) || '☕'}</span>
      <div class="d-top"><span class="d-brand"><span style="color:${c1}">${App.company.initial}</span>${esc(App.company.name)}</span><span class="d-tag" style="background:${c2}">${esc((D.brand.sample && D.brand.sample.tag) || 'جديد')}</span></div>
      <div style="max-width:64%"><div class="d-title" style="color:${c3}">${esc((D.brand.sample && D.brand.sample.title) || 'طعم الخريف وصل 🍂')}</div><div class="d-sub">${esc((D.brand.sample && D.brand.sample.sub) || 'مشروب القرفة والتفاح الدافي')}</div></div>
      <span class="d-cta" style="background:${c3};color:${c1}">${esc((D.brand.sample && D.brand.sample.cta) || 'جرّبه اليوم')}</span>
    </div>`;
  }

  App.register('brand', {
    title:'الهوية ومعرفة العلامة', crumb:'الهوية البصرية',
    render(){
      const kb = D.knowledge.filter(k => BR.cat === 'الكل' || k.cat === BR.cat);
      return `
      <div class="page-head"><div><h2>الهوية ومعرفة العلامة</h2><p>هاي البيانات بتغذّي الـ AI ليكتب ويصمّم محتوى بيشبه نشاطك وجمهورك.</p></div>
        <button class="btn btn-gold" data-br="save">${icon('i-check', 'icon-sm')}حفظ التحديثات</button></div>
      <div class="grid g-main-r">
        <div class="card"><div class="card-head"><div><h3>لوجو الشركة</h3><p>PNG أو JPG حتى 5MB</p></div></div>
          <div class="card-body">
            <label class="logo-box" id="logoBox">${(BR.logo || App.company.logo) ? `<img src="${BR.logo || App.company.logo}" alt="شعار الشركة">` : `<span class="big-logo" style="background:${App.company.grad}">${App.company.initial}</span>`}
              <span class="lb-hint">${icon('i-upload', 'icon-xs')}اضغط أو اسحب لتغيير الشعار</span>
              <input type="file" accept="image/png,image/jpeg" id="logoInput" hidden></label>
            <button class="btn btn-navy btn-block" style="margin-top:14px" data-br="study" ${BR.studying ? 'disabled' : ''}>${icon('i-wand', 'icon-sm')}${BR.studying ? 'جارٍ الدراسة…' : 'ادرس الشعار بالـ AI'}</button>
            <p class="small muted" style="margin-top:10px;line-height:1.7">الـ AI بيقرأ شعارك ويستخرج لوحة الألوان والخطوط والأسلوب البصري، وبتنحفظ تلقائيًا لتنطبق على كل التصاميم والإعلانات.</p>
          </div></div>
        <div class="card"><div class="card-head"><div><h3>لوحة الألوان</h3><p>اضغط على أي لون لتعديله</p></div><span class="pill p-green">${icon('i-check', 'icon-xs')}مستخرجة بالـ AI</span></div>
          <div class="card-body">
            <div class="palette-row" id="palRow">${D.brand.colors.map((c, i) => `<label class="swatch"><div class="col" style="background:${c.hex}"><input type="color" value="${c.hex}" data-col="${i}" aria-label="${c.name}"></div><div class="meta"><b>${c.name}</b>${c.role}<code>${c.hex.toUpperCase()}</code></div></label>`).join('')}</div>
            <div class="grid g-2" style="margin-top:18px;gap:12px">
              <div class="font-card"><span class="aa" style="font-family:Cairo;font-weight:900">أب</span><div><b>${D.brand.fonts.heading}</b><small>خط العناوين</small></div></div>
              <div class="font-card"><span class="aa" style="font-weight:500">أب</span><div><b>${D.brand.fonts.body}</b><small>خط النصوص</small></div></div>
            </div>
            <div style="margin-top:18px"><div class="label" style="margin-bottom:8px">شخصية البراند</div><div class="persona">${D.brand.persona.map(p => `<span>${p}</span>`).join('')}<span style="background:transparent;border:1.5px dashed var(--line);cursor:pointer" data-br="persona">${icon('i-plus', 'icon-xs')}</span></div></div>
          </div></div>
      </div>

      <div class="grid g-2 mt">
        <div class="card"><div class="card-head"><div><h3>نبرة الصوت التسويقية</h3><p>كيف بيحكي براندك مع الناس</p></div></div>
          <div class="card-body">
            ${sliders.map((s, i) => `<div class="slider-row"><span>${s[0]}</span><input type="range" min="0" max="100" value="${s[2]}" data-sl="${i}" style="--p:${s[2]}%" aria-label="${s[0]} - ${s[1]}"><span>${s[1]}</span></div>`).join('')}
            <div class="field" style="margin-top:6px"><label>الجمهور المستهدف</label><textarea class="textarea" style="min-height:70px" id="brAud">${esc(D.brand.audience)}</textarea></div>
            <div class="field" style="margin-bottom:0"><label>المنتجات والخدمات</label><textarea class="textarea" style="min-height:70px" id="brProd">${esc(D.brand.products)}</textarea></div>
          </div></div>
        <div class="card"><div class="card-head"><div><h3>معاينة مباشرة</h3><p>هيك رح تطلع تصاميمك بهويتك</p></div><a href="#/studio" class="link-more">جرّب بالاستوديو ${icon('i-chev-l', 'icon-xs')}</a></div>
          <div class="card-body"><div class="brand-preview" id="brPrev">${brandPreview()}</div></div></div>
      </div>

      <div class="card mt">
        <div class="card-head"><div><h3>${icon('i-book', 'icon-sm')}معرفة العلامة</h3><p>قاعدة معرفة بيعتمد عليها الـ AI بالردود على واتساب وبكتابة المحتوى.</p></div><button class="btn btn-navy btn-sm" data-br="addkb">${icon('i-plus', 'icon-sm')}إضافة وثيقة</button></div>
        <div class="card-body">
          <div class="chips" style="margin-bottom:16px">${KB_CATS.map(c => `<button class="chip ${BR.cat === c ? 'on' : ''}" data-cat="${c}">${c}</button>`).join('')}</div>
          <div class="grid g-2" style="gap:12px">${kb.map(k => `<div class="kb-item">
            <span class="kpi-ic ic-gold" style="width:40px;height:40px">${icon(k.cat === 'منتجات' ? 'i-coin' : k.cat === 'عروض' ? 'i-tag' : k.cat === 'الجمهور' ? 'i-users' : k.cat === 'أسئلة شائعة' ? 'i-help' : 'i-file', 'icon-sm')}</span>
            <div class="body"><b>${esc(k.title)}</b><small>${k.cat} · أُضيفت ${U.rel(k.added)} · ${k.tags.map(t => '#' + t).join(' ')}</small></div>
            <button class="icon-btn sm" data-kbdel="${k.id}" aria-label="حذف">${icon('i-trash')}</button></div>`).join('') || `<div class="empty" style="grid-column:1/-1"><b>ما في وثائق بهاد التصنيف</b></div>`}</div>
        </div>
      </div>`;
    },
    mount(el){
      const input = el.querySelector('#logoInput');
      const box = el.querySelector('#logoBox');
      const loadFile = f => {
        if (!f) return;
        if (!/image\/(png|jpe?g)/.test(f.type)){ App.toast('يُرجى اختيار ملف صورة (PNG/JPG)', 'error'); return; }
        if (f.size > 5 * 1024 * 1024){ App.toast('حجم الصورة يجب أن يكون أقل من 5 ميغابايت', 'error'); return; }
        const r = new FileReader(); r.onload = () => {
          BR.logo = r.result;
          App.company.logo = r.result;
          const co = D.companies.find(c => c.id === App.company.id) || D.companies[0];
          if (co) co.logo = r.result;
          App.setCompany(App.company);
          const u = window.NasaqAuth.current() || {};
          window.NasaqAuth.update({ brand:{ ...(u.brand || {}), logo:r.result, colors:D.brand.colors, audience:D.brand.audience, products:D.brand.products, persona:D.brand.persona } });
          D.persistWorkspace && D.persistWorkspace();
          App.rerender();
          App.toast('تم رفع الشعار — اضغط «ادرس الشعار» لاستخراج الهوية', 'success');
        }; r.readAsDataURL(f);
      };
      input.addEventListener('change', () => loadFile(input.files[0]));
      box.addEventListener('dragover', e => { e.preventDefault(); box.style.borderColor = 'var(--gold-500)'; });
      box.addEventListener('dragleave', () => box.style.borderColor = '');
      box.addEventListener('drop', e => { e.preventDefault(); loadFile(e.dataTransfer.files[0]); });

      el.addEventListener('input', e => {
        if (e.target.dataset.col != null){
          const i = +e.target.dataset.col, c = D.brand.colors[i];
          c.hex = e.target.value;
          const sw = e.target.closest('.swatch'); sw.querySelector('.col').style.background = c.hex; sw.querySelector('code').textContent = c.hex.toUpperCase();
          el.querySelector('#brPrev').innerHTML = brandPreview();
        }
        if (e.target.dataset.sl != null){ e.target.style.setProperty('--p', e.target.value + '%'); sliders[+e.target.dataset.sl][2] = +e.target.value; }
      });
      on(el, 'click', '[data-cat]', b => { BR.cat = b.dataset.cat; App.rerender(); });
      on(el, 'click', '[data-kbdel]', async b => {
        const k = D.knowledge.find(x => x.id === +b.dataset.kbdel);
        if (await App.confirm('حذف الوثيقة', `بدك تحذف «${esc(k.title)}» من معرفة العلامة؟`, 'حذف', true)){ D.knowledge.splice(D.knowledge.indexOf(k), 1); App.rerender(); App.toast('تم حذف الوثيقة', 'success'); }
      });
      on(el, 'click', '[data-br]', b => {
        const a = b.dataset.br;
        if (a === 'save'){
          D.brand.audience = el.querySelector('#brAud').value;
          D.brand.products = el.querySelector('#brProd').value;
          const u = window.NasaqAuth.current() || {};
          window.NasaqAuth.update({ brand:{ ...(u.brand || {}), colors:D.brand.colors, audience:D.brand.audience, products:D.brand.products, persona:D.brand.persona, logo:App.company.logo || '' } });
          D.persistWorkspace && D.persistWorkspace();
          App.toast('تم تحديث بيانات الهوية بنجاح', 'success');
        }
        if (a === 'study'){
          BR.studying = true; b.disabled = true; b.innerHTML = `${icon('i-refresh', 'icon-sm spin')}جارٍ الدراسة…`;
          el.querySelectorAll('.swatch').forEach((s, i) => { s.style.transition = '.4s'; s.style.opacity = .3; setTimeout(() => s.style.opacity = 1, 900 + i * 180); });
          const t = setTimeout(() => { BR.studying = false; b.disabled = false; b.innerHTML = `${icon('i-wand', 'icon-sm')}ادرس الشعار بالـ AI`; App.toast('تمت دراسة الشعار واستخراج هويتك البصرية 🎨', 'ai'); }, 1900);
          App.onLeave(() => { clearTimeout(t); BR.studying = false; });
        }
        if (a === 'persona'){
          App.modal({ title:'إضافة صفة للبراند', body:`<div class="field"><input class="input" id="pIn" placeholder="مثال: عصري"></div>`, foot:`<button class="btn btn-ghost" data-close>إلغاء</button><button class="btn btn-navy" id="pOk">إضافة</button>`,
            onMount:m => m.querySelector('#pOk').onclick = () => { const v = m.querySelector('#pIn').value.trim(); if (v){ D.brand.persona.push(v); App.closeModal(); App.rerender(); } } });
        }
        if (a === 'addkb'){
          App.modal({ title:'إضافة وثيقة لمعرفة العلامة', sub:'كل ما زادت المعلومات، صارت ردود الـ AI أدق.',
            body:`<div class="field"><label>عنوان الوثيقة</label><input class="input" id="kT" placeholder="مثال: سياسة الاسترجاع"></div>
              <div class="field"><label>التصنيف</label><select class="select" id="kC">${KB_CATS.slice(1).map(c => `<option>${c}</option>`).join('')}</select></div>
              <div class="field"><label>المحتوى</label><textarea class="textarea" id="kB" placeholder="اكتب المعلومات اللي بدك الـ AI يعرفها…"></textarea></div>
              <div class="field"><label>وسوم (مفصولة بفواصل)</label><input class="input" id="kG" placeholder="أسعار, توصيل"></div>`,
            foot:`<button class="btn btn-ghost" data-close>إلغاء</button><button class="btn btn-gold" id="kOk">${icon('i-plus', 'icon-sm')}إضافة</button>`,
            onMount:m => m.querySelector('#kOk').onclick = () => {
              const t = m.querySelector('#kT').value.trim(); if (!t){ App.toast('اكتب عنوان الوثيقة', 'error'); return; }
              D.knowledge.unshift({ id:Date.now(), title:t, cat:m.querySelector('#kC').value, tags:m.querySelector('#kG').value.split(/[,،]/).map(s => s.trim()).filter(Boolean), added:new Date().toISOString() });
              App.closeModal(); App.rerender(); App.toast('انضافت الوثيقة — الـ AI صار يعرفها 🧠', 'ai');
            } });
        }
      });
    }
  });

  /* ================= LIBRARY ================= */
  const LT = { image:['صور', 'i-image'], video:['فيديو', 'i-video'], template:['قوالب', 'i-layers'], doc:['مستندات', 'i-file'], audio:['صوت', 'i-music'] };
  const LB = { tab:'all', q:'', sort:'new' };
  const assetCard = a => `<div class="asset" data-asset="${a.id}">
    ${a.ai ? `<span class="ai-badge">${icon('i-spark', 'icon-xs')}AI</span>` : ''}
    <div class="a-th" style="background:${a.grad}">${a.type === 'video' ? `<span class="play">${icon('i-play')}</span>` : icon(LT[a.type][1])}${a.dur ? `<span class="dur">${a.dur}</span>` : ''}
      <div class="a-over"><button data-la="view" aria-label="معاينة">${icon('i-eye', 'icon-sm')}</button><button data-la="dl" aria-label="تحميل">${icon('i-download', 'icon-sm')}</button><button data-la="del" aria-label="حذف">${icon('i-trash', 'icon-sm')}</button></div></div>
    <div class="a-body"><b>${esc(a.name)}</b><small><span>${LT[a.type][0]} · ${a.size} MB</span><span>${U.rel(a.added)}</span></small></div></div>`;

  App.register('library', {
    title:'المكتبة', crumb:'الأصول الإبداعية',
    render(){
      let list = D.assets.filter(a => (LB.tab === 'all' || a.type === LB.tab) && (!LB.q || a.name.includes(LB.q)));
      list = list.slice().sort((a, b) => LB.sort === 'size' ? b.size - a.size : LB.sort === 'name' ? a.name.localeCompare(b.name, 'ar') : new Date(b.added) - new Date(a.added));
      const used = D.assets.reduce((s, a) => s + a.size, 0);
      return `
      <div class="page-head"><div><h2>المكتبة</h2><p>الأصول الإبداعية: صور، فيديوهات، قوالب، ومستندات — كلها بمكان واحد.</p></div>
        <div class="row"><div style="min-width:220px"><div class="row small" style="justify-content:space-between;font-weight:700;margin-bottom:4px"><span>المساحة المستخدمة</span><span class="muted" dir="ltr">${used.toFixed(1)} MB / 5 GB</span></div><div class="progress" style="background:var(--line)"><i style="width:${Math.max(2, used / 5120 * 100)}%"></i></div></div>
        <label class="btn btn-gold">${icon('i-upload', 'icon-sm')}رفع ملفات<input type="file" multiple hidden id="libInput"></label></div></div>
      <label class="dropzone" id="dz"><span class="dz-ic">${icon('i-upload')}</span><div style="text-align:right"><b style="color:var(--ink);display:block">اسحب ملفاتك هون أو اضغط للرفع</b><small>صور، فيديو، PDF، قوالب — حتى 50MB للملف</small></div><input type="file" multiple hidden id="libInput2"></label>
      <div class="row between wrap mt" style="margin-bottom:16px">
        <div class="tabs" style="margin:0;border:0">${[['all', 'الكل', 'i-grid'], ...Object.entries(LT).map(([k, v]) => [k, v[0], v[1]])].map(([k, l, ic]) => `<button data-lt="${k}" class="${LB.tab === k ? 'on' : ''}">${icon(ic, 'icon-sm')}${l}<span class="count">${k === 'all' ? D.assets.length : D.assets.filter(a => a.type === k).length}</span></button>`).join('')}</div>
        <div class="row"><div class="input-icon" style="width:220px">${icon('i-search', 'icon-sm')}<input class="input" id="libQ" placeholder="ابحث بالمكتبة…" value="${esc(LB.q)}" style="padding-block:8px"></div>
          <select class="select" id="libSort" style="width:auto;padding-block:8px"><option value="new" ${LB.sort === 'new' ? 'selected' : ''}>الأحدث</option><option value="name" ${LB.sort === 'name' ? 'selected' : ''}>الاسم</option><option value="size" ${LB.sort === 'size' ? 'selected' : ''}>الحجم</option></select></div>
      </div>
      <div class="lib-grid" id="libGrid">${list.map(assetCard).join('') || `<div class="empty" style="grid-column:1/-1"><div class="empty-ic">${icon('i-folder')}</div><b>ما في ملفات هون</b>ارفع أول ملف أو غيّر الفلتر</div>`}</div>`;
    },
    mount(el){
      const add = files => {
        [...files].forEach(f => {
          const type = f.type.startsWith('image') ? 'image' : f.type.startsWith('video') ? 'video' : f.type.startsWith('audio') ? 'audio' : 'doc';
          const grads = Object.values(D.grads);
          D.assets.unshift({ id:Date.now() + Math.random(), name:f.name, type, size:+(f.size / 1048576).toFixed(1) || .1, grad:grads[Math.floor(Math.random() * grads.length)], ai:false, added:new Date().toISOString() });
        });
        App.toast(`تم رفع ${files.length} ${files.length > 1 ? 'ملفات' : 'ملف'} ✅`, 'success');
        App.rerender();
      };
      ['#libInput', '#libInput2'].forEach(s => el.querySelector(s).addEventListener('change', e => e.target.files.length && add(e.target.files)));
      const dz = el.querySelector('#dz');
      dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('over'); });
      dz.addEventListener('dragleave', () => dz.classList.remove('over'));
      dz.addEventListener('drop', e => { e.preventDefault(); dz.classList.remove('over'); e.dataTransfer.files.length && add(e.dataTransfer.files); });
      on(el, 'click', '[data-lt]', b => { LB.tab = b.dataset.lt; App.rerender(); });
      el.querySelector('#libSort').addEventListener('change', e => { LB.sort = e.target.value; App.rerender(); });
      let qt; el.querySelector('#libQ').addEventListener('input', e => { clearTimeout(qt); qt = setTimeout(() => { LB.q = e.target.value.trim(); const pos = e.target.selectionStart; App.rerender(); const q = document.querySelector('#libQ'); q.focus(); q.setSelectionRange(pos, pos); }, 250); });
      on(el, 'click', '[data-asset]', async (card, e) => {
        const a = D.assets.find(x => String(x.id) === card.dataset.asset);
        const act = e.target.closest('[data-la]')?.dataset.la || 'view';
        if (act === 'dl') return App.toast(`جارٍ تحميل «${a.name}» ⬇️`, 'success');
        if (act === 'del'){ if (await App.confirm('حذف الملف', `بدك تحذف «${esc(a.name)}»؟`, 'حذف', true)){ D.assets.splice(D.assets.indexOf(a), 1); App.rerender(); App.toast('تم حذف الملف', 'success'); } return; }
        App.modal({ title:esc(a.name), sub:`${LT[a.type][0]} · ${a.size} MB · أُضيف ${U.rel(a.added)}`, size:'lg',
          body:`<div style="border-radius:16px;aspect-ratio:16/9;background:${a.grad};display:grid;place-items:center;color:#fff">${a.type === 'video' ? `<span class="play" style="width:70px;height:70px;border-radius:50%;background:rgba(255,255,255,.9);color:var(--navy-800);display:grid;place-items:center">${icon('i-play')}</span>` : icon(LT[a.type][1], '')}</div>
            <div class="row wrap" style="margin-top:14px">${a.ai ? `<span class="pill p-gold">${icon('i-spark', 'icon-xs')}مولّد بالـ AI</span>` : ''}<span class="pill p-gray no-dot">مستخدم في 3 منشورات</span></div>`,
          foot:`<button class="btn btn-outline" id="aCopy">${icon('i-link', 'icon-sm')}نسخ الرابط</button><button class="btn btn-navy" id="aUse">${icon('i-spark', 'icon-sm')}استخدم بالاستوديو</button>`,
          onMount:m => { m.querySelector('#aCopy').onclick = () => U.copy(`https://cdn.nasaq.ps/assets/${a.id}`); m.querySelector('#aUse').onclick = () => { App.closeModal(); location.hash = '#/studio'; }; } });
      });
    }
  });

  /* ================= AUTOMATION ================= */
  const AU = { tab:'bot', sel:1 };
  const NODE_COL = { trigger:'ic-gold', msg:'ic-green', ai:'ic-purple', action:'ic-blue' };
  const FLOW_COL = { green:'ic-green', blue:'ic-blue', gold:'ic-gold', purple:'ic-purple' };

  function builder(f){
    return f.nodes.map((n, i) => `${i ? '<div class="connector"></div>' : ''}
      <div class="node ${n.kind === 'trigger' ? 'trigger' : ''}" style="animation-delay:${i * .08}s">
        <div class="n-head"><span class="n-ic ${NODE_COL[n.kind]}">${icon(n.icon)}</span><div style="flex:1"><div class="n-type">${n.type}</div><b>${esc(n.title)}</b></div>${n.kind !== 'trigger' ? `<button class="icon-btn sm" data-ndel="${i}" aria-label="حذف الخطوة">${icon('i-trash')}</button>` : ''}</div>
        ${n.text ? `<p>${esc(n.text)}</p>` : ''}
        ${n.opts ? `<div class="opts">${n.opts.map(o => `<span>${o}</span>`).join('')}</div>` : ''}
      </div>`).join('') + `<div class="connector"></div><button class="add-node" data-au="addnode" aria-label="إضافة خطوة">${icon('i-plus', 'icon-sm')}</button>`;
  }

  App.register('automation', {
    title:'البوت والأتمتة', crumb:'بوت واتساب والأتمتة',
    render(){
      const f = D.flows.find(x => x.id === AU.sel) || D.flows[0];
      return `
      <div class="page-head"><div><h2>البوت والأتمتة</h2><p>مسارات رد آلي في واتساب، وسير عمل تلقائي بيشتغل عنك 24/7.</p></div>
        <button class="btn btn-gold" data-au="new">${icon('i-plus', 'icon-sm')}${AU.tab === 'bot' ? 'مسار بوت جديد' : 'سير أتمتة جديد'}</button></div>
      <div class="tabs"><button data-aut="bot" class="${AU.tab === 'bot' ? 'on' : ''}">${icon('i-bot', 'icon-sm')}بوت واتساب<span class="count">${D.flows.length}</span></button><button data-aut="wf" class="${AU.tab === 'wf' ? 'on' : ''}">${icon('i-zap', 'icon-sm')}سير الأتمتة<span class="count">${D.workflows.length}</span></button></div>
      ${AU.tab === 'bot' ? `
      <div class="grid g-main-r">
        <div>
          <div class="grid g-2" style="gap:12px;margin-bottom:14px">
            <div class="card kpi" style="padding:14px 16px"><div class="kpi-label" style="margin:0">ردود آلية هالشهر</div><div class="kpi-val" style="font-size:24px">${num(D.flows.reduce((a, x) => a + x.runs, 0))}</div></div>
            <div class="card kpi" style="padding:14px 16px"><div class="kpi-label" style="margin:0">وقت موفّر</div><div class="kpi-val" style="font-size:24px">${D.flows.reduce((a, x) => a + x.runs, 0) ? 46 : 0}<small>ساعة</small></div></div>
          </div>
          <div class="flows">${D.flows.map(x => `<div class="flow ${x.id === f.id ? 'on' : ''}" data-flow="${x.id}">
            <span class="f-ic ${FLOW_COL[x.color]}">${icon(x.icon)}</span>
            <div class="f-body"><b>${esc(x.name)}</b><small>${x.trigger} · ${num(x.runs)} مرة تنفيذ</small></div>
            <button class="switch ${x.on ? 'on' : ''}" data-fon="${x.id}" aria-label="تفعيل المسار"></button></div>`).join('')}</div>
        </div>
        <div class="card" style="overflow:hidden">
          <div class="card-head" style="padding-bottom:16px;border-bottom:1px solid var(--line)"><div><h3>${esc(f.name)}</h3><p>${f.on ? '<span style="color:var(--green);font-weight:700">● مفعّل</span>' : '<span class="muted">● متوقف</span>'} · المحفّز: ${f.trigger}</p></div>
            <div class="row"><button class="btn btn-outline btn-sm" data-au="test">${icon('i-play', 'icon-sm')}تجربة</button><button class="btn btn-navy btn-sm" data-au="savef">${icon('i-check', 'icon-sm')}حفظ</button></div></div>
          <div class="builder" id="builder">${builder(f)}</div>
        </div>
      </div>` : `
      <div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>اسم سير العمل</th><th>المحفّز</th><th></th><th>الإجراء</th><th>الهدف</th><th>التشغيلات</th><th>مفعّل</th></tr></thead>
        <tbody>${D.workflows.map((w, i) => `<tr><td><b>${esc(w.name)}</b></td><td><span class="pill p-gold no-dot">${icon('i-zap', 'icon-xs')}${w.trigger}</span></td><td class="muted">${icon('i-chev-l', 'icon-sm')}</td><td><span class="pill p-blue no-dot">${w.action}</span></td><td class="muted">${w.target}</td><td><b>${num(w.runs)}</b></td><td><button class="switch ${w.on ? 'on' : ''}" data-won="${i}" aria-label="تفعيل"></button></td></tr>`).join('')}</tbody></table></div></div>
      <div class="grid g-3 mt">${[['i-target', 'عميل محتمل جديد', 'أرسل رسالة ترحيب على واتساب فورًا'], ['i-cal', 'منشور تمت جدولته', 'أشعر الفريق على البريد'], ['i-heart', 'تعليق إيجابي', 'رد بشكر تلقائي واقترح عرض']].map(t => `<div class="card card-pad"><span class="kpi-ic ic-gold">${icon(t[0])}</span><b style="display:block;margin-top:12px">${t[1]}</b><p class="small muted">${t[2]}</p><button class="btn btn-outline btn-sm" style="margin-top:12px" data-au="tpl">استخدم القالب</button></div>`).join('')}</div>`}`;
    },
    mount(el){
      const cur = () => D.flows.find(x => x.id === AU.sel) || D.flows[0];
      on(el, 'click', '[data-aut]', b => { AU.tab = b.dataset.aut; App.rerender(); });
      on(el, 'click', '[data-flow]', (b, e) => { if (e.target.closest('.switch')) return; AU.sel = +b.dataset.flow; App.rerender(); });
      on(el, 'click', '[data-fon]', b => { const f = D.flows.find(x => x.id === +b.dataset.fon); f.on = !f.on; b.classList.toggle('on', f.on); App.toast(f.on ? `تم تفعيل «${f.name}»` : `تم إيقاف «${f.name}»`, 'success'); if (f.id === AU.sel) App.rerender(); });
      on(el, 'click', '[data-won]', b => { const w = D.workflows[+b.dataset.won]; w.on = !w.on; b.classList.toggle('on', w.on); App.toast(w.on ? 'السير مفعّل ✅' : 'تم إيقاف السير', 'success'); });
      on(el, 'click', '[data-ndel]', b => { const f = cur(); f.nodes.splice(+b.dataset.ndel, 1); el.querySelector('#builder').innerHTML = builder(f); });
      on(el, 'click', '[data-au]', b => {
        const a = b.dataset.au, f = cur();
        if (a === 'savef') App.toast('تم حفظ المسار ✅', 'success');
        if (a === 'tpl'){ App.toast('تمت إضافة القالب لسير الأتمتة', 'success'); }
        if (a === 'test') App.toast(`جارٍ تجربة «${f.name}» — رح توصلك رسالة تجريبية على واتساب 🧪`, 'info');
        if (a === 'addnode'){
          const kinds = [['msg', 'إرسال رسالة', 'i-msg', 'رسالة نصية مع أزرار اختيار'], ['ai', 'رد ذكي', 'i-spark', 'الـ AI يجاوب من معرفة العلامة'], ['action', 'إضافة وسم', 'i-tag', 'صنّف الزبون تلقائيًا'], ['action', 'إشعار الفريق', 'i-bell', 'نبّه الموظف المسؤول'], ['action', 'تحويل لموظف', 'i-user', 'سلّم المحادثة لإنسان']];
          App.modal({ title:'إضافة خطوة للمسار', body:`<div class="grid g-2" style="gap:10px">${kinds.map((k, i) => `<button class="flow" data-k="${i}" style="text-align:right"><span class="f-ic ${NODE_COL[k[0]]}">${icon(k[2])}</span><div class="f-body"><b>${k[1]}</b><small>${k[3]}</small></div></button>`).join('')}</div>`,
            onMount:m => m.querySelectorAll('[data-k]').forEach(x => x.onclick = () => {
              const k = kinds[+x.dataset.k];
              f.nodes.push({ kind:k[0], type:k[1], title:k[3], icon:k[2], text:k[0] === 'msg' ? 'اكتب نص الرسالة هون…' : null });
              App.closeModal(); el.querySelector('#builder').innerHTML = builder(f);
              el.querySelector('#builder').lastElementChild.scrollIntoView({ behavior:'smooth', block:'center' });
            }) });
        }
        if (a === 'new'){
          const bot = AU.tab === 'bot';
          App.modal({ title:bot ? 'مسار بوت جديد' : 'سير أتمتة جديد',
            body:`<div class="field"><label>${bot ? 'اسم المسار' : 'اسم سير العمل'}</label><input class="input" id="nN" placeholder="${bot ? 'مثال: الترحيب بالعملاء الجدد' : 'مثال: ترحيب فوري بالعملاء الجدد'}"></div>
              <div class="field"><label>${bot ? 'نوع المحفّز' : 'المحفّز'}</label><select class="select" id="nT">${(bot ? ['كلمة مفتاحية', 'رسالة ترحيب', 'عدم الرد', 'التقاط عميل'] : ['عميل محتمل جديد', 'تغيّر حالة المحتوى', 'رسالة سلبية']).map(o => `<option>${o}</option>`).join('')}</select></div>
              ${bot ? '' : `<div class="f-row"><div class="field"><label>الإجراء</label><select class="select" id="nA">${['إرسال رسالة', 'نشر', 'إشعار الفريق', 'إضافة وسم'].map(o => `<option>${o}</option>`).join('')}</select></div><div class="field"><label>الهدف</label><input class="input" id="nG" placeholder="مثال: رقم واتساب أو قناة"></div></div>`}`,
            foot:`<button class="btn btn-ghost" data-close>إلغاء</button><button class="btn btn-gold" id="nOk">إنشاء</button>`,
            onMount:m => m.querySelector('#nOk').onclick = () => {
              const n = m.querySelector('#nN').value.trim(); if (!n){ App.toast('اكتب الاسم أولًا', 'error'); return; }
              const t = m.querySelector('#nT').value;
              if (bot){ const id = Date.now(); D.flows.push({ id, name:n, trigger:t, on:false, runs:0, icon:'i-bot', color:'gold', nodes:[{ kind:'trigger', type:'المحفّز', title:t, icon:'i-zap' }] }); AU.sel = id; }
              else D.workflows.push({ name:n, trigger:t, action:m.querySelector('#nA').value, target:m.querySelector('#nG').value || '—', runs:0, on:true });
              App.closeModal(); App.rerender(); App.toast('تم الإنشاء ✅ — كمّل بناء الخطوات', 'success');
            } });
        }
      });
    }
  });

  /* ================= SETTINGS ================= */
  const SET_TABS = [['account', 'حسابي', 'i-user'], ['company', 'بيانات الشركة', 'i-home'], ['team', 'الفريق', 'i-users'], ['billing', 'الاشتراك والفوترة', 'i-card'], ['integrations', 'التكاملات', 'i-plug'], ['notifications', 'الإشعارات', 'i-bell']];
  const BILL = { annual:false };
  const INTEG = [
    { id:'meta', name:'Meta — فيسبوك وإنستغرام', desc:'نشر تلقائي وإدارة الإعلانات', icon:'i-fb', cls:'plat-fb', on:true },
    { id:'wa', name:'WhatsApp Cloud API', desc:'صندوق الوارد والردود الذكية', icon:'i-wa', cls:'plat-wa', on:true },
    { id:'tt', name:'تيك توك للأعمال', desc:'نشر الريلز والفيديوهات', icon:'i-tt', cls:'plat-tt', on:false },
    { id:'in', name:'لينكدإن', desc:'نشر على صفحة الشركة', icon:'i-in', cls:'plat-in', on:false },
    { id:'gb', name:'Google Business Profile', desc:'الرد على التقييمات ونشر التحديثات', icon:'i-pin', cls:'plat-in', on:false, soon:true }
  ];
  const sec = (t, d, body) => `<div class="set-sec"><div><h4>${t}</h4><p>${d}</p></div><div>${body}</div></div>`;

  function quotaRow(label, used, limit){
    const open = limit === Infinity;
    const width = open ? 8 : (limit ? Math.min(100, used / limit * 100) : 0);
    return `<div class="usage-item"><div class="row"><b>${label}</b><span>${num(used)} / ${open ? '∞' : num(limit)}</span></div><div class="progress"><i style="width:${width}%"></i></div></div>`;
  }

  function setBody(tab){
    const c = App.company;
    const Auth = window.NasaqAuth;
    const account = Auth.current();
    const plan = Auth.plan(account);
    if (tab === 'account') return sec('المعلومات الشخصية', 'اسمك ورقمك كما يظهران للفريق. البريد ما بيتغيّر من هون.', `
        <div class="row" style="gap:16px;margin-bottom:18px"><span class="avatar" style="width:64px;height:64px;font-size:24px">${esc(D.user.name[0] || 'ن')}</span><div><p class="small muted">الصورة بتاخد أول حرف من اسمك</p></div></div>
        <div class="f-row"><div class="field"><label>الاسم</label><input class="input" id="accName" value="${esc(D.user.name)}"></div><div class="field"><label>البريد الإلكتروني</label><input class="input" value="${esc(D.user.email)}" dir="ltr" readonly></div></div>
        <div class="f-row"><div class="field"><label>رقم الجوال</label><input class="input" id="accPhone" value="${esc(D.user.phone || '')}" dir="ltr" placeholder="+970 59 000 0000"></div><div class="field"><label>اللغة</label><select class="select" id="accLang"><option>العربية</option><option>English</option></select></div></div>
        <button class="btn btn-gold btn-sm" data-save="profile">${icon('i-check', 'icon-sm')}حفظ البيانات</button>`) +
      sec('كلمة المرور', 'اكتب الحالية ثم الجديدة. 8 أحرف على الأقل.', `
        <div class="f-row"><div class="field"><label>كلمة المرور الحالية</label><input class="input" id="pwCur" type="password" dir="ltr" autocomplete="current-password" placeholder="••••••••"></div><div class="field"><label>كلمة المرور الجديدة</label><input class="input" id="pwNew" type="password" dir="ltr" autocomplete="new-password" placeholder="8 أحرف على الأقل"></div></div>
        <div class="field"><label>تأكيد كلمة المرور</label><input class="input" id="pwNew2" type="password" dir="ltr" autocomplete="new-password" placeholder="أعد كتابتها"></div>
        <button class="btn btn-navy btn-sm" data-save="password">${icon('i-shield', 'icon-sm')}تغيير كلمة المرور</button>
        <div class="integ" style="margin-top:14px"><span class="kpi-ic ic-navy">${icon('i-shield')}</span><div class="body"><b>التحقق بخطوتين</b><small>قريبًا عبر رمز على واتساب</small></div><span class="pill p-gray no-dot">قريبًا</span></div>`) +
      `<div class="set-sec"><div><h4>منطقة الخطر</h4><p>حذف الحساب يمسح بياناتك من هذا الجهاز. التفاصيل في <a href="../legal/privacy.html#data-deletion" target="_blank" rel="noopener" style="font-weight:800;color:var(--gold-600)">تعليمات حذف البيانات</a>.</p></div>
        <div class="danger-zone"><h4>حذف الحساب نهائيًا</h4><p class="small" style="margin-bottom:12px">بنطلب كلمة المرور قبل الحذف. ما في تراجع.</p><button class="btn btn-danger" data-del-account>${icon('i-trash', 'icon-sm')}حذف الحساب</button></div></div>`;
    if (tab === 'company'){
      const industries = ['مقاهي ومطاعم','تجميل وعناية','عيادات وصحة','متاجر إلكترونية','خدمات مهنية','أزياء وملابس','نشاط تجاري'];
      if (c.industry && !industries.includes(c.industry)) industries.unshift(c.industry);
      const tones = ['ودّية قريبة من الزبون','احترافية رسمية','مرحة وشبابية','فاخرة وراقية','مباشرة بأسلوب بيعي'];
      const waOn = !!(D.integ && D.integ.wa);
      const waBody = !waOn
        ? `<div class="empty" style="padding:24px 8px"><b>واتساب غير مربوط</b><p style="margin:6px 0 12px">اربط الرقم من التكاملات حتى يوصل صندوق الوارد. ما في معرّفات وهمية على الحساب الجديد.</p><a class="btn btn-navy btn-sm" href="#/settings/integrations">${icon('i-link', 'icon-sm')}ربط واتساب</a></div>`
        : (D.demo
          ? `<div class="field"><label>Phone Number ID</label><input class="input" value="123456789012345" dir="ltr" readonly></div>
             <div class="field"><label>رابط الـ Webhook</label><div class="row"><input class="input" id="whUrl" value="https://api.nasaq.ps/webhooks/wa/yasmeen-7f3a" dir="ltr" readonly><button class="btn btn-outline" data-copywh>${icon('i-copy', 'icon-sm')}نسخ</button></div></div>
             <div class="row"><span class="pill p-green">مفاتيح الخادم جاهزة</span><button class="btn btn-ghost btn-sm" data-check>${icon('i-refresh', 'icon-sm')}فحص الاتصال</button></div>`
          : `<div class="brand-note" style="margin:0">${icon('i-check', 'icon-sm')}<span>واتساب مربوط على هذا الحساب. تفاصيل الـ Webhook بتظهر بعد ربط Meta الحقيقي.</span></div>`);
      return sec('إعداد شركتك', 'هاي البيانات بتغذّي الـ AI ليكتب محتوى بيشبه نشاطك.', `
        <div class="f-row"><div class="field"><label>اسم الشركة *</label><input class="input" id="coNameIn" value="${esc(c.name)}"></div><div class="field"><label>مجال النشاط *</label><select class="select" id="coInd">${industries.map(x => `<option ${x === c.industry ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select></div></div>
        <div class="f-row"><div class="field"><label>المدينة</label><input class="input" id="coCity" value="${esc(c.city || '')}"></div><div class="field"><label>نبرة الصوت التسويقية</label><select class="select" id="coTone">${tones.map(x => `<option ${x === c.tone ? 'selected' : ''}>${x}</option>`).join('')}</select></div></div>
        <button class="btn btn-gold btn-sm" data-save="company">${icon('i-check', 'icon-sm')}حفظ بيانات الشركة</button>`) +
      sec('ربط واتساب', waOn ? 'الربط شغّال من التكاملات.' : 'لسا ما في رقم مربوط.', waBody);
    }
    if (tab === 'team'){
      const seats = plan.seats;
      const seatLabel = seats === Infinity ? `${D.team.length} أعضاء · مقاعد غير محدودة في باقة ${plan.name}` : `${D.team.length} من ${seats} ${seats === 1 ? 'مقعد' : 'مقاعد'} بباقة ${plan.name}`;
      return sec('أعضاء الفريق', seatLabel, `
        <div id="members">${D.team.map((m, i) => `<div class="member"><span class="avatar sm" style="background:${m.color};color:#fff">${m.name[0]}</span><div class="body"><b>${esc(m.name)} ${m.you ? '<span class="pill p-gold no-dot">أنت</span>' : ''}</b><small dir="ltr" style="display:block;text-align:right">${m.email}</small></div>
          ${m.you ? `<span class="pill p-gray no-dot">${m.role}</span>` : `<select class="select" style="width:auto;padding-block:6px;font-size:13px">${['محرّرة محتوى', 'خدمة العملاء', 'مدير', 'مشاهد'].map(r => `<option ${r === m.role ? 'selected' : ''}>${r}</option>`).join('')}</select><button class="icon-btn sm" data-rm="${i}" aria-label="إزالة">${icon('i-trash')}</button>`}</div>`).join('')}</div>`) +
      sec('دعوة عضو', 'رح توصله دعوة على البريد.', `<div class="row"><input class="input" id="invEmail" placeholder="name@example.com" dir="ltr"><select class="select" id="invRole" style="width:180px"><option>محرّر محتوى</option><option>خدمة العملاء</option><option>مدير</option><option>مشاهد</option></select><button class="btn btn-navy" data-invite>${icon('i-send', 'icon-sm')}دعوة</button></div>`);
    }
    if (tab === 'billing'){
      const currentId = plan.expired ? 'free' : account.plan;
      const catalog = [
        { id:'free', f:['10 توليدات AI شهريًا','15 منشورًا للجدولة','شركة واحدة','مقعد واحد'] },
        { id:'pro', f:['توليدات وجدولة بدون سقف','حتى 3 شركات','صندوق واتساب غير محدود','5 أعضاء فريق'] },
        { id:'business', f:['شركات وأعضاء بدون سقف','حملات وأتمتة متقدمة','بوت واتساب','مدير حساب'] }
      ];
      const sub = plan.trial ? `تجربة «${plan.name}» — باقي ${plan.daysLeft} يوم. إذا ما ثبّتت الاشتراك بترجع لباقة البداية.` : plan.expired ? 'انتهت التجربة ورجعت لباقة البداية.' : currentId === 'free' ? 'باقة البداية مجانية وما إلها تاريخ تجديد.' : `باقة «${plan.name}» مفعّلة على حسابك بعد دفع مؤكَّد.`;
      const priceOf = id => { const p = Auth.PLANS[id]; return BILL.annual ? p.price.y : p.price.m; };
      const btnFor = id => {
        const current = id === currentId;
        if (current && plan.trial) return `<button class="btn btn-gold btn-block btn-sm" data-plan="${id}">ثبّت الاشتراك</button>`;
        if (current) return `<button class="btn btn-outline btn-block btn-sm" disabled>الخطة الحالية</button>`;
        const upgrade = Auth.PLANS[id].price.m > Auth.PLANS[currentId].price.m;
        return `<button class="btn ${upgrade ? 'btn-gold' : 'btn-outline'} btn-block btn-sm" data-plan="${id}">${upgrade ? 'ترقية' : 'تخفيض'}</button>`;
      };
      const gu = D.genUsage ? D.genUsage() : { used:0, limit:plan.gens };
      const posts = D.content.filter(x => x.status === 'scheduled' || x.status === 'published').length;
      return sec('خطتك الحالية', sub, `
          <div class="row between" style="margin-bottom:18px"><div class="seg" id="billSeg"><button data-bill="m" class="${BILL.annual ? '' : 'on'}">شهري</button><button data-bill="y" class="${BILL.annual ? 'on' : ''}">سنوي <span class="pill p-green no-dot" style="padding:0 6px;font-size:10.5px">وفّر 20%</span></button></div></div>
          <div class="plan-cards">${catalog.map(p => { const price = priceOf(p.id); const current = p.id === currentId; return `<div class="plan-c ${current ? 'current' : ''}">${current ? `<span class="cur-tag">${plan.trial && p.id === 'pro' ? 'تجربتك الحالية' : 'خطتك الحالية'}</span>` : ''}<h5>${Auth.PLANS[p.id].name}</h5><div class="price">${price ? price + ' ₪' : 'مجانًا'}<small>${price ? ' / شهريًا' : ''}</small></div>
            <ul>${p.f.map(x => `<li>${icon('i-check')}${x}</li>`).join('')}</ul>${btnFor(p.id)}</div>`; }).join('')}</div>`) +
        sec('الاستهلاك هذا الشهر', plan.trial ? `التجربة بتخلص بعد ${plan.daysLeft} يوم.` : 'الأرقام من شغلك الفعلي على هذا الحساب.', `<div class="usage-list">${quotaRow('توليدات AI', gu.used, gu.limit)}${quotaRow('منشورات مجدولة أو منشورة', posts, plan.posts)}${quotaRow('أعضاء الفريق', D.team.length, plan.seats)}</div>`) +
        sec('طريقة الدفع', 'لسا ما في بطاقة محفوظة.', `<div class="empty" style="padding:22px 8px"><b>ما في طريقة دفع</b><p>الترقية من هون تجريبية وبتفعّل الخطة فورًا. البطاقة بتنضاف لما نربط بوابة الدفع.</p></div>`) +
        sec('الفواتير', 'بتظهر بعد أول عملية دفع حقيقية.', `<div class="empty" style="padding:22px 8px"><b>ما في فواتير بعد</b></div>`);
    }
    if (tab === 'integrations') return sec('المنصات المرتبطة', 'الربط هون تجريبي على هذا الجهاز، والتحضير لربط Meta الحقيقي.', `<div style="display:grid;gap:12px">${INTEG.map(g => { const linked = !!(D.integ && D.integ[g.id]); return `<div class="integ"><span class="plat lg ${g.cls}">${icon(g.icon)}</span><div class="body"><b>${g.name} ${g.soon ? '<span class="pill p-purple no-dot">قريبًا</span>' : ''}</b><small>${g.desc}</small></div>
        ${g.soon ? '' : linked ? `<span class="pill p-green">مرتبط</span><button class="btn btn-outline btn-sm" data-icheck="${g.id}">فحص الاتصال</button><button class="btn btn-ghost btn-sm" data-integ="${g.id}">فصل</button>` : `<button class="btn btn-navy btn-sm" data-integ="${g.id}">${icon('i-link', 'icon-sm')}ربط</button>`}</div>`; }).join('')}</div>`);
    if (tab === 'notifications'){
      const rows = [['رسالة واتساب جديدة', 1, 1, 1], ['نشر منشور مجدول', 1, 0, 1], ['اقتراحات الـ AI اليومية', 0, 1, 1], ['تجاوز ميزانية حملة', 1, 1, 1], ['تقرير الأداء الأسبوعي', 1, 0, 0]];
      return sec('قنوات الإشعارات', 'اختر كيف ووين توصلك التنبيهات.', `<table class="table"><thead><tr><th>الحدث</th><th>بريد</th><th>واتساب</th><th>إشعار فوري</th></tr></thead><tbody>${rows.map(r => `<tr><td><b>${r[0]}</b></td>${r.slice(1).map(v => `<td><button class="switch ${v ? 'on' : ''}" data-sw></button></td>`).join('')}</tr>`).join('')}</tbody></table>`);
    }
    return '';
  }

  App.register('settings', {
    title:'الإعدادات',
    render(p){
      const tab = SET_TABS.find(t => t[0] === p[0]) ? p[0] : 'account';
      this.crumb = SET_TABS.find(t => t[0] === tab)[1];
      document.getElementById('crumbs').lastElementChild && (document.getElementById('crumbs').lastElementChild.textContent = this.crumb);
      return `<div class="settings">
        <nav class="card set-nav">${SET_TABS.map(t => `<a href="#/settings/${t[0]}" class="${t[0] === tab ? 'on' : ''}">${icon(t[2], 'icon-sm')}${t[1]}</a>`).join('')}</nav>
        <div class="card" id="setBody">${setBody(tab)}</div>
      </div>`;
    },
    mount(el){
      const Auth = window.NasaqAuth;
      on(el, 'click', '[data-sw]', b => b.classList.toggle('on'));
      on(el, 'click', '[data-save]', async b => {
        const kind = b.dataset.save;
        if (kind === 'profile'){
          const name = el.querySelector('#accName').value.trim();
          const phone = el.querySelector('#accPhone').value.trim();
          if (name.length < 2){ App.toast('اكتب اسمك', 'error'); return; }
          Auth.update({ name, phone });
          D.user.name = name; D.user.phone = phone;
          window.NasaqSession && NasaqSession.refresh();
          App.toast('تم حفظ بيانات الحساب', 'success');
          App.rerender();
        }
        if (kind === 'password'){
          const cur = el.querySelector('#pwCur').value, n1 = el.querySelector('#pwNew').value, n2 = el.querySelector('#pwNew2').value;
          if (n1.length < 8){ App.toast('كلمة المرور الجديدة 8 أحرف على الأقل', 'error'); return; }
          if (n1 !== n2){ App.toast('كلمتا المرور غير متطابقتين', 'error'); return; }
          try {
            await Auth.changePassword(cur, n1);
            el.querySelector('#pwCur').value = el.querySelector('#pwNew').value = el.querySelector('#pwNew2').value = '';
            App.toast('تم تغيير كلمة المرور', 'success');
          } catch (err){
            App.toast(err.message === 'MANAGED' ? 'كلمة المرور تُدار من صفحة تسجيل الدخول الآمنة — استخدم «نسيت كلمة المرور» هناك' : 'تعذّر تغيير كلمة المرور', 'error');
          }
        }
        if (kind === 'company'){
          const name = el.querySelector('#coNameIn').value.trim();
          if (name.length < 2){ App.toast('اكتب اسم الشركة', 'error'); return; }
          const industry = el.querySelector('#coInd').value, city = el.querySelector('#coCity').value.trim(), tone = el.querySelector('#coTone').value;
          Auth.update({ company:name, industry, city });
          const co = D.companies.find(x => x.id === App.company.id) || D.companies[0];
          Object.assign(co, { name, initial:name.trim()[0] || 'ن', industry, city, tone });
          App.setCompany(co);
          D.persistWorkspace && D.persistWorkspace();
          App.toast('تم حفظ بيانات الشركة', 'success');
          App.rerender();
        }
      });
      on(el, 'click', '[data-del-account]', () => {
        App.modal({
          title:'حذف الحساب نهائيًا',
          sub:'بنمسح الحساب ومساحة العمل من هذا المتصفح.',
          body:`<p class="muted" style="margin-bottom:12px">اكتب كلمة «حذف» للتأكيد. المحتوى والهوية والمحادثات المحفوظة على الخادم رح تنحذف.</p><div class="field"><label>التأكيد</label><input class="input" id="delPass"></div>`,
          foot:`<button class="btn btn-ghost" data-close>إلغاء</button><button class="btn btn-danger" id="delOk">${icon('i-trash', 'icon-sm')}حذف نهائي</button>`,
          onMount:m => {
            m.querySelector('#delOk').onclick = async () => {
              try {
                if (m.querySelector('#delPass').value.trim() !== 'حذف') throw new Error('BAD_PASSWORD');
                await Auth.deleteAccount();
                location.href = '../landing/index.html';
              } catch (err){
                App.toast(err.message === 'BAD_PASSWORD' ? 'اكتب «حذف» للتأكيد' : 'تعذّر حذف الحساب', 'error');
              }
            };
          }
        });
      });
      on(el, 'click', '[data-copywh]', () => { const w = el.querySelector('#whUrl'); w && U.copy(w.value); });
      on(el, 'click', '[data-check]', b => { b.innerHTML = `${icon('i-refresh', 'icon-sm spin')}جارٍ الفحص…`; setTimeout(() => { b.innerHTML = `${icon('i-refresh', 'icon-sm')}فحص الاتصال`; App.toast('الاتصال التجريبي شغّال على حساب العرض', 'success'); }, 900); });
      on(el, 'click', '[data-bill]', b => { BILL.annual = b.dataset.bill === 'y'; App.rerender(); });
      on(el, 'click', '[data-plan]', b => {
        const planId = b.dataset.plan;
        const target = Auth.PLANS[planId];
        if (!target) return;
        const cur = Auth.plan(Auth.current());
        const currentId = cur.expired ? 'free' : Auth.current().plan;
        if (planId === currentId && !cur.trial) return;
        if (planId === 'free'){
          App.confirm('الانتقال لباقة البداية', 'حدود الباقة المجانية بترجع، ومحتواك بيبقى محفوظ على هذا الجهاز.', 'تأكيد التخفيض').then(ok => {
            if (!ok) return;
            Auth.update({ plan:'free', trialEnds:null });
            window.NasaqSession && NasaqSession.refresh();
            App.toast('رجعت لباقة البداية', 'success');
            App.rerender();
          });
          return;
        }
        const price = BILL.annual ? target.price.y : target.price.m;
        App.modal({
          title:`الاشتراك في ${target.name}`,
          sub:'رح ننقلك لصفحة دفع آمنة، والباقة بتتفعّل بعد تأكيد الدفع.',
          body:`<div class="kpi-val" style="font-size:32px">${price} ₪<small> / شهريًا</small></div><p class="muted" style="margin:8px 0 14px">${BILL.annual ? `يُدفع ${num(price * 12)} ₪ سنويًا.` : `أو ${target.price.y} ₪ شهريًا عند الدفع السنوي.`}</p><div class="brand-note" style="margin:0">${icon('i-card', 'icon-sm')}<span>الدفع بالبطاقة عبر Stripe.</span></div>`,
          foot:`<button class="btn btn-ghost" data-close>إلغاء</button><button class="btn btn-gold" id="payOk">${icon('i-check', 'icon-sm')}تأكيد الاشتراك</button>`,
          onMount:m => m.querySelector('#payOk').onclick = async e => {
            const btn = e.currentTarget; btn.disabled = true; btn.textContent = 'جارٍ فتح صفحة الدفع…';
            try {
              window.NasaqSession && NasaqSession.flush(true);
              const r = await Auth.api('/payment/create_payment_session', 'POST', { plan:planId, cycle:BILL.annual ? 'y' : 'm' });
              location.href = r.url;
            } catch (err){ btn.disabled = false; btn.textContent = 'تأكيد الاشتراك'; App.toast(err.message || 'تعذّر فتح صفحة الدفع', 'error'); }
          }
        });
      });
      on(el, 'click', '[data-integ]', async b => {
        const g = INTEG.find(x => x.id === b.dataset.integ);
        if (!g || g.soon) return;
        if (!D.integ) D.integ = {};
        if (g.id !== 'meta' && g.id !== 'wa'){ App.toast(`ربط ${g.name} قريبًا`, 'info'); return; }
        if (D.integ[g.id]){
          try { const r = await Auth.api('/integrations/' + g.id, 'DELETE'); D.integ = r.integ; App.toast(`تم فصل ${g.name}`, 'info'); App.rerender(); }
          catch (err){ App.toast(err.message || 'تعذّر الفصل', 'error'); }
          return;
        }
        const idLabel = g.id === 'wa' ? 'Phone Number ID' : 'Page ID';
        App.modal({
          title:`ربط ${g.name}`,
          sub:'بيانات الربط تنحفظ على الخادم فقط ولا تظهر في المتصفح.',
          body:`<div class="field"><label>اسم الحساب</label><input class="input" id="igName"></div><div class="field"><label>${idLabel}</label><input class="input" id="igId" dir="ltr"></div><div class="field"><label>Access Token</label><input class="input" id="igTok" type="password" dir="ltr"></div>`,
          foot:`<button class="btn btn-ghost" data-close>إلغاء</button><button class="btn btn-gold" id="igOk">${icon('i-link', 'icon-sm')}ربط</button>`,
          onMount:m => m.querySelector('#igOk').onclick = async () => {
            try {
              const r = await Auth.api('/integrations', 'POST', { provider:g.id, account_name:m.querySelector('#igName').value, external_id:m.querySelector('#igId').value, access_token:m.querySelector('#igTok').value });
              D.integ = r.integ; App.closeModal(); App.toast(`تم ربط ${g.name}`, 'success'); App.rerender();
            } catch (err){ App.toast(err.message || 'تعذّر الربط', 'error'); }
          }
        });
      });
      on(el, 'click', '[data-icheck]', async b => {
        const t = b.textContent; b.disabled = true; b.textContent = 'جارٍ الفحص…';
        try {
          const r = await Auth.api('/integrations/' + b.dataset.icheck + '/check', 'POST', {});
          App.toast(r.ok ? `الاتصال شغّال ✅ ${r.detail}` : `الربط لا يعمل ❌ ${r.detail}`, r.ok ? 'success' : 'error', 7000);
        } catch (err){ App.toast(err.message || 'تعذّر الفحص', 'error'); }
        b.disabled = false; b.textContent = t;
      });
      on(el, 'click', '[data-invite]', () => {
        const seats = Auth.plan(Auth.current()).seats;
        if (seats !== Infinity && D.team.length >= seats){ App.toast('خلصت مقاعد باقتك — رقِّ الخطة من الفوترة', 'error'); return; }
        const e = el.querySelector('#invEmail'), v = e.value.trim();
        if (!/^\S+@\S+\.\S+$/.test(v)){ App.toast('اكتب بريد إلكتروني صحيح', 'error'); e.focus(); return; }
        D.team.push({ name:v.split('@')[0], email:v, role:el.querySelector('#invRole').value, color:'#6b8f71' });
        D.persistWorkspace && D.persistWorkspace();
        App.toast(`انبعتت دعوة إلى ${v} ✉️`, 'success');
        App.rerender();
      });
      on(el, 'click', '[data-rm]', async b => { const m = D.team[+b.dataset.rm]; if (await App.confirm('إزالة عضو', `بدك تشيل ${esc(m.name)} من الفريق؟`, 'إزالة', true)){ D.team.splice(+b.dataset.rm, 1); D.persistWorkspace && D.persistWorkspace(); App.rerender(); } });
    }
  });
})();
