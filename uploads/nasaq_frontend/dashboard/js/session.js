/* Binds the signed-in account to the dashboard and keeps a private workspace per user. */
(function(){
  const Auth = window.NasaqAuth;
  const D = window.NASAQ;
  const user = Auth && Auth.current();
  if (!user || !D) return;

  const demo = Auth.isDemo(user);
  const initial = s => (String(s || '').trim()[0] || 'ن');
  const monthKey = () => new Date().toISOString().slice(0, 7);

  const PRESETS = {
    'مقاهي ومطاعم': {
      grad:'olive', tone:'ودّية قريبة من الزبون',
      ideas:['عرض اليوم على المشروب الأكثر طلبًا','وجبة جديدة من المطبخ','أجواء المكان هذا الأسبوع','دعوة للحجز في نهاية الأسبوع'],
      sample:{ emoji:'☕', title:'مستنيينك اليوم', sub:'قهوة ومكان يرتاح فيه الزبون', cta:'احجز طاولتك', tag:'جديد' },
      colors:[
        { name:'زيتوني', role:'أساسي', hex:'#3f6b4a' },
        { name:'ذهبي دافئ', role:'مميّز', hex:'#d59938' },
        { name:'كريمي', role:'خلفية', hex:'#f6efe3' },
        { name:'بني قهوة', role:'ثانوي', hex:'#5a3a22' },
        { name:'فحمي', role:'نصوص', hex:'#1c2521' }
      ],
      persona:['ودّي','قريب','محلّي'],
      audience:'شباب وعائلات يحبون الخروج وتجربة مكان مريح',
      products:'مشروبات، وجبات، وعروض موسمية',
      chips:{ audience:['عائلات','طلاب جامعة','موظفين بالحي','زبائن التوصيل'], products:['قهوة مختصة','حلويات','فطور','ضيافة شركات'] }
    },
    'تجميل وعناية': {
      grad:'rose', tone:'فاخرة وراقية',
      ideas:['باقة عناية لهذا الأسبوع','قبل وبعد لعميلة راضية','نصيحة عناية سريعة','مواعيد آخر الأسبوع فاضية'],
      sample:{ emoji:'✨', title:'إطلالة تستاهلك', sub:'عناية كاملة بلمسة هادية', cta:'احجزي موعدك', tag:'عرض' },
      colors:[
        { name:'خمري', role:'أساسي', hex:'#9b3a55' },
        { name:'ذهبي', role:'مميّز', hex:'#e4b25e' },
        { name:'وردي فاتح', role:'خلفية', hex:'#fdf2f4' },
        { name:'خمري غامق', role:'ثانوي', hex:'#5a2433' },
        { name:'فحمي', role:'نصوص', hex:'#1c2521' }
      ],
      persona:['أنيق','دافئ','واثق'],
      audience:'سيدات يبحثن عن عناية وثقة بالنفس',
      products:'قص، صبغة، عناية بالبشرة، وباقات مناسبات',
      chips:{ audience:['عرايس','طالبات','موظفات','زبائن دائمين'], products:['قص وصبغة','عناية بشرة','حواجب','باقة عروس'] }
    },
    'عيادات وصحة': {
      grad:'teal', tone:'احترافية رسمية',
      ideas:['نصيحة صحية قصيرة لهذا الأسبوع','شرح خدمة من خدمات العيادة','دعوة لحجز موعد','رد على سؤال يتكرر من المراجعين'],
      sample:{ emoji:'🩺', title:'صحتك أولويتنا', sub:'رعاية واضحة ومواعيد مريحة', cta:'احجز موعدك', tag:'عيادة' },
      colors:[
        { name:'تركواز', role:'أساسي', hex:'#1d5e63' },
        { name:'تركواز فاتح', role:'مميّز', hex:'#3aa6a0' },
        { name:'أبيض مزرق', role:'خلفية', hex:'#e7f6f5' },
        { name:'غامق', role:'ثانوي', hex:'#14363a' },
        { name:'فحمي', role:'نصوص', hex:'#102026' }
      ],
      persona:['موثوق','واضح','مطمئن'],
      audience:'مراجعون يبحثون عن رعاية مفهومة ومواعيد سهلة',
      products:'كشف، استشارة، ومتابعة',
      chips:{ audience:['عائلات','كبار سن','أهالي أطفال','مراجعون جدد'], products:['كشف عام','استشارة','متابعة','عروض فحص'] }
    },
    'متاجر إلكترونية': {
      grad:'plum', tone:'مرحة وشبابية',
      ideas:['منتج الأسبوع','عرض لفترة محدودة','طريقة استخدام المنتج','تجربة زبون حقيقية'],
      sample:{ emoji:'🛍️', title:'وصل الجديد', sub:'اختيارات تناسب زبائنك', cta:'تسوّق الآن', tag:'جديد' },
      colors:[
        { name:'بنفسجي', role:'أساسي', hex:'#4b2f8f' },
        { name:'ذهبي', role:'مميّز', hex:'#d59938' },
        { name:'لافندر', role:'خلفية', hex:'#f4f0fb' },
        { name:'بنفسجي غامق', role:'ثانوي', hex:'#2a1a52' },
        { name:'فحمي', role:'نصوص', hex:'#16141f' }
      ],
      persona:['سريع','واضح','قريب'],
      audience:'متسوقون أونلاين يقارنون السعر والجودة',
      products:'منتجات المتجر، عروض الشحن، وسياسة الاسترجاع',
      chips:{ audience:['شباب','أمهات','باحثون عن هدية','زبائن متكررون'], products:['الأكثر مبيعًا','وصل حديثًا','عرض الشحن','تخفيض'] }
    },
    'خدمات مهنية': {
      grad:'navy', tone:'احترافية رسمية',
      ideas:['نتيجة حققتها لعميل','شرح خدمة بطريقة بسيطة','سؤال شائع وجوابه','دعوة لاستشارة مجانية'],
      sample:{ emoji:'💼', title:'خلّينا نشتغل سوا', sub:'خدمة واضحة ونتيجة تهمّك', cta:'احجز استشارة', tag:'خدمة' },
      colors:[
        { name:'كحلي', role:'أساسي', hex:'#14283e' },
        { name:'ذهبي', role:'مميّز', hex:'#d59938' },
        { name:'رمادي فاتح', role:'خلفية', hex:'#f4f6f8' },
        { name:'كحلي فاتح', role:'ثانوي', hex:'#1f3b5a' },
        { name:'فحمي', role:'نصوص', hex:'#0a1726' }
      ],
      persona:['مهني','مباشر','موثوق'],
      audience:'أصحاب أعمال يبحثون عن خدمة يعتمدون عليها',
      products:'الاستشارات والخدمات الأساسية',
      chips:{ audience:['أصحاب مشاريع','شركات صغيرة','أفراد','شركاء'], products:['استشارة','باقة شهرية','تنفيذ','دعم'] }
    }
  };
  PRESETS['نشاط تجاري'] = {
    grad:'gold', tone:'ودّية قريبة من الزبون',
    ideas:['تعريف سريع بنشاطك','عرض لهذا الأسبوع','قصة زبون راضٍ','دعوة للتواصل على واتساب'],
    sample:{ emoji:'✨', title:'أهلاً فيك', sub:'خدمة قريبة من زبائنك', cta:'تواصل معنا', tag:'جديد' },
    colors:[
      { name:'كحلي', role:'أساسي', hex:'#14283e' },
      { name:'ذهبي', role:'مميّز', hex:'#d59938' },
      { name:'كريمي', role:'خلفية', hex:'#fdf8ee' },
      { name:'ذهبي غامق', role:'ثانوي', hex:'#b97f22' },
      { name:'فحمي', role:'نصوص', hex:'#1c2521' }
    ],
    persona:['واضح','قريب','محترف'],
    audience:'زبائن في مدينتك يبحثون عن خدمة يعتمدون عليها',
    products:'خدماتك أو منتجاتك الأساسية',
    chips:{ audience:['زبائن جدد','زبائن دائمين','العائلات','الشباب'], products:['الخدمة الأساسية','عرض الأسبوع','باقة','استشارة'] }
  };

  const preset = PRESETS[user.industry] || PRESETS['نشاط تجاري'];
  D.industryPreset = preset;
  D.demo = demo;
  D.fresh = !demo;
  D.needsOnboarding = !demo && !user.onboarded;

  function brandFromAccount(){
    const b = user.brand || {};
    return {
      colors: b.colors && b.colors.length ? b.colors : preset.colors,
      fonts:{ heading:'Cairo Black', body:'Tajawal' },
      persona: b.persona && b.persona.length ? b.persona : preset.persona,
      audience: b.audience || preset.audience,
      products: b.products || preset.products,
      ideas: preset.ideas,
      sample: preset.sample
    };
  }

  function applyFresh(){
    const grad = (D.grads && D.grads[preset.grad]) || 'linear-gradient(135deg,#e4b25e,#b97f22)';
    D.companies = [{
      id:1,
      name:user.company || 'نشاطي',
      initial:initial(user.company),
      industry:user.industry || 'نشاط تجاري',
      city:user.city || '',
      grad,
      tone:(user.brand && user.brand.tone) || preset.tone,
      logo:(user.brand && user.brand.logo) || ''
    }];
    D.brand = brandFromAccount();
    D.content = [];
    D.conversations = [];
    D.campaigns = [];
    D.assets = [];
    D.knowledge = [];
    D.team = [{ name:user.name, email:user.email, role:'مالك', color:'#d59938', you:true }];
    const co = user.company || 'نشاطنا';
    D.flows = [
      { id:1, name:'الترحيب بالعملاء الجدد', trigger:'رسالة ترحيب', on:false, runs:0, icon:'i-smile', color:'green',
        nodes:[
          { kind:'trigger', type:'المحفّز', title:'أول رسالة من رقم جديد', icon:'i-zap' },
          { kind:'msg', type:'إرسال رسالة', title:'رسالة ترحيب', text:`أهلين وسهلين في ${co} 💛 كيف بنقدر نساعدك اليوم؟`, icon:'i-msg' },
          { kind:'ai', type:'رد ذكي', title:'الـ AI يجاوب من قاعدة المعرفة', text:'يستخدم المعلومات اللي بتضيفها في قسم الهوية.', icon:'i-spark' }
        ]},
      { id:2, name:'رد خارج أوقات الدوام', trigger:'عدم الرد', on:false, runs:0, icon:'i-clock', color:'purple',
        nodes:[
          { kind:'trigger', type:'المحفّز', title:'رسالة خارج ساعات العمل', icon:'i-zap' },
          { kind:'msg', type:'إرسال رسالة', title:'إبلاغ بساعات الدوام', text:`أهلين 🌙 فريق ${co} مو هون هلأ. بنرد عليك أول ما نرجع.`, icon:'i-msg' }
        ]}
    ];
    D.workflows = [
      { name:'ترحيب فوري بالعملاء الجدد', trigger:'عميل محتمل جديد', action:'إرسال رسالة', target:'واتساب', runs:0, on:false },
      { name:'نشر تلقائي عند الموافقة', trigger:'تغيّر حالة المحتوى', action:'نشر', target:'إنستغرام + فيسبوك', runs:0, on:false }
    ];
    D.notifications = [
      { icon:'i-spark', color:'ic-gold', text:`أهلًا <b>${user.name.split(/\s+/)[0]}</b>! حسابك جاهز — ابدأ بتجهيز هوية «${co}».`, at:'الآن', unread:true, href:'#/brand' }
    ];
    D.integ = { meta:false, wa:false, tt:false, in:false };
    D.meta = { gens:0, month:monthKey() };
  }

  function restore(saved){
    ['content','conversations','campaigns','assets','knowledge','flows','workflows','notifications','team','brand','companies','integ','meta'].forEach(k => {
      if (saved[k] != null) D[k] = saved[k];
    });
  }

  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(Auth.workspaceKey(user.id)) || 'null'); } catch (e) {}
  if (saved) restore(saved);
  else if (!demo) applyFresh();

  if (!D.integ) D.integ = demo ? { meta:true, wa:true, tt:false, in:false } : { meta:false, wa:false, tt:false, in:false };
  if (!D.meta) D.meta = { gens:0, month:monthKey() };
  if (D.meta.month !== monthKey()){ D.meta.gens = 0; D.meta.month = monthKey(); }

  D.user = { name:user.name, email:user.email, phone:user.phone || '', role:'مالك الحساب' };
  const me = (D.team || []).find(m => m.you);
  if (me) Object.assign(me, { name:user.name, email:user.email });
  if (user.company && D.companies && D.companies[0]){
    const c = D.companies[0];
    if (!demo || !saved){
      c.name = user.company;
      c.initial = initial(user.company);
      if (user.industry) c.industry = user.industry;
      if (user.city) c.city = user.city;
    }
    if (user.brand && user.brand.logo && !c.logo) c.logo = user.brand.logo;
    if (!saved && user.brand && user.brand.tone) c.tone = user.brand.tone;
  }
  if (!demo && D.brand){
    D.brand.ideas = D.brand.ideas || preset.ideas;
    D.brand.sample = D.brand.sample || preset.sample;
  }

  D.account = { user, plan:Auth.plan(user), demo };

  function persist(){
    try {
      const snap = {};
      ['content','conversations','campaigns','assets','knowledge','flows','workflows','notifications','team','brand','companies','integ','meta'].forEach(k => snap[k] = D[k]);
      localStorage.setItem(Auth.workspaceKey(user.id), JSON.stringify(snap));
    } catch (e) {}
  }
  D.persistWorkspace = persist;

  function genUsage(){
    const plan = Auth.plan(Auth.current() || user);
    if (!D.meta || D.meta.month !== monthKey()) D.meta = { gens:0, month:monthKey() };
    const limit = plan.gens;
    const used = D.meta.gens || 0;
    return { used, limit, left: limit === Infinity ? Infinity : Math.max(0, limit - used), plan };
  }
  D.genUsage = genUsage;
  D.spendGens = n => {
    genUsage();
    D.meta.gens = (D.meta.gens || 0) + n;
    persist();
    paintUsage();
  };

  function paintUsage(){
    const $ = id => document.getElementById(id);
    const set = (id, fn) => { const el = $(id); el && fn(el); };
    const u = Auth.current();
    if (!u) return;
    const plan = Auth.plan(u);
    D.account.plan = plan;
    const arrow = '<svg class="icon icon-sm"><use href="#i-chev-l"/></svg>';
    const usage = genUsage();
    if (plan.trial){
      const usedDays = 14 - plan.daysLeft;
      set('planPill', el => el.textContent = plan.short + ' تجريبي');
      set('usageNum', el => el.innerHTML = `<b>${plan.daysLeft}</b> يوم متبقّي`);
      set('usageBar', el => el.style.width = `${Math.max(4, usedDays / 14 * 100)}%`);
      set('usageNote', el => el.textContent = 'تجربتك المجانية للباقة الاحترافية');
      set('usageLink', el => el.innerHTML = `ثبّت اشتراكك ${arrow}`);
    } else if (usage.limit === Infinity){
      set('planPill', el => el.textContent = plan.short);
      set('usageNum', el => el.innerHTML = `<b>∞</b> توليد`);
      set('usageBar', el => el.style.width = '100%');
      set('usageNote', el => el.textContent = `باقة «${plan.name}» — توليدات بدون سقف`);
      set('usageLink', el => el.innerHTML = `إدارة الاشتراك ${arrow}`);
    } else {
      const pct = usage.limit ? Math.min(100, usage.used / usage.limit * 100) : 0;
      set('planPill', el => el.textContent = plan.short);
      set('usageNum', el => el.innerHTML = `<b>${usage.used}</b>/${usage.limit} توليد`);
      set('usageBar', el => el.style.width = `${Math.max(pct, usage.used ? 4 : 0)}%`);
      set('usageNote', el => el.textContent = plan.expired ? 'انتهت تجربتك — رجعناك للباقة المجانية' : `باقة «${plan.name}»`);
      set('usageLink', el => el.innerHTML = `ترقية الخطة ${arrow}`);
    }
    const ini = initial(u.name);
    set('userAvatar', el => el.textContent = ini);
    set('userAvatarLg', el => el.textContent = ini);
    set('userName', el => el.textContent = u.name);
    set('userEmail', el => el.textContent = u.email);
  }

  function showVerifyBanner(){
    if (demo || user.emailVerified || document.getElementById('verifyBanner')) return;
    const bar = document.createElement('div');
    bar.id = 'verifyBanner';
    bar.className = 'verify-banner';
    bar.innerHTML = `<span>أكّد بريدك <b dir="ltr">${user.email}</b> حتى نقدر نرجّع لك حسابك إذا نسيت كلمة المرور.</span><button type="button" id="resendVerify">اعرض رابط التأكيد</button>`;
    const topbar = document.querySelector('.topbar');
    topbar.parentNode.insertBefore(bar, topbar.nextSibling);
    bar.querySelector('#resendVerify').onclick = () => {
      const token = Auth.verificationToken();
      const href = `../auth/index.html?mode=verify&token=${token}`;
      if (window.App){
        App.modal({
          title:'رابط تأكيد البريد',
          sub:'ما في خادم بريد بعد — هذا الرابط اللي كان رح يوصلك.',
          body:`<div class="brand-note" style="margin:0"><span>افتحه من نفس المتصفح: <a href="${href}" style="font-weight:800;color:var(--gold-600)">${location.origin}/auth/index.html?mode=verify&token=${token}</a></span></div>`,
          foot:'<button class="btn btn-navy" data-close>تمام</button>'
        });
      }
    };
  }

  document.addEventListener('DOMContentLoaded', () => {
    paintUsage();
    showVerifyBanner();
    const logout = document.getElementById('logoutBtn');
    if (logout) logout.addEventListener('click', e => {
      e.preventDefault();
      persist();
      Auth.logout();
      location.href = logout.getAttribute('href');
    });
  });

  window.addEventListener('load', () => {
    if (window.App && App.rerender){
      const orig = App.rerender.bind(App);
      App.rerender = (...args) => { const r = orig(...args); persist(); return r; };
    }
    let welcome = false;
    try { welcome = sessionStorage.getItem('nasaq-welcome') === '1'; sessionStorage.removeItem('nasaq-welcome'); } catch (e) {}
    if (welcome && window.App && !D.needsOnboarding){
      const first = user.name.split(/\s+/)[0];
      const plan = Auth.plan(user);
      App.toast(`أهلًا ${first}! حسابك ${plan.trial ? 'التجريبي' : 'المجاني'} جاهز — ابدأ بتوليد أول محتوى ✨`, 'success', 5000);
    }
  });

  window.addEventListener('hashchange', persist);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') persist(); });
  window.addEventListener('pagehide', persist);

  window.NasaqSession = {
    refresh(){
      const u = Auth.current();
      if (!u) return;
      D.user.name = u.name;
      D.user.email = u.email;
      D.user.phone = u.phone || '';
      D.account.user = u;
      D.account.plan = Auth.plan(u);
      const member = (D.team || []).find(m => m.you);
      if (member) Object.assign(member, { name:u.name, email:u.email });
      paintUsage();
      persist();
    },
    persist
  };
})();
