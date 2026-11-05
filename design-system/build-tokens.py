"""Compiles design-system/tokens.json into css/tokens.css. Run after changing a token."""
import json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
t = json.load(open(os.path.join(ROOT, "design-system", "tokens.json"), encoding="utf-8"))
themes = [x["id"] for x in t["color"]["themes"]]


def val(v, theme):
    return v if isinstance(v, str) else v.get(theme, v[themes[0]])


out = ["/* Mariyam Foods: generated from design-system/tokens.json. Do not edit by hand. */"]
for i, th in enumerate(themes):
    sel = f':root, [data-theme="{th}"]' if i == 0 else f'[data-theme="{th}"]'
    scheme = "dark" if th == "night" else "light"
    lines = [f"  color-scheme: {scheme};"]
    for fam in ("color", "shadow"):
        lines += [f"  --{x['name']}: {val(x['value'], th)};" for x in t[fam]["tokens"]]
    out.append(sel + " {\n" + "\n".join(lines) + "\n}")
lines = [f"  --{x['name']}: {x['value']};" for fam in ("spacing", "radius") for x in t[fam]["tokens"]]
lines += [f"  --font-{k}: {v};" for k, v in t["type"]["families"].items()]
out.append(":root {\n" + "\n".join(lines) + "\n}")
os.makedirs(os.path.join(ROOT, "css"), exist_ok=True)
with open(os.path.join(ROOT, "css", "tokens.css"), "w", encoding="utf-8") as f:
    f.write("\n".join(out) + "\n")
print("css/tokens.css written")
