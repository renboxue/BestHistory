---
layout: default
title: Install BestHistory v1.0
description: BestHistory installation guide for Chrome Web Store, GitHub manual installation, Developer Mode, incognito permission, and updates.
permalink: /en/install/
lang: en
---

<div class="bh-doc-page" markdown="1">

# Install BestHistory v1.0

The recommended way to install BestHistory is the **Chrome Web Store**. Once the store listing is live, that will be the easiest option and Chrome will handle updates automatically.

The Chrome Web Store listing is still on the way. If you want to try BestHistory now, **GitHub Releases** is available as a manual-install path.

<div class="bh-install-box" markdown="1">

## Want to try it now? Install from GitHub

1. Open [BestHistory GitHub Releases](https://github.com/renboxue/BestHistory/releases) and download the Chrome / Chromium package currently provided there.
2. If the download is a `.zip`, extract it to a folder you will not accidentally delete.
3. Open `chrome://extensions/` in Chrome.
4. Turn on **Developer mode** in the top-right corner.
5. Click **Load unpacked**.
6. Choose the extracted BestHistory folder that contains `manifest.json`.
7. Optionally pin BestHistory from the extensions menu, then click its toolbar icon to open it.

> Manual installation is useful for early access and testing. Unlike a Chrome Web Store installation, a manually loaded build usually does not update automatically. When a new build is available, return to GitHub Releases and install the newer package.

</div>

## After the Chrome Web Store listing is live

For most users, the store version will become the recommended route:

1. Open the Chrome Web Store.
2. Search for **BestHistory**.
3. Verify the developer and official website information, then choose **Add to Chrome**.
4. Chrome will handle future updates automatically.

## Why keep GitHub installation as a second path?

GitHub is not only a temporary option while the Chrome Web Store listing is pending. If BestHistory later ships Edge, Firefox, or other browser builds, GitHub Releases can remain a useful home for preview packages, standalone builds, and release notes.

The long-term installation model is therefore:

- **Official browser stores** — recommended for most users and automatic updates;
- **GitHub Releases** — early access, testing, and future browser-specific builds.

## Incognito / Private Mode

If you want BestHistory Pro to save selected incognito-window visits into encrypted Private Mode, Chrome requires you to explicitly enable **Allow in Incognito**:

1. Open `chrome://extensions/`.
2. Find BestHistory and open **Details**.
3. Enable **Allow in Incognito**.

This permission is optional. BestHistory cannot enable it on your behalf.

## Updates and backup

Chrome Web Store installations update automatically. GitHub manual installations require you to install newer builds yourself.

Before major upgrades, keeping a `.bhbackup` file is still recommended.

<div class="bh-actions bh-actions-center"><a class="bh-btn bh-btn-primary" href="https://github.com/renboxue/BestHistory/releases">Open GitHub Releases</a><a class="bh-btn bh-btn-secondary" href="/">Back to the homepage</a></div>

</div>
