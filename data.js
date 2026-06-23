// UK public health dataset — real OHID Fingertips data
// ---------------------------------------------------------------------------
// A set of English upper-tier / unitary local authorities with a handful of
// well-known public health indicators. Unlike earlier drafts, the figures
// below are REAL values pulled from the OHID Fingertips API (the latest period
// published for each indicator at the time of the snapshot — see SOURCE below),
// for area type 502 "Upper tier local authorities (post 4/23)". Values are
// rounded to one decimal place for display.
//
// Each metric carries a `higherIsBetter` flag so the game can explain, after
// you answer, whether the higher figure is the "healthier" one, plus the
// Fingertips indicator id and the data period the values come from.
//
// To refresh the data, re-run scripts/fetch-fingertips.mjs (see README).

// Provenance for the snapshot baked into REGIONS below.
const SOURCE = {
  provider: "OHID Fingertips",
  api: "https://fingertips.phe.org.uk/api/",
  areaType: { id: 502, name: "Upper tier local authorities (post 4/23)" },
  fetched: "2026-06-23",
};

const METRICS = {
  lifeExpectancyMale: {
    label: "Male life expectancy",
    short: "male life expectancy",
    unit: " yrs",
    higherIsBetter: true,
    description: "Average years a newborn boy is expected to live.",
    indicatorId: 90366,
    period: "2025",
  },
  lifeExpectancyFemale: {
    label: "Female life expectancy",
    short: "female life expectancy",
    unit: " yrs",
    higherIsBetter: true,
    description: "Average years a newborn girl is expected to live.",
    indicatorId: 90366,
    period: "2025",
  },
  adultObesity: {
    label: "Adult obesity",
    short: "the percentage of adults living with obesity",
    unit: "%",
    higherIsBetter: false,
    description:
      "Percentage of adults (18+) classified as obese (Active Lives, " +
      "adjusted self-reported height and weight).",
    indicatorId: 93881,
    period: "2024/25",
  },
  childObesity: {
    label: "Year 6 child obesity",
    short: "the percentage of Year 6 children living with obesity",
    unit: "%",
    higherIsBetter: false,
    description:
      "Percentage of children aged 10-11 (Year 6) with obesity, including " +
      "severe obesity (National Child Measurement Programme).",
    indicatorId: 90323,
    period: "2024/25",
  },
  smoking: {
    label: "Adult smoking",
    short: "the percentage of adults who smoke",
    unit: "%",
    higherIsBetter: false,
    description:
      "Percentage of adults (18+) who currently smoke (Annual Population " +
      "Survey).",
    indicatorId: 92443,
    period: "2024",
  },
  physicalActivity: {
    label: "Physically active adults",
    short: "the percentage of physically active adults",
    unit: "%",
    higherIsBetter: true,
    description:
      "Percentage of adults (19+) meeting recommended activity levels " +
      "(150+ minutes a week).",
    indicatorId: 93014,
    period: "2024/25",
  },
  cvdMortality: {
    label: "Early CVD deaths",
    short: "the rate of early deaths from cardiovascular disease",
    unit: " /100k",
    higherIsBetter: false,
    description:
      "Under-75 mortality rate from cardiovascular disease, per 100,000.",
    indicatorId: 40401,
    period: "2025",
  },
  diabetes: {
    label: "Diabetes prevalence",
    short: "recorded diabetes prevalence",
    unit: "%",
    higherIsBetter: false,
    description:
      "Percentage of the population (17+) with recorded diabetes (QOF).",
    indicatorId: 241,
    period: "2024/25",
  },
};

// `code` is the ONS area code, used to trace each row back to Fingertips.
const REGIONS = [
  {
    name: "Kensington and Chelsea",
    region: "London",
    code: "E09000020",
    stats: { lifeExpectancyMale: 84.6, lifeExpectancyFemale: 87.0, adultObesity: 12.2, childObesity: 18.0, smoking: 8.4, physicalActivity: 68.3, cvdMortality: 41.9, diabetes: 4.5 },
  },
  {
    name: "Westminster",
    region: "London",
    code: "E09000033",
    stats: { lifeExpectancyMale: 83.2, lifeExpectancyFemale: 86.3, adultObesity: 20.3, childObesity: 24.2, smoking: 14.1, physicalActivity: 68.3, cvdMortality: 44.2, diabetes: 4.2 },
  },
  {
    name: "Richmond upon Thames",
    region: "London",
    code: "E09000027",
    stats: { lifeExpectancyMale: 83.6, lifeExpectancyFemale: 87.2, adultObesity: 10.5, childObesity: 12.1, smoking: 9.3, physicalActivity: 77.8, cvdMortality: 48.8, diabetes: 4.6 },
  },
  {
    name: "Wokingham",
    region: "South East",
    code: "E06000041",
    stats: { lifeExpectancyMale: 82.7, lifeExpectancyFemale: 87.3, adultObesity: 18.5, childObesity: 16.6, smoking: 7.1, physicalActivity: 75.3, cvdMortality: 48.7, diabetes: 6.5 },
  },
  {
    name: "Surrey",
    region: "South East",
    code: "E10000030",
    stats: { lifeExpectancyMale: 82.5, lifeExpectancyFemale: 85.8, adultObesity: 19.6, childObesity: 14.6, smoking: 7.4, physicalActivity: 74.8, cvdMortality: 46.6, diabetes: 6.3 },
  },
  {
    name: "Bristol",
    region: "South West",
    code: "E06000023",
    stats: { lifeExpectancyMale: 79.1, lifeExpectancyFemale: 83.4, adultObesity: 19.2, childObesity: 20.8, smoking: 12.6, physicalActivity: 76.3, cvdMortality: 76.1, diabetes: 6.0 },
  },
  {
    name: "Cornwall",
    region: "South West",
    code: "E06000052",
    stats: { lifeExpectancyMale: 80.1, lifeExpectancyFemale: 83.8, adultObesity: 27.7, childObesity: 18.6, smoking: 11.5, physicalActivity: 74.4, cvdMortality: 67.8, diabetes: 7.6 },
  },
  {
    name: "Leeds",
    region: "Yorkshire and the Humber",
    code: "E08000035",
    stats: { lifeExpectancyMale: 79.1, lifeExpectancyFemale: 83.0, adultObesity: 26.6, childObesity: 22.8, smoking: 12.8, physicalActivity: 70.4, cvdMortality: 79.9, diabetes: 7.1 },
  },
  {
    name: "Sheffield",
    region: "Yorkshire and the Humber",
    code: "E08000019",
    stats: { lifeExpectancyMale: 79.2, lifeExpectancyFemale: 82.8, adultObesity: 27.6, childObesity: 24.1, smoking: 11.5, physicalActivity: 69.8, cvdMortality: 86.0, diabetes: 7.1 },
  },
  {
    name: "Kingston upon Hull",
    region: "Yorkshire and the Humber",
    code: "E06000010",
    stats: { lifeExpectancyMale: 75.7, lifeExpectancyFemale: 80.9, adultObesity: 34.2, childObesity: 27.8, smoking: 18.4, physicalActivity: 60.0, cvdMortality: 127.5, diabetes: 9.1 },
  },
  {
    name: "Birmingham",
    region: "West Midlands",
    code: "E08000025",
    stats: { lifeExpectancyMale: 77.1, lifeExpectancyFemale: 82.5, adultObesity: 27.9, childObesity: 27.0, smoking: 12.2, physicalActivity: 63.3, cvdMortality: 94.3, diabetes: 9.5 },
  },
  {
    name: "Manchester",
    region: "North West",
    code: "E08000003",
    stats: { lifeExpectancyMale: 77.2, lifeExpectancyFemale: 81.1, adultObesity: 27.0, childObesity: 26.9, smoking: 15.6, physicalActivity: 69.0, cvdMortality: 118.3, diabetes: 6.7 },
  },
  {
    name: "Liverpool",
    region: "North West",
    code: "E08000012",
    stats: { lifeExpectancyMale: 77.5, lifeExpectancyFemale: 81.1, adultObesity: 31.7, childObesity: 27.8, smoking: 11.9, physicalActivity: 65.9, cvdMortality: 87.7, diabetes: 7.0 },
  },
  {
    name: "Blackpool",
    region: "North West",
    code: "E06000009",
    stats: { lifeExpectancyMale: 75.3, lifeExpectancyFemale: 79.9, adultObesity: 32.2, childObesity: 28.3, smoking: 20.8, physicalActivity: 58.5, cvdMortality: 126.3, diabetes: 9.6 },
  },
  {
    name: "Newcastle upon Tyne",
    region: "North East",
    code: "E08000021",
    stats: { lifeExpectancyMale: 78.3, lifeExpectancyFemale: 82.4, adultObesity: 27.7, childObesity: 24.5, smoking: 10.4, physicalActivity: 69.4, cvdMortality: 97.1, diabetes: 7.0 },
  },
  {
    name: "Middlesbrough",
    region: "North East",
    code: "E06000002",
    stats: { lifeExpectancyMale: 76.9, lifeExpectancyFemale: 81.6, adultObesity: 34.2, childObesity: 25.9, smoking: 14.1, physicalActivity: 54.9, cvdMortality: 99.3, diabetes: 9.1 },
  },
  {
    name: "Hartlepool",
    region: "North East",
    code: "E06000001",
    stats: { lifeExpectancyMale: 77.8, lifeExpectancyFemale: 81.1, adultObesity: 35.8, childObesity: 25.7, smoking: 14.8, physicalActivity: 61.3, cvdMortality: 78.0, diabetes: 9.0 },
  },
  {
    name: "Nottingham",
    region: "East Midlands",
    code: "E06000018",
    stats: { lifeExpectancyMale: 77.4, lifeExpectancyFemale: 81.4, adultObesity: 35.3, childObesity: 27.1, smoking: 13.1, physicalActivity: 65.4, cvdMortality: 99.7, diabetes: 6.6 },
  },
  {
    name: "Tower Hamlets",
    region: "London",
    code: "E09000030",
    stats: { lifeExpectancyMale: 79.6, lifeExpectancyFemale: 83.4, adultObesity: 16.6, childObesity: 28.4, smoking: 14.2, physicalActivity: 69.1, cvdMortality: 78.4, diabetes: 7.2 },
  },
  {
    name: "South Tyneside",
    region: "North East",
    code: "E08000023",
    stats: { lifeExpectancyMale: 77.5, lifeExpectancyFemale: 82.0, adultObesity: 37.8, childObesity: 27.3, smoking: 14.9, physicalActivity: 65.4, cvdMortality: 96.5, diabetes: 9.2 },
  },
];

// Expose for both browser (global) and any module-style consumers.
if (typeof window !== "undefined") {
  window.PH_DATA = { METRICS, REGIONS, SOURCE };
}
