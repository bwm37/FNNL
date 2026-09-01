# FNNL

A local, dependency-free web application for creating smooth multi-variable funnel charts like the provided screenshot.

## Run locally

1. Unzip the folder.
2. Open `index.html` in a modern browser such as Chrome, Edge, Safari, or Firefox.

No install step is required. The app is plain HTML, CSS, and JavaScript.

If your browser blocks local file features, run a tiny local server from this folder instead:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Features

- Choose 2 to 10 funnel stages.
- Label every stage.
- Add an optional graph title that appears in the live preview and exported PNG.
- Define 1 to 10 variables/entities.
- Add or remove variable rows, then enter values in a matrix where rows are variables and columns are stages.
- Midnight mode modeled after the screenshot, plus a white mode.
- Toggle a generated date/time stamp on or off in the bottom-right corner of the chart.
- Live SVG chart preview.
- Export PNG at 1280x720, 2560x1440, or 3840x2160.
- Import, copy, and download CSV data.
- Automatically remembers your last chart in browser local storage.

## CSV format

Use this format:

```csv
Variable,Color,Impressions,Add To Cart,Buy
Direct,#ff4ea3,3500,2500,650
Social Media,#b38cff,2500,1200,120
Ads,#84eff8,6500,2000,160
```

The `Color` column is optional. The app accepts up to 10 stage columns and up to 10 variable rows.
