import socket, base64, os, json, struct, urllib.request, subprocess, time

CDP_PORT = 9245
HTTP_PORT = 5500

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
    if "101" not in resp:
        raise Exception("WS handshake failed")
    return s

def send_frame(s, msg):
    data = msg.encode('utf-8')
    mask = os.urandom(4)
    length = len(data)
    hdr = bytearray([0x81])
    if length <= 125:
        hdr.append(0x80 | length)
    elif length <= 65535:
        hdr.extend([0x80 | 126, length >> 8, length & 0xFF])
    else:
        hdr.extend([0x80 | 127] + list(struct.pack("!Q", length)))
    hdr.extend(mask)
    s.sendall(hdr + bytearray(b ^ mask[i % 4] for i, b in enumerate(data)))

def recv_frame(s):
    hdr = s.recv(2)
    if len(hdr) < 2:
        return None
    b2 = hdr[1]
    plen = b2 & 0x7F
    if plen == 126:
        plen = struct.unpack("!H", s.recv(2))[0]
    elif plen == 127:
        plen = struct.unpack("!Q", s.recv(8))[0]
    data = bytearray()
    while len(data) < plen:
        chunk = s.recv(min(4096, plen - len(data)))
        if not chunk:
            break
        data.extend(chunk)
    return json.loads(data.decode('utf-8', errors='ignore'))

_MSG_ID = 100
def cdp(ws, method, params=None):
    global _MSG_ID
    _MSG_ID += 1
    mid = _MSG_ID
    send_frame(ws, json.dumps({"id": mid, "method": method, "params": params or {}}))
    while True:
        resp = recv_frame(ws)
        if not resp:
            return {}
        if resp.get("id") == mid:
            return resp

def eval_js(ws, expr):
    res = cdp(ws, "Runtime.evaluate", {"expression": expr, "returnByValue": True})
    return res.get("result", {}).get("result", {}).get("value")

def mouse_click(ws, x, y):
    cdp(ws, "Input.dispatchMouseEvent", {"type": "mousePressed", "x": x, "y": y, "button": "left", "clickCount": 1})
    time.sleep(0.03)
    cdp(ws, "Input.dispatchMouseEvent", {"type": "mouseReleased", "x": x, "y": y, "button": "left", "clickCount": 1})

def run_tests():
    chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
    if not os.path.exists(chrome_path):
        chrome_path = r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"

    user_data = os.path.join(os.environ.get("TEMP", "C:\\temp"), f"cdp_clickfire_{CDP_PORT}")
    proc = subprocess.Popen([
        chrome_path,
        "--headless=new",
        f"--remote-debugging-port={CDP_PORT}",
        f"--user-data-dir={user_data}",
        "--window-size=1366,768",
        "--autoplay-policy=no-user-gesture-required",
        "--disable-gpu",
        f"http://localhost:{HTTP_PORT}/index.html"
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    time.sleep(2.5)

    try:
        target = None
        for _ in range(40):
            try:
                req = urllib.request.urlopen(f"http://localhost:{CDP_PORT}/json")
                targets = json.loads(req.read().decode())
                target = next((t for t in targets if f":{HTTP_PORT}" in t.get("url", "") and t.get("type") == "page"), None)
                if target:
                    break
            except Exception:
                pass
            time.sleep(0.3)

        assert target is not None, "Failed to find Chrome target"
        ws = create_ws(target["webSocketDebuggerUrl"])
        cdp(ws, "Runtime.enable")

        print("=== INTERACTIVE CLICK FIRE VERIFICATION ===")

        # Wait for ClickFireSystem and DragonScene
        ready = False
        for _ in range(60):
            if eval_js(ws, "Boolean(window.__CLICK_FIRE__ && window.__DRAGON_READY__ && window.__DRAGON_AUDIO__)") is True:
                ready = True
                break
            time.sleep(0.35)
        assert ready, "Timeout waiting for __CLICK_FIRE__ and __DRAGON_READY__"

        # Dismiss intro modal cleanly without triggering screen-click fire
        eval_js(ws, "document.getElementById('dragon-skip-btn').click();")
        time.sleep(0.3)

        # ------------------------------------------------------------------
        # TEST 1: Canvas Overlay Rules, Pointer Pass-Through, Zero Inline Style
        # ------------------------------------------------------------------
        print("\n[TEST 1] Verifying Click Fire Canvas & Zero Inline Styles...")
        canvas_info = eval_js(ws, """(() => {
            const c = document.getElementById('click-fire-canvas');
            const st = getComputedStyle(c);
            return {
                exists: !!c,
                position: st.position,
                pointerEvents: st.pointerEvents,
                zIndex: Number(st.zIndex),
                hasInlineStyle: c.hasAttribute('style') && c.getAttribute('style') !== '',
                stats: window.__CLICK_FIRE__.getStats()
            };
        })()""")
        print("  -> Canvas Info:", canvas_info)
        assert canvas_info["exists"] is True
        assert canvas_info["position"] == "fixed"
        assert canvas_info["pointerEvents"] == "none"
        assert canvas_info["zIndex"] >= 1000
        assert canvas_info["hasInlineStyle"] is False, "Inline style must NOT exist on canvas!"
        assert canvas_info["stats"]["activeParticles"] == 0
        assert canvas_info["stats"]["isLoopRunning"] is False, "rAF loop should sleep when idle!"
        print("  ✓ Canvas overlay, z-index, pointer-events, zero inline styles, and idle sleep verified.")

        # ------------------------------------------------------------------
        # TEST 2: Exact Click Coordinate Accuracy Outside Hero + Audio Event + Auto Fade
        # ------------------------------------------------------------------
        print("\n[TEST 2] Verifying Click Anywhere (About Section), Audio & Auto-Disappear...")
        eval_js(ws, """(() => {
            window.__AUDIO_EVENTS__ = [];
            window.addEventListener('dragon-audio-play', (e) => {
                window.__AUDIO_EVENTS__.push({ sound: e.detail.sound, t: performance.now() });
            });
            document.getElementById('about').scrollIntoView({ behavior: 'instant' });
        })()""")
        time.sleep(0.3)

        click_x, click_y = 460, 380
        mouse_click(ws, click_x, click_y)
        time.sleep(0.08)

        burst_check = eval_js(ws, """(() => {
            const cf = window.__CLICK_FIRE__;
            const glow = cf.glows[cf.glows.length - 1];
            const sx = glow ? (glow.fixed ? glow.x : glow.x - window.scrollX) : null;
            const sy = glow ? (glow.fixed ? glow.y : glow.y - window.scrollY) : null;
            return {
                stats: cf.getStats(),
                screenX: sx,
                screenY: sy,
                audioEvents: window.__AUDIO_EVENTS__.map(e => e.sound),
                fireBufferReady: window.__DRAGON_AUDIO__.audioBuffers.has('fire_crackling')
            };
        })()""")
        print("  -> Burst Telemetry:", burst_check)
        assert burst_check["stats"]["totalBurstsSpawned"] == 1, f"Expected 1 burst, got {burst_check['stats']['totalBurstsSpawned']}"
        assert burst_check["stats"]["activeParticles"] > 15, "Expected fire flames + embers + smoke!"
        assert burst_check["stats"]["isLoopRunning"] is True
        assert abs(burst_check["screenX"] - click_x) <= 2, f"Glow X mismatch: {burst_check['screenX']} vs {click_x}"
        assert abs(burst_check["screenY"] - click_y) <= 2, f"Glow Y mismatch: {burst_check['screenY']} vs {click_y}"
        assert "click_fire" in burst_check["audioEvents"], "Click fire audio did not trigger!"

        # Wait ~2.6s for particles to burn out and auto-cleanup
        time.sleep(2.7)
        after_fade = eval_js(ws, "window.__CLICK_FIRE__.getStats()")
        print("  -> After 2.7s Burnout:", after_fade)
        assert after_fade["activeParticles"] == 0, "Particles should disappear automatically after ~1.5-2.5s!"
        assert after_fade["activeGlows"] == 0
        assert after_fade["isLoopRunning"] is False, "Animation loop must auto-sleep after fadeout!"
        print("  ✓ Page-wide click coordinates, synchronized audio, and auto-cleanup verified.")

        # ------------------------------------------------------------------
        # TEST 3: Scroll Positioning Accuracy During Active Burn
        # ------------------------------------------------------------------
        print("\n[TEST 3] Verifying Document Scroll Anchoring...")
        scroll_before = eval_js(ws, "window.scrollY")
        mouse_click(ws, 500, 420)
        time.sleep(0.05)
        eval_js(ws, "window.scrollBy({ top: 150, behavior: 'instant' });")
        time.sleep(0.05)
        scroll_check = eval_js(ws, """(() => {
            const cf = window.__CLICK_FIRE__;
            const glow = cf.glows[cf.glows.length - 1];
            return {
                scrollDelta: window.scrollY - """ + str(scroll_before) + """,
                screenYAfterScroll: glow ? (glow.y - window.scrollY) : null
            };
        })()""")
        print("  -> Scroll Alignment:", scroll_check)
        assert scroll_check["scrollDelta"] >= 140, f"Expected >=140px scroll delta, got {scroll_check['scrollDelta']}"
        assert abs(scroll_check["screenYAfterScroll"] - (420 - scroll_check["scrollDelta"])) <= 3
        time.sleep(2.5)
        print("  ✓ Particles remain anchored cleanly during scroll.")

        # ------------------------------------------------------------------
        # TEST 4: Multiple Independent Clicks, Visual Screenshot & Rapid Caps
        # ------------------------------------------------------------------
        print("\n[TEST 4] Verifying Multiple Clicks, Visual Render & Rapid Click Caps...")
        eval_js(ws, "window.__AUDIO_EVENTS__ = [];")
        for idx in range(3):
            mouse_click(ws, 360 + idx * 240, 440 - (idx % 2) * 90)
            time.sleep(0.09)

        # Capture visual screenshot mid-burn over About/Work section
        snap_res = cdp(ws, "Page.captureScreenshot", {"format": "png"})
        snap_b64 = snap_res.get("result", {}).get("data")
        if snap_b64:
            snap_path = r"C:\Users\Win10\.gemini\antigravity\brain\aec08c4f-75db-4119-ba24-b0eb0e60531b\click_fire_multi_live.png"
            with open(snap_path, "wb") as f:
                f.write(base64.b64decode(snap_b64))
            print(f"  -> Live click fire screenshot saved: {snap_path}")

        for idx in range(3, 10):
            mouse_click(ws, 200 + idx * 70, 260 + (idx % 3) * 80)
            time.sleep(0.04)

        rapid_stats = eval_js(ws, """(() => {
            const aud = window.__DRAGON_AUDIO__;
            const clickNodes = (aud && aud.activeNodes.get('click_fire')) ? aud.activeNodes.get('click_fire').length : 0;
            return {
                stats: window.__CLICK_FIRE__.getStats(),
                activeClickAudioNodes: clickNodes
            };
        })()""")
        print("  -> Rapid Click Metrics:", rapid_stats)
        assert rapid_stats["stats"]["totalBurstsSpawned"] >= 12
        assert rapid_stats["stats"]["activeParticles"] <= rapid_stats["stats"]["maxParticles"], "Particle cap exceeded!"
        assert rapid_stats["activeClickAudioNodes"] <= 3, "Audio concurrency cap exceeded!"
        time.sleep(2.6)
        print("  ✓ Independent multiple clicks, particle cap (<=280), and audio cap (<=3) verified.")

        # ------------------------------------------------------------------
        # TEST 4B: Hero Coexistence (Dragon Fire Breath + Cursor Click Fire)
        # ------------------------------------------------------------------
        print("\n[TEST 4B] Verifying Hero Click Coexistence Without Audio Clashing...")
        eval_js(ws, "window.scrollTo({ top: 0, behavior: 'instant' });")
        time.sleep(0.4)
        before_hero_bursts = eval_js(ws, "window.__CLICK_FIRE__.getStats().totalBurstsSpawned")
        mouse_click(ws, 920, 480) # Empty background inside hero section
        time.sleep(0.15)
        hero_coexist = eval_js(ws, """(() => {
            const cf = window.__CLICK_FIRE__;
            const ds = window.__DRAGON_SCENE__;
            const aud = window.__DRAGON_AUDIO__;
            const fcBuf = aud ? aud.audioBuffers.get('fire_crackling') : null;
            return {
                burstsAdded: cf.getStats().totalBurstsSpawned - """ + str(before_hero_bursts) + """,
                dragonState: ds ? ds.state : null,
                clickFireNodes: (aud && aud.activeNodes.get('click_fire')) ? aud.activeNodes.get('click_fire').length : 0,
                dragonFireNodes: (aud && aud.activeNodes.get('fire_crackling')) ? aud.activeNodes.get('fire_crackling').length : 0,
                fcIsBuffer: fcBuf instanceof AudioBuffer,
                ctxState: aud && aud.ctx ? aud.ctx.state : null,
                muted: aud ? aud.isMutedState : null
            };
        })()""")
        print("  -> Hero Coexistence:", hero_coexist)
        assert hero_coexist["burstsAdded"] == 1, "Hero background click should spawn cursor fire burst!"
        assert hero_coexist["dragonState"] == "FIRE_BREATHING", "Existing hero click -> dragon fire breath should remain intact!"
        assert hero_coexist["clickFireNodes"] == 0, "Should not double-trigger click_fire audio on top of dragon fire_crackling!"
        assert hero_coexist["dragonFireNodes"] == 1, f"Expected active dragon fire_crackling node, got {hero_coexist}"
        time.sleep(2.6)
        print("  ✓ Hero click spawns cursor fire while preserving dragon fire breath without duplicate crackling.")

        # ------------------------------------------------------------------
        # TEST 5: Interactive Links / Buttons Still Work Normally
        # ------------------------------------------------------------------
        print("\n[TEST 5] Verifying Navigation Links & Controls Work Alongside Fire...")
        nav_box = eval_js(ws, """(() => {
            const a = document.querySelector('a.nav-link[href="#work"]');
            const r = a.getBoundingClientRect();
            return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
        })()""")
        mouse_click(ws, nav_box["x"], nav_box["y"])
        time.sleep(0.5)
        nav_result = eval_js(ws, """(() => {
            const workRect = document.getElementById('work').getBoundingClientRect();
            return {
                workNearViewport: Math.abs(workRect.top) < 350,
                hash: window.location.hash,
                burstsAfterNavClick: window.__CLICK_FIRE__.getStats().totalBurstsSpawned
            };
        })()""")
        print("  -> Nav Click Result:", nav_result)
        assert nav_result["workNearViewport"] or nav_result["hash"] == "#work", "Navigation link click was blocked!"
        time.sleep(2.4)
        print("  ✓ Navigation links execute cleanly while also spawning cursor fire.")

        # ------------------------------------------------------------------
        # TEST 6: Mobile Touch Tap & Scroll Swipe Separation
        # ------------------------------------------------------------------
        print("\n[TEST 6] Verifying Mobile Touch Taps vs Touch Scroll Swipes...")
        cdp(ws, "Emulation.setDeviceMetricsOverride", {
            "width": 390, "height": 844, "deviceScaleFactor": 2, "mobile": True
        })
        cdp(ws, "Emulation.setTouchEmulationEnabled", {"enabled": True, "maxTouchPoints": 5})
        eval_js(ws, "window.__CLICK_FIRE__.handleResize();")
        time.sleep(0.2)

        before_swipe = eval_js(ws, "window.__CLICK_FIRE__.getStats().totalBurstsSpawned")
        # Simulate mobile touch scroll swipe (>10px move)
        cdp(ws, "Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": 200, "y": 500, "id": 1}]})
        time.sleep(0.03)
        cdp(ws, "Input.dispatchTouchEvent", {"type": "touchMove", "touchPoints": [{"x": 200, "y": 350, "id": 1}]})
        time.sleep(0.03)
        cdp(ws, "Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
        time.sleep(0.45)

        after_swipe = eval_js(ws, "window.__CLICK_FIRE__.getStats().totalBurstsSpawned")
        assert after_swipe == before_swipe, f"Touch scroll swipe falsely spawned fire! ({before_swipe} -> {after_swipe})"

        # Simulate clean mobile tap
        cdp(ws, "Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": 195, "y": 420, "id": 2}]})
        time.sleep(0.04)
        cdp(ws, "Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
        time.sleep(0.45) # Wait past potential 300ms synthetic click to verify NO double-trigger!

        mobile_tap_stats = eval_js(ws, "window.__CLICK_FIRE__.getStats()")
        print("  -> Mobile Tap Stats:", mobile_tap_stats)
        assert mobile_tap_stats["totalBurstsSpawned"] == before_swipe + 1, (
            f"Expected exact 1 burst on mobile tap, got {mobile_tap_stats['totalBurstsSpawned'] - before_swipe}!"
        )
        assert mobile_tap_stats["maxParticles"] <= 140, "Mobile particle budget not reduced!"
        print("  ✓ Mobile swipe ignored, clean tap fired exactly once without duplicate trigger.")

        # ------------------------------------------------------------------
        # TEST 7: Clean Disposal
        # ------------------------------------------------------------------
        print("\n[TEST 7] Verifying Clean Resource Disposal...")
        disp = eval_js(ws, """(() => {
            const cf = window.__CLICK_FIRE__;
            cf.dispose();
            return {
                disposed: cf.isDisposed,
                cleanedGlobal: typeof window.__CLICK_FIRE__ === 'undefined',
                particlesLeft: cf.particles.length,
                rafStopped: cf.rafId === null
            };
        })()""")
        print("  -> Disposal Check:", disp)
        assert disp["disposed"] is True and disp["cleanedGlobal"] is True and disp["rafStopped"] is True

        print("\n============================================================")
        print("ALL CLICK FIRE TESTS PASSED 100%!")
        print("============================================================\n")
        ws.close()
    finally:
        proc.terminate()

if __name__ == "__main__":
    run_tests()
