---
layout: default
title: 安装 BestHistory v1.0
description: BestHistory v1.0 简体中文安装说明，包括 Chrome Web Store 安装、GitHub 手动安装、开发者模式、无痕模式授权和更新方式。
permalink: /zh-CN/install/
lang: zh-CN
---

<div class="bh-doc-page" markdown="1">

# 安装 BestHistory v1.0

BestHistory 的推荐安装方式是 **Chrome Web Store**。商店页面上线后，请优先通过商店安装，这样最简单，也可以由 Chrome 自动更新。

目前 Chrome Web Store 页面还在上线过程中。如果你想现在就试用 BestHistory，可以把 **GitHub Releases** 作为一条手动安装支线。

<div class="bh-install-box" markdown="1">

## 现在就想试用？可以从 GitHub 手动安装

1. 打开 [BestHistory GitHub Releases](https://github.com/renboxue/BestHistory/releases)，下载当前提供的 Chrome / Chromium 浏览器安装包。
2. 如果下载的是 `.zip`，先解压到一个你不会随手删除的文件夹。
3. 在 Chrome 地址栏打开 `chrome://extensions/`。
4. 打开右上角的 **“开发者模式”**。
5. 点击 **“加载已解压的扩展程序”**。
6. 选择刚才解压后的 BestHistory 文件夹（其中应包含 `manifest.json`）。
7. 安装后可以在扩展菜单中固定 BestHistory，然后点击工具栏图标打开主页面。

> 手动安装适合提前试用和测试。通过这种方式安装的版本通常不会像 Chrome Web Store 版本那样自动更新，之后有新版本时，需要回到 GitHub Releases 获取新的安装包。

</div>

## Chrome Web Store 上线后

商店版上线后，推荐改用下面的正式安装方式：

1. 打开 Chrome Web Store。
2. 搜索 **BestHistory**。
3. 确认开发者和官网信息后，点击“添加至 Chrome”。
4. Chrome 会负责后续自动更新。

## 为什么保留 GitHub 安装方式？

GitHub 不只是当前商店上线前的临时入口。以后如果 BestHistory 提供 Edge、Firefox 或其他浏览器版本，GitHub Releases 也可以继续作为各浏览器测试包、独立安装包和版本说明的统一入口。

因此未来会形成两条安装路径：

- **浏览器官方商店**：普通用户首选，安装和更新最省心；
- **GitHub Releases**：提前体验、测试版本，以及未来其他浏览器构建的补充入口。

## 无痕窗口与私密模式

如果你希望 BestHistory Pro 的私密模式记录无痕窗口中的访问，Chrome 要求你手动授权扩展在无痕窗口中运行：

1. 打开 `chrome://extensions/`。
2. 找到 BestHistory，进入“详细信息”。
3. 开启“在无痕模式下启用”。

这是可选权限，BestHistory 无法代替你自动开启。

## 更新与备份

通过 Chrome Web Store 安装的版本会由 Chrome 自动更新。GitHub 手动安装版本则需要你主动获取新版本。

重要升级前，仍建议先导出一份 `.bhbackup` 本地备份。

<div class="bh-actions bh-actions-center"><a class="bh-btn bh-btn-primary" href="https://github.com/renboxue/BestHistory/releases">前往 GitHub Releases</a><a class="bh-btn bh-btn-secondary" href="/zh-CN/">返回简体中文首页</a></div>

</div>
