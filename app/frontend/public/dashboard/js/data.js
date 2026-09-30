/* Demo data — replace with API responses when wiring the backend. */
(function(){
  const today = new Date(); today.setHours(0,0,0,0);
  const d = (offset, h = 10, m = 0) => { const x = new Date(today); x.setDate(x.getDate() + offset); x.setHours(h, m, 0, 0); return x.toISOString(); };

  const GRADS = {
    olive:'linear-gradient(135deg,#6b8f71,#2f5238)',
    gold:'linear-gradient(135deg,#e4b25e,#b97f22)',
    navy:'linear-gradient(135deg,#1f3b5a,#0a1726)',
    rose:'linear-gradient(135deg,#e27d8f,#9b3a55)',
    coffee:'linear-gradient(135deg,#a47148,#5a3a22)',
    teal:'linear-gradient(135deg,#3aa6a0,#1d5e63)',
    plum:'linear-gradient(135deg,#8b6bd6,#4b2f8f)',
    sunset:'linear-gradient(135deg,#f5a25d,#d9534f)'
  };

  window.NASAQ = {
    user:{ name:'وليد', email:'waleed@nasaq.ps', role:'مالك الحساب' },

    companies:[
      { id:1, name:'مقهى الياسمين', initial:'ي', industry:'مقاهي ومطاعم', city:'رام الله', grad:GRADS.olive, tone:'ودّية قريبة من الزبون' },
      { id:2, name:'بوتيك ليان', initial:'ل', industry:'أزياء وملابس', city:'نابلس', grad:GRADS.rose, tone:'فاخرة وراقية' },
      { id:3, name:'عيادة د. سامي للأسنان', initial:'س', industry:'عيادات وصحة', city:'الخليل', grad:GRADS.teal, tone:'احترافية رسمية' }
    ],

    brand:{
      colors:[
        { name:'زيتوني', role:'أساسي', hex:'#3f6b4a' },
        { name:'ذهبي دافئ', role:'مميّز', hex:'#d59938' },
        { name:'كريمي', role:'خلفية', hex:'#f6efe3' },
        { name:'بني قهوة', role:'ثانوي', hex:'#5a3a22' },
        { name:'فحمي', role:'نصوص', hex:'#1c2521' }
      ],
      fonts:{ heading:'Cairo Black', body:'Tajawal' },
      persona:['دافئ','أصيل','قريب من الناس','مريح','محلّي فخور'],
      audience:'شباب وعائلات 20-40 في رام الله والبيرة، طلاب جامعة بيرزيت والموظفين',
      products:'قهوة مختصة، كنافة نابلسية، مناقيش الصباح، مشروبات صيفية، زاوية دراسة هادئة'
    },

    knowledge:[
      { id:1, title:'قائمة الأسعار — خريف 2026', cat:'منتجات', tags:['أسعار','منيو'], added:d(-3) },
      { id:2, title:'ساعات الدوام والموقع', cat:'هوية', tags:['موقع','دوام'], added:d(-12) },
      { id:3, title:'عرض طلاب الجامعة (خصم 20%)', cat:'عروض', tags:['طلاب','خصم'], added:d(-1) },
      { id:4, title:'أسئلة التوصيل والحجز', cat:'أسئلة شائعة', tags:['توصيل','حجز'], added:d(-20) },
      { id:5, title:'شخصية الجمهور المستهدف', cat:'الجمهور', tags:['جمهور'], added:d(-30) }
    ],

    content:[
      { id:101, title:'صباحك قهوة وكنافة ☕', caption:'صباح الخير يا رام الله ☀️\nفنجان قهوة مختصة + قطعة كنافة سخنة = أحلى بداية ليومك.\nمستنينك من الساعة 7 الصبح 💛', platform:'ig', format:'منشور', status:'scheduled', at:d(0,18,30), grad:GRADS.coffee, emoji:'☕', reach:0 },
      { id:102, title:'عرض الطلاب 20%', caption:'يا طلاب بيرزيت 📚\nأبرز هويتك الجامعية وخذ خصم 20% على كل المشروبات طول أيام الامتحانات.\nزاوية الدراسة جاهزة والواي فاي سريع 😉', platform:'fb', format:'إعلان', status:'scheduled', at:d(1,12,0), grad:GRADS.gold, emoji:'🎓', reach:0 },
      { id:103, title:'ريلز: كيف نحضّر الكنافة', caption:'من العجينة للقطر… شوفوا كيف بنحضّر الكنافة النابلسية كل يوم الصبح 🔥\nمين بدو يجرّبها سخنة؟', platform:'tt', format:'ريلز', status:'scheduled', at:d(2,20,0), grad:GRADS.sunset, emoji:'🧀', reach:0 },
      { id:104, title:'مشروب الخريف الجديد', caption:'وصل الخريف 🍂 وجبنالكم مشروب القرفة والتفاح الدافي.\nجرّبوه وقولولنا رأيكم بالكومنتات 👇', platform:'ig', format:'ستوري', status:'scheduled', at:d(4,17,0), grad:GRADS.olive, emoji:'🍂', reach:0 },
      { id:105, title:'فرص عمل: باريستا', caption:'بندوّر على باريستا شغوف ينضم لعيلة الياسمين ☕\nابعتلنا سيرتك الذاتية على الخاص.', platform:'in', format:'منشور', status:'scheduled', at:d(6,10,0), grad:GRADS.navy, emoji:'🤝', reach:0 },
      { id:106, title:'ليلة موسيقى عود', caption:'الخميس الجاي 🎶 ليلة عود وطرب مع الفنان يزن.\nالحجز مسبق — الأماكن محدودة!', platform:'ig', format:'كاروسيل', status:'scheduled', at:d(8,19,0), grad:GRADS.plum, emoji:'🎶', reach:0 },
      { id:107, title:'تذكير الحجز واتساب', caption:'أهلين 👋 بنذكّرك بحجزك الليلة الساعة 8 بمقهى الياسمين. بنستناك!', platform:'wa', format:'رسالة', status:'scheduled', at:d(3,15,0), grad:GRADS.teal, emoji:'💬', reach:0 },
      { id:108, title:'فطور العيلة يوم الجمعة', caption:'فطور الجمعة صار تقليد 🥙\nمناقيش، حمص، فول، وشاي بالنعنع… جيبوا العيلة وتعالوا.', platform:'fb', format:'منشور', status:'scheduled', at:d(10,9,0), grad:GRADS.gold, emoji:'🥙', reach:0 },
      { id:109, title:'لاتيه آرت ☕', caption:'فنّانين الباريستا عنا ما بيوقفوا 😍 أي رسمة بدك عالكابتشينو تبعك؟', platform:'ig', format:'ريلز', status:'published', at:d(-1,19,0), grad:GRADS.coffee, emoji:'🎨', reach:4820 },
      { id:110, title:'أجواء المساء', caption:'أضواء خافتة، موسيقى هادية، وقهوة بتدفّي القلب ✨', platform:'ig', format:'منشور', status:'published', at:d(-3,20,0), grad:GRADS.navy, emoji:'✨', reach:3210 },
      { id:111, title:'تقييمات زباينا', caption:'شكرًا على الـ 500 تقييم ⭐⭐⭐⭐⭐ على جوجل! إنتو سبب نجاحنا 💛', platform:'fb', format:'منشور', status:'published', at:d(-5,13,0), grad:GRADS.gold, emoji:'⭐', reach:6150 },
      { id:112, title:'الكنافة وصلت تيك توك', caption:'تحدّي: مين بيقدر يوكل الكنافة بدون ما يمطّ الجبنة؟ 😂', platform:'tt', format:'ريلز', status:'published', at:d(-7,21,0), grad:GRADS.sunset, emoji:'😂', reach:18400 },
      { id:113, title:'عرض نهاية الأسبوع', caption:'السبت والأحد: اشترِ مشروبين والتالت علينا 🎁', platform:'ig', format:'ستوري', status:'draft', at:null, grad:GRADS.rose, emoji:'🎁', reach:0 },
      { id:114, title:'قصة المقهى', caption:'من 2019 وإحنا بنحلم بمكان بيجمع الناس على فنجان قهوة… هاي قصتنا 💛', platform:'fb', format:'كاروسيل', status:'draft', at:null, grad:GRADS.olive, emoji:'📖', reach:0 },
      { id:115, title:'سموذي المانجا', caption:'حر؟ 🥭 سموذي المانجا الطبيعي 100% بيرجعلك الروح!', platform:'ig', format:'منشور', status:'draft', at:null, grad:GRADS.sunset, emoji:'🥭', reach:0 },
      { id:116, title:'اسأل الباريستا', caption:'عندك سؤال عن القهوة؟ اسألنا بالستوري وبنجاوب على كل الأسئلة ☕❓', platform:'ig', format:'ستوري', status:'draft', at:null, grad:GRADS.teal, emoji:'❓', reach:0 }
    ],

    conversations:[
      { id:1, name:'أحمد خليل', phone:'+970 59 812 3344', color:'#3aa6a0', status:'new', unread:2, online:true, tags:['استفسار سعر'], intent:'شراء', sentiment:4, orders:3, spent:185, since:'مارس 2025',
        summary:'زبون دائم بسأل عن أسعار ضيافة لاجتماع شركة يوم الخميس (15 شخص). مهتم بالكنافة والقهوة، وبدو عرض سعر مكتوب.',
        messages:[
          { from:'in', text:'مرحبا، كيفكم؟', at:d(0,9,12) },
          { from:'out', text:'أهلين أحمد 👋 منيحين الحمدلله، كيف بنقدر نساعدك؟', at:d(0,9,13), ai:true },
          { from:'in', text:'بدي أعمل ضيافة لاجتماع بالشركة يوم الخميس، تقريبًا 15 شخص', at:d(0,9,15) },
          { from:'in', text:'شو أسعاركم للقهوة والكنافة؟', at:d(0,9,15) }
        ]},
      { id:2, name:'رنا عودة', phone:'+970 56 223 9087', color:'#e27d8f', status:'new', unread:1, online:true, tags:['حجز'], intent:'حجز', sentiment:5, orders:7, spent:420, since:'يناير 2024',
        summary:'بدها تحجز طاولة لـ 6 أشخاص ليلة الخميس لحضور أمسية العود. سألت إذا في حد أدنى للطلب.',
        messages:[
          { from:'in', text:'مساء الخير 🌸 في مجال أحجز طاولة لـ 6 أشخاص ليلة العود يوم الخميس؟', at:d(0,8,40) }
        ]},
      { id:3, name:'محمد السعدي', phone:'+970 59 700 1122', color:'#8b6bd6', status:'active', unread:0, online:false, tags:['توصيل'], intent:'استفسار', sentiment:3, orders:1, spent:32, since:'أغسطس 2026',
        summary:'سأل عن التوصيل للبيرة. تم إبلاغه إنو التوصيل متاح عبر تطبيق التوصيل المحلي خلال 40 دقيقة.',
        messages:[
          { from:'in', text:'بتوصلوا عالبيرة؟', at:d(-1,14,2) },
          { from:'out', text:'أكيد! 🛵 التوصيل للبيرة متاح خلال 40 دقيقة تقريبًا، ورسوم التوصيل 10 شيكل.', at:d(-1,14,3), ai:true },
          { from:'in', text:'تمام شكرًا', at:d(-1,14,10) }
        ]},
      { id:4, name:'سلمى ناصر', phone:'+970 52 991 4455', color:'#d59938', status:'active', unread:0, online:false, tags:['شكوى'], intent:'دعم', sentiment:2, orders:12, spent:760, since:'2023',
        summary:'اشتكت إنو طلبها الأخير تأخر 25 دقيقة. تم الاعتذار وإعطاؤها كود خصم 15% للمرة الجاية.',
        messages:[
          { from:'in', text:'الطلب تأخر كتير اليوم 😕', at:d(-2,19,30) },
          { from:'out', text:'بنعتذر كتير سلمى 🙏 هاد مش المستوى اللي بنحبه. عملنالك كود خصم 15% لطلبك الجاي: YASMEEN15', at:d(-2,19,34) },
          { from:'in', text:'ماشي شكرًا لاهتمامكم ❤️', at:d(-2,19,40) }
        ]},
      { id:5, name:'يوسف حمدان', phone:'+970 59 334 7788', color:'#1f3b5a', status:'closed', unread:0, online:false, tags:['طلاب'], intent:'عرض', sentiment:4, orders:5, spent:140, since:'سبتمبر 2025',
        summary:'سأل عن عرض الطلاب. تم تأكيد الخصم 20% مع الهوية الجامعية.',
        messages:[
          { from:'in', text:'عرض الطلاب لسا شغال؟', at:d(-4,11,0) },
          { from:'out', text:'أكيد يوسف 🎓 خصم 20% على كل المشروبات مع الهوية الجامعية طول فترة الامتحانات.', at:d(-4,11,1), ai:true }
        ]},
      { id:6, name:'لينا مصطفى', phone:'+970 56 118 2299', color:'#6b8f71', status:'closed', unread:0, online:false, tags:['تقييم'], intent:'تفاعل', sentiment:5, orders:9, spent:510, since:'2024',
        summary:'بعتت شكر على تجربة عيد ميلاد ابنها بالمقهى.',
        messages:[
          { from:'in', text:'شكرًا كتير على الأجواء الحلوة بعيد ميلاد ابني 🎂💛', at:d(-6,21,0) },
          { from:'out', text:'العفو لينا! كان شرف إلنا نكون جزء من فرحتكم 🎉 كل سنة وهو بألف خير', at:d(-6,21,5), ai:true }
        ]}
    ],

    campaigns:[
      { id:1, name:'عرض الطلاب — بيرزيت', objective:'زيارات', status:'active', budget:600, spent:412, impressions:48200, clicks:1930, leads:86, platform:'ig', start:d(-10), end:d(10) },
      { id:2, name:'ليلة العود — حجوزات', objective:'عملاء محتملون', status:'active', budget:400, spent:180, impressions:21400, clicks:890, leads:54, platform:'fb', start:d(-4), end:d(4) },
      { id:3, name:'فطور الجمعة — العائلات', objective:'وصول', status:'active', budget:300, spent:96, impressions:30100, clicks:640, leads:18, platform:'fb', start:d(-2), end:d(12) },
      { id:4, name:'ريتارغتنج زوار الموقع', objective:'مبيعات', status:'paused', budget:250, spent:131, impressions:9800, clicks:420, leads:22, platform:'ig', start:d(-20), end:d(5) },
      { id:5, name:'إطلاق مشروب الخريف', objective:'تفاعل', status:'draft', budget:350, spent:0, impressions:0, clicks:0, leads:0, platform:'ig', start:d(3), end:d(17) },
      { id:6, name:'رمضان 2026', objective:'مبيعات', status:'ended', budget:1200, spent:1188, impressions:152000, clicks:6120, leads:310, platform:'fb', start:d(-200), end:d(-170) }
    ],

    assets:[
      { id:1, name:'كنافة — لقطة علوية', type:'image', size:2.4, grad:GRADS.sunset, ai:true, added:d(-1) },
      { id:2, name:'ريلز تحضير القهوة', type:'video', size:18.2, grad:GRADS.coffee, ai:true, dur:'0:24', added:d(-2) },
      { id:3, name:'قالب عرض أسبوعي', type:'template', size:1.1, grad:GRADS.gold, ai:false, added:d(-3) },
      { id:4, name:'منيو خريف 2026.pdf', type:'doc', size:3.8, grad:GRADS.navy, ai:false, added:d(-4) },
      { id:5, name:'أجواء المساء', type:'image', size:3.1, grad:GRADS.plum, ai:false, added:d(-5) },
      { id:6, name:'موسيقى خلفية هادئة', type:'audio', size:4.6, grad:GRADS.teal, ai:false, dur:'1:48', added:d(-6) },
      { id:7, name:'قالب ستوري — عروض', type:'template', size:0.9, grad:GRADS.rose, ai:false, added:d(-7) },
      { id:8, name:'فيديو إعلاني — الطلاب', type:'video', size:12.7, grad:GRADS.gold, ai:true, dur:'0:10', added:d(-8) },
      { id:9, name:'فريق الباريستا', type:'image', size:2.9, grad:GRADS.olive, ai:false, added:d(-9) },
      { id:10, name:'لاتيه آرت', type:'image', size:1.8, grad:GRADS.coffee, ai:true, added:d(-10) },
      { id:11, name:'دليل الهوية البصرية.pdf', type:'doc', size:6.2, grad:GRADS.olive, ai:false, added:d(-15) },
      { id:12, name:'قالب كاروسيل تعليمي', type:'template', size:1.4, grad:GRADS.teal, ai:false, added:d(-18) }
    ],

    flows:[
      { id:1, name:'الترحيب بالعملاء الجدد', trigger:'رسالة ترحيب', on:true, runs:1284, icon:'i-smile', color:'green',
        nodes:[
          { kind:'trigger', type:'المحفّز', title:'أول رسالة من رقم جديد', icon:'i-zap' },
          { kind:'msg', type:'إرسال رسالة', title:'رسالة ترحيب', text:'أهلين وسهلين بمقهى الياسمين ☕💛 كيف بنقدر نساعدك اليوم؟', opts:['📋 المنيو','📅 حجز طاولة','🛵 توصيل'], icon:'i-msg' },
          { kind:'ai', type:'رد ذكي', title:'الـ AI يجاوب من قاعدة المعرفة', text:'يستخدم الأسعار، الدوام، والعروض المحفوظة بقسم الهوية.', icon:'i-spark' },
          { kind:'action', type:'إجراء', title:'إضافة وسم «عميل جديد» وإشعار الفريق', icon:'i-tag' }
        ]},
      { id:2, name:'حجز طاولة', trigger:'كلمة مفتاحية: حجز', on:true, runs:342, icon:'i-cal', color:'blue',
        nodes:[
          { kind:'trigger', type:'المحفّز', title:'الرسالة فيها «حجز» أو «طاولة»', icon:'i-zap' },
          { kind:'msg', type:'سؤال', title:'كم شخص؟ وأي يوم؟', text:'أكيد! 😊 لكم شخص بدك تحجز وأي يوم وساعة؟', icon:'i-msg' },
          { kind:'action', type:'إجراء', title:'تسجيل الحجز وإرسال تأكيد + تذكير قبل ساعتين', icon:'i-check' }
        ]},
      { id:3, name:'التقاط عميل محتمل من الإعلان', trigger:'التقاط عميل', on:true, runs:176, icon:'i-target', color:'gold',
        nodes:[
          { kind:'trigger', type:'المحفّز', title:'رسالة قادمة من إعلان Meta', icon:'i-zap' },
          { kind:'msg', type:'إرسال رسالة', title:'شكر + سؤال عن الاهتمام', text:'شكرًا لاهتمامك بعرضنا 🎁 شو أكثر اشي حابب تجرّبه؟', opts:['قهوة مختصة','حلويات','ضيافة شركات'], icon:'i-msg' },
          { kind:'action', type:'إجراء', title:'حفظ كعميل محتمل وإضافته لقائمة المتابعة', icon:'i-users' }
        ]},
      { id:4, name:'رد خارج أوقات الدوام', trigger:'عدم الرد', on:false, runs:58, icon:'i-clock', color:'purple',
        nodes:[
          { kind:'trigger', type:'المحفّز', title:'رسالة بعد الساعة 12 ليلًا', icon:'i-zap' },
          { kind:'msg', type:'إرسال رسالة', title:'إبلاغ بساعات الدوام', text:'أهلين 🌙 إحنا هلأ مسكرين، بنفتح الساعة 7 الصبح وبنرد عليك أول ما نوصل!', icon:'i-msg' }
        ]}
    ],

    workflows:[
      { name:'ترحيب فوري بالعملاء الجدد', trigger:'عميل محتمل جديد', action:'إرسال رسالة', target:'واتساب', runs:412, on:true },
      { name:'نشر تلقائي عند الموافقة', trigger:'تغيّر حالة المحتوى', action:'نشر', target:'إنستغرام + فيسبوك', runs:96, on:true },
      { name:'تنبيه الفريق بالشكاوى', trigger:'رسالة سلبية', action:'إشعار الفريق', target:'#الدعم', runs:23, on:true },
      { name:'وسم زبائن الإعلانات', trigger:'رسالة من إعلان', action:'إضافة وسم', target:'قائمة Meta Leads', runs:176, on:false }
    ],

    notifications:[
      { icon:'i-wa', color:'ic-green', text:'<b>أحمد خليل</b> بعت رسالة جديدة: «شو أسعاركم للقهوة والكنافة؟»', at:'قبل 5 دقائق', unread:true, href:'#/inbox/1' },
      { icon:'i-spark', color:'ic-gold', text:'الـ AI جهّز <b>5 أفكار</b> لمناسبة بداية الخريف', at:'قبل ساعة', unread:true, href:'#/studio' },
      { icon:'i-check', color:'ic-blue', text:'تم نشر <b>«لاتيه آرت ☕»</b> على إنستغرام بنجاح', at:'أمس', unread:true, href:'#/calendar' },
      { icon:'i-mega', color:'ic-purple', text:'حملة <b>«عرض الطلاب»</b> صرفت 69% من الميزانية', at:'أمس', unread:false, href:'#/campaigns' },
      { icon:'i-users', color:'ic-navy', text:'<b>سارة</b> قبلت دعوة الانضمام للفريق', at:'قبل يومين', unread:false, href:'#/settings/team' }
    ],

    team:[
      { name:'وليد', email:'waleed@nasaq.ps', role:'مالك', color:'#d59938', you:true },
      { name:'سارة جابر', email:'sara@yasmeen.ps', role:'محرّرة محتوى', color:'#8b6bd6' },
      { name:'عمر زيد', email:'omar@yasmeen.ps', role:'خدمة العملاء', color:'#3aa6a0' }
    ],

    grads:GRADS
  };
})();
