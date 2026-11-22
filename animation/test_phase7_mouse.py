import socket, base64, os, json, struct, urllib.request, subprocess, time

CDP_PORT = 9255
ARTIFACT_DIR = r"C:\Users\Win10\.gemini\antigravity\brain\aec08c4f-75db-4119-ba24-b0eb0e60531b"

def create_ws(ws_url):
    parts = ws_url.replace("ws://", "").split("/", 1)
    hp = parts[0].split(":")
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.connect((hp[0], int(hp[1])))
    sec_key = base64.b64encode(os.urandom(16)).decode('utf-8')
    headers = [
        f"GET /{parts[1] if len(parts) > 1 else ''} HTTP/1.1",
        f"Host: {hp[0]}:{hp[1]}",
        "Upgrade: websocket", "Connection: Upgrade",
        f"Sec-WebSocket-Key: {sec_key}", "Sec-WebSocket-Version: 13", "\r\n"
    ]
    s.sendall("\r\n".join(headers).encode('utf-8'))
    resp = s.recv(4096).decode('utf-8', errors='ignore')
    if "101" not in resp: raise Exception("WS error")
    return s

def send_frame(s, msg):
    data = msg.encode('utf-8')
    mask = os.urandom(4)
    length = len(data)
    hdr = bytearray([0x81])
    if length <= 125: hdr.append(0x80 | length)
    elif length <= 65535: hdr.extend([0x80 | 126, length >> 8, length & 0xFF])
    else: hdr.extend([0x80 | 127] + list(struct.pack("!Q", length)))
    hdr.extend(mask)
    s.sendall(hdr + bytearray(b ^ mask[i % 4] for i, b in enumerate(data)))

def recv_frame(s):
    hdr = s.recv(2)
    if len(hdr) < 2: return None
    b2 = hdr[1]
    length = b2 & 0x7F
    if length == 126: length = struct.unpack("!H", s.recv(2))[0]
    elif length == 127: length = struct.unpack("!Q", s.recv(8))[0]
    mask = s.recv(4) if (b2 & 0x80) else None
    data = bytearray()
    while len(data) < length:
        chunk = s.recv(length - len(data))
        if not chunk: break
        data.extend(chunk)
    if mask: data = bytearray(b ^ mask[i % 4] for i, b in enumerate(data))
    return data.decode('utf-8', errors='ignore')

def cdp(ws, method, params=None, msg_id=1):
    send_frame(ws, json.dumps({"id": msg_id, "method": method, "params": params or {}}))
    while True:
        resp = recv_frame(ws)
        if not resp: break
        p = json.loads(resp)
        if p.get("id") == msg_id: return p
    return {}

def test_phase7():
    chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
    user_data = os.path.join(os.environ.get("TEMP", "C:\\temp"), f"cdp_profile_{CDP_PORT}")
    chrome = subprocess.Popen([
        chrome_path,
        f"--remote-debugging-port={CDP_PORT}",
        "--headless=new",
        f"--user-data-dir={user_data}",
        "--window-size=1920,1080",
        "--autoplay-policy=no-user-gesture-required",
        "http://localhost:5500/index.html"
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    time.sleep(2.5)

    try:
        tabs = json.loads(urllib.request.urlopen(f"http://localhost:{CDP_PORT}/json").read())
        target_tab = next(t for t in tabs if "localhost:5500" in t.get("url", ""))
        ws = create_ws(target_tab["webSocketDebuggerUrl"])

        cdp(ws, "Console.enable")
        cdp(ws, "Runtime.enable")

        print("=== 1. Checking Dragon Interactions System Initialization ===")
        # Wait for dragon ready
        for _ in range(30):
            res = cdp(ws, "Runtime.evaluate", {"expression": "Boolean(window.__DRAGON_READY__)"})
            if res.get("result", {}).get("result", {}).get("value"):
                break
            time.sleep(0.5)

        time.sleep(1.0)

        init_status = cdp(ws, "Runtime.evaluate", {
            "expression": """
            (() => {
                const s = window.__DRAGON_SCENE__;
                if (!s || !s.interactions) return { error: 'No interactions manager found' };
                const it = s.interactions;
                return {
                    isInitialized: Boolean(it),
                    targetX: it.targetX,
                    targetY: it.targetY,
                    maxYawDeg: Math.round(it.maxYaw * 180 / Math.PI),
                    maxPitchDeg: Math.round(it.maxPitch * 180 / Math.PI),
                    parallaxStrengthX: it.parallaxStrengthX,
                    parallaxStrengthY: it.parallaxStrengthY,
                    hasRoarButton: Boolean(document.getElementById('dragon-roar-btn')),
                    hasFireButton: Boolean(document.getElementById('dragon-fire-btn'))
                };
            })()
            """,
            "returnByValue": True
        }).get("result", {}).get("result", {}).get("value", {})
        print("Interactions Init Status:", json.dumps(init_status, indent=2))

        print("=== 2. Testing Mouse Left Pointer & Parallax ===")
        # Simulate moving mouse to upper-left (clientX: 200, clientY: 200 in 1920x1080)
        cdp(ws, "Input.dispatchMouseEvent", {
            "type": "mouseMoved",
            "x": 200,
            "y": 200
        })
        time.sleep(0.6)

        left_eval = cdp(ws, "Runtime.evaluate", {
            "expression": """
            (() => {
                const it = window.__DRAGON_INTERACTIONS__;
                const p = it.getParallaxOffset();
                return {
                    currentX: it.currentX,
                    currentY: it.currentY,
                    parallaxOffset: { x: p.x, y: p.y },
                    headYawDeg: Math.round(it.currentHeadYaw * 180 / Math.PI),
                    headPitchDeg: Math.round(it.currentHeadPitch * 180 / Math.PI)
                };
            })()
            """,
            "returnByValue": True
        }).get("result", {}).get("result", {}).get("value", {})
        print("Mouse Left Tracking Result:", json.dumps(left_eval, indent=2))

        # Screenshot mouse left
        ss_left = cdp(ws, "Page.captureScreenshot", {"format": "png"})
        if "data" in ss_left.get("result", {}):
            with open(os.path.join(ARTIFACT_DIR, "phase7_mouse_left.png"), "wb") as f:
                f.write(base64.b64decode(ss_left["result"]["data"]))
            print("Saved screenshot: phase7_mouse_left.png")

        print("=== 3. Testing Mouse Right Pointer & Parallax ===")
        # Simulate moving mouse to lower-right (clientX: 1720, clientY: 880 in 1920x1080)
        cdp(ws, "Input.dispatchMouseEvent", {
            "type": "mouseMoved",
            "x": 1720,
            "y": 880
        })
        time.sleep(0.6)

        right_eval = cdp(ws, "Runtime.evaluate", {
            "expression": """
            (() => {
                const it = window.__DRAGON_INTERACTIONS__;
                const p = it.getParallaxOffset();
                return {
                    currentX: it.currentX,
                    currentY: it.currentY,
                    parallaxOffset: { x: p.x, y: p.y },
                    headYawDeg: Math.round(it.currentHeadYaw * 180 / Math.PI),
                    headPitchDeg: Math.round(it.currentHeadPitch * 180 / Math.PI)
                };
            })()
            """,
            "returnByValue": True
        }).get("result", {}).get("result", {}).get("value", {})
        print("Mouse Right Tracking Result:", json.dumps(right_eval, indent=2))

        # Screenshot mouse right
        ss_right = cdp(ws, "Page.captureScreenshot", {"format": "png"})
        if "data" in ss_right.get("result", {}):
            with open(os.path.join(ARTIFACT_DIR, "phase7_mouse_right.png"), "wb") as f:
                f.write(base64.b64decode(ss_right["result"]["data"]))
            print("Saved screenshot: phase7_mouse_right.png")

        print("=== 4. Testing Accessible Buttons (Roar & Fire) ===")
        # Click roar button
        roar_click = cdp(ws, "Runtime.evaluate", {
            "expression": """
            (() => {
                const btn = document.getElementById('dragon-roar-btn');
                btn.click();
                return {
                    buttonFound: Boolean(btn),
                    hasAriaLabel: Boolean(btn.getAttribute('aria-label'))
                };
            })()
            """,
            "returnByValue": True
        }).get("result", {}).get("result", {}).get("value", {})
        print("Roar Button Click Result:", json.dumps(roar_click, indent=2))

        # Click fire button
        fire_click = cdp(ws, "Runtime.evaluate", {
            "expression": """
            (() => {
                const btn = document.getElementById('dragon-fire-btn');
                btn.click();
                return {
                    buttonFound: Boolean(btn),
                    isFiring: window.__DRAGON_EFFECTS__.isFiring
                };
            })()
            """,
            "returnByValue": True
        }).get("result", {}).get("result", {}).get("value", {})
        print("Fire Button Click Result:", json.dumps(fire_click, indent=2))

        print("Phase 7 mouse interaction tests completed successfully!")

    finally:
        chrome.kill()

if __name__ == "__main__":
    test_phase7()
