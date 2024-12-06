import React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "~/components/ui/chart";

interface PlayerStat {
  label: string;
  [key: string]: string | number;
}

interface PlayerComparisonProps {
  title: string;
  description: string;
  data: PlayerStat[];
  players: string[];
  chartType: "radar" | "bar";
}

export function PlayerComparison({
  title,
  description,
  data,
  players,
  chartType,
}: PlayerComparisonProps) {
  const chartConfig = players.reduce((acc, player) => {
    acc[player] = {
      label: player,
      color: `hsl(var(--chart-${Object.keys(acc).length + 1}))`,
    };
    return acc;
  }, {} as ChartConfig);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          {chartType === "radar" ? (
            <RadarChart data={data}>
              <PolarGrid />
              <PolarAngleAxis dataKey="label" />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="line" />}
              />
              {players.map((player) => (
                <Radar
                  key={player}
                  dataKey={player}
                  fill={`var(--color-${player})`}
                  fillOpacity={0.6}
                />
              ))}
            </RadarChart>
          ) : (
            <BarChart data={data}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="dashed" />}
              />
              {players.map((player) => (
                <Bar
                  key={player}
                  dataKey={player}
                  fill={`var(--color-${player})`}
                  radius={4}
                />
              ))}
            </BarChart>
          )}
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
