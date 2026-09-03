# BestHistory

<!--
BESTHISTORY_README_NARRATIVE_BASELINE
This README is intentionally written as a developer letter / product story.
For future releases: preserve this narrative, its screenshots, and its core structure.
Update and append to it; do not replace it wholesale with a short product-spec README.
-->

<p align="center">
  <img src="assets/besthistory-icon.png" alt="BestHistory" width="112" />
</p>

<p align="center"><strong>把浏览历史变成真正能重新找回的网站工具箱。</strong></p>

<!-- BESTHISTORY_SEO_STEP27_SUMMARY_START -->
<p align="center">BestHistory 是一款面向 Chrome / Chromium 的隐私优先浏览历史管理器：它可以搜索旧的浏览记录、找回曾经访问过但已经忘记名称的网站，并按照网站、标签和备注重新组织历史数据。</p>
<!-- BESTHISTORY_SEO_STEP27_SUMMARY_END -->

<p align="center">
简体中文 · [繁體中文](docs/zh-TW/README.md) · [English](docs/en/README.md) · [日本語](docs/ja/README.md) · [한국어](docs/ko/README.md) · [Español](docs/es/README.md) · [Português](docs/pt/README.md) · [Français](docs/fr/README.md) · [Deutsch](docs/de/README.md) · [Italiano](docs/it/README.md) · [Nederlands](docs/nl/README.md) · [Русский](docs/ru/README.md) · [العربية](docs/ar/README.md) · [हिन्दी](docs/hi/README.md) · [Bahasa Indonesia](docs/id/README.md) · [Türkçe](docs/tr/README.md) · [বাংলা](docs/bn/README.md) · [Tiếng Việt](docs/vi/README.md)
</p>

<p align="center">
  <strong>BestHistory v1.0.0 已正式发布</strong>
  &nbsp;·&nbsp;
  Chrome Web Store 即将上线
</p>

<p align="center">
  <a href="https://besthistory.boxuezhiban.cn/">官方网站</a>
  &nbsp;·&nbsp;
  <a href="https://discord.gg/QRHNKweYqS">Discord 社区</a>
  &nbsp;·&nbsp;
  <a href="INSTALL.md">安装说明</a>
  &nbsp;·&nbsp;
  <a href="PRIVACY.md">隐私说明</a>
  &nbsp;·&nbsp;
  <a href="TERMS.md">服务条款</a>
  &nbsp;·&nbsp;
  <a href="docs/LANGUAGES.md">18 种语言文档</a>
</p>

---

## 写在前面：为什么会有 BestHistory

BestHistory 是我作为一名个人开发者，因为自己的真实困扰做出来的一个小工具。

我平时经常会遇到这样的情况：

- 前几天明明用过一个很好用的网站，真正需要的时候却怎么也想不起名字；
- 只记得“好像是在某个网站里看到过”，但具体是哪一个页面已经完全没有印象；
- 因为担心以后找不到，我会一直开着很多标签页和浏览器窗口；
- 一些常用网站不敢关，只能固定标签页；
- 再重要一点的网站就塞进收藏夹，时间久了收藏夹自己又变成了另一座很难整理的仓库；
- 最后浏览器里同时堆着历史记录、固定标签、收藏夹和几十个不敢关闭的页面，但真正想找一个以前用过的网站时，依然要翻很久。

我慢慢发现，我真正想要的其实不是另一条更漂亮的“历史记录列表”。

我需要的是一种更接近人记忆习惯的方式：

**我可能记不得页面标题，也记不得是哪一天访问的，但我往往记得“那是一个什么网站”“我大概用它做过什么”。**

于是有了 BestHistory。

它想做的事情很简单：

> **让你敢于关掉那些“怕以后找不到”的标签页。**  
> 因为真正需要的时候，BestHistory 应该能帮你把它重新找回来。

BestHistory 现在已经从最初的公开 Beta 走到了 **v1.0.0 正式版**。对我来说，这并不是“做完了”，而是终于有了一个可以认真交给更多人使用的起点。

如果它刚好也解决了你的困扰，我会非常开心。也很希望你能告诉我哪些地方好用、哪些地方不好用，以及你真正希望它继续解决什么问题。

<p align="center">
  <img src="assets/screenshots/home.webp" alt="BestHistory 我的网站" width="100%" />
</p>
<p align="center"><sub>把成千上万条页面历史先还原成“我用过哪些网站”。</sub></p>

---

## BestHistory 和普通历史记录有什么不同？

### 1. 先看“网站”，而不是先看几万条页面记录

这是 BestHistory 最核心的功能。

浏览器原生历史通常会把每一次页面访问都平铺出来。如果一天在同一个网站里点开几十个页面，历史记录里就会出现几十条几乎挤在一起的记录。

BestHistory 会先自动按照**网站**进行聚合。

你看到的首先是：

- 我最近访问过哪些网站；
- 哪些网站我经常使用；
- 某个网站最近什么时候访问过；
- 这个网站下面曾经打开过哪些具体页面。

对我自己来说，这比先面对一长串页面标题更容易回忆。

### 2. 用不同方式排序，快速看清自己真正经常使用的网站

同一批历史记录，可以用不同角度重新查看：

- **最近访问** — 最近用过什么，一眼就能看到；
- **最常访问** — 把真正经常使用的网站排在前面；
- **名称排序** — 已经记得名字时，可以更快找到；
- **已固定** — 把重要、常用的网站长期留在最前面；
- **未整理 / 废件箱 / 私密网站** 等不同状态，也可以单独查看。

我希望 BestHistory 最终能让“我平时到底在用哪些网站”这件事变得非常清楚。

### 3. 给网站加自己的标签

很多网站很难只属于一个官方分类。

同一个网站，对别人可能是“工具”，对你可能是“工作”；也可能同时属于“设计”“AI”“以后还会用”。

所以 BestHistory 支持给网站添加**自定义标签**，而且一个网站可以拥有多个标签。

标签不是为了把所有东西整理得非常完美，而是为了未来某一天，你只记得“它大概是做什么的”时，还能有一条路把它找回来。

### 4. 时间线按网站折叠，不再被同一个网站刷屏

有时候我们还是需要按照时间回忆：

> “我昨天下午到底看了些什么？”

所以 BestHistory 保留了时间线，但不会简单复制浏览器原生历史。

连续访问同一个网站的多个页面，会先折叠成一组，需要时再展开具体页面。这样既保留浏览过程，又不会因为在同一个网站里连续点击很多页面，让整条时间线变得非常嘈杂。

<p align="center">
  <img src="assets/screenshots/timeline.webp" alt="BestHistory 按网站折叠的时间线" width="100%" />
</p>
<p align="center"><sub>同一个网站连续打开的页面折叠在一起，时间线更像“浏览过程”，而不是一堵页面标题墙。</sub></p>

### 5. 给网站写一句“只有自己看得懂”的描述

这也是我自己非常需要的功能。

有些网站名字本身并不能提醒我它到底是干什么的。所以你可以给网站添加自己的备注或描述，比如：

> “上次用来把 PDF 转成图片的那个网站”

> “做儿童插画时找到的参考站”

> “那个可以查历史价格的小工具”

以后搜索这些你自己写过的话，也可以重新找到网站。我觉得这种信息有时候比网站官方标题更接近我们的真实记忆。

<p align="center">
  <img src="assets/screenshots/site-detail.webp" alt="BestHistory 网站详情、标签和备注" width="100%" />
</p>
<p align="center"><sub>网站可以有自己的名称、备注、标签，也可以继续查看它下面曾经访问过的页面。</sub></p>

---

## 私密模式：有些历史我也想记住，但不想让别人看到

这是 BestHistory 里我非常重视的一部分。

浏览历史有一个很尴尬的问题：有些网站并不是“不想留下记录”，而只是**不希望它们和普通浏览历史放在一起，被其他人随手看到**。

所以 BestHistory 提供了 **私密模式（Pro）**。

私密模式中的网址、页面标题和访问记录会在本机加密保存。只有输入你设置的私密密码后才能查看。

它还可以配合浏览器的**无痕窗口**使用：

- 普通浏览器通常会在关闭无痕窗口后丢弃这些历史；
- 如果你愿意授权 BestHistory 在无痕模式中运行，BestHistory 可以自动把这些访问记录加密保存到私密模式；
- 它们不会混入普通网站列表；
- 私密模式锁定后，也不会直接显示这些网站和页面。

换句话说：

> **那些不方便留在普通历史里的网站，BestHistory 也可以帮你悄悄记住。**

私密数据仍然保存在你的设备上。私密模式密码、解密后的私密网址、页面标题和私密浏览记录不会发送到 BestHistory 服务器。

---

## 搜索：不需要记得网站叫什么

BestHistory 的搜索不仅仅匹配域名。

目前可以通过网站、域名、标签、备注以及页面标题等信息进行查找。你可能完全忘记某个网站叫什么，只记得“以前在里面看过某个内容”，BestHistory 会尽量利用过去访问过的页面标题和你自己留下的信息，把那个网站重新找出来。

进入网站以后，还可以继续查看和搜索它下面曾经访问过的具体页面。

---

## AI 回忆：当你连关键词都想不准确的时候

到了 v1.0.0，我给 BestHistory 加入了自己一直很想要的一层能力：**AI Recall（AI 回忆）**。

因为真实的“想不起来”通常不是：

> “我知道网站叫 abc，只是懒得搜。”

而更像是：

> “前几个月好像用过一个做某件事的网站，名字完全忘了，只记得当时大概在干什么。”

AI 回忆的作用不是把你的整份历史记录交给 AI，而是先把你这句模糊描述变成更可能命中的搜索线索，再回到本机历史里寻找。

目前 AI 回忆只会在你**主动使用这个功能时**发送完成这次请求所需的有限信息，例如你的查询、已有标签，以及少量由本机筛出的域名 / 页面标题线索。

它不会为了 AI 回忆上传你的完整浏览历史数据库，也不会上传私密模式记录、网页正文或 `.bhbackup` 备份文件。

我的目标还是一样：

> **AI 应该帮助你更容易找回自己的历史，而不是把“本地优先”这件事推翻。**

---

## AI 整理网站：帮你起个头，而不是替你接管分类

另一个 v1.0.0 的 Pro 功能是 **AI 整理网站**。

如果历史里已经积累了很多网站，一个个手动想标签其实也很累。AI 可以根据有限的网站信息，例如域名、显示名称、已有标签、少量近期页面标题以及访问次数等，建议更容易理解的标签。

这些建议仍然只是“帮你起个头”。你自己的标签、备注和整理方式始终应该由你决定。

---

## 固定、废件箱和整理

不是所有历史都需要同样对待。

- **固定网站**：真正经常使用的网站可以固定在前面；
- **废件箱**：暂时不想看到的网站可以先移进去，而不是马上删除历史；
- **恢复**：以后发现还需要，可以再移回来；
- **永久删除**：确认不再需要时，可以从 BestHistory 和对应浏览器历史中删除。

我的想法是：整理历史记录不应该要求用户一开始就做很多艰难决定。“先放一边，以后再处理”本身就应该是一种正常操作。

---

## 备份、恢复与跨浏览器迁移

BestHistory 的浏览历史整理数据主要保存在本机。

你可以导出一个 `.bhbackup` 备份文件，用于：

- 更换电脑；
- 重新安装浏览器或 BestHistory；
- 将 BestHistory 数据迁移到另一台设备；
- 在不同浏览器之间迁移和合并 BestHistory 历史整理数据。

恢复时采用安全合并逻辑：已有数据不会简单粗暴地整库覆盖，备份中的历史和当前数据会尽量去重合并。

私密模式的数据在备份中仍保持加密状态；恢复私密数据时需要原来的私密密码。

此外，时间线中的历史记录还可以导出为 CSV，方便需要时用 Excel、Numbers 或其他表格软件查看和分析。

> 目前这里更准确地说是“通过本地备份文件迁移和合并”，而不是把你的完整浏览历史上传到云端做实时同步。

我刻意选择了这种方式，因为我更希望 BestHistory 首先是一款**本地优先**的工具。

---

## 隐私：这是我不希望为了功能妥协的一件事

BestHistory 会接触到浏览历史，而浏览历史本身就是非常私人的数据。

### 完整历史数据库仍然留在你的设备上

BestHistory 不会把你的完整浏览历史数据库上传到 BestHistory 账户服务器。

默认留在本机的内容包括：

- 完整浏览历史数据库；
- 普通历史整理数据；
- 私密模式数据库和私密模式密码；
- `.bhbackup` 备份文件。

### AI 只在你主动使用时处理完成该请求所需的有限信息

为了让 AI 回忆和 AI 整理真正工作，在你主动触发对应 AI 功能时，会有少量信息发送到 BestHistory 服务器以及 AI 服务商。

目前包括：

- **AI 回忆**：你的回忆描述、已有标签，以及最多 12 条由本机筛选出的域名和 / 或页面标题线索；
- **AI 整理网站**：域名、网站显示名、当前标签、最多 5 个近期页面标题、访问次数和页面数量等有限的网站元数据。

不会为了这些 AI 功能发送：

- 完整浏览历史数据库；
- 网页正文；
- 私密模式记录；
- `.bhbackup` 备份文件。

BestHistory 不出售浏览数据，也不会把浏览数据用于个性化广告。

### 如果你选择登录，服务器主要处理账户和会员权益

BestHistory 支持 **Google 登录** 和 **邮箱验证码登录**。

账户侧可能保存的信息主要包括：

- BestHistory 账户标识；
- 邮箱及必要的登录认证信息；
- 界面语言；
- Free / Trial / Pro 权益状态；
- 权益有效期；
- 支付平台所需的订单、订阅与客户标识。

当前涉及的主要服务商包括 **Supabase、Google、Resend、Paddle，以及火山引擎 / 豆包 Ark**。

更完整、也更准确的说明请查看 [PRIVACY.md](PRIVACY.md)。

---

## Free 与 Pro

我不希望用户为了试一个浏览历史工具就必须先注册账号。

因此 BestHistory 的核心本地历史功能，**无需登录也可以长期使用**。

v1.0.0 当前规则：

- 不登录也可以长期使用 Free 核心功能；
- 新注册 BestHistory 账号会获得 **30 天 Pro Trial**；
- Pro 包含私密模式、AI 回忆、AI 整理网站等增强能力；
- **月付：$2.99 / 月**；
- **年付：$24.99 / 年**；
- **终身版：$59.99 一次性付款**。

月付和年付为自动续费订阅；终身版不自动续费。

支付由 **Paddle** 作为 Merchant of Record 处理，Google 不是卖家。BestHistory 不接收或保存完整银行卡信息。

---

## 18 种界面语言，也提供 18 种文档

BestHistory 目前支持：

简体中文、繁体中文、English、日本語、한국어、Español、Português、Français、Deutsch、Italiano、Nederlands、Русский、العربية、हिन्दी、Bahasa Indonesia、Türkçe、বাংলা、Tiếng Việt。

<p align="center">
  <img src="assets/screenshots/languages.webp" alt="BestHistory 18 种界面语言" width="100%" />
</p>

v1.0.0 的 README、安装、隐私、FAQ、服务条款、安全说明和更新日志继续提供对应的多语言文档。完整入口见 [docs/LANGUAGES.md](docs/LANGUAGES.md)。

---

## v1.0.0 正式发布，但现在还只是开始

我最开始做这个插件，就是因为自己总是：

> 怕关掉标签页以后再也找不到，所以浏览器里长期堆着很多标签和窗口。

现在 BestHistory 已经能帮助我重新找到关闭过的网站；AI 回忆又让“我连网站名字都忘了”这种情况多了一条找回来的路。

但我还是不希望 BestHistory 变成一个为了“功能很多”而不断堆东西的产品。

未来我仍然希望围绕同一个核心问题继续做：

**怎样让我们更放心地关闭不再需要一直开着的标签页，怎样在真正需要时，更轻松地把以前用过的网站重新找回来。**

v1.0.0 是第一个正式版本。Chrome Web Store 商店版本也即将上线。

接下来哪些东西值得继续做，我仍然希望尽量来自真实用户的使用和反馈，而不是我一个人关在房间里把所有想到的功能都塞进去。

---

## 如果你愿意支持这个项目

如果 BestHistory 也刚好解决了你的问题，我会很感谢你：

- ⭐ 给这个仓库一个 Star，让我知道确实有人需要它；
- 🌐 加入 [Zhiban Community Discord](https://discord.gg/QRHNKweYqS)，参与讨论、反馈和后续 Beta；
- 🐛 遇到问题时提交一个 GitHub Issue；
- 💡 告诉我你平时是怎么管理历史记录、收藏夹和一大堆标签页的；
- ✉️ 如果不方便公开反馈，也可以发邮件到 **besthistory@126.com**。

哪怕只是告诉我“这个功能我真的会用”或者“这个设计我觉得很麻烦”，对一个个人开发项目来说，都非常有价值。

如果你提交公开 Issue 或在社区发帖，请不要附上私密网址、私密浏览记录、密码、备份文件或其他敏感浏览数据。

谢谢你愿意看到这里，也谢谢你愿意尝试 BestHistory。

---

<!-- BESTHISTORY_SEO_STEP27_CN_GUIDES_START -->
## 想找以前访问过、但已经忘记名字的网站？

BestHistory 主要解决的不是“把 Chrome 历史记录换个皮肤”，而是几个非常具体的问题：**怎么搜索很久以前的 Chrome 历史记录、怎么找回曾经访问过但已经忘记名称的网站，以及怎么按照网站而不是几万条页面记录来整理浏览历史。**

- [怎么搜索很久以前的 Chrome 历史记录](docs/zh-CN/guides/search-old-chrome-history.md)
- [怎么找回以前访问过、但已经忘记名字的网站](docs/zh-CN/guides/find-website-you-visited-before.md)
- [Chrome 历史记录管理器应该解决什么问题](docs/zh-CN/guides/chrome-history-manager.md)
- [English browser-history guides](docs/en/guides/index.md)

<!-- BESTHISTORY_SEO_STEP27_CN_GUIDES_END -->

## 安装

**BestHistory v1.0.0 已正式发布，Chrome Web Store 商店版本即将上线。**

Chrome Web Store 上线后会作为推荐安装与自动更新渠道。详细步骤见 [INSTALL.md](INSTALL.md)。

我们也会为 v1.0.0 保留独立的 GitHub Release，供需要手动安装、验证版本或查看历史发布的用户使用。

---

## 关于这个仓库

这个 GitHub 仓库用于产品介绍、正式版本发布、使用文档、隐私与安全说明，以及 Issue 与用户反馈。

**BestHistory 应用源码目前为非开源专有代码，不会在这个公开仓库中发布。**

---

## 当前版本

**v1.0.0 — 正式版**

Chrome Web Store：**即将上线**

版本变化请查看 [CHANGELOG.md](CHANGELOG.md)。
