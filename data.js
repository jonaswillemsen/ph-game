// UK public health dataset
// ---------------------------------------------------------------------------
// A curated set of English upper-tier / unitary local authorities with a
// handful of well-known public health indicators. Values are APPROXIMATE and
// rounded, drawn from the kinds of figures published by OHID Fingertips, the
// ONS and NHS Digital (circa 2018-2022 baselines). They are intended to be
// realistic relative to one another for the purposes of a quiz, not to be
// cited as exact official statistics. See README.md for sources.
//
// Each metric carries a `higherIsBetter` flag so the game can explain, after
// you answer, whether the higher figure is the "healthier" one.

const METRICS = {
  lifeExpectancyMale: {
    label: "Male life expectancy",
    short: "male life expectancy",
    unit: " yrs",
    higherIsBetter: true,
    description: "Average years a newborn boy is expected to live.",
  },
  lifeExpectancyFemale: {
    label: "Female life expectancy",
    short: "female life expectancy",
    unit: " yrs",
    higherIsBetter: true,
    description: "Average years a newborn girl is expected to live.",
  },
  adultObesity: {
    label: "Adult obesity",
    short: "the percentage of adults living with obesity",
    unit: "%",
    higherIsBetter: false,
    description: "Percentage of adults (18+) classified as obese.",
  },
  childObesity: {
    label: "Year 6 child obesity",
    short: "the percentage of Year 6 children living with obesity",
    unit: "%",
    higherIsBetter: false,
    description: "Percentage of children aged 10-11 classified as obese.",
  },
  smoking: {
    label: "Adult smoking",
    short: "the percentage of adults who smoke",
    unit: "%",
    higherIsBetter: false,
    description: "Percentage of adults (18+) who currently smoke.",
  },
  physicalActivity: {
    label: "Physically active adults",
    short: "the percentage of physically active adults",
    unit: "%",
    higherIsBetter: true,
    description: "Percentage of adults meeting recommended activity levels.",
  },
  cvdMortality: {
    label: "Early CVD deaths",
    short: "the rate of early deaths from cardiovascular disease",
    unit: " /100k",
    higherIsBetter: false,
    description:
      "Under-75 mortality rate from cardiovascular disease, per 100,000.",
  },
  diabetes: {
    label: "Diabetes prevalence",
    short: "recorded diabetes prevalence",
    unit: "%",
    higherIsBetter: false,
    description: "Percentage of the population (17+) with recorded diabetes.",
  },
};

// region, latitude/longitude roughly centre the area on a map sketch.
const REGIONS = [
  {
    name: "Kensington and Chelsea",
    region: "London",
    stats: { lifeExpectancyMale: 84.7, lifeExpectancyFemale: 86.4, adultObesity: 14.1, childObesity: 22.0, smoking: 8.0, physicalActivity: 74.0, cvdMortality: 49.0, diabetes: 4.3 },
  },
  {
    name: "Westminster",
    region: "London",
    stats: { lifeExpectancyMale: 83.6, lifeExpectancyFemale: 86.5, adultObesity: 15.0, childObesity: 28.0, smoking: 11.0, physicalActivity: 71.0, cvdMortality: 58.0, diabetes: 5.0 },
  },
  {
    name: "Richmond upon Thames",
    region: "London",
    stats: { lifeExpectancyMale: 82.4, lifeExpectancyFemale: 85.9, adultObesity: 14.8, childObesity: 20.0, smoking: 9.5, physicalActivity: 75.0, cvdMortality: 56.0, diabetes: 4.4 },
  },
  {
    name: "Wokingham",
    region: "South East",
    stats: { lifeExpectancyMale: 81.6, lifeExpectancyFemale: 84.7, adultObesity: 20.0, childObesity: 26.0, smoking: 9.0, physicalActivity: 70.0, cvdMortality: 60.0, diabetes: 5.4 },
  },
  {
    name: "Surrey",
    region: "South East",
    stats: { lifeExpectancyMale: 81.4, lifeExpectancyFemale: 84.6, adultObesity: 19.0, childObesity: 27.0, smoking: 10.0, physicalActivity: 69.0, cvdMortality: 63.0, diabetes: 5.6 },
  },
  {
    name: "Bristol",
    region: "South West",
    stats: { lifeExpectancyMale: 78.6, lifeExpectancyFemale: 82.8, adultObesity: 24.0, childObesity: 33.0, smoking: 16.0, physicalActivity: 66.0, cvdMortality: 75.0, diabetes: 5.9 },
  },
  {
    name: "Cornwall",
    region: "South West",
    stats: { lifeExpectancyMale: 79.6, lifeExpectancyFemale: 83.2, adultObesity: 26.0, childObesity: 31.0, smoking: 14.0, physicalActivity: 65.0, cvdMortality: 72.0, diabetes: 7.2 },
  },
  {
    name: "Leeds",
    region: "Yorkshire and the Humber",
    stats: { lifeExpectancyMale: 78.2, lifeExpectancyFemale: 82.0, adultObesity: 26.0, childObesity: 35.0, smoking: 17.0, physicalActivity: 64.0, cvdMortality: 84.0, diabetes: 6.5 },
  },
  {
    name: "Sheffield",
    region: "Yorkshire and the Humber",
    stats: { lifeExpectancyMale: 78.4, lifeExpectancyFemale: 82.2, adultObesity: 25.0, childObesity: 34.0, smoking: 16.0, physicalActivity: 65.0, cvdMortality: 81.0, diabetes: 6.6 },
  },
  {
    name: "Kingston upon Hull",
    region: "Yorkshire and the Humber",
    stats: { lifeExpectancyMale: 76.4, lifeExpectancyFemale: 80.6, adultObesity: 31.0, childObesity: 39.0, smoking: 22.0, physicalActivity: 58.0, cvdMortality: 110.0, diabetes: 7.3 },
  },
  {
    name: "Birmingham",
    region: "West Midlands",
    stats: { lifeExpectancyMale: 77.5, lifeExpectancyFemale: 82.0, adultObesity: 28.0, childObesity: 41.0, smoking: 18.0, physicalActivity: 60.0, cvdMortality: 95.0, diabetes: 8.5 },
  },
  {
    name: "Manchester",
    region: "North West",
    stats: { lifeExpectancyMale: 76.5, lifeExpectancyFemale: 80.8, adultObesity: 27.0, childObesity: 40.0, smoking: 20.0, physicalActivity: 61.0, cvdMortality: 105.0, diabetes: 7.0 },
  },
  {
    name: "Liverpool",
    region: "North West",
    stats: { lifeExpectancyMale: 76.3, lifeExpectancyFemale: 80.7, adultObesity: 29.0, childObesity: 38.0, smoking: 21.0, physicalActivity: 60.0, cvdMortality: 108.0, diabetes: 7.1 },
  },
  {
    name: "Blackpool",
    region: "North West",
    stats: { lifeExpectancyMale: 74.4, lifeExpectancyFemale: 79.5, adultObesity: 32.0, childObesity: 36.0, smoking: 23.0, physicalActivity: 57.0, cvdMortality: 130.0, diabetes: 8.0 },
  },
  {
    name: "Newcastle upon Tyne",
    region: "North East",
    stats: { lifeExpectancyMale: 77.4, lifeExpectancyFemale: 81.3, adultObesity: 27.0, childObesity: 37.0, smoking: 18.0, physicalActivity: 63.0, cvdMortality: 92.0, diabetes: 6.4 },
  },
  {
    name: "Middlesbrough",
    region: "North East",
    stats: { lifeExpectancyMale: 75.6, lifeExpectancyFemale: 80.0, adultObesity: 31.0, childObesity: 40.0, smoking: 22.0, physicalActivity: 58.0, cvdMortality: 118.0, diabetes: 7.6 },
  },
  {
    name: "Hartlepool",
    region: "North East",
    stats: { lifeExpectancyMale: 75.9, lifeExpectancyFemale: 80.3, adultObesity: 33.0, childObesity: 38.0, smoking: 21.0, physicalActivity: 57.0, cvdMortality: 115.0, diabetes: 7.4 },
  },
  {
    name: "Nottingham",
    region: "East Midlands",
    stats: { lifeExpectancyMale: 76.8, lifeExpectancyFemale: 81.2, adultObesity: 28.0, childObesity: 38.0, smoking: 19.0, physicalActivity: 61.0, cvdMortality: 98.0, diabetes: 6.2 },
  },
  {
    name: "Tower Hamlets",
    region: "London",
    stats: { lifeExpectancyMale: 78.6, lifeExpectancyFemale: 83.0, adultObesity: 22.0, childObesity: 42.0, smoking: 19.0, physicalActivity: 62.0, cvdMortality: 90.0, diabetes: 7.8 },
  },
  {
    name: "South Tyneside",
    region: "North East",
    stats: { lifeExpectancyMale: 76.8, lifeExpectancyFemale: 80.9, adultObesity: 32.0, childObesity: 39.0, smoking: 19.0, physicalActivity: 59.0, cvdMortality: 112.0, diabetes: 7.5 },
  },
];

// Expose for both browser (global) and any module-style consumers.
if (typeof window !== "undefined") {
  window.PH_DATA = { METRICS, REGIONS };
}
