/* eslint-disable @typescript-eslint/ban-ts-comment */
import { type Message, convertToCoreMessages, streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { type PlayerDetails, type PlayerStatistics, type Season, type StatDetail, TYPE_IDS } from "~/types/players";
import { ENABLE_MOCKS, mockToolResponses } from "~/config/mocks";

// Use Besoccer credentials and endpoint
const BESOCCER_API_KEY = process.env.BESOCCER_API_KEY!;
const BASE_URL = "https://api.besoccer.com/v1"; // adjust if needed

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
  const averageStats = [TYPE_IDS.RATING]; // Add more type IDs that should be averaged if needed
  averageStats.forEach(typeId => {
    if (aggregatedStats[typeId]) {
      Object.keys(aggregatedStats[typeId]).forEach(key => {
        // @ts-expect-error
        aggregatedStats[stat.type_id][key] = Number((aggregatedStats[typeId][key] / seasons.length).toFixed(2));
      });
    }
  });

  return aggregatedStats;
}

async function fetchFromBesoccer<T>(endpoint: string): Promise<T> {
  try {
    // Append the API key as a query parameter
    const separator = endpoint.includes('?') ? '&' : '?';
    const url = `${BASE_URL}${endpoint}${separator}key=${BESOCCER_API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `API request failed: ${response.status} ${response.statusText}. ${errorData.message ?? ""}`
      );
    }
    return response.json() as Promise<T>;
  } catch (error) {
    console.error(`Error fetching from Besoccer: ${endpoint}`, error);
    throw error;
  }
}

export async function POST(req: Request) {
  const { messages } = (await req.json()) as { messages: Message[] };
  const currentYear = new Date().getFullYear();

  const result = await streamText({
    model: openai("gpt-4o"),
    system: `You are the assistant of a perfectionist football analysis expert, specializing in in-depth, data-driven player evaluations. Your job is to deliver comprehensive, structured, and thoroughly researched analysis, leaving no detail unchecked. You must use the most recent and accurate data available, ensuring all insights are supported by concrete evidence.

When analyzing players, follow this structure:

1. Physical Attributes Analysis
Provide an in-depth assessment of the player’s physical attributes, including pace, stamina, strength, agility, aerial ability, and overall fitness.
Use the most recent physical metrics available, comparing them to the league or positional averages to provide clear context.
If applicable, analyze the impact of injuries or recovery patterns on the player’s physical performance.
2. Technical Skills Analysis
Analyze the player’s technical abilities, including passing accuracy, shooting technique, dribbling success rate, ball control, and defensive skills.
Use specific statistics to highlight strengths and areas for improvement, and compare these metrics to the league or positional averages.
Discuss how their technical skills contribute to their team’s tactics and overall gameplay.
3. General Performance Data
Present detailed statistics from the current season, including appearances, goals, assists, xG (expected goals), xA (expected assists), progressive passes, and defensive actions.
Compare these figures to the league or positional averages, ensuring context and depth in the evaluation.
Discuss the player’s role within their team’s tactical setup, referencing specific match scenarios or strategies when relevant.
4. Trends and Development Insights
Compare the player’s current season data with previous seasons to identify performance trends (e.g., improvements, consistency, or decline).
Discuss possible reasons for these trends, such as tactical adjustments, positional changes, or the influence of injuries.
Evaluate the player’s potential trajectory and areas for future development.
5. Transfer Potential and Recommendations
Provide a concise summary of the player’s overall contribution and transfer potential, backed by specific data.
Recommend potential clubs or tactical systems where the player might excel, using detailed comparisons with existing squad members or positional needs.
Example: “Given their crossing accuracy of X% and progressive runs per 90 minutes, this player would be an ideal fit for [specific club], whose current full-backs average Y% and Z respectively.”
Highlight whether the player is a suitable candidate for development or an immediate starter based on their metrics.
Guidelines for Accuracy and Depth:
Latest Data Only: Prioritize statistics from the current season; if unavailable, explain clearly and use alternative methods for evaluation.
Contextual Comparisons: Always compare the player’s metrics to league or positional averages to add depth and clarity.
Detailed and Specific: Avoid vague statements; use precise statistics and examples to support all insights.
Thorough Research: Never include placeholders or incomplete information (e.g., “unknown team”). Dig deeper to provide the most accurate and detailed analysis possible.
Professional Language: Avoid repetitive use of the player’s name; maintain variety and flow in your writing.`,
    messages: convertToCoreMessages(messages),
    maxSteps: 6,
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
            const result = await fetchFromBesoccer<{
              data: Array<{
                id: number;
                display_name: string;
                team?: { name: string } | null;
                position_id: number;
              }>;
            }>(`/?req=search&term=${name}&group=players`);

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
            // Fetch player details and season stats for current and previous seasons
            const [playerDetails, currentSeasonStats, previousSeasonStats] = await Promise.all([
              fetchFromBesoccer<PlayerDetails>(`/?req=player&id=${playerId}`),
              fetchFromBesoccer<PlayerStatistics>(`/?req=player&id=${playerId}&year=${currentYear}`),
              fetchFromBesoccer<PlayerStatistics>(`/?req=player&id=${playerId}&year=${currentYear - 1}`),
            ]);

            // Check if current season stats exist
            if (!currentSeasonStats.data) {
              return {
                error: "No current season statistics available for this player."
              };
            }

            const response = {
              playerInfo: {
                name: playerDetails.data.display_name,
                commonName: playerDetails.data.common_name,
                dateOfBirth: playerDetails.data.date_of_birth,
                nationality_id: playerDetails.data.nationality_id,
                position_id: playerDetails.data.position_id,
                detailed_position_id: playerDetails.data.detailed_position_id,
                height: playerDetails.data.height,
                weight: playerDetails.data.weight,
                imagePath: playerDetails.data.image_path,
              },
              currentSeason: {
                season_id: currentYear,
                statistics: mapAllTypeIds(currentSeasonStats.data.details),
              },
              previousSeason: previousSeasonStats.data ? {
                season_id: currentYear - 1,
                statistics: mapAllTypeIds(previousSeasonStats.data.details),
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
            // Fetch player details and stats for current and previous seasons for aggregation
            const [playerDetails, currentSeasonStats, previousSeasonStats] = await Promise.all([
              fetchFromBesoccer<PlayerDetails>(`/?req=player&id=${playerId}`),
              fetchFromBesoccer<PlayerStatistics>(`/?req=player&id=${playerId}&year=${currentYear}`),
              fetchFromBesoccer<PlayerStatistics>(`/?req=player&id=${playerId}&year=${currentYear - 1}`),
            ]);

            // Prepare seasons data array (filter out any missing season data)
            const seasonsData = [currentSeasonStats.data, previousSeasonStats.data].filter(Boolean) as Array<{ details: StatDetail[] }>;

            // Aggregate historical stats
            const historicalStats = aggregateHistoricalStats(seasonsData);
            
            const response = {
              playerInfo: {
                name: playerDetails.data.display_name,
                commonName: playerDetails.data.common_name,
                dateOfBirth: playerDetails.data.date_of_birth,
                nationality_id: playerDetails.data.nationality_id,
                position_id: playerDetails.data.position_id,
                detailed_position_id: playerDetails.data.detailed_position_id,
                height: playerDetails.data.height,
                weight: playerDetails.data.weight,
                imagePath: playerDetails.data.image_path,
              },
              totalSeasons: seasonsData.length,
              seasonIds: seasonsData.map((_, index) => index === 0 ? currentYear : currentYear - 1),
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
              stats: PlayerStatistics["data"];
            };

            // Use current season for comparison
            const playersData: PlayerData[] = await Promise.all(
              playerIds.map(async (id: number) => {
                const [details, stats] = await Promise.all([
                  fetchFromBesoccer<PlayerDetails>(`/?req=player&id=${id}`),
                  fetchFromBesoccer<PlayerStatistics>(`/?req=player&id=${id}&year=${currentYear}`),
                ]);
                
                if (!stats.data) {
                  throw new Error(`No statistics found for player ${details.data.display_name}`);
                }
                
                return { details: details.data, stats: stats.data };
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
