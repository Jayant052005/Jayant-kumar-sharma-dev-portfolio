import socket
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import sys

class DualStackServer(ThreadingHTTPServer):
    address_family = socket.AF_INET6
    def server_bind(self):
        self.socket.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
        return super().server_bind()

class RobustHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Accept-Ranges', 'bytes')
        # Disable caching for JS, CSS, and HTML so changes reflect immediately
        if self.path.endswith(('.js', '.css', '.html', '/')) or '?' in self.path:
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
            self.send_header('Pragma', 'no-cache')
            self.send_header('Expires', '0')
        else:
            # GLB and other large binary assets can be cached
            self.send_header('Cache-Control', 'public, max-age=3600')
        super().end_headers()

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5500
    try:
        server = DualStackServer(('::', port), RobustHandler)
    except Exception as e:
        print(f"Dual-stack failed ({e}), falling back to IPv4...")
        server = ThreadingHTTPServer(('0.0.0.0', port), RobustHandler)
    print(f"Threading HTTP server running on port {port} (IPv4 and IPv6 localhost supported)")
    server.serve_forever()

