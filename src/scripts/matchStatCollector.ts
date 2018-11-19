const axios = require('axios');
const { forEachSeries } = require('p-iteration');

async function matchStatCollector(
  games,
  matchRepository,
  matchStatRepository,
  playerRepository,
) {
  return new Promise(async (reolve, reject) => {
    await forEachSeries(games, async game => {
      try {
        const existingMatch = await matchRepository.findOne({
          where: { matchId: game.gameId },
        });
        // if match exists and has started and is not over
        if (existingMatch && existingMatch.statusNum === 2) {
          let result = await axios.get(
            `https://nlnbamdnyc-a.akamaihd.net/fs/nba/feeds_s2012/stats/2018/boxscore/${
              game.gameId
            }.js`,
          );
          let statJSON = JSON.parse(result.data.split('var g_boxscore=')[1]);
          let homeTeamStats = statJSON.stats.home.players;
          let awayTeamStats = statJSON.stats.visitor.players;
          await saveStats(
            existingMatch,
            [...homeTeamStats, ...awayTeamStats],
            playerRepository,
            matchStatRepository,
          );

          existingMatch.gameClock = statJSON.score.periodTime.gameClock;
          existingMatch.hTeamScore = statJSON.score.home.score;
          existingMatch.vTeamScore = statJSON.score.visitor.score;

          // update the quarter scores
          existingMatch.hTeamQScore = statJSON.score.home.qScore;
          existingMatch.vTeamQScore = statJSON.score.visitor.qScore;
          await matchRepository.save(existingMatch);
        }
      } catch (error) {
        console.log(error);
        console.log('match didnt start probably');
      }
    });
    console.log('done');
    reolve();
  });
}

export default matchStatCollector;

async function saveStats(match, stats, playerRepository, matchStatRepository) {
  return new Promise(async (resolve, reject) => {
    await forEachSeries(stats, async stat => {
      return new Promise(async (resolve, reject) => {
        // find the player
        let player = await playerRepository.findOne({
          where: { playerId: stat.id },
        });
        // find the stats
        let existingMatchStat = await matchStatRepository.findOne({
          where: { playerIdFull: stat.id, matchIdFull: match.matchId },
        });
        // update the stat is it already exists
        if (existingMatchStat) {
          existingMatchStat.statsJSON = stat;
          await matchStatRepository.save(existingMatchStat);
          // console.log(
          //   `updated stats for: ${player.name} matchId: ${match.matchId}`,
          // );
        } else {
          // create new stat otherwise
          await matchStatRepository.save({
            matchIdFull: match.matchId,
            playerIdFull: stat.id,
            statsJSON: stat,
            player: player,
            match: match,
          });
          // console.log(
          //   `saved stats for: ${player.name} matchId: ${match.matchId}`,
          // );
        }
        resolve();
      });
    });
    resolve();
  });
}
