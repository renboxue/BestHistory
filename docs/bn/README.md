# BestHistory

<p align="center"><img src="../../assets/besthistory-icon.png" alt="BestHistory" width="112" /></p>
<p align="center"><strong>ব্রাউজারের ইতিহাসকে এমন এক ওয়েবসাইট সংগ্রহে বদলে দিন, যা সত্যিই আবার খুঁজে পাওয়া যায়।</strong></p>

<p align="center">
[简体中文](../../README.md) · [繁體中文](../zh-TW/README.md) · [English](../en/README.md) · [日本語](../ja/README.md) · [한국어](../ko/README.md) · [Español](../es/README.md) · [Português](../pt/README.md) · [Français](../fr/README.md) · [Deutsch](../de/README.md) · [Italiano](../it/README.md) · [Nederlands](../nl/README.md) · [Русский](../ru/README.md) · [العربية](../ar/README.md) · [हिन्दी](../hi/README.md) · [Bahasa Indonesia](../id/README.md) · [Türkçe](../tr/README.md) · বাংলা · [Tiếng Việt](../vi/README.md)
</p>

<p align="center"><a href="https://github.com/renboxue/BestHistory/releases/tag/v0.1.0-beta"><strong>⬇️ Chrome Beta v0.1.0 ডাউনলোড</strong></a> · <a href="INSTALL.md">ইনস্টলেশন</a> · <a href="../LANGUAGES.md">১৮ ভাষার ডকুমেন্টেশন</a></p>

## শুরুতেই: BestHistory কেন তৈরি করেছি

BestHistory একটি ছোট টুল, যেটি আমি একজন স্বাধীন ডেভেলপার হিসেবে নিজের বাস্তব সমস্যার সমাধান করতে বানাতে শুরু করেছি।

কোনও খুব দরকারি ওয়েবসাইট ব্যবহার করতাম, কয়েক দিন পরে আবার দরকার হলে নামটাই মনে থাকত না। কখনও শুধু মনে থাকত “কোনও একটা সাইটে এটা দেখেছিলাম”, কিন্তু ঠিক কোন পেজে তা জানতাম না। আবার খুঁজে না পাওয়ার ভয়ে অনেক ট্যাব ও উইন্ডো খোলা রাখতাম, কিছু সাইট পিন করতাম, আরও কিছু বুকমার্কে রাখতাম। ধীরে ধীরে ইতিহাস, pinned tab, bookmark এবং বন্ধ করতে ভয় লাগে এমন বহু পেজ জমে যেত — অথচ পুরোনো কোনও সাইট খুঁজে পাওয়া এখনও কঠিন থাকত।

তখন বুঝলাম, আমার দরকার শুধু আরও সুন্দর “history list” নয়।

আমার দরকার মানুষের স্মৃতির কাছাকাছি কিছু:

**পেজের title বা কোন দিনে দেখেছিলাম তা ভুলে যেতে পারি, কিন্তু সাধারণত মনে থাকে সাইটটি কেমন ছিল এবং আমি কী কাজে ব্যবহার করেছিলাম।**

সেখান থেকেই BestHistory।

> **শুধু পরে আর খুঁজে পাব না বলে যে ট্যাবগুলো খোলা রাখেন, সেগুলো নিশ্চিন্তে বন্ধ করতে পারা উচিত।**  
> সত্যিই দরকার হলে BestHistory যেন আপনাকে আবার সেখানে ফিরিয়ে নিয়ে যায়।

এটি এখনও খুব প্রাথমিক ব্যক্তিগত প্রকল্প। যদি আপনারও একই সমস্যা সমাধান করে, সেটাই আমার জন্য অনেক বড় ব্যাপার। কোন অংশ ভালো, কোন অংশ বিরক্তিকর এবং এরপর কী দরকার — সত্যিই জানতে চাই।

<p align="center"><img src="../../assets/screenshots/home.webp" alt="BestHistory websites" width="100%" /></p>
<p align="center"><sub>হাজারো পেজের আগে সহজ প্রশ্ন: “আমি কোন কোন ওয়েবসাইট ব্যবহার করেছি?”</sub></p>

---

## সাধারণ browser history থেকে পার্থক্য কী?

### 1. আগে ওয়েবসাইট, হাজার হাজার আলাদা পেজ নয়

সাধারণ history প্রতিটি visit আলাদা লাইনে দেখায়। একই সাইটে অনেক পেজ খুললে একটি সাইটেই পুরো তালিকা ভরে যেতে পারে।

BestHistory প্রথমে history-কে **ওয়েবসাইট অনুযায়ী** group করে। সাম্প্রতিক সাইট, সবচেয়ে বেশি ব্যবহার করা সাইট, শেষ কবে দেখা হয়েছে এবং সেই সাইটের কোন নির্দিষ্ট পেজগুলো খোলা হয়েছিল — সব দেখা যায়।

### 2. বিভিন্নভাবে সাজানো

- **সাম্প্রতিক**
- **সবচেয়ে বেশি দেখা**
- **নাম**
- **পিন করা**
- আলাদা অবস্থা যেমন **অগোছালো / ট্র্যাশ / ব্যক্তিগত সাইট**

### 3. নিজের ট্যাগ

অন্য কারও কাছে কোনও সাইট “tool”, আপনার কাছে সেটা “work” হতে পারে। একই সঙ্গে “design”, “AI” এবং “পরে আবার ব্যবহার”ও হতে পারে।

BestHistory **custom tag** এবং একটি সাইটে একাধিক tag সমর্থন করে। লক্ষ্য perfect filing system বানানো নয়; কয়েক মাস পরে শুধু কী কাজে লাগত তা মনে থাকলেও যেন ফিরে যাওয়ার আরও পথ থাকে।

### 4. একই সাইটের পেজ গুটিয়ে রাখা timeline

কখনও প্রশ্ন থাকে: “গতকাল বিকেলে আমি কী দেখছিলাম?”

BestHistory timeline একই সাইটের পরপর খোলা পেজগুলো একসঙ্গে রাখে এবং বিস্তারিত দরকার হলে তবেই খুলে দেখায়।

<p align="center"><img src="../../assets/screenshots/timeline.webp" alt="BestHistory collapsible timeline" width="100%" /></p>
<p align="center"><sub>একই সাইটের পেজ একসঙ্গে থাকে, তাই timeline title-এর দেওয়াল নয়, browsing journey-এর মতো লাগে।</sub></p>

### 5. এমন description যা শুধু আপনাকেই বুঝতে হবে

সাইটের official নাম সবসময় মনে করিয়ে দেয় না কেন ব্যবহার করেছিলাম। তাই নিজের নাম, note বা description লিখতে পারেন:

> “PDF-কে image বানানোর সাইট”
>
> “শিশুদের illustration-এর reference”
>
> “পুরোনো price দেখার ছোট tool”

এই নিজের লেখা কথাও পরে search করা যায়। অনেক সময় official title-এর চেয়ে নিজের description স্মৃতির সঙ্গে বেশি মেলে।

<p align="center"><img src="../../assets/screenshots/site-detail.webp" alt="BestHistory details, tags and notes" width="100%" /></p>

---

## ব্যক্তিগত মোড: মনে রাখতে চাই, কিন্তু সবার সামনে রাখতে চাই না

কিছু সাইট আমরা “ভুলে যেতে” চাই না; শুধু চাই না সেগুলো সাধারণ history-তে অন্য কারও চোখে সহজে পড়ুক।

**ব্যক্তিগত মোড (Pro)** private URL, title এবং visit-কে device-এ encrypt করে। আপনার সেট করা private password দেওয়ার পরেই সেগুলো দেখা যায়।

BestHistory-কে Incognito-তে চালানোর স্পষ্ট অনুমতি দিলে, সেই visit-গুলোও encrypted ভাবে সংরক্ষণ করা যায়। সেগুলো সাধারণ site list-এ মেশে না এবং ব্যক্তিগত মোড lock থাকলে দেখা যায় না।

> **যে সাইটগুলো সাধারণ history-তে রাখা অস্বস্তিকর, BestHistory সেগুলোও চুপচাপ মনে রাখতে পারে।**

Private data device-এ থাকে। BestHistory server private URL, title, private history বা password সংরক্ষণ করে না।

---

## Search, pin এবং ট্র্যাশ

Search website, domain, tag, note এবং page title ব্যবহার করে। সাইটের নাম পুরোপুরি ভুলে গেলেও সেখানে দেখা কোনও বিষয় মনে থাকলে আবার খুঁজে পাওয়া সম্ভব হতে পারে।

ঘনঘন ব্যবহৃত সাইট pin করা যায়। এখন দেখতে না চাইলে সরাসরি delete না করে **ট্র্যাশ**-এ রাখা যায়; পরে restore বা permanently delete করা যায়।

History organize করা মানেই প্রতিবার irreversible decision নেওয়া নয়।

---

## Backup, restore এবং browser বদল

BestHistory-এর organization data মূলত local-এ থাকে।

একটি `.bhbackup` file দিয়ে computer, installation, device এবং browser-এর মধ্যে data move এবং merge করা যায়। Restore safe merge ব্যবহার করে, বর্তমান সব data অন্ধভাবে overwrite করে না।

Private Mode-এর data backup-এও encrypted থাকে এবং পুরোনো private password লাগে।

> এখন “cross-browser sync” বলতে local backup file দিয়ে transfer এবং merge বোঝায়। BestHistory **পুরো browsing history cloud-এ upload করে না**।

এটি ইচ্ছাকৃত: BestHistory-কে আগে **local-first** tool রাখতে চাই।

---

## Privacy, Free এবং Pro

BestHistory server browsing history, URL, title, tag, note, search, private record, encryption key বা `.bhbackup` content সংরক্ষণ করে না।

Login করলে server মূলত account, authentication এবং Free / Trial / Pro entitlement পরিচালনা করে। বিস্তারিত [PRIVACY.md](PRIVACY.md)-এ।

মূল local feature **login ছাড়াই** ব্যবহার করা যায়। Beta চলাকালে নতুন account বর্তমানে **৩০ দিনের Pro trial** পায়। প্রধান Pro feature এখন ব্যক্তিগত মোড।

---

## Interface এবং documentation — ১৮ ভাষায়

<p align="center"><img src="../../assets/screenshots/languages.webp" alt="BestHistory 18 languages" width="100%" /></p>

README, installation, privacy, FAQ, security, changelog এবং Release Note — সবই ১৮ ভাষায় আছে। [ভাষার তালিকা](../LANGUAGES.md) দেখুন।

---

## এটা কেবল শুরু

BestHistory তৈরি করার মূল কারণ ছিল, আমি নিজেই tab বন্ধ করতে ভয় পেতাম — পরে সাইট আর খুঁজে না পাওয়ার ভয়ে।

এখন এটি বন্ধ করা সাইট আবার খুঁজে পেতে সাহায্য করতে পারে। ভবিষ্যতেও একই মূল সমস্যাকে ঘিরে কাজ করতে চাই: অপ্রয়োজনীয় tab আরও নিশ্চিন্তে বন্ধ করা এবং সত্যিই ব্যবহার করা website সহজে organize করা — শুধু feature বাড়ানোর জন্য feature যোগ করা নয়।

BestHistory কাজে এলে ⭐ Star, কোনও সমস্যা হলে Issue, বা শুধু কীভাবে history, bookmark এবং অনেক tab manage করেন তা জানালে খুব উপকার হবে। Private feedback: **besthistory@126.com**।

Public Issue-এ private URL, password, private history বা full backup দেবেন না।

---

## Beta ইনস্টল

**[⬇️ BestHistory v0.1.0 Beta for Chrome](https://github.com/renboxue/BestHistory/releases/tag/v0.1.0-beta)**

এখনও manual: **Developer mode → Load unpacked**। বিস্তারিত [INSTALL.md](INSTALL.md)-এ।

---

**BestHistory application source code proprietary এবং এই public repository-তে প্রকাশিত নয়।**

বর্তমান version: **v0.1.0 Beta** · [CHANGELOG.md](CHANGELOG.md)
