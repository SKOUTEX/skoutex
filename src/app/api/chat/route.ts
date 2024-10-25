/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  type Message,
  type ToolInvocation,
  convertToCoreMessages,
  streamText,
} from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

const SPORTMONK_API_KEY = process.env.SPORTMONK_API_KEY!;
const BASE_URL = "https://api.sportmonks.com/v3/football";

async function fetchFromSportsmonk(endpoint: string) {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${SPORTMONK_API_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error("API request failed");
  }

  return response.json();
}

export async function POST(req: Request) {
  const { messages }: { messages: Message[] } = await req.json();

  const result = await streamText({
    model: openai("gpt-4o"),
    system:
      "You are a football analysis assistant that helps users understand player statistics, team performance, and match analysis. Use the provided tools to fetch accurate data.",
    messages: convertToCoreMessages(messages),
    tools: {
      getPlayerStats: {
        description: "Get statistics for a specific player",
        parameters: z.object({
          playerId: z.number().describe("The ID of the player to look up"),
          seasonId: z
            .number()
            .optional()
            .describe("Optional season ID to filter stats"),
        }),
        execute: async ({ playerId, seasonId }) => {
          try {
            const player = await fetchFromSportsmonk(`/players/${playerId}`);
            const stats = await fetchFromSportsmonk(
              `/players/${playerId}/statistics/season/${seasonId ?? 21043}`,
            );

            return `Stats for ${player.data.display_name}:
              Position: ${player.data.position_id}
              Goals: ${stats.data.statistics.goals ?? 0}
              Assists: ${stats.data.statistics.assists ?? 0}
              Minutes Played: ${stats.data.statistics.minutes_played ?? 0}
              Matches Played: ${stats.data.statistics.appearances ?? 0}
              Yellow Cards: ${stats.data.statistics.yellow_cards ?? 0}
              Red Cards: ${stats.data.statistics.red_cards ?? 0}`;
          } catch (error) {
            return "Error fetching player statistics";
          }
        },
      },
      searchPlayer: {
        description: "Search for a player by name to get their ID",
        parameters: z.object({
          name: z.string().describe("The name of the player to search for"),
        }),
        execute: async ({ name }) => {
          try {
            const result = await fetchFromSportsmonk(`/players/search/${name}`);
            if (!result.data.length) {
              return "No players found with that name";
            }

            return result.data.slice(0, 3).map((player: any) => ({
              id: player.id,
              name: player.display_name,
              team: player.team?.name ?? "Unknown Team",
            }));
          } catch (error) {
            return "Error searching for player";
          }
        },
      },
      getTeamStats: {
        description: "Get team statistics",
        parameters: z.object({
          teamId: z.number().describe("The ID of the team to analyze"),
          seasonId: z
            .number()
            .optional()
            .describe("Optional season ID to filter stats"),
        }),
        execute: async ({ teamId, seasonId }) => {
          try {
            const team = await fetchFromSportsmonk(`/teams/${teamId}`);
            const stats = await fetchFromSportsmonk(
              `/teams/${teamId}/statistics/season/${seasonId ?? 21043}`,
            );

            return `Team Stats for ${team.data.name}:
              League Position: ${stats.data.statistics.league_position ?? "N/A"}
              Matches Played: ${stats.data.statistics.matches_played ?? 0}
              Wins: ${stats.data.statistics.won ?? 0}
              Draws: ${stats.data.statistics.draw ?? 0}
              Losses: ${stats.data.statistics.lost ?? 0}
              Goals Scored: ${stats.data.statistics.goals_scored ?? 0}
              Goals Conceded: ${stats.data.statistics.goals_against ?? 0}
              Clean Sheets: ${stats.data.statistics.clean_sheets ?? 0}`;
          } catch (error) {
            return "Error fetching team statistics";
          }
        },
      },
      searchTeam: {
        description: "Search for a team by name to get their ID",
        parameters: z.object({
          name: z.string().describe("The name of the team to search for"),
        }),
        execute: async ({ name }) => {
          try {
            const result = await fetchFromSportsmonk(`/teams/search/${name}`);
            if (!result.data.length) {
              return "No teams found with that name";
            }

            return result.data.slice(0, 3).map((team: any) => ({
              id: team.id,
              name: team.name,
              country: team.country?.name ?? "Unknown Country",
            }));
          } catch (error) {
            return "Error searching for team";
          }
        },
      },
      getFixtureDetails: {
        description: "Get detailed information about a specific fixture",
        parameters: z.object({
          fixtureId: z.number().describe("The ID of the fixture to analyze"),
        }),
        execute: async ({ fixtureId }) => {
          try {
            const fixture = await fetchFromSportsmonk(`/fixtures/${fixtureId}`);
            const stats = fixture.data.statistics;

            return `Match Details:
              ${fixture.data.participants[0].name} vs ${fixture.data.participants[1].name}
              Score: ${fixture.data.scores.localteam_score} - ${fixture.data.scores.visitorteam_score}
              Possession: ${stats?.possession?.localteam ?? 0}% - ${stats?.possession?.visitorteam ?? 0}%
              Shots on Target: ${stats?.shots_on_target?.localteam ?? 0} - ${stats?.shots_on_target?.visitorteam ?? 0}
              Yellow Cards: ${stats?.yellow_cards?.localteam ?? 0} - ${stats?.yellow_cards?.visitorteam ?? 0}
              Red Cards: ${stats?.red_cards?.localteam ?? 0} - ${stats?.red_cards?.visitorteam ?? 0}`;
          } catch (error) {
            return "Error fetching fixture details";
          }
        },
      },
      getUpcomingFixtures: {
        description: "Get upcoming fixtures for a team",
        parameters: z.object({
          teamId: z.number().describe("The ID of the team"),
          count: z
            .number()
            .max(5)
            .default(3)
            .describe("Number of upcoming fixtures to fetch"),
        }),
        execute: async ({ teamId, count }) => {
          try {
            const fixtures = await fetchFromSportsmonk(
              `/teams/${teamId}/fixtures/upcoming`,
            );

            return fixtures.data.slice(0, count).map((fixture: any) => ({
              id: fixture.id,
              date: fixture.starting_at,
              home: fixture.participants.find(
                (p: any) => p.meta.location === "home",
              )?.name,
              away: fixture.participants.find(
                (p: any) => p.meta.location === "away",
              )?.name,
              league: fixture.league?.name,
            }));
          } catch (error) {
            return "Error fetching upcoming fixtures";
          }
        },
      },
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return result.toDataStreamResponse();
}
