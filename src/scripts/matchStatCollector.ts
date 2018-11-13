const axios = require('axios');

async function matchStatCollector(games, matchRepository) {
  for (const game of games) {
    try {
      let result = await axios.get(`https://nlnbamdnyc-a.akamaihd.net/fs/nba/feeds_s2012/stats/2018/boxscore/${game.gameId}.js`);
      let statJSON = JSON.parse(result.data.split('var g_boxscore=')[1]);
      const existingMatch = await matchRepository.findOne({where: {matchId: game.gameId}});
      console.log(statJSON.score.home);
      console.log(statJSON.score.visitor);
      // update the game clock
      existingMatch.gameClock = statJSON.score.periodTime.gameClock;
      // update the match score
      existingMatch.hTeamScore = statJSON.score.home.score;
      existingMatch.vTeamScore = statJSON.score.visitor.score;

      // update the quarter scores
      existingMatch.hTeamQScore = statJSON.score.home.qScore;
      existingMatch.vTeamQScore = statJSON.score.visitor.qScore;
      await matchRepository.save(existingMatch);
      console.log(`Updated game time for ${existingMatch.hTeamTriCode} vs ${existingMatch.vTeamTriCode}, Time: ${existingMatch.gameClock}`);
    } catch(error) {
      console.log('match didnt start probably');
    }
  }
  console.log('Done updating time and stats');
}

export default matchStatCollector;
