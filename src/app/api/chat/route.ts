import { type Message, convertToCoreMessages, streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

const SPORTMONK_API_KEY = process.env.SPORTMONK_API_KEY!;
const BASE_URL = "https://api.sportmonks.com/v3/football";

const TYPE_IDS = {
  // Match Participation
  APPEARANCES: 321,        // Games played
  LINEUPS: 322,           // Started in lineup
  BENCH: 323,             // Started on bench
  MINUTES_PLAYED: 119,    // Minutes played
  CAPTAIN: 40,            // Times as captain
  SUBSTITUTIONS: 59,      // Substitutions (in/out)

  // Scoring
  GOALS: 52,              // Goals scored
  PENALTIES_SCORED: 111,  // Penalties scored
  PENALTIES_MISSED: 112,  // Penalties missed
  OWN_GOALS: 324,        // Own goals
  HIT_WOODWORK: 64,      // Hit woodwork

  // Shooting
  SHOTS_TOTAL: 42,        // Total shots
  SHOTS_ON_TARGET: 86,    // Shots on target
  SHOTS_OFF_TARGET: 41,   // Shots off target
  SHOTS_BLOCKED: 58,      // Shots blocked

  // Passing
  PASSES: 80,             // Total passes
  ACCURATE_PASSES: 116,   // Accurate passes
  KEY_PASSES: 117,        // Key passes
  ASSISTS: 79,            // Assists
  THROUGH_BALLS: 124,     // Through balls
  THROUGH_BALLS_WON: 125, // Accurate through balls
  LONG_BALLS: 122,        // Long balls
  LONG_BALLS_WON: 123,    // Accurate long balls
  CROSSES_TOTAL: 98,      // Total crosses
  CROSSES_ACCURATE: 99,   // Accurate crosses

  // Defending
  TACKLES: 78,            // Tackles
  INTERCEPTIONS: 100,     // Interceptions
  CLEARANCES: 101,        // Clearances
  BLOCKS: 97,             // Blocked shots
  ERROR_LEAD_TO_GOAL: 571, // Errors leading to goal

  // Duels
  TOTAL_DUELS: 105,       // Total duels
  DUELS_WON: 106,        // Duels won
  AERIALS_WON: 107,      // Aerial duels won
  DRIBBLE_ATTEMPTS: 108,  // Dribble attempts
  SUCCESSFUL_DRIBBLES: 109, // Successful dribbles
  DRIBBLED_PAST: 110,    // Times dribbled past
  DISPOSSESSED: 94,      // Times dispossessed

  // Discipline
  FOULS: 56,             // Fouls committed
  FOULS_DRAWN: 96,       // Fouls drawn
  YELLOWCARDS: 84,       // Yellow cards
  REDCARDS: 83,          // Straight red cards
  YELLOWRED_CARDS: 85,   // Second yellows
  OFFSIDES: 51,          // Offsides

  // Goalkeeper specific
  SAVES: 57,             // Saves
  SAVES_INSIDEBOX: 104,  // Saves inside box
  PUNCHES: 103,          // Punches
  GOALS_CONCEDED: 88,    // Goals conceded

  // Rating
  RATING: 118            // Match rating
};

// API Response Types
interface PlayerDetails {
  data: {
    id: number;
    sport_id: number;
    country_id: number;
    nationality_id: number;
    city_id: number;
    position_id: number;
    detailed_position_id: number;
    type_id: number;
    common_name: string;
    firstname: string;
    lastname: string;
    name: string;
    display_name: string;
    image_path: string;
    height: number;
    weight: number;
    date_of_birth: string;
    gender: string;
  };
}

interface Season {
  data: {
    id: number;
    name: string;
    is_current: boolean;
  }[];
}

interface StatDetail {
  id: number;
  player_statistic_id: number;
  type_id: number;
  value: {
    total?: number;
    goals?: number;
    penalties?: number;
    in?: number;
    out?: number;
    home?: number;
    away?: number;
    average?: string;
    won?: number;
    scored?: number;
    committed?: number;
    saved?: number;
    missed?: number;
  };
}
interface PlayerStatistics {
  data: {
    id: number;
    player_id: number;
    team_id: number;
    season_id: number;
    has_values: boolean;
    position_id: number;
    jersey_number: number;
    details: StatDetail[];
  }[];
}

function findStatValue(
  details: StatDetail[],
  typeId: number,
): number | undefined {
  const stat = details.find((detail) => detail.type_id === typeId);
  if (!stat) return undefined;

  // Handle different value structures
  if (typeof stat.value === "object") {
    return stat.value.total ?? stat.value.goals ?? stat.value.won ?? undefined;
  }
  return undefined;
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
            return `Error searching for player: ${error instanceof Error ? error.message : "Unknown error"}. Please try again later.`;
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
                `/statistics/seasons/players/${playerId}`
              ),
            ]);

            const player = playerDetails.data;
            const stats = playerStats.data[0]?.details || [];

            return {
              seasonId: currentSeasonId,
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
              matchParticipation: {
                appearances: findStatValue(stats, TYPE_IDS.APPEARANCES),
                lineups: findStatValue(stats, TYPE_IDS.LINEUPS),
                bench: findStatValue(stats, TYPE_IDS.BENCH),
                minutesPlayed: findStatValue(stats, TYPE_IDS.MINUTES_PLAYED),
                substitutions: stats.find(
                  (s) => s.type_id === TYPE_IDS.SUBSTITUTIONS,
                )?.value,
              },
              attacking: {
                goals: findStatValue(stats, TYPE_IDS.GOALS),
                assists: findStatValue(stats, TYPE_IDS.ASSISTS),
                shots: {
                  total: findStatValue(stats, TYPE_IDS.SHOTS_TOTAL),
                  onTarget: findStatValue(stats, TYPE_IDS.SHOTS_ON_TARGET),
                  offTarget: findStatValue(stats, TYPE_IDS.SHOTS_OFF_TARGET),
                  blocked: findStatValue(stats, TYPE_IDS.SHOTS_BLOCKED),
                },
                penalties: {
                  scored: findStatValue(stats, TYPE_IDS.PENALTIES_SCORED),
                  missed: findStatValue(stats, TYPE_IDS.PENALTIES_MISSED),
                },
              },
              passing: {
                total: findStatValue(stats, TYPE_IDS.PASSES),
                accurate: findStatValue(stats, TYPE_IDS.ACCURATE_PASSES),
                keyPasses: findStatValue(stats, TYPE_IDS.KEY_PASSES),
                crosses: {
                  total: findStatValue(stats, TYPE_IDS.CROSSES_TOTAL),
                  accurate: findStatValue(stats, TYPE_IDS.CROSSES_ACCURATE),
                },
              },
              defending: {
                tackles: findStatValue(stats, TYPE_IDS.TACKLES),
                interceptions: findStatValue(stats, TYPE_IDS.INTERCEPTIONS),
                clearances: findStatValue(stats, TYPE_IDS.CLEARANCES),
                duels: {
                  total: findStatValue(stats, TYPE_IDS.TOTAL_DUELS),
                  won: findStatValue(stats, TYPE_IDS.DUELS_WON),
                },
              },
              discipline: {
                foulsCommitted: findStatValue(stats, TYPE_IDS.FOULS),
                foulsDrawn: findStatValue(stats, TYPE_IDS.FOULS_DRAWN),
                yellowCards: findStatValue(stats, TYPE_IDS.YELLOWCARDS),
                redCards: findStatValue(stats, TYPE_IDS.REDCARDS),
                secondYellows: findStatValue(stats, TYPE_IDS.YELLOWRED_CARDS),
              },
              rating: findStatValue(stats, TYPE_IDS.RATING),
              rawStats: stats, // Including raw stats for additional processing if needed
            };
          } catch (error) {
            return `Error analyzing player: ${error instanceof Error ? error.message : "Unknown error"}. Please try again later.`;
          }
        },
      },
    },
  });

  return result.toDataStreamResponse();
}
