#!/usr/bin/env python3
"""Rebuild the pfp: extract the dog crisply from the HD image, drop the
upscaler halo + blurred text smudges, composite on a clean red field."""
import numpy as np
from PIL import Image, ImageFilter, ImageDraw
import colorsys

SRC = "golden_dog_hd.png"
OUT_SQ = "golden_dog_pfp_v2.png"
OUT_PREV = "_pfp_circle_preview_v2.png"

img = Image.open(SRC).convert("RGB")
a = np.asarray(img).astype(np.float32) / 255.0
r, g, b = a[..., 0], a[..., 1], a[..., 2]

mx = a.max(axis=2); mn = a.min(axis=2)
v = mx
s = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
# hue
c = mx - mn
hue = np.zeros_like(mx)
m = (mx == r) & (c > 0)
hue[m] = ((g - b)[m] / c[m]) % 6
m2 = (mx == g) & (c > 0)
hue[m2] = ((b - r)[m2] / c[m2]) + 2
m3 = (mx == b) & (c > 0)
hue[m3] = ((r - g)[m3] / c[m3]) + 4
hue *= 60  # degrees

# Background = red field (incl. darker vignette + orange halo). Dog = everything else.
is_bg = (((hue >= 325) | (hue <= 24)) & (s > 0.35)) & (g < 0.42)
dogpx = ~is_bg
mask = Image.fromarray((dogpx * 255).astype(np.uint8))

# Clean the mask: seal thin gaps so floodfill can't leak into the dog, despeckle
mask = mask.filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.MinFilter(9))
mask = mask.filter(ImageFilter.MinFilter(5)).filter(ImageFilter.MaxFilter(5))
# Fill internal holes via floodfill of background
mfill = mask.point(lambda p: 255 if p > 128 else 0)
bg = Image.new("L", (mfill.width + 2, mfill.height + 2), 0)
bg.paste(mfill, (1, 1))
ImageDraw.floodfill(bg, (0, 0), 128)
solid = bg.crop((1, 1, mfill.width + 1, mfill.height + 1))
solid = solid.point(lambda p: 0 if p == 128 else 255)  # everything not reached = dog

# keep only the dog component: floodfill from mask centroid
arr0 = np.asarray(solid)
ys0, xs0 = np.where(arr0 > 0)
seedy, seedx = int(ys0.mean()), int(xs0.mean())
comp = solid.copy()
ImageDraw.floodfill(comp, (seedx, seedy), 200)
solid = comp.point(lambda p: 255 if p == 200 else 0)
# Close narrow slivers the halo-classification bit out of the dog
solid = solid.filter(ImageFilter.MaxFilter(21)).filter(ImageFilter.MinFilter(21))

arr = np.asarray(solid)
ys, xs = np.where(arr > 0)
x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
print("dog bbox:", x0, y0, x1, y1, "size:", x1 - x0, y1 - y0)

# Slight erode to cut the halo ring baked into edge pixels, then feather
solid = solid.filter(ImageFilter.MinFilter(3))
feather = solid.filter(ImageFilter.GaussianBlur(2.5))

dog = img.crop((x0, y0, x1 + 1, y1 + 1))
dmask = feather.crop((x0, y0, x1 + 1, y1 + 1))

# Build clean red canvas (site red, subtle radial vignette)
S = 1600
canvas = np.zeros((S, S, 3), np.float32)
cy, cx = S / 2, S / 2
yy, xx = np.mgrid[0:S, 0:S]
d = np.sqrt((yy - cy) ** 2 + (xx - cx) ** 2) / (S * 0.72)
base = np.array([158, 27, 32], np.float32)   # center red
edge = np.array([116, 14, 20], np.float32)   # darker rim
t = np.clip(d, 0, 1)[..., None]
canvas = base * (1 - t) + edge * t
bg_img = Image.fromarray(canvas.astype(np.uint8))

# Scale dog to ~70% of frame (by the larger dimension)
dw, dh = dog.size
target = int(S * 0.70)
scale = target / max(dw, dh)
nw, nh = int(dw * scale), int(dh * scale)
dog_s = dog.resize((nw, nh), Image.LANCZOS)
dmask_s = dmask.resize((nw, nh), Image.LANCZOS)

px = (S - nw) // 2
py = (S - nh) // 2

# Tight, subtle shadow (not the smeary one)
sh = Image.new("L", (S, S), 0)
sh.paste(dmask_s, (px + 10, py + 14))
sh = sh.filter(ImageFilter.GaussianBlur(18)).point(lambda p: int(p * 0.35))
shadow_layer = Image.new("RGB", (S, S), (60, 6, 10))
bg_img = Image.composite(shadow_layer, bg_img, sh)

bg_img.paste(dog_s, (px, py), dmask_s)
bg_img.save(OUT_SQ)
print("saved", OUT_SQ, bg_img.size)

# Circle preview (what X shows)
prev = bg_img.resize((800, 800), Image.LANCZOS)
circ = Image.new("L", (800, 800), 0)
ImageDraw.Draw(circ).ellipse((0, 0, 800, 800), fill=255)
out = Image.new("RGB", (800, 800), (21, 24, 28))
out.paste(prev, (0, 0), circ)
out.save(OUT_PREV)
print("saved", OUT_PREV)
