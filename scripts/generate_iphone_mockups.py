import asyncio
import os
from PIL import Image, ImageDraw, ImageFilter
from playwright.async_api import async_playwright

BASE_URL = "http://127.0.0.1:3000"
RAW_DIR = os.path.abspath("mockups/raw")
OUT_DIR = os.path.abspath("mockups")

os.makedirs(RAW_DIR, exist_ok=True)
os.makedirs(OUT_DIR, exist_ok=True)

def create_iphone_mockup(screen_img_path, output_path):
    """
    Wraps screen screenshot in a millimeter-precise, ultra-modern
    iPhone 15 Pro Titanium mockup with Dynamic Island, sleek bezels, and shadow.
    """
    screen = Image.open(screen_img_path).convert("RGBA")
    sw, sh = screen.size  # e.g. 860 x 1864

    # Phone frame parameters (proportional to screen)
    bezel = 24
    corner_radius = 90
    outer_w = sw + bezel * 2
    outer_h = sh + bezel * 2
    
    # Margin for soft drop shadow
    pad = 80
    canvas_w = outer_w + pad * 2
    canvas_h = outer_h + pad * 2

    # 1. Base transparent canvas
    canvas = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))

    # 2. Render Soft Multi-Layer Drop Shadow
    shadow_mask = Image.new("L", (canvas_w, canvas_h), 0)
    shadow_draw = ImageDraw.Draw(shadow_mask)
    shadow_draw.rounded_rectangle(
        [pad + 8, pad + 18, pad + outer_w - 8, pad + outer_h + 18],
        radius=corner_radius,
        fill=140
    )
    shadow_blurred = shadow_mask.filter(ImageFilter.GaussianBlur(radius=35))
    shadow_layer = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
    shadow_layer.putalpha(shadow_blurred)
    canvas = Image.alpha_composite(canvas, shadow_layer)

    # 3. Outer Titanium Chassis
    chassis = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
    chassis_draw = ImageDraw.Draw(chassis)
    
    # Dark Titanium metallic body
    chassis_draw.rounded_rectangle(
        [pad, pad, pad + outer_w, pad + outer_h],
        radius=corner_radius,
        fill=(28, 28, 30, 255),
        outline=(70, 70, 75, 255),
        width=4
    )
    
    # Inner border line
    chassis_draw.rounded_rectangle(
        [pad + 4, pad + 4, pad + outer_w - 4, pad + outer_h - 4],
        radius=corner_radius - 4,
        outline=(15, 15, 18, 255),
        width=6
    )
    canvas = Image.alpha_composite(canvas, chassis)

    # 4. Mask and composite screen content with rounded screen corners
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

    # 5. Dynamic Island at the top
    overlay = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
    overlay_draw = ImageDraw.Draw(overlay)
    
    island_w = int(sw * 0.29)
    island_h = int(island_w * 0.28)
    island_x0 = pad + bezel + (sw - island_w) // 2
    island_y0 = pad + bezel + 22
    
    # Dynamic Island pill
    overlay_draw.rounded_rectangle(
        [island_x0, island_y0, island_x0 + island_w, island_y0 + island_h],
        radius=island_h // 2,
        fill=(0, 0, 0, 255),
        outline=(20, 20, 20, 180),
        width=1
    )
    # Camera sensor reflection dot
    cam_r = 7
    overlay_draw.ellipse(
        [island_x0 + island_w - 28, island_y0 + island_h // 2 - cam_r,
         island_x0 + island_w - 28 + cam_r * 2, island_y0 + island_h // 2 + cam_r],
        fill=(15, 20, 35, 255)
    )

    # 6. iOS Home Indicator Bar at the bottom
    bar_w = int(sw * 0.36)
    bar_h = 10
    bar_x0 = pad + bezel + (sw - bar_w) // 2
    bar_y0 = pad + bezel + sh - 24
    overlay_draw.rounded_rectangle(
        [bar_x0, bar_y0, bar_x0 + bar_w, bar_y0 + bar_h],
        radius=bar_h // 2,
        fill=(255, 255, 255, 140)
    )

    canvas = Image.alpha_composite(canvas, overlay)
    canvas.save(output_path, "PNG", optimize=True)
    print(f"✨ Mockup saved: {output_path}")

async def capture_all_screens():
    print("📸 Starting High-Res Screen Captures...")
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            channel="msedge",
            headless=True,
            args=["--disable-blink-features=AutomationControlled", "--no-sandbox"]
        )
        
        # Exact iPhone 14/15 Pro Max viewport with 2x retina
        context = await browser.new_context(
            viewport={"width": 430, "height": 932},
            device_scale_factor=2,
            is_mobile=True,
            has_touch=True,
            locale="en-US"
        )
        page = await context.new_page()
        
        # Seed localStorage
        await page.goto(f"{BASE_URL}", wait_until="domcontentloaded")
        await page.evaluate("""() => {
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
            localStorage.setItem('blinkfarms_priorities', JSON.stringify({
                waterSaving: 0.85,
                profit: 0.90,
                soilHealth: 0.75,
                riskTolerance: 0.30
            }));
            document.documentElement.lang = 'en';
            document.documentElement.dir = 'ltr';
        }""")
        
        screens = [
            {
                "id": "01_satellite_parcel_map",
                "url": f"{BASE_URL}/?tab=radar",
                "scroll": 0,
                "sleep": 2.5
            },
            {
                "id": "02_morning_vitals_radar",
                "url": f"{BASE_URL}/?tab=radar",
                "scroll": 420,
                "sleep": 1.5
            },
            {
                "id": "03_14day_drought_threat_gauge",
                "url": f"{BASE_URL}/?tab=radar",
                "scroll": 820,
                "sleep": 2.0
            },
            {
                "id": "04_crop_rotation_topsis_planner",
                "url": f"{BASE_URL}/?tab=rotation",
                "scroll": 380,
                "sleep": 2.0
            },
            {
                "id": "05_blink_ai_autonomous_agronomist",
                "url": f"{BASE_URL}/chat?prompt=Suggest%20optimal%203-year%20rotation%20under%20water%20cuts",
                "scroll": 320,
                "sleep": 3.0
            }
        ]
        
        for item in screens:
            print(f"📷 Capturing {item['id']}...")
            await page.goto(item["url"], wait_until="domcontentloaded")
            await asyncio.sleep(item["sleep"])
            if item["scroll"] > 0:
                await page.evaluate(f"window.scrollTo(0, {item['scroll']})")
                await asyncio.sleep(1.0)
                
            raw_path = os.path.join(RAW_DIR, f"{item['id']}.png")
            await page.screenshot(path=raw_path)
            
            # Composite into iPhone mockup
            mockup_path = os.path.join(OUT_DIR, f"{item['id']}_iphone_mockup.png")
            create_iphone_mockup(raw_path, mockup_path)
            
        await context.close()
        await browser.close()
        print("🎉 All 5 iPhone Mockups successfully generated!")

if __name__ == "__main__":
    asyncio.run(capture_all_screens())
