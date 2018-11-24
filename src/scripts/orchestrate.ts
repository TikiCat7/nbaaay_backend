import "reflect-metadata";
import { createConnection } from "typeorm";
import { Match } from "../entity/Match";
import { Thread } from "../entity/Thread";
import {PostGameThread} from "../entity/PostGameThread";
import { YoutubeVideo } from "../entity/YoutubeVideo";
import { Test } from '../entity/Test';
import { Player } from '../entity/Player';
import { Streamable } from '../entity/Streamable';
import { MatchStat } from '../entity/MatchStat';
import axios from 'axios';
const teams = require('../scripts/teamId');
const { findTodayMatches, checkGameStatus } = require('./nbaAPI');
const { saveMatches, saveGameThreads, saveMatchesOrUpdate } = require('./db');
const { findGameThreads, findPostGameThreads } = require('./reddit');
const { videoFromChannel } = require('./youtube');
const { findAndSaveYoutubeVideos } = require('./videoSave');
const { findStreamablePosts, formatStreamablePosts, saveAndUpdateStreamables } = require("./streamables");
const snoowrap = require('snoowrap');
const Fuse = require('fuse.js');

import matchStatCollector from './matchStatCollector';

const moment = require('moment');
const { forEachSeries } = require('p-iteration');

const r = new snoowrap({
  userAgent: `${process.env.REDDIT_USERNAME} test app from nodejs`,
  clientId: process.env.REDDIT_CLIENT_ID,
  clientSecret: process.env.REDDIT_CLIENT_SECRET,
  username: process.env.REDDIT_USERNAME,
  password: process.env.REDDIT_PASSWORD
});

async function mainLoop(connection, dateFormatted, dateFormattedYesterday, date) {
  return new Promise(async(resolve, reject) => {
    const matchRepository = connection.getRepository(Match);
    const threadRepository = connection.getRepository(Thread);
    const postGameThreadRepository = connection.getRepository(PostGameThread);
    const youtubeVideoRepository = connection.getRepository(YoutubeVideo);
    const playerRepository = connection.getRepository(Player);
    const streamableRepository = connection.getRepository(Streamable);
    const matchStatRepository = connection.getRepository(MatchStat)

    // await grabPlayerNames(playerRepository);
    // MATCHES / THREADS / POST GAME THREADS
    const todaysMatches = await findTodayMatches(dateFormatted);
    console.log('todays matches found: ', todaysMatches.length);
    if (todaysMatches.length > 0) {
      await saveMatchesOrUpdate(todaysMatches, matchRepository);
      await matchStatCollector(todaysMatches, matchRepository, matchStatRepository, playerRepository);
      console.log('match record save/update complete');

      const { notStarted, active, over, overRecent } = await checkGameStatus(todaysMatches);
      console.log(notStarted.length, active.length, over.length, overRecent.length);

      const gameThreadsToCreate = await findGameThreads(overRecent, matchRepository, date);
      if (gameThreadsToCreate.length > 0) {
        await saveGameThreads(gameThreadsToCreate, matchRepository, threadRepository)
        console.log('game thread save/update complete');
      }
    }
    await findPostGameThreads(matchRepository, postGameThreadRepository);
    //STREAMABLES
    const streamables = await findStreamablePosts(date, r);
    const formattedStreamables = await formatStreamablePosts(streamables);
    await saveAndUpdateStreamables(formattedStreamables, streamableRepository, matchRepository);
    resolve();
  })
}
createConnection({
  "type": "postgres",
  "host": process.env.POSTGRES_HOST,
  "port": 5432,
  "username": process.env.POSTGRES_USERNAME,
  "password": process.env.POSTGRES_PASSWORD,
  "database": process.env.POSTGRES_DATABASE_NAME,
  "synchronize": true,
  "logging": false,
  "entities": [
    __dirname + '/../entity/**.ts'
  ],
  "migrations": [
    __dirname + '/../migration/**.ts'
  ],
  "subscribers": [
    __dirname + '/../subscriber/**.ts'
  ],
  "cli": {
     "entitiesDir": "src/entity",
     "migrationsDir": "src/migration",
     "subscribersDir": "src/subscriber"
  }}).then(async connection => {
  // grab todays games and continue to update
  const todayDate = moment().subtract(1, 'd').format('YYYYMMDD');
  const yesterdayDate = moment().subtract(2, 'd').format('YYYYMMDD');
  const date = moment().startOf('day').subtract(1, 'd');
  mainLoop(connection, todayDate, yesterdayDate, date).then(() => {
    console.log('Finished with main loop run');
    // setInterval( () => mainLoop(connection, dateFormatted, date), 20000);
  });
});

// populate DB with all match records from 2017/2018 season
async function grabAllMatches(connection) {
  const matchRepository = connection.getRepository(Match);
  const sleep = msec => new Promise(resolve => setTimeout(resolve, msec));
  let x = 0;
  for(x; x<177; x++) {
    const dateFormatted = moment('2017-10-17').add(x, 'd').format('YYYYMMDD');
    const todaysMatches = await findTodayMatches(dateFormatted);
    await saveMatchesOrUpdate(todaysMatches, matchRepository);
    console.log(`found ${todaysMatches.length} games`);
    console.log(`finished recording matches for ${dateFormatted}`);
    await sleep(0);
  }
}

async function grabPlayerNames(playerRepository) {
  console.log(teams.length);
  const sleep = msec => new Promise(resolve => setTimeout(resolve, msec));
  await forEachSeries(teams, async(team, i) => {
    if(i == 30) {
      await sleep(1000);
      const FETCH_URL = `http://stats.nba.com/stats/commonteamroster?LeagueID=00&Season=2018-19&TeamID=${team.id}`;
      console.log(FETCH_URL);
      const players = await axios.get(FETCH_URL).then(res => res.data.resultSets[0].rowSet);
      await forEachSeries(players, async(player, i) => {
        try {
          // let playerToSave = new Player()
          let playerToSave = await playerRepository.find({where: { playerId: player[12]}})
          console.log(playerToSave);
          if(playerToSave.length === 1) {
            playerToSave[0].name = player[3]
            playerToSave[0].firstName = player[3].split(' ')[0];
            playerToSave[0].lastName = player[3].split(' ')[1] ? player[3].split(' ')[1] : '';
            playerToSave[0].number = player[4]
            playerToSave[0].position = player[5];
            playerToSave[0].height = player[6]
            playerToSave[0].weight = player[7];
            playerToSave[0].birthdate = player[8];
            playerToSave[0].age = player[9];
            playerToSave[0].playerId = player[12]
            playerToSave[0].teamId = team.id;
            playerToSave[0].teamName = team.name;
            playerToSave[0].teamTriCode = team.tri;
            console.log('Existing Player Updating', playerToSave);
            await playerRepository.save(playerToSave);
          } else {
            let newPlayer = new Player();
            newPlayer.name = player[3]
            newPlayer.firstName = player[3].split(' ')[0];
            newPlayer.lastName = player[3].split(' ')[1] ? player[3].split(' ')[1] : '';
            newPlayer.number = player[4]
            newPlayer.position = player[5];
            newPlayer.height = player[6];
            newPlayer.weight = player[7];
            newPlayer.birthdate = player[8];
            newPlayer.age = player[9];
            newPlayer.playerId = player[12];
            newPlayer.teamId = team.id;
            newPlayer.teamName = team.name;
            newPlayer.teamTriCode = team.tri;
            console.log('New Player', newPlayer);
            await playerRepository.save(newPlayer);
          }
        } catch(error) {
          console.log(error);
        }
      });
    }
  });
}