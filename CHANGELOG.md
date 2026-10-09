# 更新日志

## v1.1.0 — 2026-10-09

BestHistory v1.1.0 是一次完整的多语言发布收口，重点修复 Chrome Web Store v1.0.0 虽然应用内已经支持 18 种语言，但安装包没有声明 Chrome 官方 `_locales` 的问题。

- 新增 Chrome 官方 `_locales` 18 语言目录与 `default_locale`
- 扩展名称、扩展摘要与工具栏标题接入 Chrome `__MSG_*__` 国际化机制
- 保留应用内部原有 18 语言界面，并增加完整性审计
- 审计核心界面、时间线、网站管理、标签页、私密模式、备份/恢复、账号登录、Google 登录、Pro 权益、AI 回忆、AI 整理、反馈等全部语言区域
- 专项审计支付与订阅界面，统一 Dodo Payments 当前生产链路的 18 语言文案
- 清理活动支付界面中遗留的 Paddle Sandbox / Paddle.js 旧测试文案
- “管理订阅”、续费状态、取消自动续费、到期继续保留 Pro 等账户权益文案保持 18 语言完整
- Chrome 版继续保留 Google 登录与 `identity` 权限
- GitHub 手动安装与 Chrome Web Store 使用同一个 v1.1.0 Chrome ZIP 产物
- 本地优先的数据模型、Private Mode 与 AI 隐私边界没有改变

## v1.0.0 — 2026-08-27

BestHistory v1.0.0 已正式发布，Chrome Web Store 与 Firefox Add-ons 均已上线。

- 以网站为中心整理历史，而不是面对成千上万条页面记录
- 搜索域名、页面标题、标签和自己的备注
- AI 回忆：把模糊记忆扩展成本地历史搜索线索
- AI 整理网站：根据有限网站信息建议标签
- 私密模式：本地加密，并可选择记录无痕窗口访问
- 单文件备份 / 恢复与安全合并
- Google 登录与邮箱验证码登录
- 新账户 30 天 Pro Trial
- 月付 $2.99、年付 $24.99、终身版 $59.99
- Local-first 隐私披露、客户端版本兼容机制与发布安全检查

## Earlier beta

v0.1.0 Beta established the website-first history model, Private Mode, backup/restore, account entitlement model and 18-language interface.
