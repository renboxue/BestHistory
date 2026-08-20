# BestHistory

<p align="center">
  <img src="../../assets/besthistory-icon.png" alt="BestHistory" width="112" />
</p>

<p align="center"><strong>Turn browser history into a website toolbox you can actually find things in again.</strong></p>

<!-- BESTHISTORY_SEO_STEP27_SUMMARY_START -->
<p align="center">BestHistory is a privacy-first Chrome and Chromium browser history manager for searching old browser history, finding websites you visited before but forgot, and organizing browsing history by website, tags, notes and page titles.</p>
<!-- BESTHISTORY_SEO_STEP27_SUMMARY_END -->

<p align="center">
[简体中文](../../README.md) · [繁體中文](../zh-TW/README.md) · English · [日本語](../ja/README.md) · [한국어](../ko/README.md) · [Español](../es/README.md) · [Português](../pt/README.md) · [Français](../fr/README.md) · [Deutsch](../de/README.md) · [Italiano](../it/README.md) · [Nederlands](../nl/README.md) · [Русский](../ru/README.md) · [العربية](../ar/README.md) · [हिन्दी](../hi/README.md) · [Bahasa Indonesia](../id/README.md) · [Türkçe](../tr/README.md) · [বাংলা](../bn/README.md) · [Tiếng Việt](../vi/README.md)
</p>


<p align="center">
  <a href="https://github.com/renboxue/BestHistory/releases/tag/v0.1.0-beta"><strong>⬇️ Download Chrome Beta v0.1.0</strong></a>
  &nbsp;·&nbsp;
  <a href="INSTALL.md">Installation</a>
  &nbsp;·&nbsp;
  <a href="../LANGUAGES.md">Documentation in 18 languages</a>
</p>

---

## A note from the developer: why BestHistory exists

BestHistory is a small tool I built as an independent developer because I kept running into the same problem myself.

I would use a really useful website, then need it again a few days later and have no idea what it was called. Sometimes I only remembered that “I saw it on some website,” but not the exact page. Because I was afraid I would never find things again, I kept dozens of tabs and windows open, pinned sites I did not want to lose, and pushed even more things into bookmarks. Eventually I had browser history, pinned tabs, bookmarks, and a pile of pages I was afraid to close — yet finding one old website was still difficult.

I realized I did not really want a prettier history list.

I wanted something closer to the way I actually remember things:

**I may forget the page title and the date, but I often remember what kind of website it was and what I used it for.**

That became BestHistory.

Its goal is simple:

> **Let you close the tabs you keep open only because you are afraid you will never find them again.**  
> When you really need them, BestHistory should help you get back there.

BestHistory is still a very early personal project. If it happens to solve the same problem for you, that means a lot to me. I would also genuinely like to hear what works, what feels awkward, and what you wish it could solve next.

<p align="center">
  <img src="../../assets/screenshots/home.webp" alt="BestHistory website overview" width="100%" />
</p>
<p align="center"><sub>Turn thousands of page visits back into a simple answer to: “Which websites have I used?”</sub></p>

---

## What makes BestHistory different from ordinary browser history?

### 1. Start with websites, not tens of thousands of page entries

This is the core idea behind BestHistory.

Normal browser history flattens every visit into a long list. If you open dozens of pages on the same site, those dozens of entries can quickly fill the screen.

BestHistory first groups history by **website**.

You can see:

- which websites you visited recently;
- which websites you use most often;
- when you last visited a website;
- which specific pages you previously opened inside that website.

For me, this is much easier to remember than a wall of page titles.

### 2. Sort the same history in different ways

You can look at the same collection from several angles:

- **Recent** — what you used lately;
- **Most visited** — the sites you actually return to;
- **Name** — useful when you remember what the site was called;
- **Pinned** — keep important sites at the front;
- separate states such as **Unorganized / Wastebasket / Private websites**.

The goal is to make it obvious which websites are really part of your everyday browsing.

### 3. Give websites your own tags

A website does not always belong to one official category.

A site that somebody else calls a “tool” may be “work” to you. It might also be “design,” “AI,” and “use again later” at the same time.

BestHistory therefore supports **custom tags**, including multiple tags on one website. Tags are not about building a perfect filing system. They are another path back to something when, months later, all you remember is roughly what it was for.

### 4. A timeline that collapses repeated pages by website

Sometimes the question is still:

> “What was I browsing yesterday afternoon?”

BestHistory keeps a timeline, but it does not simply copy the browser's raw history list.

Consecutive pages from the same website are grouped together and can be expanded only when you need the details. You keep the browsing flow without letting one website flood the entire timeline.

<p align="center">
  <img src="../../assets/screenshots/timeline.webp" alt="BestHistory collapsible website timeline" width="100%" />
</p>
<p align="center"><sub>Repeated pages from the same website stay together, so the timeline feels like a browsing journey instead of a wall of titles.</sub></p>

### 5. Write the one description that only you need to understand

This is another feature I personally wanted.

A website's official name often does not remind me why I saved it. So you can add your own note or description, for example:

> “The site I used last time to turn a PDF into images”

> “Reference site I found while making children's illustrations”

> “That little tool for checking historical prices”

You can later search those words too. Sometimes your own description is much closer to your real memory than the official site title.

<p align="center">
  <img src="../../assets/screenshots/site-detail.webp" alt="BestHistory website details, tags and notes" width="100%" />
</p>
<p align="center"><sub>A website can have your own name, notes and tags, while still keeping the pages you visited under it.</sub></p>

---

## Private Mode: history I want to remember, but not leave in plain sight

This is an important part of BestHistory for me.

Some websites are not things you want to “forget.” You simply do not want them mixed into ordinary browser history where somebody else can casually see them.

BestHistory therefore includes **Private Mode (Pro)**.

Private URLs, page titles and visit records are encrypted locally on your device. They can only be viewed after you enter the private password you set.

Private Mode can also work with **incognito windows**:

- browsers normally discard incognito history after the window closes;
- if you explicitly allow BestHistory to run in incognito, it can automatically save those visits into Private Mode in encrypted form;
- they do not appear in the ordinary website list;
- when Private Mode is locked, those websites and pages are not shown directly.

In other words:

> **BestHistory can quietly remember the sites you do not want sitting in ordinary history.**

Private browsing data still stays on your device. BestHistory's server does not store your private URLs, page titles, private history or Private Mode password.

---

## Search: you do not have to remember the website's name

BestHistory search is not limited to domains.

It can use websites, domains, tags, your notes and page titles. You may completely forget what a site was called and only remember something you once saw there. BestHistory tries to use the traces you already have — including old page titles and your own descriptions — to help you find the website again.

Once inside a website, you can continue browsing and searching the individual pages you visited there.

---

## Pinning, Wastebasket and everyday organization

Not every piece of history needs the same treatment.

- **Pin** websites you use all the time.
- Move sites you do not want to see right now into the **Wastebasket** instead of deleting them immediately.
- Restore them later if you change your mind.
- Permanently delete them when you are sure they are no longer needed.

My view is that organizing history should not force you to make a permanent decision every time. “Put it aside for now” should be a normal option.

---

## Backup, restore and moving between browsers

BestHistory's history-organization data is primarily stored locally.

You can export a single `.bhbackup` file to:

- move to another computer;
- reinstall a browser or BestHistory;
- move BestHistory data to another device;
- transfer and merge BestHistory data between different browsers.

Restore uses a safe-merge approach rather than blindly replacing the entire current database.

Private Mode data remains encrypted inside the backup and still requires the original private password when restored.

Timeline history can also be exported as CSV for Excel, Numbers or other spreadsheet tools.

> At the moment, “cross-browser sync” means local backup-based transfer and merge. BestHistory does **not** upload your complete browsing history to the cloud for real-time synchronization.

That choice is intentional: I want BestHistory to be **local-first**.

---

## Privacy: one thing I do not want to trade away for features

Browser history is deeply personal data.

### Browsing data stays on your device

BestHistory's server does not store:

- your browsing history;
- visited URLs;
- page titles;
- website tags or notes;
- searches;
- private websites or private browsing records;
- Private Mode encryption keys;
- the contents of your `.bhbackup` files.

### If you sign in, the server handles account and entitlement data

This may include:

- your BestHistory account identifier;
- email and necessary authentication information;
- interface language;
- Free / Trial / Pro entitlement state;
- subscription status and payment-provider identifiers when paid subscriptions are introduced.

See [PRIVACY.md](PRIVACY.md) for details.

---

## Free and Pro

I do not want you to register just to try a browser-history tool.

BestHistory's core local history features can therefore be used **without signing in**.

During the current Beta:

- Free works without an account;
- newly registered accounts receive a **30-day Pro trial**;
- Private Mode is currently the main Pro feature;
- trial length and future Pro features may change based on real user feedback.

Signing in is mainly for entitlement. It does not cause your browsing history to be uploaded to the BestHistory server.

---

## 18 interface languages — and documentation in all 18

BestHistory currently supports:

简体中文, 繁體中文, English, 日本語, 한국어, Español, Português, Français, Deutsch, Italiano, Nederlands, Русский, العربية, हिन्दी, Bahasa Indonesia, Türkçe, বাংলা and Tiếng Việt.

<p align="center">
  <img src="../../assets/screenshots/languages.webp" alt="BestHistory 18 interface languages" width="100%" />
</p>

The public Beta README, installation guide, privacy notice, FAQ, security notice, changelog and release notes are also available in all 18 languages. See [the language index](../LANGUAGES.md).

---

## This is still only the beginning

The original reason I built BestHistory was simple:

> I was afraid to close tabs because I might never find the websites again.

BestHistory can already help me recover websites after I close them. In the future I want to keep working around that same core problem: how to make it safer to close tabs we no longer need open, and how to make the websites we actually use easier to organize — not just add features for the sake of adding features.

I also do not want to build every idea I can think of before real people use the product. What I need most now is feedback.

---

## If you would like to support the project

If BestHistory solves a problem you have too, I would really appreciate it if you:

- ⭐ Star the repository so I know people actually want this;
- 🐛 open an Issue when something breaks;
- 💡 tell me how you currently manage history, bookmarks and too many open tabs;
- ✉️ email **besthistory@126.com** if you would rather not post publicly.

Even a short message such as “I would really use this” or “this part feels annoying” is valuable for a one-person project.

Please do not include private URLs, private browsing records, passwords, backup files or other sensitive browsing data in public Issues.

Thank you for reading this far — and for giving BestHistory a try.

---


---

<!-- BESTHISTORY_SEO_STEP27_GUIDES_START -->
## Trying to find something in old Chrome history?

BestHistory is designed for the moments when you remember **the website or what you used it for**, but not the exact page title or date. These practical guides cover the most common browser-history problems:

- [How to search old Chrome history](guides/search-old-chrome-history.md)
- [How to find a website you visited before but forgot](guides/find-website-you-visited-before.md)
- [How to organize Chrome history by website](guides/organize-browser-history-by-website.md)
- [Browser history manager: what to look for beyond Chrome's default history](guides/browser-history-manager.md)
- [How to save incognito history privately when you choose to](guides/save-incognito-history-privately.md)
- [Looking for a BetterHistory / Better History alternative?](guides/betterhistory-alternative.md)

<!-- BESTHISTORY_SEO_STEP27_GUIDES_END -->

## Beta installation

BestHistory v0.1.0 Beta is available from GitHub Releases:

**[⬇️ Download BestHistory v0.1.0 Beta for Chrome](https://github.com/renboxue/BestHistory/releases/tag/v0.1.0-beta)**

For now, installation still uses Chrome's **Developer mode → Load unpacked** flow. See [INSTALL.md](INSTALL.md) for the full steps.

---

## About this repository

This public repository is for product information, Beta releases, documentation, privacy and security information, Issues and user feedback.

**The BestHistory application source code is proprietary and is not published in this repository.**

---

## Current version

**v0.1.0 Beta**

See [CHANGELOG.md](CHANGELOG.md) for changes.
