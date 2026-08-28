---
layout: default
title: 安装 BestHistory v1.0.0
description: BestHistory v1.0.0 简体中文安装说明，包括 GitHub 手动安装、开发者模式、Chrome Web Store、无痕模式授权和更新方式。
permalink: /zh-CN/install/
lang: zh-CN
---

<div class="bh-doc-page" markdown="1">

# 安装 BestHistory v1.0.0

BestHistory v1.0.0 已经在 **GitHub Releases** 正式发布。Chrome Web Store 商店版本仍在上线过程中，所以如果你现在就想试用正式 v1.0，可以先从 GitHub 安装。

<div class="bh-install-box" markdown="1">

## 现在从 GitHub 安装 v1.0.0

1. 打开 [BestHistory v1.0.0 GitHub Release](https://github.com/renboxue/BestHistory/releases/tag/v1.0.0)。
2. 下载 `BestHistory-v1.0.0-chrome.zip`。
3. 把 ZIP 解压到一个不会随手删除的文件夹。
4. 在 Chrome 地址栏打开 `chrome://extensions/`。
5. 打开右上角的 **“开发者模式”**。
6. 点击 **“加载已解压的扩展程序”**。
7. 选择刚才解压后的 BestHistory 文件夹（其中应包含 `manifest.json`）。
8. 安装后可以在扩展菜单中固定 BestHistory，然后点击工具栏图标打开主页面。

> GitHub 手动安装版本不会像 Chrome Web Store 版本那样自动更新。以后有新版本时，需要回到 GitHub Releases 获取并安装新的安装包。

</div>

## Chrome Web Store 上线后

商店版上线后，对大多数用户来说会成为推荐方式，因为安装和更新都更省心：

1. 打开 Chrome Web Store。
2. 搜索 **BestHistory**。
3. 确认开发者和官网信息后，点击“添加至 Chrome”。
4. Chrome 会负责后续自动更新。

## 为什么以后仍然保留 GitHub 安装方式？

GitHub 不只是当前商店上线前的临时入口。以后如果 BestHistory 提供 Edge、Firefox 或其他浏览器版本，GitHub Releases 也可以继续作为测试包、独立安装包和版本说明的统一入口。

长期会形成两条安装路径：

- **浏览器官方商店**：普通用户首选，安装和自动更新最方便；
- **GitHub Releases**：提前体验、测试版本，以及未来其他浏览器构建的补充入口。

## 无痕窗口与私密模式

如果你希望 BestHistory Pro 的私密模式记录无痕窗口中的访问，Chrome 要求你手动授权扩展在无痕窗口中运行：

1. 打开 `chrome://extensions/`。
2. 找到 BestHistory，进入“详细信息”。
3. 开启“在无痕模式下启用”。

这是可选权限，BestHistory 无法代替你自动开启。

## 更新与备份

通过 Chrome Web Store 安装的版本会由 Chrome 自动更新。GitHub 手动安装版本则需要你主动安装后续新版本。

重要升级前，仍建议先导出一份 `.bhbackup` 本地备份。

<div class="bh-actions bh-actions-center"><a class="bh-btn bh-btn-primary" href="https://github.com/renboxue/BestHistory/releases/tag/v1.0.0">下载 BestHistory v1.0.0</a><a class="bh-btn bh-btn-secondary" href="/zh-CN/">返回简体中文首页</a></div>

</div>
