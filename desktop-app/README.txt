KOL 合作管理平台 — 欧洲车企桌面协作版
========================================
版本：v3.0 | 市场：英国 / 法国 / 德国

【产品形态】
本交付包是 macOS 与 Windows 桌面应用。应用启动后在本机运行受保护的
FastAPI 服务，并自动打开管理界面。SQLite 保存本地数据；Supabase 用于
团队云端共享。断网时仍可查看、编辑、评分、对比、管理合作流程及导入导出，
恢复联网后自动继续同步。

【文件说明】
01_KOL合作管理平台.html       ← v3.0 主界面视觉与交互参考
02_商业价值评分模型.html      ← 独立评分工具（7 维度）
03_风险评分模型.html          ← 独立风险工具（8 维度）
04_核心逻辑代码（含注释）.js ← 评分计算逻辑说明
05_技术架构图.html            ← 本地优先与云端同步架构
06_BYD_Xpeng_KOL评估数据.xlsx ← 欧洲 KOL 示例数据
07_评估模型说明文稿.docx      ← 评分维度、权重和使用说明
app/                          ← 桌面应用源代码
packaging/                    ← macOS / Windows 构建脚本
supabase/                     ← 云端表结构与行级安全策略

【开发启动】
1. 安装 Python 3.11 或更高版本。
2. 在本文件夹创建虚拟环境并安装依赖：
   python3 -m venv .venv
   .venv/bin/pip install -r requirements.txt
3. 启动：
   .venv/bin/python -m app.launcher

Windows PowerShell 可使用：
   py -m venv .venv
   .venv\Scripts\pip install -r requirements.txt
   .venv\Scripts\python -m app.launcher

【主要功能】
• CSV/XLSX 导入与 Excel 导出
• YouTube、Reddit、TikTok 自动采集
• KOL 搜索筛选、评分证据和数据完整度
• 最多 4 位 KOL 横向对比与项目候选名单
• 合作阶段、合同管理和效果复盘
• SQLite 离线数据与 Supabase 团队自动同步

【系统设置】
YouTube API Key、Supabase URL、Anon Key 和用户令牌均保存在 macOS
Keychain 或 Windows Credential Manager 系统凭据库。页面只显示配置状态，
不会回显明文。应用不使用 Supabase service-role 密钥。

首次启用团队共享：
1. 在 Supabase 执行 supabase/schema.sql 与 supabase/rls.sql。
2. 在“系统设置 → 团队云端共享”填写项目 URL、Anon Key 和用户令牌。
3. 保存后点击“立即同步”验证连接。

【模型权重】
商业价值（7 维度）：受众匹配20% | 内容专业15% | 互动质量15% |
VOC价值15% | 商业效率15% | 品牌适配10% | 可执行性10%

风险评分（8 维度）：负面舆情20% | 广告合规15% | 竞品冲突15% |
虚假流量15% | 数据隐私10% | 未成年受众10% | 技术声明10% | 执行风险5%

缺失维度不按零分计算。完整度低于 60% 时标记为“数据不足”。

【构建】
macOS：bash packaging/macos/build.sh
Windows：powershell -ExecutionPolicy Bypass -File packaging/windows/build.ps1

内部测试安装包可能未签名。正式发布需配置 macOS 签名与公证，以及 Windows
代码签名证书。
