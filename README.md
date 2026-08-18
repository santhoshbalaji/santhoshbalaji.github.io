# Santhosh Balaji S — Portfolio

A responsive, accessible personal portfolio built as a lightweight static site.

Live site: [https://santhoshbalaji.cloud](https://santhoshbalaji.cloud)

## Run locally

```bash
npm run dev
```

Then open [http://localhost:4173](http://localhost:4173).

## Verify

```bash
npm test
```

The content lives in `index.html`. The centralized orbital design tokens live in `theme.css`, component styling lives in `styles.css`, and interaction state lives in `script.js`.

## Deployment

The site is published from the `main` branch of `santhoshbalaji/santhoshbalaji.github.io` using GitHub Pages. The root `CNAME` file connects the deployment to `santhoshbalaji.cloud`, and `.nojekyll` keeps the static assets unmodified.
