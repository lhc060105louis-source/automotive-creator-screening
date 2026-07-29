# 完整交付包验证记录

验证日期：2026-07-29（Asia/Shanghai）

## 自动化回归

在隔离的数据目录中执行：

```bash
KOL_PLATFORM_DATA_DIR=/private/tmp/kol-complete-cloud-final-tests \
  python -m pytest -q
```

结果：**225 passed**。

覆盖范围包括离线 SQLite 持久化、同步出站队列、冲突处理、Supabase 设置与传输契约、候选人池/短名单/合同/履约复盘工作流、三平台采集契约，以及桌面打包清单。

## macOS 构建与启动

使用 Python 3.12 和 PyInstaller 6.21.0 构建：

```bash
PYTHON=/path/to/python3.12 bash packaging/macos/build.sh --smoke
```

已实际生成 `dist/macos/KOL合作管理平台.app` 并启动验证。启动日志确认：

- Uvicorn 在 `127.0.0.1` 正常监听；
- `/health`、`/`、`/kols`、`/sync/status` 均返回 HTTP 200；
- 所有界面脚本（采集、短名单、合同、复盘、同步等）均可加载。

macOS 打包脚本现在要求 Python 3.10+，且将临时虚拟环境放到 ASCII 路径，避免中文工作目录造成启动脚本失效。未配置 Apple 签名身份时，产物为内部未签名构建；正式外部分发仍需配置 Apple 签名与公证。

## Windows

已提供 `packaging/windows/build.ps1`、按用户安装的 Inno Setup 配置与 `-Smoke` 启动检查。当前 macOS 环境无法原生生成或运行 `.exe`，因此 Windows 交付需在 Windows 10/11、Python 3.10+ 与 Inno Setup 6 环境执行一次构建验证。

## 凭据检查

对生产代码和交付资料（排除测试与构建产物）进行了敏感凭据模式扫描。结果仅包含配置字段、文档说明和旧版静态演示代码中的字段名称，未发现提交的 Supabase URL、Anon Key、用户令牌或其他实际密钥。

云端凭据通过系统钥匙串 / Windows Credential Manager 保存，不写入 SQLite、源码或导出文件。
