# Serve the game with caching turned off, so every reload shows the latest code.
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

class NoCache(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()
    def log_message(self, *a): pass
    def handle(self):
        try: super().handle()
        except (BrokenPipeError, ConnectionResetError): pass   # the browser dropped a sound mid-download: fine

port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
ThreadingHTTPServer(('', port), NoCache).serve_forever()
