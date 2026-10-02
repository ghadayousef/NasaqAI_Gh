# -*- coding: utf-8 -*-
"""برومت الإنتاج البصري لنَسَق.

النموذج يولّد المشهد فقط. الشعار الحقيقي يُركَّب لاحقًا في الزاوية الهادئة،
والنص العربي يُصفَّف بخط Cairo. هكذا تبقى الألوان والشعار دقيقين.

الاستخدام:
    from prompts.brand_media import build
    job = build(brand, brief)
    # job["image_prompt"]  -> نموذج الصورة أو الفيديو
    # job["negative"]      -> البرومت السلبي
    # job["caption_prompt"] -> نموذج النص
    # job["composite"]     -> مواصفات تركيب الشعار والنص
"""

FORMATS = {
    "منشور": {
        "ratio": "1:1",
        "kind": "still",
        "logo_zone": "top-right",
        "text_zone": "lower third, a soft Background-color plate",
        "direction": (
            "One hero still for a social feed. A single focal subject occupies about 60% of the frame. "
            "Leave the lower third as a clean plate for a headline. Square 1:1 crop, premium editorial, "
            "nothing important touching the edges."
        ),
    },
    "ستوري": {
        "ratio": "9:16",
        "kind": "still",
        "logo_zone": "top-right",
        "text_zone": "bottom 22% of the frame, solid Background plate",
        "direction": (
            "Vertical 9:16 story. Subject sits in the upper-middle third. Keep the top 14% and the bottom 22% "
            "visually quiet because platform UI covers them. Bottom band is a flat Background-color plate for a sticker and a short line. "
            "No tiny details near the edges."
        ),
    },
    "كاروسيل": {
        "ratio": "4:5",
        "kind": "carousel",
        "slides": 6,
        "logo_zone": "top-right",
        "text_zone": "same lower band on every slide",
        "direction": (
            "A 6-slide carousel, 4:5, one continuous campaign. Identical camera height, identical background, "
            "identical logo quiet-zone, identical text-plate on every slide. Only the subject changes.\n"
            "Slide 1 — cover: the strongest product frame, maximum negative space.\n"
            "Slides 2 to 5 — one clear idea each, same layout grid, subject centered-left so the right stays calm.\n"
            "Slide 6 — close: product small and centered on a flat Background field, ready for a call to action.\n"
            "Describe all six frames in order. Do not change palette, crop, or light between slides."
        ),
    },
    "ريلز": {
        "ratio": "9:16",
        "kind": "video",
        "seconds": 12,
        "logo_zone": "top-right during the film; centered on the end card",
        "text_zone": "lower fifth, kept empty",
        "direction": (
            "A 12-second vertical film, 9:16, 24fps feel, natural motivated camera, no whip pans, no zoom pumping.\n"
            "0.0–1.5s — hook: extreme close-up of the product, one slow move, sharp focus.\n"
            "1.5–9.0s — story: two shots max, the product in a real {city} setting, hands only if they are anatomically correct.\n"
            "9.0–12.0s — end card: camera settles on a flat Background field, center empty for the real logo, no scenery.\n"
            "Color grade locked to Primary and Background for the whole timeline. No on-screen words."
        ),
    },
    "فيديو": {
        "ratio": "16:9",
        "kind": "video",
        "seconds": 20,
        "logo_zone": "top-right during the film; centered on the end card",
        "text_zone": "lower fifth, kept empty",
        "direction": (
            "A 20-second widescreen film, 16:9, commercial pacing, tripod or slow slider, no shaky handheld.\n"
            "0.0–3.0s — establish the place in one wide shot, {city}, quiet and premium.\n"
            "3.0–15.0s — three product shots: detail, use, result. Same light, same grade.\n"
            "15.0–20.0s — end card on a flat Background field, center clear for the real logo.\n"
            "No captions burned into the picture. No stock music visualizer, no fake interface."
        ),
    },
    "إعلان": {
        "ratio": "4:5",
        "kind": "still",
        "logo_zone": "top-right",
        "text_zone": "bottom band for the offer and a button",
        "direction": (
            "A direct-response ad still, 4:5. Product is unmistakable in the first glance, isolated from clutter, "
            "high clarity, slightly more contrast than a mood post. Leave a small empty Accent-colored badge area "
            "near the product for the offer, and a bottom band: Background plate plus a Primary-colored button shape with no letters. "
            "No fake social-media UI, no fake prices, no star ratings drawn as text."
        ),
    },
}

NEGATIVE = (
    "misspelled text, any letters, any numbers, watermark, fake logo, redrawn logo, extra brand marks, "
    "stock-photo smile, plastic skin, extra fingers, warped product, melted packaging, cluttered background, "
    "neon colors outside the palette, oversaturated HDR, harsh flash, lens dirt, collage, screenshot, "
    "low resolution, blurry subject, cropped logo space, objects inside the quiet corner"
)

CAPTION_SYSTEM = """أنت كاتب إعلانات في نَسَق. تكتب نصًا جاهزًا للنشر لنشاط تجاري حقيقي.
القواعد:
- التزم بلهجة صاحب الحساب. إذا اللهجة فلسطينية: رح، فيك، هون، بدك، وألفاظ يومية طبيعية من غير مبالغة.
- إذا الفصحى المبسّطة: جمل قصيرة واضحة، من غير لهجة.
- لا تخترع سعرًا أو عرضًا أو رقم هاتف غير موجود في المعلومات.
- أول سطر يوقف التمرير. آخر سطر فيه دعوة واحدة فقط.
- الإيموجي قليلة وفي محلها، مو سطر كامل.
- الهاشتاغ ثلاث كلمات كحد أقصى، وواحدة منها اسم النشاط.
- أعد JSON فقط بالمفاتيح: title, caption, cta, hashtags, slides.
- slides قائمة. لكل شريحة: title و body. إذا النوع ليس كاروسيل خلّها فارغة.
"""


def _colors(brand):
    rows = brand.get("colors") or []
    by_role = {}
    for row in rows:
        if isinstance(row, dict):
            by_role[row.get("role") or ""] = row
        else:
            by_role.setdefault("أساسي", {"name": "أساسي", "hex": row, "role": "أساسي"})
    order = ["أساسي", "مميّز", "خلفية", "ثانوي", "نصوص"]
    picked = []
    for role in order:
        row = by_role.get(role)
        if row:
            picked.append(row)
    if not picked and rows:
        names = ["أساسي", "مميّز", "خلفية", "ثانوي", "نصوص"]
        for i, row in enumerate(rows[:5]):
            hex_value = row.get("hex") if isinstance(row, dict) else row
            picked.append({"role": names[i], "name": names[i], "hex": hex_value})
    return picked


def _palette_block(colors):
    labels = {
        "أساسي": "Primary — brand shapes and product accents",
        "مميّز": "Accent — one highlight only",
        "خلفية": "Background — canvas, plates, end card",
        "ثانوي": "Secondary — supporting props",
        "نصوص": "Ink — do not use as a large fill",
    }
    lines = []
    for row in colors:
        role = row.get("role") or ""
        label = labels.get(role, role)
        lines.append(f"- {label}: {row.get('name', role)} {str(row.get('hex', '')).upper()}")
    return "\n".join(lines) or "- Use a restrained neutral palette."


def build(brand, brief):
    """يبني برومت الصورة أو الفيديو وبرومت النص من هوية الحساب.

    brand: name, industry, city, audience, products, persona, tone, colors, logo
    brief: type, platform, ratio, style, lang, subject, audience, slides
    """
    kind = brief.get("type") or "منشور"
    spec = dict(FORMATS.get(kind) or FORMATS["منشور"])
    if brief.get("ratio"):
        spec["ratio"] = brief["ratio"]
    colors = _colors(brand)
    persona = "، ".join(brand.get("persona") or [])
    subject = (brief.get("subject") or brand.get("products") or "").strip()
    audience = (brief.get("audience") or brand.get("audience") or "").strip()
    city = brand.get("city") or ""
    direction = spec["direction"].replace("{city}", city or "the brand's city")
    name = brand.get("name") or ""

    image_prompt = f"""You are a senior brand art director delivering a paid social asset, not a concept sketch.
The picture must be sharp, commercially lit, and faithful to this brand. Photoreal product photography unless the style says otherwise.

BRAND
- Business: {name}
- Industry: {brand.get("industry") or ""}
- City: {city}
- Audience: {audience}
- Subject: {subject}
- Personality: {persona}
- Voice: {brand.get("tone") or brief.get("tone") or ""}
- Style: {brief.get("style") or "عصري"}

PALETTE — exact hex only. Do not invent neighboring colors. Natural skin, food, and materials may keep their real color, then grade the scene toward Primary and Background.
{_palette_block(colors)}

LOGO
- Do not draw a logo, wordmark, monogram, initials, or watermark.
- The real logo file is composited later.
- Keep the {spec["logo_zone"]} corner quiet: flat Background color, or a very soft wash of Primary at low opacity.
- Quiet rectangle: about 18% of the width and 14% of the height, inset 4% from the edges. No objects, faces, or texture crossing it.

TYPE
- Render no letters, numbers, prices, or captions in any language.
- Arabic copy is typeset later in Cairo.
- Reserve this text area empty: {spec["text_zone"]}.

SCENE
- Show only what the business actually sells. Setting feels local to {city} and fits {brand.get("industry") or "the business"}.
- One focal point, generous negative space, correct geometry, correct hands if hands appear.
- Light: soft natural key, controlled shadow, color grade locked to the palette.
- Format: {kind}. Aspect ratio: {spec["ratio"]}. Platform: {brief.get("platform") or "instagram"}.

DIRECTION
{direction}"""

    caption_prompt = f"""المعلومات:
- النشاط: {name}
- المجال: {brand.get("industry") or ""}
- المدينة: {city}
- الجمهور: {audience}
- المنتجات: {brand.get("products") or ""}
- الشخصية: {persona}
- النبرة: {brand.get("tone") or brief.get("tone") or ""}
- اللغة: {brief.get("lang") or "اللهجة الفلسطينية"}
- النوع: {kind}
- المنصة: {brief.get("platform") or ""}
- الموضوع: {subject}
- عدد شرائح الكاروسيل: {spec.get("slides") or 0}

اكتب النص حسب النظام. الكاروسيل يحتاج عنوانًا وسطرًا لكل شريحة بنفس الترتيب البصري."""

    primary = next((c.get("hex") for c in colors if c.get("role") == "أساسي"), "#14283e")
    background = next((c.get("hex") for c in colors if c.get("role") == "خلفية"), "#f7f4ee")
    ink = next((c.get("hex") for c in colors if c.get("role") == "نصوص"), "#1c2521")

    return {
        "image_prompt": image_prompt.strip(),
        "negative": NEGATIVE,
        "caption_system": CAPTION_SYSTEM.strip(),
        "caption_prompt": caption_prompt.strip(),
        "composite": {
            "logo_file": brand.get("logo") or "",
            "logo_zone": spec["logo_zone"],
            "logo_max_width_ratio": 0.16,
            "clear_space": "ارتفاع الشعار نفسه حول العلامة",
            "do_not_recolor": True,
            "plate": background,
            "heading_font": (brand.get("fonts") or {}).get("heading") or "Cairo",
            "body_font": (brand.get("fonts") or {}).get("body") or "Cairo",
            "heading_color": ink,
            "button_color": primary,
            "ratio": spec["ratio"],
            "kind": spec["kind"],
            "seconds": spec.get("seconds"),
            "slides": spec.get("slides"),
        },
    }
