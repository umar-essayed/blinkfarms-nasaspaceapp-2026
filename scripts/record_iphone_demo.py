import asyncio
import os
import time
import math
import glob
import subprocess
from playwright.async_api import async_playwright

BASE_URL = "http://127.0.0.1:3000"
RECORD_DIR = os.path.abspath("scripts/recordings")
FINAL_MP4 = os.path.abspath("scripts/BlinkFarms_iPhone_Demo_30s.mp4")

os.makedirs(RECORD_DIR, exist_ok=True)

# Clean previous recordings
for f in glob.glob(os.path.join(RECORD_DIR, "*.webm")):
    try:
        os.remove(f)
    except:
        pass

async def human_scroll(page, target_y, duration_sec=1.2, steps=25):
    """Simulates smooth human-like scrolling with easing."""
    try:
        start_y = await page.evaluate("window.scrollY || 0")
        distance = target_y - start_y
        step_duration = duration_sec / steps
        for i in range(1, steps + 1):
            t = i / steps
            ease = 0.5 - 0.5 * math.cos(math.pi * t)
            current_y = start_y + distance * ease
            await page.evaluate(f"window.scrollTo(0, {current_y})")
            await asyncio.sleep(step_duration)
    except Exception as e:
        print(f"Scroll error: {e}")

async def record_demo():
    print("🚀 Starting High-Precision Automated iPhone Demo Recording...")
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            channel="msedge",
            headless=True,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
                "--hide-scrollbars"
            ]
        )
        
        # iPhone 14 Pro Max specifications
        iphone_viewport = {"width": 430, "height": 932}
        
        context = await browser.new_context(
            viewport=iphone_viewport,
            screen={"width": 430, "height": 932},
            device_scale_factor=2,
            is_mobile=True,
            has_touch=True,
            locale="en-US",
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
            record_video_dir=RECORD_DIR,
            record_video_size={"width": 860, "height": 1864}
        )
        
        page = await context.new_page()
        
        # 1. First visit to initialize origin, then set localStorage
        print("⏱️ Initializing origin & storage...")
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
        
        # =====================================================================
        # SCENE 1: Home Dashboard & Satellite Parcel Map (0.0s - 5.5s)
        # =====================================================================
        start_time = time.time()
        print("⏱️ [00s] Loading Nile Delta Parcel & Morning Vitals...")
        await page.goto(f"{BASE_URL}/?tab=radar", wait_until="domcontentloaded")
        await asyncio.sleep(1.5)
        
        # Touch gesture on map
        try:
            await page.mouse.move(215, 280)
            await page.mouse.down()
            await page.mouse.move(235, 270, steps=6)
            await page.mouse.up()
        except:
            pass
        await asyncio.sleep(1.0)
        
        # Scroll down to morning vitals
        print("⏱️ [03s] Revealing Morning Vitals...")
        await human_scroll(page, target_y=380, duration_sec=1.2, steps=20)
        await asyncio.sleep(1.2)
        
        # =====================================================================
        # SCENE 2: 14-Day Early Warning Threat Gauge (5.5s - 11.5s)
        # =====================================================================
        print("⏱️ [06s] Showing 14-Day Flash Drought Early Warning...")
        await human_scroll(page, target_y=750, duration_sec=1.2, steps=20)
        await asyncio.sleep(2.5) # Let the thermal anomaly & stomatal fever graph be visible
        
        # =====================================================================
        # SCENE 3: Dynamic Crop Rotation Planner (11.5s - 18.5s)
        # =====================================================================
        print("⏱️ [12s] Switching to 3-Year Crop Rotation Planner...")
        await page.goto(f"{BASE_URL}/?tab=rotation", wait_until="domcontentloaded")
        await asyncio.sleep(1.5)
        await human_scroll(page, target_y=380, duration_sec=1.2, steps=20)
        await asyncio.sleep(1.5)
        
        # Smoothly drag slider
        try:
            slider = page.locator("input[type='range']").first
            if await slider.count() > 0:
                box = await slider.bounding_box()
                if box:
                    await page.mouse.click(box["x"] + box["width"] * 0.70, box["y"] + box["height"] / 2)
                    await asyncio.sleep(1.2)
        except:
            pass
            
        # =====================================================================
        # SCENE 4: BlinkAI Autonomous Agronomist Chatbot (18.5s - 25.5s)
        # =====================================================================
        print("⏱️ [19s] Opening BlinkAI Autonomous Agronomist Chat...")
        chat_prompt = "Optimize 3-year crop rotation under 30% water deficit"
        await page.goto(f"{BASE_URL}/chat?prompt={chat_prompt}", wait_until="domcontentloaded")
        await asyncio.sleep(2.5)
        
        # Scroll through AI response showing tool badges and biophysical calculations
        await human_scroll(page, target_y=320, duration_sec=1.2, steps=20)
        await asyncio.sleep(2.5)
        
        # =====================================================================
        # SCENE 5: Impact Scorecard & Wrap-up (25.5s - 28.5s)
        # =====================================================================
        print("⏱️ [26s] Final impact scorecard hold...")
        await human_scroll(page, target_y=550, duration_sec=0.8, steps=15)
        await asyncio.sleep(2.0)
        
        elapsed = time.time() - start_time
        print(f"✅ Total Captured Duration: {elapsed:.2f} seconds")
        
        # Close page to flush video
        await page.close()
        video = page.video
        video_path = await video.path() if video else None
        print(f"🎬 Raw WebM Video Saved at: {video_path}")
        
        await context.close()
        await browser.close()
        
        return video_path

if __name__ == "__main__":
    raw_video = asyncio.run(record_demo())
    print("SUCCESS! RAW VIDEO PATH:", raw_video)
