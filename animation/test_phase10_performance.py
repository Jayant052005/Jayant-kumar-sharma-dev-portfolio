import socket, base64, os, json, struct, urllib.request, subprocess, time

CDP_PORT = 9262
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

def test_phase10():
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

        # Wait for scene initialization and model loading
        for _ in range(40):
            res = cdp(ws, "Runtime.evaluate", {"expression": "!!(window.__DRAGON_SCENE__ && window.__DRAGON_SCENE__.dragonPivot)"}, 1)
            if res.get("result", {}).get("result", {}).get("value") is True:
                break
            time.sleep(0.5)

        print("[TEST 1] Scene & Model successfully loaded.")

        # Dismiss intro overlay
        cdp(ws, "Runtime.evaluate", {"expression": "const btn = document.getElementById('dragon-skip-btn'); if (btn) btn.click();"}, 2)
        time.sleep(0.5)

        # -------------------------------------------------------------
        # 1. DPR & Pixel Ratio Clamping Check
        # -------------------------------------------------------------
        dpr_check = cdp(ws, "Runtime.evaluate", {
            "expression": """(() => {
                const s = window.__DRAGON_SCENE__;
                return {
                    pixelRatio: s.renderer.getPixelRatio(),
                    clampedToMax2: s.renderer.getPixelRatio() <= 2.0
                };
            })()""",
            "returnByValue": True
        }, 10)
        dpr_val = dpr_check.get("result", {}).get("result", {}).get("value", {})
        print("[TEST 1] Desktop DPR Capping:", dpr_val)
        assert dpr_val.get("clampedToMax2") is True, "Desktop DPR exceeds 2.0 clamp!"

        # Simulate 3x Mobile screen resize
        mobile_dpr_check = cdp(ws, "Runtime.evaluate", {
            "expression": """(() => {
                const s = window.__DRAGON_SCENE__;
                // Temporarily mock mobile devicePixelRatio and touch points
                Object.defineProperty(window, 'devicePixelRatio', { value: 3.0, configurable: true });
                Object.defineProperty(navigator, 'maxTouchPoints', { value: 5, configurable: true });
                s._onResize();
                const mobileDpr = s.renderer.getPixelRatio();
                return {
                    simulatedDpr: mobileDpr,
                    clampedToMobile1_5: mobileDpr <= 1.5
                };
            })()""",
            "returnByValue": True
        }, 11)
        mob_val = mobile_dpr_check.get("result", {}).get("result", {}).get("value", {})
        print("[TEST 1] Mobile 3x DPR Capping to 1.5:", mob_val)
        assert mob_val.get("clampedToMobile1_5") is True, f"Mobile DPR was not clamped to 1.5: {mob_val}"

        # -------------------------------------------------------------
        # 2. Frustum Culling & Texture Anisotropy Optimization
        # -------------------------------------------------------------
        opt_check = cdp(ws, "Runtime.evaluate", {
            "expression": """(() => {
                const s = window.__DRAGON_SCENE__;
                let meshesCount = 0;
                let allFrustumCulled = true;
                let maxAnisotropy = 0;
                s.scene.traverse((obj) => {
                    if (obj.isMesh) {
                        meshesCount++;
                        if (!obj.frustumCulled) allFrustumCulled = false;
                        if (obj.material) {
                            const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
                            for (let m of mats) {
                                for (let p of ['map', 'normalMap', 'roughnessMap', 'metalnessMap']) {
                                    if (m[p] && m[p].anisotropy > maxAnisotropy) {
                                        maxAnisotropy = m[p].anisotropy;
                                    }
                                }
                            }
                        }
                    }
                });
                return {
                    meshesCount,
                    allFrustumCulled,
                    maxAnisotropy,
                    anisotropyCapped: maxAnisotropy <= 4
                };
            })()""",
            "returnByValue": True
        }, 12)
        opt_val = opt_check.get("result", {}).get("result", {}).get("value", {})
        print("[TEST 2] Frustum Culling & Texture Anisotropy:", opt_val)
        assert opt_val.get("allFrustumCulled") is True, "Not all meshes have frustum culling enabled!"
        assert opt_val.get("anisotropyCapped") is True, f"Texture anisotropy {opt_val.get('maxAnisotropy')} exceeds 4!"

        # -------------------------------------------------------------
        # 3. Particle Throttling
        # -------------------------------------------------------------
        particle_check = cdp(ws, "Runtime.evaluate", {
            "expression": """(() => {
                const eff = window.__DRAGON_EFFECTS__;
                const embersCount = eff.embers ? eff.embers.geometry.attributes.position.count : 0;
                const smokeCount = eff.smoke ? eff.smoke.geometry.attributes.position.count : 0;
                const fireCount = eff.fireParticles ? eff.fireParticles.geometry.attributes.position.count : 0;
                return {
                    embersCount,
                    smokeCount,
                    fireCount,
                    underBudget: (embersCount <= 140 && smokeCount <= 32 && fireCount <= 250)
                };
            })()""",
            "returnByValue": True
        }, 13)
        part_val = particle_check.get("result", {}).get("result", {}).get("value", {})
        print("[TEST 3] Particle Counts within budget:", part_val)
        assert part_val.get("underBudget") is True, f"Particle budget exceeded: {part_val}"

        # -------------------------------------------------------------
        # 4. Resource Disposal & Memory Leak Verification
        # -------------------------------------------------------------
        dispose_check = cdp(ws, "Runtime.evaluate", {
            "expression": """(() => {
                try {
                    const s = window.__DRAGON_SCENE__;
                    const container = s.container;
                    const initialChildren = container.children.length;

                    // Execute complete disposal
                    s.dispose();

                    const remainingChildren = container.children.length;
                    const sceneGlobalCleaned = (typeof window.__DRAGON_SCENE__ === 'undefined');
                    const readyGlobalCleaned = (typeof window.__DRAGON_READY__ === 'undefined');
                    const audioGlobalCleaned = (typeof window.__DRAGON_AUDIO__ === 'undefined');
                    const effectsGlobalCleaned = (typeof window.__DRAGON_EFFECTS__ === 'undefined');

                    return {
                        initialChildren,
                        remainingChildren,
                        canvasRemoved: remainingChildren < initialChildren,
                        sceneGlobalCleaned,
                        readyGlobalCleaned,
                        audioGlobalCleaned,
                        effectsGlobalCleaned,
                        isDisposed: s.isDisposed
                    };
                } catch (e) {
                    return { error: e.message, stack: e.stack };
                }
            })()""",
            "returnByValue": True
        }, 14)
        disp_val = dispose_check.get("result", {}).get("result", {}).get("value", {})
        print("[TEST 4] Full Resource Disposal & Context Cleanup:", disp_val)
        assert disp_val.get("canvasRemoved") is True, "WebGL canvas element was not removed from DOM!"
        assert disp_val.get("sceneGlobalCleaned") is True, "window.__DRAGON_SCENE__ was not cleaned!"
        assert disp_val.get("isDisposed") is True, "Scene isDisposed flag was not set!"

        print("\n[SUCCESS] Phase 10 Performance Optimization verified 100%!")

    finally:
        chrome.terminate()

if __name__ == "__main__":
    test_phase10()
