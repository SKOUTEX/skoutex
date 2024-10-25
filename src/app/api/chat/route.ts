import {
  type Message,
  convertToCoreMessages,
  streamText,
} from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

const SPORTMONK_API_KEY = process.env.SPORTMONK_API_KEY!;
const BASE_URL = "https://api.sportmonks.com/v3/football";

// API Response Types
interface PlayerDetails {
  data: {
    id: number;
    display_name: string;
    height: string;
    weight: string;
    position_id: number;
    detailed_position_id: number;
    nationality_id: number;
    country: {
      name: string;
      image_path: string;
    };
    birthdate: string;
    age: number;
    market_value: number;
    contract_until?: string;
    current_team?: {
      id: number;
      name: string;
    };
  };
}

interface Season {
  data: {
    id: number;
    name: string;
    is_current: boolean;
  }[];
}

interface PlayerStatistics {
  data: {
    statistics: {
      // Technical Skills
      goals?: number;
      assists?: number;
      passes?: number;
      passes_accuracy?: number;
      crosses?: number;
      crosses_accuracy?: number;
      dribbles?: number;
      dribbles_success?: number;
      shots?: number;
      shots_on_target?: number;
      key_passes?: number;
      
      // Physical Attributes & Performance
      minutes_played?: number;
      appearances?: number;
      tackles?: number;
      blocks?: number;
      interceptions?: number;
      duels?: number;
      duels_won?: number;
      aerial_duels?: number;
      aerial_duels_won?: number;
      fouls_drawn?: number;
      fouls_committed?: number;
      yellow_cards?: number;
      red_cards?: number;
    };
  };
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
        }`
      );
    }

    return response.json() as Promise<T>;
  } catch (error) {
    console.error(`Error fetching from Sportmonk: ${endpoint}`, error);
    throw error;
  }
}

async function getCurrentSeason(): Promise<number> {
  try {
    const seasons = await fetchFromSportsmonk<Season>("/seasons");
    const currentSeason = seasons.data.find((season) => season.is_current);
    return currentSeason?.id ?? 21043; // fallback to a default season if not found
  } catch (error) {
    console.error("Error fetching current season", error);
    return 21043; // fallback to default season
  }
}

function calculatePercentage(value?: number, total?: number): string {
  if (!value || !total || total === 0) return "0%";
  return `${((value / total) * 100).toFixed(1)}%`;
}

export async function POST(req: Request) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { messages }: { messages: Message[] } = await req.json();

  const result = await streamText({
    model: openai("gpt-4o-mini"),
    system: `You are a football analysis assistant specializing in detailed player analysis. 
    When analyzing players, structure your response in three main sections:
    1. Technical Skills (passing, dribbling, shooting, etc.)
    2. Physical Attributes (aerial duels, tackles, stamina indicators)
    3. Brief Conclusion
    
    If you encounter any errors when fetching data, explain clearly what happened and suggest alternatives.
    When data is missing or incomplete, mention this fact and focus on the available statistics.
    Always mention which season the data is from when presenting statistics.`,
    messages: convertToCoreMessages(messages),
    tools: {
      searchPlayer: {
        description: "Search for a player by name to get their ID",
        parameters: z.object({
          name: z.string().describe("The name of the player to search for"),
        }),
        execute: async ({ name }) => {
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

            return result.data.slice(0, 3).map((player) => ({
              id: player.id,
              name: player.display_name,
              team: player.team?.name ?? "Unknown Team",
              position: player.position_id,
            }));
          } catch (error) {
            return `Error searching for player: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again later.`;
          }
        },
      },
      analyzePlayer: {
        description: "Get detailed analysis of a player",
        parameters: z.object({
          playerId: z.number().describe("The ID of the player to analyze"),
        }),
        execute: async ({ playerId }) => {
          try {
            const currentSeasonId = await getCurrentSeason();
            
            const [playerDetails, playerStats] = await Promise.all([
              fetchFromSportsmonk<PlayerDetails>(`/players/${playerId}`),
              fetchFromSportsmonk<PlayerStatistics>(
                `/players/${playerId}/statistics/season/${currentSeasonId}`
              ),
            ]);

            const stats = playerStats.data.statistics;
            const player = playerDetails.data;

            return {
              seasonId: currentSeasonId,
              playerInfo: {
                name: player.display_name,
                age: player.age,
                nationality: player.country.name,
                position: player.position_id,
                currentTeam: player.current_team?.name ?? "Unknown Team",
                marketValue: player.market_value,
                contractUntil: player.contract_until,
                height: player.height,
                weight: player.weight,
              },
              technicalSkills: {
                scoring: {
                  goals: stats.goals ?? 0,
                  shots: stats.shots ?? 0,
                  shotAccuracy: calculatePercentage(stats.shots_on_target, stats.shots),
                },
                passing: {
                  total: stats.passes ?? 0,
                  accuracy: stats.passes_accuracy ? `${stats.passes_accuracy}%` : "N/A",
                  keyPasses: stats.key_passes ?? 0,
                  assists: stats.assists ?? 0,
                },
                dribbling: {
                  attempts: stats.dribbles ?? 0,
                  successRate: calculatePercentage(stats.dribbles_success, stats.dribbles),
                },
                crossing: {
                  attempts: stats.crosses ?? 0,
                  accuracy: stats.crosses_accuracy ? `${stats.crosses_accuracy}%` : "N/A",
                },
              },
              physicalAttributes: {
                durability: {
                  appearances: stats.appearances ?? 0,
                  minutesPlayed: stats.minutes_played ?? 0,
                },
                defensiveWork: {
                  tackles: stats.tackles ?? 0,
                  interceptions: stats.interceptions ?? 0,
                  blocks: stats.blocks ?? 0,
                },
                physicalDuels: {
                  totalDuels: stats.duels ?? 0,
                  duelsWonRate: calculatePercentage(stats.duels_won, stats.duels),
                  aerialDuels: stats.aerial_duels ?? 0,
                  aerialDuelsWonRate: calculatePercentage(stats.aerial_duels_won, stats.aerial_duels),
                },
                discipline: {
                  foulsCommitted: stats.fouls_committed ?? 0,
                  foulsDrawn: stats.fouls_drawn ?? 0,
                  yellowCards: stats.yellow_cards ?? 0,
                  redCards: stats.red_cards ?? 0,
                },
              },
            };
          } catch (error) {
            return `Error analyzing player: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again later.`;
          }
        },
      },
    },
  });

  return result.toDataStreamResponse();
}