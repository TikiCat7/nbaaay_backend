const axios = require('axios');
const MATCH_STATS_URL="https://nlnbamdnyc-a.akamaihd.net/fs/nba/feeds_s2012/stats/2018/boxscore/"

async function matchStatCollector(games, matchRepository) {
  for (const game of games) {
    let result = await axios.get(`https://nlnbamdnyc-a.akamaihd.net/fs/nba/feeds_s2012/stats/2018/boxscore/${game.gameId}.js`);
    let statJSON = JSON.parse(result.data.split('var g_boxscore=')[1]);
    const existingMatch = await matchRepository.findOne({where: {matchId: game.gameId}});
    console.log(existingMatch);
    existingMatch.gameClock = statJSON.score.periodTime.gameClock;
    await matchRepository.save(existingMatch);
    console.log('match updated');
  }
  console.log('all done');
}

export default matchStatCollector;
