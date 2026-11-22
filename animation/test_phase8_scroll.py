import socket, base64, os, json, struct, urllib.request, subprocess, time

CDP_PORT = 9260
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

def test_phase8():
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

        print("=== 1. Checking Dragon Scroll Controller Initialization ===")
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
                if (!s || !s.scrollController) return { error: 'No scroll controller found' };
                const sc = s.scrollController;
                return {
                    isInitialized: Boolean(sc),
                    targetProgress: sc.targetProgress,
                    smoothProgress: sc.smoothProgress,
                    scrollY: window.scrollY
                };
            })()
            """,
            "returnByValue": True
        }).get("result", {}).get("result", {}).get("value", {})
        print("Scroll Init Status:", json.dumps(init_status, indent=2))

        print("=== 2. Testing Midway Scroll (Y = 450px) ===")
        cdp(ws, "Runtime.evaluate", {
            "expression": "window.scrollTo({ top: 450, behavior: 'instant' });"
        })
        time.sleep(0.8)

        mid_status = cdp(ws, "Runtime.evaluate", {
            "expression": """
            (() => {
                const s = window.__DRAGON_SCENE__;
                const sc = s.scrollController;
                const camOff = sc.getCameraOffset();
                const posOff = sc.getDragonPosOffset();
                const rotOff = sc.getDragonRotOffset();
                return {
                    scrollY: window.scrollY,
                    targetProgress: sc.targetProgress,
                    smoothProgress: sc.smoothProgress,
                    cameraOffset: { x: camOff.x, y: camOff.y, z: camOff.z },
                    dragonPosOffset: { x: posOff.x, y: posOff.y, z: posOff.z },
                    dragonRotOffset: { x: rotOff.x, y: rotOff.y, z: rotOff.z }
                };
            })()
            """,
            "returnByValue": True
        }).get("result", {}).get("result", {}).get("value", {})
        print("Midway Scroll Status:", json.dumps(mid_status, indent=2))

        # Screenshot midway scroll
        ss_mid = cdp(ws, "Page.captureScreenshot", {"format": "png"})
        if "data" in ss_mid.get("result", {}):
            with open(os.path.join(ARTIFACT_DIR, "phase8_scroll_midway.png"), "wb") as f:
                f.write(base64.b64decode(ss_mid["result"]["data"]))
            print("Saved screenshot: phase8_scroll_midway.png")

        print("=== 3. Testing Deep Scroll to About Section (Y = 1200px) ===")
        cdp(ws, "Runtime.evaluate", {
            "expression": "window.scrollTo({ top: 1200, behavior: 'instant' });"
        })
        time.sleep(0.8)

        about_status = cdp(ws, "Runtime.evaluate", {
            "expression": """
            (() => {
                const s = window.__DRAGON_SCENE__;
                const sc = s.scrollController;
                return {
                    scrollY: window.scrollY,
                    targetProgress: sc.targetProgress,
                    smoothProgress: sc.smoothProgress,
                    isHeroVisible: s.isHeroVisible
                };
            })()
            """,
            "returnByValue": True
        }).get("result", {}).get("result", {}).get("value", {})
        print("About Section Scroll Status:", json.dumps(about_status, indent=2))

        # Screenshot About section
        ss_about = cdp(ws, "Page.captureScreenshot", {"format": "png"})
        if "data" in ss_about.get("result", {}):
            with open(os.path.join(ARTIFACT_DIR, "phase8_scroll_about.png"), "wb") as f:
                f.write(base64.b64decode(ss_about["result"]["data"]))
            print("Saved screenshot: phase8_scroll_about.png")

        print("=== 4. Testing Return Scroll to Top (Y = 0px) ===")
        cdp(ws, "Runtime.evaluate", {
            "expression": "window.scrollTo({ top: 0, behavior: 'instant' });"
        })
        time.sleep(0.8)

        top_status = cdp(ws, "Runtime.evaluate", {
            "expression": """
            (() => {
                const s = window.__DRAGON_SCENE__;
                const sc = s.scrollController;
                const posOff = sc.getDragonPosOffset();
                return {
                    scrollY: window.scrollY,
                    targetProgress: sc.targetProgress,
                    smoothProgress: sc.smoothProgress,
                    isHeroVisible: s.isHeroVisible,
                    dragonPosOffsetY: posOff.y
                };
            })()
            """,
            "returnByValue": True
        }).get("result", {}).get("result", {}).get("value", {})
        print("Return to Top Status:", json.dumps(top_status, indent=2))

        # Screenshot return to top
        ss_top = cdp(ws, "Page.captureScreenshot", {"format": "png"})
        if "data" in ss_top.get("result", {}):
            with open(os.path.join(ARTIFACT_DIR, "phase8_scroll_return.png"), "wb") as f:
                f.write(base64.b64decode(ss_top["result"]["data"]))
            print("Saved screenshot: phase8_scroll_return.png")

        print("Phase 8 scroll interaction tests completed successfully!")

    finally:
        chrome.kill()

if __name__ == "__main__":
    test_phase8()
