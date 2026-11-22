import socket, base64, os, json, struct, urllib.request, subprocess, time

CDP_PORT = 9245
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

def test_phase5():
    chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
    user_data = os.path.join(os.environ.get("TEMP", "C:\\temp"), f"cdp_profile_{CDP_PORT}")
    chrome = subprocess.Popen([
        chrome_path,
        f"--remote-debugging-port={CDP_PORT}",
        "--headless=new",
        f"--user-data-dir={user_data}",
        "--window-size=1920,1080",
        "http://localhost:5500/index.html"
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    time.sleep(2.5)

    try:
        tabs = json.loads(urllib.request.urlopen(f"http://localhost:{CDP_PORT}/json").read())
        target_tab = next(t for t in tabs if "localhost:5500" in t.get("url", ""))
        ws = create_ws(target_tab["webSocketDebuggerUrl"])

        cdp(ws, "Console.enable")
        cdp(ws, "Runtime.enable")

        print("=== Checking Dragon & Phase 5 Effects Initialization ===")
        # Wait for dragon ready
        for _ in range(40):
            res = cdp(ws, "Runtime.evaluate", {"expression": "Boolean(window.__DRAGON_READY__)"})
            if res.get("result", {}).get("result", {}).get("value"):
                break
            time.sleep(0.5)

        # Inspect Effects state
        fx_eval = cdp(ws, "Runtime.evaluate", {
            "expression": """
            (() => {
                const s = window.__DRAGON_SCENE__;
                if (!s || !s.effects) return { error: 'No effects found' };
                const fx = s.effects;
                return {
                    hasEyeGlow: fx.eyeGlowLights.length === 2,
                    eyeGlowLightsCount: fx.eyeGlowLights.length,
                    hasEmbers: Boolean(fx.embers),
                    embersCount: fx.embers ? fx.embers.geometry.attributes.position.count : 0,
                    hasSmoke: Boolean(fx.smoke),
                    smokeCount: fx.smoke ? fx.smoke.geometry.attributes.position.count : 0,
                    hasFireParticles: Boolean(fx.fireParticles),
                    fireParticlesCount: fx.fireParticles ? fx.fireParticles.geometry.attributes.position.count : 0,
                    hasAtmosphereLight: Boolean(fx.atmosphereLight),
                    atmosphereLightIntensity: fx.atmosphereLight ? fx.atmosphereLight.intensity : 0,
                    hasFireLight: Boolean(fx.fireLight)
                };
            })()
            """,
            "returnByValue": True
        })
        fx_status = fx_eval.get("result", {}).get("result", {}).get("value", {})
        print("Visual Effects status:", json.dumps(fx_status, indent=2))

        # Capture idle screenshot with embers & eye glow
        time.sleep(1.0)
        ss1 = cdp(ws, "Page.captureScreenshot", {"format": "png"})
        if "data" in ss1.get("result", {}):
            with open(os.path.join(ARTIFACT_DIR, "phase5_effects_idle.png"), "wb") as f:
                f.write(base64.b64decode(ss1["result"]["data"]))
            print("Saved screenshot: phase5_effects_idle.png")

        # Test triggering fire effect
        print("=== Testing Fire Trigger & Camera Shake ===")
        cdp(ws, "Runtime.evaluate", {
            "expression": "window.__DRAGON_SCENE__.triggerFire(2.0);"
        })
        time.sleep(0.4)

        fire_eval = cdp(ws, "Runtime.evaluate", {
            "expression": """
            (() => {
                const s = window.__DRAGON_SCENE__;
                const fx = s.effects;
                return {
                    isFiring: fx.isFiring,
                    shakeOffset: fx.getCameraShakeOffset(),
                    fireLightIntensity: fx.fireLight.intensity
                };
            })()
            """,
            "returnByValue": True
        })
        print("Fire breath trigger status:", json.dumps(fire_eval.get("result", {}).get("result", {}).get("value", {}), indent=2))

        # Capture fire breath screenshot
        ss2 = cdp(ws, "Page.captureScreenshot", {"format": "png"})
        if "data" in ss2.get("result", {}):
            with open(os.path.join(ARTIFACT_DIR, "phase5_effects_fire.png"), "wb") as f:
                f.write(base64.b64decode(ss2["result"]["data"]))
            print("Saved screenshot: phase5_effects_fire.png")

        print("Phase 5 visual effects test completed successfully!")

    finally:
        chrome.kill()

if __name__ == "__main__":
    test_phase5()
