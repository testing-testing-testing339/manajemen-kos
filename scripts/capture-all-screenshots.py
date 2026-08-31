import asyncio
from playwright.async_api import async_playwright
import os

async def main():
    out_dir = r"d:\coding\manajemen-kos\scripts\screenshots"
    os.makedirs(out_dir, exist_ok=True)
    chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            executable_path=chrome_path,
            headless=True
        )

        # 1. Capture Mobile Tamu Check-In
        context_mobile = await browser.new_context(
            viewport={"width": 412, "height": 892},
            device_scale_factor=2,
            is_mobile=True
        )
        page_mobile = await context_mobile.new_page()
        await page_mobile.goto("http://localhost:3000/check-in/8b8a75ca-d0c9-4b45-ad31-8743cd8c3bbc?dev=true")
        await page_mobile.wait_for_load_state("networkidle")
        await asyncio.sleep(1)
        await page_mobile.screenshot(path=os.path.join(out_dir, "ss_tamu_step1.png"))

        # Click next to show Step 4 / payment if possible
        try:
            # Auto fill button in dev mode
            await page_mobile.click("button:has-text('Contoh Data')")
            await asyncio.sleep(0.5)
            # Click lanjut to step 6
            for _ in range(5):
                btn = page_mobile.locator("button:has-text('Lanjut')")
                if await btn.count() > 0:
                    await btn.first.click()
                    await asyncio.sleep(0.5)
            await page_mobile.screenshot(path=os.path.join(out_dir, "ss_tamu_payment.png"))
        except Exception as e:
            print("Mobile step forward info:", e)

        await context_mobile.close()

        # 2. Capture Desktop Dashboard
        context_desktop = await browser.new_context(
            viewport={"width": 1280, "height": 800},
            device_scale_factor=2
        )
        page = await context_desktop.new_page()

        # Login
        await page.goto("http://localhost:3000/login")
        await page.wait_for_load_state("networkidle")
        await page.screenshot(path=os.path.join(out_dir, "ss_login.png"))

        await page.fill("input[name='email']", "admin@graha.com")
        await page.fill("input[name='password']", "password123")
        await page.click("button[type='submit']")
        await page.wait_for_url("**/dashboard**", timeout=10000)
        await page.wait_for_load_state("networkidle")
        await asyncio.sleep(1.5)

        # Dashboard Overview
        await page.screenshot(path=os.path.join(out_dir, "ss_dashboard.png"))

        # Check-in Manager
        await page.goto("http://localhost:3000/dashboard/check-ins")
        await page.wait_for_load_state("networkidle")
        await asyncio.sleep(1)
        await page.screenshot(path=os.path.join(out_dir, "ss_checkin_manager.png"))

        # Penghuni
        await page.goto("http://localhost:3000/dashboard/penghuni")
        await page.wait_for_load_state("networkidle")
        await asyncio.sleep(1)
        await page.screenshot(path=os.path.join(out_dir, "ss_penghuni.png"))

        # Pembayaran & Kas Shift
        await page.goto("http://localhost:3000/dashboard/pembayaran")
        await page.wait_for_load_state("networkidle")
        await asyncio.sleep(1)
        await page.screenshot(path=os.path.join(out_dir, "ss_pembayaran.png"))

        # Kamar
        await page.goto("http://localhost:3000/dashboard/kamar")
        await page.wait_for_load_state("networkidle")
        await asyncio.sleep(1)
        await page.screenshot(path=os.path.join(out_dir, "ss_kamar.png"))

        await browser.close()
        print("ALL SCREENSHOTS CAPTURED SUCCESSFULLY!")

asyncio.run(main())
