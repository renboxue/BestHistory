# BestHistory

<p align="center"><img src="../../assets/besthistory-icon.png" alt="BestHistory" width="112" /></p>
<p align="center"><strong>Trasforma la cronologia del browser in una raccolta di siti che puoi davvero ritrovare.</strong></p>

<p align="center">
[简体中文](../../README.md) · [繁體中文](../zh-TW/README.md) · [English](../en/README.md) · [日本語](../ja/README.md) · [한국어](../ko/README.md) · [Español](../es/README.md) · [Português](../pt/README.md) · [Français](../fr/README.md) · [Deutsch](../de/README.md) · Italiano · [Nederlands](../nl/README.md) · [Русский](../ru/README.md) · [العربية](../ar/README.md) · [हिन्दी](../hi/README.md) · [Bahasa Indonesia](../id/README.md) · [Türkçe](../tr/README.md) · [বাংলা](../bn/README.md) · [Tiếng Việt](../vi/README.md)
</p>

<p align="center"><a href="https://github.com/renboxue/BestHistory/releases/tag/v0.1.0-beta"><strong>⬇️ Scarica Chrome Beta v0.1.0</strong></a> · <a href="INSTALL.md">Installazione</a> · <a href="../LANGUAGES.md">Documentazione in 18 lingue</a></p>

## Prima di tutto: perché esiste BestHistory

BestHistory è un piccolo strumento che ho creato come sviluppatore indipendente per risolvere un problema che avevo io stesso.

Usavo un sito molto utile e, qualche giorno dopo, quando mi serviva di nuovo, non ricordavo più come si chiamava. A volte ricordavo soltanto “l’ho visto su qualche sito”, senza sapere la pagina precisa. Per paura di non ritrovarlo mai più, tenevo troppe schede e finestre aperte, fissavo siti e aggiungevo ancora più cose ai preferiti. Col tempo mi ritrovavo con cronologia, schede fissate, preferiti e decine di pagine che non osavo chiudere — e recuperare un vecchio sito restava comunque difficile.

Ho capito che non volevo semplicemente una cronologia più bella.

Volevo qualcosa di più vicino al modo in cui ricordo davvero:

**posso dimenticare il titolo della pagina e il giorno, ma spesso ricordo che tipo di sito era e a cosa mi serviva.**

Da qui è nato BestHistory.

> **Vorrei permetterti di chiudere quelle schede che tieni aperte solo per paura di non ritrovarle mai più.**  
> Quando servono davvero, BestHistory dovrebbe aiutarti a tornare lì.

È ancora un progetto personale molto giovane. Se risolve anche un tuo problema, ne sarò davvero felice. E voglio sapere sinceramente cosa funziona, cosa è scomodo e cosa vorresti che risolvesse in futuro.

<p align="center"><img src="../../assets/screenshots/home.webp" alt="BestHistory siti" width="100%" /></p>
<p align="center"><sub>Da migliaia di pagine a una domanda più semplice: “quali siti ho usato?”</sub></p>

---

## Cosa cambia rispetto alla cronologia normale?

### 1. Prima i siti, non decine di migliaia di pagine

La cronologia normale mette ogni visita in una lunga lista. Se apri molte pagine dello stesso sito, quel sito può riempire lo schermo.

BestHistory raggruppa prima per **sito web**. Puoi vedere i siti recenti, quelli più usati, l’ultima visita e le singole pagine aperte all’interno di ciascun sito.

### 2. Ordinamenti diversi

- **Recenti**
- **Più visitati**
- **Nome**
- **Fissati**
- viste separate come **Non organizzati / Cestino / Siti privati**

### 3. Le tue etichette

Un sito può essere “strumento” per qualcun altro e “lavoro” per te. Può essere anche “design”, “IA” e “da riusare” contemporaneamente.

BestHistory supporta **etichette personalizzate** e più etichette per sito. Non serve costruire un archivio perfetto: serve avere più strade per ritrovare qualcosa quando, mesi dopo, ricordi solo più o meno a cosa serviva.

### 4. Una timeline che raggruppa le pagine dello stesso sito

A volte vogliamo ancora ricordare: “cosa stavo guardando ieri pomeriggio?”

La timeline di BestHistory raggruppa le pagine consecutive dello stesso sito e le espande soltanto quando vuoi vedere i dettagli.

<p align="center"><img src="../../assets/screenshots/timeline.webp" alt="Timeline comprimibile BestHistory" width="100%" /></p>
<p align="center"><sub>Le pagine dello stesso sito restano insieme: la timeline sembra un percorso di navigazione, non un muro di titoli.</sub></p>

### 5. Una descrizione che deve avere senso solo per te

Il nome ufficiale di un sito non sempre mi ricorda perché l’ho usato. Puoi quindi aggiungere un nome, una nota o una descrizione personale:

> “Il sito usato per trasformare un PDF in immagini”
>
> “Il riferimento trovato per illustrazioni per bambini”
>
> “Quel piccolo tool per controllare i prezzi storici”

Anche queste parole possono essere cercate. Spesso la tua descrizione personale è più vicina alla memoria reale del titolo ufficiale.

<p align="center"><img src="../../assets/screenshots/site-detail.webp" alt="Dettagli, etichette e note BestHistory" width="100%" /></p>

---

## Modalità privata: cronologia che voglio ricordare, ma non lasciare in vista

Alcuni siti non sono cose che vogliamo “dimenticare”; semplicemente non vogliamo che siano mescolati alla cronologia normale e visibili a chiunque.

La **Modalità privata (Pro)** cifra localmente URL, titoli e visite private. Sono visibili solo dopo l’inserimento della password privata impostata.

Se autorizzi esplicitamente BestHistory a funzionare in incognito, può salvare anche quelle visite in forma cifrata. Non finiscono nella lista normale e restano nascoste quando la Modalità privata è bloccata.

> **Anche i siti che non vuoi lasciare nella cronologia ordinaria possono essere ricordati discretamente da BestHistory.**

I dati privati restano sul dispositivo. Il server BestHistory non conserva URL privati, titoli, cronologia privata o password.

---

## Ricerca, fissati e Cestino

La ricerca usa siti, domini, etichette, note e titoli delle pagine. Anche se dimentichi completamente il nome del sito, ricordare qualcosa che avevi visto lì può aiutarti a ritrovarlo.

I siti frequenti possono essere fissati. Quelli che non vuoi vedere adesso possono andare nel **Cestino** senza essere eliminati subito; in seguito puoi ripristinarli o cancellarli definitivamente.

Organizzare la cronologia non dovrebbe obbligare a una decisione irreversibile ogni volta.

---

## Backup, ripristino e migrazione tra browser

I dati di organizzazione di BestHistory sono conservati principalmente in locale.

Un singolo file `.bhbackup` permette di spostare e unire dati tra computer, installazioni, dispositivi e browser. Il ripristino usa una fusione sicura, non sovrascrive ciecamente tutto lo stato attuale.

I dati della Modalità privata restano cifrati nel backup e richiedono la password originale.

> Per ora, “sincronizzazione tra browser” significa trasferimento e fusione tramite backup locale. BestHistory **non carica tutta la cronologia nel cloud** per una sincronizzazione in tempo reale.

È una scelta intenzionale: voglio che BestHistory sia prima di tutto uno strumento **local-first**.

---

## Privacy, Free e Pro

Il server BestHistory non memorizza cronologia, URL, titoli, etichette, note, ricerche, dati privati, chiavi di cifratura o contenuti `.bhbackup`.

Se accedi, il server gestisce soprattutto account, autenticazione e diritti Free / Trial / Pro. Dettagli in [PRIVACY.md](PRIVACY.md).

Le funzioni locali principali funzionano **senza accesso**. Durante la Beta, i nuovi account ricevono attualmente **30 giorni di prova Pro**. La Modalità privata è oggi la funzione Pro principale.

---

## Interfaccia e documentazione in 18 lingue

<p align="center"><img src="../../assets/screenshots/languages.webp" alt="BestHistory 18 lingue" width="100%" /></p>

README, installazione, privacy, FAQ, sicurezza, changelog e Release Note sono disponibili in tutte le 18 lingue. Vedi [indice delle lingue](../LANGUAGES.md).

---

## È solo l’inizio

BestHistory è nato perché io stesso avevo paura di chiudere schede e non ritrovare più i siti.

Oggi può già aiutarmi a recuperare siti dopo averli chiusi. Voglio continuare attorno allo stesso problema: chiudere le schede con più tranquillità e organizzare meglio i siti che usiamo davvero, invece di aggiungere funzioni solo per aggiungerle.

Se BestHistory ti aiuta, apprezzo una ⭐ Star, un Issue quando qualcosa non va o semplicemente un messaggio su come gestisci cronologia, preferiti e troppe schede. Feedback privato: **besthistory@126.com**.

Non inserire URL privati, password, cronologia privata o backup completi in Issue pubblici.

---

## Installazione Beta

**[⬇️ BestHistory v0.1.0 Beta per Chrome](https://github.com/renboxue/BestHistory/releases/tag/v0.1.0-beta)**

Per ora: **Modalità sviluppatore → Carica estensione non pacchettizzata**. Consulta [INSTALL.md](INSTALL.md).

---

**Il codice sorgente dell’applicazione BestHistory è proprietario e non è pubblicato in questo repository.**

Versione attuale: **v0.1.0 Beta** · [CHANGELOG.md](CHANGELOG.md)
