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

## 编辑者、发布与官网读取

1. 管理员在 Strapi Admin 的 **Settings → Administration panel → Users** 中为内容人员创建 Editor 账号；编辑者只在后台保存草稿和发布，不共享管理员账号。
2. 保持 **Settings → Users & Permissions plugin → Roles → Public** 的所有内容类型权限未勾选。公开角色没有读取、创建、更新或删除官网内容的权限。
3. 在 **Settings → API Tokens** 创建名为 `astro-build` 的只读 Custom token；仅在之后的 Astro 内容读取层需要的 `Site Page`、`Home Page` 和 `Site Setting` 查询权限启用它。
4. 将 Token 只保存到官网项目根目录未跟踪的 `.env` 中：`STRAPI_API_TOKEN=...`。不要写入 `cms/.env`、浏览器代码、构建日志或 Git。
5. 编辑者先保存草稿，在本地 Astro 预览确认内容后才发布。发布内容会在后续接入的静态构建流程中生效。

## 一次性内容导入 Token

首次迁移现有 29 个页面及媒体时，管理员在 **Settings → API Tokens** 创建本机专用的 `cms-import` Custom token，授予 Site Page、Home Page、Site Setting 与 Upload 的创建、读取、更新、发布权限。仅在 `cms/.env` 加入 `STRAPI_ADMIN_TOKEN=...`，不要把值发送到聊天或提交到 Git。

导入和一致性校验完成后，立即在后台撤销 `cms-import` Token；后续 Astro 构建只使用权限更小的只读 `astro-build` Token。

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

## 后台语言与 Chrome 翻译

- 管理后台已原生启用 `zh-Hans`，请在右上角语言菜单选择“中文（简体）”。
- 不需要再对 `127.0.0.1:1337/admin` 使用 Chrome 网页翻译。Chrome 翻译会替换 React 管理端的文本节点，可能触发 `removeChild` / `insertBefore` DOM 异常。
- Admin 入口已安装 React 官方建议的兼容保护；当翻译器提前移动节点时跳过非法 DOM 操作，同时保留正常 DOM 更新。
- 官方依据：[Strapi 已确认问题 #25544](https://github.com/strapi/strapi/issues/25544)、[Strapi 的 Chrome Translator 复现记录](https://github.com/strapi/strapi/issues/25608#issuecomment-4862490668)、[React 官方问题与兼容方案](https://github.com/react/react/issues/11538#issuecomment-417504600)。

## 本地边界与验证

- 管理后台仅绑定 `http://127.0.0.1:1337/admin`，只有本机可访问。
- PostgreSQL 运行在 Compose 内部网络；宿主机不映射 5432 端口。
- 可用以下命令确认端口边界：

  ```sh
  lsof -nP -iTCP:1337 -sTCP:LISTEN
  lsof -nP -iTCP:5432 -sTCP:LISTEN
  ```

- 已具备受控页面内容类型和编辑流程；现有页面迁移与 Astro 的只读内容读取会在后续任务完成后接入。
