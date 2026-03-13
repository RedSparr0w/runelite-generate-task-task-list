# RuneLite Task Grid Viewer

This repository contains task tier JSON files and a simple web page to visualize them in a spiraling grid.  
Each tier (easy, medium, hard, ...) is loaded locally and displayed with easy tasks in the centre.

## Usage

1. Start a simple HTTP server in the repository root so that `fetch` can load the JSON files.  
   For example:
   ```sh
   # with Python 3
   python -m http.server 8000

   # or with Node (if you have http-server installed)
   npx http-server -c-1 .
   ```
2. Open `http://localhost:8000/index.html` in your browser.

The grid will automatically generate a square sized to fit all tasks, placing tasks in a spiral order so that easy tasks are near the middle and harder ones appear further out.

## Files

* `tiers/*.json` – the existing data files.
* `index.html` – the web page entry point.
* `grid.js` – JavaScript that loads the tiers and constructs the grid.
* `style.css` – simple styling for the grid and tier colours.

## Notes

- The order is "semi-random": tasks are shuffled within their own tier and then placed on the spiral according to a **tier weight** (easy high, master low).  This means easy tasks are heavily biased toward the centre while harder tasks appear further out, but there’s still randomness to the layout.
- Clicking a cell will open the associated wiki link in a new tab.
