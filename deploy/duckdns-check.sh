#!/data/data/com.termux/files/usr/bin/bash
set -eu
echo "DuckDNS AAAA:"
if command -v dig >/dev/null 2>&1; then dig +short AAAA rescuefinder.duckdns.org; else echo "Install dnsutils for dig."; fi
echo
echo "Local Nginx configuration:"
nginx -t
echo
echo "Local HTTPS test:"
curl --connect-timeout 5 -kI https://127.0.0.1:9443/ || true
echo
echo "Remote HTTPS test:"
curl -6 --connect-timeout 8 -I https://rescuefinder.duckdns.org:9443/ || true
