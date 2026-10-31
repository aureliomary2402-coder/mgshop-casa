#!/usr/bin/env python3
"""
Rende i colori del sito dipendenti dal tema (Halloween / Originale).

Cosa fa (si puo rilanciare senza problemi, non rompe nulla):
1. tailwind.config.js: la palette "zucca" usa variabili CSS invece di colori fissi
2. app/globals.css: aggiunge il blocco con i colori dei temi
3. in app/ e components/ (esclusi admin e api) sostituisce i colori fissi di
   Halloween (#d95500, #ff9a3d, rgba(217,85,0,.2)...) con variabili CSS

Per aggiungere un tema nuovo: aggiungi una colonna in PALETTES e rilancia.
Lancialo dalla cartella del progetto:  python3 applica-tema.py
"""
import os, re, sys

# ---- colori: chiave = colore Halloween (quello oggi nel codice) ----
# ogni tema da il suo colore per ciascuna chiave
PALETTES = {
    'halloween': None,  # i colori Halloween sono le chiavi stesse
    'bolle': {
        'd95500': '0891b2', 'ff9a3d': '22d3ee', 'ff7a1a': '06b6d4', 'ff8f33': '22d3ee',
        'ffb066': '67e8f9', 'ffb877': '67e8f9', 'ffe9d2': 'cffafe',
        'fff7ee': 'f0fbfd', 'fffaf4': 'f8fdfe', 'fff3e6': 'eafbff', 'fff0e0': 'e0f7fb',
        'a23800': '0e7490', '5a1c00': '164e63',
        '1a0d33': '0c2b36', '2a1450': '164e63', '3d1b73': '155e75', '160b29': '0a2733',
        '120a22': '08222c', '5b2a9e': '0e7490', '2d1458': '164e63', '2e0d57': '0c3a4a',
        '4c1a8a': '0e7490', '1f0e3d': '0c2b36', '7c3aed': '0ea5e9',
        'ffe6cf': 'd5f5fa', 'ffeedd': 'e3f9fc', 'ffbe78': '67e8f9', 'ff9646': '22d3ee', 'ffd2a0': 'a5f3fc',
    },
}
# scala "zucca" di Tailwind (classi bg-zucca-400, text-zucca-600/50...)
ZUCCA = {
    'halloween': {'50': 'fff7ee', '100': 'ffe9d2', '200': 'ffd0a1', '300': 'ffb066', '400': 'ff8f33',
                  '500': 'ff7a1a', '600': 'd95500', '700': '5b2a9e', '800': '3d1b73', '900': '2a1450', '950': '150b26'},
    'bolle': {'50': 'ecfeff', '100': 'cffafe', '200': 'a5f3fc', '300': '67e8f9', '400': '22d3ee',
              '500': '06b6d4', '600': '0891b2', '700': '0e7490', '800': '155e75', '900': '164e63', '950': '083344'},
}
DEFAULT_THEME = 'bolle'  # senza data-theme vale questo

KEYS = list(PALETTES['bolle'].keys())

def rgb(h): return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

def theme_block():
    out = ['/* THEME-VARS:START (generato da applica-tema.py: non modificare a mano) */']
    for name in [DEFAULT_THEME] + [t for t in PALETTES if t != DEFAULT_THEME]:
        sel = ':root' if name == DEFAULT_THEME else f'html[data-theme="{name}"]'
        lines = []
        for k in KEYS:
            h = k if PALETTES[name] is None else PALETTES[name][k]
            r, g, b = rgb(h)
            lines.append(f'  --c-{k}: #{h};')
            lines.append(f'  --c-{k}-rgb: {r},{g},{b};')
        for n, h in ZUCCA[name].items():
            r, g, b = rgb(h)
            lines.append(f'  --z-{n}: {r} {g} {b};')
        out.append(sel + ' {\n' + '\n'.join(lines) + '\n}')
    out.append('/* THEME-VARS:END */')
    return '\n'.join(out) + '\n'

changed = []

def write_if_changed(path, new, old):
    if new != old:
        open(path, 'w', encoding='utf-8').write(new)
        changed.append(path)

# 1) tailwind.config.js
p = 'tailwind.config.js'
if not os.path.exists(p): sys.exit('Lancialo dalla cartella del progetto (non trovo tailwind.config.js)')
s = open(p, encoding='utf-8').read()
scale = ', '.join(f"{n}: 'rgb(var(--z-{n}) / <alpha-value>)'" for n in ZUCCA['halloween'])
new = re.sub(r'zucca:\s*\{.*?\n\s*\},', 'zucca: {\n          ' + scale.replace(', ', ',\n          ') + ',\n        },', s, count=1, flags=re.S)
write_if_changed(p, new, s)

# 2) blocco temi in globals.css
p = 'app/globals.css'
s = open(p, encoding='utf-8').read()
block = theme_block()
if 'THEME-VARS:START' in s:
    s2 = re.sub(r'/\* THEME-VARS:START.*?THEME-VARS:END \*/\n', block, s, flags=re.S)
else:
    m = re.search(r'(@tailwind utilities;\n)', s)
    if not m: sys.exit('Non trovo @tailwind utilities in app/globals.css')
    s2 = s[:m.end()] + '\n' + block + s[m.end():]
s2 = s2.replace('MODALITA VELOCE (Halloween): toglie', 'MODALITA VELOCE (tutti i temi): toglie')
write_if_changed(p, s2, s)

# 3) colori fissi -> variabili
hex_re = re.compile(r'#(' + '|'.join(KEYS) + r')\b', re.I)
cls_re = re.compile(r'-\[#(' + '|'.join(KEYS) + r')\]', re.I)
rgb_res = []
for k in KEYS:
    r, g, b = rgb(k)
    rgb_res.append((re.compile(r'(?<![A-Za-z])rgba?\(\s*%d\s*,\s*%d\s*,\s*%d\s*(,|\))' % (r, g, b)), k))

SKIP_DIRS = {'api', 'mgadmin-panel', 'admin', 'ui', 'node_modules', '.next'}
SKIP_FILES = {'halloween-decor.tsx'}
warn = []

def convert(text):
    text = cls_re.sub(lambda m: f'-[color:var(--c-{m.group(1).lower()})]', text)
    text = hex_re.sub(lambda m: f'var(--c-{m.group(1).lower()})', text)
    for rx, k in rgb_res:
        text = rx.sub(lambda m: f'rgba(var(--c-{k}-rgb){m.group(1)}' if m.group(1) == ',' else f'rgb(var(--c-{k}-rgb))', text)
    return text

for root in ('app', 'components'):
    for d, dirs, files in os.walk(root):
        dirs[:] = [x for x in dirs if x not in SKIP_DIRS]
        for f in files:
            if not f.endswith(('.tsx', '.ts', '.css')) or f in SKIP_FILES: continue
            path = os.path.join(d, f)
            old = open(path, encoding='utf-8').read()
            new = convert(old)
            if path == 'app/globals.css':
                # il blocco dei temi deve restare con i colori veri
                a = old.index('THEME-VARS:START'); b = old.index('THEME-VARS:END')
                na = new.index('THEME-VARS:START'); nb = new.index('THEME-VARS:END')
                new = new[:na] + old[a:b] + new[nb:]
            if re.search(r'-\[var\(--c-[0-9a-f]{6}\)\]/', new): warn.append(path)
            write_if_changed(path, new, old)

changed = list(dict.fromkeys(changed))
print(f'Fatto. File modificati: {len(changed)}')
for c in changed: print('  ' + c)
if warn: print('ATTENZIONE: opacita su colore variabile in:', ', '.join(warn))
