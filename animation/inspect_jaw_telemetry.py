
import socket, base64, os, json, struct, urllib.request, subprocess, time

CDP_PORT = 9235
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
    b1, b2 = hdr[0], hdr[1]
    plen = b2 & 0x7F
    if plen == 126:
        plen = struct.unpack("!H", s.recv(2))[0]
    elif plen == 127:
        plen = struct.unpack("!Q", s.recv(8))[0]
    data = bytearray()
    while len(data) < plen:
        chunk = s.recv(min(4096, plen - len(data)))
        if not chunk: break
        data.extend(chunk)
    return json.loads(data.decode('utf-8', errors='ignore'))

def cdp(ws, method, params=None, req_id=1):
    send_frame(ws, json.dumps({"id": req_id, "method": method, "params": params or {}}))
    while True:
        resp = recv_frame(ws)
        if resp and resp.get("id") == req_id:
            return resp

def run_telemetry():
    chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
    if not os.path.exists(chrome_path):
        chrome_path = r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"

    user_data = os.path.join(os.environ.get("TEMP", "C:\\temp"), f"cdp_telem_profile_{CDP_PORT}")
    proc = subprocess.Popen([
        chrome_path,
        "--headless=new",
        f"--remote-debugging-port={CDP_PORT}",
        f"--user-data-dir={user_data}",
        "--autoplay-policy=no-user-gesture-required",
        "--disable-gpu",
        f"http://localhost:{HTTP_PORT}/index.html"
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    time.sleep(2.5)

    try:
        targets = []
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

        assert target is not None, f"Failed to find page target on port {HTTP_PORT}!"
        ws = create_ws(target["webSocketDebuggerUrl"])

        cdp(ws, "Runtime.evaluate", {"expression": "if (window.__START_DRAGON__) window.__START_DRAGON__();"}, 5)

        wait_id = 1000
        model_ready = False
        for i in range(90):
            wait_id += 1
            res = cdp(ws, "Runtime.evaluate", {
                "expression": "Boolean(window.__DRAGON_READY__ && window.__DRAGON_SCENE__ && window.__DRAGON_SCENE__.jawBone)",
                "returnByValue": True
            }, wait_id)
            if res.get("result", {}).get("result", {}).get("value") is True:
                model_ready = True
                break
            time.sleep(0.5)

        assert model_ready, "Timeout waiting for dragon model!"

        # 1. Query Bone Hierarchy & Static Calibration Specs
        res_info = cdp(ws, "Runtime.evaluate", {
            "expression": """(() => {
                const s = window.__DRAGON_SCENE__;
                return {
                    headBoneName: s.headBone ? s.headBone.name : null,
                    jawBoneName: s.jawBone ? s.jawBone.name : null,
                    jawBoneParent: s.jawBone && s.jawBone.parent ? s.jawBone.parent.name : null,
                    jawChinBoneName: s.jawChinBone ? s.jawChinBone.name : null,
                    roarThreshold: s.roarThreshold,
                    autoIntervalMin: 12.0,
                    autoIntervalMax: 25.0,
                    baseJawRotX: s.jawBone.rotation.x,
                    baseJawRotY: s.jawBone.rotation.y,
                    baseJawRotZ: s.jawBone.rotation.z
                };
            })()""",
            "returnByValue": True
        }, 11)
        info = res_info.get("result", {}).get("result", {}).get("value", {})
        print("BONE_SPECS:", json.dumps(info, indent=2))

        # 2. Trigger automatic roar via scheduler advance
        print("\nAdvancing scheduler to simulate automatic roar trigger...")
        cdp(ws, "Runtime.evaluate", {
            "expression": "window.__DRAGON_SCENE__.autoRoarTimer = window.__DRAGON_SCENE__.nextAutoRoarInterval;"
        }, 12)

        start_time = time.time()
        samples = []
        req_id = 100

        # Poll telemetry for 3.0 seconds
        for _ in range(40):
            time.sleep(0.065)
            req_id += 1
            res = cdp(ws, "Runtime.evaluate", {
                "expression": """(() => {
                    const s = window.__DRAGON_SCENE__;
                    const j = s.jawBone;
                    return {
                        state: s.state,
                        stateTimer: Number((s.stateTimer || 0).toFixed(4)),
                        targetJawOpen: Number((s.targetJawOpen || 0).toFixed(4)),
                        currentJawOpen: Number((s.currentJawOpen || 0).toFixed(4)),
                        prevJawOpen: Number((s.prevJawOpen || 0).toFixed(4)),
                        jawMovementDuration: Number((s.jawMovementDuration || 0).toFixed(3)),
                        isRoaringActive: !!s.isRoaringActive,
                        threshold: s.roarThreshold,
                        hasTriggeredRoar: !!s.hasTriggeredRoarForCurrentOpening,
                        activeRoarNodes: (s.audio && s.audio.activeNodes.get('roar')) ? s.audio.activeNodes.get('roar').length : 0,
                        jawRotXDeg: j ? Number((j.rotation.x * 180 / Math.PI).toFixed(2)) : 0,
                        jawRotYDeg: j ? Number((j.rotation.y * 180 / Math.PI).toFixed(2)) : 0,
                        jawRotZDeg: j ? Number((j.rotation.z * 180 / Math.PI).toFixed(2)) : 0,
                        headPitchElev: Number((s.currentHeadPitchElev || 0).toFixed(4))
                    };
                })()""",
                "returnByValue": True
            }, req_id)
            data = res.get("result", {}).get("result", {}).get("value")
            if not isinstance(data, dict):
                print("DEBUG RES:", res)
                continue
            data["tMs"] = int((time.time() - start_time) * 1000)
            samples.append(data)

        print("\n" + "="*110)
        print(f"{'Time':<8} | {'State':<10} | {'Target':<7} | {'JawOpen':<8} | {'Duration':<10} | {'Rot Y(deg)':<11} | {'Rot X(deg)':<11} | {'AudioTrigger'}")
        print("="*110)

        for i, s in enumerate(samples):
            prev_trig = samples[i-1]["isRoaringActive"] if i > 0 else False
            curr_trig = s.get("isRoaringActive", False)
            if curr_trig and not prev_trig:
                trig_note = ">>> TRIGGERED (>= 0.2s) <<<"
            elif curr_trig:
                trig_note = f"Active Roar ({s.get('activeRoarNodes')} node)"
            elif not curr_trig and prev_trig:
                trig_note = "<<< STOPPED (Jaw Closed) <<<"
            else:
                trig_note = "Rest / Silent"

            print(f"{s['tMs']:>6}ms | {s['state']:>10} | {s['targetJawOpen']:>7.3f} | {s['currentJawOpen']:>8.4f} | {s['jawMovementDuration']:>8.3f}s | {s['jawRotYDeg']:>10.2f}° | {s['jawRotXDeg']:>10.2f}° | {trig_note}")

        print("="*110)
        ws.close()
    finally:
        proc.terminate()

if __name__ == "__main__":
    run_telemetry()
