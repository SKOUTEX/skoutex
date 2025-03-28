import { type Message, convertToCoreMessages, streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { ENABLE_MOCKS, mockToolResponses } from "~/config/mocks";
import { TYPE_IDS } from "~/types/players";

const BESOCCER_API_KEY = "9e3b9859a4b5564356282ae2041354dd";
const BASE_URL = "https://api.besoccer.com/v2";

async function fetchFromBeSoccer<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${BASE_URL}${endpoint}`);
  url.searchParams.append("token", BESOCCER_API_KEY);
  url.searchParams.append("tz", "Europe/Madrid");
  Object.entries(params).forEach(([key, value]) => url.searchParams.append(key, value));

  try {
    const response = await fetch(url.toString());
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `BeSoccer API request failed: ${response.status} ${response.statusText}. ${
          errorData.message ?? ""
        }`
      );
    }
    return response.json() as Promise<T>;
  } catch (error) {
    console.error(`Error fetching from BeSoccer: ${endpoint}`, error);
    throw error;
  }
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export async function POST(req: Request) {
  const { messages } = (await req.json()) as { messages: Message[] };

  try {
    const result = await streamText({
      model: openai("gpt-4o"),
      system: `You are a senior football performance analyst providing elite-level scouting reports for coaches, agents, and sporting directors.

You exclusively analyse players from La Liga, using the latest data available from this competition.

Your evaluations must be comprehensive, evidence-based, and delivered with confidence. Base your assessments on the most recent season's data. Avoid assumptions — rely strictly on statistics. Always compare player data to positional and league averages for full context.

Follow this structure:

1. Physical Attributes
Assess pace, strength, stamina, agility, height, injury history, and fitness. Use minutes played and match availability as proxies where needed. Highlight physical traits that give the player an edge or limit their performance.

2. Technical Profile
Discuss passing accuracy, first touch, shooting technique, dribbling success rate, ball retention, and defensive technique. Use specific per-90 stats and percentile comparisons where available.

3. Tactical Intelligence
Explain how the player interprets the game: positioning, pressing, off-the-ball movement, adaptability in different systems or formations.

4. Statistical Output
List key season metrics: minutes, appearances, goals, assists, xG, xA, successful actions, duels won, recoveries, etc. Use charts where applicable. Show trends compared to previous seasons.

5. Potential & Transfer Suitability
Conclude with transfer viability: is the player ready for a step up? Recommend clubs, leagues, or systems that suit their style. Indicate ceiling and risk (e.g. “high ceiling, raw decision-making”).

Guidelines:
- Use confident, expert language — no vague or generic comments.
- Never use filler phrases like “he is a good player.”
- Provide actionable insight for clubs and agents.
- Do not hallucinate. If data is missing, say so clearly.
- Always be factual and structured.`,
      messages: convertToCoreMessages(messages),
      maxSteps: 6,
      tools: {
        searchPlayer: {
          description: "Search for a player by name to get their ID.",
          parameters: z.object({
            name: z.string(),
          }),
          execute: async ({ name }) => {
            if (ENABLE_MOCKS) return mockToolResponses.searchPlayer(name);

            const cleanName = normalizeName(name);
            try {
              const result = await fetchFromBeSoccer<any>("/player/search", { name: cleanName });
              console.log("BeSoccer search response:", result);

              if (!result.data?.length) {
                return `No players found with the name "${name}". Try full names or adjust spelling (e.g. "Lewandowski Robert").`;
              }

              const player = result.data[0];
              return [{
                id: parseInt(player.id),
                name: player.name,
                team: player.team_name ?? "Unknown",
                position: player.position_id ?? 0,
              }];
            } catch (error) {
              return "An error occurred while searching for the player.";
            }
          },
        },
        analyzePlayer: {
          description: "Analyze a player's current season",
          parameters: z.object({
            playerId: z.number(),
          }),
          execute: async ({ playerId }) => {
            if (ENABLE_MOCKS) return mockToolResponses.analyzePlayer(playerId);
            try {
              const result = await fetchFromBeSoccer<any>("/player/info", { id: playerId.toString() });
              if (!result.data) return { error: "No data found for player." };
              return {
                playerInfo: result.data,
                typeIds: TYPE_IDS,
              };
            } catch (error) {
              return "An error occurred while analyzing the player.";
            }
          },
        },
        analyzeHistoricalStats: {
          description: "Get aggregated historical statistics for a player across all seasons",
          parameters: z.object({
            playerId: z.number(),
          }),
          execute: async ({ playerId }) => {
            try {
              const result = await fetchFromBeSoccer<any>("/player/stats/all", { id: playerId.toString() });
              if (!result.data || !Array.isArray(result.data)) {
                return { error: "No historical stats found for player." };
              }
              return {
                playerId,
                totalSeasons: result.data.length,
                seasons: result.data.map((season: any) => ({
                  seasonId: season.season_id,
                  goals: season.goals,
                  assists: season.assists,
                  minutes: season.minutes,
                  yellowCards: season.yellow_cards,
                  redCards: season.red_cards,
                })),
              };
            } catch (error) {
              return "An error occurred while retrieving historical stats.";
            }
          },
        },
        compareStats: {
          description: "Compare statistics between two or more players using charts",
          parameters: z.object({
            playerIds: z.array(z.number()),
            chartType: z.enum(["radar", "bar"]),
            statCategories: z.array(z.string()),
          }),
          execute: async ({ playerIds, chartType, statCategories }) => {
            try {
              const playersData = await Promise.all(
                playerIds.map(async (id) => {
                  const stats = await fetchFromBeSoccer<any>("/player/stats/season", { id: id.toString() });
                  const info = await fetchFromBeSoccer<any>("/player/info", { id: id.toString() });
                  return { name: info.data.name, stats: stats.data };
                })
              );

              const chartData = statCategories.map((category) => {
                const row: Record<string, string | number> = { label: category };
                playersData.forEach((player) => {
                  row[player.name] = player.stats?.[category] ?? 0;
                });
                return row;
              });

              return {
                chartData: {
                  title: "Player Statistics Comparison",
                  description: "Comparing current season statistics",
                  data: chartData,
                  players: playersData.map((p) => p.name),
                  chartType,
                },
              };
            } catch (error) {
              return "An error occurred while comparing players.";
            }
          },
        },
        findPlayersByFilters: {
          description: "Find players by age, position, and competition (e.g., 21-year-old strikers in La Liga)",
          parameters: z.object({
            age: z.number(),
            positionId: z.string(),
            competitionId: z.string(),
            season: z.string()
          }),
          execute: async ({ age, positionId, competitionId, season }) => {
            try {
              const result = await fetchFromBeSoccer<any>("/competition/players", {
                id_competition: competitionId,
                season,
                pos: positionId
              });

              if (!result.data || !Array.isArray(result.data)) {
                return "No players found for the specified filters.";
              }

              const currentYear = new Date().getFullYear();
              const targetBirthYear = currentYear - age;

              const filtered = result.data.filter((p: any) => {
                const birthYear = new Date(p.date_birth).getFullYear();
                return birthYear === targetBirthYear;
              });

              if (!filtered.length) return "No players matched the age and position in this league.";

              return filtered.slice(0, 5).map((p: any) => ({
                id: parseInt(p.id),
                name: p.name,
                birthdate: p.date_birth,
                team: p.team_name,
                position: p.position
              }));
            } catch (err) {
              return "An error occurred while filtering players.";
            }
          }
        }
      },
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error("Error in POST handler or streamText:", error);
    return new Response("An unexpected error occurred while generating the response.", { status: 500 });
  }
}
