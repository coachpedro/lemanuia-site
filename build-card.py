"""
Builds share-card.png — the 1200x630 Open Graph image for lemanuia.org.

Everything here is lifted from the site's own values: the lagoon ground, the
140x140 siapo lattice, the laumei symbol, the sawtooth band, and the cream
wordmark. No new shapes were invented and no substitute typeface is used —
the wordmark is the logo file, so the card needs no text layer.

Re-run this if the logo changes:  python3 build-card.py
"""

from pathlib import Path

from PIL import Image, ImageDraw

W, H = 1200, 630
LAGOON = (11, 91, 90)
NIGHT = (16, 40, 39)
GOLD = (227, 167, 47)
CREAM = (246, 240, 229)

SS = 2          # supersample factor for the drawn patterns
TILE = 140      # lattice tile, matching the SVG's patternUnits
BAND_H = 34     # sawtooth band height on this canvas
LATTICE_ALPHA = 0.13
LAUMEI_ALPHA = 0.075

# The repository this script lives in, so it runs from anywhere and for anyone.
SRC = Path(__file__).resolve().parent
OUT = SRC / "share-card.png"


def lattice_tile():
    """One 140x140 tile of the site's lattice, drawn at SS scale then reduced."""
    s = TILE * SS
    tile = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(tile)
    k = SS
    stroke = max(1, round(1.1 * k))

    # Outer diamond, the full X, and the inner diamond.
    d.line([(0, 70 * k), (70 * k, 0), (140 * k, 70 * k), (70 * k, 140 * k), (0, 70 * k)],
           fill=NIGHT + (255,), width=stroke)
    d.line([(0, 0), (140 * k, 140 * k)], fill=NIGHT + (255,), width=stroke)
    d.line([(140 * k, 0), (0, 140 * k)], fill=NIGHT + (255,), width=stroke)
    d.line([(45 * k, 70 * k), (70 * k, 45 * k), (95 * k, 70 * k), (70 * k, 95 * k), (45 * k, 70 * k)],
           fill=NIGHT + (255,), width=stroke)

    # Filled corner triangles.
    for pts in (
        [(0, 0), (26, 0), (0, 26)],
        [(140, 0), (114, 0), (140, 26)],
        [(0, 140), (26, 140), (0, 114)],
        [(140, 140), (114, 140), (140, 114)],
    ):
        d.polygon([(x * k, y * k) for x, y in pts], fill=NIGHT + (255,))

    # Centre dot and the four cardinal dots.
    for cx, cy, r in ((70, 70, 5), (70, 8, 3), (70, 132, 3), (8, 70, 3), (132, 70, 3)):
        d.ellipse([(cx - r) * k, (cy - r) * k, (cx + r) * k, (cy + r) * k], fill=NIGHT + (255,))

    return tile.resize((TILE, TILE), Image.LANCZOS)


def lattice_layer():
    tile = lattice_tile()
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    for y in range(0, H, TILE):
        for x in range(0, W, TILE):
            layer.alpha_composite(tile, (x, y))
    a = layer.getchannel("A").point(lambda v: int(v * LATTICE_ALPHA))
    layer.putalpha(a)
    return layer


def sawtooth_layer():
    """The site's 60x26 edge pattern, in gold, seated on the bottom edge."""
    s = SS
    unit_w, unit_h = 60, 26
    tile = Image.new("RGBA", (unit_w * s, unit_h * s), (0, 0, 0, 0))
    d = ImageDraw.Draw(tile)
    for off in (0, 30):
        d.polygon([((off + 0) * s, 26 * s), ((off + 15) * s, 2 * s), ((off + 30) * s, 26 * s)],
                  fill=GOLD + (255,))
    scale = BAND_H / unit_h
    tw = max(1, round(unit_w * scale))
    tile = tile.resize((tw, BAND_H), Image.LANCZOS)

    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    for x in range(0, W, tw):
        layer.alpha_composite(tile, (x, H - BAND_H))
    return layer


def laumei_layer():
    """
    symbol-lagoon.png is a lagoon-coloured mark on transparency, so dropping it
    on a lagoon ground paints nothing. Flatten it to white and let the alpha do
    the work — the same trick the holding page uses in CSS.
    """
    sym = Image.open(SRC / "symbol-lagoon.png").convert("RGBA")
    # Deliberately oversized and bled off the right edge. At a size where the
    # whole shell fits on the canvas the monogram inside it reads as a second,
    # larger wordmark competing with the real one; cropped, it reads as ground.
    target_w = 880
    ratio = target_w / sym.width
    sym = sym.resize((target_w, round(sym.height * ratio)), Image.LANCZOS)

    white = Image.new("RGBA", sym.size, CREAM + (0,))
    white.putalpha(sym.getchannel("A").point(lambda v: int(v * LAUMEI_ALPHA)))

    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    layer.alpha_composite(white, (W - round(target_w * 0.55), (H - sym.height) // 2))
    return layer


def main():
    card = Image.new("RGBA", (W, H), LAGOON + (255,))
    card.alpha_composite(lattice_layer())
    card.alpha_composite(laumei_layer())

    logo = Image.open(SRC / "logo-cream.png").convert("RGBA")
    logo_w = 620
    logo = logo.resize((logo_w, round(logo.height * logo_w / logo.width)), Image.LANCZOS)
    # Left rail at the site's own gutter; optically centred, so a touch high.
    card.alpha_composite(logo, (76, (H - logo.height) // 2 - 26))

    card.alpha_composite(sawtooth_layer())
    card.convert("RGB").save(OUT, "PNG", optimize=True)
    print("wrote", OUT, card.size)


main()
