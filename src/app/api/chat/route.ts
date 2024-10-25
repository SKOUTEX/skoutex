import {
  type Message,
  type ToolInvocation,
  convertToCoreMessages,
  streamText,
} from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { env } from "~/env";

const SPORTMONK_API_KEY = env.SPORTMONK_API_KEY;
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
  };
}

interface PlayerStatistics {
  data: {
    statistics: {
      // Technical Skills
      goals: number;
      assists: number;
      passes: number;
      passes_accuracy: number;
      crosses: number;
      crosses_accuracy: number;
      dribbles: number;
      dribbles_success: number;
      shots: number;
      shots_on_target: number;
      key_passes: number;
      
      // Physical Attributes & Performance
      minutes_played: number;
      appearances: number;
      tackles: number;
      blocks: number;
      interceptions: number;
      duels: number;
      duels_won: number;
      aerial_duels: number;
      aerial_duels_won: number;
      fouls_drawn: number;
      fouls_committed: number;
      yellow_cards: number;
      red_cards: number;
    };
  };
}

async function fetchFromSportsmonk<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${SPORTMONK_API_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error("API request failed");
  }

  return response.json() as Promise<T>;
}

function calculatePercentage(value: number, total: number): string {
  if (total === 0) return "0%";
  return `${((value / total) * 100).toFixed(1)}%`;
}

export async function POST(req: Request) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { messages }: { messages: Message[] } = await req.json();

  const result = await streamText({
    model: openai("gpt-4o"),
    system: `You are a football analysis assistant specializing in detailed player analysis. 
    When analyzing players, structure your response in three main sections:
    1. Technical Skills (passing, dribbling, shooting, etc.)
    2. Physical Attributes (aerial duels, tackles, stamina indicators)
    3. Brief Conclusion
    
    Provide context for statistics and explain their significance for the player's role.
    Be concise but thorough in your analysis.`,
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
              return "No players found with that name";
            }

            return result.data.slice(0, 3).map((player) => ({
              id: player.id,
              name: player.display_name,
              team: player.team?.name ?? "Unknown Team",
              position: player.position_id,
            }));
          } catch (error) {
            return "Error searching for player";
          }
        },
      },
      analyzePlayer: {
        description: "Get detailed analysis of a player",
        parameters: z.object({
          playerId: z.number().describe("The ID of the player to analyze"),
          seasonId: z
            .number()
            .optional()
            .describe("Optional season ID to filter stats"),
        }),
        execute: async ({ playerId, seasonId }) => {
          try {
            const [playerDetails, playerStats] = await Promise.all([
              fetchFromSportsmonk<PlayerDetails>(`/players/${playerId}`),
              fetchFromSportsmonk<PlayerStatistics>(
                `/players/${playerId}/statistics/season/${seasonId ?? 21043}`
              ),
            ]);

            const stats = playerStats.data.statistics;
            const player = playerDetails.data;

            return {
              playerInfo: {
                name: player.display_name,
                age: player.age,
                nationality: player.country.name,
                position: player.position_id,
                marketValue: player.market_value,
                contractUntil: player.contract_until,
                height: player.height,
                weight: player.weight,
              },
              technicalSkills: {
                scoring: {
                  goals: stats.goals,
                  shots: stats.shots,
                  shotAccuracy: calculatePercentage(stats.shots_on_target, stats.shots),
                },
                passing: {
                  total: stats.passes,
                  accuracy: `${stats.passes_accuracy}%`,
                  keyPasses: stats.key_passes,
                  assists: stats.assists,
                },
                dribbling: {
                  attempts: stats.dribbles,
                  successRate: calculatePercentage(stats.dribbles_success, stats.dribbles),
                },
                crossing: {
                  attempts: stats.crosses,
                  accuracy: `${stats.crosses_accuracy}%`,
                },
              },
              physicalAttributes: {
                durability: {
                  appearances: stats.appearances,
                  minutesPlayed: stats.minutes_played,
                },
                defensiveWork: {
                  tackles: stats.tackles,
                  interceptions: stats.interceptions,
                  blocks: stats.blocks,
                },
                physicalDuels: {
                  totalDuels: stats.duels,
                  duelsWonRate: calculatePercentage(stats.duels_won, stats.duels),
                  aerialDuels: stats.aerial_duels,
                  aerialDuelsWonRate: calculatePercentage(stats.aerial_duels_won, stats.aerial_duels),
                },
                discipline: {
                  foulsCommitted: stats.fouls_committed,
                  foulsDrawn: stats.fouls_drawn,
                  yellowCards: stats.yellow_cards,
                  redCards: stats.red_cards,
                },
              },
            };
          } catch (error) {
            return "Error fetching player analysis";
          }
        },
      },
    },
  });

  return result.toDataStreamResponse();
}