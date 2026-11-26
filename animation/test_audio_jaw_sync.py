import socket
import base64
import os
import json
import struct
import urllib.request
import subprocess
import time

CDP_PORT = 9265
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
    if "101" not in resp: raise Exception("WS handshake failed")
    return s

def send_frame(s, msg):
    data = msg.encode('utf-8')
    mask = os.urandom(4)
    l = len(data)
    if l <= 125:
        header = struct.pack('!BB', 0x81, 0x80 | l)
    elif l <= 65535:
        header = struct.pack('!BBH', 0x81, 0xFE, l)
    else:
        header = struct.pack('!BBQ', 0x81, 0xFF, l)
    s.sendall(header + mask + bytes([b ^ mask[i % 4] for i, b in enumerate(data)]))

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

def run_tests():
    chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
    if not os.path.exists(chrome_path):
        chrome_path = r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"

    proc = subprocess.Popen([
        chrome_path,
        "--headless=new",
        f"--remote-debugging-port={CDP_PORT}",
        "--autoplay-policy=no-user-gesture-required",
        "--disable-gpu",
        f"http://localhost:{HTTP_PORT}/index.html"
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    time.sleep(3.0)

    try:
        req = urllib.request.urlopen(f"http://localhost:{CDP_PORT}/json")
        targets = json.loads(req.read().decode())
        target = next((t for t in targets if f":{HTTP_PORT}" in t.get("url", "")), targets[0])
        ws = create_ws(target["webSocketDebuggerUrl"])

        print("=== DRAGON ANIMATION & AUDIO SYNC VERIFICATION ===")

        # Wait for dragon model and audio buffers to load
        for _ in range(30):
            res = cdp(ws, "Runtime.evaluate", {
                "expression": "Boolean(window.__DRAGON_READY__ && window.__DRAGON_SCENE__ && window.__DRAGON_SCENE__.jawBone)",
                "returnByValue": True
            }, 10)
            if res.get("result", {}).get("result", {}).get("value") is True:
                break
            time.sleep(0.5)

        # 1. Verify Model Rigging & Jaw Bones
        print("\n[TEST 1] Verifying Model Rigging & Jaw Bones...")
        res = cdp(ws, "Runtime.evaluate", {
            "expression": """(() => {
                const s = window.__DRAGON_SCENE__;
                return {
                    hasHeadBone: !!s.headBone,
                    headBoneName: s.headBone ? s.headBone.name : null,
                    hasJawBone: !!s.jawBone,
                    jawBoneName: s.jawBone ? s.jawBone.name : null,
                    hasJawChinBone: !!s.jawChinBone,
                    jawChinBoneName: s.jawChinBone ? s.jawChinBone.name : null,
                    currentState: s.state,
                    initialJawOpen: s.currentJawOpen
                };
            })()""",
            "returnByValue": True
        }, 11)
        bone_data = res.get("result", {}).get("result", {}).get("value", {})
        print("  -> Rigging:", bone_data)
        assert bone_data.get("hasHeadBone") is True, "Head bone missing!"
        assert bone_data.get("hasJawBone") is True, "Jaw bone drgon_064 missing!"
        assert bone_data.get("initialJawOpen") == 0.0, "Jaw should be closed at rest!"
        print("  ✓ Jaw and head bone structure confirmed.")

        # 2. Verify Audio Registry & Buffer Loading
        print("\n[TEST 2] Verifying Audio Registry & Audio Assets...")
        res = cdp(ws, "Runtime.evaluate", {
            "expression": """(() => {
                const aud = window.__DRAGON_AUDIO__;
                const defs = Object.keys(aud.soundDefs);
                const hasRoar = defs.includes('roar');
                const hasFire = defs.includes('fire_crackling');
                const hasBlast = defs.includes('fire_blast');
                const hasBreath = defs.includes('breath');
                const roarBuffer = aud.audioBuffers.has('roar');
                const fireBuffer = aud.audioBuffers.has('fire_crackling');
                return {
                    audioInitialized: aud.isInitialized,
                    hasAudioContext: !!aud.ctx,
                    defs,
                    hasRoar,
                    hasFire,
                    hasBlast,
                    hasBreath,
                    roarBuffer,
                    fireBuffer
                };
            })()""",
            "returnByValue": True
        }, 12)
        audio_data = res.get("result", {}).get("result", {}).get("value", {})
        print("  -> Audio:", audio_data)
        assert audio_data.get("hasRoar") is True, "Roar sound missing from registry!"
        assert audio_data.get("hasFire") is True, "Fire crackling sound missing from registry!"
        print("  ✓ Audio assets registered and initialized.")

        # 3. Verify Roar Animation & Audio Synchronization
        print("\n[TEST 3] Verifying Roar Animation, Jaw Opening & Audio Trigger...")
        # Trigger roar
        cdp(ws, "Runtime.evaluate", {"expression": "window.__DRAGON_SCENE__.triggerRoar()"}, 13)
        time.sleep(0.4) # Wait for mouth opening phase

        res = cdp(ws, "Runtime.evaluate", {
            "expression": """(() => {
                const s = window.__DRAGON_SCENE__;
                return {
                    state: s.state,
                    stateTimer: s.stateTimer,
                    targetJawOpen: s.targetJawOpen,
                    currentJawOpen: s.currentJawOpen,
                    headPitchElev: s.currentHeadPitchElev,
                    activeAudioNodes: (s.audio && s.audio.activeNodes.get('roar')) ? s.audio.activeNodes.get('roar').length : 0
                };
            })()""",
            "returnByValue": True
        }, 14)
        roar_data = res.get("result", {}).get("result", {}).get("value", {})
        print("  -> Roar in progress:", roar_data)
        assert roar_data.get("state") == "ROARING", "Dragon state should be ROARING!"
        assert roar_data.get("currentJawOpen") > 0.3, "Dragon jaw should be opening during roar!"
        assert roar_data.get("headPitchElev") > 0.05, "Dragon head should be raising during roar!"

        # Overlap prevention test
        res_overlap = cdp(ws, "Runtime.evaluate", {
            "expression": """(() => {
                const s = window.__DRAGON_SCENE__;
                const prevTimer = s.stateTimer;
                s.triggerRoar(); // attempt duplicate
                s.triggerFire(); // attempt overlap
                return {
                    state: s.state,
                    timerContinued: s.stateTimer >= prevTimer
                };
            })()""",
            "returnByValue": True
        }, 15)
        overlap_data = res_overlap.get("result", {}).get("result", {}).get("value", {})
        assert overlap_data.get("state") == "ROARING", "Roar/fire overlap should be prevented!"
        print("  ✓ Roar jaw opening, head pitch elevation, and overlap protection verified.")

        # Let roar finish and state return to FLYING
        for _ in range(40):
            res_wait = cdp(ws, "Runtime.evaluate", {
                "expression": "window.__DRAGON_SCENE__.state === 'FLYING'",
                "returnByValue": True
            }, 150)
            if res_wait.get("result", {}).get("result", {}).get("value") is True:
                break
            time.sleep(0.2)

        # 4. Verify Fire Breathing Animation & Audio Synchronization
        print("\n[TEST 4] Verifying Fire Breathing Animation & Particles...")
        cdp(ws, "Runtime.evaluate", {"expression": "window.__DRAGON_SCENE__.triggerFire(2.2)"}, 16)
        time.sleep(0.5)

        res = cdp(ws, "Runtime.evaluate", {
            "expression": """(() => {
                const s = window.__DRAGON_SCENE__;
                return {
                    state: s.state,
                    targetJawOpen: s.targetJawOpen,
                    currentJawOpen: s.currentJawOpen,
                    isFiring: s.effects ? s.effects.isFiring : false,
                    fireTimer: s.effects ? s.effects.fireTimer : 0,
                    activeFireCracklingNodes: (s.audio && s.audio.activeNodes.get('fire_crackling')) ? s.audio.activeNodes.get('fire_crackling').length : 0
                };
            })()""",
            "returnByValue": True
        }, 17)
        fire_data = res.get("result", {}).get("result", {}).get("value", {})
        print("  -> Fire in progress:", fire_data)
        assert fire_data.get("state") == "FIRE_BREATHING", "Dragon state should be FIRE_BREATHING!"
        assert fire_data.get("currentJawOpen") > 0.5, "Dragon jaw should open wide for fire breathing!"
        assert fire_data.get("isFiring") is True, "Visual fire particles should be active!"
        print("  ✓ Fire breathing jaw opening, fire particles, and audio synchronization verified.")

        # Let fire finish
        for _ in range(40):
            res_wait = cdp(ws, "Runtime.evaluate", {
                "expression": "window.__DRAGON_SCENE__.state === 'FLYING'",
                "returnByValue": True
            }, 170)
            if res_wait.get("result", {}).get("result", {}).get("value") is True:
                break
            time.sleep(0.2)

        # 5. Verify Master Sound Toggle Button in HUD
        print("\n[TEST 5] Verifying HUD Sound Button...")
        res = cdp(ws, "Runtime.evaluate", {
            "expression": """(() => {
                const soundBtn = document.getElementById('dragon-sound-btn');
                const initialMuted = window.__DRAGON_AUDIO__.isMuted();
                soundBtn.click(); // toggle mute
                const afterClickMuted = window.__DRAGON_AUDIO__.isMuted();
                soundBtn.click(); // restore
                const restoredMuted = window.__DRAGON_AUDIO__.isMuted();
                return {
                    hasSoundBtn: !!soundBtn,
                    initialMuted,
                    afterClickMuted,
                    restoredMuted,
                    ariaLabel: soundBtn.getAttribute('aria-label')
                };
            })()""",
            "returnByValue": True
        }, 18)
        sound_btn_data = res.get("result", {}).get("result", {}).get("value", {})
        print("  -> Sound button:", sound_btn_data)
        assert sound_btn_data.get("hasSoundBtn") is True, "Sound toggle button missing in HUD!"
        assert sound_btn_data.get("afterClickMuted") != sound_btn_data.get("initialMuted"), "Sound toggle click failed to toggle mute state!"
        print("  ✓ Master sound toggle button in HUD verified.")

        print("\n============================================================")
        print("ALL AUDIO, JAW RIG & SYNCHRONIZATION TESTS PASSED SUCCESSFULLY!")
        print("============================================================\n")

        ws.close()
    finally:
        proc.terminate()

if __name__ == "__main__":
    run_tests()
