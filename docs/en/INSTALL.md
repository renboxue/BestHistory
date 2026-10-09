---
layout: default
title: Install BestHistory v1.0.0
description: BestHistory v1.0.0 installation guide for GitHub manual installation, Developer Mode, Chrome Web Store, incognito permission, and updates.
permalink: /en/install/
lang: en
---

<div class="bh-doc-page" markdown="1">

# Install BestHistory v1.0.0

BestHistory v1.0.0 is available from the **Chrome Web Store** and **Firefox Add-ons**. Official browser stores are the recommended installation path for automatic updates.

<div class="bh-actions bh-actions-center"><a class="bh-btn bh-btn-primary" href="https://chromewebstore.google.com/detail/besthistory/ehcgfdgajgkkmelcjipahckmgjfdcajb" target="_blank" rel="noopener noreferrer">Add to Chrome</a><a class="bh-btn bh-btn-secondary" href="https://addons.mozilla.org/en-US/firefox/addon/besthistory/" target="_blank" rel="noopener noreferrer">Get for Firefox</a></div>

<div class="bh-install-box" markdown="1">

## Alternative: install v1.0.0 manually from GitHub

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

## Install from an official browser store

- **Chrome:** Open [BestHistory on the Chrome Web Store](https://chromewebstore.google.com/detail/besthistory/ehcgfdgajgkkmelcjipahckmgjfdcajb) and choose **Add to Chrome**.
- **Firefox:** Open [BestHistory on Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/besthistory/) and choose **Add to Firefox**.

Both official store versions receive browser-managed extension updates. The manual GitHub package is mainly for testing and users who specifically prefer a standalone download.

## Why keep GitHub installation as a second path?

GitHub Releases remains useful for preview packages, standalone builds, and release notes. Prefer the official store version for routine use.

The current installation options are:

- **Chrome Web Store / Firefox Add-ons** — recommended for most users and automatic updates;
- **GitHub Releases** — manual installation, testing, and version archives.

## Incognito / Private Mode

If you want BestHistory Pro to save selected incognito-window visits into encrypted Private Mode, Chrome requires you to explicitly enable **Allow in Incognito**:

1. Open `chrome://extensions/`.
2. Find BestHistory and open **Details**.
3. Enable **Allow in Incognito**.

This permission is optional. BestHistory cannot enable it on your behalf.

## Updates and backup

Chrome Web Store and Firefox Add-ons installations update through their respective browsers. GitHub manual installations require you to install newer releases yourself.

Before major upgrades, keeping a `.bhbackup` file is still recommended.

<div class="bh-actions bh-actions-center"><a class="bh-btn bh-btn-primary" href="https://chromewebstore.google.com/detail/besthistory/ehcgfdgajgkkmelcjipahckmgjfdcajb" target="_blank" rel="noopener noreferrer">Add to Chrome</a><a class="bh-btn bh-btn-secondary" href="https://addons.mozilla.org/en-US/firefox/addon/besthistory/" target="_blank" rel="noopener noreferrer">Get for Firefox</a><a class="bh-btn bh-btn-secondary" href="/">Back to the homepage</a></div>

</div>
