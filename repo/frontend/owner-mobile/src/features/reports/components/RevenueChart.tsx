import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg";

import { colors } from "../../../theme/colors";
import type { RevenuePoint } from "../models/reports";

interface RevenueChartProps {
  compact: boolean;
  points: RevenuePoint[];
}

const lineColor = "#1769E0";
const gridColor = "#EEF1F4";

export function RevenueChart({ compact, points }: RevenueChartProps) {
  const [width, setWidth] = useState(0);
  const height = compact ? 176 : 194;
  const plot = useMemo(() => {
    if (!width || points.length === 0) return null;

    const left = 32;
    const right = 8;
    const top = 12;
    const bottom = 28;
    const plotWidth = Math.max(width - left - right, 1);
    const plotHeight = height - top - bottom;
    const maxValue = Math.max(...points.map((point) => point.value), 1000);
    const axisMax = Math.ceil(maxValue / 1000) * 1000;
    const coordinates = points.map((point, index) => ({
      ...point,
      x: left + (index / Math.max(points.length - 1, 1)) * plotWidth,
      y: top + plotHeight - (point.value / axisMax) * plotHeight,
    }));
    const linePath = coordinates
      .map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`)
      .join(" ");
    const areaPath = `${linePath} L${coordinates.at(-1)?.x ?? left},${top + plotHeight} L${left},${top + plotHeight} Z`;
    const ticks = [0, 0.33, 0.66, 1].map((ratio) => ({
      label: ratio === 0 ? "₱0" : `₱${Math.round((axisMax * ratio) / 1000)}K`,
      y: top + plotHeight - ratio * plotHeight,
    }));

    return { areaPath, coordinates, linePath, ticks };
  }, [height, points, width]);

  return (
    <View
      accessibilityLabel="Net revenue by day for the selected reporting period."
      accessibilityRole="image"
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={[styles.container, { height }]}
    >
      {plot && width > 0 ? (
        <Svg height={height} width={width}>
          {plot.ticks.map((tick) => (
            <Line
              key={tick.label}
              stroke={gridColor}
              strokeWidth={1}
              x1={32}
              x2={width - 8}
              y1={tick.y}
              y2={tick.y}
            />
          ))}
          {plot.ticks.map((tick) => (
            <SvgText
              fill={colors.textSecondary}
              fontSize={8.5}
              key={`label-${tick.label}`}
              textAnchor="start"
              x={0}
              y={tick.y + 3}
            >
              {tick.label}
            </SvgText>
          ))}

          <Path d={plot.areaPath} fill={lineColor} fillOpacity={0.1} />
          <Path
            d={plot.linePath}
            fill="none"
            stroke={lineColor}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
          />
          {plot.coordinates.map((point) => (
            <Circle
              fill={lineColor}
              key={point.label}
              cx={point.x}
              cy={point.y}
              r={3}
            />
          ))}
          {plot.coordinates.map((point) => (
            <SvgText
              fill={colors.textSecondary}
              fontSize={9}
              key={`day-${point.label}`}
              textAnchor="middle"
              x={point.x}
              y={height - 7}
            >
              {point.label}
            </SvgText>
          ))}
        </Svg>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 7, width: "100%" },
});
