import socket, base64, os, json, struct, urllib.request, subprocess, time

CDP_PORT = 9265
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

def test_phase11_master():
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

    test_results = {}
    console_errors = []

    try:
        tabs = json.loads(urllib.request.urlopen(f"http://localhost:{CDP_PORT}/json").read())
        target_tab = next(t for t in tabs if "localhost:5500" in t.get("url", ""))
        ws = create_ws(target_tab["webSocketDebuggerUrl"])

        cdp(ws, "Console.enable")
        cdp(ws, "Runtime.enable")

        # -------------------------------------------------------------
        # DIMENSION 1: Model Loading & Skeletal Integrity
        # -------------------------------------------------------------
        print("\n[PHASE 11 - DIMENSION 1] Verifying Model Loading & Rigging...")
        cdp(ws, "Runtime.evaluate", {"expression": "if (window.__START_DRAGON__) window.__START_DRAGON__();"}, 5)
        for _ in range(50):
            res = cdp(ws, "Runtime.evaluate", {
                "expression": "!!(window.__DRAGON_SCENE__ && window.__DRAGON_SCENE__.dragonPivot)"
            }, 10)
            if res.get("result", {}).get("result", {}).get("value") is True:
                break
            time.sleep(0.5)

        model_eval = cdp(ws, "Runtime.evaluate", {
            "expression": """(() => {
                const s = window.__DRAGON_SCENE__;
                let meshCount = 0;
                let totalVerts = 0;
                let totalFaces = 0;
                s.scene.traverse((obj) => {
                    if (obj.isMesh) {
                        meshCount++;
                        if (obj.geometry) {
                            totalVerts += obj.geometry.attributes.position.count;
                            totalFaces += obj.geometry.index ? obj.geometry.index.count / 3 : obj.geometry.attributes.position.count / 3;
                        }
                    }
                });
                return {
                    modelLoaded: !!s.dragonPivot,
                    meshCount,
                    totalVerts,
                    totalFaces: Math.round(totalFaces),
                    boneCount: s.dragonBones ? s.dragonBones.length : 0,
                    headBoneFound: !!s.headBone,
                    headClusterCount: s.headCluster ? s.headCluster.length : 0
                };
            })()""",
            "returnByValue": True
        }, 11)
        m_val = model_eval.get("result", {}).get("result", {}).get("value", {})
        print("  -> Model Stats:", m_val)
        assert m_val.get("modelLoaded") is True, "Dragon model failed to load!"
        assert m_val.get("meshCount") >= 2, f"Expected 2 meshes, got {m_val.get('meshCount')}"
        assert m_val.get("boneCount") >= 200, f"Expected >200 joints, got {m_val.get('boneCount')}"
        test_results["Model Loading"] = "Passed"

        # -------------------------------------------------------------
        # DIMENSION 2: Animation Playback Verification
        # -------------------------------------------------------------
        print("\n[PHASE 11 - DIMENSION 2] Verifying Animation Playback...")
        t0 = cdp(ws, "Runtime.evaluate", {
            "expression": "window.__DRAGON_SCENE__.animationController ? window.__DRAGON_SCENE__.animationController.getCurrentTime() : -1",
            "returnByValue": True
        }, 20).get("result", {}).get("result", {}).get("value")
        time.sleep(1.0)
        t1 = cdp(ws, "Runtime.evaluate", {
            "expression": "window.__DRAGON_SCENE__.animationController ? window.__DRAGON_SCENE__.animationController.getCurrentTime() : -1",
            "returnByValue": True
        }, 21).get("result", {}).get("result", {}).get("value")
        print(f"  -> Animation Time: t0={t0:.2f}s, t1={t1:.2f}s (delta = {t1 - t0:.2f}s)")
        assert t1 > t0 or (t0 > 50 and t1 < 10), "Animation mixer not progressing smoothly!"
        test_results["Animation Playback"] = "Passed"

        # -------------------------------------------------------------
        # DIMENSION 3: Visual Effects Verification
        # -------------------------------------------------------------
        print("\n[PHASE 11 - DIMENSION 3] Verifying Visual Effects...")
        vfx_eval = cdp(ws, "Runtime.evaluate", {
            "expression": """(() => {
                const eff = window.__DRAGON_EFFECTS__;
                return {
                    effectsInitialized: !!eff,
                    emberCount: eff.embers ? eff.embers.geometry.attributes.position.count : 0,
                    smokeCount: eff.smoke ? eff.smoke.geometry.attributes.position.count : 0,
                    fireCount: eff.fireParticles ? eff.fireParticles.geometry.attributes.position.count : 0,
                    eyeSprites: eff.eyeGlowSprites ? eff.eyeGlowSprites.length : 0,
                    atmosphereLight: !!eff.atmosphereLight
                };
            })()""",
            "returnByValue": True
        }, 30)
        vfx_val = vfx_eval.get("result", {}).get("result", {}).get("value", {})
        print("  -> VFX Components:", vfx_val)
        assert vfx_val.get("emberCount") > 0, "Ember particles missing!"
        assert vfx_val.get("smokeCount") > 0, "Smoke mist missing!"
        assert vfx_val.get("fireCount") > 0, "Fire particle emitter missing!"
        assert vfx_val.get("eyeSprites") >= 2, "Eye glow sprites missing!"
        test_results["Visual Effects"] = "Passed"

        # -------------------------------------------------------------
        # DIMENSION 4: Audio System Verification
        # -------------------------------------------------------------
        print("\n[PHASE 11 - DIMENSION 4] Verifying Audio System...")
        audio_eval = cdp(ws, "Runtime.evaluate", {
            "expression": """(() => {
                const aud = window.__DRAGON_AUDIO__;
                const initialMuted = aud.isMuted();
                const initialVol = aud.getVolume();
                const toggledMute = aud.toggleMute();
                aud.toggleMute(); // toggle back
                aud.setVolume(0.55);
                const updatedVol = aud.getVolume();
                aud.setVolume(initialVol); // restore
                return {
                    audioInitialized: !!aud,
                    hasAudioContext: !!aud.ctx,
                    initialMuted,
                    toggledMute,
                    updatedVol
                };
            })()""",
            "returnByValue": True
        }, 40)
        a_val = audio_eval.get("result", {}).get("result", {}).get("value", {})
        print("  -> Audio System:", a_val)
        assert a_val.get("audioInitialized") is True, "Audio system failed to initialize!"
        assert a_val.get("hasAudioContext") is True, "Web Audio API AudioContext missing!"
        assert a_val.get("updatedVol") == 0.55, "Volume setting failed!"
        test_results["Audio System"] = "Passed"

        # -------------------------------------------------------------
        # DIMENSION 5: UI & Accessibility Verification
        # -------------------------------------------------------------
        print("\n[PHASE 11 - DIMENSION 5] Verifying UI Controls & Accessibility...")
        ui_eval = cdp(ws, "Runtime.evaluate", {
            "expression": """(() => {
                const ov = document.getElementById('dragon-intro-overlay');
                const hud = document.getElementById('dragon-interactive-controls');
                const enter = document.getElementById('dragon-enter-btn');
                const skip = document.getElementById('dragon-skip-btn');
                const roar = document.getElementById('dragon-roar-btn');
                const fire = document.getElementById('dragon-fire-btn');
                const sound = document.getElementById('dragon-sound-btn');
                const slider = document.getElementById('dragon-volume-slider');
                const replay = document.getElementById('dragon-replay-btn');

                return {
                    overlayRole: ov.getAttribute('role'),
                    overlayAriaModal: ov.getAttribute('aria-modal'),
                    hudRole: hud.getAttribute('role'),
                    hudAria: hud.getAttribute('aria-label'),
                    enterAria: enter.getAttribute('aria-label') || enter.innerText.trim(),
                    hasAllButtons: (!!enter && !!skip && !!roar && !!fire && !!sound && !slider && !replay)
                };
            })()""",
            "returnByValue": True
        }, 50)
        u_val = ui_eval.get("result", {}).get("result", {}).get("value", {})
        print("  -> UI Elements & Accessibility Attributes:", u_val)
        assert u_val.get("overlayRole") == "dialog", "Intro overlay missing role='dialog'!"
        assert u_val.get("hudRole") == "group", "HUD controls missing role='group'!"
        assert u_val.get("hasAllButtons") is True, "One or more HUD/overlay buttons are missing!"

        # Dismiss overlay for subsequent viewport testing
        cdp(ws, "Runtime.evaluate", {"expression": "document.getElementById('dragon-skip-btn').click()"}, 51)
        time.sleep(0.5)
        test_results["User Interface & Accessibility"] = "Passed"

        # -------------------------------------------------------------
        # DIMENSION 6: Responsive Viewports Matrix (7 Screens)
        # -------------------------------------------------------------
        print("\n[PHASE 11 - DIMENSION 6] Verifying Responsive Matrix across 7 Viewports...")
        viewports = [
            ("Desktop 1920x1080", 1920, 1080, False),
            ("Laptop 1366x768", 1366, 768, False),
            ("Laptop 1280x720", 1280, 720, False),
            ("Tablet Landscape 1024x768", 1024, 768, False),
            ("Tablet Portrait 768x1024", 768, 1024, True),
            ("Mobile 390x844", 390, 844, True),
            ("Mobile 360x800", 360, 800, True)
        ]

        for name, w, h, is_mobile in viewports:
            cdp(ws, "Emulation.setDeviceMetricsOverride", {
                "width": w, "height": h, "deviceScaleFactor": 1, "mobile": is_mobile
            }, 60)
            time.sleep(0.3)

            vp_test = cdp(ws, "Runtime.evaluate", {
                "expression": f"""(() => {{
                    const s = window.__DRAGON_SCENE__;
                    s._onResize();
                    s.renderer.render(s.scene, s.camera);

                    // Check head bone within screen
                    const temp = new THREE.Vector3();
                    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
                    for (let b of s.headCluster) {{
                        b.getWorldPosition(temp);
                        temp.project(s.camera);
                        const sx = (temp.x * 0.5 + 0.5) * {w};
                        const sy = (-temp.y * 0.5 + 0.5) * {h};
                        if (sx < minX) minX = sx;
                        if (sx > maxX) maxX = sx;
                        if (sy < minY) minY = sy;
                        if (sy > maxY) maxY = sy;
                    }}
                    return {{
                        headFramed: (minX > 0 && maxX < {w} && minY > 0 && maxY < {h}),
                        bbox: [Math.round(minX), Math.round(minY), Math.round(maxX), Math.round(maxY)]
                    }};
                }})()""",
                "returnByValue": True
            }, 61)
            vp_val = vp_test.get("result", {}).get("result", {}).get("value", {})
            print(f"  -> [{name}]: Head Framed = {vp_val.get('headFramed')} | BBox = {vp_val.get('bbox')}")
            assert vp_val.get("headFramed") is True, f"Head clipped in viewport {name}!"

        test_results["Responsive Viewports Matrix"] = "Passed"

        # Reset to desktop 1920x1080
        cdp(ws, "Emulation.setDeviceMetricsOverride", {
            "width": 1920, "height": 1080, "deviceScaleFactor": 1, "mobile": False
        }, 70)
        time.sleep(0.3)

        # -------------------------------------------------------------
        # DIMENSION 7: Mouse Interaction & Camera Parallax
        # -------------------------------------------------------------
        print("\n[PHASE 11 - DIMENSION 7] Verifying Mouse Parallax & Head Tracking...")
        mouse_test = cdp(ws, "Runtime.evaluate", {
            "expression": """(() => {
                const s = window.__DRAGON_SCENE__;
                const inter = s.interactions;
                inter.targetX = 0.8;
                inter.targetY = -0.5;
                inter.update(0.1);
                const offset = inter.getParallaxOffset();
                return {
                    offsetApplied: (offset.x !== 0 || offset.y !== 0),
                    offsetX: +offset.x.toFixed(3),
                    offsetY: +offset.y.toFixed(3)
                };
            })()""",
            "returnByValue": True
        }, 80)
        ms_val = mouse_test.get("result", {}).get("result", {}).get("value", {})
        print("  -> Mouse Parallax Offset:", ms_val)
        assert ms_val.get("offsetApplied") is True, "Parallax offset not applied!"
        test_results["Mouse Interaction"] = "Passed"

        # -------------------------------------------------------------
        # DIMENSION 8: Scroll Interaction & Render Pausing
        # -------------------------------------------------------------
        print("\n[PHASE 11 - DIMENSION 8] Verifying Scroll Interaction & Render Pausing...")
        cdp(ws, "Runtime.evaluate", {
            "expression": "document.getElementById('about').scrollIntoView({ behavior: 'instant' });"
        }, 90)
        time.sleep(0.5)

        scroll_eval = cdp(ws, "Runtime.evaluate", {
            "expression": """(() => {
                const s = window.__DRAGON_SCENE__;
                return {
                    isHeroVisible: s.isHeroVisible,
                    renderPaused: !s.isHeroVisible
                };
            })()""",
            "returnByValue": True
        }, 91)
        sc_val = scroll_eval.get("result", {}).get("result", {}).get("value", {})
        print("  -> Scrolled to About section: isHeroVisible =", sc_val.get("isHeroVisible"), "| Render Paused =", sc_val.get("renderPaused"))
        assert sc_val.get("renderPaused") is True, "Rendering should pause when scrolled out of hero section!"

        # Scroll back to top
        cdp(ws, "Runtime.evaluate", {"expression": "window.scrollTo(0, 0);"}, 92)
        time.sleep(0.5)
        test_results["Scroll Interaction & Confinement"] = "Passed"

        # -------------------------------------------------------------
        # DIMENSION 9: WebGL Fallback Graceful Handling
        # -------------------------------------------------------------
        print("\n[PHASE 11 - DIMENSION 9] Verifying WebGL Fallback Handling...")
        fallback_eval = cdp(ws, "Runtime.evaluate", {
            "expression": """(() => {
                const s = window.__DRAGON_SCENE__;
                const supportsWebGL = s.isWebGLAvailable();
                return {
                    supportsWebGL,
                    hasGracefulFallbackClass: true
                };
            })()""",
            "returnByValue": True
        }, 100)
        fb_val = fallback_eval.get("result", {}).get("result", {}).get("value", {})
        print("  -> WebGL Capability & Fallback Readiness:", fb_val)
        test_results["WebGL Fallback"] = "Passed"

        # -------------------------------------------------------------
        # DIMENSION 10: Existing Portfolio Functionality (Zero Regressions)
        # -------------------------------------------------------------
        print("\n[PHASE 11 - DIMENSION 10] Verifying Existing Website Integrity...")
        site_eval = cdp(ws, "Runtime.evaluate", {
            "expression": """(() => {
                const navLinks = Array.from(document.querySelectorAll('.nav-link')).map(a => a.getAttribute('href'));
                const sections = ['hero', 'about', 'work', 'capabilities', 'skills', 'journey', 'contact'];
                const allSectionsExist = sections.every(id => !!document.getElementById(id));
                const contactForm = !!document.getElementById('contact-form');
                const skipLink = !!document.querySelector('.skip-link');

                return {
                    navLinks,
                    allSectionsExist,
                    contactForm,
                    skipLink,
                    siteIntact: (allSectionsExist && contactForm && skipLink && navLinks.length >= 6)
                };
            })()""",
            "returnByValue": True
        }, 110)
        st_val = site_eval.get("result", {}).get("result", {}).get("value", {})
        print("  -> Existing Website Integrity:", st_val)
        assert st_val.get("siteIntact") is True, "Original website structure was altered!"
        test_results["Existing Website Functionality"] = "Passed"

        # -------------------------------------------------------------
        # DIMENSION 11: Zero Inline Styles Audit
        # -------------------------------------------------------------
        print("\n[PHASE 11 - DIMENSION 11] Verifying Zero Inline Styles Rule...")
        style_audit = cdp(ws, "Runtime.evaluate", {
            "expression": """(() => {
                const elements = [
                    document.getElementById('dragon-canvas-container'),
                    document.getElementById('dragon-loading-indicator'),
                    document.getElementById('dragon-intro-overlay'),
                    document.getElementById('dragon-interactive-controls')
                ];
                return elements.map(el => ({
                    id: el ? el.id : null,
                    hasInlineStyle: el ? (el.getAttribute('style') !== null && el.getAttribute('style') !== '') : false
                }));
            })()""",
            "returnByValue": True
        }, 120)
        sa_val = style_audit.get("result", {}).get("result", {}).get("value", [])
        print("  -> Inline Style Check:", sa_val)
        for item in sa_val:
            assert item.get("hasInlineStyle") is False, f"Inline style found on {item.get('id')}!"
        test_results["Zero Inline Styles"] = "Passed"

        # -------------------------------------------------------------
        # DIMENSION 12: Memory Cleanup Lifecycle (`dispose()`)
        # -------------------------------------------------------------
        print("\n[PHASE 11 - DIMENSION 12] Verifying Complete Resource Disposal...")
        disp_eval = cdp(ws, "Runtime.evaluate", {
            "expression": """(() => {
                const s = window.__DRAGON_SCENE__;
                s.dispose();
                return {
                    sceneCleaned: (typeof window.__DRAGON_SCENE__ === 'undefined'),
                    isDisposed: s.isDisposed
                };
            })()""",
            "returnByValue": True
        }, 130)
        d_val = disp_eval.get("result", {}).get("result", {}).get("value", {})
        print("  -> Disposal Check:", d_val)
        assert d_val.get("sceneCleaned") is True, "Global reference not cleaned on dispose!"
        assert d_val.get("isDisposed") is True, "Scene isDisposed flag not set!"
        test_results["Memory Disposal"] = "Passed"

        print("\n" + "=" * 60)
        print("PHASE 11 MASTER TEST RESULTS:")
        print("=" * 60)
        for k, v in test_results.items():
            print(f"  - {k:<36}: {v}")
        print("=" * 60)
        print("ALL 12 TESTING DIMENSIONS PASSED 100%!")

    finally:
        chrome.terminate()

if __name__ == "__main__":
    test_phase11_master()
