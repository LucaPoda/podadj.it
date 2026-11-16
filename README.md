# PODA DJ — Web Platform

Sito web ufficiale e showcase musicale per **PODA DJ** (Electronic Music & Pro Audio Systems).

## Tech Stack
- **Framework:** [Astro 5](https://astro.build/) (Static Site Generation & Islands Architecture)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) con palette personalizzata (`neonPurple`, `neonBlue`, glassmorphism)
- **i18n:** Supporto bilingue nativo (Italiano alla root `/` e Inglese su `/en/`)
- **Hosting / Deploy:** Ottimizzato per Vercel (`@astrojs/vercel`)
- **Assets Pipeline:** Pipeline automatizzata (`sharp`) per conversione immagini in WebP/AVIF responsive

## Script Disponibili

```bash
# Avvia il server di sviluppo locale
npm run dev

# Compila il sito per la produzione (SSG)
npm run build

# Anteprima locale della build di produzione
npm run preview

# Ottimizzazione e compressione immagini
npm run optimize-images
```

## Struttura del Progetto

```text
├── assets/                 # Asset sorgente ad alta risoluzione (fotocamera)
├── public/assets/          # Asset web-ottimizzati (WebP / JPG / PNG compressi)
├── src/
│   ├── components/         # Componenti riutilizzabili (Header, Footer, BentoCard, ecc.)
│   ├── content/            # Archivio dati strutturati (eventi, live-sets)
│   ├── i18n/               # Dizionari lingua (it.json, en.json) e helper di routing
│   ├── layouts/            # Layout di base con SEO e Open Graph
│   ├── pages/              # Routing pagine (Home, Formats, Events, Service)
│   └── styles/             # CSS globale e regole per effetti neon/glass
├── astro.config.mjs        # Configurazione Astro e i18n
└── tailwind.config.mjs     # Configurazione Tailwind
```
