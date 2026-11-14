import asyncio
import os
import json
from PIL import Image, ImageDraw, ImageFilter
from playwright.async_api import async_playwright

BASE_URL = "http://127.0.0.1:3000"
OUT_DIR = os.path.abspath("presentation_mockups")
RAW_DIR = os.path.join(OUT_DIR, "raw_screens")

os.makedirs(OUT_DIR, exist_ok=True)
os.makedirs(RAW_DIR, exist_ok=True)

def create_clean_edge_mockup(screen_img_path, output_path):
    """
    Creates an ultra-clean, notch-less, camera-less iPhone mockup.
    Pure bezel-less display with sleek titanium framing and soft 3D float shadow.
    """
    screen = Image.open(screen_img_path).convert("RGBA")
    sw, sh = screen.size  # 860 x 1864

    bezel = 18
    corner_radius = 80
    outer_w = sw + bezel * 2
    outer_h = sh + bezel * 2
    
    pad = 80
    canvas_w = outer_w + pad * 2
    canvas_h = outer_h + pad * 2

    canvas = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))

    # 1. Soft 3D Ambient Drop Shadow
    shadow_mask = Image.new("L", (canvas_w, canvas_h), 0)
    shadow_draw = ImageDraw.Draw(shadow_mask)
    shadow_draw.rounded_rectangle(
        [pad + 8, pad + 20, pad + outer_w - 8, pad + outer_h + 20],
        radius=corner_radius,
        fill=130
    )
    shadow_blurred = shadow_mask.filter(ImageFilter.GaussianBlur(radius=40))
    shadow_layer = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
    shadow_layer.putalpha(shadow_blurred)
    canvas = Image.alpha_composite(canvas, shadow_layer)

    # 2. Sleek Titanium Outer Chassis
    chassis = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
    chassis_draw = ImageDraw.Draw(chassis)
    
    # Outer dark titanium metal
    chassis_draw.rounded_rectangle(
        [pad, pad, pad + outer_w, pad + outer_h],
        radius=corner_radius,
        fill=(26, 26, 28, 255),
        outline=(85, 85, 90, 255),
        width=3
    )
    # Inner border line
    chassis_draw.rounded_rectangle(
        [pad + 3, pad + 3, pad + outer_w - 3, pad + outer_h - 3],
        radius=corner_radius - 3,
        outline=(12, 12, 14, 255),
        width=4
    )
    canvas = Image.alpha_composite(canvas, chassis)

    # 3. Screen Content Masking (Rounded Corners)
    screen_mask = Image.new("L", (sw, sh), 0)
    mask_draw = ImageDraw.Draw(screen_mask)
    mask_draw.rounded_rectangle(
        [0, 0, sw, sh],
        radius=corner_radius - bezel,
        fill=255
    )
    
    screen_layer = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
    screen_layer.paste(screen, (pad + bezel, pad + bezel), screen_mask)
    canvas = Image.alpha_composite(canvas, screen_layer)

    # 4. Subtle Home Indicator Bar (NO CAMERA, NO NOTCH)
    overlay = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
    overlay_draw = ImageDraw.Draw(overlay)
    
    bar_w = int(sw * 0.35)
    bar_h = 8
    bar_x0 = pad + bezel + (sw - bar_w) // 2
    bar_y0 = pad + bezel + sh - 20
    overlay_draw.rounded_rectangle(
        [bar_x0, bar_y0, bar_x0 + bar_w, bar_y0 + bar_h],
        radius=bar_h // 2,
        fill=(255, 255, 255, 140)
    )

    canvas = Image.alpha_composite(canvas, overlay)
    canvas.save(output_path, "PNG", optimize=True)
    print(f"✨ Clean Notch-less Mockup: {os.path.basename(output_path)}")

# High-fidelity preloaded Chat Session with NASA tools
RICH_CHAT_SESSIONS = [
    {
        "id": "nasa_session_01",
        "title": "Nile Delta 3-Year Resilient Plan",
        "createdAt": "2026-11-14T09:00:00.000Z",
        "updatedAt": "2026-11-14T09:05:00.000Z",
        "messages": [
            {
                "id": "msg_user_01",
                "sender": "user",
                "content": "What is the best 3-year crop rotation under a 30% irrigation water cut for my 15-feddan Nile Delta field?",
                "createdAt": "2026-11-14T09:00:10.000Z"
            },
            {
                "id": "msg_bot_01",
                "sender": "assistant",
                "content": """### 🛰️ Autonomous Space Intelligence & Agronomic Recommendation

Based on real-time **NASA SMAP L4 (30m downscaled)** and **ECOSTRESS thermal skin temperature**, your field is experiencing elevated vapor pressure deficit (+3.8°C thermal anomaly). 

#### 🔄 Recommended 3-Year (6-Season) Rotation Archetype:
1. **Year 1 (Winter):** *Berseem Clover (Trifolium alexandrinum)* — Fixes ~140 kg N/ha, recharges structural soil organic carbon.
2. **Year 1 (Summer):** *Grain Sorghum (Sorghum bicolor)* — High heat and moisture stress resilience, saving **38% water** vs. traditional maize.
3. **Year 2 (Winter):** *Durum Wheat (Triticum durum)* — Maximizes cash margin under biological N residual.
4. **Year 2 (Summer):** *Soybeans / Cowpeas* — Low water deficit coefficient ($K_y = 0.85$).
5. **Year 3 (Winter / Summer):** *Faba Beans $\\to$ Sunflowers*.

#### 📊 Guaranteed Farm Economics:
* 💧 **Water Conserved:** $4,850\\text{ m}^3/\\text{feddan}$ ($-41.2\\%$ total pumping).
* 💰 **Net Profit Increase:** $+153,149\\text{ EGP}$ over 3 years ($+41.1\\%$ ROI).
* 🌱 **Fertilizer Saved:** $18$ bags of urea per feddan through biological nitrogen fixation.""",
                "toolsUsed": [
                    {
                        "name": "fetch_nasa_drought_telemetry",
                        "labelAr": "رادار ناسا SMAP و ECOSTRESS",
                        "labelEn": "NASA SMAP 30m & ECOSTRESS Ingestion",
                        "status": "success",
                        "summaryAr": "تم سحب بيانات SMAP بدقة 30 متر مع رصد الحمى الحرارية لمحصول الدلتا",
                        "summaryEn": "NASA SMAP 30m soil moisture & ECOSTRESS +3.8°C canopy thermal anomaly active."
                    },
                    {
                        "name": "simulate_crop_scenario",
                        "labelAr": "محاكاة الفاو FAO-56 والعجز المائي",
                        "labelEn": "FAO-56 Soil Water Balance Simulation",
                        "status": "success",
                        "summaryAr": "محاكاة الإجهاد المائي لـ 48 محصولاً مصرياً تحت عجز 30%",
                        "summaryEn": "Simulated FAO-56 water stress coefficient (Ks=0.68) for 48 Egyptian crops."
                    },
                    {
                        "name": "run_topsis_rotation_optimizer",
                        "labelAr": "محسن الدورة الزراعية TOPSIS",
                        "labelEn": "Dynamic TOPSIS 6-Season Solver",
                        "status": "success",
                        "summaryAr": "تقييم 5,120 تركيبة دورة زراعية في 18ms واختيار المسار الأمثل",
                        "summaryEn": "Ranked 5,120 multi-season permutations in 18ms. Optimal archetype: Legume-Cereal Resilience."
                    }
                ],
                "learnedMemory": [
                    "Nile Delta Clay Loam (15 Feddans)",
                    "Canal Pumping Deficit: -30%",
                    "Preferred Crops: Berseem, Wheat, Sorghum"
                ],
                "createdAt": "2026-11-14T09:00:25.000Z"
            }
        ]
    }
]

async def capture_presentation_mockups():
    print("🚀 Launching Headless Edge for Presentation Suite Captures...")
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            channel="msedge",
            headless=True,
            args=["--disable-blink-features=AutomationControlled", "--no-sandbox"]
        )
        
        context = await browser.new_context(
            viewport={"width": 430, "height": 932},
            device_scale_factor=2,
            is_mobile=True,
            has_touch=True,
            locale="en-US"
        )
        page = await context.new_page()
        
        # 1. Seed origin storage with rich chat session and field settings
        await page.goto(f"{BASE_URL}", wait_until="domcontentloaded")
        await page.evaluate("""(sessions) => {
            localStorage.setItem('blinkfarms_lang', 'en');
            localStorage.setItem('blinkfarms_story_v3', 'true');
            localStorage.setItem('blinkfarms_auth_user', JSON.stringify({ name: 'Omar', email: 'farmer@blinkfarms.eg' }));
            localStorage.setItem('blinkfarms_selected_preset', 'nile_delta');
            localStorage.setItem('blinkfarms_wizard_completed', 'true');
            localStorage.setItem('blinkfarms_wizard_answers', JSON.stringify({
                areaFeddan: 15,
                soilType: 'clay',
                irrigationMethod: 'canal',
                cropCategory: 'all'
            }));
            localStorage.setItem('blinkfarms_chat_sessions_v2', JSON.stringify(sessions));
            localStorage.setItem('blinkfarms_central_memory', JSON.stringify([
                'Nile Delta Clay Loam (15 Feddans)',
                'Canal Pumping Deficit: -30%',
                'Preferred: Berseem Clover, Wheat, Sorghum'
            ]));
            document.documentElement.lang = 'en';
            document.documentElement.dir = 'ltr';
        }""", RICH_CHAT_SESSIONS)
        
        tasks = []

        # =====================================================================
        # PART 1: THE BOT SHOWCASE (دلع الشات بوت)
        # =====================================================================
        
        # 1. Bot Main Conversation & NASA Tool Execution Badges
        print("📸 Capturing: 01_bot_nasa_tools_conversation...")
        await page.goto(f"{BASE_URL}/chat", wait_until="domcontentloaded")
        await asyncio.sleep(2.0)
        raw_1 = os.path.join(RAW_DIR, "01_bot_nasa_tools_conversation.png")
        await page.screenshot(path=raw_1)
        create_clean_edge_mockup(raw_1, os.path.join(OUT_DIR, "01_bot_nasa_tools_conversation.png"))

        # 2. Bot Expanded Tool Drawer (Showing Raw NASA Telemetry & Calculations)
        print("📸 Capturing: 02_bot_tool_drawer_expanded...")
        # Click the first tool badge button to expand drawer
        await page.evaluate("""() => {
            const btn = document.querySelector("button[title*='telemetry'], button[title*='الأداة']");
            if (btn) btn.click();
        }""")
        await asyncio.sleep(1.0)
        raw_2 = os.path.join(RAW_DIR, "02_bot_tool_drawer_expanded.png")
        await page.screenshot(path=raw_2)
        create_clean_edge_mockup(raw_2, os.path.join(OUT_DIR, "02_bot_tool_drawer_expanded.png"))

        # 3. Bot Full Agronomic Decision & Rotation Strategy (Scrolled down)
        print("📸 Capturing: 03_bot_agronomic_recommendation_plan...")
        await page.evaluate("window.scrollTo(0, 360)")
        await asyncio.sleep(1.0)
        raw_3 = os.path.join(RAW_DIR, "03_bot_agronomic_recommendation_plan.png")
        await page.screenshot(path=raw_3)
        create_clean_edge_mockup(raw_3, os.path.join(OUT_DIR, "03_bot_agronomic_recommendation_plan.png"))

        # 4. Bot Sidebar: Multi-Session & Cross-Session Field Memory
        print("📸 Capturing: 04_bot_field_memory_sidebar...")
        # Click sidebar toggle button
        await page.evaluate("""() => {
            const btn = document.querySelector("button[title*='Sidebar'], button[title*='المحادثات']");
            if (btn) btn.click();
        }""")
        await asyncio.sleep(1.0)
        raw_4 = os.path.join(RAW_DIR, "04_bot_field_memory_sidebar.png")
        await page.screenshot(path=raw_4)
        create_clean_edge_mockup(raw_4, os.path.join(OUT_DIR, "04_bot_field_memory_sidebar.png"))

        # =====================================================================
        # PART 2: THE SCIENTIFIC & VISUAL PLATFORM
        # =====================================================================

        # 5. Satellite Parcel Map & Spaceborne Layers (SMAP 30m, HLS)
        print("📸 Capturing: 05_satellite_field_map...")
        await page.goto(f"{BASE_URL}/?tab=radar", wait_until="domcontentloaded")
        await asyncio.sleep(2.0)
        raw_5 = os.path.join(RAW_DIR, "05_satellite_field_map.png")
        await page.screenshot(path=raw_5)
        create_clean_edge_mockup(raw_5, os.path.join(OUT_DIR, "05_satellite_field_map.png"))

        # 6. Morning Vitals & 14-Day Early Warning Threat Gauge
        print("📸 Capturing: 06_14day_drought_early_warning...")
        await page.evaluate("window.scrollTo(0, 780)")
        await asyncio.sleep(1.5)
        raw_6 = os.path.join(RAW_DIR, "06_14day_drought_early_warning.png")
        await page.screenshot(path=raw_6)
        create_clean_edge_mockup(raw_6, os.path.join(OUT_DIR, "06_14day_drought_early_warning.png"))

        # 7. 3-Year Dynamic Crop Rotation Planner (TOPSIS Sliders & Strategies)
        print("📸 Capturing: 07_crop_rotation_topsis_planner...")
        await page.goto(f"{BASE_URL}/?tab=rotation", wait_until="domcontentloaded")
        await asyncio.sleep(2.0)
        await page.evaluate("window.scrollTo(0, 360)")
        await asyncio.sleep(1.0)
        raw_7 = os.path.join(RAW_DIR, "07_crop_rotation_topsis_planner.png")
        await page.screenshot(path=raw_7)
        create_clean_edge_mockup(raw_7, os.path.join(OUT_DIR, "07_crop_rotation_topsis_planner.png"))

        await context.close()
        await browser.close()
        print("🎉 Successfully generated 7 pristine, notch-less iPhone mockups in /presentation_mockups!")

if __name__ == "__main__":
    asyncio.run(capture_presentation_mockups())
