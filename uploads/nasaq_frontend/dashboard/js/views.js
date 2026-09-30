/* Views: overview, studio, calendar, inbox. */
(function(){
  const { U, D } = App;
  const { icon, esc, num, plat, PLAT } = U;

  const rng = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const series = (n, base, vari, trend, seed) => { const r = rng(seed); return Array.from({ length:n }, (_, i) => Math.max(0, Math.round(base + trend * i + (r() - .5) * vari + Math.sin(i / 2.2) * vari * .25))); };
  const dayLabels = n => Array.from({ length:n }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (n - 1 - i)); return d; });
  App.chartData = { series, dayLabels, rng };

  function on(root, ev, sel, fn){ root.addEventListener(ev, e => { const t = e.target.closest(sel); if (t && root.contains(t)) fn(t, e); }); }
  App.on = on;

  function designHTML(o){
    const c = App.company;
    return `<div class="design" style="background:${o.grad}">
      <div class="blob" style="width:200px;height:200px;background:rgba(255,255,255,.1);top:-60px;left:-50px"></div>
      <div class="blob" style="width:130px;height:130px;background:rgba(0,0,0,.12);bottom:-40px;right:-30px"></div>
      <span class="d-emoji">${o.emoji}</span>
      <div class="d-top"><span class="d-brand"><span>${c.initial}</span>${esc(c.name)}</span>${o.tag ? `<span class="d-tag">${o.tag}</span>` : ''}</div>
      <div style="max-width:64%"><div class="d-title">${esc(o.title)}</div>${o.sub ? `<div class="d-sub">${esc(o.sub)}</div>` : ''}</div>
      <span class="d-cta">${esc(o.cta || 'اطلب هلأ')}</span>
    </div>`;
  }
  App.designHTML = designHTML;

  function contentCard(c){
    return `<div class="content-card" data-cid="${c.id}">
      <div class="cc-thumb" style="background:${c.grad}">
        <span class="deco" style="width:120px;height:120px;top:-30px;left:-30px"></span>
        <span style="position:absolute;left:14px;top:50%;transform:translateY(-60%) rotate(-10deg);font-size:54px">${c.emoji}</span>
        ${plat(c.platform)}${U.statusPill(c.status)}
        <div class="cc-t">${esc(c.title)}</div>
      </div>
      <div class="cc-body"><p>${esc(c.caption)}</p><small>${icon('i-clock', 'icon-xs')}${c.at ? `${U.rel(c.at)} · ${U.time(c.at)}` : 'غير مجدول بعد'} · ${c.format}</small></div>
    </div>`;
  }

  /* ---------- Shared modals ---------- */
  App.scheduleModal = function(item, presetDate, after){
    const base = presetDate ? new Date(presetDate) : item.at ? new Date(item.at) : (() => { const x = new Date(); x.setDate(x.getDate() + 1); return x; })();
    const pad = n => String(n).padStart(2, '0');
    const dStr = `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())}`;
    const tStr = item.at && !presetDate ? `${pad(base.getHours())}:${pad(base.getMinutes())}` : '18:30';
    App.modal({
      title:item.status === 'scheduled' ? 'تعديل موعد النشر' : 'جدولة المنشور',
      sub:'اختر الموعد المناسب لنشر هذا البوست.',
      body:`<div class="row" style="gap:14px;padding:12px;border:1px solid var(--line);border-radius:14px;margin-bottom:16px">
          <div style="width:64px;height:64px;border-radius:12px;background:${item.grad};display:grid;place-items:center;font-size:30px;flex-shrink:0">${item.emoji}</div>
          <div style="min-width:0"><b style="display:block">${esc(item.title)}</b><small class="muted">${PLAT[item.platform].name} · ${item.format}</small></div>
        </div>
        <div class="f-row"><div class="field"><label>التاريخ</label><input type="date" class="input" id="sDate" value="${dStr}"></div>
        <div class="field"><label>الوقت</label><input type="time" class="input" id="sTime" value="${tStr}"></div></div>
        <div class="brand-note">${icon('i-spark', 'icon-sm')}<span><b>أفضل وقت لجمهورك:</b> ${U.dayName(base.toISOString())} بين 6:00 و 9:00 مساءً — تفاعل أعلى بـ 32%</span></div>`,
      foot:`<button class="btn btn-ghost" data-close>إلغاء</button><button class="btn btn-gold" id="sOk">${icon('i-cal', 'icon-sm')}تأكيد الجدولة</button>`,
      onMount:m => {
        m.querySelector('#sOk').onclick = () => {
          const dv = m.querySelector('#sDate').value, tv = m.querySelector('#sTime').value;
          if (!dv || !tv){ App.toast('اختر تاريخ ووقت النشر أولًا', 'error'); return; }
          const at = new Date(`${dv}T${tv}`);
          item.at = at.toISOString(); item.status = 'scheduled';
          if (!D.content.includes(item)) D.content.unshift(item);
          App.closeModal();
          App.toast('تمت جدولة النشر بنجاح 📅', 'success');
          after ? after() : App.current === 'calendar' && App.rerender();
        };
      }
    });
  };

  /* ================= OVERVIEW ================= */
  function setupSteps(){
    const u = (window.NasaqAuth && NasaqAuth.current()) || {};
    const co = App.company;
    return [
      { t:'إنشاء الحساب', done:true, href:'#/settings/account' },
      { t:'تحديد الهوية والجمهور', done:!!u.onboarded, href:'#/brand' },
      { t:'رفع الشعار', done:!!(co && co.logo), href:'#/brand' },
      { t:'توليد أول محتوى', done:D.content.length > 0, href:'#/studio' },
      { t:'جدولة أول منشور', done:D.content.some(c => c.status === 'scheduled' || c.status === 'published'), href:'#/calendar' },
      { t:'ربط واتساب للأعمال', done:!!(D.integ && D.integ.wa), href:'#/settings/integrations' }
    ];
  }

  function freshHome(){
    const h = new Date().getHours();
    const greet = h < 12 ? 'صباح الخير' : 'مساء الخير';
    const now = new Date();
    const ck = setupSteps();
    const doneN = ck.filter(c => c.done).length, pct = doneN / ck.length;
    const plan = window.NasaqAuth ? NasaqAuth.plan(NasaqAuth.current()) : { name:'البداية', short:'مجاني' };
    const actions = [
      { href:'#/studio', ic:'i-spark', t:'ولّد أول محتوى', d:'نصوص وتصاميم بلهجتك' },
      { href:'#/brand', ic:'i-palette', t:'هوية العلامة', d:'الشعار والألوان والجمهور' },
      { href:'#/calendar', ic:'i-cal', t:'جدولة النشر', d:'الرزنامة فاضية وجاهزة' },
      { href:'#/settings/integrations', ic:'i-plug', t:'ربط المنصات', d:'واتساب وإنستغرام وفيسبوك' }
    ];
    const zeros = [
      { l:'الوصول', v:'0', ic:'i-eye', c:'ic-blue' },
      { l:'التفاعل', v:'0', ic:'i-heart', c:'ic-red' },
      { l:'محادثات واتساب', v:'0', ic:'i-wa', c:'ic-green' },
      { l:'عملاء محتملون', v:'0', ic:'i-target', c:'ic-gold' }
    ];
    return `
    <div class="hello" data-fresh="1">
      <div><h2>${greet}، ${esc(D.user.name)} 👋</h2><p>${U.dayName(now.toISOString())} ${U.dateShort(now.toISOString())} — مساحة «${esc(App.company.name)}» فاضية وجاهزة. الأرقام بتظهر بعد أول نشر.</p></div>
      <a href="#/studio" class="btn btn-gold">${icon('i-spark', 'icon-sm')}ولّد أول محتوى</a>
    </div>
    <div class="quick-grid">${actions.map(a => `<a class="quick-card" href="${a.href}"><span class="kpi-ic ${a.ic === 'i-spark' ? 'ic-gold' : 'ic-navy'}">${icon(a.ic)}</span><b>${a.t}</b><span>${a.d}</span></a>`).join('')}</div>
    <div class="grid g-4 mt">${zeros.map(k => `<div class="card kpi"><div class="kpi-top"><span class="kpi-ic ${k.c}">${icon(k.ic)}</span></div><div class="kpi-label">${k.l}</div><div class="kpi-val">${k.v}</div></div>`).join('')}</div>
    <div class="grid g-main mt">
      <div class="card">
        <div class="card-head"><div><h3>جهّز حسابك</h3><p>${doneN} من ${ck.length} خطوات</p></div>
          <div class="ring"><svg viewBox="0 0 64 64" width="64" height="64"><circle cx="32" cy="32" r="27" fill="none" stroke="var(--hover)" stroke-width="7"/><circle cx="32" cy="32" r="27" fill="none" stroke="var(--gold-500)" stroke-width="7" stroke-linecap="round" stroke-dasharray="${2 * Math.PI * 27 * pct} 999"/></svg><b>${doneN}/${ck.length}</b></div>
        </div>
        <div class="card-body"><div class="checklist">${ck.map(c => `<a href="${c.href}" class="ck ${c.done ? 'done' : ''}"><span class="ck-dot">${c.done ? icon('i-check', 'icon-xs') : ''}</span><span class="ck-t">${c.t}</span>${c.done ? '' : icon('i-chev-l', 'icon-sm muted')}</a>`).join('')}</div></div>
      </div>
      <div class="card">
        <div class="card-head"><div><h3>خطتك</h3><p>${plan.trial ? `تجربة ${plan.name} · ${plan.daysLeft} يوم متبقّي` : `باقة ${plan.name}`}</p></div></div>
        <div class="card-body">
          <div class="kpi-val" style="font-size:28px">${esc(plan.short || plan.name)}</div>
          <p class="muted" style="margin:8px 0 16px">${plan.trial ? 'بعد انتهاء التجربة بترجع تلقائيًا للباقة المجانية إذا ما ثبّتت الاشتراك.' : 'الباقة المجانية تكفيك للتجربة. الترقية بتفتح التوليد والجدولة بدون سقف.'}</p>
          <a href="#/settings/billing" class="btn btn-navy btn-sm">${icon('i-card', 'icon-sm')}${plan.trial ? 'ثبّت الاشتراك' : 'ترقية الخطة'}</a>
        </div>
      </div>
    </div>
    <div class="card mt"><div class="card-head"><div><h3>${icon('i-cal', 'icon-sm')}المنشورات القادمة</h3></div><a href="#/calendar" class="link-more">التقويم ${icon('i-chev-l', 'icon-xs')}</a></div>
      <div class="card-body"><div class="empty"><b>ما في منشورات بعد</b>أول محتوى بتولّده من الاستوديو بتقدر تجدوله هون</div></div></div>`;
  }

  App.register('overview', {
    title:'لوحة التحكم', crumb:'نظرة عامة',
    render(){
      if (D.fresh && !D.content.length && !D.conversations.length) return freshHome();
      const h = new Date().getHours();
      const greet = h < 12 ? 'صباح الخير' : 'مساء الخير';
      const now = new Date();
      const upcoming = D.content.filter(c => c.status === 'scheduled' && new Date(c.at) >= new Date(now.getTime() - 36e5)).sort((a, b) => new Date(a.at) - new Date(b.at)).slice(0, 5);
      const convs = D.conversations.slice(0, 4);
      const recent = D.content.slice().sort((a, b) => (b.id) - (a.id)).slice(0, 4);
      const ck = [
        { t:'إنشاء الشركة وتعريف النشاط', done:true, href:'#/settings/company' },
        { t:'رفع الشعار ودراسة الهوية بالـ AI', done:true, href:'#/brand' },
        { t:'ربط رقم واتساب للأعمال', done:true, href:'#/settings/integrations' },
        { t:'توليد وجدولة أول منشور', done:true, href:'#/studio' },
        { t:'ربط حساب تيك توك', done:false, href:'#/settings/integrations' },
        { t:'تفعيل الرد الآلي خارج الدوام', done:false, href:'#/automation' }
      ];
      const doneN = ck.filter(c => c.done).length, pct = doneN / ck.length;
      const kpis = [
        { l:'الوصول الكلي', v:'48.2k', d:'+18.4%', up:true, ic:'i-eye', c:'ic-blue', col:'#2563eb', s:series(12, 30, 14, 1.6, 3) },
        { l:'معدل التفاعل', v:'6.4', u:'%', d:'-0.3%', up:false, ic:'i-heart', c:'ic-red', col:'#dc2626', s:series(12, 60, 20, -.4, 7) },
        { l:'محادثات واتساب', v:'128', d:'+24%', up:true, ic:'i-wa', c:'ic-green', col:'#16a34a', s:series(12, 20, 10, 1.4, 11) },
        { l:'عملاء محتملون', v:'180', d:'+12.6%', up:true, ic:'i-target', c:'ic-gold', col:'#d59938', s:series(12, 30, 12, 1.1, 19) }
      ];
      return `
      <div class="hello">
        <div><h2>${greet}، ${esc(D.user.name)} 👋</h2><p>${U.dayName(now.toISOString())} ${U.dateShort(now.toISOString())} — هاي ملخّص أداء «${esc(App.company.name)}» آخر 30 يوم.</p></div>
        <div class="row"><button class="btn btn-outline" data-act="report">${icon('i-download', 'icon-sm')}تقرير الشهر</button><a href="#/studio" class="btn btn-gold">${icon('i-spark', 'icon-sm')}ولّد محتوى الآن</a></div>
      </div>

      <div class="ai-banner" id="aiBanner">
        <svg class="bg-mark"><use href="#nasaq-mark"/></svg>
        <div class="ai-orb">${icon('i-spark')}</div>
        <div class="txt">
          <small>${icon('i-flame', 'icon-xs')} اقتراح اليوم من نسق</small>
          <h3>بداية الخريف 🍂 فرصة ذهبية لإطلاق مشروب موسمي</h3>
          <p>منشورات المشروبات الموسمية جابت تفاعل أعلى بـ 38% عند جمهورك السنة الماضية. جهّزتلك 3 أفكار جاهزة بلهجتك.</p>
        </div>
        <div class="acts"><button class="btn btn-gold" data-act="use-idea">${icon('i-wand', 'icon-sm')}جهّز الأفكار</button><button class="btn btn-glass" data-act="dismiss">لاحقًا</button></div>
      </div>

      <div class="grid g-4">
        ${kpis.map(k => `<div class="card kpi">
          <div class="kpi-top"><span class="kpi-ic ${k.c}">${icon(k.ic)}</span><span class="delta ${k.up ? 'up' : 'down'}">${icon(k.up ? 'i-up' : 'i-down', 'icon-xs')}${k.d}</span></div>
          <div class="kpi-label">${k.l}</div>
          <div class="kpi-val">${k.v}${k.u ? `<small>${k.u}</small>` : ''}</div>
          ${Charts.spark(k.s, k.col)}
        </div>`).join('')}
      </div>

      <div class="grid g-main mt">
        <div class="card">
          <div class="card-head"><div><h3>أداء المحتوى</h3><p>الوصول والتفاعل على كل المنصات</p></div>
            <div class="row"><div class="legend"><span><i style="background:var(--gold-500)"></i>الوصول</span><span><i style="background:#2b4f78"></i>التفاعل</span></div>
            <div class="seg" id="ovRange"><button data-r="7">7 أيام</button><button data-r="30" class="on">30 يوم</button><button data-r="90">90 يوم</button></div></div>
          </div>
          <div class="card-body"><div class="chart" id="ovChart" style="height:270px"></div></div>
        </div>
        <div class="card">
          <div class="card-head"><div><h3>جهّز حسابك</h3><p>خطوات بسيطة لأفضل نتائج</p></div>
            <div class="ring"><svg viewBox="0 0 64 64" width="64" height="64"><circle cx="32" cy="32" r="27" fill="none" stroke="var(--hover)" stroke-width="7"/><circle cx="32" cy="32" r="27" fill="none" stroke="var(--gold-500)" stroke-width="7" stroke-linecap="round" stroke-dasharray="${2 * Math.PI * 27 * pct} 999"/></svg><b>${doneN}/${ck.length}</b></div>
          </div>
          <div class="card-body"><div class="checklist">
            ${ck.map(c => `<a href="${c.href}" class="ck ${c.done ? 'done' : ''}"><span class="ck-dot">${c.done ? icon('i-check', 'icon-xs') : ''}</span><span class="ck-t">${c.t}</span>${c.done ? '' : icon('i-chev-l', 'icon-sm muted')}</a>`).join('')}
          </div></div>
        </div>
      </div>

      <div class="grid g-3 mt">
        <div class="card">
          <div class="card-head"><div><h3>${icon('i-cal', 'icon-sm')}المنشورات القادمة</h3></div><a href="#/calendar" class="link-more">التقويم ${icon('i-chev-l', 'icon-xs')}</a></div>
          <div class="card-body" style="padding-top:10px"><div class="timeline">
            ${upcoming.length ? upcoming.map(c => `<div class="tl-item" data-sched="${c.id}">
              <div class="tl-time"><b>${U.time(c.at).split(' ')[0]}</b><small>${U.rel(c.at)}</small></div>
              ${plat(c.platform)}
              <div class="tl-body"><p>${esc(c.title)}</p><small>${c.format}</small></div>
            </div>`).join('') : `<div class="empty"><b>ما في منشورات مجدولة</b>جدّل أول منشور من الاستوديو</div>`}
          </div></div>
        </div>
        <div class="card">
          <div class="card-head"><div><h3>${icon('i-wa', 'icon-sm')}آخر محادثات واتساب</h3></div><a href="#/inbox" class="link-more">الصندوق ${icon('i-chev-l', 'icon-xs')}</a></div>
          <div class="card-body" style="padding-top:10px">
            ${convs.length ? convs.map(c => { const last = c.messages[c.messages.length - 1]; return `<a href="#/inbox/${c.id}" class="conv-mini">
              <span class="face ${c.online ? 'online' : ''}" style="background:${c.color}">${c.name[0]}</span>
              <div class="cm-body"><b>${esc(c.name)}</b><p>${last.from === 'out' ? 'أنت: ' : ''}${esc(last.text)}</p></div>
              <div class="cm-meta"><span>${U.time(last.at)}</span>${c.unread ? `<span class="unread-n">${c.unread}</span>` : ''}</div>
            </a>`; }).join('') : `<div class="empty"><b>ما في محادثات بعد</b><a href="#/inbox" class="link-more">صندوق واتساب</a></div>`}
          </div>
        </div>
        <div class="card">
          <div class="card-head"><div><h3>توزيع التفاعل</h3><p>حسب المنصة</p></div></div>
          <div class="card-body"><div class="donut-wrap" id="ovDonut"></div>
            <div class="brand-note" style="margin-top:18px">${icon('i-spark', 'icon-sm')}<span>تيك توك بيجيب أعلى تفاعل لكل منشور عندك — جرّب ريلز أكثر.</span></div>
          </div>
        </div>
      </div>

      <div class="card mt">
        <div class="card-head"><div><h3>أحدث المحتوى</h3><p>آخر ما ولّدته أو حفظته في الاستوديو.</p></div><a href="#/studio" class="link-more">كل المحتوى ${icon('i-chev-l', 'icon-xs')}</a></div>
        <div class="card-body"><div class="grid g-4">${recent.length ? recent.map(contentCard).join('') : `<div class="empty" style="grid-column:1/-1"><b>ما في محتوى بعد</b></div>`}</div></div>
      </div>`;
    },
    mount(el){
      if (el.querySelector('[data-fresh]')) return;
      const draw = n => {
        const days = dayLabels(n);
        Charts.mount(el.querySelector('#ovChart'), 'area', {
          labels:days.map(d => `${d.getDate()}/${d.getMonth() + 1}`),
          tipLabels:days.map(d => `${U.dayName(d.toISOString())} ${U.dateShort(d.toISOString())}`),
          series:[
            { name:'الوصول', color:'#d59938', data:series(n, 1200, 700, 28 * (30 / n), n + 4) },
            { name:'التفاعل', color:'#2b4f78', data:series(n, 380, 260, 8 * (30 / n), n + 9) }
          ], height:270
        });
      };
      draw(30);
      on(el, 'click', '#ovRange button', b => { el.querySelectorAll('#ovRange button').forEach(x => x.classList.toggle('on', x === b)); draw(+b.dataset.r); });
      Charts.mount(el.querySelector('#ovDonut'), 'donut', { data:[
        { label:'إنستغرام', value:46, color:'#dd2a7b' }, { label:'فيسبوك', value:26, color:'#1877f2' },
        { label:'تيك توك', value:21, color:'#14283e' }, { label:'لينكدإن', value:7, color:'#d59938' }
      ], center:'6.4k', centerLabel:'تفاعل', size:150, stroke:20 });
      on(el, 'click', '[data-act]', b => {
        const a = b.dataset.act;
        if (a === 'dismiss'){ const x = el.querySelector('#aiBanner'); x.style.transition = '.3s'; x.style.opacity = 0; x.style.transform = 'translateY(-8px)'; setTimeout(() => x.remove(), 300); }
        if (a === 'use-idea'){ App.studioPreset = { product:'مشروب القرفة والتفاح الدافي — إصدار الخريف المحدود', audience:'شباب وطلاب جامعات 18-30', count:3, style:'عصري', tone:'ودّي' }; location.hash = '#/studio'; }
        if (a === 'report'){ App.toast('جارٍ تجهيز تقرير الشهر… سيصلك على البريد خلال دقيقة', 'info'); }
      });
      on(el, 'click', '[data-sched]', t => App.scheduleModal(D.content.find(c => c.id === +t.dataset.sched), null, () => App.rerender()));
      on(el, 'click', '[data-cid]', t => { const c = D.content.find(x => x.id === +t.dataset.cid); c.status === 'published' ? App.toast(`وصل المنشور لـ ${num(c.reach)} شخص 👀`, 'info') : App.scheduleModal(c, null, () => App.rerender()); });
    }
  });

  /* ================= STUDIO ================= */
  const TYPES = [
    { id:'منشور', icon:'i-image', d:'بوست جاهز للفيد' },
    { id:'ستوري', icon:'i-layers', d:'عمودي مع نص' },
    { id:'ريلز', icon:'i-video', d:'سكربت بخطافات' },
    { id:'كاروسيل', icon:'i-grid', d:'شرائح تعليمية' },
    { id:'إعلان', icon:'i-mega', d:'نسخة مع CTA' },
    { id:'فيديو', icon:'i-play', d:'فيديو بالهوية', isNew:true }
  ];
  const STYLES = ['عصري','كلاسيكي','جريء','بسيط','فاخر','مرح'];
  const TONES = ['ودّي','احترافي','عاجل','تثقيفي'];
  const SIZES = [ { id:'1:1', n:'مربع', s:'فيد', w:22, h:22 }, { id:'4:5', n:'عمودي', s:'إنستغرام', w:20, h:25 }, { id:'9:16', n:'ستوري', s:'ريلز/تيك توك', w:15, h:26 }, { id:'16:9', n:'أفقي', s:'يوتيوب', w:28, h:16 } ];
  const IDEAS = ['عرض طلاب الجامعة خصم 20%','كنافة نابلسية سخنة كل صباح','ليلة عود وطرب يوم الخميس','فطور العيلة يوم الجمعة'];
  const ideaList = () => (D.brand && D.brand.ideas && D.brand.ideas.length ? D.brand.ideas : IDEAS);
  const S = { step:1, type:'منشور', platform:'ig', product:'', audience:'', lang:'اللهجة الفلسطينية', count:3, style:'عصري', tone:'ودّي', size:'1:1', outputs:null, busy:false };

  const EMO = [[/قهو|كابتشينو|لاتيه|اسبريسو/, '☕'], [/كناف|حلو/, '🧀'], [/طلاب|جامع/, '🎓'], [/خريف|قرف/, '🍂'], [/عود|موسيق|طرب/, '🎶'], [/فطور|منا?قيش/, '🥙'], [/خصم|عرض|هدي/, '🎁'], [/صيف|مانج|عصير|سموذي/, '🥭']];
  const pickEmoji = p => (EMO.find(([r]) => r.test(p)) || [0, '✨'])[1];
  const GR = Object.values(D.grads);

  function generate(){
    const c = App.company;
    const P = S.product.trim() || ideaList()[0] || 'عرضنا الجديد';
    const short = P.split(/\s+/).slice(0, 4).join(' ').replace(/[—\-–,،].*$/, '').trim();
    const aud = S.audience.trim();
    const city = c.city;
    const tag = '#' + city.replace(/\s+/g, '_');
    const e = pickEmoji(P);
    const fusha = S.lang !== 'اللهجة الفلسطينية';
    const T = fusha ? [
      { title:short, sub:'جودة تستحق التجربة', cta:'اطلب الآن', cap:`✨ ${P} ✨\n\n${aud ? `إلى ${aud}، ` : ''}نقدّم لكم تجربة مميزة بجودة «${c.name}» التي تعرفونها.\n\n📍 ${city}\n💬 للطلب والحجز راسلونا عبر واتساب الآن.` },
      { title:'لفترة محدودة', sub:short, tag:'🔥 عرض', cta:'احجز الآن', cap:`⏳ عرض لفترة محدودة!\n${P}\n\nلا تفوّتوا الفرصة، وشاركوا المنشور مع أصدقائكم 👥` },
      { title:'3 أسباب لتجربته', sub:short, cta:'اعرف المزيد', cap:`💡 لماذا ${short}؟\n1️⃣ مكوّنات طازجة يوميًا\n2️⃣ أسعار مناسبة للجميع\n3️⃣ خدمة سريعة وابتسامة دائمة 😊` }
    ] : [
      { title:short, sub:'بجودة ما بتتنسى', cta:'اطلب هلأ', cap:`✨ ${P} ✨\n\nيا ${aud || 'حبايبنا'}، جبنالكم اشي رح يعجبكم كتير 😍\nبجودة «${c.name}» اللي بتعرفوها.\n\n📍 ${city} | ⏰ من 7 الصبح\n💬 اطلب أو احجز عالواتساب هلأ!` },
      { title:'شو أحلى من هيك؟', sub:short, cta:'جرّب اليوم', cap:`سؤال سريع 👇\nشو أحلى من ${short}؟\n\nولا اشي! 😄 تعالوا جرّبوا بنفسكم وقولولنا رأيكم بالكومنتات.\nوتاغ صاحبك اللي لازم يجي معك 👥` },
      { title:'لفترة محدودة', sub:short, tag:'🔥 عرض', cta:'احجز مكانك', cap:`⏳ لفترة محدودة وبس!\n${P}\n\nالعرض بخلص قريب — لا تفوّتوه 🔥\nشاركوا البوست مع صحابكم اللي لازم يعرفوا.` },
      { title:'من قلب مطبخنا', sub:'ورا الكواليس 🎬', cta:'شوف القصة', cap:`ورا الكواليس 🎬\nكل يوم الصبح فريقنا بيحضّر ${short} بإيدينا وبكل حب 💛\nلأنو إنتو بتستاهلوا الأفضل، وما بنرضى بأقل من هيك.` },
      { title:'3 أسباب تجرّبها', sub:short, cta:'اعرف أكثر', cap:`💡 ليش ${short}؟\n1️⃣ مكوّنات طازجة كل يوم\n2️⃣ سعر بيناسب الكل\n3️⃣ خدمة سريعة وابتسامة من القلب 😊\n\nمستنينكم!` }
    ];
    if (S.tone === 'عاجل') T.unshift(T.splice(fusha ? 1 : 2, 1)[0]);
    if (S.tone === 'تثقيفي') T.unshift(T.pop());
    return Array.from({ length:S.count }, (_, i) => {
      const t = T[i % T.length];
      return { id:Date.now() + i, ...t, emoji:e, grad:GR[(i * 3 + S.style.length) % GR.length], platform:S.platform, format:S.type,
        tags:[tag, '#فلسطين', '#' + c.name.replace(/\s+/g, '_'), '#' + short.split(' ')[0], S.type === 'ريلز' ? '#ريلز' : '#عروض'],
        score:82 + Math.floor(Math.random() * 15) };
    });
  }

  function outCard(o, i){
    return `<div class="card out-card" data-oid="${o.id}" style="animation-delay:${i * .08}s">
      ${designHTML(o)}
      <div class="out-body">
        <div class="out-meta">${plat(o.platform)}<span class="pill p-gold no-dot">${o.format}</span><span class="pill p-gray no-dot">${S.size}</span>
          <span class="score" title="جودة متوقعة حسب أداء منشوراتك السابقة">${icon('i-star', 'icon-xs')}${o.score}%<span class="progress green"><i style="width:${o.score}%"></i></span></span></div>
        <div class="out-caption" data-cap>${o.typed ? esc(o.cap) : ''}</div>
        <div class="hashtags">${o.tags.map(t => `<span>${esc(t)}</span>`).join('')}</div>
        <div class="out-actions">
          <button class="btn btn-navy btn-sm" data-o="schedule">${icon('i-cal', 'icon-sm')}جدولة</button>
          <button class="btn btn-outline btn-sm" data-o="copy">${icon('i-copy', 'icon-sm')}نسخ</button>
          <button class="btn btn-outline btn-sm" data-o="draft">${icon('i-file', 'icon-sm')}حفظ كمسودة</button>
          <button class="btn btn-outline btn-sm" data-o="campaign">${icon('i-mega', 'icon-sm')}حوّل لإعلان</button>
          <button class="btn btn-ghost btn-sm" data-o="regen" title="إعادة التوليد">${icon('i-refresh', 'icon-sm')}</button>
          <button class="btn btn-ghost btn-sm" data-o="download" title="تحميل التصميم">${icon('i-download', 'icon-sm')}</button>
        </div>
      </div>
    </div>`;
  }

  function wizardBody(){
    if (S.step === 1) return `
      <h4>اختر نوع المحتوى</h4><p>حدد القالب المناسب لهدفك التسويقي</p>
      <div class="types">${TYPES.map(t => `<button class="type ${S.type === t.id ? 'on' : ''}" data-type="${t.id}">${t.isNew ? '<span class="new">جديد</span>' : ''}<span class="t-ic">${icon(t.icon)}</span><b>${t.id}</b><small>${t.d}</small></button>`).join('')}</div>
      <div class="label" style="margin-bottom:8px">المنصة</div>
      <div class="chips">${Object.entries(PLAT).map(([k, p]) => `<button class="chip ${S.platform === k ? 'on' : ''}" data-plat="${k}">${icon(p.icon, 'icon-sm')}${p.name}</button>`).join('')}</div>`;
    if (S.step === 2) return `
      <h4>بماذا تروّج في هذا المحتوى؟</h4><p>كل ما وضّحت أكثر، كان المحتوى أدق.</p>
      <div class="field"><textarea class="textarea" id="wProduct" placeholder="مثال: عرض خصم 30% على الكنافة حتى نهاية الأسبوع">${esc(S.product)}</textarea>
        <div class="chips" style="gap:6px">${ideaList().map(x => `<button class="chip" style="padding:4px 10px;font-size:12px" data-idea="${esc(x)}">${icon('i-plus', 'icon-xs')}${esc(x)}</button>`).join('')}</div></div>
      <div class="field"><label>الجمهور المستهدف</label><div class="input-icon">${icon('i-users', 'icon-sm')}<input class="input" id="wAud" placeholder="مثال: شباب 18-30 في رام الله" value="${esc(S.audience)}"></div></div>
      <div class="f-row">
        <div class="field"><label>لغة المحتوى</label><select class="select" id="wLang">${['اللهجة الفلسطينية','عربية فصحى مبسّطة'].map(l => `<option ${S.lang === l ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        <div class="field"><label>عدد النسخ</label><div class="counter"><button data-cnt="-1" aria-label="أقل">−</button><span id="wCount">${S.count}</span><button data-cnt="1" aria-label="أكثر">+</button></div></div>
      </div>`;
    return `
      <h4>اختر الأسلوب والمقاس</h4><p>والـ AI بيكتب ويصمّم حسب هويتك.</p>
      <div class="label" style="margin-bottom:8px">أسلوب التصميم</div>
      <div class="chips" style="margin-bottom:16px">${STYLES.map(s => `<button class="chip ${S.style === s ? 'on' : ''}" data-style="${s}">${s}</button>`).join('')}</div>
      <div class="label" style="margin-bottom:8px">نبرة المحتوى</div>
      <div class="chips" style="margin-bottom:16px">${TONES.map(s => `<button class="chip ${S.tone === s ? 'on' : ''}" data-tone="${s}">${s}</button>`).join('')}</div>
      <div class="label" style="margin-bottom:8px">المقاس</div>
      <div class="sizes" style="margin-bottom:14px">${SIZES.map(z => `<button class="size ${S.size === z.id ? 'on' : ''}" data-size="${z.id}"><i style="width:${z.w}px;height:${z.h}px"></i>${z.n} ${z.id}<small>${z.s}</small></button>`).join('')}</div>
      <div class="brand-note"><span class="sw">${D.brand.colors.slice(0, 4).map(c => `<i style="background:${c.hex}"></i>`).join('')}</span><span>بنستخدم شعار وألوان «${esc(App.company.name)}» تلقائيًا من قسم <a href="#/brand" style="font-weight:800;text-decoration:underline">الهوية</a>.</span></div>`;
  }

  function stepsBar(){
    return ['النوع', 'المحتوى', 'الأسلوب'].map((s, i) => `<div class="step ${S.step === i + 1 ? 'on' : ''} ${S.step > i + 1 ? 'done' : ''}" data-step="${i + 1}"><span class="n">${S.step > i + 1 ? icon('i-check', 'icon-xs') : i + 1}</span>${s}</div>`).join('');
  }

  function outputsHTML(){
    if (S.busy) return `<div class="gen-status"><span class="dots"><i></i><i></i><i></i></span><span id="genTxt">الـ AI بيحلّل هويتك وجمهورك…</span></div>
      <div class="outputs">${Array.from({ length:S.count }, () => `<div class="card skel-out"><div class="skel s-img" style="border-radius:0"></div><div style="padding:20px;display:grid;gap:10px;align-content:start"><div class="skel" style="height:14px;width:40%"></div><div class="skel" style="height:12px"></div><div class="skel" style="height:12px;width:90%"></div><div class="skel" style="height:12px;width:70%"></div><div class="skel" style="height:30px;width:60%;margin-top:20px"></div></div></div>`).join('')}</div>`;
    if (!S.outputs) return `<div class="card"><div class="empty" style="padding:70px 20px">
      <div class="empty-ic">${icon('i-spark')}</div><b>ابدأ بأول حزمة محتوى</b>
      <p style="max-width:380px;margin:0 auto 18px">اختر النوع والمنصة والأسلوب، ودَع الـ AI يكتب لك المنشورات ويصمّمها وفق هوية براندك — باللهجة الفلسطينية.</p>
      <div class="row" style="justify-content:center;gap:24px;font-size:13px;font-weight:700">
        <span class="row" style="gap:6px">${icon('i-check', 'icon-sm')}نصوص بلهجتك</span><span class="row" style="gap:6px">${icon('i-check', 'icon-sm')}تصاميم بهويتك</span><span class="row" style="gap:6px">${icon('i-check', 'icon-sm')}هاشتاغات ذكية</span>
      </div></div></div>`;
    return `<div class="out-head"><h3>${icon('i-spark', 'icon-sm')} أنشأ لك الـ AI ${S.outputs.length} تصاميم جاهزة للنشر</h3>
      <div class="row"><button class="btn btn-outline btn-sm" data-o="copyall">${icon('i-copy', 'icon-sm')}نسخ الكل</button><button class="btn btn-ghost btn-sm" data-o="regenall">${icon('i-refresh', 'icon-sm')}ولّد من جديد</button></div></div>
      <div class="outputs">${S.outputs.map(outCard).join('')}</div>`;
  }

  App.register('studio', {
    title:'استوديو المحتوى', crumb:'استوديو المحتوى والتصاميم',
    render(){
      if (App.studioPreset){ Object.assign(S, App.studioPreset); S.step = 3; App.studioPreset = null; S._auto = true; }
      return `
      <div class="page-head"><div><h2>استوديو المحتوى والتصاميم</h2><p>معالج احترافي بثلاث خطوات — والنصوص والتصاميم جاهزة باللهجة الفلسطينية.</p></div>
        <div class="row"><span class="pill p-gold no-dot" id="genPill">${icon('i-spark', 'icon-xs')} ${(() => { const u = D.genUsage ? D.genUsage() : null; return !u || u.limit === Infinity ? 'توليدات غير محدودة' : u.left + ' توليد متبقّي هذا الشهر'; })()}</span></div></div>
      <div class="studio">
        <div class="card wizard">
          <div class="steps" id="wSteps">${stepsBar()}</div>
          <div class="wz-body" id="wBody">${wizardBody()}</div>
          <div class="wz-foot">
            <button class="btn btn-ghost" id="wBack" ${S.step === 1 ? 'style="visibility:hidden"' : ''}>${icon('i-chev-r', 'icon-sm')}رجوع</button>
            <button class="btn ${S.step === 3 ? 'btn-gold' : 'btn-navy'}" id="wNext">${S.step === 3 ? `${icon('i-spark', 'icon-sm')}إنشاء المحتوى` : `التالي${icon('i-chev-l', 'icon-sm')}`}</button>
          </div>
        </div>
        <div id="outArea">${outputsHTML()}</div>
      </div>`;
    },
    mount(el){
      const refreshWizard = () => {
        el.querySelector('#wSteps').innerHTML = stepsBar();
        el.querySelector('#wBody').innerHTML = wizardBody();
        const back = el.querySelector('#wBack'), next = el.querySelector('#wNext');
        back.style.visibility = S.step === 1 ? 'hidden' : 'visible';
        next.className = `btn ${S.step === 3 ? 'btn-gold' : 'btn-navy'}`;
        next.innerHTML = S.step === 3 ? `${icon('i-spark', 'icon-sm')}إنشاء المحتوى` : `التالي${icon('i-chev-l', 'icon-sm')}`;
        next.disabled = S.busy;
      };
      const saveStep2 = () => {
        const p = el.querySelector('#wProduct'); if (p) S.product = p.value;
        const a = el.querySelector('#wAud'); if (a) S.audience = a.value;
        const l = el.querySelector('#wLang'); if (l) S.lang = l.value;
      };
      const typeAll = () => {
        el.querySelectorAll('[data-oid]').forEach((card, i) => {
          const o = S.outputs.find(x => x.id === +card.dataset.oid);
          if (o.typed) return;
          const cap = card.querySelector('[data-cap]');
          setTimeout(() => { const stop = U.typeInto(cap, o.cap, 12, () => o.typed = true); App.onLeave(stop); }, i * 250);
        });
      };
      const run = () => {
        saveStep2();
        const usage = D.genUsage && D.genUsage();
        if (usage && usage.limit !== Infinity && usage.left < S.count){
          if (!usage.left){ App.toast('خلصت توليدات الباقة المجانية لهذا الشهر — رقِّ خطتك من الفوترة', 'error'); return; }
          S.count = usage.left;
          App.toast(`رح نولّد ${S.count} بس، لأن هاد المتبقي من باقتك`, 'info');
        }
        S.busy = true; S.outputs = null;
        el.querySelector('#outArea').innerHTML = outputsHTML();
        refreshWizard();
        const msgs = ['الـ AI بيحلّل هويتك وجمهورك…', 'بيكتب النصوص بلهجتك…', 'بيصمّم بألوان براندك…'];
        let k = 0;
        const iv = setInterval(() => { k++; const t = el.querySelector('#genTxt'); if (t && msgs[k]) t.textContent = msgs[k]; }, 700);
        const to = setTimeout(() => {
          clearInterval(iv);
          S.busy = false; S.outputs = generate();
          if (D.spendGens) D.spendGens(S.outputs.length);
          const pill = el.querySelector('#genPill');
          if (pill && D.genUsage){ const u = D.genUsage(); pill.innerHTML = `${icon('i-spark', 'icon-xs')} ${u.limit === Infinity ? 'توليدات غير محدودة' : u.left + ' توليد متبقّي هذا الشهر'}`; }
          el.querySelector('#outArea').innerHTML = outputsHTML();
          refreshWizard(); typeAll();
          App.toast(`أنشأ لك الـ AI ${S.outputs.length} تصاميم جاهزة للنشر ✨`, 'ai');
          if (innerWidth < 1200) el.querySelector('#outArea').scrollIntoView({ behavior:'smooth', block:'start' });
        }, 2200);
        App.onLeave(() => { clearInterval(iv); clearTimeout(to); S.busy = false; });
      };
      if (S.outputs) typeAll();
      if (S._auto){ S._auto = false; setTimeout(run, 350); }

      on(el, 'click', '[data-step]', b => { saveStep2(); S.step = +b.dataset.step; refreshWizard(); });
      on(el, 'click', '#wBack', () => { saveStep2(); S.step = Math.max(1, S.step - 1); refreshWizard(); });
      on(el, 'click', '#wNext', () => {
        saveStep2();
        if (S.step === 2 && !S.product.trim()){ App.toast('اكتب بماذا تروّج أولًا ✍️', 'error'); el.querySelector('#wProduct').focus(); return; }
        if (S.step < 3){ S.step++; refreshWizard(); } else run();
      });
      on(el, 'click', '[data-type]', b => { S.type = b.dataset.type; refreshWizard(); });
      on(el, 'click', '[data-plat]', b => { S.platform = b.dataset.plat; refreshWizard(); });
      on(el, 'click', '[data-style]', b => { S.style = b.dataset.style; refreshWizard(); });
      on(el, 'click', '[data-tone]', b => { S.tone = b.dataset.tone; refreshWizard(); });
      on(el, 'click', '[data-size]', b => { S.size = b.dataset.size; refreshWizard(); });
      on(el, 'click', '[data-idea]', b => { const t = el.querySelector('#wProduct'); t.value = b.dataset.idea; S.product = t.value; t.focus(); });
      on(el, 'click', '[data-cnt]', b => { saveStep2(); S.count = Math.max(1, Math.min(5, S.count + +b.dataset.cnt)); el.querySelector('#wCount').textContent = S.count; });

      on(el, 'click', '[data-o]', b => {
        const act = b.dataset.o;
        if (act === 'regenall'){ run(); return; }
        if (act === 'copyall'){ U.copy(S.outputs.map(o => o.cap + '\n' + o.tags.join(' ')).join('\n\n———\n\n')); return; }
        const card = b.closest('[data-oid]'), o = S.outputs.find(x => x.id === +card.dataset.oid);
        const asContent = () => ({ id:o.id, title:o.title, caption:o.cap, platform:o.platform, format:o.format, status:'draft', at:null, grad:o.grad, emoji:o.emoji, reach:0 });
        if (act === 'copy') U.copy(o.cap + '\n\n' + o.tags.join(' '));
        if (act === 'download') App.toast('تم تحميل التصميم ⬇️', 'success');
        if (act === 'draft'){
          if (!D.content.find(c => c.id === o.id)){ D.content.unshift(asContent()); App.toast('انحفظ كمسودة — تلاقيه بجدولة النشر', 'success'); }
          else App.toast('هاد المحتوى محفوظ من قبل', 'info');
        }
        if (act === 'schedule'){ const ex = D.content.find(c => c.id === o.id) || asContent(); App.scheduleModal(ex, null, () => { b.innerHTML = `${icon('i-check', 'icon-sm')}مجدول`; b.disabled = true; }); }
        if (act === 'campaign'){ App.newCampaign && App.newCampaign({ name:o.title, caption:o.cap }); }
        if (act === 'regen'){
          const fresh = generate()[Math.floor(Math.random() * S.count)] || generate()[0];
          Object.assign(o, fresh, { id:o.id, typed:false, grad:GR[Math.floor(Math.random() * GR.length)], score:82 + Math.floor(Math.random() * 15) });
          card.outerHTML = outCard(o, 0);
          typeAll();
          App.toast('تم إعادة توليد التصميم 🎨', 'ai');
        }
      });
    }
  });

  /* ================= CALENDAR ================= */
  const C = { cursor:new Date(new Date().getFullYear(), new Date().getMonth(), 1), view:'month', filter:'all' };
  const DOW = ['السبت','الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة'];

  function calMonth(){
    const y = C.cursor.getFullYear(), m = C.cursor.getMonth();
    const first = new Date(y, m, 1);
    const off = (first.getDay() + 1) % 7;
    const start = new Date(y, m, 1 - off);
    const dim = new Date(y, m + 1, 0).getDate();
    const cells = Math.ceil((off + dim) / 7) * 7;
    const today = new Date();
    const evs = D.content.filter(c => c.at && (C.filter === 'all' || c.platform === C.filter));
    let h = DOW.map(d => `<div class="cal-dow">${d}</div>`).join('');
    for (let i = 0; i < cells; i++){
      const d = new Date(start); d.setDate(start.getDate() + i);
      const list = evs.filter(e => U.sameDay(new Date(e.at), d)).sort((a, b) => new Date(a.at) - new Date(b.at));
      const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
      h += `<div class="cal-day ${d.getMonth() !== m ? 'other' : ''} ${U.sameDay(d, today) ? 'today' : ''}" data-day="${key}">
        <span class="dn">${d.getDate()}</span><button class="add" data-add="${key}" aria-label="إضافة منشور">${icon('i-plus', 'icon-xs')}</button>
        ${list.slice(0, 3).map(e => `<div class="ev ${e.platform} ${e.status === 'published' ? 'published' : ''}" draggable="${e.status !== 'published'}" data-ev="${e.id}" title="${esc(e.title)} — ${U.time(e.at)}">${icon(PLAT[e.platform].icon)}<span>${U.time(e.at).replace(' ', '')} ${esc(e.title)}</span></div>`).join('')}
        ${list.length > 3 ? `<span class="ev-more">+${list.length - 3} أخرى</span>` : ''}
      </div>`;
    }
    return `<div class="cal-grid">${h}</div>`;
  }

  function calList(){
    const items = D.content.filter(c => c.at && (C.filter === 'all' || c.platform === C.filter)).sort((a, b) => new Date(a.at) - new Date(b.at));
    return `<div class="cal-list">${items.map(e => { const d = new Date(e.at); return `<div class="li">
      <div class="li-date"><b>${d.getDate()}</b><small>${U.MONTHS[d.getMonth()]}</small></div>
      ${plat(e.platform, true)}
      <div style="flex:1;min-width:0"><b style="display:block">${esc(e.title)}</b><small class="muted">${U.dayName(e.at)} · ${U.time(e.at)} · ${e.format}</small></div>
      ${U.statusPill(e.status)}
      <button class="icon-btn sm" data-ev="${e.id}" aria-label="تفاصيل">${icon('i-more')}</button>
    </div>`; }).join('')}</div>`;
  }

  App.register('calendar', {
    title:'جدولة النشر',
    render(){
      const drafts = D.content.filter(c => c.status === 'draft');
      const sch = D.content.filter(c => c.status === 'scheduled').length;
      const pub = D.content.filter(c => c.status === 'published').length;
      return `
      <div class="page-head"><div><h2>جدولة النشر</h2><p>نظّم مواعيد نشر منشوراتك بمكان واحد — اسحب المسودة لأي يوم لجدولتها.</p></div>
        <div class="row"><span class="pill p-blue">${sch} مجدول</span><span class="pill p-green">${pub} منشور</span><span class="pill p-gray">${drafts.length} مسودة</span></div></div>
      <div class="cal-layout">
        <div class="card" style="overflow:hidden">
          <div class="cal-toolbar">
            <button class="icon-btn sm" data-nav="-1" aria-label="الشهر السابق">${icon('i-chev-r')}</button>
            <h3>${U.MONTHS[C.cursor.getMonth()]} ${C.cursor.getFullYear()}</h3>
            <button class="icon-btn sm" data-nav="1" aria-label="الشهر التالي">${icon('i-chev-l')}</button>
            <button class="btn btn-outline btn-sm" data-nav="0">اليوم</button>
            <div style="flex:1"></div>
            <select class="select" id="calFilter" style="width:auto;padding-block:7px">
              <option value="all">كل المنصات</option>${Object.entries(PLAT).map(([k, p]) => `<option value="${k}" ${C.filter === k ? 'selected' : ''}>${p.name}</option>`).join('')}
            </select>
            <div class="seg"><button data-view="month" class="${C.view === 'month' ? 'on' : ''}">${icon('i-grid', 'icon-xs')}</button><button data-view="list" class="${C.view === 'list' ? 'on' : ''}">${icon('i-list', 'icon-xs')}</button></div>
          </div>
          <div id="calBody">${C.view === 'month' ? calMonth() : calList()}</div>
        </div>
        <div style="display:grid;gap:20px">
          <div class="card">
            <div class="card-head"><div><h3>مسودات قابلة للجدولة</h3><p>اسحبها للتقويم أو اضغط عليها</p></div></div>
            <div class="card-body"><div class="drafts">
              ${drafts.length ? drafts.map(c => `<div class="draft" draggable="true" data-draft="${c.id}">
                <div class="th" style="background:${c.grad}">${c.emoji}</div>
                <div style="min-width:0"><p>${esc(c.title)}</p><small class="row" style="gap:5px">${icon(PLAT[c.platform].icon, 'icon-xs')}${c.format}</small></div>
              </div>`).join('') : `<div class="empty" style="padding:20px"><b>ما في مسودات</b><a href="#/studio" class="link-more">ولّد محتوى جديد</a></div>`}
            </div>
            <a href="#/studio" class="btn btn-outline btn-block btn-sm" style="margin-top:12px">${icon('i-spark', 'icon-sm')}ولّد مسودات جديدة</a></div>
          </div>
          <div class="card">
            <div class="card-head"><div><h3>${icon('i-flame', 'icon-sm')}أفضل أوقات النشر</h3><p>حسب تفاعل جمهورك</p></div></div>
            <div class="card-body"><div class="best-times">
              ${[['i-ig', 'إنستغرام', 'الخميس 8:00 م', '+41%'], ['i-fb', 'فيسبوك', 'الجمعة 11:00 ص', '+28%'], ['i-tt', 'تيك توك', 'السبت 9:00 م', '+52%'], ['i-in', 'لينكدإن', 'الإثنين 10:00 ص', '+19%']].map(b => `<div class="bt">${icon(b[0], 'icon-sm')}<span><b style="color:var(--ink);font-size:13.5px">${b[1]}</b> · ${b[2]}</span><b>${b[3]}</b></div>`).join('')}
            </div></div>
          </div>
        </div>
      </div>`;
    },
    mount(el){
      const redraw = () => { el.querySelector('#calBody').innerHTML = C.view === 'month' ? calMonth() : calList(); };
      on(el, 'click', '[data-nav]', b => {
        const n = +b.dataset.nav;
        C.cursor = n === 0 ? new Date(new Date().getFullYear(), new Date().getMonth(), 1) : new Date(C.cursor.getFullYear(), C.cursor.getMonth() + n, 1);
        App.rerender();
      });
      on(el, 'click', '[data-view]', b => { C.view = b.dataset.view; App.rerender(); });
      el.querySelector('#calFilter').addEventListener('change', e => { C.filter = e.target.value; redraw(); });

      const evModal = item => {
        App.modal({ title:esc(item.title), sub:`${PLAT[item.platform].name} · ${item.format}`,
          body:`<div style="display:grid;grid-template-columns:200px 1fr;gap:18px" class="ev-modal">
            <div style="border-radius:14px;overflow:hidden">${designHTML({ grad:item.grad, emoji:item.emoji, title:item.title, cta:'اطلب هلأ' })}</div>
            <div><div class="row wrap" style="margin-bottom:10px">${U.statusPill(item.status)}<span class="pill p-gray no-dot">${icon('i-clock', 'icon-xs')}${U.dayName(item.at)} ${U.dateShort(item.at)} · ${U.time(item.at)}</span></div>
            <p style="white-space:pre-line;font-size:14px;line-height:1.9">${esc(item.caption)}</p>
            ${item.status === 'published' ? `<div class="grid g-3" style="gap:10px;margin-top:14px">${[['وصول', num(item.reach)], ['تفاعل', num(Math.round(item.reach * .071))], ['حفظ', num(Math.round(item.reach * .012))]].map(x => `<div style="background:var(--card-2);border-radius:12px;padding:10px;text-align:center"><b style="font-size:18px;display:block">${x[1]}</b><small class="muted">${x[0]}</small></div>`).join('')}</div>` : ''}
            </div></div>`,
          foot:item.status === 'published' ? `<button class="btn btn-outline" data-m="copy">${icon('i-copy', 'icon-sm')}نسخ النص</button><button class="btn btn-navy" data-close>تم</button>` :
            `<button class="btn btn-danger" data-m="unsched">إلغاء الجدولة</button><div style="flex:1"></div><button class="btn btn-outline" data-m="copy">${icon('i-copy', 'icon-sm')}نسخ</button><button class="btn btn-navy" data-m="resched">${icon('i-edit', 'icon-sm')}تعديل الموعد</button>`,
          onMount:m => {
            m.querySelectorAll('[data-m]').forEach(b => b.onclick = () => {
              if (b.dataset.m === 'copy') U.copy(item.caption);
              if (b.dataset.m === 'unsched'){ item.status = 'draft'; item.at = null; App.closeModal(); App.toast('أُلغيت الجدولة ورجع المنشور للمسودات', 'info'); App.rerender(); }
              if (b.dataset.m === 'resched'){ App.closeModal(); App.scheduleModal(item); }
            });
          }});
      };

      on(el, 'click', '[data-ev]', t => evModal(D.content.find(c => c.id === +t.dataset.ev)));
      on(el, 'click', '[data-draft]', t => App.scheduleModal(D.content.find(c => c.id === +t.dataset.draft)));
      on(el, 'click', '[data-add]', (b, e) => {
        e.stopPropagation();
        const [y, mo, d] = b.dataset.add.split('-').map(Number);
        const date = new Date(y, mo - 1, d, 18, 30);
        const drafts = D.content.filter(c => c.status === 'draft');
        if (!drafts.length){ App.toast('ما في مسودات — ولّد محتوى من الاستوديو أولًا', 'info'); return; }
        App.modal({ title:`إضافة منشور — ${U.dayName(date.toISOString())} ${U.dateShort(date.toISOString())}`, sub:'اختر مسودة لجدولتها بهذا اليوم',
          body:`<div class="drafts">${drafts.map(c => `<div class="draft" data-pick="${c.id}" style="cursor:pointer"><div class="th" style="background:${c.grad}">${c.emoji}</div><div><p>${esc(c.title)}</p><small>${PLAT[c.platform].name} · ${c.format}</small></div></div>`).join('')}</div>`,
          onMount:m => m.querySelectorAll('[data-pick]').forEach(x => x.onclick = () => { App.closeModal(); App.scheduleModal(D.content.find(c => c.id === +x.dataset.pick), date); }) });
      });

      let dragId = null, dragDraft = false;
      el.addEventListener('dragstart', e => {
        const t = e.target.closest('[data-ev],[data-draft]'); if (!t) return;
        dragId = +(t.dataset.ev || t.dataset.draft); dragDraft = !!t.dataset.draft;
        t.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', dragId);
      });
      el.addEventListener('dragend', e => { e.target.classList && e.target.classList.remove('dragging'); el.querySelectorAll('.drop').forEach(x => x.classList.remove('drop')); });
      el.addEventListener('dragover', e => { const d = e.target.closest('.cal-day'); if (d && dragId){ e.preventDefault(); el.querySelectorAll('.drop').forEach(x => x !== d && x.classList.remove('drop')); d.classList.add('drop'); } });
      el.addEventListener('drop', e => {
        const d = e.target.closest('.cal-day'); if (!d || !dragId) return;
        e.preventDefault();
        const item = D.content.find(c => c.id === dragId);
        const [y, mo, dd] = d.dataset.day.split('-').map(Number);
        const old = item.at ? new Date(item.at) : null;
        const nd = new Date(y, mo - 1, dd, old ? old.getHours() : 18, old ? old.getMinutes() : 30);
        item.at = nd.toISOString(); item.status = 'scheduled';
        App.toast(dragDraft ? `تمت جدولة «${item.title}» يوم ${U.dayName(item.at)} ${U.time(item.at)} 📅` : `انتقل المنشور إلى ${U.dayName(item.at)} ${U.dateShort(item.at)}`, 'success');
        dragId = null;
        App.rerender();
      });
    }
  });

  /* ================= INBOX ================= */
  const IB = { sel:null, filter:'all', q:'' };
  const AI_REPLIES = [
    [/سعر|أسعار|اسعار|بكم|قديش|ضيافة/, 'أهلين وسهلين 🌟 أسعار الضيافة عنا:\n☕ القهوة المختصة: 12 ₪ للشخص\n🧀 الكنافة: 60 ₪ للصينية (8-10 أشخاص)\nلـ 15 شخص بنقترح باقة «اجتماع» بـ 320 ₪ وبتشمل قهوة وكنافة ومي. بتحب أثبتلك الحجز ليوم الخميس؟'],
    [/حجز|احجز|طاولة/, 'أكيد! 😊 حجزنالك طاولة لـ 6 أشخاص ليلة الخميس الساعة 8 مساءً 🎶 ما في حد أدنى للطلب، بس بننصح توصلوا بدري لأنو الأمسية بتبلش 8:30. بنبعتلك تذكير قبلها بساعتين.'],
    [/توصيل|توصلوا|دليفري/, 'أكيد بنوصّل 🛵 التوصيل متاح لرام الله والبيرة خلال 40 دقيقة تقريبًا، ورسوم التوصيل 10 ₪. شو حابب تطلب؟'],
    [/شكر|يسلمو|تسلم/, 'العفو، هاد واجبنا 💛 نورتونا ومستنينكم دايمًا!']
  ];
  const aiReply = text => (AI_REPLIES.find(([r]) => r.test(text)) || [0, 'أهلين فيك 👋 شكرًا لتواصلك مع ' + App.company.name + '. أكيد بنساعدك — ممكن توضّحلي أكثر شو بتحتاج؟'])[1];
  const QUICK = ['أهلين! كيف بنقدر نساعدك؟ 😊', 'هاي قائمة الأسعار 📋', 'الدوام من 7 الصبح لـ 12 بالليل ⏰', 'موقعنا: رام الله — شارع ركب 📍'];

  function convList(){
    const list = D.conversations.filter(c => (IB.filter === 'all' || c.status === IB.filter) && (!IB.q || c.name.includes(IB.q) || c.messages.some(m => m.text.includes(IB.q))));
    if (!list.length) return `<div class="empty">${icon('i-search')}<b style="margin-top:10px">ما في نتائج</b></div>`;
    return list.map(c => { const last = c.messages[c.messages.length - 1]; return `<button class="ib-conv ${IB.sel === c.id ? 'on' : ''} ${c.unread ? 'unread' : ''}" data-conv="${c.id}">
      <span class="face ${c.online ? 'online' : ''}" style="background:${c.color}">${c.name[0]}</span>
      <div class="c-body"><div class="c-top"><b>${esc(c.name)}</b><time>${U.rel(last.at) === 'اليوم' ? U.time(last.at) : U.rel(last.at)}</time></div>
        <div class="c-top"><p>${last.from === 'out' ? (last.ai ? '🤖 ' : 'أنت: ') : ''}${esc(last.text)}</p>${c.unread ? `<span class="unread-n">${c.unread}</span>` : ''}</div>
        <div class="c-tags">${U.statusPill(c.status)}${c.tags.map(t => `<span class="pill p-gray no-dot">${t}</span>`).join('')}</div></div>
    </button>`; }).join('');
  }

  function msgsHTML(c){
    let lastDay = '', h = '';
    c.messages.forEach(m => {
      const day = U.rel(m.at);
      if (day !== lastDay){ h += `<div class="day-sep">${day}</div>`; lastDay = day; }
      h += `<div class="msg ${m.from} ${m.ai ? 'ai' : ''}">${m.ai ? `<div class="ai-tag">${icon('i-spark', 'icon-xs')}رد ذكي من نسق</div>` : ''}${esc(m.text).replace(/\n/g, '<br>')}<div class="m-meta">${U.time(m.at)}${m.from === 'out' ? ' ✓✓' : ''}</div></div>`;
    });
    return h;
  }

  function chatHTML(c){
    if (!c) return `<div class="ib-empty"><div><div class="empty-ic" style="margin:0 auto 14px;width:70px;height:70px;border-radius:20px;background:var(--gold-50);color:var(--gold-500);display:grid;place-items:center">${icon('i-wa')}</div><b style="color:var(--ink);font-size:17px;display:block">اختر محادثة</b>اختر محادثة من القائمة لعرضها والرد عليها.</div></div>`;
    return `<div class="ib-chat-head">
        <button class="icon-btn sm only-mobile" data-ib="back" aria-label="رجوع">${icon('i-chev-r')}</button>
        <span class="face ${c.online ? 'online' : ''}" style="background:${c.color}">${c.name[0]}</span>
        <div class="who"><b>${esc(c.name)}</b><small>${c.online ? '<span style="color:var(--green)">متصل الآن</span>' : 'آخر ظهور ' + U.rel(c.messages[c.messages.length - 1].at)} · <span style="direction:ltr;display:inline-block">${c.phone}</span></small></div>
        <select class="select" data-ib-status style="width:auto;padding-block:6px;font-size:13px">${[['new', 'جديدة'], ['active', 'نشطة'], ['closed', 'مغلقة']].map(([v, l]) => `<option value="${v}" ${c.status === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
        <button class="btn btn-outline btn-sm" data-ib="summarize">${icon('i-spark', 'icon-sm')}لخّص</button>
      </div>
      <div class="ib-msgs" id="ibMsgs">${msgsHTML(c)}</div>
      <div class="ib-suggest">${QUICK.map(q => `<button data-quick="${esc(q)}">${esc(q)}</button>`).join('')}</div>
      <div class="ib-composer">
        <div class="box">
          <button class="icon-btn sm" aria-label="إرفاق" data-ib="attach">${icon('i-attach')}</button>
          <textarea id="ibText" rows="1" placeholder="اكتب ردك للزبون…"></textarea>
          <button class="icon-btn sm" aria-label="إيموجي" data-ib="emoji">${icon('i-smile')}</button>
        </div>
        <button class="btn ai-reply-btn" data-ib="ai" title="سيقوم الـ AI بصياغة رد مناسب وإرساله">${icon('i-spark', 'icon-sm')}رد ذكي</button>
        <button class="btn btn-wa" data-ib="send" aria-label="إرسال">${icon('i-send', 'icon-sm')}</button>
      </div>`;
  }

  function sideHTML(c){
    if (!c) return '';
    return `<div class="prof"><span class="face" style="background:${c.color}">${c.name[0]}</span><b>${esc(c.name)}</b><small>${c.phone}</small>
        <div class="row" style="justify-content:center;margin-top:10px">${c.tags.map(t => `<span class="pill p-gold no-dot">${t}</span>`).join('')}</div></div>
      <div class="side-sec"><h5>${icon('i-spark', 'icon-xs')} ملخص الـ AI <button class="link-more" data-ib="summarize">تحديث</button></h5><div class="ai-sum" id="ibSum">${esc(c.summary)}</div></div>
      <div class="side-sec"><h5>نيّة الزبون ومزاجه</h5>
        <div class="kv"><div><span>النيّة</span><b>${c.intent}</b></div><div><span>المزاج</span><b>${['😞', '😕', '😐', '🙂', '😍'][c.sentiment - 1]}</b></div></div>
        <div class="sentiment" style="margin-top:8px">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= c.sentiment ? 'on' : ''}" style="${i <= c.sentiment && c.sentiment <= 2 ? 'background:var(--red)' : ''}"></i>`).join('')}</div></div>
      <div class="side-sec"><h5>بيانات الزبون</h5><div class="kv">
        <div><span>عدد الطلبات</span><b>${c.orders}</b></div><div><span>إجمالي الإنفاق</span><b>${c.spent} ₪</b></div><div><span>زبون منذ</span><b>${c.since}</b></div></div></div>
      <div class="side-sec"><h5>إجراءات سريعة</h5><div style="display:grid;gap:8px">
        <button class="btn btn-outline btn-sm btn-block" data-ib="lead">${icon('i-target', 'icon-sm')}حفظ كعميل محتمل</button>
        <button class="btn btn-outline btn-sm btn-block" data-ib="tag">${icon('i-tag', 'icon-sm')}إضافة وسم</button></div></div>`;
  }

  App.register('inbox', {
    title:'صندوق واتساب', crumb:'صندوق وارد واتساب',
    render(p){
      if (!D.conversations.length){
        return `<div class="page-head"><div><h2>صندوق وارد واتساب</h2><p>محادثات عملاء «${esc(App.company.name)}» بتظهر هون بعد ربط الرقم.</p></div></div>
        <div class="card"><div class="empty" style="padding:70px 20px">
          <div class="empty-ic">${icon('i-wa')}</div>
          <b>لسا ما في محادثات</b>
          <p style="max-width:420px;margin:8px auto 18px">اربط رقم واتساب للأعمال حتى توصل رسائل الزبائن لهون، والرد الذكي يشتغل من معرفة علامتك.</p>
          <div class="row" style="justify-content:center">
            <a href="#/settings/integrations" class="btn btn-navy">${icon('i-link', 'icon-sm')}ربط واتساب</a>
            <button class="btn btn-outline" id="sampleConv">${icon('i-play', 'icon-sm')}جرّب محادثة نموذجية</button>
          </div>
        </div></div>`;
      }
      if (p[0]) IB.sel = +p[0];
      else if (IB.sel == null && innerWidth > 980 && D.conversations[0]) IB.sel = D.conversations[0].id;
      const c = D.conversations.find(x => x.id === IB.sel);
      if (c && c.unread){ c.unread = 0; setTimeout(() => { App.renderNav(); document.querySelector('.sb-link[data-id="inbox"]').classList.add('active'); }); }
      const counts = { all:D.conversations.length, new:D.conversations.filter(x => x.status === 'new').length, active:D.conversations.filter(x => x.status === 'active').length, closed:D.conversations.filter(x => x.status === 'closed').length };
      return `
      <div class="page-head" style="margin-bottom:16px"><div><h2>صندوق وارد واتساب</h2><p>محادثات عملاء «${esc(App.company.name)}» الواردة عبر WhatsApp Cloud API.</p></div>
        <div class="row"><span class="pill ${D.integ && D.integ.wa ? 'p-green' : 'p-gray'}">${D.integ && D.integ.wa ? 'واتساب مُهيّأ' : 'واتساب غير مربوط'}</span><button class="btn btn-outline btn-sm" data-ib="simulate">🧪 محاكاة رسالة واردة</button></div></div>
      <div class="card inbox ${c && p[0] ? 'chat-open' : ''}" id="inbox">
        <div class="ib-list">
          <div class="ib-list-head">
            <div class="input-icon">${icon('i-search', 'icon-sm')}<input class="input" id="ibSearch" placeholder="ابحث بالاسم أو الرسالة…" value="${esc(IB.q)}" style="padding-block:9px"></div>
            <div class="seg" style="width:100%">${[['all', 'الكل'], ['new', 'جديدة'], ['active', 'نشطة'], ['closed', 'مغلقة']].map(([k, l]) => `<button data-f="${k}" class="${IB.filter === k ? 'on' : ''}" style="flex:1;padding:6px 4px">${l} <small class="muted">${counts[k]}</small></button>`).join('')}</div>
          </div>
          <div class="ib-convs" id="ibConvs">${convList()}</div>
        </div>
        <div class="ib-chat" id="ibChat">${chatHTML(c)}</div>
        <div class="ib-side" id="ibSide">${sideHTML(c)}</div>
      </div>`;
    },
    mount(el){
      const sampleBtn = el.querySelector('#sampleConv');
      if (sampleBtn){
        sampleBtn.onclick = () => {
          const co = App.company.name;
          D.conversations.unshift({
            id:Date.now(), name:'زبون تجريبي', phone:'+970 59 000 0000', color:'#3aa6a0', status:'new', unread:1, online:true,
            tags:['تجريبي'], intent:'استفسار', sentiment:4, orders:0, spent:0, since:'اليوم',
            summary:`محادثة نموذجية لتجربة الصندوق قبل ربط واتساب «${co}».`,
            messages:[{ from:'in', text:`مرحبا، شو خدماتكم عند ${co}؟`, at:new Date().toISOString() }]
          });
          D.persistWorkspace && D.persistWorkspace();
          App.renderNav();
          App.toast('أضفنا محادثة نموذجية حتى تجرّب الرد 🧪', 'info');
          App.rerender();
        };
        return;
      }
      const scrollDown = () => { const m = el.querySelector('#ibMsgs'); if (m) m.scrollTop = m.scrollHeight; };
      scrollDown();
      const cur = () => D.conversations.find(x => x.id === IB.sel);
      const refreshList = () => { el.querySelector('#ibConvs').innerHTML = convList(); };
      const append = (m, c) => {
        c.messages.push(m);
        if (c.id === IB.sel){ el.querySelector('#ibMsgs').innerHTML = msgsHTML(c); scrollDown(); }
        refreshList();
      };
      const ta = () => el.querySelector('#ibText');
      const autosize = () => { const t = ta(); if (!t) return; t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 120) + 'px'; };

      on(el, 'click', '[data-conv]', b => { location.hash = '#/inbox/' + b.dataset.conv; });
      on(el, 'click', '[data-f]', b => { IB.filter = b.dataset.f; el.querySelectorAll('[data-f]').forEach(x => x.classList.toggle('on', x === b)); refreshList(); });
      el.querySelector('#ibSearch').addEventListener('input', e => { IB.q = e.target.value.trim(); refreshList(); });
      on(el, 'click', '[data-quick]', b => { const t = ta(); t.value = b.dataset.quick; autosize(); t.focus(); });
      el.addEventListener('input', e => { if (e.target.id === 'ibText') autosize(); });
      el.addEventListener('keydown', e => { if (e.target.id === 'ibText' && e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); el.querySelector('[data-ib="send"]').click(); } });
      el.addEventListener('change', e => { if (e.target.matches('[data-ib-status]')){ cur().status = e.target.value; refreshList(); App.toast('تم تحديث حالة المحادثة', 'success'); } });

      on(el, 'click', '[data-ib]', b => {
        const a = b.dataset.ib, c = cur();
        if (a === 'back'){ IB.sel = null; location.hash = '#/inbox'; return; }
        if (a === 'simulate'){
          if (!D.conversations.length){ App.toast('ما في محادثات لمحاكاتها', 'info'); return; }
          const target = D.conversations[Math.floor(Math.random() * D.conversations.length)];
          const texts = ['مرحبا، شو أسعاركم؟', 'بدي أحجز طاولة لبكرا', 'بتوصلوا على البيرة؟', 'يسلمو إيديكم الكنافة كانت روعة 😍'];
          target.messages.push({ from:'in', text:texts[Math.floor(Math.random() * texts.length)], at:new Date().toISOString() });
          if (target.id !== IB.sel) target.unread++;
          if (target.status === 'closed') target.status = 'active';
          App.renderNav(); document.querySelector('.sb-link[data-id="inbox"]').classList.add('active');
          if (target.id === IB.sel){ el.querySelector('#ibMsgs').innerHTML = msgsHTML(target); scrollDown(); }
          refreshList();
          App.toast(`وصلت رسالة واردة من ${target.name} 🧪`, 'info');
          return;
        }
        if (!c) return;
        if (a === 'send'){
          const t = ta(), v = t.value.trim();
          if (!v){ App.toast('اكتب رسالة الرد أولًا', 'error'); t.focus(); return; }
          t.value = ''; autosize();
          append({ from:'out', text:v, at:new Date().toISOString() }, c);
          if (c.status === 'new') c.status = 'active';
          App.toast('تم إرسال الرد ✅', 'success');
        }
        if (a === 'ai'){
          const lastIn = [...c.messages].reverse().find(m => m.from === 'in');
          const msgs = el.querySelector('#ibMsgs');
          b.disabled = true;
          msgs.insertAdjacentHTML('beforeend', '<div class="typing-b" id="ibTyping"><i></i><i></i><i></i></div>');
          scrollDown();
          const to = setTimeout(() => {
            el.querySelector('#ibTyping')?.remove();
            b.disabled = false;
            append({ from:'out', text:aiReply(lastIn ? lastIn.text : ''), at:new Date().toISOString(), ai:true }, c);
            if (c.status === 'new') c.status = 'active';
            App.toast('أرسل الـ AI ردًا ذكيًا للزبون ✅', 'ai');
          }, 1400);
          App.onLeave(() => clearTimeout(to));
        }
        if (a === 'summarize'){
          const s = el.querySelector('#ibSum');
          if (s){ const stop = U.typeInto(s, c.summary + ' الخطوة التالية المقترحة: متابعة خلال 24 ساعة.', 10); App.onLeave(stop); }
          App.toast('تم تلخيص المحادثة بالـ AI', 'ai');
        }
        if (a === 'lead') App.toast(`انحفظ ${c.name} كعميل محتمل 🎯`, 'success');
        if (a === 'tag'){ if (!c.tags.includes('VIP')) c.tags.push('VIP'); el.querySelector('#ibSide').innerHTML = sideHTML(c); refreshList(); App.toast('انضاف وسم VIP', 'success'); }
        if (a === 'attach') App.toast('إرفاق الملفات متاح بعد ربط Meta الحقيقي', 'info');
        if (a === 'emoji'){ const t = ta(); t.value += '😊'; t.focus(); }
      });
    }
  });
})();
