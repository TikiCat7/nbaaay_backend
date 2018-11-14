import "reflect-metadata";
import {createConnection} from "typeorm";
import {Match} from "./entity/Match";
import {Thread} from "./entity/Thread";
import {User} from "./entity/User";
import {Profile} from "./entity/Profile";
import {YoutubeVideo} from "./entity/YoutubeVideo";
import {Player} from "./entity/Player";
import {videoFromChannel} from './scripts//youtube';
import axios from 'axios';
import { Streamable } from "./entity/Streamable";
const moment = require('moment');
const Fuse = require('fuse.js');
const teams = require('./scripts/teamId');

const snoowrap = require('snoowrap');
const { forEachSeries, forEach } = require('p-iteration');

console.log(process.env);
const r = new snoowrap({
  userAgent: `${process.env.REDDIT_USERNAME} test app from nodejs`,
  clientId: process.env.REDDIT_CLIENT_ID,
  clientSecret: process.env.REDDIT_CLIENT_SECRET,
  username: process.env.REDDIT_USERNAME,
  password: process.env.REDDIT_PASSWORD
});

function mainLoop() {
  createConnection().then(async connection => {
    let matchRepository = await connection.getRepository(Match);
    let gameThreadRepository = await connection.getRepository(Thread);
    let youtubeVideoRepository = connection.getRepository(YoutubeVideo);
    let streamableRepository = connection.getRepository(Streamable);
    let playerRepository = connection.getRepository(Player);

    const dateFormatted = moment().subtract(1, 'd').format('YYYYMMDD');
    const todaysMatches = await matchRepository.find({ where: { startDateEastern: dateFormatted }});
    const momentArray = todaysMatches.map((match) => moment(match.startTimeUTC).utc());
    const firstGameTime = moment.min(momentArray);
    console.log(firstGameTime.format());

      // grabPlayerNames(playerRepository);
      let date = new Date();
      try {
        const streamables = await findStreamablePosts(date, r);
        const formattedStremables = await formatStreamablePosts(streamables);
        await saveAndUpdateStreamables(formattedStremables, streamableRepository, matchRepository);
        // await determineMatchAndPlayer('LeBron James with the Rejection!', playerRepository, todaysMatches);

      } catch(error) {
        console.log(error);
      }
  }).catch(error => console.log(error));
}

mainLoop();

// determines which match video is for, and which player it is for based on title. Can also return no match.
// returns an object
// { matchId: '', primaryPlayerId: ''}

async function determineMatchAndPlayer(title, playerRepository, todaysMatches) {
  console.log(`title to decipher: ${title}`);
  let match = false;
  let flag = [];
  await forEachSeries(todaysMatches, async(match,i) => {
    console.log(match.hTeamTriCode);
    console.log(match.vTeamTriCode);
      let homeTeamPlayers = await playerRepository.find({ where: { teamTriCode: match.hTeamTriCode }});
      let awayTeamPlayers = await playerRepository.find({ where: { teamTriCode: match.vTeamTriCode }});

      homeTeamPlayers.forEach(player => {
        console.log(player.name);
        title.includes(player.name) ? flag.push(player.name): null;
      })

      awayTeamPlayers.forEach(player => {
        console.log(player.name);
        title.includes(player.name) ? flag.push(player.name): null;
      })

      homeTeamPlayers.forEach(player => {
        console.log(player.name);
        title.includes(player.lastName) ? flag.push(player.name): null;
      })

      awayTeamPlayers.forEach(player => {
        console.log(player.name);
        title.includes(player.lastName) ? flag.push(player.name): null;
      })

      homeTeamPlayers.forEach(player => {
        console.log(player.name);
        title.includes(player.firstName) ? flag.push(player.name): null;
      })

      awayTeamPlayers.forEach(player => {
        console.log(player.name);
        title.includes(player.firstName) ? flag.push(player.name): null;
      })
  });
  console.log(flag);
}

async function analyzeVideoTitle(title, todaysMatches, teams) {
  let matchedTeams = [];
  let matchedPlayers = [];

  var options = {
    keys: ['title'],
    threshold: 0.3,
  };
  var fuse = new Fuse([
    {title: 'Los Angeles Lakers vs Philadelphia 76ers 1st Qtr Highlights / Week 5 / 2017 NBA Season'},
  ], options)

  for(let team of teams) {
    if (fuse.search(team.name).length > 0) {
      matchedTeams.push(team);
    }
  }
  console.log(matchedTeams);
}

// save every player in the NBA as Player record
async function grabPlayerNames(playerRepository) {
  console.log(teams.length);
  await forEachSeries(teams, async(team, i) => {
    const FETCH_URL = `http://stats.nba.com/stats/commonteamroster?LeagueID=00&Season=2018-19&TeamID=${team.id}`;
    console.log(FETCH_URL);
    const players = await axios.get(FETCH_URL).then(res => res.data.resultSets[0].rowSet);

    await forEachSeries(players, async(player, i) => {
      try {
        let playerToSave = new Player();
        // console.log(`going to save ${player[3]}`);
        playerToSave.name = player[3];
        playerToSave.firstName = player[3].split(' ')[0];
        playerToSave.lastName = player[3].split(' ')[1] ? player[3].split(' ')[1] : '';
        playerToSave.number = player[4];
        playerToSave.position = player[5];
        playerToSave.height = player[6];
        playerToSave.weight = player[7];
        playerToSave.birthdate = player[8];
        playerToSave.age = player[9];
        playerToSave.playerId = player[12];
        playerToSave.teamId = team.id;
        playerToSave.teamName = team.name;
        playerToSave.teamTriCode = team.tri;

        playerRepository.save(playerToSave);
      } catch(error) {
        console.log(error);
      }
    });
  });
}

// find streamable clips posted on r/nba within a specific time frame.
// attempt to figure out what game they are for, and save them accordingly
async function findStreamablePosts(date: Date, r: any) {
  try {
    let newPosts = await r.getSubreddit('nba').search({ sort: 'new', time: 'day' });
    let hotPosts = await r.getSubreddit('nba').search({ sort: 'hot', time: 'day' });
    let topPosts = await r.getSubreddit('nba').search({ sort: 'top', time: 'day' });
    let streamablePosts = [];
    newPosts.forEach((post) => {
      if(post.url.includes('streamable')) {
        streamablePosts.push(post);
      }
    });
    hotPosts.forEach((post) => {
      if(post.url.includes('streamable')) {
        streamablePosts.push(post);
      }
    });
    topPosts.forEach((post) => {
      if(post.url.includes('streamable')) {
        streamablePosts.push(post);
      }
    });
    console.log(`Found ${streamablePosts.length} new posts`);
    // TODO DEDUPE DUPLICATE STREAMABLE CLIPS
    return streamablePosts;
  } catch(error) {
    throw new Error(error);
  }
}

async function formatStreamablePosts(streamablePosts) {
  let result = [];
  try {
    await forEach(streamablePosts, async (post) => {
      console.log(post.title);
      let fullComments = await post.expandReplies({ limit: 1, depth: 1 }).then(data => { return data.comments.toJSON() }).catch(error => console.log(error));
      let topComments = await post.expandReplies({ limit: 1, depth: 1 }).then(data => {
        return data.comments.toJSON().map(topPost => {
          return {
            body: topPost.body,
            body_html: topPost.body_html,
            ups: topPost.ups,
            score: topPost.score,
            author: topPost.author,
            gilded: topPost.gilded,
          };
        });
      }).catch(error => console.log(error));
      result.push({
        fullComments,
        topComments,
        post,
      });
    });
    return result;
  } catch(error) {
    throw new Error(error);
  }
}

async function saveAndUpdateStreamables(formattedStremables, streamableRepository, matchRepository) {
  await forEachSeries(formattedStremables, async streamable => {
    try {
      const existingStreamable = await streamableRepository.findOne({where: {postId: streamable.post.id}});

      if (existingStreamable) {
        // stremable already exists in DB, update it
        console.log(`streamable already exists, going to update it : ${streamable.post.title}...`);
        existingStreamable.score = streamable.post.score;
        existingStreamable.numComments = streamable.post.num_comments;
        existingStreamable.fullCommentsFromReddit = streamable.fullComments;
        existingStreamable.topComments = streamable.topComments;
        await streamableRepository.save(existingStreamable);
      } else {
        // stremale doesn't exist, save a new one
        console.log(`attempting to save streamable: ${streamable.post.title}...`);
        let streamableToSave = new Streamable();
        // TO DO figure out what match this streamable is from...
        streamableToSave.matchId = '63';
        streamableToSave.author = await streamable.post.author.name;
        streamableToSave.created = streamable.post.created_utc;
        streamableToSave.url = streamable.post.url;
        streamableToSave.title = streamable.post.title;
        streamableToSave.score = streamable.post.score;
        streamableToSave.numComments = streamable.post.num_comments;
        streamableToSave.postId = streamable.post.id;
        streamableToSave.fullCommentsFromReddit = streamable.fullComments;
        streamableToSave.topComments = streamable.topComments;

        await streamableRepository.save(streamableToSave);
      }
    } catch(error) {
      console.log(error);
    }
  });
}

// grab pbp data for a match and save / update record.
async function grabPbPAndSave(matchId: string) {

}

// grab match stats data for a match and save / update record.
async function grabMatchStatsAndSave(matchId: string) {

}
