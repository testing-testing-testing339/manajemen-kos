import subprocess
import time
import os

chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
out_dir = r"d:\coding\manajemen-kos\scripts\screenshots"
os.makedirs(out_dir, exist_ok=True)

# 1. Customer Check-In Mobile
cmd_checkin = [
    chrome_path,
    "--headless=new",
    "--disable-gpu",
    "--window-size=412,892",
    f"--screenshot={os.path.join(out_dir, '1_tamu_checkin.png')}",
    "http://localhost:3000/check-in/8b8a75ca-d0c9-4b45-ad31-8743cd8c3bbc?dev=true"
]
subprocess.run(cmd_checkin, capture_output=True)

# 2. Login Page
cmd_login = [
    chrome_path,
    "--headless=new",
    "--disable-gpu",
    "--window-size=1200,800",
    f"--screenshot={os.path.join(out_dir, '2_login_resepsionis.png')}",
    "http://localhost:3000/login"
]
subprocess.run(cmd_login, capture_output=True)

# Check created files
for f in os.listdir(out_dir):
    print(f, os.path.getsize(os.path.join(out_dir, f)), "bytes")
