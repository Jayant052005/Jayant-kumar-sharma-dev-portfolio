import socket, base64, os, json, struct, urllib.request, subprocess, time

CDP_PORT = 9268
ARTIFACT_DIR = r"C:\Users\Win10\.gemini\antigravity\brain\aec08c4f-75db-4119-ba24-b0eb0e60531b"

def create_ws(ws_url):
    parts = ws_url.replace("ws://", "").split("/", 1)
    hp = parts[0].split(":")
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.connect((hp[0], int(hp[1])))
    sec_key = base64.b64encode(os.urandom(16)).decode('utf-8')
    path_str = parts[1] if len(parts) > 1 else ""
    headers = [
        f"GET /{path_str} HTTP/1.1",
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
    msg = {'id': msg_id, 'method': method}
    if params: msg['params'] = params
    send_frame(ws, json.dumps(msg))
    while True:
        resp = recv_frame(ws)
        if not resp: break
        data = json.loads(resp)
        if data.get('id') == msg_id: return data

proc = subprocess.Popen([
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    "--headless=new",
    f"--remote-debugging-port={CDP_PORT}",
    "--window-size=1280,800",
    "http://localhost:5500/index.html"
])
time.sleep(2)

try:
    tabs = json.loads(urllib.request.urlopen(f"http://localhost:{CDP_PORT}/json").read())
    ws = create_ws(tabs[0]['webSocketDebuggerUrl'])
    cdp(ws, 'Runtime.enable', msg_id=1)
    time.sleep(1)

    # 1. Check card dimensions and centered position
    eval_res = cdp(ws, 'Runtime.evaluate', {
        'expression': """(() => {
            const card = document.querySelector('.dragon-intro-card');
            const rect = card.getBoundingClientRect();
            const overlay = document.querySelector('.dragon-intro-overlay');
            return {
                cardWidth: Math.round(rect.width),
                cardHeight: Math.round(rect.height),
                viewportW: window.innerWidth,
                viewportH: window.innerHeight,
                cardCenterX: Math.round(rect.left + rect.width / 2),
                cardCenterY: Math.round(rect.top + rect.height / 2),
                isCenteredX: Math.abs((rect.left + rect.width / 2) - window.innerWidth / 2) < 5,
                isCenteredY: Math.abs((rect.top + rect.height / 2) - window.innerHeight / 2) < 5,
                isDismissedInitially: overlay.classList.contains('is-dismissed')
            };
        })()""",
        'returnByValue': True
    }, msg_id=2)
    val = eval_res.get('result', {}).get('result', {}).get('value', {})
    print("Card Dimensions & Centering:", val)

    # Capture screenshot before dismissal
    ss = cdp(ws, 'Page.captureScreenshot', msg_id=3)
    ss_data = ss.get('result', {}).get('data', '')
    if ss_data:
        with open(os.path.join(ARTIFACT_DIR, 'compact_intro_modal.png'), 'wb') as f:
            f.write(base64.b64decode(ss_data))
        print("Saved compact_intro_modal.png")

    # 2. Click inside modal card (simulate click on heading)
    eval_inside = cdp(ws, 'Runtime.evaluate', {
        'expression': """(() => {
            const heading = document.querySelector('.dragon-intro-heading');
            heading.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            const overlay = document.querySelector('.dragon-intro-overlay');
            return {
                isDismissedAfterInsideClick: overlay.classList.contains('is-dismissed')
            };
        })()""",
        'returnByValue': True
    }, msg_id=4)
    print("Inside click check (should NOT dismiss):", eval_inside.get('result', {}).get('result', {}).get('value', {}))

    # 3. Click outside modal card (on the overlay backdrop)
    eval_outside = cdp(ws, 'Runtime.evaluate', {
        'expression': """(() => {
            const overlay = document.querySelector('.dragon-intro-overlay');
            overlay.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            return {
                isDismissedAfterOutsideClick: overlay.classList.contains('is-dismissed')
            };
        })()""",
        'returnByValue': True
    }, msg_id=5)
    print("Outside click check (SHOULD dismiss):", eval_outside.get('result', {}).get('result', {}).get('value', {}))

    # 4. Check duplicate click does not crash or re-fire
    eval_duplicate = cdp(ws, 'Runtime.evaluate', {
        'expression': """(() => {
            const overlay = document.querySelector('.dragon-intro-overlay');
            overlay.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            return {
                isStillDismissed: overlay.classList.contains('is-dismissed')
            };
        })()""",
        'returnByValue': True
    }, msg_id=6)
    print("Duplicate outside click check:", eval_duplicate.get('result', {}).get('result', {}).get('value', {}))

    ws.close()
finally:
    proc.terminate()
