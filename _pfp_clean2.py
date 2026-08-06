#!/usr/bin/env python3
"""v3: don't cut the dog out at all. Keep original pixels for the dog + a
generous margin (so creases/rim light stay intact), and rebuild only the far
background as a smooth red field (kills smudges + smeary shadows)."""
import numpy as np
from PIL import Image, ImageFilter, ImageDraw

SRC = "golden_dog_hd.png"
OUT_SQ = "golden_dog_pfp_v3.png"
OUT_PREV = "_pfp_circle_preview_v3.png"

img = Image.open(SRC).convert("RGB")
W, H = img.size
a = np.asarray(img).astype(np.float32) / 255.0
r, g, b = a[..., 0], a[..., 1], a[..., 2]
mx = a.max(axis=2); mn = a.min(axis=2)
v = mx
s = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
c = mx - mn
hue = np.zeros_like(mx)
m = (mx == r) & (c > 0); hue[m] = ((g - b)[m] / c[m]) % 6
m2 = (mx == g) & (c > 0); hue[m2] = ((b - r)[m2] / c[m2]) + 2
m3 = (mx == b) & (c > 0); hue[m3] = ((r - g)[m3] / c[m3]) + 4
hue *= 60

is_bg = (((hue >= 325) | (hue <= 24)) & (s > 0.35)) & (g < 0.42)
mask = Image.fromarray(((~is_bg) * 255).astype(np.uint8))
mask = mask.filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.MinFilter(9))

# solid dog silhouette via hole fill + largest component
mfill = mask.point(lambda p: 255 if p > 128 else 0)
bg2 = Image.new("L", (W + 2, H + 2), 0)
bg2.paste(mfill, (1, 1))
ImageDraw.floodfill(bg2, (0, 0), 128)
solid = bg2.crop((1, 1, W + 1, H + 1)).point(lambda p: 0 if p == 128 else 255)
arr0 = np.asarray(solid); ys0, xs0 = np.where(arr0 > 0)
comp = solid.copy()
ImageDraw.floodfill(comp, (int(xs0.mean()), int(ys0.mean())), 200)
solid = comp.point(lambda p: 255 if p == 200 else 0)

# generous margin: dilate ~30px, then wide feather so the blend is invisible
keep = solid.filter(ImageFilter.MaxFilter(31))
keep = keep.filter(ImageFilter.GaussianBlur(30))

# bbox of the dog for framing
arr = np.asarray(solid); ys, xs = np.where(arr > 0)
x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
print("bbox", x0, y0, x1, y1)

# local background color: ring just outside the dog (between dilate31 and dilate101)
near = np.asarray(solid.filter(ImageFilter.MaxFilter(101))) > 0
inner = np.asarray(solid.filter(ImageFilter.MaxFilter(31))) > 0
ring = near & ~inner
rc = np.median(np.asarray(img)[ring], axis=0)
print("ring color:", rc)

# virtual square canvas around the dog, dog ~70% of frame
dw, dh = x1 - x0, y1 - y0
side = int(max(dw, dh) / 0.70)
cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
ox, oy = cx - side // 2, cy - side // 2  # source coords of canvas origin (may be <0)

# gradient field: ring color center -> darker rim
S = side
yy, xx = np.mgrid[0:S, 0:S].astype(np.float32)
d = np.sqrt((yy - S / 2) ** 2 + (xx - S / 2) ** 2) / (S * 0.72)
t = np.clip(d, 0, 1)[..., None]
edge = rc * 0.74
canvas = rc * (1 - t) + edge * t
field = Image.fromarray(canvas.astype(np.uint8))

# subtle tight shadow
sh = Image.new("L", (S, S), 0)
sh.paste(solid, (-ox + 14, -oy + 20))
sh = sh.filter(ImageFilter.GaussianBlur(40)).point(lambda p: int(p * 0.30))
shadow_layer = Image.new("RGB", (S, S), (70, 8, 12))
field = Image.composite(shadow_layer, field, sh)

# original dog (+feathered margin of original bg) over the field
field.paste(img, (-ox, -oy), keep)
sq = field.resize((1600, 1600), Image.LANCZOS)
sq.save(OUT_SQ)
print("saved", OUT_SQ)

prev = sq.resize((800, 800), Image.LANCZOS)
circ = Image.new("L", (800, 800), 0)
ImageDraw.Draw(circ).ellipse((0, 0, 800, 800), fill=255)
outp = Image.new("RGB", (800, 800), (21, 24, 28))
outp.paste(prev, (0, 0), circ)
outp.save(OUT_PREV)
print("saved", OUT_PREV)
