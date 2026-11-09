FROM php:8.4-cli
RUN apt-get update && apt-get install -y --no-install-recommends libonig-dev unzip git && docker-php-ext-install pdo_mysql mbstring && rm -rf /var/lib/apt/lists/*
COPY --from=composer:2 /usr/bin/composer /usr/local/bin/composer
WORKDIR /app/backend
COPY backend/composer.json ./
RUN composer install --no-dev --no-interaction --prefer-dist
COPY backend/ ./
RUN mkdir -p storage/outbox storage/uploads
CMD ["sh", "-c", "php database/init.php && php -S 0.0.0.0:8000 -t public public/router.php"]
