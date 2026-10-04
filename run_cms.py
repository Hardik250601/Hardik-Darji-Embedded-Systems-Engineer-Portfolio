#!/usr/bin/env python3
"""Run the portfolio CMS locally and proxy its Neon/Blob API calls to Vercel."""

from __future__ import annotations

import argparse
import json
import mimetypes
import os
import threading
import urllib.error
import urllib.request
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parent
API_ORIGIN = "https://hardikmdarji.vercel.app"
MAX_CONTENT_BYTES = 2 * 1024 * 1024
MAX_IMAGE_BYTES = 4 * 1024 * 1024
BLOCKED_SEGMENTS = {".git", ".github", "node_modules", ".og-cache"}
BLOCKED_FILES = {
    ".env", ".env.local", "README.md", "PROJECT_OVERVIEW.md", "DEPLOY.md",
    "GO-LIVE.md", "FINAL-GO-LIVE.md", "PROJECT_AUDIT.md", "WHAT-CHANGED.md",
}


class CmsHandler(BaseHTTPRequestHandler):
    server_version = "PortfolioLocalCMS/1.0"

    def do_GET(self):
        path = urlsplit(self.path).path
        if path in ("/api/content", "/api/media"):
            self._proxy_api()
            return
        if path.startswith("/api/"):
            self.send_error(404, "Unknown local API route")
            return
        self._serve_file(path)

    def do_PUT(self):
        if urlsplit(self.path).path != "/api/content":
            self.send_error(404, "Unknown local API route")
            return
        self._proxy_api(MAX_CONTENT_BYTES)

    def do_POST(self):
        path = urlsplit(self.path).path
        if path not in ("/api/media", "/api/auth"):
            self.send_error(404, "Unknown local API route")
            return
        self._proxy_api(4096 if path == "/api/auth" else MAX_IMAGE_BYTES)

    def do_DELETE(self):
        if urlsplit(self.path).path != "/api/media":
            self.send_error(404, "Unknown local API route")
            return
        self._proxy_api(4096)

    def _proxy_api(self, max_bytes: int | None = None):
        length_header = self.headers.get("Content-Length")
        body = None
        if length_header is not None:
            try:
                length = int(length_header)
            except ValueError:
                self.send_error(400, "Invalid Content-Length")
                return
            if length < 0 or (max_bytes is not None and length > max_bytes):
                self._json_error(413, "Request is too large.")
                return
            body = self.rfile.read(length) if length else None
        elif max_bytes is not None:
            self.send_error(411, "Content-Length is required")
            return

        target = API_ORIGIN + self.path
        headers = {"Accept": "application/json"}
        for name in ("Authorization", "Content-Type", "Cookie", "Origin"):
            value = self.headers.get(name)
            if value:
                headers[name] = value
        request = urllib.request.Request(target, data=body, headers=headers, method=self.command)
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                response_body = response.read()
                status = response.status
                content_type = response.headers.get("Content-Type", "application/json; charset=utf-8")
                set_cookies = response.headers.get_all("Set-Cookie", [])
        except urllib.error.HTTPError as error:
            response_body = error.read()
            status = error.code
            content_type = error.headers.get("Content-Type", "application/json; charset=utf-8")
            set_cookies = error.headers.get_all("Set-Cookie", [])
        except (urllib.error.URLError, TimeoutError, OSError):
            self._json_error(502, "Could not reach the portfolio API. Check your internet connection and try again.")
            return

        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(response_body)))
        for cookie in set_cookies:
            self.send_header("Set-Cookie", cookie)
        self.end_headers()
        self.wfile.write(response_body)

    def _serve_file(self, request_path: str):
        relative = request_path.lstrip("/") or "index.html"
        candidate = (ROOT / relative).resolve()
        try:
            candidate.relative_to(ROOT)
        except ValueError:
            self.send_error(404)
            return

        # Match Vercel's clean URL behavior for pages such as /crm and /blogs.
        choices = [candidate]
        if not candidate.suffix:
            choices = [candidate.with_suffix(".html"), candidate / "index.html"]
        file_path = next((item for item in choices if item.is_file()), None)
        if file_path is None:
            self.send_error(404)
            return

        try:
            relative_file = file_path.relative_to(ROOT)
        except ValueError:
            self.send_error(404)
            return
        if any(part in BLOCKED_SEGMENTS for part in relative_file.parts):
            self.send_error(404)
            return
        if file_path.name in BLOCKED_FILES or file_path.suffix == ".py":
            self.send_error(404)
            return
        if relative_file.parts and relative_file.parts[0] == "api":
            self.send_error(404)
            return

        content = file_path.read_bytes()
        content_type = mimetypes.guess_type(file_path.name)[0] or "application/octet-stream"
        if content_type.startswith("text/") or content_type in {"application/javascript", "application/json", "image/svg+xml"}:
            content_type += "; charset=utf-8"
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(content)))
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(content)

    def _json_error(self, status: int, message: str):
        body = ("{\"error\":" + json.dumps(message) + "}").encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format_string, *args):
        # Authentication and cookie headers are deliberately not logged.
        print(f"[{self.log_date_time_string()}] {self.address_string()} {format_string % args}")


def main():
    parser = argparse.ArgumentParser(description="Open the portfolio CMS on this computer.")
    parser.add_argument("--port", type=int, default=8765, help="Local port (default: 8765)")
    parser.add_argument("--no-browser", action="store_true", help="Do not open the browser automatically")
    args = parser.parse_args()
    if not 1 <= args.port <= 65535:
        parser.error("--port must be between 1 and 65535")

    server = ThreadingHTTPServer(("127.0.0.1", args.port), CmsHandler)
    url = f"http://127.0.0.1:{args.port}/crm.html"
    print("Portfolio CMS is running locally.")
    print(f"Open: {url}")
    print("API: Neon, Blob, and CMS authentication requests are proxied to Vercel.")
    print("Press Ctrl+C to stop. CMS sessions are held in an HttpOnly browser cookie.")
    if not args.no_browser:
        threading.Timer(0.4, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping the local CMS.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
