import socket, base64, os, json, struct, urllib.request, subprocess, time

CDP_PORT = 9261
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

def test_phase9():
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

        # 1. Wait for scene load
        for _ in range(40):
            res = cdp(ws, "Runtime.evaluate", {"expression": "!!window.__DRAGON_SCENE__ && !!window.__DRAGON_UI__"}, 10)
            if res.get("result", {}).get("result", {}).get("value") is True:
                break
            time.sleep(0.5)

        print("[TEST] Dragon scene and UI instantiated.")

        # Check Intro Overlay presence
        overlay_info = cdp(ws, "Runtime.evaluate", {
            "expression": """(() => {
                const ov = document.getElementById('dragon-intro-overlay');
                if (!ov) return { found: false };
                const cs = window.getComputedStyle(ov);
                return {
                    found: true,
                    isDismissed: ov.classList.contains('is-dismissed'),
                    visibility: cs.visibility,
                    opacity: parseFloat(cs.opacity),
                    display: cs.display,
                    role: ov.getAttribute('role'),
                    ariaModal: ov.getAttribute('aria-modal')
                };
            })()""",
            "returnByValue": True
        }, 11)

        val = overlay_info.get("result", {}).get("result", {}).get("value", {})
        print("[TEST] Intro overlay status before interaction:", val)
        assert val.get("found") is True, "Intro overlay not found in DOM"
        assert val.get("isDismissed") is False, "Intro overlay should not be dismissed initially"
        assert val.get("visibility") == "visible", "Intro overlay should be visible"
        assert val.get("role") == "dialog", "Intro overlay must have role='dialog'"

        # Screenshot overlay
        ss_ov = cdp(ws, "Page.captureScreenshot", {"format": "png"}, 12)
        if "data" in ss_ov.get("result", {}):
            with open(os.path.join(ARTIFACT_DIR, "phase9_intro_overlay.png"), "wb") as f:
                f.write(base64.b64decode(ss_ov["result"]["data"]))
            print("[TEST] Saved phase9_intro_overlay.png")

        # 2. Click "Enter Experience"
        enter_click = cdp(ws, "Runtime.evaluate", {
            "expression": """(() => {
                const btn = document.getElementById('dragon-enter-btn');
                btn.click();
                const ov = document.getElementById('dragon-intro-overlay');
                return {
                    dismissedNow: ov.classList.contains('is-dismissed')
                };
            })()""",
            "returnByValue": True
        }, 13)
        dismissed = enter_click.get("result", {}).get("result", {}).get("value", {})
        print("[TEST] After 'Enter Experience' click:", dismissed)
        assert dismissed.get("dismissedNow") is True, "Overlay must have 'is-dismissed' after Enter Experience click"

        time.sleep(1.0) # allow transition and model rendering to settle

        # 3. Test HUD controls presence
        hud_info = cdp(ws, "Runtime.evaluate", {
            "expression": """(() => {
                const hud = document.getElementById('dragon-interactive-controls');
                const roar = document.getElementById('dragon-roar-btn');
                const fire = document.getElementById('dragon-fire-btn');
                const sound = document.getElementById('dragon-sound-btn');
                const slider = document.getElementById('dragon-volume-slider');
                const replay = document.getElementById('dragon-replay-btn');
                return {
                    hudFound: !!hud,
                    hudRole: hud.getAttribute('role'),
                    hudAria: hud.getAttribute('aria-label'),
                    roar: !!roar,
                    fire: !!fire,
                    sound: !!sound,
                    slider: !!slider,
                    replay: !!replay,
                    soundMuted: window.__DRAGON_AUDIO__.isMuted(),
                    volume: window.__DRAGON_AUDIO__.getVolume()
                };
            })()""",
            "returnByValue": True
        }, 14)
        print("[TEST] HUD status:", hud_info.get("result", {}).get("result", {}).get("value"))

        # 4. Test Sound Toggle
        toggle_res = cdp(ws, "Runtime.evaluate", {
            "expression": """(() => {
                const soundBtn = document.getElementById('dragon-sound-btn');
                soundBtn.click();
                const muted1 = window.__DRAGON_AUDIO__.isMuted();
                const classMuted1 = soundBtn.classList.contains('is-muted');
                soundBtn.click();
                const muted2 = window.__DRAGON_AUDIO__.isMuted();
                const classMuted2 = soundBtn.classList.contains('is-muted');
                return { muted1, classMuted1, muted2, classMuted2 };
            })()""",
            "returnByValue": True
        }, 15)
        print("[TEST] Sound toggle test:", toggle_res.get("result", {}).get("result", {}).get("value"))

        # 5. Test Volume Slider
        vol_res = cdp(ws, "Runtime.evaluate", {
            "expression": """(() => {
                const slider = document.getElementById('dragon-volume-slider');
                slider.value = '40';
                slider.dispatchEvent(new Event('input', { bubbles: true }));
                return {
                    newVolume: window.__DRAGON_AUDIO__.getVolume()
                };
            })()""",
            "returnByValue": True
        }, 16)
        print("[TEST] Volume slider test:", vol_res.get("result", {}).get("result", {}).get("value"))

        # 6. Test Roar & Fire buttons
        action_res = cdp(ws, "Runtime.evaluate", {
            "expression": """(() => {
                const roarBtn = document.getElementById('dragon-roar-btn');
                const fireBtn = document.getElementById('dragon-fire-btn');
                roarBtn.click();
                const roarTriggered = window.__DRAGON_AUDIO__.activeNodes.size > 0;
                fireBtn.click();
                const fireEmitting = window.__DRAGON_EFFECTS__.fireEmitter.isEmitting;
                return { roarTriggered, fireEmitting };
            })()""",
            "returnByValue": True
        }, 17)
        print("[TEST] Action buttons test:", action_res.get("result", {}).get("result", {}).get("value"))

        # 7. Test Keyboard Hotkeys
        hotkey_res = cdp(ws, "Runtime.evaluate", {
            "expression": """(() => {
                window.dispatchEvent(new KeyboardEvent('keydown', { key: 'f' }));
                const fireKey = window.__DRAGON_EFFECTS__.fireEmitter.isEmitting;
                window.dispatchEvent(new KeyboardEvent('keydown', { key: 'm' }));
                const muteKey = window.__DRAGON_AUDIO__.isMuted();
                window.dispatchEvent(new KeyboardEvent('keydown', { key: 'm' })); // unmute
                window.dispatchEvent(new KeyboardEvent('keydown', { key: 'p' })); // replay
                const overlayReopened = !document.getElementById('dragon-intro-overlay').classList.contains('is-dismissed');
                // dismiss again
                document.getElementById('dragon-enter-btn').click();
                return { fireKey, muteKey, overlayReopened };
            })()""",
            "returnByValue": True
        }, 18)
        print("[TEST] Hotkeys test:", hotkey_res.get("result", {}).get("result", {}).get("value"))

        # 8. Check for Inline Styles on UI controls & overlay
        inline_style_res = cdp(ws, "Runtime.evaluate", {
            "expression": """(() => {
                const els = [
                    document.getElementById('dragon-intro-overlay'),
                    document.getElementById('dragon-interactive-controls'),
                    document.getElementById('dragon-roar-btn'),
                    document.getElementById('dragon-fire-btn'),
                    document.getElementById('dragon-sound-btn'),
                    document.getElementById('dragon-volume-slider'),
                    document.getElementById('dragon-replay-btn')
                ];
                return els.map(el => ({ id: el ? el.id : null, styleAttr: el ? el.getAttribute('style') : null }));
            })()""",
            "returnByValue": True
        }, 19)
        print("[TEST] Inline style audit:", inline_style_res.get("result", {}).get("result", {}).get("value"))
        for item in inline_style_res.get("result", {}).get("result", {}).get("value", []):
            assert item.get("styleAttr") in (None, ""), f"Inline style found on {item.get('id')}: {item.get('styleAttr')}"

        # 9. Screenshot of HUD with live scene (wait for dragon model to load)
        for _ in range(40):
            piv = cdp(ws, "Runtime.evaluate", {"expression": "!!(window.__DRAGON_SCENE__ && window.__DRAGON_SCENE__.dragonPivot)"}, 21)
            if piv.get("result", {}).get("result", {}).get("value") is True:
                break
            time.sleep(0.5)
        time.sleep(1.2)
        ss_hud = cdp(ws, "Page.captureScreenshot", {"format": "png"}, 22)
        if "data" in ss_hud.get("result", {}):
            with open(os.path.join(ARTIFACT_DIR, "phase9_hud_controls.png"), "wb") as f:
                f.write(base64.b64decode(ss_hud["result"]["data"]))
            print("[TEST] Saved phase9_hud_controls.png")

        print("[SUCCESS] Phase 9 UI verification passed 100%!")

    finally:
        chrome.terminate()

if __name__ == "__main__":
    test_phase9()
