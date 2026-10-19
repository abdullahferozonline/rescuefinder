# Termux deployment — keep existing Caddy unchanged

## Before starting
The public website is served from your phone. Mobile networks may block inbound traffic, IPv6 reachability depends on the network, and Android may stop background processes. Do not stop or edit the current Caddy service.

## 1) Install Nginx and tools
```sh
pkg update
pkg install nginx curl git
mkdir -p "$HOME/rescuefinder"
```
Copy this repository to `$HOME/rescuefinder` (or clone your GitHub repo there). The web root expected by the sample config is `$HOME/rescuefinder/web`.

## 2) Register DuckDNS
In DuckDNS, create `rescuefinder` and configure its AAAA record to the phone's current global IPv6 address. Use your existing DuckDNS updater/token setup carefully; never paste your token into GitHub or commit it. Since mobile IPv6 can rotate, update the AAAA record when the address changes.

## 3) Install acme.sh and request free HTTPS certificate
DNS-01 validation works without opening port 80, but you must have the correct DuckDNS API token. Install acme.sh using its official installer instructions, then:
```sh
export DuckDNS_Token='YOUR_DUCKDNS_TOKEN'
~/.acme.sh/acme.sh --set-default-ca --server letsencrypt
~/.acme.sh/acme.sh --issue --dns dns_duckdns -d rescuefinder.duckdns.org --keylength ec-256
```
Check the acme.sh DuckDNS DNS API support and current token variable name in its documentation before running. Do not put the token in shell history if possible; use a private environment file with permissions `600`. If issuance fails, stop and inspect the error instead of changing Caddy.

## 4) Install this Nginx server block
```sh
mkdir -p "$PREFIX/etc/nginx/conf.d"
cp "$HOME/rescuefinder/deploy/nginx-rescuefinder.conf" "$PREFIX/etc/nginx/conf.d/rescuefinder.conf"
```
Termux's packaged `nginx.conf` may not include `conf.d/*.conf` by default. Inspect it:
```sh
grep -n 'include' "$PREFIX/etc/nginx/nginx.conf"
```
If no conf.d include exists, add `include $PREFIX/etc/nginx/conf.d/*.conf;` inside the `http { ... }` block, carefully preserving all existing settings. Do not overwrite the whole nginx.conf blindly.

Check config and start Nginx:
```sh
nginx -t
nginx
curl -kI https://127.0.0.1:9443/
```
If `nginx` is already running, use `nginx -s reload` only after `nginx -t` succeeds. Nginx may conflict with another Nginx process, but it does not require changing Caddy's port 8443.

## 5) Validate HTTPS and reachability
```sh
curl -6 -I --connect-timeout 8 https://rescuefinder.duckdns.org:9443/
```
Check the AAAA record with `pkg install dnsutils` then `dig AAAA rescuefinder.duckdns.org`.
The certificate can be valid even if the phone is unreachable from a particular mobile network. Verify inbound IPv6 and firewall behavior from a different network. Never disable TLS verification as a permanent workaround.

## 6) Run checks after every change
- `nginx -t` before reload
- `curl -I http://127.0.0.1:8080/` is not relevant to this TLS block; test port 9443
- Verify existing portfolio remains reachable at `https://abdullahferozonline.duckdns.org:8443/`
- Keep Android awake while hosting and configure a wake lock only if you already understand its battery impact.
