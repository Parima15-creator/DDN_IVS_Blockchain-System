#!/usr/bin/env python3
"""
DocuChain — Local Development Server Launcher
Launches a simple HTTP server serving the frontend directory and opens default browser.
"""

import os
import sys
import webbrowser
import http.server
import socketserver

PORT = 3000
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'frontend')

class DocuChainRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=FRONTEND_DIR, **kwargs)

    def end_headers(self):
        # Add CORS and modern caching headers for local development
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

def main():
    print("=" * 64)
    print("  DocuChain — Blockchain Document Verification System")
    print("=" * 64)
    print(f"  • Serving directory : {FRONTEND_DIR}")
    print(f"  • Local application : http://localhost:{PORT}/")
    print("  • Opening browser...")
    print("  • Press Ctrl+C to terminate.")
    print("=" * 64)

    try:
        webbrowser.open(f"http://localhost:{PORT}/")
    except Exception as e:
        print(f"Could not open browser automatically: {e}")

    try:
        with socketserver.TCPServer(("", PORT), DocuChainRequestHandler) as httpd:
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[DocuChain] Server shut down gracefully.")
    except Exception as e:
        print(f"\n[Error] Failed to bind to port {PORT}: {e}")

if __name__ == '__main__':
    main()
