import "reflect-metadata";
import { createConnection } from "typeorm";
import { Match } from "../entity/Match";
import { YoutubeVideo } from "../entity/YoutubeVideo";
import { Player } from '../entity/Player';
const { videoFromChannel } = require('./youtube');
const { findAndSaveYoutubeVideos } = require('./videoSave');

const moment = require('moment');
const { forEachSeries } = require('p-iteration');

async function mainLoop(connection, dateFormatted, dateFormattedYesterday, date) {
  return new Promise(async(resolve, reject) => {
    const matchRepository = connection.getRepository(Match);
    const youtubeVideoRepository = connection.getRepository(YoutubeVideo);
    const playerRepository = connection.getRepository(Player);

    // YOUTUBE VIDEOS

    // MLG Highlights
    await findAndSaveYoutubeVideos(matchRepository, youtubeVideoRepository, playerRepository, dateFormatted, 'UCoh_z6QB0AGB1oxWufvbDUg');
    // NBA
    await findAndSaveYoutubeVideos(matchRepository, youtubeVideoRepository, playerRepository, dateFormatted, 'UCWJ2lWNubArHWmf3FIHbfcQ');
    // Ximo Pierto - deleted
    // await findAndSaveYoutubeVideos(matchRepository, youtubeVideoRepository, playerRepository, dateFormatted, 'UCcuuNqCH-CiHbvXihwTOGrA');
    // Ximo Highlights - deleted
    // await findAndSaveYoutubeVideos(matchRepository, youtubeVideoRepository, playerRepository, dateFormatted, 'UCawKxKSbK4S3RQArUJHWb6w');
    // GD's Lastest Highlights
    await findAndSaveYoutubeVideos(matchRepository, youtubeVideoRepository, playerRepository, dateFormatted, 'UCd_EkHbEutirFl_XSrg95kA');
    // House of highlights
    await findAndSaveYoutubeVideos(matchRepository, youtubeVideoRepository, playerRepository, dateFormatted, 'UCqQo7ewe87aYAe7ub5UqXMw');
    // Free dawkins
    await findAndSaveYoutubeVideos(matchRepository, youtubeVideoRepository, playerRepository, dateFormatted, 'UCEjOSbbaOfgnfRODEEMYlCw');
    // Rapid Hihglights
    await findAndSaveYoutubeVideos(matchRepository, youtubeVideoRepository, playerRepository, dateFormatted, 'UCdxB6UoY7VggXoaOSvEhSjg');

    resolve()
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
    console.log('Finished with youtube update loop run');
    // setInterval( () => mainLoop(connection, dateFormatted, date), 20000);
  });
});
