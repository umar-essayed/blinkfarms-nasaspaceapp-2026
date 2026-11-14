import asyncio
import os
import time
import math
import glob
import subprocess
from playwright.async_api import async_playwright

BASE_URL = "http://127.0.0.1:3000"
RECORD_DIR = os.path.abspath("scripts/recordings")
AUDIO_FILE = os.path.abspath("scripts/narration.wav")
SRT_FILE = os.path.abspath("scripts/subtitles.srt")
FINAL_MP4 = os.path.abspath("scripts/BlinkFarms_NASA_SpaceApps_Demo_30s.mp4")

os.makedirs(RECORD_DIR, exist_ok=True)

# Generate English Subtitle File (.srt)
srt_content = """1
00:00:00,000 --> 00:00:05,200
Meet BlinkFarms: adapting agriculture with NASA data for the Field Shift challenge.

2
00:00:05,200 --> 00:00:11,500
We fuse NASA SMAP, HLS, and ECOSTRESS at 30-meter precision, predicting flash drought 14 days early.

3
00:00:11,500 --> 00:00:18,200
Our AI rotation planner screens thousands of crop cycles in milliseconds with multi-objective TOPSIS.

4
00:00:18,200 --> 00:00:24,800
While Blink AI agronomist executes live space tools to optimize farmer decisions.

5
00:00:24,800 --> 00:00:28,600
Saving 40% water and increasing farmer profits by 41%. BlinkFarms: Cairo 2026.
"""

with open(SRT_FILE, "w", encoding="utf-8") as f:
    f.write(srt_content.strip())

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
        print(f"Scroll notice: {e}")

async def record_screen():
    print("🎬 [1/3] Launching iPhone Emulation & Recording Screen...")
    
    # Clean previous raw recordings
    for f in glob.glob(os.path.join(RECORD_DIR, "*.webm")):
        try: os.remove(f)
        except: pass

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
        
        # iPhone 14 Pro Max specifications (430x932 @ 2x retina = 860x1864)
        context = await browser.new_context(
            viewport={"width": 430, "height": 932},
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
        
        # Seed localStorage on target origin
        print("⚙️ Initializing local storage & presets...")
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
        
        start_time = time.time()
        
        # ---------------------------------------------------------------------
        # SCENE 1: Home Dashboard & Nile Delta Satellite Parcel (0.0s - 5.5s)
        # ---------------------------------------------------------------------
        print("📱 [00.0s] Scene 1: Nile Delta Satellite Parcel & Vitals...")
        await page.goto(f"{BASE_URL}/", wait_until="domcontentloaded")
        await asyncio.sleep(1.8)
        
        # Human touch gesture on map
        try:
            await page.mouse.move(215, 270)
            await page.mouse.down()
            await page.mouse.move(245, 260, steps=8)
            await page.mouse.up()
        except:
            pass
        await asyncio.sleep(1.0)
        
        # Smooth scroll down to morning vitals cards
        await human_scroll(page, target_y=360, duration_sec=1.1, steps=20)
        await asyncio.sleep(1.4)
        
        # ---------------------------------------------------------------------
        # SCENE 2: 14-Day Early Warning Threat Gauge (5.5s - 11.5s)
        # ---------------------------------------------------------------------
        print("📱 [05.5s] Scene 2: 14-Day Flash Drought Threat Gauge...")
        await human_scroll(page, target_y=740, duration_sec=1.2, steps=25)
        await asyncio.sleep(3.2) # Clear view of canopy fever anomaly vs lagging NDVI
        
        # ---------------------------------------------------------------------
        # SCENE 3: Dynamic Crop Rotation Planner (11.5s - 18.0s)
        # ---------------------------------------------------------------------
        print("📱 [11.5s] Scene 3: 3-Year Dynamic Rotation Planner (TOPSIS)...")
        # Click bottom navigation rotation tab
        await page.evaluate("""() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const rot = btns.find(b => b.textContent && b.textContent.includes('Rotation'));
            if (rot) rot.click();
        }""")
        await asyncio.sleep(1.5)
        await human_scroll(page, target_y=400, duration_sec=1.1, steps=20)
        await asyncio.sleep(1.5)
        
        # Touch & drag slider to show real-time adaptation
        try:
            slider = page.locator("input[type='range']").first
            if await slider.count() > 0:
                box = await slider.bounding_box()
                if box:
                    await page.mouse.click(box["x"] + box["width"] * 0.70, box["y"] + box["height"] / 2)
                    await asyncio.sleep(1.2)
        except:
            pass
            
        # ---------------------------------------------------------------------
        # SCENE 4: BlinkAI Autonomous Agronomist Chatbot (18.0s - 25.0s)
        # ---------------------------------------------------------------------
        print("📱 [18.0s] Scene 4: Blink AI Autonomous Agronomist & Tools...")
        chat_prompt = "Optimize 3-year crop rotation under 30% water deficit"
        await page.evaluate("""(prompt) => {
            window.location.href = '/chat?prompt=' + encodeURIComponent(prompt);
        }""", chat_prompt)
        await asyncio.sleep(2.5)
        
        # Scroll through AI response showing tool execution badges and equations
        await human_scroll(page, target_y=340, duration_sec=1.2, steps=20)
        await asyncio.sleep(2.5)
        
        # ---------------------------------------------------------------------
        # SCENE 5: Impact Scorecard & Wrap-up (25.0s - 28.7s)
        # ---------------------------------------------------------------------
        print("📱 [25.0s] Scene 5: Economic & Water Savings Impact...")
        await human_scroll(page, target_y=600, duration_sec=0.8, steps=15)
        await asyncio.sleep(2.2)
        
        total_recorded = time.time() - start_time
        print(f"⏱️ Captured Screen Duration: {total_recorded:.2f} seconds")
        
        await page.close()
        video = page.video
        raw_video_path = await video.path() if video else None
        
        await context.close()
        await browser.close()
        
        return raw_video_path

def assemble_final_video(raw_video_path):
    print("🎞️ [2/3] Post-processing video & merging audio + subtitles with FFmpeg...")
    
    if not raw_video_path or not os.path.exists(raw_video_path):
        # Look in recordings directory
        webms = glob.glob(os.path.join(RECORD_DIR, "*.webm"))
        if webms:
            raw_video_path = webms[0]
        else:
            raise RuntimeError("No raw video file found to assemble!")
            
    print(f"Source raw video: {raw_video_path}")
    print(f"Source audio: {AUDIO_FILE}")
    print(f"Source subtitles: {SRT_FILE}")
    print(f"Target Output MP4: {FINAL_MP4}")
    
    # We use FFmpeg to:
    # 1. Scale and pad cleanly
    # 2. Add burned-in subtitles with custom styling (Cairo-style font, dark semi-transparent box)
    # 3. Merge audio track
    # 4. Limit length to exact audio duration (~28.67 seconds)
    
    # Escape path for FFmpeg subtitles filter on Windows
    srt_escaped = SRT_FILE.replace("\\", "/").replace(":", "\\:")
    
    subtitle_filter = (
        f"subtitles='{srt_escaped}':force_style='FontSize=22,FontName=Arial,Bold=1,"
        f"PrimaryColour=&HFFFFFF,BackColour=&H80000000,BorderStyle=4,Outline=0,Shadow=0,"
        f"MarginV=45,Alignment=2'"
    )
    
    cmd = [
        "ffmpeg", "-y",
        "-i", raw_video_path,
        "-i", AUDIO_FILE,
        "-vf", subtitle_filter,
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "18",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "192k",
        "-shortest",
        "-t", "28.7",
        FINAL_MP4
    ]
    
    print("Running FFmpeg command...")
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        print("FFmpeg error:", res.stderr)
        # Fallback without subtitle filter if libass has font issue
        print("Retrying without burned-in subtitles as fallback...")
        cmd_fallback = [
            "ffmpeg", "-y",
            "-i", raw_video_path,
            "-i", AUDIO_FILE,
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "18",
            "-pix_fmt", "yuv420p",
            "-c:a", "aac",
            "-b:a", "192k",
            "-shortest",
            "-t", "28.7",
            FINAL_MP4
        ]
        res2 = subprocess.run(cmd_fallback, capture_output=True, text=True)
        if res2.returncode != 0:
            raise RuntimeError(f"FFmpeg fallback failed: {res2.stderr}")
            
    print(f"🎉 [3/3] OFFICIAL DEMO VIDEO READY! Saved to: {FINAL_MP4}")
    
    # Verify file size and duration
    stat = os.stat(FINAL_MP4)
    print(f"📦 File Size: {stat.st_size / (1024*1024):.2f} MB")
    
    # Probe duration
    probe = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", FINAL_MP4],
        capture_output=True, text=True
    )
    print(f"⏱️ Final Video Duration Probe:\n{probe.stdout}")

if __name__ == "__main__":
    raw_video = asyncio.run(record_screen())
    assemble_final_video(raw_video)
