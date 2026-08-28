# BestHistory 隐私说明

_Last updated: 2026-08-27_

BestHistory 采用本地优先设计。本说明解释哪些数据留在设备上、哪些少量数据会因账户、支付或 AI 功能离开设备，以及由谁处理。

## Local data

- 完整浏览历史数据库、普通历史记录、私密模式数据库、私密模式密码和 .bhbackup 备份文件默认保存在本机。
- BestHistory 不出售浏览数据，不将其用于广告，也不向数据经纪商提供。

## Optional AI processing

AI 功能是可选且由用户主动触发。AI 回忆可能发送你的查询、已选的现有标签，以及最多 12 条本地线索（域名和/或页面标题）。AI 整理网站可能分批发送域名、网站显示名、当前标签、最多 5 个近期页面标题、访问次数和页面数量。BestHistory 不会为了这些 AI 功能发送完整浏览历史数据库、网页正文、私密模式记录或备份文件。

## Accounts and service providers

Supabase 用于认证、权益存储和 Edge Functions；Google 可用于 OAuth 登录；Resend 用于发送认证邮件；Paddle 作为 Merchant of Record 处理购买和订阅管理；火山引擎 / 豆包 Ark 处理 BestHistory AI 请求。

BestHistory 可能保存账户 ID、邮箱、首选语言、试用/套餐状态、有效期以及支付平台标识等账户与权益数据。BestHistory 不接收或保存完整银行卡信息。

## Private Mode

私密模式记录在本机加密。私密模式密码和解密后的私密记录不会发送到 BestHistory 服务器。

## Payments

BestHistory Pro is offered as **$2.99/month**, **$24.99/year**, or a **$59.99 one-time Lifetime** purchase. Paddle processes checkout, tax, receipts, refunds and subscription administration as Merchant of Record. Google is not the seller. BestHistory does not receive or store full payment-card details.

## Sharing and use restrictions

仅在提供你选择的功能、完成认证/支付、保障服务安全或遵守法律所必需时向第三方传输数据。BestHistory 不出售用户数据，也不用于个性化广告。

## Chrome Web Store Limited Use

> The use of information received from Google APIs will adhere to the Chrome Web Store User Data Policy, including the Limited Use requirements.

BestHistory limits Google/Chrome user data to the disclosed, user-facing purpose of helping you organize, search, privately manage, back up, and rediscover your browser history and related account/entitlement operations.

## Retention and deletion

你可以在扩展中删除本地 BestHistory 数据。退出登录会移除本地会话。如需删除服务器侧账户数据，可联系 besthistory@126.com。

## Security

Data sent to BestHistory services is transmitted over HTTPS. Authentication credentials, payment secrets and AI provider secrets are kept server-side and are not included in the extension package.

## Contact

**besthistory@126.com**

> If a translated version differs from the English version on a legal or policy point, the English version controls.
