FROM node:22-alpine AS frontend-build
ARG BUILD_CHANNEL=stable
ARG BUILD_VERSION=
WORKDIR /build
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ .
ENV VITE_BUILD_CHANNEL=$BUILD_CHANNEL
ENV VITE_BUILD_VERSION=$BUILD_VERSION
RUN npm run build

FROM python:3.12-slim

LABEL org.opencontainers.image.title="TV Logo Finder"
LABEL org.opencontainers.image.description="Search and assign TV channel logos for Dispatcharr and ECM"
LABEL org.opencontainers.image.source="https://github.com/knmplace/tv-logo-finder"
LABEL org.opencontainers.image.url="https://github.com/knmplace/tv-logo-finder"
LABEL org.opencontainers.image.vendor="knmplace"
LABEL org.opencontainers.image.licenses="MIT"

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends nginx && \
    rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .
COPY --from=frontend-build /build/dist /app/static

COPY nginx.conf /etc/nginx/sites-available/default

RUN mkdir -p /data

EXPOSE 6102

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

CMD ["/entrypoint.sh"]
