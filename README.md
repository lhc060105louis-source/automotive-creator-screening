# Automotive Creator Screening

面向欧洲汽车市场的 KOL（内容创作者）合作筛选与评估平台，覆盖英国、法国和德国市场。

平台提供 KOL 档案管理、商业价值评分、合作风险评估、YouTube 数据导入和团队云端同步能力。项目为纯前端静态应用，无需构建步骤。

## 快速开始

```bash
python3 -m http.server 8080
```

浏览器访问 <http://localhost:8080>。

> 不建议直接双击 HTML 文件运行。通过本地 HTTP 服务访问可以避免浏览器对本地文件的安全限制。

## 项目结构

```text
.
├── index.html                              # KOL 合作管理平台
├── src/
│   └── kol-platform-core.js                # 评分、数据和集成核心逻辑（含注释）
├── tools/
│   ├── commercial-value-model.html         # 商业价值评分工具
│   └── risk-assessment-model.html          # 风险评分工具
├── data/
│   └── BYD_Xpeng_KOL_evaluation_data.xlsx  # 57 位欧洲 KOL 示例数据
└── docs/
    ├── architecture.html                   # 技术架构图
    └── evaluation-model-guide.docx          # 评估模型说明文稿
```

## 可选配置

在主平台的“系统设置”中可以配置：

- YouTube Data API v3 Key：自动抓取频道及视频数据
- Supabase URL 与 Key：团队共享 KOL 数据
- C 端情感分析 API：获取 VOC 数据；未配置时使用演示模式

配置保存在当前浏览器的 `localStorage` 中。请勿将真实密钥直接写入源码或提交到 Git。

## 评分模型

商业价值评分包含 7 个维度：

- 受众匹配 20%
- 内容专业 15%
- 互动质量 15%
- VOC 价值 15%
- 商业效率 15%
- 品牌适配 10%
- 可执行性 10%

风险评分包含 8 个维度：

- 负面舆情 20%
- 广告合规 15%
- 竞品冲突 15%
- 虚假流量 15%
- 数据隐私 10%
- 未成年受众 10%
- 技术声明 10%
- 执行风险 5%

## 技术说明

- HTML、CSS、原生 JavaScript
- SheetJS：Excel 文件导入
- YouTube Data API v3：频道数据获取
- Supabase REST API：可选云端数据同步
- 浏览器 `localStorage`：默认本地存储

外部字体、图标和 SheetJS 通过 CDN 加载，因此首次使用需要网络连接。
