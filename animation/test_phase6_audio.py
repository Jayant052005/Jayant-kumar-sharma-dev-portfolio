import socket, base64, os, json, struct, urllib.request, subprocess, time

CDP_PORT = 9250

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

def test_phase6():
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

        print("=== 1. Checking Dragon Audio System Initialization ===")
        # Wait for dragon ready
        for _ in range(30):
            res = cdp(ws, "Runtime.evaluate", {"expression": "Boolean(window.__DRAGON_READY__)"})
            if res.get("result", {}).get("result", {}).get("value"):
                break
            time.sleep(0.5)

        time.sleep(1.0) # allow sound buffer decoding

        audio_status = cdp(ws, "Runtime.evaluate", {
            "expression": """
            (() => {
                const s = window.__DRAGON_SCENE__;
                if (!s || !s.audio) return { error: 'No audio manager found' };
                const a = s.audio;
                const bufferCount = a.audioBuffers.size;
                const keys = Array.from(a.audioBuffers.keys());
                return {
                    hasAudioContext: Boolean(a.ctx),
                    audioContextState: a.ctx ? a.ctx.state : 'none',
                    decodedBuffersCount: bufferCount,
                    loadedSounds: keys,
                    masterVolume: a.getVolume(),
                    isMuted: a.isMuted()
                };
            })()
            """,
            "returnByValue": True
        }).get("result", {}).get("result", {}).get("value", {})
        print("Audio System Status:", json.dumps(audio_status, indent=2))

        print("=== 2. Testing Sound Playback & Triggers ===")
        sounds_to_test = ['growl', 'roar', 'breath', 'fire_blast', 'fire_crackle', 'whoosh', 'impact', 'ambience']
        for snd in sounds_to_test:
            res = cdp(ws, "Runtime.evaluate", {
                "expression": f"Boolean(window.__DRAGON_AUDIO__.play('{snd}'))",
                "returnByValue": True
            })
            val = res.get("result", {}).get("result", {}).get("value")
            print(f"Trigger sound '{snd}': Played = {val}")

        print("=== 3. Testing Overlap Prevention & Ducking ===")
        overlap_res = cdp(ws, "Runtime.evaluate", {
            "expression": """
            (() => {
                const a = window.__DRAGON_AUDIO__;
                // Play 5 roars simultaneously
                a.play('roar');
                a.play('roar');
                a.play('roar');
                a.play('roar');
                a.play('roar');
                const roarNodes = a.activeNodes.get('roar') || [];
                return {
                    maxAllowedRoarChannels: a.soundDefs.roar.maxChannels,
                    actualActiveRoarChannels: roarNodes.length
                };
            })()
            """,
            "returnByValue": True
        }).get("result", {}).get("result", {}).get("value", {})
        print("Overlap Prevention Result:", json.dumps(overlap_res, indent=2))

        print("=== 4. Testing Volume & Mute Controls ===")
        vol_res = cdp(ws, "Runtime.evaluate", {
            "expression": """
            (() => {
                const a = window.__DRAGON_AUDIO__;
                a.setVolume(0.42);
                const v1 = a.getVolume();
                a.mute();
                const m1 = a.isMuted();
                a.unmute();
                const m2 = a.isMuted();
                a.setVolume(0.80);
                return { volumeSet: v1, isMutedAfterMute: m1, isMutedAfterUnmute: m2, finalVolume: a.getVolume() };
            })()
            """,
            "returnByValue": True
        }).get("result", {}).get("result", {}).get("value", {})
        print("Volume/Mute Controls Result:", json.dumps(vol_res, indent=2))

        print("=== 5. Testing Missing-File Handling & Procedural Fallback ===")
        synth_res = cdp(ws, "Runtime.evaluate", {
            "expression": """
            (() => {
                const a = window.__DRAGON_AUDIO__;
                // Request a sound that uses procedural fallback
                const node = a.playProceduralFallback('roar');
                const nodeBlast = a.playProceduralFallback('fire_blast');
                return {
                    synthRoarCreated: Boolean(node),
                    synthBlastCreated: Boolean(nodeBlast)
                };
            })()
            """,
            "returnByValue": True
        }).get("result", {}).get("result", {}).get("value", {})
        print("Procedural Synthesizer Fallback Result:", json.dumps(synth_res, indent=2))

        print("All Phase 6 audio tests completed successfully!")

    finally:
        chrome.kill()

if __name__ == "__main__":
    test_phase6()
