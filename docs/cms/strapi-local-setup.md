# 本地 Strapi CMS 使用说明

本 CMS 以 Strapi 5 和 PostgreSQL 16 在本机 Docker Compose 中运行，供内容编辑人员管理官网内容。它不会发布到阿里云，也不会让 PostgreSQL 暴露到宿主机网络。

## 首次启动

1. 安装并启动 Docker Desktop。
2. 在项目根目录复制本地配置：

   ```sh
   cp cms/.env.example cms/.env
   ```

3. 打开 `cms/.env`，在将此环境提供给其他人、接入局域网或部署云端前，为所有密钥和数据库密码生成唯一值；可使用 `openssl rand -hex 32` 生成随机值。不要提交 `cms/.env`。
4. 构建镜像并启动服务：

   ```sh
   docker compose -f docker-compose.cms.yml up -d --build
   ```

5. 打开 [Strapi 管理后台](http://127.0.0.1:1337/admin)，按首次启动页面创建管理员账号。该账号由内容负责人保管，不写入项目文件。

## 日常操作

```sh
# 查看服务和健康状态
docker compose -f docker-compose.cms.yml ps

# 查看 Strapi 日志
docker compose -f docker-compose.cms.yml logs --tail=120 strapi

# 停止服务，但保留 CMS 数据和上传媒体
docker compose -f docker-compose.cms.yml down
```

再次执行 `docker compose -f docker-compose.cms.yml up -d` 即可恢复服务。请不要为日常停止操作附加 `--volumes`，否则会删除本地 CMS 数据和已上传的媒体。

## 本地边界与验证

- 管理后台仅绑定 `http://127.0.0.1:1337/admin`，只有本机可访问。
- PostgreSQL 运行在 Compose 内部网络；宿主机不映射 5432 端口。
- 可用以下命令确认端口边界：

  ```sh
  lsof -nP -iTCP:1337 -sTCP:LISTEN
  lsof -nP -iTCP:5432 -sTCP:LISTEN
  ```

- 当前阶段仅搭建编辑运行环境；页面内容类型、编辑角色、内容迁移和 Astro 的只读内容读取会在后续任务完成后接入。
