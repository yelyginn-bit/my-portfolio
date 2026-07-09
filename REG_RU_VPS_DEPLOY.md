# REG.RU VPS deploy

Цель: запуск `yelyginn.ru` на российском VPS вместо Vercel, чтобы сайт нормально открывался из РФ без VPN.

## Текущий production

- Домен: `https://yelyginn.ru`
- VPS: REG.RU / Рег.облако
- IP: `195.19.20.29`
- Путь проекта на сервере: `/var/www/yelyginn`
- Node-процесс: `pm2` app `yelyginn-site`
- Ветка: `main`
- HTTPS: Let's Encrypt через nginx/certbot
- Формы: `/api/send-form` на VPS проксируется в Vercel relay, потому что Telegram API с VPS недоступен по сети.

## 1. Что выбрать в REG.RU

- Тип: VPS / облачный сервер, не обычный shared-хостинг.
- ОС: Ubuntu 24.04 LTS или Ubuntu 22.04 LTS.
- Минимум: 1 vCPU, 1 GB RAM, 10-20 GB SSD, публичный IPv4.
- Доступ: SSH по root или отдельному sudo-пользователю.

## 2. DNS

После выдачи IP сервера в DNS домена:

```text
A     @     <IP_СЕРВЕРА>
A     www   <IP_СЕРВЕРА>
```

Старые A/CNAME на Vercel нужно удалить, когда новый сервер проверен.

## 3. Первичная установка на сервере

```bash
apt update && apt upgrade -y
apt install -y git curl nginx certbot python3-certbot-nginx
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
npm install -g pm2
```

## 4. Код и сборка

```bash
mkdir -p /var/www
cd /var/www
git clone https://github.com/yelyginn-bit/my-portfolio.git yelyginn
cd yelyginn
git checkout main
npm ci
npm run build
```

## 5. Env-переменные

Создайте файл `/var/www/yelyginn/.env` и перенесите туда production-переменные из Vercel.
Минимально важные:

```bash
ADMIN_PASSWORD="..."
TELEGRAM_BOT_TOKEN="..."
TELEGRAM_CHAT_ID="..."
TELEGRAM_BOT_USERNAME="..."
TELEGRAM_WEBHOOK_SECRET="..."
VITE_YANDEX_METRIKA_ID="110355040"
VITE_SUPABASE_URL="..."
VITE_SUPABASE_ANON_KEY="..."
SUPABASE_URL="..."
SUPABASE_SERVICE_ROLE_KEY="..."
SUPABASE_JWT_SECRET="..."
VITE_STORAGE_PROVIDER="supabase"
VITE_SUPABASE_STORAGE_BUCKET="media"
```

Если Supabase ещё не подключен, клиентская галерея автоматически использует локальное IndexedDB-хранилище браузера. Это рабочий fallback для тестов, но не полноценное облачное хранение между устройствами.

Если env менялись после сборки и это `VITE_*`, выполните заново:

```bash
npm run build
```

## 6. Запуск Node-сервера

```bash
cd /var/www/yelyginn
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

## 7. Nginx

```bash
cp /var/www/yelyginn/deploy/nginx-yelyginn.ru.conf /etc/nginx/sites-available/yelyginn.ru
ln -s /etc/nginx/sites-available/yelyginn.ru /etc/nginx/sites-enabled/yelyginn.ru
nginx -t
systemctl reload nginx
```

## 8. HTTPS

После того как DNS уже смотрит на VPS:

```bash
certbot --nginx -d yelyginn.ru -d www.yelyginn.ru
```

## 9. Проверка

```bash
curl -I https://yelyginn.ru
curl -s https://yelyginn.ru/api/send-form
curl -s "https://yelyginn.ru/api/yandex-disk?publicKey=https%3A%2F%2Fdisk.yandex.ru%2Fd%2FNdpuFsoc5Lq7pA"
```

Открыть в браузере:

- `https://yelyginn.ru`
- `https://yelyginn.ru/portfolio`
- `https://yelyginn.ru/admin`
- `https://yelyginn.ru/calculator`

## 10. Обновление сайта

```bash
cd /var/www/yelyginn
git fetch origin --prune
git switch main
git reset --hard origin/main
npm ci
npm run build
pm2 restart yelyginn-site --update-env
pm2 save --force
nginx -t
```

## 11. Что ещё требует внешних ключей

- Supabase: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`.
- ЮKassa: `YOOKASSA_SHOP_ID`, `YOOKASSA_SECRET`.
- Cloudflare Stream: `VITE_CF_STREAM_CUSTOMER`, `CF_STREAM_ACCOUNT_ID`, `CF_STREAM_TOKEN`.
- Cloudflare R2 не используется, потому что аккаунт не удалось активировать без карты.
