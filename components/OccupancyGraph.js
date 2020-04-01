import * as React from 'react';
import {
  Area,
  Graph,
  GraphDataProvider,
  HMarker,
  LinearGradient,
  Stop,
} from './graph';
import {DistancingGradient} from './DistancingGradient';
import {PercentileLine} from './PercentileLine';
import {WithComponentId} from './util';

const {useMemo} = React;

export const OccupancyGraph = ({
  children,
  data,
  scenario,
  x,
  y,
  cutoff = 0,
  cutoffLabel = '',
  xLabel = '',
  width = 600,
  height = 400,
  margin,
}) => {
  const scenarioData = data.scenarios[scenario].timeSeriesData;
  const allPoints = useMemo(
    () =>
      Object.values(data.scenarios).reduce(
        (a, v) => (v && v.timeSeriesData ? a.concat(v.timeSeriesData) : a),
        []
      ),
    [data]
  );
  const domain = useMemo(
    () =>
      Math.min(
        // Sometimes, excess data in the models rockets off into the distance.
        // This cap prevents the axis from being too distorted.
        cutoff * 20,
        Math.max(...allPoints.map((d) => Math.max(y(d).percentile50, cutoff)))
      ),
    [allPoints, y, cutoff]
  );

  return (
    <Graph
      data={scenarioData}
      domain={domain}
      height={height}
      width={width}
      x={x}
      xLabel={xLabel}
      controls
    >
      <DistancingGradient />
      <HMarker
        anchor="end"
        value={cutoff}
        stroke="#f00"
        label={cutoffLabel}
        labelStroke="#fff"
        labelStrokeWidth="5"
        strokeDasharray="4,2"
        strokeWidth={1.5}
        labelDx={-20}
        labelDy={-6}
      />
      <WithComponentId prefix="linearGradient">
        {(gradientId) => (
          <>
            <LinearGradient
              direction="up"
              id={gradientId}
              from="#0670de"
              to="#f00"
            >
              <Stop offset={cutoff} stopColor="#0670de" />
              <Stop offset={cutoff} stopColor="#f00" />
            </LinearGradient>
            <PercentileLine y={y} color={`url(#${gradientId})`} gradient />
          </>
        )}
      </WithComponentId>
      {children}
    </Graph>
  );
};
