# BestHistory गोपनीयता सूचना

_अंतिम अपडेट: 2026-08-20_

[← BestHistory](README.md) · [सभी भाषाएँ](../LANGUAGES.md)

BestHistory browser history व्यवस्थित करने वाला local-first extension है।

## ब्राउज़िंग डेटा
History, visited URLs, page titles, site metadata, tags, notes, search input और Private Mode records डिवाइस पर process होते हैं और BestHistory account server पर upload नहीं होते।

## Account और entitlement
Login करने पर BestHistory account पहचानने और Free / Trial / Pro अधिकार तय करने के लिए account infrastructure उपयोग करता है। इसमें account ID, email/auth metadata, preferred language, trial/membership/subscription status और validity, तथा भविष्य के payment-provider identifiers हो सकते हैं।

## निजी मोड
Private URLs, titles और visits डिवाइस पर encrypt होते हैं। Private password और decrypted private data server को नहीं भेजे जाते।

## Backup
Backups local बनते हैं और BestHistory उन्हें automatically upload नहीं करता। Private records encrypted रहते हैं; ordinary history वाले पूरे file को पूर्णतः encrypted न मानें।

## Third-party services
BestHistory अभी account auth/entitlement के लिए Supabase और authentication email के लिए Amazon SES उपयोग करता है। ये केवल account/email delivery के लिए ज़रूरी data process करते हैं, browsing history नहीं।

## Data deletion
Local BestHistory data extension से delete किया जा सकता है। Logout local session हटाता है लेकिन local history organization data जानबूझकर नहीं मिटाता। Account deletion flow Beta में आगे बढ़ सकता है।

## संपर्क
Privacy: **besthistory@126.com**
