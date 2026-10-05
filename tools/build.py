"""Polar Ark build: shared code from src/ + a platform layer per target.
   docs/        -> plain web build (GitHub Pages demo, no ads, no purchases)
   build/yandex -> polar-ark-yandex.zip  (Yandex Games console, index.html in the root)
   vk/game      -> polar-ark-vk.zip      (VK mini apps hosting; no audio/video files)"""
import os, shutil, zipfile, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'src')
JS = ['data', 'i18n', 'core', 'art', 'audio', 'render', 'ui']

def build(target, platform_js, head, extra_files, out_dir, zip_path):
    if os.path.isdir(out_dir):
        shutil.rmtree(out_dir)
    os.makedirs(os.path.join(out_dir, 'js'))
    os.makedirs(os.path.join(out_dir, 'css'))
    html = open(os.path.join(SRC, 'index.template.html'), encoding='utf8').read()
    html = html.replace('<!--PLATFORM_SCRIPTS-->', head)
    open(os.path.join(out_dir, 'index.html'), 'w', encoding='utf8').write(html)
    shutil.copy(os.path.join(SRC, 'css', 'style.css'), os.path.join(out_dir, 'css', 'style.css'))
    for j in JS:
        shutil.copy(os.path.join(SRC, 'js', j + '.js'), os.path.join(out_dir, 'js', j + '.js'))
    shutil.copy(os.path.join(SRC, 'js', platform_js), os.path.join(out_dir, 'js', 'platform.js'))
    for src, dst in extra_files:
        shutil.copy(os.path.join(SRC, 'js', src), os.path.join(out_dir, 'js', dst))
    fav = os.path.join(SRC, 'favicon.png')
    if os.path.exists(fav):
        shutil.copy(fav, os.path.join(out_dir, 'favicon.png'))
    # zip со слэшами '/'
    if zip_path:
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as z:
            for d, _, files in os.walk(out_dir):
                for f in files:
                    full = os.path.join(d, f)
                    z.write(full, os.path.relpath(full, out_dir).replace(os.sep, '/'))
    size = sum(os.path.getsize(os.path.join(d, f)) for d, _, fs in os.walk(out_dir) for f in fs)
    print(target, 'OK', round(size / 1024), 'KB', '->', out_dir)

build('web', 'platform-yandex.js',
      '<script src="js/platform.js"></script>', [],
      os.path.join(ROOT, 'docs'), None)
build('yandex', 'platform-yandex.js',
      '<script src="/sdk.js"></script>\n<script src="js/platform.js"></script>', [],
      os.path.join(ROOT, 'build', 'yandex'), os.path.join(ROOT, 'polar-ark-yandex.zip'))
build('vk', 'platform-vk.js',
      '<script src="js/vk-bridge.min.js"></script>\n<script src="js/config.js"></script>\n<script src="js/platform.js"></script>',
      [('vk-bridge.min.js', 'vk-bridge.min.js'), ('vk-config.js', 'config.js')],
      os.path.join(ROOT, 'vk', 'game'), os.path.join(ROOT, 'polar-ark-vk.zip'))

# запрет аудио/видеофайлов в VK-сборке и сторонних доменов
bad = []
for target in ('docs', 'build/yandex', 'vk/game'):
    for d, _, files in os.walk(os.path.join(ROOT, target)):
        for f in files:
            if f.lower().endswith(('.mp3', '.ogg', '.wav', '.mp4', '.webm', '.m4a')):
                bad.append(os.path.join(d, f))
            if f.endswith(('.js', '.html', '.css')):
                txt = open(os.path.join(d, f), encoding='utf8', errors='ignore').read()
                if f == 'vk-bridge.min.js':
                    continue
                for m in re.findall(r'https?://[^\s"\'<>)]+', txt):
                    if not re.match(r'https?://(www\.w3\.org|vk\.(ru|com)|dev\.vk|yandex)', m):
                        bad.append(f + ': ' + m)
print('Проверка внешних ресурсов/медиа:', 'ЧИСТО' if not bad else bad)
