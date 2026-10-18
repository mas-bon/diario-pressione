# 🩺 Pressione — Diario della Pressione Arteriosa

[![Web App Live](https://img.shields.io/badge/🌐_Applica_Live-GitHub_Pages-2563eb?style=for-the-badge)](https://mas-bon.github.io/diario-pressione/)
[![100% Offline & Privato](https://img.shields.io/badge/Privacy-100%25_Locale_&_Offline-10b981?style=for-the-badge)](#privacy-e-sicurezza-dei-dati)
[![Ottimizzato per iPhone](https://img.shields.io/badge/iOS_&_Android-PWA_Installabile-0f172a?style=for-the-badge)](#-installazione-su-iphone-e-android)

**Pressione** è una Web App progressiva (**PWA**) **100% autonoma, privata e funzionante anche offline**, progettata per il monitoraggio quotidiano della pressione arteriosa e della frequenza cardiaca secondo le linee guida europee **ESC/ESH**.

👉 **Link diretto alla Web App (pronto anche da inviare su WhatsApp):**  
🔗 **[https://mas-bon.github.io/diario-pressione/](https://mas-bon.github.io/diario-pressione/)**

---

## 📱 Installazione su iPhone e Android

### 🍎 Su iPhone / iPad (iOS)
1. Apri **[https://mas-bon.github.io/diario-pressione/](https://mas-bon.github.io/diario-pressione/)** in **Safari**.
2. Tocca il pulsante **Condividi** (l'icona con il quadrato e la freccia verso l'alto $\uparrow$ nella barra inferiore).
3. Scorri e seleziona **"Aggiungi alla schermata Home"** $\rightarrow$ **Aggiungi**.
4. L'app apparirà sulla tua Home come una vera applicazione nativa a schermo intero, funzionante **anche senza connessione Internet** e con supporto nativo alla **Stampa / Condivisione PDF**.

### 🤖 Su Android
1. Apri **[https://mas-bon.github.io/diario-pressione/](https://mas-bon.github.io/diario-pressione/)** in **Chrome**.
2. Tocca **"Installa"** in alto a destra (oppure dal menu $\vdots$ seleziona **"Installa app"** / **"Aggiungi a schermata Home"**).

---

## ✨ Caratteristiche Principali

* 📊 **Classificazione Clinica ESC/ESH**:
  * Valutazione automatica di ogni misurazione (*Ottimale*, *Normale*, *Normale-Alta*, *Ipertensione Grado 1, 2, 3*, *Ipertensione Sistolica Isolata*).
  * Calcolo automatico di **Pressione Differenziale (PP)** e **Pressione Arteriosa Media (PAM/MAP)**.
* 📈 **Grafici Clinici Interattivi**:
  * **Andamento temporale** di Sistolica, Diastolica e Battiti con linee guida di soglia (`140/90 mmHg`).
  * **Grafico di dispersione** (*Sistolica vs Diastolica*) con zone di rischio colorate.
  * **Distribuzione percentuale** per categoria pressoria e confronto per **fasce orarie** (*Mattina, Pomeriggio, Sera/Notte*).
* 📄 **Report Medico in PDF Vettoriale Nativo**:
  * Generazione istantanea offline di un **documento PDF A4 clinico** completo di statistiche riassuntive (medie, minimi, massimi, PP, PAM) e storico dettagliato delle misurazioni.
  * Condivisione diretta su **WhatsApp**, **Mail**, **File** o **Stampa AirPrint** dal menu nativo di iOS/Android.
* 📂 **Importazione ed Esportazione Universale**:
  * Esportazione e importazione completa in **Excel (`.xlsx`)**, **CSV (`.csv`)** e **Backup Completo (`.json`)**.
* 🛡️ **Eliminazione Sicura a Doppio Tocco**:
  * Protezione contro le cancellazioni accidentali sia per le singole voci sia per lo svuotamento dell'intero diario.
* 🌗 **Tema Chiaro e Scuro**:
  * Interfaccia ad alto contrasto ottimizzata per le *Safe Area* di iPhone (Dynamic Island / Notch) con adattamento istantaneo dei grafici.

---

## 🔒 Privacy e Sicurezza dei Dati

* **Zero Server, Zero Cloud, Zero Tracciamento**: nessun dato medico viene mai inviato a server esterni.
* **Archiviazione 100% Locale**: tutte le misurazioni sono salvate esclusivamente nella memoria interna (`localStorage`) del singolo telefono o computer. I dati restano **solo sul tuo dispositivo**: non vengono mai caricati né sincronizzati online. Esporta regolarmente un backup `.json` per non perderli se cancelli i dati del browser.
* **Multi-utente indipendente**: se condividi il link dell'app con familiari o amici, ciascuno avrà il proprio diario completamente vuoto, separato e privato sul proprio dispositivo.

---

## 📦 Modalità di Utilizzo Offline / Locale

Oltre alla versione online su GitHub Pages, il progetto include tre modalità per l'uso locale:

1. **[`Diario-Pressione-Standalone.html`](./Diario-Pressione-Standalone.html)** — **File Unico Autonomo**:
   * Racchiude l'intera applicazione (codice, stili, icone e generatore PDF) in un singolo file `.html` da ~1 MB, apribile con un doppio clic su qualsiasi PC o Mac senza installare nulla.
2. **[`Avvia-per-iPhone.bat`](./Avvia-per-iPhone.bat)** — **Server Locale Wi-Fi per iPhone**:
   * Avvia un server locale sulla rete Wi-Fi domestica mostrando un **QR Code** nel terminale da inquadrare con la fotocamera dell'iPhone.
3. **[`Avvia-Web-App-PWA.bat`](./Avvia-Web-App-PWA.bat)** — **Avvio Rapido Desktop**:
   * Avvia e apre automaticamente la PWA sul browser del PC (`http://localhost:3000`).

---

## 🛠️ Sviluppo e Compilazione

### Prerequisiti
* [Node.js](https://nodejs.org/) (v18 o superiore)

### Comandi principali

```bash
# Installa le dipendenze
npm install

# Avvia il server di sviluppo con Hot Reload (http://localhost:3000)
npm run dev

# Compila la build PWA (dist/) + il file singolo Diario-Pressione-Standalone.html
npm run build

# Esegue lint (tsc) e test (Vitest)
npm run lint
npm test

# Avvia il server locale ottimizzato per iPhone con QR Code in console
npm run iphone
```

### Struttura del Progetto

```text
├── public/                        # Icone PWA e Apple Touch Icon
├── scripts/
│   ├── build-standalone.mjs       # Compilatore del file singolo Diario-Pressione-Standalone.html
│   └── serve-iphone.mjs           # Server Wi-Fi dual-port con QR Code per iPhone
├── src/
│   ├── components/                # Componenti React (Header, Form, Grafici, Tabella, Modali)
│   ├── hooks/                     # Gestione diario locale (useLocalDiary) e stato PWA
│   ├── utils/                     # Statistiche ESC/ESH, generatore PDF nativo, Import/Export
│   ├── App.tsx                    # Componente principale dell'applicazione
│   └── main.tsx                   # Entry point React + registrazione Service Worker
├── Diario-Pressione-Standalone.html
├── index.html
└── vite.config.ts
```

---

## 📄 Licenza

Distribuito sotto licenza MIT. Creato per offrire uno strumento medico-personale gratuito, trasparente e rispettoso della privacy.
