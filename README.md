<p align="center">
  <img src="./assets/logo.png" alt="smartdict" width="360">
</p>

# smartdict-js

`smartdict-js` is the JavaScript port of `smartdict` 0.5.1.

It resolves `${...}` references inside nested objects and arrays while preserving
typed defaults, nested fallback chains, and lightweight pipelines.

## Install

```bash
npm install smartdict-js
```

## Usage

```js
import { parse } from "smartdict-js";

const parsed = parse({
  dataset: "Spotify Search",
  saveDir: "${dataset|lower|slug}",
  port: "${env.PORT:8000|int}",
  metadata: '${details:{"owner": "jyonn"}}'
});

console.log(parsed);
```

## Features

- `${path.to.value}` references
- native-value preservation for single references
- nested references such as `${${keys.${env}}}`
- JSON defaults such as `${missing:[1, 2, 3]}`
- nested fallbacks such as `${primary:${secondary:null}}`
- pipelines: `int`, `float`, `bool`, `json`, `lower`, `upper`, `strip`, `slug`
- strict parse, partial parse, and iterative parse
- structured errors for missing references, cycles, and pipeline failures

## Browser Build

Run:

```bash
npm run build
```

This produces `dist/smartdict.browser.js`, which exposes `window.smartdict`.
