export const TYPE_IDS = {
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
export interface PlayerDetails {
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

export interface Season {
  data: {
    id: number;
    name: string;
    is_current: boolean;
  }[];
}

export interface StatDetail {
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
export interface PlayerStatistics {
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