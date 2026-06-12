#!/usr/bin/env python3
"""Build a square-celled transparent icon atlas from Twemoji + neon styling."""
from __future__ import annotations

import json
import math
import re
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "script.js"
OUT_PNG = ROOT / "assets" / "icon-atlas.png"
OUT_MAP = ROOT / "assets" / "icon-map.json"
TWEMOJI = "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/{code}.png"

CELL = 128
COLS = 12
PAD = 10


def emoji_to_codepoint(emoji: str) -> str:
    parts = []
    i = 0
    while i < len(emoji):
        ch = emoji[i]
        cp = ord(ch)
        if 0xD800 <= cp <= 0xDBFF and i + 1 < len(emoji):
            lo = ord(emoji[i + 1])
            if 0xDC00 <= lo <= 0xDFFF:
                cp = 0x10000 + ((cp - 0xD800) << 10) + (lo - 0xDC00)
                i += 2
                parts.append(f"{cp:x}")
                continue
        if ch != "\ufe0f":
            parts.append(f"{cp:x}")
        i += 1
    return "-".join(parts)


def collect_emojis() -> list[str]:
    text = SCRIPT.read_text(encoding="utf-8")
    found = set()
    for pat in (r'emoji:\s*"([^"]+)"', r'icon:\s*"([^"]+)"'):
        found.update(re.findall(pat, text))
    for m in re.finditer(r"PUFFS\s*=\s*\[(.*?)\]", text, re.S):
        found.update(re.findall(r'"([^"]+)"', m.group(1)))
    # UI / nav extras
    found.update(["🛒", "🐾", "🌍", "✦", "💩", "🐣", "💎", "🔱", "🔷", "🕊️", "💜", "😈", "🕰️", "🏋️", "🔬", "👁️", "•"])
    # Stable order: important icons first, then sorted
    priority = ["💨", "🛒", "🐾", "🌍", "✦", "🚽", "🥚", "👑"]
    ordered = []
    for e in priority:
        if e in found:
            ordered.append(e)
            found.discard(e)
    ordered.extend(sorted(found, key=lambda x: x.encode("utf-8")))
    return ordered


def hue_for_emoji(emoji: str) -> tuple[int, int, int]:
  """Deterministic neon accent per emoji."""
  h = sum(ord(c) for c in emoji) % 360
  # HSL-ish to RGB (simple)
  s, l = 0.85, 0.55
  c = (1 - abs(2 * l - 1)) * s
  x = c * (1 - abs((h / 60) % 2 - 1))
  m = l - c / 2
  if h < 60:
      r, g, b = c, x, 0
  elif h < 120:
      r, g, b = x, c, 0
  elif h < 180:
      r, g, b = 0, c, x
  elif h < 240:
      r, g, b = 0, x, c
  elif h < 300:
      r, g, b = x, 0, c
  else:
      r, g, b = c, 0, x
  return (int((r + m) * 255), int((g + m) * 255), int((b + m) * 255))


def fetch_twemoji(emoji: str) -> Image.Image | None:
    code = emoji_to_codepoint(emoji)
    url = TWEMOJI.format(code=code)
    try:
        with urllib.request.urlopen(url, timeout=12) as resp:
            from io import BytesIO
            return Image.open(BytesIO(resp.read())).convert("RGBA")
    except Exception:
        return None


def styled_icon(emoji: str) -> Image.Image:
    accent = hue_for_emoji(emoji)
    size = CELL
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    cx, cy = size // 2, size // 2

    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(glow)
    for r, a in ((52, 28), (44, 42), (36, 70)):
        gdraw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(*accent, a))
    glow = glow.filter(ImageFilter.GaussianBlur(4))
    canvas.alpha_composite(glow)

    ring = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    rdraw = ImageDraw.Draw(ring)
    rdraw.ellipse((cx - 40, cy - 40, cx + 40, cy + 40), outline=(*accent, 200), width=3)
    rdraw.ellipse((cx - 34, cy - 34, cx + 34, cy + 34), outline=(255, 255, 255, 90), width=1)
    canvas.alpha_composite(ring)

    src = fetch_twemoji(emoji)
    if src:
        target = int(CELL * 0.62)
        src = src.resize((target, target), Image.Resampling.LANCZOS)
        ox = (size - target) // 2
        oy = (size - target) // 2 - 2
        canvas.alpha_composite(src, (ox, oy))
    else:
        # Fallback glyph
        draw = ImageDraw.Draw(canvas)
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf", 52)
        except OSError:
            font = ImageFont.load_default()
        draw.text((cx, cy), emoji, font=font, anchor="mm", embedded_color=True)

    return canvas


def build():
    emojis = collect_emojis()
    rows = math.ceil(len(emojis) / COLS)
    atlas = Image.new("RGBA", (COLS * CELL, rows * CELL), (0, 0, 0, 0))
    mapping: dict[str, int] = {}

    for i, emoji in enumerate(emojis):
        col, row = i % COLS, i // COLS
        icon = styled_icon(emoji)
        atlas.paste(icon, (col * CELL, row * CELL), icon)
        mapping[emoji] = i

    OUT_PNG.parent.mkdir(parents=True, exist_ok=True)
    atlas.save(OUT_PNG, "PNG", optimize=True)
    meta = {
        "cols": COLS,
        "rows": rows,
        "cell": CELL,
        "count": len(emojis),
        "icons": mapping,
    }
    OUT_MAP.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Built {OUT_PNG} ({atlas.size[0]}x{atlas.size[1]}) with {len(emojis)} icons")


if __name__ == "__main__":
    build()
