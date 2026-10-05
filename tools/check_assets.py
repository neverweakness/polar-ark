"""Проверка размеров/форматов ассетов в папке ЗАГРУЗКА по таблице GAME_PLAYBOOK.md (раздел 6.1)."""
import os, struct, sys, zipfile
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
Z = os.path.join(ROOT, 'ЗАГРУЗКА')
YA = os.path.join(Z, 'Яндекс Игры')
VK = os.path.join(Z, 'VK')
sys.stdout.reconfigure(encoding='utf8')
bad = 0


def rel(p):
    return os.path.relpath(p, Z)


def img(path, size, fmt, alpha_ok=True, long_range=None, ratio=None, max_kb=None):
    global bad
    if not os.path.exists(path):
        print('НЕТ   ', rel(path)); bad += 1; return
    im = Image.open(path); w, h = im.size; errs = []
    if size and (w, h) != size: errs.append('размер %dx%d, нужно %dx%d' % (w, h, size[0], size[1]))
    if fmt and im.format != fmt: errs.append('формат %s, нужен %s' % (im.format, fmt))
    if not alpha_ok and ('A' in im.getbands()): errs.append('есть альфа-канал')
    if long_range and not (long_range[0] <= max(w, h) <= long_range[1]): errs.append('длинная сторона %d вне %s' % (max(w, h), long_range))
    if ratio and abs(w / h - ratio) > 0.02: errs.append('пропорции %.3f, нужно %.3f' % (w / h, ratio))
    kb = os.path.getsize(path) / 1024
    if max_kb and kb > max_kb: errs.append('%.0f КБ > %d КБ' % (kb, max_kb))
    print('OK    ' if not errs else 'ОШИБКА', rel(path), '%dx%d %s %.0f КБ' % (w, h, im.format, kb), '; '.join(errs))
    bad += bool(errs)


def mp4(path, vertical):
    global bad
    if not os.path.exists(path): print('НЕТ   ', rel(path)); bad += 1; return
    d = open(path, 'rb').read()
    i = d.find(b'mvhd'); ver = d[i + 4]
    if ver == 1: ts, dur = struct.unpack('>IQ', d[i + 24:i + 36])
    else: ts, dur = struct.unpack('>II', d[i + 16:i + 24])
    sec = dur / ts if ts else 0
    j = d.find(b'tkhd'); size = struct.unpack('>I', d[j - 4:j])[0]
    w = struct.unpack('>I', d[j - 4 + size - 8:j - 4 + size - 4])[0] >> 16; h = struct.unpack('>I', d[j - 4 + size - 4:j - 4 + size])[0] >> 16
    mb = len(d) / 1048576; errs = []
    if sec <= 0: errs.append('нет длительности (нужен remux_mp4.py)')
    if sec > 28: errs.append('длительность %.1f с > 28' % sec)
    if mb > 100: errs.append('%.1f МБ > 100' % mb)
    if vertical and not (h > w): errs.append('не вертикальное')
    if not vertical and (w * 9 != h * 16 or h < 400): errs.append('нужно 16:9, высота ≥400')
    print('OK    ' if not errs else 'ОШИБКА', rel(path), '%dx%d %.1f с %.1f МБ' % (w, h, sec, mb), '; '.join(errs))
    bad += bool(errs)


def files(d, ext=('.jpg', '.png')):
    return sorted(os.path.join(d, f) for f in os.listdir(d) if f.lower().endswith(ext)) if os.path.isdir(d) else []


def zipchk(path):
    global bad
    if not os.path.exists(path): print('НЕТ   ', rel(path)); bad += 1; return
    names = zipfile.ZipFile(path).namelist()
    ok = 'index.html' in names and not any(chr(92) in n for n in names)
    print('OK    ' if ok else 'ОШИБКА', rel(path), len(names), 'файлов', '%.0f КБ' % (os.path.getsize(path) / 1024), 'index.html в корне и слэши /' if ok else 'ПРОБЛЕМА СО СТРУКТУРОЙ')
    bad += (not ok)


print('--- Яндекс Игры')
zipchk(os.path.join(YA, '01-архив-игры', 'polar-ark-yandex.zip'))
img(os.path.join(YA, '02-иконка-512', 'icon-512.png'), (512, 512), 'PNG')
img(os.path.join(YA, '03-обложка-800x470', 'cover-800x470.png'), (800, 470), 'PNG')
ms = files(os.path.join(YA, '04-скриншоты-мобильные'))
if len(ms) < 3: print('ОШИБКА мало мобильных скриншотов'); bad += 1
for f in ms: img(f, None, 'JPEG', alpha_ok=False, long_range=(1280, 2560), ratio=9 / 16)
ds = files(os.path.join(YA, '05-скриншоты-десктоп'))
if len(ds) < 3: print('ОШИБКА мало десктопных скриншотов'); bad += 1
for f in ds: img(f, None, 'JPEG', alpha_ok=False, long_range=(1280, 2560), ratio=16 / 9)
for lang, d in (('RU', '06-видео-RU'), ('EN', '07-видео-EN')):
    mp4(os.path.join(YA, d, 'video-%s-horizontal-16x9.mp4' % lang), False)
    mp4(os.path.join(YA, d, 'video-%s-vertical-9x16.mp4' % lang), True)
for f in ('coins_s', 'coins_m', 'sci_pack', 'thermo', 'no_ads'):
    img(os.path.join(YA, '08-товары', f + '.png'), (256, 256), 'PNG')
for f in ('products-draft.csv', 'PRODUCTS.md'):
    p = os.path.join(YA, '08-товары', f); print('OK    ' if os.path.exists(p) else 'НЕТ   ', rel(p)); bad += (not os.path.exists(p))
print('--- VK')
img(os.path.join(VK, '01-иконки', 'icon-576.png'), (576, 576), 'PNG')
img(os.path.join(VK, '01-иконки', 'icon-278.png'), (278, 278), 'PNG')
img(os.path.join(VK, '01-иконки', 'icon-150.png'), (150, 150), 'PNG')
img(os.path.join(VK, '01-иконки', 'favicon-32.png'), (32, 32), 'PNG', max_kb=50)
img(os.path.join(VK, '02-сниппет-1120x630', 'vk-snippet-1120x630.png'), (1120, 630), 'PNG')
vs = files(os.path.join(VK, '03-скриншоты-600x1200'))
if len(vs) < 3: print('ОШИБКА мало скриншотов VK'); bad += 1
for f in vs: img(f, (600, 1200), 'JPEG')
mp4(os.path.join(VK, '04-видео', 'video-RU-vertical.mp4'), True)
mp4(os.path.join(VK, '04-видео', 'video-EN-vertical.mp4'), True)
zipchk(os.path.join(VK, '05-хостинг', 'polar-ark-vk.zip'))
print('ИТОГ:', 'всё в норме' if not bad else '%d проблем(ы)' % bad)
sys.exit(1 if bad else 0)
