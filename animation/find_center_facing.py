import http.server
import socketserver
import threading
import time
import subprocess
import os
import urllib.request
import json
import base64
import socket
import struct
import tempfile

def create_ws_connection(ws_url):
    parts = ws_url.replace("ws://", "").split("/", 1)
    host_port = parts[0].split(":")
    host = host_port[0]
    port = int(host_port[1])
    path = "/" + (parts[1] if len(parts) > 1 else "")

    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.connect((host, port))

    sec_key = base64.b64encode(os.urandom(16)).decode('utf-8')
    headers = [
        f"GET {path} HTTP/1.1",
        f"Host: {host}:{port}",
        "Upgrade: websocket",
        "Connection: Upgrade",
        f"Sec-WebSocket-Key: {sec_key}",
        "Sec-WebSocket-Version: 13",
        "\r\n"
    ]
    s.sendall("\r\n".join(headers).encode('utf-8'))
    resp = s.recv(4096).decode('utf-8', errors='ignore')
    if "101" not in resp:
        raise Exception(f"WebSocket handshake failed: {resp}")
    return s

def send_ws_frame(s, message_str):
    data = message_str.encode('utf-8')
    length = len(data)
    mask = os.urandom(4)
    header = bytearray([0x81])
    if length <= 125:
        header.append(0x80 | length)
    elif length <= 65535:
        header.append(0x80 | 126)
        header.extend(struct.pack("!H", length))
    else:
        header.append(0x80 | 127)
        header.extend(struct.pack("!Q", length))
    header.extend(mask)
    masked = bytearray(length)
    for i in range(length):
        masked[i] = data[i] ^ mask[i % 4]
    s.sendall(header + masked)

def recv_ws_frame(s):
    buf = bytearray()
    while len(buf) < 2:
        chunk = s.recv(2 - len(buf))
        if not chunk: raise Exception("Socket closed")
        buf.extend(chunk)
    masked = (buf[1] & 0x80) != 0
    payload_len = buf[1] & 0x7f
    if payload_len == 126:
        ext = s.recv(2)
        payload_len = struct.unpack("!H", ext)[0]
    elif payload_len == 127:
        ext = s.recv(8)
        payload_len = struct.unpack("!Q", ext)[0]
    if masked:
        mask = s.recv(4)
    payload = bytearray()
    while len(payload) < payload_len:
        needed = payload_len - len(payload)
        chunk = s.recv(min(needed, 65536))
        if not chunk: raise Exception("Socket closed")
        payload.extend(chunk)
    if masked:
        for i in range(len(payload)):
            payload[i] ^= mask[i % 4]
    return payload.decode('utf-8', errors='ignore')

def cdp_send(s, method, params=None, msg_id=1):
    payload = {"id": msg_id, "method": method, "params": params or {}}
    send_ws_frame(s, json.dumps(payload))
    while True:
        resp = recv_ws_frame(s)
        try:
            data = json.loads(resp)
            if data.get("id") == msg_id:
                return data
        except Exception:
            pass

def main():
    CDP_PORT = 9225

    test_configs = [
        {'name': 'center_opt1', 'scale': 8.0, 'rotY': -0.30, 'rotX': 0.08, 'posX': 0.8, 'posY': -0.7, 'posZ': -0.5},
        {'name': 'center_opt2', 'scale': 7.5, 'rotY': -0.28, 'rotX': 0.06, 'posX': 0.5, 'posY': -0.6, 'posZ': -0.5},
        {'name': 'center_opt3', 'scale': 8.0, 'rotY': 0.28, 'rotX': 0.06, 'posX': -0.5, 'posY': -0.6, 'posZ': -0.5},
        {'name': 'center_opt4', 'scale': 7.2, 'rotY': 0.0, 'rotX': 0.12, 'posX': 0.0, 'posY': -0.8, 'posZ': -0.5},
    ]

    with open('js/dragon/dragon-loader.js', 'r', encoding='utf-8') as f:
        orig_code = f.read()

    chrome_path = r'C:\Program Files\Google\Chrome\Application\chrome.exe'

    for cfg in test_configs:
        modified = orig_code
        modified = modified.replace('const targetScale = 7.8 / maxDim;', f'const targetScale = {cfg["scale"]} / maxDim;')
        modified = modified.replace('pivot.rotation.y = Math.PI * 0.28;', f'pivot.rotation.y = Math.PI * {cfg["rotY"]};')
        modified = modified.replace('pivot.rotation.x = Math.PI * 0.05;', f'pivot.rotation.x = Math.PI * {cfg["rotX"]};')
        modified = modified.replace('pivot.position.set(3.4, -0.4, -0.8);', f'pivot.position.set({cfg["posX"]}, {cfg["posY"]}, {cfg["posZ"]});')

        with open('js/dragon/dragon-loader.js', 'w', encoding='utf-8') as f:
            f.write(modified)

        tmp_dir = tempfile.mkdtemp()
        proc = subprocess.Popen([
            chrome_path,
            '--headless=new',
            f'--user-data-dir={tmp_dir}',
            f'--remote-debugging-port={CDP_PORT}',
            '--disable-gpu-sandbox',
            '--enable-webgl',
            '--window-size=1920,1080',
            'about:blank'
        ])
        time.sleep(1.2)

        try:
            with urllib.request.urlopen(f'http://127.0.0.1:{CDP_PORT}/json') as resp:
                targets = json.loads(resp.read().decode('utf-8'))
            ws_url = next(t['webSocketDebuggerUrl'] for t in targets if t.get('type') == 'page')
            ws = create_ws_connection(ws_url)

            cdp_send(ws, "Page.enable", msg_id=1)
            cdp_send(ws, "Runtime.enable", msg_id=2)
            cdp_send(ws, "Page.navigate", {"url": "http://127.0.0.1:5500/index.html"}, msg_id=3)

            for i in range(30):
                time.sleep(0.4)
                r = cdp_send(ws, "Runtime.evaluate", {"expression": "window.__DRAGON_READY__ === true"}, msg_id=10+i)
                if r.get("result", {}).get("result", {}).get("value"):
                    break

            time.sleep(1.5)
            res = cdp_send(ws, "Page.captureScreenshot", {"format": "png"}, msg_id=99)
            img_bytes = base64.b64decode(res["result"]["data"])
            out_path = os.path.abspath(f"animation/{cfg['name']}.png")
            with open(out_path, "wb") as f:
                f.write(img_bytes)
            print(f"Captured {cfg['name']}: {len(img_bytes)} bytes")
        finally:
            proc.terminate()
            time.sleep(0.5)

    with open('js/dragon/dragon-loader.js', 'w', encoding='utf-8') as f:
        f.write(orig_code)

    print("All center options complete.")

if __name__ == "__main__":
    main()
