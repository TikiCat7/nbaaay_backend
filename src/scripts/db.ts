import "reflect-metadata";
import {Match} from "../entity/Match";
import {Thread} from "../entity/Thread";
import {PostGameThread} from "../entity/PostGameThread";
import {getConnection} from "typeorm";
const { forEachSeries } = require('p-iteration');

// Receive list of matches for current day. Create match records, or update them.
// Keep updating untill match is over "statusNum: 3"
async function saveMatchesOrUpdate(games, matchRepository) {
  await forEachSeries(games, async(game) => {
    const existingMatch = await matchRepository.findOne({where: {matchId: game.gameId}});
    // if match exists and it's not over, update it
    if (existingMatch && existingMatch.statusNum !== 3) {
      console.log('match exists, updating now...');
      existingMatch.isGameActivated = game.isGameActivated;
      existingMatch.hTeamScore = game.hTeam.score;
      existingMatch.vTeamScore = game.vTeam.score;
      existingMatch.statusNum = game.statusNum;
      existingMatch.hTeamWins = game.hTeam.win;
      existingMatch.hTeamLosses = game.hTeam.loss;
      existingMatch.vTeamWins = game.vTeam.win;
      existingMatch.vTeamLosses = game.vTeam.loss;
      existingMatch.currentPeriod = game.period.current;
      existingMatch.periodType = game.period.type;
      existingMatch.maxRegular = game.period.maxRegular;
      existingMatch.isHalfTime = game.period.isHalftime;
      existingMatch.isEndOfPeriod = game.period.isEndOfPeriod;

      try {
        // update the match record
        await matchRepository.save(existingMatch);
      } catch(error) {
        console.log(error);
      }
    } else if (existingMatch && existingMatch.statusNum === 3) {
      existingMatch.endTimeUTC = game.endTimeUTC;
      existingMatch.isGameActivated = game.isGameActivated;
      existingMatch.currentPeriod = game.period.current;
      existingMatch.periodType = game.period.type;
      existingMatch.maxRegular = game.period.maxRegular;
      existingMatch.isHalfTime = game.period.isHalftime;
      existingMatch.isEndOfPeriod = game.period.isEndOfPeriod;
      //if match already exists as status 3, game is over, dont do anything
      // console.log('match exists and is already statusNum 3, so nothing to do');
      try {
        // console.log('here but not actually saving');
        await matchRepository.save(existingMatch);
      } catch(error) {
        console.log(error);
      }
      return;
    // if match doesn't exist, create a record
    } else {
      // console.log('match doesnt exist, creating new record now...');
      // console.log(game.startTimeUTC);
      // console.log('----------------------------------');
      // console.log(game);
      const match = {
        matchId: game.gameId,
        startDateEastern: game.startDateEastern,
        startTimeUTCString: game.startTimeUTC,
        startTimeUTC: new Date(game.startTimeUTC),
        endTimeUTC: game.endTimeUTC ? game.endTimeUTC : new Date(),
        isGameActivated: game.isGameActivated,
        hTeamId: game.hTeam.teamId,
        hTeamWins: game.hTeam.win,
        hTeamLosses: game.hTeam.loss,
        hTeamTriCode: game.hTeam.triCode,
        hTeamScore: game.hTeam.score,
        vTeamId: game.vTeam.teamId,
        vTeamWins: game.vTeam.win,
        vTeamLosses: game.vTeam.loss,
        vTeamTriCode: game.vTeam.triCode,
        vTeamScore: game.vTeam.score,
        statusNum: game.statusNum,
        currentPeriod: game.period.current,
        periodType: game.period.type,
        maxRegular: game.period.maxRegular,
        isHalfTime: game.period.isHalftime,
        isEndOfPeriod: game.period.isEndOfPeriod,
      };
      try {
        await matchRepository.save(match);
      } catch(error) {
        console.log(error);
      }
    }
   });
}

async function saveMatches(matches, matchRepository) {
  const matchesPrepared = matches.map(game => {
    return {
      matchId: game.gameId,
      startTimeUTC: game.startTimeUTC,
      endTimeUTC: game.endTimeUTC ? game.endTimeUTC : '',
      isGameActivated: game.isGameActivated,
      hTeamId: game.hTeam.teamId,
      hTeamTriCode: game.hTeam.triCode,
      hTeamScore: game.hTeam.score,
      vTeamId: game.vTeam.teamId,
      vTeamTriCode: game.vTeam.triCode,
      vTeamScore: game.vTeam.score
    };
  });
  try {
    await getConnection().createQueryBuilder()
    .insert()
    .into(Match)
    .values(
      matchesPrepared
    )
    .execute();
  } catch(error) {
    console.log(error);
    console.log('this match already in db');
  }
}

async function saveGameThreads(gameThreads, matchRepository, threadRepository) {
  await forEachSeries(gameThreads, async(game) => {
      const gameThreadToUpdate = await threadRepository.findOne({where: {postId: game.gameThread.id}})
      if (gameThreadToUpdate) {
        // console.log(`game thread ${game.gameThread.title} was found, updating record now...`);
        gameThreadToUpdate.author = await game.gameThread.author.name;
        gameThreadToUpdate.created = game.gameThread.created_utc;
        gameThreadToUpdate.down = parseInt(game.gameThread.downs);
        gameThreadToUpdate.ups = parseInt(game.gameThread.ups);
        gameThreadToUpdate.matchId = game.match.id;
        gameThreadToUpdate.url = game.gameThread.url;
        gameThreadToUpdate.title = game.gameThread.title;
        gameThreadToUpdate.score = parseInt(game.gameThread.score);
        gameThreadToUpdate.numComments = parseInt(game.gameThread.num_comments);
        gameThreadToUpdate.postId = game.gameThread.id;
        gameThreadToUpdate.fullCommentsFromReddit = game.fullCommentsFromReddit;
        gameThreadToUpdate.topComments = game.topComments;

        try {
          await threadRepository.save(gameThreadToUpdate);
        } catch(error) {
          console.log(error);
        }
      } else {
        // console.log(`game thread ${game.gameThread.id} was not found, creating new record now & updating match record link`);
        // console.log(game.gameThread);
        let gameThread = new Thread();
        gameThread.author = await game.gameThread.author.name;
        gameThread.created = game.gameThread.created_utc;
        gameThread.down = parseInt(game.gameThread.downs);
        gameThread.ups = parseInt(game.gameThread.ups);
        gameThread.matchId = game.match.id;
        gameThread.url = game.gameThread.url;
        gameThread.title = game.gameThread.title;
        gameThread.score = parseInt(game.gameThread.score);
        gameThread.numComments = parseInt(game.gameThread.num_comments);
        gameThread.postId = game.gameThread.id;
        gameThread.fullCommentsFromReddit = game.fullCommentsFromReddit;
        gameThread.topComments = game.topComments;
        try {
          await threadRepository.save(gameThread);
          await matchRepository.updateById(game.match.id , { thread: gameThread });
        } catch(error) {
          console.log(error);
        }
      }
  });
}

async function savePostGameThreadOrUpdate(targetThread, fullCommentsFromReddit, topComments, id, matchId, postGameThreadRepository, matchRepository) {
  // console.log(`goign to save ${targetThread.title}`);
  const postGameThread = await postGameThreadRepository.findOne({where: {postId: targetThread.id}});
  if (postGameThread) {
    // already exists, update it since its still < 12 hours
    // console.log(`post game thread ${postGameThread.title} was found, updating record now...`);
    postGameThread.author = await targetThread.author.name;
    postGameThread.created = targetThread.created_utc;
    postGameThread.down = parseInt(targetThread.downs);
    postGameThread.ups = parseInt(targetThread.ups);
    postGameThread.matchId = matchId;
    postGameThread.url = targetThread.url;
    postGameThread.title = targetThread.title;
    postGameThread.score = parseInt(targetThread.score);
    postGameThread.numComments = parseInt(targetThread.num_comments);
    postGameThread.postId = targetThread.id;
    postGameThread.fullCommentsFromReddit = fullCommentsFromReddit;
    postGameThread.topComments = topComments;

    try {
      await postGameThreadRepository.save(postGameThread);
    } catch(error) {
      console.log(error);
    }
  } else {
    // doesn't exist, need to create
    // console.log('doesnt exist');
    let threadToSave = new PostGameThread();
    threadToSave.author = await targetThread.author.name;
    threadToSave.created = targetThread.created_utc;
    threadToSave.down = parseInt(targetThread.downs);
    threadToSave.ups = parseInt(targetThread.ups);
    threadToSave.matchId = matchId;
    threadToSave.url = targetThread.url;
    threadToSave.title = targetThread.title;
    threadToSave.score = parseInt(targetThread.score);
    threadToSave.numComments = parseInt(targetThread.num_comments);
    threadToSave.postId = targetThread.id;
    threadToSave.fullCommentsFromReddit = fullCommentsFromReddit;
    threadToSave.topComments = topComments;

    try {
      await postGameThreadRepository.save(threadToSave);
      await matchRepository.updateById(id , { postGameThread: threadToSave });
    } catch(error) {
      console.log(error);
    }
  }
}

module.exports = {
  saveMatches,
  saveGameThreads,
  saveMatchesOrUpdate,
  savePostGameThreadOrUpdate,
}
