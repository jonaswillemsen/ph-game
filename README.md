# Health Juxt

A daily *"which is higher?"* quiz about **UK public health figures**, inspired by
[Urban Stats](https://urbanstats.org/quiz.html)'s Juxtastat.

Each day you get five questions. Every question shows two UK local areas and a
public health statistic — life expectancy, obesity, smoking, and so on — and you
pick the area where the figure is **higher**. Get instant feedback, a score out
of five, and a shareable grid of 🟩/🟥 squares.

## Play

It's a static site — no build step, no server, no dependencies.

```bash
# from the project root
python3 -m http.server 8000
# then open http://localhost:8000
```

Or just open `index.html` directly in a browser.

## How it works

- **`data.js`** — the dataset: UK local authorities and their public health
  metrics, plus metadata describing each metric (label, units, and whether a
  higher value is the healthier one).
- **`game.js`** — quiz generation and gameplay. The day's quiz is generated from
  a seeded PRNG keyed on the UTC date, so everyone playing on the same day gets
  the same questions (just like Urban Stats). Results and your daily streak are
  stored in `localStorage`.
- **`index.html` / `styles.css`** — the interface.

## The data

The figures in `data.js` are **real values from the OHID Fingertips API**
([Office for Health Improvement & Disparities](https://fingertips.phe.org.uk/)),
for 20 English upper-tier / unitary local authorities (Fingertips area type
**502**, "Upper tier local authorities (post 4/23)"). For each indicator the
**latest published data period** is used, rounded to one decimal place. The
snapshot was fetched on **2026-06-23** (see `SOURCE` in `data.js`).

| Metric | Fingertips indicator | Period |
| --- | --- | ---: |
| Male / female life expectancy at birth | `90366` | 2025 |
| Adult obesity (Active Lives, self-reported) | `93881` | 2024/25 |
| Year 6 (age 10–11) obesity, incl. severe | `90323` | 2024/25 |
| Adult smoking (Annual Population Survey) | `92443` | 2024 |
| Physically active adults (150+ mins/week) | `93014` | 2024/25 |
| Under-75 mortality from cardiovascular disease | `40401` | 2025 |
| Recorded diabetes prevalence (QOF, 17+) | `241` | 2024/25 |

> Figures come straight from Fingertips but are **rounded for display** and
> cover a fixed snapshot, so treat them as indicative rather than the canonical
> live statistics. Always check [fingertips.phe.org.uk](https://fingertips.phe.org.uk/)
> for the authoritative, up-to-date numbers.

### Refreshing the data

`scripts/fetch-fingertips.mjs` re-fetches the figures from Fingertips and prints
a ready-to-paste `REGIONS` array (Node 18+, no dependencies):

```bash
node scripts/fetch-fingertips.mjs            # prints the REGIONS block to stdout
```

Coverage and the data period for each indicator are logged to stderr. Paste the
output over the `REGIONS` array in `data.js` and update `SOURCE.fetched` (and the
`period` fields in `METRICS` if they changed).

## Extending it

- Add areas by editing the `AREAS` list in `scripts/fetch-fingertips.mjs` (each
  needs its ONS area code) and re-running the script, or by hand in `data.js`.
- Add metrics by adding an entry to `METRICS` in both `data.js` and the script's
  `METRICS` map (with the Fingertips indicator id). The game picks up new
  entries automatically.
- Tune `QUESTIONS_PER_QUIZ` in `game.js` to change the quiz length.
