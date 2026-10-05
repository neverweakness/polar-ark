import http.server, socketserver, os, base64, json, sys
ROOT = os.path.dirname(os.path.abspath(__file__))
GAME = os.path.join(ROOT, sys.argv[1] if len(sys.argv) > 1 else 'build/yandex')
PORT = int(sys.argv[2]) if len(sys.argv) > 2 else 8130
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=GAME, **k)
    def translate_path(self, path):
        if path.startswith('/_files/'):
            return os.path.join(ROOT, path[len('/_files/'):].split('?')[0].replace('/', os.sep))
        return super().translate_path(path)
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Private-Network', 'true')
        super().end_headers()
    def do_OPTIONS(self):
        self.send_response(204); self.end_headers()
    def do_POST(self):
        n = int(self.headers.get('Content-Length', 0)); d = json.loads(self.rfile.read(n))
        rel = d['name'].replace(chr(92), '/').lstrip('/')
        if '..' in rel.split('/'):
            self.send_response(400); self.end_headers(); return
        out = os.path.join(ROOT, 'store-assets', rel.replace('/', os.sep))
        os.makedirs(os.path.dirname(out), exist_ok=True)
        open(out, 'wb').write(base64.b64decode(d['data'].split(',')[1]))
        self.send_response(200); self.end_headers(); self.wfile.write(b'ok')
    def log_message(self, *a): pass
socketserver.ThreadingTCPServer.allow_reuse_address = True
socketserver.ThreadingTCPServer.daemon_threads = True
socketserver.ThreadingTCPServer(('127.0.0.1', PORT), H).serve_forever()
