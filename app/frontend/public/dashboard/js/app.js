/* Core: router, layout chrome, shared UI helpers. */
(function(){
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const D = window.NASAQ;

  const MONTHS = ['كانون الثاني','شباط','آذار','نيسان','أيار','حزيران','تموز','آب','أيلول','تشرين الأول','تشرين الثاني','كانون الأول'];
  const DAYS = ['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
  const PLAT = {
    ig:{ name:'إنستغرام', icon:'i-ig', cls:'plat-ig', color:'#dd2a7b' },
    fb:{ name:'فيسبوك', icon:'i-fb', cls:'plat-fb', color:'#1877f2' },
    tt:{ name:'تيك توك', icon:'i-tt', cls:'plat-tt', color:'#111111' },
    in:{ name:'لينكدإن', icon:'i-in', cls:'plat-in', color:'#0a66c2' },
    wa:{ name:'واتساب', icon:'i-wa', cls:'plat-wa', color:'#25d366' }
  };

  const U = {
    $, $$, MONTHS, DAYS, PLAT,
    icon:(id, cls = '') => `<svg class="icon ${cls}"><use href="#${id}"/></svg>`,
    esc:s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])),
    num:n => Number(n).toLocaleString('en'),
    plat:(p, lg) => `<span class="plat ${PLAT[p].cls} ${lg ? 'lg' : ''}" title="${PLAT[p].name}">${U.icon(PLAT[p].icon)}</span>`,
    time(iso){ const d = new Date(iso); let h = d.getHours(); const m = d.getMinutes(); const ap = h >= 12 ? 'م' : 'ص'; h = h % 12 || 12; return `${h}:${String(m).padStart(2, '0')} ${ap}`; },
    dateShort(iso){ const d = new Date(iso); return `${d.getDate()} ${MONTHS[d.getMonth()]}`; },
    dayName(iso){ return DAYS[new Date(iso).getDay()]; },
    rel(iso){
      const d = new Date(iso), now = new Date();
      const t0 = new Date(now); t0.setHours(0,0,0,0);
      const t1 = new Date(d); t1.setHours(0,0,0,0);
      const diff = Math.round((t1 - t0) / 864e5);
      if (diff === 0) return 'اليوم';
      if (diff === 1) return 'بكرا';
      if (diff === -1) return 'أمس';
      if (diff > 1 && diff < 7) return U.dayName(iso);
      return U.dateShort(iso);
    },
    sameDay:(a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(),
    statusPill(s){
      const m = { scheduled:['مجدول','p-blue'], published:['منشور','p-green'], draft:['مسودة','p-gray'], active:['نشطة','p-green'], paused:['متوقفة','p-amber'], ended:['منتهية','p-gray'], new:['جديدة','p-gold'], closed:['مغلقة','p-gray'] };
      const [t, c] = m[s] || [s, 'p-gray'];
      return `<span class="pill ${c}">${t}</span>`;
    },
    copy(text){
      (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(() => App.toast('تم النسخ إلى الحافظة', 'success')).catch(() => {
        const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select();
        try { document.execCommand('copy'); App.toast('تم النسخ إلى الحافظة', 'success'); } catch (e) { App.toast('تعذّر النسخ من المتصفح', 'error'); }
        t.remove();
      });
    },
    typeInto(el, text, speed = 14, done){
      let i = 0; el.innerHTML = '<span class="caret"></span>';
      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduce){ el.textContent = text; done && done(); return () => {}; }
      const t = setInterval(() => {
        i += Math.ceil(Math.random() * 3);
        el.innerHTML = U.esc(text.slice(0, i)) + '<span class="caret"></span>';
        if (i >= text.length){ clearInterval(t); el.textContent = text; done && done(); }
      }, speed);
      return () => clearInterval(t);
    }
  };

  const NAV = [
    { group:'الرئيسية', items:[ { id:'overview', label:'لوحة التحكم', icon:'i-home' } ] },
    { group:'المحتوى', items:[
      { id:'studio', label:'استوديو المحتوى', icon:'i-spark', badge:'AI', badgeCls:'new' },
      { id:'calendar', label:'جدولة النشر', icon:'i-cal' },
      { id:'library', label:'المكتبة', icon:'i-folder' }
    ]},
    { group:'العملاء', items:[
      { id:'inbox', label:'صندوق واتساب', icon:'i-wa', badge:() => D.conversations.reduce((a, c) => a + c.unread, 0) || '' },
      { id:'automation', label:'البوت والأتمتة', icon:'i-bot' }
    ]},
    { group:'النمو', items:[
      { id:'campaigns', label:'إعلانات Meta', icon:'i-mega' },
      { id:'analytics', label:'المؤشرات', icon:'i-chart' }
    ]},
    { group:'العلامة', items:[
      { id:'brand', label:'الهوية ومعرفة العلامة', icon:'i-palette' },
      { id:'settings', label:'الإعدادات', icon:'i-gear' }
    ]}
  ];

  const App = {
    U, D, views:{}, current:null, cleanup:[],
    company:D.companies[0],

    register(id, def){ this.views[id] = def; },

    renderNav(){
      $('#sbNav').innerHTML = NAV.map(g => `
        <div class="sb-group"><div class="sb-group-title">${g.group}</div>
          ${g.items.map(it => {
            const b = typeof it.badge === 'function' ? it.badge() : it.badge;
            return `<a href="#/${it.id}" class="sb-link" data-id="${it.id}" data-tip="${it.label}">${U.icon(it.icon)}<span class="lbl">${it.label}</span>${b ? `<span class="sb-badge ${it.badgeCls || ''}">${b}</span>` : ''}</a>`;
          }).join('')}
        </div>`).join('');
    },

    route(){
      const parts = (location.hash.replace(/^#\/?/, '') || 'overview').split('/');
      const id = this.views[parts[0]] ? parts[0] : 'overview';
      const view = this.views[id];
      this.cleanup.forEach(f => { try { f(); } catch (e) {} });
      this.cleanup = [];
      this.current = id;
      $$('.sb-link').forEach(a => a.classList.toggle('active', a.dataset.id === id));
      $('#pageTitle').textContent = view.title;
      document.title = `${view.title} | نسق`;
      $('#crumbs').innerHTML = `<a href="#/overview">${U.esc(this.company.name)}</a><span>/</span><span>${view.crumb || view.title}</span>`;
      const el = $('#view');
      el.classList.remove('enter'); void el.offsetWidth; el.classList.add('enter');
      el.innerHTML = view.render(parts.slice(1));
      view.mount && view.mount(el, parts.slice(1));
      $('#app').classList.remove('sb-open');
      if (!this._first) window.scrollTo({ top:0 });
      this._first = false;
    },

    rerender(){ this.route(); },
    onLeave(fn){ this.cleanup.push(fn); },

    toast(msg, type = 'info', ms = 3200){
      const ic = { success:'i-check', error:'i-x', info:'i-bell', ai:'i-spark' }[type] || 'i-bell';
      const t = document.createElement('div');
      t.className = `toast ${type}`;
      t.innerHTML = `<span class="t-ic">${U.icon(ic, 'icon-sm')}</span><span>${msg}</span>`;
      $('#toasts').appendChild(t);
      setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 260); }, ms);
    },

    modal({ title, sub = '', body, foot = '', size = '', onMount }){
      const root = $('#modalRoot');
      root.innerHTML = `<div class="modal-back" data-close></div>
        <div class="modal ${size}" role="dialog" aria-modal="true" aria-label="${U.esc(title)}">
          <div class="modal-head"><div><h3>${title}</h3>${sub ? `<p>${sub}</p>` : ''}</div><button class="icon-btn sm" data-close aria-label="إغلاق">${U.icon('i-x')}</button></div>
          <div class="modal-body">${body}</div>
          ${foot ? `<div class="modal-foot">${foot}</div>` : ''}
        </div>`;
      root.classList.add('open');
      const m = root.querySelector('.modal');
      $$('[data-close]', root).forEach(b => b.addEventListener('click', () => App.closeModal()));
      onMount && onMount(m);
      setTimeout(() => { const f = m.querySelector('input,textarea,select'); f && f.focus(); }, 60);
      return m;
    },
    closeModal(){ const r = $('#modalRoot'); r.classList.remove('open'); r.innerHTML = ''; },

    confirm(title, text, okLabel = 'تأكيد', danger){
      return new Promise(res => {
        App.modal({ title, body:`<p class="muted">${text}</p>`,
          foot:`<button class="btn btn-ghost" data-close>إلغاء</button><button class="btn ${danger ? 'btn-danger' : 'btn-navy'}" id="cfOk">${okLabel}</button>`,
          onMount:m => {
            m.querySelector('#cfOk').onclick = () => { App.closeModal(); res(true); };
            $$('[data-close]', m).forEach(b => b.addEventListener('click', () => res(false)));
          }});
      });
    },

    setTheme(dark){
      document.documentElement.classList.toggle('dark', dark);
      try { localStorage.setItem('nasaq-theme', dark ? 'dark' : 'light'); } catch (e) {}
      $('#themeBtn').innerHTML = U.icon(dark ? 'i-sun' : 'i-moon');
      setTimeout(() => Charts.redrawAll(), 50);
    },

    renderNotifs(){
      const unread = D.notifications.filter(n => n.unread).length;
      $('#notifDot').style.display = unread ? 'block' : 'none';
      $('#notifDd').innerHTML = `
        <div class="nd-head"><b>الإشعارات ${unread ? `<span class="pill p-gold no-dot">${unread} جديدة</span>` : ''}</b><button id="markAll">تعليم الكل كمقروء</button></div>
        <div class="nd-list">${D.notifications.map((n, i) => `
          <a href="${n.href}" class="nd-item ${n.unread ? 'unread' : ''}" data-i="${i}">
            <span class="nd-ic ${n.color}">${U.icon(n.icon, 'icon-sm')}</span>
            <div><p>${n.text}</p><small>${n.at}</small></div>
          </a>`).join('')}</div>`;
      $('#markAll').onclick = e => { e.stopPropagation(); D.notifications.forEach(n => n.unread = false); App.renderNotifs(); };
      $$('.nd-item', $('#notifDd')).forEach(a => a.addEventListener('click', () => { D.notifications[a.dataset.i].unread = false; App.renderNotifs(); closeDropdowns(); }));
    },

    setCompany(c){
      this.company = c;
      const logo = $('#coLogo');
      if (c.logo){ logo.innerHTML = `<img src="${c.logo}" alt="">`; logo.style.background = 'transparent'; }
      else { logo.textContent = c.initial; logo.style.background = c.grad || ''; }
      $('#coName').textContent = c.name;
      $('#coMeta').textContent = [c.industry, c.city].filter(Boolean).join(' · ');
    }
  };

  function closeDropdowns(){ $$('.dropdown.open').forEach(d => d.classList.remove('open')); $('.company-dd') && $('.company-dd').remove(); }
  App.closeDropdowns = closeDropdowns;

  function toggleDd(btn, dd){
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const open = dd.classList.contains('open');
      closeDropdowns();
      if (!open) dd.classList.add('open');
    });
  }

  /* Command palette */
  const CMDS = () => [
    ...NAV.flatMap(g => g.items.map(it => ({ group:'الصفحات', label:it.label, icon:it.icon, run:() => location.hash = '#/' + it.id }))),
    { group:'إجراءات سريعة', label:'ولّد محتوى جديد بالـ AI', icon:'i-spark', hint:'استوديو', run:() => location.hash = '#/studio' },
    { group:'إجراءات سريعة', label:'جدولة منشور', icon:'i-cal', hint:'تقويم', run:() => location.hash = '#/calendar' },
    { group:'إجراءات سريعة', label:'إنشاء حملة إعلانية', icon:'i-mega', hint:'Meta', run:() => { location.hash = '#/campaigns'; setTimeout(() => App.newCampaign && App.newCampaign(), 250); } },
    { group:'إجراءات سريعة', label:'رفع ملف إلى المكتبة', icon:'i-upload', run:() => location.hash = '#/library' },
    { group:'إجراءات سريعة', label:'إضافة وثيقة لمعرفة العلامة', icon:'i-book', run:() => location.hash = '#/brand' },
    { group:'إجراءات سريعة', label:'دعوة عضو للفريق', icon:'i-users', run:() => location.hash = '#/settings/team' },
    { group:'إجراءات سريعة', label:'تبديل الوضع الليلي', icon:'i-moon', run:() => App.setTheme(!document.documentElement.classList.contains('dark')) },
    ...D.conversations.map(c => ({ group:'محادثات واتساب', label:c.name, icon:'i-wa', hint:c.tags[0], run:() => location.hash = '#/inbox/' + c.id }))
  ];
  let palSel = 0, palItems = [];
  function renderPalette(q = ''){
    const qq = q.trim();
    palItems = CMDS().filter(c => !qq || c.label.includes(qq) || (c.hint || '').includes(qq) || c.group.includes(qq));
    palSel = Math.min(palSel, Math.max(palItems.length - 1, 0));
    let last = '', html = '';
    palItems.forEach((c, i) => {
      if (c.group !== last){ html += `<div class="pl-group">${c.group}</div>`; last = c.group; }
      html += `<button class="pl-item ${i === palSel ? 'sel' : ''}" data-i="${i}"><span class="pl-ic">${U.icon(c.icon, 'icon-sm')}</span>${U.esc(c.label)}${c.hint ? `<small>${U.esc(c.hint)}</small>` : ''}</button>`;
    });
    $('#paletteList').innerHTML = html || `<div class="empty"><b>لا نتائج</b>جرّب كلمة أخرى</div>`;
    $$('.pl-item').forEach(b => {
      b.addEventListener('click', () => runPal(+b.dataset.i));
      b.addEventListener('mousemove', () => { if (palSel !== +b.dataset.i){ palSel = +b.dataset.i; $$('.pl-item').forEach(x => x.classList.toggle('sel', +x.dataset.i === palSel)); } });
    });
  }
  function openPalette(){ $('#palette').classList.add('open'); $('#paletteInput').value = ''; palSel = 0; renderPalette(); setTimeout(() => $('#paletteInput').focus(), 30); }
  function closePalette(){ $('#palette').classList.remove('open'); }
  function runPal(i){ const c = palItems[i]; if (!c) return; closePalette(); c.run(); }
  App.openPalette = openPalette;

  function init(){
    App.renderNav();
    App.renderNotifs();
    App.setCompany(App.company);
    App.setTheme(document.documentElement.classList.contains('dark'));
    App._first = true;

    toggleDd($('#notifBtn'), $('#notifDd'));
    toggleDd($('#userBtn'), $('#userDd'));
    document.addEventListener('click', e => { if (!e.target.closest('.dropdown')) closeDropdowns(); });

    $('#themeBtn').onclick = () => App.setTheme(!document.documentElement.classList.contains('dark'));
    $('#collapseBtn').onclick = () => {
      const c = document.documentElement.classList.toggle('collapsed');
      try { localStorage.setItem('nasaq-collapsed', c ? '1' : '0'); } catch (e) {}
      setTimeout(() => Charts.redrawAll(), 320);
    };
    $('#menuBtn').onclick = () => $('#app').classList.add('sb-open');
    $('#sbOverlay').onclick = () => $('#app').classList.remove('sb-open');

    $('#companySwitch').addEventListener('click', e => {
      e.stopPropagation();
      if ($('.company-dd')){ closeDropdowns(); return; }
      closeDropdowns();
      const r = e.currentTarget.getBoundingClientRect();
      const dd = document.createElement('div');
      dd.className = 'dropdown company-dd open';
      dd.style.top = (r.bottom + 6) + 'px';
      dd.style.right = (innerWidth - r.right) + 'px';
      dd.innerHTML = `<div class="pl-group">شركاتك</div>` + D.companies.map(c => `
        <button class="dd-item" data-id="${c.id}"><span class="co-logo" style="background:${c.logo ? 'transparent' : c.grad};width:30px;height:30px;font-size:13px">${c.logo ? `<img src="${c.logo}" alt="">` : c.initial}</span><span style="flex:1;line-height:1.35"><b style="display:block;color:var(--ink);font-size:13.5px">${U.esc(c.name)}</b><small style="color:var(--muted);font-size:11.5px">${U.esc(c.industry)}</small></span>${c.id === App.company.id ? U.icon('i-check', 'icon-sm') : ''}</button>`).join('') +
        `<hr><a href="#/settings/company">${U.icon('i-plus', 'icon-sm')}شركة جديدة</a>`;
      document.body.appendChild(dd);
      $$('.dd-item', dd).forEach(b => b.addEventListener('click', () => {
        App.setCompany(D.companies.find(c => c.id === +b.dataset.id));
        closeDropdowns();
        App.toast(`تم التبديل إلى «${App.company.name}»`, 'success');
        App.rerender();
      }));
    });

    $('#searchBtn').onclick = openPalette;
    $('#palette').addEventListener('click', e => { if (e.target.id === 'palette') closePalette(); });
    $('#paletteInput').addEventListener('input', e => { palSel = 0; renderPalette(e.target.value); });
    $('#paletteInput').addEventListener('keydown', e => {
      if (e.key === 'ArrowDown'){ e.preventDefault(); palSel = Math.min(palSel + 1, palItems.length - 1); renderPalette(e.target.value); $('.pl-item.sel')?.scrollIntoView({ block:'nearest' }); }
      else if (e.key === 'ArrowUp'){ e.preventDefault(); palSel = Math.max(palSel - 1, 0); renderPalette(e.target.value); $('.pl-item.sel')?.scrollIntoView({ block:'nearest' }); }
      else if (e.key === 'Enter'){ e.preventDefault(); runPal(palSel); }
    });
    document.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k'){ e.preventDefault(); $('#palette').classList.contains('open') ? closePalette() : openPalette(); }
      if (e.key === 'Escape'){ closePalette(); App.closeModal(); closeDropdowns(); $('#app').classList.remove('sb-open'); }
    });

    window.addEventListener('hashchange', () => App.route());
    App.route();
  }

  window.App = App;
  document.addEventListener('DOMContentLoaded', init);
})();
