# PODA DJ — Web Platform

Piattaforma web ufficiale e showcase musicale per **PODA DJ** (Electronic Music & Pro Audio Systems).  
Sviluppato con **Astro 5**, **Tailwind CSS** e architettura bilingue nativa (**IT / EN**).

---

## 🚀 Guida Rapida all'Avvio (Locale)

### 1. Prerequisiti
Assicurati di avere installato **Node.js** (versione 18 o superiore):
```bash
node -v
npm -v
```

### 2. Installazione delle dipendenze (solo la prima volta)
Se hai appena clonato il repository o cancellato la cartella `node_modules`:
```bash
npm install
```

### 3. Avviare il Server di Sviluppo
Dalla cartella principale del progetto, esegui:
```bash
npm run dev
```

Una volta avviato, vedrai nel terminale:
```text
  astro  v5.x.x ready in ... ms

  ┃ Local    http://localhost:4321/
  ┃ Network  use --host to expose
```

👉 **Apri il browser su:**
- **Versione Italiana (Default):** [http://localhost:4321](http://localhost:4321)
- **Versione Inglese:** [http://localhost:4321/en](http://localhost:4321/en)

> 💡 **Come fermare il server:** Premi `CTRL + C` nel terminale in qualsiasi momento.

---

## 📱 Come Testare il Layout Mobile da Smartphone (Stessa Rete Wi-Fi)

Per testare direttamente dal tuo telefono l'interfaccia **Mobile Linktree**, puoi esporre il server locale sulla tua rete locale:

```bash
npm run dev -- --host
```

Nel terminale comparirà il tuo indirizzo IP locale:
```text
  ┃ Local    http://localhost:4321/
  ┃ Network  http://192.168.1.XX:4321/
```

Apri Safari o Chrome sul tuo smartphone collegato alla stessa rete Wi-Fi e digita quell'indirizzo `http://192.168.1.XX:4321/` per navigare e toccare con mano le card Linktree con una mano sola.

---

## 📦 Build e Anteprima di Produzione

Per testare esattamente la versione ottimizzata e compilata che andrà online su Vercel:

```bash
# 1. Compila il sito in HTML/CSS statico
npm run build

# 2. Avvia l'anteprima locale della build
npm run preview
```

---

## 🖼️ Ottimizzazione Automatica delle Immagini

Se aggiungi nuove foto ad alta risoluzione (da fotocamera Canon, reflex o smartphone) nella cartella `assets/`, puoi convertirle automaticamente in formati web super-leggeri (**WebP** e JPG ottimizzati a ~150-300 KB):

```bash
npm run optimize-images
```
I file ottimizzati verranno generati automaticamente all'interno di `public/assets/`.

---

## 📂 Struttura del Progetto

```text
podadj.it/
├── assets/                 # Immagini originali ad alta risoluzione (RAW / backup)
├── public/                 # File statici serviti direttamente dal web server
│   └── assets/             # Immagini ottimizzate in formato WebP, JPG e PNG
├── src/
│   ├── components/         # Componenti dell'interfaccia:
│   │   ├── Header.astro              # Header con logo, bio, social e switcher IT|EN
│   │   ├── BentoGridDesktop.astro    # Bento Grid asimmetrica per schermi desktop (>= 768px)
│   │   ├── LinktreeMobile.astro      # Layout Linktree a colonna singola per mobile (< 768px)
│   │   ├── LanguageSwitcher.astro    # Selettore lingua minimale IT | EN
│   │   └── Footer.astro              # Footer "Booking & Contact"
│   ├── content/            # Archivio dati (Eventi, Live Sets, Tracklist)
│   ├── i18n/               # Sistema di multilingua:
│   │   ├── it.json                   # Dizionario testi in Italiano
│   │   ├── en.json                   # Dizionario testi in Inglese
│   │   └── ui.ts                     # Helper di navigazione e cambio lingua
│   ├── layouts/
│   │   └── BaseLayout.astro          # Template HTML di base con SEO e Open Graph
│   ├── pages/              # Routing delle pagine:
│   │   ├── index.astro               # Home Page Italiana (/)
│   │   └── en/
│   │       └── index.astro           # Home Page Inglese (/en)
│   └── styles/
│       └── global.css                # Stili globali, Tailwind e regole neon/glass
├── astro.config.mjs        # Configurazione Astro e impostazioni i18n
├── tailwind.config.mjs     # Configurazione Tailwind (colori neonPurple, neonBlue)
└── package.json            # Dipendenze e script npm
```
