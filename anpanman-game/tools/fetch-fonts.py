"""Download M PLUS Rounded 1c (SIL OFL) subset to just the characters the game draws.
Re-run after adding new on-screen text:  python3 tools/fetch-fonts.py"""
import re, subprocess, urllib.parse, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
src = ''.join((root / 'js' / f).read_text(encoding='utf-8') for f in ['game.js', 'art.js', 'levels.js', 'main.js'])
chars = {c for c in src if ord(c) > 127} | {chr(i) for i in range(32, 127)}
text = ''.join(sorted(chars))
ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'
for w in (800, 900):
    url = 'https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@%d&text=%s' % (w, urllib.parse.quote(text))
    css = subprocess.run(['curl', '-sS', '-A', ua, url], capture_output=True, text=True, check=True).stdout
    font_url = re.findall(r'url\((https://[^)]+)\)', css)[0]
    subprocess.run(['curl', '-sS', '-A', ua, '-o', str(root / 'fonts' / f'mplus-rounded-{w}.woff2'), font_url], check=True)
    print('saved weight', w)
