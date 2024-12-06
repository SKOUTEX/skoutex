/* eslint-disable @typescript-eslint/ban-ts-comment */
import { type Message, convertToCoreMessages, streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { type PlayerDetails, type PlayerStatistics, type Season, type StatDetail, TYPE_IDS } from "~/types/players";
import { ENABLE_MOCKS, mockToolResponses } from "~/config/mocks";

const SPORTMONK_API_KEY = process.env.SPORTMONK_API_KEY!;
const BASE_URL = "https://api.sportmonks.com/v3/football";

function findStatValue(
  details: StatDetail[],
  typeId: number,
): Record<string, number | undefined> {
  const stat = details.find((detail) => detail.type_id === typeId);
  if (!stat) return {};

  if (typeof stat.value === "object" && stat.value !== null) {
    // Return all properties found in the value object
    return Object.entries(stat.value).reduce((acc, [key, value]) => {
      if (typeof value === "number") {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, number>);
  }
  
  // If value is a number, store it as 'total'
  if (typeof stat.value === "number") {
    return { total: stat.value };
  }

  return {};
}

function mapAllTypeIds(stats: StatDetail[]): Record<number, Record<string, number | undefined>> {
  const result: Record<number, Record<string, number | undefined>> = {};
  
  stats.forEach(stat => {
    result[stat.type_id] = findStatValue([stat], stat.type_id);
  });

  return result;
}

function aggregateHistoricalStats(seasons: Array<{ details: StatDetail[] }>): Record<number, Record<string, number>> {
  const aggregatedStats: Record<number, Record<string, number>> = {};

  // First, group all stats by type_id
  seasons.forEach(season => {
    season.details.forEach(stat => {
      if (!aggregatedStats[stat.type_id]) {
        aggregatedStats[stat.type_id] = {};
      }

      const statValues = findStatValue([stat], stat.type_id);
      
      // Aggregate each property
      Object.entries(statValues).forEach(([key, value]) => {
        if (value !== undefined) {
          // @ts-expect-error
          if (!aggregatedStats[stat.type_id][key]) {
              // @ts-expect-error
            aggregatedStats[stat.type_id][key] = 0;
          }
          // @ts-expect-error
          aggregatedStats[stat.type_id][key] += value;
        }
      });
    });
  });

  // Calculate averages for specific stats that should be averaged instead of summed
  const averageStats = [TYPE_IDS.RATING]; // Add more type IDs that should be averaged
  averageStats.forEach(typeId => {
    if (aggregatedStats[typeId]) {
      Object.keys(aggregatedStats[typeId]).forEach(key => {
        // @ts-expect-error
        aggregatedStats[typeId][key] = Number((aggregatedStats[typeId][key] / seasons.length).toFixed(2));
      });
    }
  });

  return aggregatedStats;
}

async function fetchFromSportsmonk<T>(endpoint: string): Promise<T> {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      headers: {
        Authorization: `${SPORTMONK_API_KEY}`,
      },
    });

    if (!response.ok) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `API request failed: ${response.status} ${response.statusText}. ${
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          errorData.message ?? ""
        }`,
      );
    }

    return response.json() as Promise<T>;
  } catch (error) {
    console.error(`Error fetching from Sportmonk: ${endpoint}`, error);
    throw error;
  }
}

export async function POST(req: Request) {
  const { messages } = (await req.json()) as { messages: Message[] };

  const result = await streamText({
    model: openai("gpt-4o-mini"),
    system: `You are a football analysis assistant specializing in detailed player analysis. 
    When analyzing players, structure your response focusing on the current season data, and include comparison with the previous season when available.
    Structure your response in these sections:
    1. Current Season Performance
    2. Comparison with Previous Season (if available)
    3. Technical Skills Analysis
    4. Physical Attributes Analysis
    5. Brief Conclusion

    Give details explanations
    
    If you encounter any errors when fetching data, explain clearly what happened and suggest alternatives.
    When data is missing or incomplete, mention this fact and focus on the available statistics.
    Always mention which season the data is from when presenting statistics.`,
    messages: convertToCoreMessages(messages),
    tools: {
      searchPlayer: {
        description: "Search for a player by name to get their ID.",
        parameters: z.object({
          name: z.string().describe("The name of the player to search for"),
        }),
        execute: async ({ name }: { name: string }) => {
          if (ENABLE_MOCKS) {
            return mockToolResponses.searchPlayer(name);
          }
          
          try {
            const result = await fetchFromSportsmonk<{
              data: Array<{
                id: number;
                display_name: string;
                team: { name: string } | null;
                position_id: number;
              }>;
            }>(`/players/search/${name}`);

            if (!result.data.length) {
              return "No players found with that name. Please try with a different name or spelling.";
            }
            return result.data.slice(0, 1).map((player) => ({
              id: player.id,
              name: player.display_name,
              team: player.team?.name ?? "Unknown Team",
              position: player.position_id,
            }));
          } catch (error) {
            return `Error searching for player: ${error instanceof Error ? error.message : "Unknown error"}. Please try again later.`;
          }
        },
      },
      analyzePlayer: {
        description: "Get detailed analysis of a player's current season with previous season comparison.",
        parameters: z.object({
          playerId: z.number().describe("The ID of the player to analyze"),
        }),
        execute: async ({ playerId }: { playerId: number }) => {
          if (ENABLE_MOCKS) {
            return mockToolResponses.analyzePlayer(playerId);
          }

          try {
            const [playerDetails, playerStats] = await Promise.all([
              fetchFromSportsmonk<PlayerDetails>(`/players/${playerId}`),
              fetchFromSportsmonk<PlayerStatistics>(
                `/statistics/seasons/players/${playerId}`
              ),
            ]);

            const player = playerDetails.data;
            
            // Get current and previous season stats
            const currentSeasonStats = playerStats.data[0];
            const previousSeasonStats = playerStats.data[1];
            
            if (!currentSeasonStats) {
              return {
                error: "No current season statistics available for this player."
              };
            }

            const response = {
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
                season_id: currentSeasonStats.season_id,
                statistics: mapAllTypeIds(currentSeasonStats.details),
              },
              previousSeason: previousSeasonStats ? {
                season_id: previousSeasonStats.season_id,
                statistics: mapAllTypeIds(previousSeasonStats.details),
              } : null,
              typeIds: TYPE_IDS,
            };

            return response;
          } catch (error) {
            return `Error analyzing player: ${error instanceof Error ? error.message : "Unknown error"}. Please try again later.`;
          }
        },
      },
      analyzeHistoricalStats: {
        description: "Get aggregated historical statistics for a player across all seasons",
        parameters: z.object({
          playerId: z.number().describe("The ID of the player to analyze"),
        }),
        execute: async ({ playerId }: { playerId: number }) => {
          if (ENABLE_MOCKS) {
            const mockResponse = mockToolResponses.analyzeHistoricalStats(playerId);
            return mockResponse;
          }

          try {
            const [playerDetails, playerStats] = await Promise.all([
              fetchFromSportsmonk<PlayerDetails>(`/players/${playerId}`),
              fetchFromSportsmonk<PlayerStatistics>(
                `/statistics/seasons/players/${playerId}`
              ),
            ]);

            const player = playerDetails.data;
            
            // Aggregate all seasons' data
            const historicalStats = aggregateHistoricalStats(playerStats.data);
            
            const response = {
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
              totalSeasons: playerStats.data.length,
              seasonIds: playerStats.data.map(season => season.season_id),
              statistics: historicalStats,
              typeIds: TYPE_IDS,
            };

            return response;
          } catch (error) {
            return `Error analyzing player: ${error instanceof Error ? error.message : "Unknown error"}. Please try again later.`;
          }
        },
      },
      compareStats: {
        description: "Compare statistics between two or more players using charts",
        parameters: z.object({
          playerIds: z.array(z.number()).describe("Array of player IDs to compare"),
          chartType: z.enum(["radar", "bar"]).describe("Type of chart to generate"),
          statCategories: z.array(z.number()).describe("Array of TYPE_IDS to compare"),
        }),
        execute: async ({ playerIds, chartType, statCategories }: { 
          playerIds: number[]; 
          chartType: "radar" | "bar"; 
          statCategories: number[]; 
        }) => {
          if (ENABLE_MOCKS) {
            const mockResponse = mockToolResponses.compareStats({ playerIds, chartType });
            return mockResponse;
          }

          try {
            type PlayerData = {
              details: PlayerDetails["data"];
              stats: PlayerStatistics["data"][0];
            };

            const playersData: PlayerData[] = await Promise.all(
              playerIds.map(async (id: number) => {
                const [details, stats] = await Promise.all([
                  fetchFromSportsmonk<PlayerDetails>(`/players/${id}`),
                  fetchFromSportsmonk<PlayerStatistics>(`/statistics/seasons/players/${id}`),
                ]);
                
                if (!stats.data[0]) {
                  throw new Error(`No statistics found for player ${details.data.display_name}`);
                }
                
                return { details: details.data, stats: stats.data[0] };
              })
            );

            const chartData = statCategories.map((typeId: number) => {
              const dataPoint: { label: string; [key: string]: string | number } = {
                label: Object.entries(TYPE_IDS).find(([_, id]) => id === typeId)?.[0]?.toLowerCase() ?? String(typeId),
              };

              playersData.forEach((player: PlayerData) => {
                const statValue = findStatValue(player.stats.details, typeId);
                dataPoint[player.details.display_name] = statValue.total ?? 0;
              });

              return dataPoint;
            });

            return {
              chartData: {
                title: "Player Statistics Comparison",
                description: "Comparing current season statistics",
                data: chartData,
                players: playersData.map((p: PlayerData) => p.details.display_name),
                chartType,
              },
            };
          } catch (error) {
            return `Error comparing players: ${error instanceof Error ? error.message : "Unknown error"}. Please try again later.`;
          }
        },
      },
    },
  });

  return result.toDataStreamResponse();
}