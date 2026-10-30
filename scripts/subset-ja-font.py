"""Cut the Japanese heading font down to the characters the site uses, so phones download ~100-200 KB instead of MBs.

The source is 源暎きわみゴ / GenEi Kiwami Gothic (SIL OFL 1.1). The OFL reserves the names "源暎", "GenEi" and
"Source" for modified versions, and a subset counts as one, so the output is renamed "Court Order JA"
(copyright and licence fields are kept). Licence text: src/fonts/OFL.txt.

Re-run after adding Japanese names or text with new kanji:
    pip install fonttools brotli
    python scripts/subset-ja-font.py "D:/Fonts/JP/GenEiKiwamiGo_v1.2/GenEiKiwamiGo.ttf"
Characters missing from the subset still show, just in the fallback system font.
"""
import pathlib
import sys

from fontTools import subset

FAMILY = 'Court Order JA'
root = pathlib.Path(__file__).resolve().parent.parent
source = sys.argv[1] if len(sys.argv) > 1 else 'D:/Fonts/JP/GenEiKiwamiGo_v1.2/GenEiKiwamiGo.ttf'
output = root / 'src' / 'fonts' / 'court-order-ja.woff2'

text = set()
for path in (root / 'src').rglob('*'):
    if path.suffix in {'.js', '.jsx', '.json'}:
        text.update(ch for ch in path.read_text(encoding='utf-8') if ord(ch) > 127)

# Always keep ASCII, every kana and the Japanese / full-width punctuation, whatever the text uses today.
ranges = [(0x20, 0x7E), (0x3000, 0x303F), (0x3040, 0x309F), (0x30A0, 0x30FF), (0xFF01, 0xFF5E)]
for start, end in ranges:
    text.update(chr(code) for code in range(start, end + 1))

options = subset.Options()
options.flavor = 'woff2'
options.layout_features = ['*']
options.name_IDs = ['*']
options.notdef_outline = True
font = subset.load_font(source, options)
subsetter = subset.Subsetter(options)
subsetter.populate(text=''.join(sorted(text)))
subsetter.subset(font)

# Rename: family / full / PostScript / unique / typographic names must not use the reserved font names.
names = {1: FAMILY, 3: f'{FAMILY} subset', 4: FAMILY, 6: FAMILY.replace(' ', ''), 16: FAMILY, 17: 'Regular', 21: FAMILY, 22: 'Regular'}
name_table = font['name']
for record in list(name_table.names):
    if record.nameID in names:
        name_table.setName(names[record.nameID], record.nameID, record.platformID, record.platEncID, record.langID)
for record in name_table.names:
    value = record.toUnicode()
    if record.nameID not in (0, 13, 14) and ('GenEi' in value or '源暎' in value):
        raise SystemExit(f'Reserved font name left in name ID {record.nameID}: {value}')

output.parent.mkdir(parents=True, exist_ok=True)
subset.save_font(font, str(output), options)
print(f'{len(text)} characters -> {output.relative_to(root)} ({output.stat().st_size // 1024} KB)')
