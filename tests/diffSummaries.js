const csv = require('csvtojson');
const path = require('path');
const fs = require('fs');
const fetch = require('isomorphic-unfetch');
const {format} = require('d3-format');

const formatNumber2 = format(',.4f');
const formatPercent2 = format(',.4%');

const readCsv = async (filename) => {
  const csvPath = path.join(process.cwd(), `tests/${filename}.csv`);
  try {
    const data = await csv().fromFile(csvPath);
    return data;
  } catch (e) {
    console.error(e);
  }
};

const groupSummary = (summary) =>
  summary.reduce((acc, c) => ({...acc, [`${c.state}#${c.id}`]: c}), {});

const runCheck = (current, previous, metric) => {
  return (current[metric] - previous[metric]) / previous[metric];
};

const COMMENT_API_PATH = `https://api.github.com/repos/modelingcovid/covidmodel/commits/${process.env.GITHUB_SHA}/comments`;

const main = async () => {
  const summaryPath = path.join(process.cwd(), `tests/augustSummary`);
  // get the list of the most recent august runs
  const summaries = fs
    .readdirSync(summaryPath)
    .map((fname) => fname.split('.csv')[0]);

  // pick the most recent 2 days
  const mostRecentSummaries = summaries
    .sort((a, b) => (a > b ? -1 : 1))
    .slice(0, 2);

  // parse the csv files to json
  const [current, previous] = await Promise.all(
    mostRecentSummaries.map(async (day) => readCsv(`augustSummary/${day}`))
  );

  // compute the diffs of key metrics
  // start with each state / scenario combo in the current summary
  const [currentGrouped, previousGrouped] = [current, previous].map(
    groupSummary
  );

  const metricsToCompare = [
    'totalInfectedFraction',
    'fatalityRate',
    'fatalityRateSymptomatic',
    'fatalityRatePCR',
    'fractionOfSymptomaticHospitalized',
    'fractionOfSymptomaticHospitalizedOrICU',
    'fractionOfPCRHospitalized',
    'fractionOfPCRHospitalizedOrICU',
    'fractionHospitalizedInICU',
    'fractionOfDeathInICU',
    'fractionDeathOfHospitalizedOrICU',
    'fractionOfInfectionsPCRConfirmed',
    'fractionOfDeathsReported',
    'fractionOfHospitalizationsReported'
  ];

  const metricDifferences = Object.keys(currentGrouped).reduce(
    (acc, id) => ({
      ...acc,
      ...metricsToCompare.reduce(
        (accmetrics, m) => ({
          ...accmetrics,
          [`${id}#${m}`]: runCheck(currentGrouped[id], previousGrouped[id], m),
        }),
        {}
      ),
    }),
    {}
  );

  // output combos / metrics with higher differences
  const differencesAboveThreshold = Object.keys(metricDifferences)
    .filter((k) => Math.abs(metricDifferences[k]) > 0.05)
    .map((key) => {
      const [state, scenario, metric] = key.split('#');
      return {
        state,
        scenario,
        metric,
        current: currentGrouped[`${state}#${scenario}`][metric],
        previous: previousGrouped[`${state}#${scenario}`][metric],
        difference:
          currentGrouped[`${state}#${scenario}`][metric] -
          previousGrouped[`${state}#${scenario}`][metric],
        differencePercentage:
          (currentGrouped[`${state}#${scenario}`][metric] -
            previousGrouped[`${state}#${scenario}`][metric]) /
          previousGrouped[`${state}#${scenario}`][metric],
      };
    });

  try {
    const resp = await fetch(COMMENT_API_PATH, {
      method: 'POST',
      body: JSON.stringify({
        body: `Differences in summary metrics of greater than 5% detected between runs on August 1st:\n| State | Scenario | Metric | Current | Previous | Difference | Difference Percentage |\n| --- | --- | --- | --- | --- | --- | --- | \n${differencesAboveThreshold
          .map(
            (diff) =>
              `|${diff.state}|${diff.scenario}|${diff.metric}|${formatPercent2(
                diff.current
              )}|${formatPercent2(diff.previous)}|${formatPercent2(
                diff.difference
              )}|${formatPercent2(diff.differencePercentage)}|`
          )
          .join('\n')}`,
      }),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      },
    });
    const json = await resp.json();
    console.log('response', JSON.stringify(json));
  } catch (e) {
    console.log('failed to comment results in PR');
    console.log('error was', e.toString());
  }

  console.log('differencesAboveThreshold', differencesAboveThreshold);
};

main();
