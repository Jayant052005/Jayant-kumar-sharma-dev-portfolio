import urllib.request
import os
import re

os.makedirs('animation/libs', exist_ok=True)

urls = [
    ('https://unpkg.com/three@0.160.0/build/three.module.js', 'animation/libs/three.module.js'),
    ('https://unpkg.com/three@0.160.0/examples/jsm/loaders/GLTFLoader.js', 'animation/libs/GLTFLoader.js'),
    ('https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js', 'animation/libs/OrbitControls.js')
]

for url, dest in urls:
    print(f"Fetching {url} -> {dest}...")
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as resp:
        content = resp.read().decode('utf-8')
        if 'three.module.js' not in dest:
            content = re.sub(r"from\s+['\"]three['\"];", "from './three.module.js';", content)
        with open(dest, 'wb') as f:
            f.write(content.encode('utf-8'))
    print(f"Saved {dest} ({os.path.getsize(dest):,} bytes)")

print("Vendor libraries ready in animation/libs/")
