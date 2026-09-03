/**
 *  * @file src/config/sources.js
  * Source definitions and selector maps for all scraper modules.
   * Selectors are validated against Playwright's locator API.
*/
export const SOURCE_CONFIG = {
    // ───────────────────────────────────────────────
    // FIXTURE DISCOVERY
    // ───────────────────────────────────────────────
    fixtures: {
        primary: {
            name: 'flashscore',
            baseUrl: 'https://www.flashscore.com',
            todayUrl: 'https://www.flashscore.com/football/',
            selectors: {
                matchRows: '[data-testid="event__match"]',
                homeTeam: '.event__participant--home',
                awayTeam: '.event__participant--away',
                league: '.event__titleBox',
                time: '.event__time',
                status: '.event__stage--block'
            }
        },
        fallback: {
            name: 'forebet',
            baseUrl: 'https://www.forebet.com',
            todayUrl: 'https://www.forebet.com/en/football-tips-and-predictions-for-today',
            selectors: {
                matchRows: '.predictionsTable tr',
                homeTeam: '.homeTeam',
                awayTeam: '.awayTeam',
                league: '.league',
                time: '.date_bah'
            }
        }
    },
    // ───────────────────────────────────────────────
    // MATCH HISTORY (10-match window)
    // ───────────────────────────────────────────────
    matchHistory: {
        primary: {
            name: 'flashscore',
            urlPattern: (teamSlug) => `https://www.flashscore.com/team/${teamSlug}/results/`,
            selectors: {
                matchRows: '.event__match',
                date: '.event__time',
                homeTeam: '.event__participant--home',
                awayTeam: '.event__participant--away',
                homeScore: '.event__score--home',
                awayScore: '.event__score--away',
                homeHT: '.event__part--home',
                awayHT: '.event__part--away',
                competition: '.event__titleBox'
            }
        },
        fallback: {
            name: 'soccerway',
            urlPattern: (teamId) => `https://int.soccerway.com/teams/${teamId}/matches/`,
            selectors: {
                matchRows: 'table.matches tbody tr',
                date: 'td.date',
                homeTeam: 'td.team-a a',
                awayTeam: 'td.team-b a',
                score: 'td.score a',
                competition: 'td.competition a'
            }
        }
    },
    // ───────────────────────────────────────────────
    // EXPECTED GOALS (xG)
    // ───────────────────────────────────────────────
    xg: {
        primary: {
            name: 'understat',
            baseUrl: 'https://understat.com',
            urlPattern: (matchId) => `https://understat.com/match/${matchId}`,
            selectors: {
                homeXg: '#shots-all .progress-bar-home',
                awayXg: '#shots-all .progress-bar-away',
                homeXga: '#shots-all .progress-bar-away',
                awayXga: '#shots-all .progress-bar-home',
                homeTeam: '.team-home h2',
                awayTeam: '.team-away h2'
            }
        },
        fallback: {
            name: 'fbref',
            baseUrl: 'https://fbref.com',
            urlPattern: (matchUrl) => matchUrl,
            selectors: {
                homeXg: '[data-stat="xg"] .poptip',
                awayXg: '[data-stat="xg"] .poptip',
                homeXga: '[data-stat="xga"] .poptip',
                awayXga: '[data-stat="xga"] .poptip'
            }
        }
    },
    // ───────────────────────────────────────────────
    // PLAYER RATINGS / SQUAD QUALITY (SQF)
    // ───────────────────────────────────────────────
    playerRatings: {
        primary: {
            name: 'sofascore',
            baseUrl: 'https://www.sofascore.com',
            urlPattern: (matchSlug) => `https://www.sofascore.com/${matchSlug}`,
            selectors: {
                homeRatings: '.Box.Flex.dwLxCc.bnpRyo > div:first-child .sc-hGPBjI',
                awayRatings: '.Box.Flex.dwLxCc.bnpRyo > div:last-child .sc-hGPBjI',
                playerRows: '[data-testid="lineup-player"]',
                rating: '[data-testid="rating"]'
            }
        },
        fallback: {
            name: 'whoscored',
            baseUrl: 'https://www.whoscored.com',
            urlPattern: (matchId) => `https://www.whoscored.com/Matches/${matchId}/Show/`,
            selectors: {
                homeRatings: '#match-player-stats-home .player-rating',
                awayRatings: '#match-player-stats-away .player-rating',
                playerRows: '.player-stats-table tbody tr'
            }
        }
    },
    // ───────────────────────────────────────────────
    // INJURIES / SUSPENSIONS (PIW)
    // ───────────────────────────────────────────────
    injuries: {
        primary: {
            name: 'fotmob',
            baseUrl: 'https://www.fotmob.com',
            urlPattern: (teamId) => `https://www.fotmob.com/teams/${teamId}/squad/`,
            selectors: {
                injurySection: '[data-testid="injury-section"]',
                playerName: '.PlayerName',
                injuryType: '.InjuryType',
                returnDate: '.ReturnDate',
                status: '.StatusBadge'
            }
        },
        fallback: {
            name: 'transfermarkt',
            baseUrl: 'https://www.transfermarkt.com',
            urlPattern: (clubSlug) => `https://www.transfermarkt.com/${clubSlug}/verletzungen/`,
            selectors: {
                injuryRows: 'table.items tbody tr',
                playerName: 'td.hauptlink a',
                injuryType: 'td:nth-child(4)',
                returnDate: 'td:nth-child(6)',
                status: 'td:nth-child(5)'
            }
        }
    },// ───────────────────────────────────────────────
    // MANAGERIAL DATA (MSM)
    // ───────────────────────────────────────────────
    managers: {
        primary: {
            name: 'transfermarkt',
            baseUrl: 'https://www.transfermarkt.com',
            urlPattern: (clubSlug) => `https://www.transfermarkt.com/${clubSlug}/trainer/`,
            selectors: {
                managerRow: 'table.items tbody tr:first-child',
                name: 'td.hauptlink a',
                appointed: 'td:nth-child(3)',
                matches: 'td:nth-child(4)',
                wins: 'td:nth-child(5)',
                draws: 'td:nth-child(6)',
                losses: 'td:nth-child(7)'
            }
        },
        fallback: {
            name: 'wikipedia',
            baseUrl: 'https://en.wikipedia.org',
            urlPattern: (teamName) => `https://en.wikipedia.org/wiki/${teamName.replace(/\s/g, '_')}`,
            selectors: {
                managerField: 'th:has-text("Head coach") + td, th:has-text("Manager") + td'
            }
        }
    },// ───────────────────────────────────────────────
    // HEAD-TO-HEAD (HM)
    // ───────────────────────────────────────────────
    h2h: {
        primary: {
            name: 'flashscore',
            baseUrl: 'https://www.flashscore.com',
            urlPattern: (matchId) => `https://www.flashscore.com/match/${matchId}/#/h2h/overall`,
            selectors: {
                h2hRows: '.h2h__row',
                date: '.h2h__date',
                homeTeam: '.h2h__homeParticipant',
                awayTeam: '.h2h__awayParticipant',
                homeScore: '.h2h__result span:first-child',
                awayScore: '.h2h__result span:last-child',
                venue: '.h2h__icon'
            }
        },
        fallback: {
            name: 'soccerway',
            baseUrl: 'https://int.soccerway.com',
            urlPattern: (homeId, awayId) => `https://int.soccerway.com/teams/comparison/${homeId}/vs/${awayId}/`,
            selectors: {
                h2hRows: 'table.matches tbody tr',
                date: 'td.date',
                homeTeam: 'td.team-a',
                awayTeam: 'td.team-b',
                score: 'td.score'
            }
        }
    },// ───────────────────────────────────────────────
    // MARKET ODDS (MDS)
    // ───────────────────────────────────────────────
    marketOdds: {
        primary: {
            name: 'forebet',
            baseUrl: 'https://www.forebet.com',
            urlPattern: (matchSlug) => `https://www.forebet.com/en/football-predictions/${matchSlug}`,
            selectors: {
                homeProb: '.predictionHome',
                drawProb: '.predictionDraw',
                awayProb: '.predictionAway',
                over25: '.predictionOver25',
                btts: '.predictionBtts'
            }
        },
        fallback: {
            name: 'pinnacle',
            baseUrl: 'https://www.pinnacle.com',
            urlPattern: (matchId) => `https://www.pinnacle.com/en/soccer/match/${matchId}`,
            selectors: {
                homeOdds: '[data-testid="market-outcome-0"]',
                drawOdds: '[data-testid="market-outcome-1"]',
                awayOdds: '[data-testid="market-outcome-2"]'
            }
        }
    },// ───────────────────────────────────────────────
    // ELO RATINGS
    // ───────────────────────────────────────────────
    elo: {
        primary: {
            name: 'clubelo',
            baseUrl: 'http://clubelo.com',
            urlPattern: () => 'http://clubelo.com/',
            selectors: {
                teamRows: '#tablelist tbody tr',
                rank: 'td:nth-child(1)',
                team: 'td:nth-child(2) a',
                country: 'td:nth-child(3)',
                elo: 'td:nth-child(4)'
            }
        },
        fallback: {
            name: 'footballdatabase',
            baseUrl: 'https://www.footballdatabase.eu',
            urlPattern: () => 'https://www.footballdatabase.eu/en/ranking',
            selectors: {
                teamRows: 'table.clubs tbody tr',
                rank: 'td:nth-child(1)',
                team: 'td:nth-child(3) a',
                elo: 'td:nth-child(5)'
            }
        }
    },
    // ───────────────────────────────────────────────
    // LEAGUE STANDINGS
    // ───────────────────────────────────────────────
    standings: {
        primary: {
            name: 'soccerway',
            baseUrl: 'https://int.soccerway.com',
            urlPattern: (leagueSlug) => `https://int.soccerway.com/national/${leagueSlug}/table/`,
            selectors: {
                teamRows: 'table.leaguetable.sortable tbody tr',
                position: 'td:nth-child(1)',
                team: 'td:nth-child(2) a',
                played: 'td:nth-child(3)',
                wins: 'td:nth-child(4)',
                draws: 'td:nth-child(5)',
                losses: 'td:nth-child(6)',
                gf: 'td:nth-child(7)',
                ga: 'td:nth-child(8)',
                gd: 'td:nth-child(9)',
                points: 'td:nth-child(10)'
            }
        },
        fallback: {
            name: 'flashscore',
            baseUrl: 'https://www.flashscore.com',
            urlPattern: (leagueSlug) => `https://www.flashscore.com/football/${leagueSlug}/standings/`,
            selectors: {
                teamRows: '.ui-table__row',
                position: '.ui-table__rank',
                team: '.participant__participantName',
                played: '.ui-table__cell[data-testid="played"]',
                wins: '.ui-table__cell[data-testid="wins"]',
                draws: '.ui-table__cell[data-testid="draws"]',
                losses: '.ui-table__cell[data-testid="losses"]',
                gf: '.ui-table__cell[data-testid="goalsFor"]',
                ga: '.ui-table__cell[data-testid="goalsAgainst"]',
                gd: '.ui-table__cell[data-testid="goalDifference"]',
                points: '.ui-table__cell[data-testid="points"]'
            }
        }
    },// ───────────────────────────────────────────────
    // FOREBET PROBABILITIES (UTW Engine)
    // ───────────────────────────────────────────────
    forebet: {
        primary: {
            name: 'forebet',
            baseUrl: 'https://www.forebet.com',
            urlPattern: (matchSlug) => `https://www.forebet.com/en/football-predictions/${matchSlug}`,
            selectors: {
                homeWinProb: '.predictionHome',
                drawProb: '.predictionDraw',
                awayWinProb: '.predictionAway',
                expectedGoals: '.xgValue',
                trend: '.trendIndicator'
            }
        }
    }
};
/**
 *  * User-Agent rotation pool to reduce detection risk.
  */
export const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0'
];
/**
 *  * Rate limiting: milliseconds between requests per domain.
  */
export const RATE_LIMITS = {
    'flashscore.com': 2000,
    'forebet.com': 1500,
    'understat.com': 2000,
    'fbref.com': 3000,
    'sofascore.com': 2000,
    'whoscored.com': 2500,
    'fotmob.com': 1500,
    'transfermarkt.com': 3000,
    'soccerway.com': 2000,
    'pinnacle.com': 2000,
    'clubelo.com': 1000,
    'footballdatabase.eu': 1500,
    'wikipedia.org': 1000
};

/**
 *  * Team name normalization map (common aliases to canonical name).
  * Extend this as needed per league.
   */
export const TEAM_ALIASES = {
    'Internacional': ['Inter RS', 'Sport Club Internacional', 'Inter Porto Alegre'],
    'Bahia': ['Esporte Clube Bahia', 'EC Bahia'],
    'Colo Colo': ['Colo-Colo', 'CSD Colo Colo'],
    'Audax Italiano': ['Audax', 'Audax Italiano La Florida'],
    'Coquimbo Unido': ['Coquimbo'],
    'Huachipato': ['CD Huachipato'],
    'Independiente': ['CA Independiente', 'Club Atletico Independiente'],
    'Gimnasia Mendoza': ['Gimnasia y Esgrima Mendoza', 'GyE Mendoza'],
    'Independiente Rivadavia': ['Inde Rivadavia'],
    'Racing Club': ['Racing', 'Racing Club de Avellaneda'],
    'Remo': ['Clube do Remo'],
    'Coritiba': ['Coritiba Foot Ball Club'],
    'Pacific FC': ['Pacific'],
    'HFX Wanderers': ['Halifax Wanderers']
};

export default SOURCE_CONFIG;

