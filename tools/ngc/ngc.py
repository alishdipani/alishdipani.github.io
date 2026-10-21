#!/usr/bin/env python3
"""NGC images for blog posts: one image source (Legacy Surveys DR10 south), one recipe.

Run through tools/ngc/ngc (sets up the venv). Subcommands:
  candidates            NGC objects from OpenNGC that fit the footprint and size rules
  check [--limit N]     one-time check pass: small cutouts, keep the clean ones (cached, resumable)
  wiki                  find which objects have an English Wikipedia article
  build                 write src/data/ngc-list.json and the local contact sheet
  make NAME --post SLUG images for one post + its ngc frontmatter; marks NAME as used
                        (shortcut: ngc NAME --post SLUG)
  samples NAME...       header-size images of a few objects on a local page (for review)

Raw downloads and caches live in tools/ngc/cache/ and tools/ngc/out/ (gitignored). CI never runs this.
"""
import argparse
import csv
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

import numpy as np
from astropy.coordinates import SkyCoord
from astropy.io import fits
import astropy.units as u
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
HERE = ROOT / 'tools' / 'ngc'
CACHE = HERE / 'cache'
OUT = HERE / 'out'
LIST = ROOT / 'src' / 'data' / 'ngc-list.json'
IMAGES = ROOT / 'public' / 'images' / 'ngc'
POSTS = ROOT / 'src' / 'content' / 'blog'

OPENNGC_CSV = 'https://raw.githubusercontent.com/mattiaverga/OpenNGC/master/database_files/NGC.csv'
CUTOUT = 'https://www.legacysurvey.org/viewer/fits-cutout'
VIEWER = 'https://www.legacysurvey.org/viewer'
USER_AGENT = 'alishdipani-site-ngc-tool/1.0 (https://alishdipani.github.io; one-time thumbnail check)'

# Wording required by the Legacy Surveys image license (CC BY 4.0), unaltered:
# https://www.legacysurvey.org/acknowledgment/
CREDIT = 'Legacy Surveys / D. Lang (Perimeter Institute)'

NATIVE_PIXSCALE = 0.262          # arcsec/px, DECam in DR10
CHECK_SIZE = 160                 # px, check-pass cutouts (also the contact-sheet preview)
HEADER_W, HEADER_H = 1440, 810   # post header (16:9)
THUMB_MEDIUM, THUMB_SMALL = 320, 112
MAX_CLIPPED = 0.005              # reject if more than 0.5% of pixels clip
MAX_CORE_ARTIFACT = 0.10         # reject when this share of the brightest pixels is green/cyan (Alish, Oct 21)

SKIP_TYPES = {'Dup', 'NonEx', '*', '**', '*Ass', 'Other'}  # duplicates, non-existent, stars, asterisms
TYPE_LABELS = {
    'GPair': 'Galaxy pair', 'GTrpl': 'Galaxy triplet', 'GGroup': 'Galaxy group',
    'OCl': 'Open cluster', 'GCl': 'Globular cluster', 'Cl+N': 'Star cluster with nebula',
    'HII': 'HII region', 'Neb': 'Nebula', 'EmN': 'Emission nebula', 'RfN': 'Reflection nebula',
    'PN': 'Planetary nebula', 'SNR': 'Supernova remnant',
}
CONSTELLATIONS = {
    'And': 'Andromeda', 'Ant': 'Antlia', 'Aps': 'Apus', 'Aqr': 'Aquarius', 'Aql': 'Aquila', 'Ara': 'Ara',
    'Ari': 'Aries', 'Aur': 'Auriga', 'Boo': 'Boötes', 'Cae': 'Caelum', 'Cam': 'Camelopardalis', 'Cnc': 'Cancer',
    'CVn': 'Canes Venatici', 'CMa': 'Canis Major', 'CMi': 'Canis Minor', 'Cap': 'Capricornus', 'Car': 'Carina',
    'Cas': 'Cassiopeia', 'Cen': 'Centaurus', 'Cep': 'Cepheus', 'Cet': 'Cetus', 'Cha': 'Chamaeleon',
    'Cir': 'Circinus', 'Col': 'Columba', 'Com': 'Coma Berenices', 'CrA': 'Corona Australis',
    'CrB': 'Corona Borealis', 'Crv': 'Corvus', 'Crt': 'Crater', 'Cru': 'Crux', 'Cyg': 'Cygnus',
    'Del': 'Delphinus', 'Dor': 'Dorado', 'Dra': 'Draco', 'Equ': 'Equuleus', 'Eri': 'Eridanus', 'For': 'Fornax',
    'Gem': 'Gemini', 'Gru': 'Grus', 'Her': 'Hercules', 'Hor': 'Horologium', 'Hya': 'Hydra', 'Hyi': 'Hydrus',
    'Ind': 'Indus', 'Lac': 'Lacerta', 'Leo': 'Leo', 'LMi': 'Leo Minor', 'Lep': 'Lepus', 'Lib': 'Libra',
    'Lup': 'Lupus', 'Lyn': 'Lynx', 'Lyr': 'Lyra', 'Men': 'Mensa', 'Mic': 'Microscopium', 'Mon': 'Monoceros',
    'Mus': 'Musca', 'Nor': 'Norma', 'Oct': 'Octans', 'Oph': 'Ophiuchus', 'Ori': 'Orion', 'Pav': 'Pavo',
    'Peg': 'Pegasus', 'Per': 'Perseus', 'Phe': 'Phoenix', 'Pic': 'Pictor', 'Psc': 'Pisces',
    'PsA': 'Piscis Austrinus', 'Pup': 'Puppis', 'Pyx': 'Pyxis', 'Ret': 'Reticulum', 'Sge': 'Sagitta',
    'Sgr': 'Sagittarius', 'Sco': 'Scorpius', 'Scl': 'Sculptor', 'Sct': 'Scutum', 'Se1': 'Serpens',
    'Se2': 'Serpens', 'Ser': 'Serpens', 'Sex': 'Sextans', 'Tau': 'Taurus', 'Tel': 'Telescopium',
    'Tri': 'Triangulum', 'TrA': 'Triangulum Australe', 'Tuc': 'Tucana', 'UMa': 'Ursa Major',
    'UMi': 'Ursa Minor', 'Vel': 'Vela', 'Vir': 'Virgo', 'Vol': 'Volans', 'Vul': 'Vulpecula',
}


# ---------------------------------------------------------------- catalog

def display_name(name):
    """'NGC0628' -> 'NGC 628', 'NGC0055A' -> 'NGC 55A'."""
    m = re.match(r'NGC0*(\d+)(\w*)$', name)
    return f'NGC {m.group(1)}{m.group(2)}' if m else name


def type_label(row):
    t = row['Type']
    if t != 'G':
        return TYPE_LABELS.get(t, t)
    h = row.get('Hubble', '').strip()
    if re.match(r'^(E-S0|S0|SA0|SAB0|SB0)', h):
        return 'Lenticular galaxy'
    if h.startswith('E'):
        return 'Elliptical galaxy'
    if h.startswith('SB'):
        return 'Barred spiral galaxy'
    if h.startswith('S'):
        return 'Spiral galaxy'
    if h.startswith('I'):
        return 'Irregular galaxy'
    return 'Galaxy'


def fov_arcmin(major):
    return max(1.3 * major, 1.5)


def cmd_candidates(args):
    csv_path = CACHE / 'NGC.csv'
    if not csv_path.exists():
        CACHE.mkdir(parents=True, exist_ok=True)
        fetch(OPENNGC_CSV, csv_path)
    rows = [r for r in csv.DictReader(open(csv_path, encoding='utf-8'), delimiter=';')
            if r['Name'].startswith('NGC') and r['Type'] not in SKIP_TYPES and r['RA'] and r['Dec'] and r['MajAx']]
    coords = SkyCoord(ra=[r['RA'] for r in rows], dec=[r['Dec'] for r in rows], unit=(u.hourangle, u.deg))
    b = coords.galactic.b.deg
    out = []
    for r, c, lat in zip(rows, coords, b):
        major = float(r['MajAx'])
        if c.dec.deg > 32 or abs(lat) < 18 or not (1 <= major <= 15):
            continue
        minor = float(r['MinAx']) if r['MinAx'] else None
        out.append({
            'id': r['Name'],
            'name': display_name(r['Name']),
            'type': type_label(r),
            'typeCode': r['Type'],
            'constellation': CONSTELLATIONS.get(r['Const'], r['Const']),
            'size': [major, minor],
            'ra': round(c.ra.deg, 5),
            'dec': round(c.dec.deg, 5),
            'fov': round(fov_arcmin(major), 3),
            'commonName': (r.get('Common names') or '').split(',')[0].strip() or None,
        })
    (CACHE / 'candidates.json').write_text(json.dumps(out, indent=1))
    print(f'{len(out)} candidates (from {len(rows)} NGC objects with type, position and size)')


def load_candidates():
    return json.loads((CACHE / 'candidates.json').read_text())


# ---------------------------------------------------------------- network

_last_request = 0.0


def fetch(url, dest=None, tries=4):
    """GET with at most one request per second and retries (the cutout service is slow and flaky)."""
    global _last_request
    for attempt in range(tries):
        wait = 1.0 - (time.monotonic() - _last_request)
        if wait > 0:
            time.sleep(wait)
        _last_request = time.monotonic()
        try:
            req = urllib.request.Request(url, headers={'User-Agent': USER_AGENT})
            with urllib.request.urlopen(req, timeout=90) as res:
                data = res.read()
            if dest:
                Path(dest).write_bytes(data)
            return data
        except Exception as e:  # noqa: BLE001 — any failure is retried, then reported
            if attempt == tries - 1:
                raise
            time.sleep(5 * (attempt + 1))
            print(f'  retry {attempt + 1} after: {e}', file=sys.stderr)


def cutout_url(ra, dec, pixscale, width, height):
    q = {'ra': ra, 'dec': dec, 'layer': 'ls-dr10', 'bands': 'grz', 'pixscale': round(pixscale, 4)}
    q.update({'size': width} if width == height else {'width': width, 'height': height})
    return f'{CUTOUT}?{urllib.parse.urlencode(q)}'


def viewer_url(ra, dec, fov):
    zoom = int(np.clip(round(16 - np.log2(max(fov, 0.5) / 2)), 9, 16))
    return f'{VIEWER}?{urllib.parse.urlencode({"ra": ra, "dec": dec, "layer": "ls-dr10", "zoom": zoom})}'


# ---------------------------------------------------------------- recipe

def process(cube):
    """The fixed color recipe. cube: (3, H, W) g, r, z from the FITS cutout.
    Returns (rgb float array in [0, 1] of shape (H, W, 3), fraction of clipped pixels)."""
    g, r, z = (band - np.median(band) for band in cube.astype(np.float64))
    blue, green, red = g * 6.0, r * 3.4, z * 2.2
    intensity = (red + green + blue) / 3
    p = np.percentile(intensity, 99.5)
    if not np.isfinite(p) or p <= 0:
        raise ValueError('no signal')
    alpha, Q = 4.0 / p, 8.0
    with np.errstate(divide='ignore', invalid='ignore'):
        factor = np.where(intensity > 0, np.arcsinh(alpha * Q * intensity) / Q / intensity, 0.0)
    rgb = np.stack([red * factor, green * factor, blue * factor], axis=-1)
    peak = rgb.max(axis=-1)
    clipped = float((peak > 1).mean())
    rgb = np.where((peak > 1)[..., None], rgb / np.maximum(peak, 1e-12)[..., None], rgb)
    rgb = np.clip(rgb, 0, 1)
    return rgb[::-1], clipped  # FITS rows start at the bottom


def to_image(rgb):
    return Image.fromarray((rgb * 255 + 0.5).astype(np.uint8), 'RGB')


def core_artifact(rgb):
    """Share of the brightest 0.5% of pixels that are green-dominant. Saturated cores and stars come out
    green/cyan with this recipe, while real sky objects are almost never green; > MAX_CORE_ARTIFACT looks wrong."""
    intensity = rgb.mean(axis=-1)
    top = intensity >= np.quantile(intensity, 0.995)
    green = rgb[..., 1] > 1.1 * np.maximum(rgb[..., 0], rgb[..., 2])
    return float((green & top).sum() / max(top.sum(), 1))


def assess(cube):
    """Reasons to reject a check cutout (empty list = keep), plus the processed preview."""
    reasons = []
    if cube.ndim != 3 or cube.shape[0] != 3:
        return ['bad cutout shape'], None, None
    for band, label in zip(cube, 'grz'):
        if not np.isfinite(band).all() or (band == 0).any():
            reasons.append('incomplete coverage')
            break
        if np.std(band) == 0:
            reasons.append(f'{label} band empty')
            break
    try:
        rgb, clipped = process(cube)
    except ValueError as e:
        return reasons + [str(e)], None, None
    if clipped > MAX_CLIPPED:
        reasons.append('blown-out core')
    return reasons, rgb, clipped


# ---------------------------------------------------------------- check pass

def cmd_check(args):
    cands = load_candidates()
    (CACHE / 'fits').mkdir(parents=True, exist_ok=True)
    (OUT / 'previews').mkdir(parents=True, exist_ok=True)
    results_path = CACHE / 'check-results.json'
    results = json.loads(results_path.read_text()) if results_path.exists() else {}
    todo = [c for c in cands if c['id'] not in results]
    if args.limit:
        todo = todo[:args.limit]
    print(f'{len(results)} already checked, {len(todo)} to go')
    start, downloaded = time.monotonic(), 0
    for i, c in enumerate(todo, 1):
        fits_path = CACHE / 'fits' / f'{c["id"]}.fits'
        try:
            if not fits_path.exists():
                pixscale = max(NATIVE_PIXSCALE, c['fov'] * 60 / CHECK_SIZE)
                downloaded += len(fetch(cutout_url(c['ra'], c['dec'], pixscale, CHECK_SIZE, CHECK_SIZE), fits_path))
            cube = fits.getdata(fits_path)
            reasons, rgb, clipped = assess(cube)
            if rgb is not None:
                to_image(rgb).save(OUT / 'previews' / f'{c["id"]}.jpg', quality=88)
            results[c['id']] = {'ok': not reasons, 'reasons': reasons, 'clipped': clipped}
        except Exception as e:  # noqa: BLE001
            results[c['id']] = {'ok': False, 'reasons': [f'download failed: {e}'], 'clipped': None}
            fits_path.unlink(missing_ok=True)
        if i % 25 == 0 or i == len(todo):
            results_path.write_text(json.dumps(results))
            rate = (time.monotonic() - start) / i
            left = (len(cands) - len(results)) * rate / 60
            print(f'  {len(results)}/{len(cands)} checked · {rate:.2f} s/object · ~{left:.0f} min left · '
                  f'{downloaded / 1e6:.0f} MB this run', flush=True)
    results_path.write_text(json.dumps(results))
    summarize(results)


def summarize(results):
    from collections import Counter
    ok = sum(r['ok'] for r in results.values())
    reasons = Counter(reason.split(':')[0] for r in results.values() for reason in r['reasons'])
    print(f'checked {len(results)} · passed {ok} ({ok / max(len(results), 1):.0%}) · rejections: {dict(reasons)}')


# ---------------------------------------------------------------- wikipedia

def cmd_wiki(args):
    results = json.loads((CACHE / 'check-results.json').read_text())
    names = [c['name'] for c in load_candidates() if results.get(c['id'], {}).get('ok')]
    wiki_path = CACHE / 'wikipedia.json'
    found = json.loads(wiki_path.read_text()) if wiki_path.exists() else {}
    todo = [n for n in names if n not in found]
    for i in range(0, len(todo), 50):
        batch = todo[i:i + 50]
        q = urllib.parse.urlencode({'action': 'query', 'format': 'json', 'redirects': 1, 'titles': '|'.join(batch)})
        data = json.loads(fetch(f'https://en.wikipedia.org/w/api.php?{q}'))
        query = data.get('query', {})
        norm = {n['from']: n['to'] for n in query.get('normalized', [])}
        redir = {r['from']: r['to'] for r in query.get('redirects', [])}
        pages = {p['title']: p for p in query.get('pages', {}).values()}
        for name in batch:
            title = redir.get(norm.get(name, name), norm.get(name, name))
            page = pages.get(title)
            found[name] = None if not page or 'missing' in page else title
        wiki_path.write_text(json.dumps(found, indent=1))
    print(f'{sum(v is not None for v in found.values())} of {len(found)} have a Wikipedia article')


# ---------------------------------------------------------------- list + contact sheet

def object_link(name, wiki):
    title = wiki.get(name)
    if title:
        return 'https://en.wikipedia.org/wiki/' + urllib.parse.quote(title.replace(' ', '_'))
    return 'https://simbad.cds.unistra.fr/simbad/sim-id?' + urllib.parse.urlencode({'Ident': name})


def write_list(objs):
    """One object per line, so a change to one object is a one-line diff."""
    lines = ',\n'.join(json.dumps(o, ensure_ascii=False) for o in objs)
    LIST.write_text(f'[\n{lines}\n]\n')


def load_list():
    return json.loads(LIST.read_text()) if LIST.exists() else []


def cmd_build(args):
    results = json.loads((CACHE / 'check-results.json').read_text())
    wiki_path = CACHE / 'wikipedia.json'
    wiki = json.loads(wiki_path.read_text()) if wiki_path.exists() else {}
    used = {o['id']: o.get('usedBy') for o in load_list()}
    objs, saturated = [], 0
    for c in load_candidates():
        if not results.get(c['id'], {}).get('ok'):
            continue
        rgb, _ = process(fits.getdata(CACHE / 'fits' / f'{c["id"]}.fits'))
        if core_artifact(rgb) > MAX_CORE_ARTIFACT:  # saturated core: rejected
            saturated += 1
            continue
        objs.append({**{k: c[k] for k in ('id', 'name', 'type', 'constellation', 'size', 'ra', 'dec', 'fov', 'commonName')},
                     'link': object_link(c['name'], wiki), 'usedBy': used.get(c['id'])})
    write_list(objs)
    print(f'wrote {LIST.relative_to(ROOT)} with {len(objs)} objects ({saturated} more rejected for a saturated core)')
    write_contact_sheet(objs)


def write_contact_sheet(objs):
    OUT.mkdir(parents=True, exist_ok=True)
    cards = '\n'.join(
        f'<figure data-type="{o["type"]}" data-name="{o["id"]}" data-size="{o["size"][0]}" data-used="{bool(o["usedBy"])}">'
        f'<img src="previews/{o["id"]}.jpg" width="160" height="160" loading="lazy" alt="">'
        f'<figcaption><b>{o["name"]}</b>{" · " + o["commonName"] if o["commonName"] else ""}<br>{o["type"]}<br>'
        f'{o["constellation"]} · {o["size"][0]:g}′{" · used by " + o["usedBy"] if o["usedBy"] else ""}</figcaption></figure>'
        for o in objs)
    html = f'''<!doctype html><meta charset="utf-8"><title>NGC contact sheet</title>
<style>
body{{font:13px/1.4 system-ui,sans-serif;margin:1rem;background:#0e1624;color:#e3e8ef}}
header{{position:sticky;top:0;background:#0e1624;padding:.5rem 0;z-index:1}}
#grid{{display:grid;grid-template-columns:repeat(auto-fill,160px);gap:14px}}
figure{{margin:0}} img{{display:block;background:#162236}} figcaption{{margin-top:4px;color:#a1adbd}} b{{color:#e3e8ef}}
figure[data-used=True] img{{outline:3px solid #8db8f0}}
</style>
<header>{len(objs)} objects that passed the check · sort by
<select id="sort"><option value="type">type</option><option value="name">name</option><option value="size">size</option></select>
· filter <input id="q" placeholder="e.g. spiral, Fornax"> · pick one, then run <code>npm run ngc -- make NGC1300 --post &lt;slug&gt;</code></header>
<div id="grid">{cards}</div>
<script>
const grid=document.getElementById('grid'),items=[...grid.children];
function sort(){{const k=document.getElementById('sort').value;items.sort((a,b)=>k==='size'?b.dataset.size-a.dataset.size:
 (a.dataset[k]||'').localeCompare(b.dataset[k]||'')||a.dataset.name.localeCompare(b.dataset.name));grid.append(...items)}}
document.getElementById('sort').onchange=sort;
document.getElementById('q').oninput=e=>{{const q=e.target.value.toLowerCase();for(const f of items)f.hidden=!f.textContent.toLowerCase().includes(q)}};
sort();
</script>'''
    (OUT / 'contact-sheet.html').write_text(html)
    print(f'wrote {(OUT / "contact-sheet.html").relative_to(ROOT)}')


# ---------------------------------------------------------------- per-post images

def render(obj, width, height):
    """Download a cutout for obj at (width, height) px, framed so the field of view fits the shorter
    side, never finer than the native pixel scale; resample to the exact size if needed."""
    fov_short = obj['fov'] * 60  # arcsec across the shorter side
    pixscale = max(NATIVE_PIXSCALE, fov_short / min(width, height))
    w = round(width * fov_short / min(width, height) / pixscale)
    h = round(height * fov_short / min(width, height) / pixscale)
    path = CACHE / 'renders' / f'{obj["id"]}-{w}x{h}.fits'
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists():
        fetch(cutout_url(obj['ra'], obj['dec'], pixscale, w, h), path)
    rgb, _ = process(fits.getdata(path))
    img = to_image(rgb)
    return img if img.size == (width, height) else img.resize((width, height), Image.LANCZOS)


def find_object(name):
    key = name.upper().replace(' ', '')
    key = re.sub(r'^NGC(\d+)', lambda m: 'NGC' + m.group(1).zfill(4), key)
    objs = load_list()
    for o in objs:
        if o['id'] == key:
            return o, objs
    sys.exit(f'{name} is not in {LIST.relative_to(ROOT)} (not a candidate, or it failed the check)')


def set_frontmatter(post_path, block):
    text = post_path.read_text()
    m = re.match(r'---\n(.*?)\n---\n', text, re.S)
    if not m:
        sys.exit(f'{post_path} has no frontmatter')
    lines = m.group(1).split('\n')
    kept, skipping = [], False
    for line in lines:  # drop an existing ngc: block
        if line.startswith('ngc:'):
            skipping = True
            continue
        if skipping and (line.startswith(' ') or not line.strip()):
            continue
        skipping = False
        kept.append(line)
    fm = '\n'.join(kept + block)
    post_path.write_text(f'---\n{fm}\n---\n' + text[m.end():])


def cmd_make(args):
    obj, objs = find_object(args.name)
    post = next(iter(sorted(POSTS.glob(f'{args.post}.md*'))), None) or next(
        (p for p in POSTS.glob('*.md*') if re.search(rf'^slug:\s*["\']?{re.escape(args.post)}["\']?\s*$', p.read_text(), re.M)), None)
    if not post:
        sys.exit(f'no post "{args.post}" in {POSTS.relative_to(ROOT)}')
    slug = args.post
    if obj.get('usedBy') and obj['usedBy'] != slug:
        sys.exit(f'{obj["name"]} is already used by the post "{obj["usedBy"]}"')
    for o in objs:  # a post has one NGC: free the one it had before
        if o.get('usedBy') == slug and o['id'] != obj['id']:
            o['usedBy'] = None
    IMAGES.mkdir(parents=True, exist_ok=True)
    base = obj['id'].lower()
    render(obj, HEADER_W, HEADER_H).save(IMAGES / f'{base}-header.jpg', quality=86, progressive=True)
    square = render(obj, THUMB_MEDIUM, THUMB_MEDIUM)
    square.save(IMAGES / f'{base}-medium.jpg', quality=86)
    square.resize((THUMB_SMALL, THUMB_SMALL), Image.LANCZOS).save(IMAGES / f'{base}-thumb.jpg', quality=86)
    q = lambda s: json.dumps(s, ensure_ascii=False)  # noqa: E731 — JSON strings are valid YAML
    set_frontmatter(post, [
        'ngc:',
        f'  name: {q(obj["name"])}',
        f'  image: {q(f"/images/ngc/{base}-header.jpg")}',
        f'  thumb: {q(f"/images/ngc/{base}-thumb.jpg")}',
        f'  medium: {q(f"/images/ngc/{base}-medium.jpg")}',
        f'  type: {q(obj["type"])}',
        f'  description: {q(obj["type"] + " in " + obj["constellation"])}',
        f'  credit: {q(CREDIT)}',
        f'  creditUrl: {q(viewer_url(obj["ra"], obj["dec"], obj["fov"]))}',
        f'  objectUrl: {q(obj["link"])}',
    ])
    obj['usedBy'] = slug
    write_list(objs)
    print(f'{obj["name"]} → {post.relative_to(ROOT)}; images in {IMAGES.relative_to(ROOT)}/{base}-*.jpg')


def cmd_samples(args):
    objs = {o['id']: o for o in load_list()}
    (OUT / 'samples').mkdir(parents=True, exist_ok=True)
    figs = []
    for name in args.names:
        o, _ = find_object(name)
        f = f'samples/{o["id"].lower()}-header.jpg'
        render(o, HEADER_W, HEADER_H).save(OUT / f, quality=86, progressive=True)
        figs.append(f'<figure><img src="{f}" alt=""><figcaption>{o["name"]}, {o["type"]} in {o["constellation"]} · '
                    f'{o["size"][0]:g}′</figcaption></figure>')
    html = f'''<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>NGC header samples</title>
<style>
:root{{--bg:#f1f4f8;--text:#1b2430;--muted:#4d5969}}
@media (prefers-color-scheme:dark){{:root{{--bg:#0e1624;--text:#e3e8ef;--muted:#a1adbd}}}}
body{{margin:0;background:var(--bg);color:var(--text);font:16px/1.5 system-ui,sans-serif}}
main{{max-width:68ch;margin:0 auto;padding:1.5rem 1rem}}
img{{display:block;width:100%;height:auto;border-radius:4px}} figure{{margin:0 0 2rem}}
figcaption{{font-size:.85rem;color:var(--muted);margin-top:.5rem}}
</style><main><h1>NGC header samples</h1>{"".join(figs)}</main>'''
    (OUT / 'samples.html').write_text(html)
    print(f'wrote {(OUT / "samples.html").relative_to(ROOT)}')


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest='cmd', required=True)
    sub.add_parser('candidates')
    c = sub.add_parser('check')
    c.add_argument('--limit', type=int)
    sub.add_parser('wiki')
    sub.add_parser('build')
    m = sub.add_parser('make')
    m.add_argument('name')
    m.add_argument('--post', required=True)
    s = sub.add_parser('samples')
    s.add_argument('names', nargs='+')
    argv = sys.argv[1:]
    if argv and re.match(r'^NGC', argv[0], re.I):  # `ngc NGC1300 --post slug` is short for `ngc make …`
        argv = ['make'] + argv
    args = p.parse_args(argv)
    {'candidates': cmd_candidates, 'check': cmd_check, 'wiki': cmd_wiki, 'build': cmd_build,
     'make': cmd_make, 'samples': cmd_samples}[args.cmd](args)


if __name__ == '__main__':
    main()
