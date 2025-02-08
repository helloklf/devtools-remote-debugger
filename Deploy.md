
```sh
vim /etc/nginx/sites-enabled/default
```

```
server {
  listen 80;
  listen 443 ssl;
  server_name webview.icu;

  ssl_certificate /var/www/ssl/cert.pem;
  ssl_certificate_key /var/www/ssl/key.pem;
  ssl_session_timeout 5m;
  ssl_session_cache shared:SSL:50m;
  ssl_protocols SSLv3 SSLv2 TLSv1 TLSv1.1 TLSv1.2;
  ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE:ECDH:AES:HIGH:!NULL:!aNULL:!MD5:!ADH:!RC4;
  ssl_prefer_server_ciphers on;

  location ~ ^/(client|devtools) {
    proxy_pass http://localhost:666$request_uri;
    proxy_http_version 1.1;
    proxy_set_header Host $host:$server_port;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "Upgrade";
    proxy_set_header X-real-ip $remote_addr;
    proxy_set_header X-Forwarded-For $remote_addr;
  }

  location / {
    gzip on;
    gzip_types text/plain application/javascript text/css;
    gzip_min_length 256;
    gzip_proxied any;
    # return 301 http://webview.icu:666$request_uri;
    proxy_pass http://localhost:666;
  }
}
```