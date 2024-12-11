import { type PlayerDetails, type PlayerStatistics, type StatDetail } from "~/types/players";
import { TYPE_IDS } from "~/types/players";

// Configuration flag to enable/disable mocking
export const ENABLE_MOCKS = process.env.NEXT_PUBLIC_ENABLE_MOCKS ? process.env.NEXT_PUBLIC_ENABLE_MOCKS === "true" : true;

// Mock player data
const MOCK_PLAYERS: PlayerDetails["data"][] = [
  {
    id: 1,
    sport_id: 1,
    country_id: 1,
    nationality_id: 1,
    city_id: 1,
    position_id: 1,
    detailed_position_id: 1,
    type_id: 1,
    common_name: "Messi",
    firstname: "Lionel",
    lastname: "Messi",
    name: "Lionel Messi",
    display_name: "L. Messi",
    image_path: "https://cdn.sportmonks.com/images/soccer/players/1.png",
    height: 170,
    weight: 72,
    date_of_birth: "1987-06-24",
    gender: "male",
  },
  {
    id: 2,
    sport_id: 1,
    country_id: 2,
    nationality_id: 2,
    city_id: 2,
    position_id: 2,
    detailed_position_id: 2,
    type_id: 1,
    common_name: "Ronaldo",
    firstname: "Cristiano",
    lastname: "Ronaldo",
    name: "Cristiano Ronaldo",
    display_name: "C. Ronaldo",
    image_path: "https://cdn.sportmonks.com/images/soccer/players/2.png",
    height: 187,
    weight: 83,
    date_of_birth: "1985-02-05",
    gender: "male",
  },
];

// Mock statistics data
const createMockStats = (playerId: number): StatDetail[] => [
  { id: 1, player_statistic_id: playerId, type_id: TYPE_IDS.GOALS, value: { total: Math.floor(Math.random() * 30) } },
  { id: 2, player_statistic_id: playerId, type_id: TYPE_IDS.ASSISTS, value: { total: Math.floor(Math.random() * 20) } },
  { id: 3, player_statistic_id: playerId, type_id: TYPE_IDS.APPEARANCES, value: { total: Math.floor(Math.random() * 38) } },
  { id: 4, player_statistic_id: playerId, type_id: TYPE_IDS.MINUTES_PLAYED, value: { total: Math.floor(Math.random() * 3000) } },
  { id: 5, player_statistic_id: playerId, type_id: TYPE_IDS.RATING, value: { total: Number((Math.random() * 2 + 7).toFixed(2)) } },
];

const MOCK_STATISTICS: Record<number, PlayerStatistics["data"]> = {
  1: [{
    id: 1,
    player_id: 1,
    team_id: 1,
    season_id: 1,
    has_values: true,
    position_id: 1,
    jersey_number: 10,
    details: createMockStats(1),
  }],
  2: [{
    id: 2,
    player_id: 2,
    team_id: 2,
    season_id: 1,
    has_values: true,
    position_id: 2,
    jersey_number: 7,
    details: createMockStats(2),
  }],
};

// Add type definitions for tool responses
type HistoricalStatsResponse = {
  playerInfo: {
    name: string;
    commonName: string;
    dateOfBirth: string;
    nationality_id: number;
    position_id: number;
    detailed_position_id: number;
    height: number;
    weight: number;
    imagePath: string;
  };
  totalSeasons: number;
  historicalStats: Record<number, Record<string, number>>;
  typeIds: typeof TYPE_IDS;
} | {
  error: string;
};

// Mock tool responses
export const mockToolResponses = {
  searchPlayer: (name: string) => {
    const player = MOCK_PLAYERS.find(p => 
      p.display_name.toLowerCase().includes(name.toLowerCase()) ||
      p.name.toLowerCase().includes(name.toLowerCase())
    );
    
    if (!player) {
      return "No players found with that name. Please try with a different name or spelling.";
    }

    return [{
      id: player.id,
      name: player.display_name,
      team: "Mock Team FC",
      position: player.position_id,
    }];
  },

  analyzeHistoricalStats: (playerId: number): HistoricalStatsResponse => {
    const player = MOCK_PLAYERS.find(p => p.id === playerId);
    const stats = MOCK_STATISTICS[playerId];

    if (!player || !stats?.[0]) {
      return {
        error: "No statistics available for this player.",
      };
    }

    // Create mock historical stats by slightly varying current season stats
    const historicalStats: Record<number, Record<string, number>> = {};
    stats[0].details.forEach(stat => {
      if (!historicalStats[stat.type_id]) {
        historicalStats[stat.type_id] = {};
      }

      const baseValue = (stat.value as { total?: number }).total ?? 0;
      historicalStats[stat.type_id] = {
        total: Number((baseValue * 3.5).toFixed(2)),
      };
    });

    return {
      playerInfo: {
        name: player.display_name,
        commonName: player.common_name,
        dateOfBirth: player.date_of_birth,
        nationality_id: player.nationality_id,
        position_id: player.position_id,
        detailed_position_id: player.detailed_position_id,
        height: player.height,
        weight: player.weight,
        imagePath: player.image_path,
      },
      totalSeasons: 4,
      historicalStats,
      typeIds: TYPE_IDS,
    };
  },

  analyzePlayer: (playerId: number) => {
    const player = MOCK_PLAYERS.find(p => p.id === playerId);
    const stats = MOCK_STATISTICS[playerId];

    if (!player || !stats?.[0]) {
      return {
        error: "No statistics available for this player.",
      };
    }

    return {
      playerInfo: {
        name: player.display_name,
        commonName: player.common_name,
        dateOfBirth: player.date_of_birth,
        nationality_id: player.nationality_id,
        position_id: player.position_id,
        detailed_position_id: player.detailed_position_id,
        height: player.height,
        weight: player.weight,
        imagePath: player.image_path,
      },
      currentSeason: {
        season_id: 1,
        statistics: stats[0].details.reduce((acc, stat) => {
          const total = (stat.value as { total?: number }).total;
          if (total !== undefined) {
            acc[stat.type_id] = { total };
          }
          return acc;
        }, {} as Record<number, Record<string, number>>),
      },
      previousSeason: null,
      typeIds: TYPE_IDS,
    };
  },

  compareStats: ({ playerIds, chartType }: { playerIds: number[]; chartType: "radar" | "bar" }) => {
    const players = playerIds.map(id => ({
      details: MOCK_PLAYERS.find(p => p.id === id)!,
      stats: MOCK_STATISTICS[id]?.[0],
    })).filter((p): p is { details: PlayerDetails["data"]; stats: NonNullable<typeof p.stats> } => 
      p.details !== undefined && p.stats !== undefined
    );

    if (players.length === 0) {
      return "Error comparing players: No valid players found for comparison.";
    }

    const statCategories = [TYPE_IDS.GOALS, TYPE_IDS.ASSISTS, TYPE_IDS.APPEARANCES, TYPE_IDS.RATING];
    const chartData = statCategories.map(typeId => {
      const dataPoint: { label: string; [key: string]: string | number } = {
        label: Object.entries(TYPE_IDS).find(([_, id]) => id === typeId)?.[0]?.toLowerCase() ?? String(typeId),
      };

      players.forEach(player => {
        const statValue = player.stats.details.find(d => d.type_id === typeId);
        const total = (statValue?.value as { total?: number })?.total;
        dataPoint[player.details.display_name] = total ?? 0;
      });

      return dataPoint;
    });

    return {
      chartData: {
        title: "Player Statistics Comparison",
        description: "Comparing current season statistics",
        data: chartData,
        players: players.map(p => p.details.display_name),
        chartType,
      },
    };
  },
}; 