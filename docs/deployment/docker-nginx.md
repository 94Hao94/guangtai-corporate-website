# Docker + Nginx 部署

## 架构

Node 24 Alpine 只负责安装依赖和构建 Astro。运行镜像使用非 root Nginx，只包含 `dist/` 和 Nginx 配置，监听 8080。

TLS、WAF、域名跳转和公网缓存由容器外的负载均衡或 CDN 负责。容器不保存状态。

## 构建

```bash
docker build \
  --build-arg SITE_URL=https://www.example.com \
  -t registry.example.com/guangtai/site:$(git rev-parse --short HEAD) .
```

`SITE_URL` 是构建期配置。修改正式域名后必须重新生成镜像，运行时环境变量不会重写静态 HTML。

## 本地验收

```bash
SITE_URL=https://www.example.com docker compose up --build -d
npm run verify:container
docker compose down
```

Compose 使用只读根文件系统、`/tmp` tmpfs、无 Linux capabilities 和 `no-new-privileges`。

## 生产发布

1. CI 执行 `npm ci` 和 `npm run verify`。
2. 使用 Git commit SHA 构建并标记镜像。
3. 运行容器并等待 `/healthz` 成功。
4. 切换负载均衡或服务编排指向新 SHA。
5. 保留上一稳定 SHA，出现问题时切回旧镜像。

不要使用 `latest` 作为唯一生产标签，不要进入运行容器修改文件。

## Nginx 策略

- Astro 哈希资源缓存一年并标记 immutable。
- HTML、Sitemap 和 robots 使用 no-cache 重新验证。
- 未知路径返回品牌 `404.html` 并保持 HTTP 404。
- gzip、安全响应头、stdout 访问日志和 stderr 错误日志默认启用。
- HSTS 由稳定的 HTTPS 外层统一设置。
