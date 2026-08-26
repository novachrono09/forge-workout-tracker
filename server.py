import http.server
import socketserver
import socket

PORT = 8080

class NoCacheHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

if __name__ == '__main__':
    socketserver.TCPServer.allow_reuse_address = True
    local_ip = get_local_ip()
    with socketserver.TCPServer(("", PORT), NoCacheHTTPRequestHandler) as httpd:
        print(f"🚀 FORGE Server running at:")
        print(f"   • Local:   http://localhost:{PORT}")
        print(f"   • Network: http://{local_ip}:{PORT}")
        print(f"⚡ Zero-Cache Enabled")
        httpd.serve_forever()
