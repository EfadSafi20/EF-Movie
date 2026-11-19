import http.server
import socketserver
import socket
import webbrowser
import os
import sys

PORT = 3000

def get_local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # Doesn't even have to be reachable
        s.connect(('10.255.255.255', 1))
        IP = s.getsockname()[0]
    except Exception:
        IP = '127.0.0.1'
    finally:
        s.close()
    return IP

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Enable CORS and caching headers for high performance
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

def main():
    # Ensure current working directory is the script directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)

    local_ip = get_local_ip()
    url_local = f"http://localhost:{PORT}"
    url_network = f"http://{local_ip}:{PORT}"

    print("=" * 65)
    print("🎬  EF MOVIE — STREAMING PLATFORM SERVER RUNNING  🎬")
    print("=" * 65)
    print(f"💻  Computer / Desktop Access:   {url_local}")
    print(f"📱  Smartphone Access (Same WiFi): {url_network}")
    print(f"📺  Smart TV Access (Web Browser): {url_network}")
    print("=" * 65)
    print("Tip: On Smart TVs (Samsung, LG, Android TV), open the TV's")
    print(f"built-in web browser and type: {url_network}")
    print("Press Ctrl+C to stop the server anytime.")
    print("=" * 65)

    # Automatically launch in default browser on PC
    try:
        webbrowser.open(url_local)
    except Exception:
        pass

    with socketserver.TCPServer(("", PORT), QuietHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server. Goodbye!")

if __name__ == '__main__':
    main()
