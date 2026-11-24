import socket, base64, os, json, struct, urllib.request, subprocess, time

CDP_PORT = 9270
TARGET_URL = "https://pagespeed.web.dev/analysis/https-jayant-kumar-sharma-dev-portfolio-vercel-app/gggpci1strowa6d1mymsw1?form_factor=desktop"

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

def scrape():
    chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
    user_data = os.path.join(os.environ.get("TEMP", "C:\\temp"), f"cdp_profile_{CDP_PORT}")
    chrome = subprocess.Popen([
        chrome_path,
        f"--remote-debugging-port={CDP_PORT}",
        "--headless=new",
        f"--user-data-dir={user_data}",
        "--window-size=1600,1200",
        TARGET_URL
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    time.sleep(3.0)

    try:
        tabs = json.loads(urllib.request.urlopen(f"http://localhost:{CDP_PORT}/json").read())
        target_tab = next(t for t in tabs if "pagespeed.web.dev" in t.get("url", "") or "about:blank" in t.get("url", ""))
        ws = create_ws(target_tab["webSocketDebuggerUrl"])
        cdp(ws, "Runtime.enable")

        # Wait for PageSpeed report to render
        print("Waiting for PageSpeed UI to finish rendering...")
        for i in range(25):
            res = cdp(ws, "Runtime.evaluate", {
                "expression": """(() => {
                    const gauges = document.querySelectorAll('.lh-gauge__percentage');
                    if (gauges.length > 0) return true;
                    const scores = document.querySelectorAll('[class*=\"gauge\"]');
                    return scores.length > 0;
                })()""",
                "returnByValue": True
            }, 10)
            if res.get("result", {}).get("result", {}).get("value") is True:
                print(f"Report rendered in ~{i*2}s")
                break
            time.sleep(2.0)

        # Extract textual summary from the rendered DOM
        data_eval = cdp(ws, "Runtime.evaluate", {
            "expression": """(() => {
                // Collect gauges
                const results = {
                    categories: [],
                    metrics: [],
                    opportunities: [],
                    diagnostics: []
                };

                document.querySelectorAll('.lh-category-header, .lh-scores-header .lh-gauge__wrapper').forEach(el => {
                    const title = el.querySelector('.lh-gauge__label, .lh-category-header__title')?.innerText;
                    const val = el.querySelector('.lh-gauge__percentage')?.innerText;
                    if (title && val) results.categories.push({ title, val });
                });

                document.querySelectorAll('.lh-metric').forEach(el => {
                    const title = el.querySelector('.lh-metric__title')?.innerText;
                    const val = el.querySelector('.lh-metric__value')?.innerText;
                    if (title && val) results.metrics.push({ title, val });
                });

                document.querySelectorAll('.lh-audit--load-opportunity').forEach(el => {
                    const title = el.querySelector('.lh-audit__title')?.innerText;
                    const val = el.querySelector('.lh-audit__display-text')?.innerText;
                    if (title) results.opportunities.push({ title, val });
                });

                document.querySelectorAll('.lh-audit--diagnostic').forEach(el => {
                    const title = el.querySelector('.lh-audit__title')?.innerText;
                    const val = el.querySelector('.lh-audit__display-text')?.innerText;
                    if (title) results.diagnostics.push({ title, val });
                });

                results.bodyTextSnippet = document.body.innerText.substring(0, 3000);
                return results;
            })()""",
            "returnByValue": True
        }, 11)

        result_data = data_eval.get("result", {}).get("result", {}).get("value", {})
        with open("animation/pagespeed_scraped.json", "w", encoding="utf-8") as f:
            json.dump(result_data, f, indent=2)

        # Take screenshot of the report
        ss = cdp(ws, "Page.captureScreenshot", {"format": "png"}, 12)
        if "data" in ss.get("result", {}):
            with open("animation/pagespeed_screenshot.png", "wb") as f:
                f.write(base64.b64decode(ss["result"]["data"]))
            print("Saved animation/pagespeed_screenshot.png")

        print("Scrape complete.")
    finally:
        chrome.terminate()

if __name__ == "__main__":
    scrape()
