import "reflect-metadata";
import { createConnection } from "typeorm";
import { Match } from "../entity/Match";
import { Thread } from "../entity/Thread";
import { PostGameThread } from "../entity/PostGameThread";
import { YoutubeVideo } from "../entity/YoutubeVideo";
import { Test } from '../entity/Test';
import { Player } from '../entity/Player';
import { Streamable } from '../entity/Streamable';
const { findTodayMatches, checkGameStatus } = require('./nbaAPI');
const { saveMatches, saveGameThreads, saveMatchesOrUpdate } = require('./db');
const { findGameThreads, findPostGameThreads } = require('./reddit');
const { videoFromChannel } = require('./youtube');
const { findAndSaveYoutubeVideos } = require('./videoSave');
const { findStreamablePosts, formatStreamablePosts, saveAndUpdateStreamables } = require("./streamables");
const snoowrap = require('snoowrap');
const Fuse = require('fuse.js');

const moment = require('moment');
const { forEachSeries } = require('p-iteration');

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
  }
}).then(async connection => {
  await grabAllMatches(connection);
});

// populate DB with all match records from 2017/2018 season
async function grabAllMatches(connection) {
  const matchRepository = connection.getRepository(Match);
  const sleep = msec => new Promise(resolve => setTimeout(resolve, msec));
  let x = 0;
  for (x; x < 177; x++) {
    const dateFormatted = moment('2017-10-17').add(x, 'd').format('YYYYMMDD');
    const todaysMatches = await findTodayMatches(dateFormatted);
    await saveMatchesOrUpdate(todaysMatches, matchRepository);
    console.log(`found ${todaysMatches.length} games`);
    console.log(`finished recording matches for ${dateFormatted}`);
    await sleep(1000);
  }
}

