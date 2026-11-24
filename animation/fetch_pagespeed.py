import urllib.request, json, sys

url = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=https://jayant-kumar-sharma-dev-portfolio.vercel.app/&strategy=desktop&category=performance&category=accessibility&category=best-practices&category=seo"
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})

print(f"Querying Google PageSpeed API for https://jayant-kumar-sharma-dev-portfolio.vercel.app/ (desktop)...")
try:
    with urllib.request.urlopen(req, timeout=60) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        cats = data.get("lighthouseResult", {}).get("categories", {})
        print("\n=== LIGHTHOUSE CATEGORY SCORES ===")
        for cat_name, cat_data in cats.items():
            print(f"- {cat_data.get('title')}: {cat_data.get('score', 0) * 100:.0f} / 100")

        audits = data.get("lighthouseResult", {}).get("audits", {})
        cwv = [
            "first-contentful-paint",
            "largest-contentful-paint",
            "total-blocking-time",
            "cumulative-layout-shift",
            "speed-index",
            "interaction-to-next-paint"
        ]
        print("\n=== CORE WEB VITALS & KEY METRICS ===")
        for m in cwv:
            a = audits.get(m, {})
            score = a.get("score")
            print(f"- {a.get('title', m)}: {a.get('displayValue', 'N/A')} (Score: {score})")

        print("\n=== OPPORTUNITIES (Performance Savings) ===")
        found_opp = False
        for k, a in audits.items():
            if a.get("details", {}).get("type") == "opportunity" and (a.get("score") is None or a.get("score") < 1.0):
                found_opp = True
                print(f"[{a.get('title')}]: {a.get('displayValue', '')} (Score: {a.get('score')})")
                items = a.get("details", {}).get("items", [])
                for it in items[:3]:
                    url_item = it.get("url", "")
                    wasted = it.get("wastedBytes") or it.get("wastedMs")
                    print(f"   * {url_item[:80]} - Wasted: {wasted}")
        if not found_opp:
            print("No major opportunities flagged.")

        print("\n=== DIAGNOSTICS & FAILED AUDITS ===")
        for k, a in audits.items():
            score = a.get("score")
            if score is not None and score < 0.9 and a.get("details", {}).get("type") != "opportunity":
                title = a.get("title", k)
                display_val = a.get("displayValue", "")
                desc = a.get("description", "")
                print(f"[{title}] {display_val} (Score: {score})")
                items = a.get("details", {}).get("items", [])
                for it in items[:3]:
                    if isinstance(it, dict):
                        # extract useful summary
                        node = it.get("node", {}).get("snippet", "")
                        source = it.get("source", "") or it.get("url", "")
                        print(f"   * {node or source[:80]}")

        with open("animation/pagespeed_desktop.json", "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
        print("\nFull JSON saved to animation/pagespeed_desktop.json")

except Exception as e:
    print(f"Error querying API: {e}")
    sys.exit(1)
