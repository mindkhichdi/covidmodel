import {useMemo} from 'react';
import useSWR from 'swr';
import {useModelState} from './useModelState';

export const createLocationQuery = (location, query) =>
  `{ location(id: "${location}") ${query} }`;

export const createScenarioQuery = (scenario, query) =>
  `{ scenario(id: "${scenario}") ${query} }`;

export function useLocations(query = '') {
  const {data, error} = useSWR(`{
      locations {
        id
        name
        ${query}
      }
    }`);
  return [data?.locations || [], error];
}

export function useLocationQuery(query, fragments = []) {
  const {location} = useModelState();
  const {data, error} = useSWR(
    Array.from(
      new Set([...fragments, createLocationQuery(location.id, query)])
    ).join('\n')
  );
  return [data?.location, error];
}

export function useScenarioQuery(query, fragments = []) {
  const {scenario} = useModelState();
  const [data, error] = useLocationQuery(
    createScenarioQuery(scenario.id, query),
    fragments
  );
  return [data?.scenario, error];
}

export const compactDistributionProps = [
  'expected',
  'confirmed',
  'percentile10',
  'percentile50',
  'percentile90',
];

export const fullDistributionProps = [
  ...compactDistributionProps,
  'percentile20',
  'percentile30',
  'percentile40',
  'percentile60',
  'percentile70',
  'percentile80',
];

export function createSeries(series) {
  if (!series) {
    return () => null;
  }
  const result = (i) => series.data[i];
  Object.assign(result, series);
  return result;
}

export function createDistributionSeries(distribution) {
  const result = {};
  fullDistributionProps.forEach((propName) => {
    result[propName] = createSeries(distribution && distribution[propName]);
  });
  return result;
}

export const SeriesFullFragment = [
  `fragment SeriesFull on Series {
    data
    empty
    max
    min
  }`,
];

export function mapBlock(propNames, block) {
  return propNames
    .map(
      (propName) => `${propName} {
        ${block}
      }`
    )
    .join('\n');
}

export const DistributionSeriesFullFragment = [
  ...SeriesFullFragment,
  `fragment DistributionSeriesFull on DistributionSeries {
    ${mapBlock(fullDistributionProps, '...SeriesFull')}
  }`,
];

export const PopulationFragment = [
  `fragment Population on Location {
    population
  }`,
];

export function usePopulation() {
  const [data, error] = useLocationQuery(`{ population }`);
  return [data?.population, error];
}

export function useDistancing() {
  const [scenario, error] = useScenarioQuery(`{
    distancing {
      data
    }
  }`);

  return [createSeries(scenario?.distancing), error];
}
