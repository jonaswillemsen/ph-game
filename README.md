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

The figures cover indicators such as:

- Male & female life expectancy at birth
- Adult and Year 6 (age 10–11) obesity prevalence
- Adult smoking prevalence
- Physically active adults
- Under-75 mortality from cardiovascular disease
- Recorded diabetes prevalence

> **Caveat:** the values in `data.js` are **approximate and rounded**, chosen to
> be realistic *relative to one another* for a fun, educational quiz. They are
> based on the kinds of figures published by sources like:
>
> - [OHID Fingertips](https://fingertips.phe.org.uk/) (Office for Health
>   Improvement & Disparities)
> - [ONS](https://www.ons.gov.uk/) life expectancy data
> - [NHS Digital](https://digital.nhs.uk/) / QOF prevalence data
>
> They should **not** be cited as exact official statistics. To use live,
> authoritative data, swap the `REGIONS` array in `data.js` for figures pulled
> from the OHID Fingertips API.

## Extending it

- Add areas or metrics by editing the `REGIONS` and `METRICS` objects in
  `data.js`. The game picks up new entries automatically.
- Tune `QUESTIONS_PER_QUIZ` in `game.js` to change the quiz length.
