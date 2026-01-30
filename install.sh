#!/bin/bash
set -e

echo "=== Креветка судьбы — установка ==="

echo "[1/4] Бэкап..."
cp /etc/nginx/sites-enabled/art-svechi.ligardi.ru /etc/nginx/sites-enabled/art-svechi.ligardi.ru.bak

if grep -q 'krevetka' /etc/nginx/sites-enabled/art-svechi.ligardi.ru; then
    echo "[!] Уже установлено"
else
    echo "[2/4] Добавляю location..."

    cat > /var/www/krevetka/location.txt << 'EOF'

    # Креветка судьбы - VK Mini App
    location ^~ /krevetka {
        alias /var/www/krevetka/dist;
        index index.html;
        add_header Access-Control-Allow-Origin "https://vk.com" always;
        add_header Content-Security-Policy "frame-ancestors 'self' https://vk.com https://*.vk.com" always;
        expires 1h;
        try_files $uri $uri/ /krevetka/index.html;
    }

EOF

    # Вставляем перед строкой с "location / {"
    sed -i '/include \/etc\/nginx\/snippets\/nextjs-mime-fix.conf;/r /var/www/krevetka/location.txt' /etc/nginx/sites-enabled/art-svechi.ligardi.ru
    rm /var/www/krevetka/location.txt
fi

echo "[3/4] Проверяю nginx..."
nginx -t

echo "[4/4] Reload..."
systemctl reload nginx

echo ""
echo "=== ГОТОВО ==="
echo "URL: https://art-svechi.ligardi.ru/krevetka"
