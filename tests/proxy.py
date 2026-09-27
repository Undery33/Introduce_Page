"""Exercise the checked-in Nginx policy without changing the system service.

Requires nginx, openssl and a running local app (PROXY_APP_PORT, default 3100).
Uses unprivileged loopback ports and a temporary, explicitly trusted test cert.
"""
import http.client
import os
from pathlib import Path
import re
import socket
import ssl
import subprocess
import tempfile
import time


def free_port():
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


with tempfile.TemporaryDirectory(prefix="undery-proxy-test-") as directory:
    temp = Path(directory)
    http_port, https_port = free_port(), free_port()
    subprocess.run([
        "openssl", "req", "-x509", "-newkey", "rsa:2048", "-nodes",
        "-keyout", str(temp / "key.pem"), "-out", str(temp / "cert.pem"),
        "-days", "1", "-subj", "/CN=localhost",
        "-addext", "subjectAltName=DNS:localhost,IP:127.0.0.1",
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    source = (Path(__file__).resolve().parents[1] / "deploy/nginx/undery.link.conf").read_text()
    source = re.sub(r"listen (?:\[::\]:)?80;", f"listen 127.0.0.1:{http_port};", source)
    source = re.sub(r"listen (?:\[::\]:)?443 ssl;", f"listen 127.0.0.1:{https_port} ssl;", source)
    # IPv4/IPv6 directives now refer to the same loopback test socket.
    source = re.sub(r"(    listen [^\n]+;)\n\1", r"\1", source)
    source = source.replace("/etc/letsencrypt/live/undery.link/fullchain.pem", str(temp / "cert.pem"))
    source = source.replace("/etc/letsencrypt/live/undery.link/privkey.pem", str(temp / "key.pem"))
    source = source.replace("127.0.0.1:3000", "127.0.0.1:" + os.environ.get("PROXY_APP_PORT", "3100"))
    configuration = temp / "nginx.conf"
    configuration.write_text(f"pid {temp}/nginx.pid;\nerror_log {temp}/error.log;\nevents {{}}\nhttp {{ access_log off; {source} }}")
    subprocess.run(["nginx", "-t", "-p", directory, "-c", str(configuration)], check=True)
    nginx = subprocess.Popen(["nginx", "-p", directory, "-c", str(configuration), "-g", "daemon off;"], stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    context = ssl.create_default_context(cafile=str(temp / "cert.pem"))
    count = 0

    def check(path, status, host, secure, location=None):
        global count
        if secure:
            connection = http.client.HTTPSConnection("127.0.0.1", https_port, context=context, timeout=5)
        else:
            connection = http.client.HTTPConnection("127.0.0.1", http_port, timeout=5)
        try:
            connection.request("GET", path, headers={"Host": host})
            response = connection.getresponse()
            assert response.status == status, (host, secure, path, response.status, status)
            if location:
                assert response.getheader("Location") == location
            response.read()
            count += 1
        finally:
            connection.close()

    try:
        for _ in range(50):
            try:
                with socket.create_connection(("127.0.0.1", http_port), timeout=0.1):
                    break
            except OSError:
                if nginx.poll() is not None:
                    raise RuntimeError(nginx.stderr.read().decode())
                time.sleep(0.1)
        for host in ("undery.link", "www.undery.link"):
            for secure in (False, True):
                for path in ("/", "/?from=profile", "/index", "/index.html", "/develop", "/blog", "/unknown"):
                    check(path, 404, host, secure)
                for path in ("/coding", "/game", "/whoami", "/game/highlights", "/game/gallery", "/privacy"):
                    if secure and host == "undery.link":
                        check(path, 200, host, secure)
                    else:
                        check(path + "?source=test", 308, host, secure, "https://undery.link" + path + "?source=test")
        print(f"PASS: {count} Nginx checks; HTTP/HTTPS, apex/www, root 404, query-preserving redirects.")
    finally:
        nginx.terminate()
        try:
            nginx.wait(timeout=5)
        except subprocess.TimeoutExpired:
            nginx.kill()
            nginx.wait(timeout=5)
