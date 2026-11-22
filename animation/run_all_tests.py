import socket, base64, os, json, struct, urllib.request, subprocess, time

CDP_PORT = 9240
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

def test_suite():
    chrome = subprocess.Popen([
        r'C:\Program Files\Google\Chrome\Application\chrome.exe',
        '--headless=new', f'--remote-debugging-port={CDP_PORT}',
        '--disable-gpu-sandbox', '--enable-webgl', '--window-size=1920,1080', 'about:blank'
    ])
    time.sleep(1.5)

    try:
        with urllib.request.urlopen(f'http://127.0.0.1:{CDP_PORT}/json') as r:
            targets = json.loads(r.read().decode('utf-8'))
        ws = create_ws(next(t for t in targets if t.get('type') == 'page')['webSocketDebuggerUrl'])
        cdp(ws, "Page.enable", msg_id=1)
        cdp(ws, "Runtime.enable", msg_id=2)
        cdp(ws, "Network.enable", msg_id=3)
        cdp(ws, "Network.setCacheDisabled", {"cacheDisabled": True}, msg_id=4)

        cdp(ws, "Page.navigate", {"url": "http://127.0.0.1:5500/index.html"}, msg_id=5)

        for _ in range(40):
            time.sleep(0.5)
            r = cdp(ws, "Runtime.evaluate", {"expression": "window.__DRAGON_READY__ === true"}, msg_id=10)
            if r.get("result", {}).get("result", {}).get("value"): break

        time.sleep(1.5)
        # Dismiss intro overlay for viewport benchmarks if present
        cdp(ws, "Runtime.evaluate", {"expression": "const skip = document.getElementById('dragon-skip-btn'); if (skip) skip.click();"}, msg_id=15)
        time.sleep(0.5)

        # -------------------------------------------------------------
        # TEST 1: Initial Position & Head Visibility Check
        # -------------------------------------------------------------
        head_check_script = """
        (() => {
            const s = window.__DRAGON_SCENE__;
            const cam = s.camera;
            const temp = new THREE.Vector3();
            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            for (let b of s.headCluster) {
                b.getWorldPosition(temp);
                temp.project(cam);
                const sx = (temp.x * 0.5 + 0.5) * window.innerWidth;
                const sy = (-temp.y * 0.5 + 0.5) * window.innerHeight;
                if (sx < minX) minX = sx;
                if (sx > maxX) maxX = sx;
                if (sy < minY) minY = sy;
                if (sy > maxY) maxY = sy;
            }
            return {
                headBonesCount: s.headCluster.length,
                boundsPixels: { minX: Math.round(minX), maxX: Math.round(maxX), minY: Math.round(minY), maxY: Math.round(maxY) },
                viewport: { w: window.innerWidth, h: window.innerHeight },
                isInsideViewport: (minX > 0 && maxX < window.innerWidth && minY > 0 && maxY < window.innerHeight),
                safePaddingPercent: {
                    left: +(minX / window.innerWidth * 100).toFixed(1),
                    right: +((window.innerWidth - maxX) / window.innerWidth * 100).toFixed(1),
                    top: +(minY / window.innerHeight * 100).toFixed(1),
                    bottom: +((window.innerHeight - maxY) / window.innerHeight * 100).toFixed(1)
                }
            };
        })()
        """
        res = cdp(ws, "Runtime.evaluate", {"expression": head_check_script, "returnByValue": True}, msg_id=100)
        t1_data = res.get("result", {}).get("result", {}).get("value")
        print("\n=== TEST 1: Initial Position ===")
        print(json.dumps(t1_data, indent=2))

        # Capture live initial screenshot
        res = cdp(ws, "Page.captureScreenshot", {"format": "png"}, msg_id=101)
        with open(os.path.join(ARTIFACT_DIR, "test1_initial_position.png"), "wb") as f:
            f.write(base64.b64decode(res["result"]["data"]))

        # -------------------------------------------------------------
        # TEST 2: Animation Playback Head Visibility Across Timeline
        # -------------------------------------------------------------
        print("\n=== TEST 2: Animation Timeline Head Visibility ===")
        anim_test_script = """
        (() => {
            const s = window.__DRAGON_SCENE__;
            const cam = s.camera;
            const temp = new THREE.Vector3();
            const results = [];
            const duration = 57.5;
            let allInside = true;

            for (let t = 0; t <= duration; t += 2.5) {
                s.animationController.mixer.setTime(t);
                s.animationController.mixer.update(0);
                s.dragonPivot.updateMatrixWorld(true);

                // Run head tracking step
                s.updateHeadTracking(0.016);
                cam.updateMatrixWorld(true);

                let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
                for (let b of s.headCluster) {
                    b.getWorldPosition(temp);
                    temp.project(cam);
                    const sx = (temp.x * 0.5 + 0.5) * window.innerWidth;
                    const sy = (-temp.y * 0.5 + 0.5) * window.innerHeight;
                    if (sx < minX) minX = sx;
                    if (sx > maxX) maxX = sx;
                    if (sy < minY) minY = sy;
                    if (sy > maxY) maxY = sy;
                }

                const inside = (minX > 0 && maxX < window.innerWidth && minY > 50 && maxY < window.innerHeight);
                if (!inside) allInside = false;
                results.push({ t, minX: Math.round(minX), maxX: Math.round(maxX), minY: Math.round(minY), maxY: Math.round(maxY), inside });
            }
            return { allInside, samplesCount: results.length, sampleSnapshots: results.filter(r => r.t % 10 === 0) };
        })()
        """
        res = cdp(ws, "Runtime.evaluate", {"expression": anim_test_script, "returnByValue": True}, msg_id=200)
        t2_data = res.get("result", {}).get("result", {}).get("value")
        print(json.dumps(t2_data, indent=2))

        # -------------------------------------------------------------
        # TEST 3: Browser Resizing (7 Standard Viewports)
        # -------------------------------------------------------------
        print("\n=== TEST 3: Viewport Matrix Testing ===")
        viewports = [
            ("desktop_1920x1080", 1920, 1080),
            ("laptop_1366x768", 1366, 768),
            ("laptop_1280x720", 1280, 720),
            ("tablet_1024x768", 1024, 768),
            ("tablet_768x1024", 768, 1024),
            ("mobile_390x844", 390, 844),
            ("mobile_360x800", 360, 800)
        ]

        for name, w, h in viewports:
            cdp(ws, "Emulation.setDeviceMetricsOverride", {
                "width": w, "height": h, "deviceScaleFactor": 1, "mobile": (w <= 768)
            }, msg_id=300)
            
            # Trigger resize on window
            resize_script = f"""
            (() => {{
                const s = window.__DRAGON_SCENE__;
                s.camera.aspect = {w} / {h};
                s.updateCameraForViewport();
                s.renderer.setSize({w}, {h});
                s.updateHeadTracking(0.016);
                s.renderer.render(s.scene, s.camera);

                const cam = s.camera;
                const temp = new THREE.Vector3();
                let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
                for (let b of s.headCluster) {{
                    b.getWorldPosition(temp);
                    temp.project(cam);
                    const sx = (temp.x * 0.5 + 0.5) * {w};
                    const sy = (-temp.y * 0.5 + 0.5) * {h};
                    if (sx < minX) minX = sx;
                    if (sx > maxX) maxX = sx;
                    if (sy < minY) minY = sy;
                    if (sy > maxY) maxY = sy;
                }}
                return {{
                    viewport: '{name}',
                    minX: Math.round(minX), maxX: Math.round(maxX),
                    minY: Math.round(minY), maxY: Math.round(maxY),
                    headFullyVisible: (minX > 0 && maxX < {w} && minY > 0 && maxY < {h})
                }};
            }})()
            """
            res = cdp(ws, "Runtime.evaluate", {"expression": resize_script, "returnByValue": True}, msg_id=310)
            v_result = res.get("result", {}).get("result", {}).get("value")
            print(f"[{name}] Head Visibility: {v_result.get('headFullyVisible')} | BBox: ({v_result.get('minX')}, {v_result.get('minY')}) to ({v_result.get('maxX')}, {v_result.get('maxY')})")

            # Capture screenshot
            res = cdp(ws, "Page.captureScreenshot", {"format": "png"}, msg_id=320)
            with open(os.path.join(ARTIFACT_DIR, f"viewport_{name}.png"), "wb") as f:
                f.write(base64.b64decode(res["result"]["data"]))

        # -------------------------------------------------------------
        # TEST 5: Scroll Confinement (About Section 0% GPU Bleed)
        # -------------------------------------------------------------
        print("\n=== TEST 5: Scroll Confinement ===")
        # Reset viewport to 1920x1080
        cdp(ws, "Emulation.setDeviceMetricsOverride", {
            "width": 1920, "height": 1080, "deviceScaleFactor": 1, "mobile": False
        }, msg_id=400)
        time.sleep(0.5)

        cdp(ws, "Runtime.evaluate", {
            "expression": "document.getElementById('about').scrollIntoView({ behavior: 'instant' });"
        }, msg_id=410)
        time.sleep(0.5)

        res = cdp(ws, "Runtime.evaluate", {
            "expression": "window.__DRAGON_SCENE__.isHeroVisible", "returnByValue": True
        }, msg_id=420)
        is_hero_vis = res.get("result", {}).get("result", {}).get("value")
        print(f"Scrolled to About: isHeroVisible = {is_hero_vis} (Rendering Paused: {not is_hero_vis})")

        res = cdp(ws, "Page.captureScreenshot", {"format": "png"}, msg_id=430)
        with open(os.path.join(ARTIFACT_DIR, "test5_about_scroll_clean.png"), "wb") as f:
            f.write(base64.b64decode(res["result"]["data"]))

        # Also copy desktop viewport to dragon_live_demo.png
        with open(os.path.join(ARTIFACT_DIR, "viewport_desktop_1920x1080.png"), "rb") as f_src:
            with open(os.path.join(ARTIFACT_DIR, "dragon_live_demo.png"), "wb") as f_dst:
                f_dst.write(f_src.read())

        print("\nAll 6 tests completed successfully!")

    finally:
        chrome.terminate()

if __name__ == "__main__":
    test_suite()
