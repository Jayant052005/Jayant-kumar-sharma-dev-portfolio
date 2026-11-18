import http.server
import socketserver
import threading
import time
import subprocess
import os

PORT = 8097
httpd = socketserver.TCPServer(('127.0.0.1', PORT), http.server.SimpleHTTPRequestHandler)
t = threading.Thread(target=httpd.serve_forever, daemon=True)
t.start()
time.sleep(0.5)

chrome_path = r'C:\Program Files\Google\Chrome\Application\chrome.exe'

test_configs = [
    {'name': 'config_facing_user', 'scale': 9.5, 'rotY': -0.32, 'rotX': 0.05, 'posX': 2.8, 'posY': -0.2, 'posZ': -1.0},
    {'name': 'config_side_profile', 'scale': 8.5, 'rotY': -0.55, 'rotX': 0.08, 'posX': 3.2, 'posY': -0.3, 'posZ': -1.2},
    {'name': 'config_front_hero', 'scale': 8.0, 'rotY': 0.25, 'rotX': 0.05, 'posX': 2.5, 'posY': -0.2, 'posZ': -0.8},
]

with open('js/dragon/dragon-loader.js', 'r', encoding='utf-8') as f:
    orig_code = f.read()

for cfg in test_configs:
    s = cfg['scale']
    ry = cfg['rotY']
    rx = cfg['rotX']
    px = cfg['posX']
    py = cfg['posY']
    pz = cfg['posZ']

    modified = orig_code
    modified = modified.replace('const targetScale = 14.0 / maxDim;', f'const targetScale = {s} / maxDim;')
    modified = modified.replace('pivot.rotation.y = Math.PI * 0.85;', f'pivot.rotation.y = Math.PI * {ry};')
    modified = modified.replace('pivot.rotation.x = Math.PI * 0.08;', f'pivot.rotation.x = Math.PI * {rx};')
    modified = modified.replace('pivot.position.set(2.2, 0.4, 0);', f'pivot.position.set({px}, {py}, {pz});')
    
    with open('js/dragon/dragon-loader.js', 'w', encoding='utf-8') as f:
        f.write(modified)
    
    out_png = os.path.abspath(f'animation/{cfg["name"]}.png')
    cmd = [
        chrome_path,
        '--headless=new',
        '--disable-gpu-sandbox',
        '--enable-webgl',
        '--use-gl=angle',
        '--virtual-time-budget=10000',
        '--window-size=1920,1080',
        f'--screenshot={out_png}',
        f'http://127.0.0.1:{PORT}/index.html'
    ]
    subprocess.run(cmd, capture_output=True, timeout=25)
    size = os.path.getsize(out_png) if os.path.exists(out_png) else 0
    print(f'Rendered {cfg["name"]}: {size} bytes')

# Restore original
with open('js/dragon/dragon-loader.js', 'w', encoding='utf-8') as f:
    f.write(orig_code)

httpd.shutdown()
print('Testing complete.')
