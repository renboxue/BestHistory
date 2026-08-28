---
layout: default
title: Install BestHistory v1.0.0
description: BestHistory v1.0.0 installation guide for GitHub manual installation, Developer Mode, Chrome Web Store, incognito permission, and updates.
permalink: /en/install/
lang: en
---

<div class="bh-doc-page" markdown="1">

# Install BestHistory v1.0.0

BestHistory v1.0.0 is now available on **GitHub Releases**. Chrome Web Store publication is still in progress, so GitHub is currently the way to try the official v1.0 release.

<div class="bh-install-box" markdown="1">

## Install v1.0.0 from GitHub now

1. Open [BestHistory v1.0.0 on GitHub Releases](https://github.com/renboxue/BestHistory/releases/tag/v1.0.0).
2. Download `BestHistory-v1.0.0-chrome.zip`.
3. Extract the ZIP to a folder you will not accidentally delete.
4. Open `chrome://extensions/` in Chrome.
5. Turn on **Developer mode** in the top-right corner.
6. Click **Load unpacked**.
7. Choose the extracted BestHistory folder that contains `manifest.json`.
8. Optionally pin BestHistory from the extensions menu, then click its toolbar icon to open it.

> A manually installed build does not update automatically like a Chrome Web Store installation. When a new release is available, return to GitHub Releases and install the newer package.

</div>

## After the Chrome Web Store listing is live

For most users, the store version will become the recommended route because installation and future updates are automatic:

1. Open the Chrome Web Store.
2. Search for **BestHistory**.
3. Verify the developer and official website information, then choose **Add to Chrome**.
4. Chrome will handle future updates automatically.

## Why keep GitHub installation as a second path?

GitHub is also useful beyond the current Chrome Web Store rollout. If BestHistory later ships Edge, Firefox, or other browser builds, GitHub Releases can remain a home for preview packages, standalone builds, and release notes.

The long-term installation model is:

- **Official browser stores** — recommended for most users and automatic updates;
- **GitHub Releases** — early access, testing, and future browser-specific builds.

## Incognito / Private Mode

If you want BestHistory Pro to save selected incognito-window visits into encrypted Private Mode, Chrome requires you to explicitly enable **Allow in Incognito**:

1. Open `chrome://extensions/`.
2. Find BestHistory and open **Details**.
3. Enable **Allow in Incognito**.

This permission is optional. BestHistory cannot enable it on your behalf.

## Updates and backup

Chrome Web Store installations update automatically. GitHub manual installations require you to install newer releases yourself.

Before major upgrades, keeping a `.bhbackup` file is still recommended.

<div class="bh-actions bh-actions-center"><a class="bh-btn bh-btn-primary" href="https://github.com/renboxue/BestHistory/releases/tag/v1.0.0">Download BestHistory v1.0.0</a><a class="bh-btn bh-btn-secondary" href="/">Back to the homepage</a></div>

</div>
