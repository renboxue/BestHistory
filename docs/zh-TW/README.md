# BestHistory

<p align="center"><img src="../../assets/besthistory-icon.png" alt="BestHistory" width="112" /></p>
<p align="center"><strong>把瀏覽歷史變成真正能重新找回的網站工具箱。</strong></p>

<p align="center">
[简体中文](../../README.md) · 繁體中文 · [English](../en/README.md) · [日本語](../ja/README.md) · [한국어](../ko/README.md) · [Español](../es/README.md) · [Português](../pt/README.md) · [Français](../fr/README.md) · [Deutsch](../de/README.md) · [Italiano](../it/README.md) · [Nederlands](../nl/README.md) · [Русский](../ru/README.md) · [العربية](../ar/README.md) · [हिन्दी](../hi/README.md) · [Bahasa Indonesia](../id/README.md) · [Türkçe](../tr/README.md) · [বাংলা](../bn/README.md) · [Tiếng Việt](../vi/README.md)
</p>

<p align="center">
<a href="https://github.com/renboxue/BestHistory/releases/tag/v0.1.0-beta"><strong>⬇️ 下載 Chrome Beta v0.1.0</strong></a>
&nbsp;·&nbsp; <a href="INSTALL.md">安裝說明</a>
&nbsp;·&nbsp; <a href="../LANGUAGES.md">18 種語言文件</a>
</p>

## 寫在前面：為什麼會有 BestHistory

BestHistory 是我作為一名個人開發者，因為自己真實遇到的困擾做出來的一個小工具。

我常常遇到這些情況：前幾天明明用過一個很好用的網站，真正需要時卻想不起名字；只記得「好像是在某個網站裡看過」，卻完全不記得是哪一頁；因為怕之後找不到，我會一直開著很多分頁和視窗，把常用網站固定起來，再把重要一點的塞進書籤。時間久了，歷史、固定分頁、書籤和一堆不敢關掉的頁面全都堆在一起，真正要找某個舊網站時還是很麻煩。

我慢慢發現，我真正需要的不是另一條更漂亮的「瀏覽歷史清單」。

我需要的是一種更接近人記憶方式的整理方法：

**我可能記不得頁面標題，也記不得哪一天看過，但我通常還記得「那是什麼網站」「我當時拿它做什麼」。**

於是有了 BestHistory。

> **讓你敢於關掉那些「怕以後找不到」的分頁。**  
> 真正需要時，BestHistory 應該能幫你把它重新找回來。

BestHistory 目前還是一個很早期的個人專案。如果它剛好也解決了你的困擾，我會很開心，也真心希望你告訴我哪裡好用、哪裡麻煩，以及你真正希望它接下來解決什麼。

<p align="center"><img src="../../assets/screenshots/home.webp" alt="BestHistory 我的網站" width="100%" /></p>
<p align="center"><sub>先把成千上萬條頁面歷史還原成「我用過哪些網站」。</sub></p>

---

## BestHistory 和一般瀏覽歷史有什麼不同？

### 1. 先看「網站」，而不是先看幾萬條頁面紀錄

這是 BestHistory 最核心的功能。一般瀏覽器會把每一次頁面訪問平鋪成一長串；如果一天在同一個網站裡點開幾十頁，歷史清單就會被同一個網站塞滿。

BestHistory 會先自動按照**網站**聚合。你可以先看到最近用過哪些網站、哪些網站最常使用、某個網站最近什麼時候看過，以及它底下曾經打開過哪些具體頁面。

### 2. 用不同方式排序，看清楚自己真正常用的網站

同一批歷史可以用不同角度查看：

- **最近訪問** — 最近用過什麼；
- **最常訪問** — 真正反覆使用的網站排在前面；
- **名稱排序** — 記得網站名稱時更容易找；
- **已固定** — 重要網站長期放在前面；
- 也可以單獨查看 **未整理 / 廢件箱 / 私密網站** 等狀態。

### 3. 用自己的標籤整理網站

同一個網站對別人可能是「工具」，對你可能是「工作」，也可能同時屬於「設計」「AI」「之後還會用」。

BestHistory 支援**自訂標籤**，而且一個網站可以有多個標籤。標籤不是為了把所有東西整理得完美，而是讓未來只記得「它大概是做什麼的」時，多一條找回它的路。

### 4. 時間軸按網站折疊，不再被同一個網站洗版

有時候我們還是會想知道：「我昨天下午到底看了什麼？」

BestHistory 保留時間軸，但不會直接複製瀏覽器原始歷史。連續打開同一網站的多個頁面會先折疊在一起，需要時再展開。

<p align="center"><img src="../../assets/screenshots/timeline.webp" alt="BestHistory 按網站折疊的時間軸" width="100%" /></p>
<p align="center"><sub>同一網站連續打開的頁面放在一起，時間軸更像瀏覽過程，而不是一堵標題牆。</sub></p>

### 5. 給網站寫一句「只有自己看得懂」的描述

網站官方名稱不一定能提醒我它到底有什麼用，所以 BestHistory 可以為網站加入自己的名稱、備註和描述，例如「上次把 PDF 轉成圖片的那個網站」或「做兒童插畫時找到的參考站」。

這些你自己寫下的話也能被搜尋，有時比官方標題更接近真實記憶。

<p align="center"><img src="../../assets/screenshots/site-detail.webp" alt="BestHistory 網站詳情、標籤和備註" width="100%" /></p>

---

## 私密模式：有些歷史我想記住，但不想讓別人看到

有些網站不是「不想留下紀錄」，而只是不希望它們和普通瀏覽歷史混在一起，被別人隨手看到。

因此 BestHistory 提供 **私密模式（Pro）**。私密網址、頁面標題和訪問紀錄會在本機加密，只有輸入你設定的私密密碼後才能查看。

如果你明確允許 BestHistory 在無痕視窗中執行，它也可以把無痕訪問自動加密保存到私密模式；這些內容不會混入普通網站清單，私密模式鎖定後也不會直接顯示。

> **那些不方便留在普通歷史裡的網站，BestHistory 也可以幫你悄悄記住。**

私密資料仍留在你的裝置上，BestHistory 伺服器不會保存私密網址、頁面標題、私密紀錄或私密模式密碼。

---

## 搜尋、固定、廢件箱與整理

BestHistory 可以透過網站、網域、標籤、備註和頁面標題搜尋；即使忘記網站名稱，只記得以前在裡面看過什麼，也有機會重新找回來。

常用網站可以固定；暫時不想看的網站可以先放進廢件箱，而不是立刻永久刪除；之後可以恢復，也可以確認後永久刪除。

我的想法是：整理歷史不應該逼使用者每一次都做永久決定。「先放一邊，以後再處理」本來就應該是一種正常操作。

---

## 備份、恢復與跨瀏覽器遷移

BestHistory 的歷史整理資料主要保存在本機。你可以匯出單一 `.bhbackup` 檔案，用來換電腦、重裝瀏覽器、移到另一台裝置，或在不同瀏覽器之間遷移與合併 BestHistory 資料。

恢復採用安全合併邏輯，而不是把目前資料整庫覆蓋。私密模式資料在備份中仍保持加密，恢復私密內容時需要原來的私密密碼。

> 目前所謂「跨瀏覽器同步」更準確地說，是透過本機備份檔遷移與合併，而不是把完整瀏覽歷史上傳雲端做即時同步。

這是刻意的設計，因為我希望 BestHistory 首先是一款**本機優先**的工具。

---

## 隱私、Free 與 Pro

BestHistory 伺服器不會保存你的瀏覽歷史、訪問網址、頁面標題、標籤、備註、搜尋、私密紀錄、私密模式加密金鑰或 `.bhbackup` 內容。

如果你選擇登入，伺服器主要處理帳戶、登入和 Free / Trial / Pro 權益資料。詳細內容見 [PRIVACY.md](PRIVACY.md)。

核心本機歷史功能**不登入也可以長期使用**。Beta 階段，新註冊帳戶目前會獲得 **30 天 Pro 試用**，目前 Pro 最主要的功能是私密模式。

---

## 18 種介面語言，也提供 18 種文件

BestHistory 支援簡體中文、繁體中文、English、日本語、한국어、Español、Português、Français、Deutsch、Italiano、Nederlands、Русский、العربية、हिन्दी、Bahasa Indonesia、Türkçe、বাংলা、Tiếng Việt。

<p align="center"><img src="../../assets/screenshots/languages.webp" alt="BestHistory 18 種介面語言" width="100%" /></p>

README、安裝說明、隱私說明、FAQ、安全說明、更新日誌和 Release Note 也提供 18 種語言。完整入口見 [語言索引](../LANGUAGES.md)。

---

## 現在還只是開始

我最初做 BestHistory，就是因為自己怕關掉分頁之後再也找不到，所以瀏覽器裡長期堆著很多分頁和視窗。

現在 BestHistory 已經能幫我重新找到關掉的網站。以後我仍想圍繞同一個核心問題繼續做：怎樣讓我們更放心地關掉不需要一直開著的分頁，怎樣更輕鬆整理真正使用過的網站，而不是單純增加功能。

如果 BestHistory 剛好也解決了你的問題，歡迎 ⭐ Star、提交 Issue，或告訴我你平常怎樣管理歷史、書籤和一大堆分頁。也可以寄信到 **besthistory@126.com**。

請不要在公開 Issue 中附上私密網址、私密瀏覽紀錄、密碼或完整備份檔。

---

## Beta 安裝

**[⬇️ 下載 BestHistory v0.1.0 Beta for Chrome](https://github.com/renboxue/BestHistory/releases/tag/v0.1.0-beta)**

目前仍需透過 Chrome 的「開發者模式 → 載入未封裝項目」手動安裝。完整步驟見 [INSTALL.md](INSTALL.md)。

---

**BestHistory 應用程式原始碼目前為非開源專有程式碼，不會在此公開倉庫中發布。**

目前版本：**v0.1.0 Beta**。詳見 [CHANGELOG.md](CHANGELOG.md)。
