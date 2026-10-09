---
layout: default
title: 安装 BestHistory v1.0.0
description: BestHistory v1.0.0 简体中文安装说明，包括 GitHub 手动安装、开发者模式、Chrome Web Store、无痕模式授权和更新方式。
permalink: /zh-CN/install/
lang: zh-CN
---

<div class="bh-doc-page" markdown="1">

# 安装 BestHistory v1.0.0

BestHistory v1.0.0 已在 **Chrome Web Store** 和 **Firefox Add-ons** 上架。普通用户推荐从官方商店安装，后续版本由浏览器自动更新。

<div class="bh-actions bh-actions-center"><a class="bh-btn bh-btn-primary" href="https://chromewebstore.google.com/detail/besthistory/ehcgfdgajgkkmelcjipahckmgjfdcajb" target="_blank" rel="noopener noreferrer">Chrome 商店安装</a><a class="bh-btn bh-btn-secondary" href="https://addons.mozilla.org/en-US/firefox/addon/besthistory/" target="_blank" rel="noopener noreferrer">Firefox 商店安装</a></div>

<div class="bh-install-box" markdown="1">

## 备用方式：从 GitHub 手动安装 v1.0.0

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

## 从浏览器官方商店安装

- **Chrome：** 打开 [BestHistory Chrome Web Store 页面](https://chromewebstore.google.com/detail/besthistory/ehcgfdgajgkkmelcjipahckmgjfdcajb)，点击“添加至 Chrome”。
- **Firefox：** 打开 [BestHistory Firefox Add-ons 页面](https://addons.mozilla.org/en-US/firefox/addon/besthistory/)，点击“添加到 Firefox”。

两种官方商店版本都支持通过对应浏览器自动更新。GitHub 下载主要保留给测试和需要手动安装的用户。

## 为什么以后仍然保留 GitHub 安装方式？

GitHub Releases 仍用于提供测试包、独立安装包和版本说明。日常使用优先选择已上架的官方浏览器商店版本。

目前有两条安装路径：

- **Chrome Web Store / Firefox Add-ons**：普通用户首选，安装和自动更新最方便；
- **GitHub Releases**：手动安装、测试以及版本归档。

## 无痕窗口与私密模式

如果你希望 BestHistory Pro 的私密模式记录无痕窗口中的访问，Chrome 要求你手动授权扩展在无痕窗口中运行：

1. 打开 `chrome://extensions/`。
2. 找到 BestHistory，进入“详细信息”。
3. 开启“在无痕模式下启用”。

这是可选权限，BestHistory 无法代替你自动开启。

## 更新与备份

从 Chrome Web Store 或 Firefox Add-ons 安装的版本由对应浏览器自动更新。GitHub 手动安装版本则需要你主动安装后续新版本。

重要升级前，仍建议先导出一份 `.bhbackup` 本地备份。

<div class="bh-actions bh-actions-center"><a class="bh-btn bh-btn-primary" href="https://chromewebstore.google.com/detail/besthistory/ehcgfdgajgkkmelcjipahckmgjfdcajb" target="_blank" rel="noopener noreferrer">Chrome 商店安装</a><a class="bh-btn bh-btn-secondary" href="https://addons.mozilla.org/en-US/firefox/addon/besthistory/" target="_blank" rel="noopener noreferrer">Firefox 商店安装</a><a class="bh-btn bh-btn-secondary" href="/zh-CN/">返回简体中文首页</a></div>

</div>
