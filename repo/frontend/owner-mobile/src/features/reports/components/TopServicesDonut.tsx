import { View } from "react-native";
import Svg, { Circle, G, Text as SvgText } from "react-native-svg";

import { colors } from "../../../theme/colors";
import { reportServiceColors } from "../data/reportsConfig";
import type { TopServiceReport } from "../models/reports";

interface TopServicesDonutProps {
  services: TopServiceReport[];
  size: number;
}

export function TopServicesDonut({ services, size }: TopServicesDonutProps) {
  const strokeWidth = Math.max(20, size * 0.19);
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  const segments = services.map((service, index) => {
    const consumed = services
      .slice(0, index)
      .reduce(
        (total, item) => total + (item.percentage / 100) * circumference,
        0,
      );
    return {
      length: (service.percentage / 100) * circumference,
      offset: -consumed,
      service,
    };
  });

  return (
    <View
      accessibilityLabel={services
        .map((service) => `${service.name} ${service.percentage} percent`)
        .join(", ")}
      accessibilityRole="image"
      style={{ height: size, width: size }}
    >
      <Svg height={size} width={size}>
        <G rotation="-90" origin={`${center}, ${center}`}>
          <Circle
            cx={center}
            cy={center}
            fill="none"
            r={radius}
            stroke={colors.border}
            strokeWidth={strokeWidth}
          />
          {segments.map(({ length, offset, service }) => {
            return (
              <Circle
                cx={center}
                cy={center}
                fill="none"
                key={service.id}
                r={radius}
                stroke={reportServiceColors[service.colorKey]}
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={offset}
                strokeWidth={strokeWidth}
              />
            );
          })}
        </G>
        <SvgText
          fill={colors.navy}
          fontSize={14}
          fontWeight="700"
          textAnchor="middle"
          x={center}
          y={center - 1}
        >
          100%
        </SvgText>
        <SvgText
          fill={colors.textSecondary}
          fontSize={9}
          textAnchor="middle"
          x={center}
          y={center + 14}
        >
          revenue mix
        </SvgText>
      </Svg>
    </View>
  );
}
