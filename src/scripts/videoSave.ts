const { forEachSeries } = require('p-iteration');
import {videoFromChannel} from './youtube';
import {YoutubeVideo} from "../entity/YoutubeVideo";

// 1. grab list of todays matches
// 2. for each one make a search against the primary highlight channels using the match name and game start time
// 3. save those matches as a youtube record with a link to the match record it is associated with

const TRI_CODE_TO_TEAM_NAME = {
  'ATL': 'Atlanta Hawks',
  'BOS': 'Boston Celtics',
  'BKN': 'Brooklyn Nets',
  'CHA': 'Charlotte Hornets',
  'CHI': 'Chicago Bulls',
  'CLE': 'Cleveland Cavaliers',
  'DAL': 'Dallas Mavericks',
  'DEN': 'Denver Nuggets',
  'DET': 'Detroit Pistons',
  'GSW': 'Golden State',
  'HOU': 'Houston Rockets',
  'IND': 'Indiana Pacers',
  'LAC': 'Los Angeles Clippers',
  'LAL': 'Los Angeles Lakers',
  'MEM': 'Memphis Grizzlies',
  'MIA': 'Miami Heat',
  'MIL': 'Milwaukee Bucks',
  'MIN': 'Minnesota Timberwolves',
  'NOP': 'New Orleans Pelicans',
  'NYK': 'New York Knicks',
  'OKC': 'Oklahoma City Thunder',
  'ORL': 'Orlando Magic',
  'PHI': 'Philadelphia 76ers',
  'PHX': 'Phoenix Suns',
  'POR': 'Portland Trail Blazers',
  'SAC': 'Sacramento Kings',
  'SAS': 'San Antonio Spurs',
  'TOR': 'Toronto Raptors',
  'UTA': 'Utah Jazz',
  'WAS': 'Washington Wizards'
}

function matchNotFresh(endTimeUTC) {
  // Average UTC time in US
  let now = moment().subtract(6.5, 'hours');
  // server time is UTC +0 hours
  let end = moment(endTimeUTC);
  // Time since game end
  let duration = moment.duration(now.diff(end));
  let hours = duration.asHours();
  console.log(`Time since match ended: ${hours}`);
  return hours > 8;
}

async function findAndSaveYoutubeVideos(matchRepository, youtubeVideoRepository, playerRepository, dateFormatted: String, channelId: String) {
  return new Promise(async (resolve, reject) => {
    try {
      console.log('find and save youtube videos called');
      // find all matches in match collection with start date of today
      const todaysMatches = await matchRepository.find({ where: { startDateEastern: dateFormatted }});
      console.log(`found ${todaysMatches.length} matches.`);
      await forEachSeries(todaysMatches, async(match) => {
        if(match.statusNum === 3 && matchNotFresh(match.endTimeUTC)) {
          console.log('match is finished and 10+ hours since ended, dont search for videos');
        } else  if(match.statusNum === 3 && !matchNotFresh(match.endTimeUTC)) {
          console.log('ready to look for videos, match is over but < 8 hours since it ended');
          console.log(TRI_CODE_TO_TEAM_NAME[match.hTeamTriCode], TRI_CODE_TO_TEAM_NAME[match.vTeamTriCode]);
          const videos = await videoFromChannel(channelId, `${TRI_CODE_TO_TEAM_NAME[match.hTeamTriCode]} | ${TRI_CODE_TO_TEAM_NAME[match.vTeamTriCode]}`, moment(match.startTimeUTCString).toISOString());

          if (videos.items.length > 0) {
            await saveVideosToDB(matchRepository, youtubeVideoRepository, playerRepository, videos.items, match.id);
            console.log(`finished saving videos for match: ${match.id}`)
          }
        } else if (match.statusNum === 2) {
          console.log('ready to look for videos, match is active');
          console.log(TRI_CODE_TO_TEAM_NAME[match.hTeamTriCode], TRI_CODE_TO_TEAM_NAME[match.vTeamTriCode]);
          const videos = await videoFromChannel(channelId, `${TRI_CODE_TO_TEAM_NAME[match.hTeamTriCode]} | ${TRI_CODE_TO_TEAM_NAME[match.vTeamTriCode]}`, moment(match.startTimeUTCString).toISOString());

          if (videos.items.length > 0) {
            await saveVideosToDB(matchRepository, youtubeVideoRepository, playerRepository, videos.items, match.id);
            console.log(`finished saving videos for match: ${match.id}`)
          }
        } else {
          console.log('match is not yet active, dont look for youtube videos');
        }
      })
      console.log('finished going through each match for youtube videos');
      resolve('done fetching videos');
    } catch(error) {
      reject(error);
    }
  });
}

async function saveVideosToDB(matchRepository, youtubeVideoRepository, playerRepository, videos, matchRecordId) {
  console.log('inside saveVideosToDB function');
  return new Promise(async(resolve, reject) => {
    await await forEachSeries(videos, async(video) => {
      try {
        let exists = await youtubeVideoRepository.find({where: { videoId: video.id.videoId }});
        if (exists.length === 1) {
          console.log('video exists already, skip');
        } else {
          console.log(`Video doesn't exist, attempting to save video: ${video.snippet.title}`);
          let videoToSave = new YoutubeVideo();
          let { type, playerId, duelIds } = await determineVideoTypeFromTitle(video.snippet.title, playerRepository);
          console.log('------------------')
          console.log(type, playerId, duelIds);
          console.log('------------------')
          videoToSave.channelTitle = video.snippet.channelTitle;
          videoToSave.channelId = video.snippet.channelId;
          videoToSave.description = video.snippet.description;
          videoToSave.videoId = video.id.videoId;
          videoToSave.videoType = type;
          videoToSave.title = video.snippet.title;
          videoToSave.matchId = matchRecordId;
          videoToSave.publishedAt = new Date(video.snippet.publishedAt);
          videoToSave.publishedAtString = video.snippet.publishedAt;
          videoToSave.thumbnailUrlLarge = video.snippet.thumbnails.high.url;
          videoToSave.thumbnailUrlMedium = video.snippet.thumbnails.medium.url;
          videoToSave.thumbnailUrlSmall = video.snippet.thumbnails.default.url;
          if(playerId) {
            let player1 = await playerRepository.find({where: {id: playerId}});
            videoToSave.player = player1;
          } else if (duelIds) {
            let player1 = await playerRepository.find({where: {id: duelIds[0]}});
            let player2 = await playerRepository.find({where: {id: duelIds[1]}});
            videoToSave.player = [...player1, ...player2];
          }
          videoToSave.match = await matchRepository.find({where: {id: matchRecordId}});
          await youtubeVideoRepository.save(videoToSave);
        }
      } catch(error) {
        console.log(error);
        // console.log('error? might be type orm thing');
      }
    });
    resolve();
  });
}

async function determineVideoTypeFromTitle(title: String, playerRepository) {
  let type;
  let playerId = undefined;
  let duelIds = undefined;
  let name = title.split(' ')[0] + ' ' + title.split(' ')[1];
  console.log(name);
  let titleLowerCase = title.toLowerCase();
  if (titleLowerCase.includes('interview')) {

    let player = await playerRepository.find({ where: {name: name}});

      if (player.length === 1) {
        type = `interview ${name}`;
        playerId = player[0].id;
      } else {
        type = 'interview unidentified';
      }

    if(titleLowerCase.includes('postgame')) {
      type = type + ' postgame';
    } else if(titleLowerCase.includes('pregame')) {
      type = type + ' pregame';
    }
  } else if (titleLowerCase.includes('highlights')) {
    type = 'highlights';
    if(titleLowerCase.includes('pts') || titleLowerCase.includes('points')) {
      // if it's a player highlight, try to figure out which player it is.
      let player = await playerRepository.find({ where: {name: name}});

      if (player.length === 1) {
        type = `player highlights ${name}`;
        playerId = player[0].id;
      } else {
        type = 'player highlights unidentified';
      }
    }
    else if(titleLowerCase.includes('full game') || title.includes('full highlights')) {
      type = 'full game highlights';
    } else if (titleLowerCase.includes('1st qtr')) {
      type = 'first quarter highlights'
    } else if (titleLowerCase.includes('1st half')) {
      type = 'first half highlights'
    } else if (titleLowerCase.includes('duel') || (titleLowerCase.includes('battle'))) {
      type = 'duel highlights'

      // determine id of both players in the duel
      // CARE THIS IS VERY SPECIFIC, COULD BREAK EASILY BASED ON YOUTUBE TITLE
      let player1Name = title.split("vs")[0].slice(0, -1);;
      let player2Name = title.split("vs")[1].split(" ")[1] + " " +title.split("vs")[1].split(" ")[2];

      let player1 = await playerRepository.find({ where: {name: player1Name}});
      let player2 = await playerRepository.find({ where: {name: player2Name}});

      // if both players can be identified, send back duelIds for each so they are saved in ManyToMany relationship.
      if(player1.length === 1 && player2.length === 1) {
        duelIds = [player1[0].id, player2[0].id];
      } else if (player1.length === 1) {
        playerId = player1.id
      } else if (player2.length === 1) {
        playerId = player2.id
      }
    }
  } else if (titleLowerCase.includes('duel') || (titleLowerCase.includes('battle'))) {
      type = 'duel highlights'

      // determine id of both players in the duel
      // CARE THIS IS VERY SPECIFIC, COULD BREAK EASILY BASED ON YOUTUBE TITLE
      let player1Name = title.split("vs")[0].slice(0, -1);;
      let player2Name = title.split("vs")[1].split(" ")[1] + " " +title.split("vs")[1].split(" ")[2];

      let player1 = await playerRepository.find({ where: {name: player1Name}});
      let player2 = await playerRepository.find({ where: {name: player2Name}});

      // if both players can be identified, send back duelIds for each so they are saved in ManyToMany relationship.
      if(player1.length === 1 && player2.length === 1) {
        duelIds = [player1[0].id, player2[0].id];
      } else if (player1.length === 1) {
        playerId = player1.id
      } else if (player2.length === 1) {
        playerId = player2.id
      }
    } else if(titleLowerCase.includes('&')) {
      type = 'team highlights'

      // determine id of both players in the duel
      // CARE THIS IS VERY SPECIFIC, COULD BREAK EASILY BASED ON YOUTUBE TITLE
      let player1Name = title.split("&")[0].slice(0, -1);
      let player2Name = title.split("&")[1].split(" ")[1] + " " + title.split("&")[1].split(" ")[2] ;

      let player1 = await playerRepository.find({ where: {name: player1Name}});
      let player2 = await playerRepository.find({ where: {name: player2Name}});

      // if both players can be identified, send back duelIds for each so they are saved in ManyToMany relationship.
      if(player1.length === 1 && player2.length === 1) {
        duelIds = [player1[0].id, player2[0].id];
      } else if (player1.length === 1) {
        playerId = player1.id
      } else if (player2.length === 1) {
        playerId = player2.id
      }
    }else {
    type = 'highlights';
  }
  return {type, playerId, duelIds};
}

module.exports = { findAndSaveYoutubeVideos };
