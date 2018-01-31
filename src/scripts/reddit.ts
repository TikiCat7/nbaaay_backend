const snoowrap = require('snoowrap');
const moment = require('moment');
const fs = require('fs');
const axios = require('axios');
const {savePostGameThreadOrUpdate} = require('./db');
const { forEachSeries } = require('p-iteration');

const r = new snoowrap({
  userAgent: `${process.env.REDDIT_USERNAME} test app from nodejs`,
  clientId: process.env.REDDIT_CLIENT_ID,
  clientSecret: process.env.REDDIT_CLIENT_SECRET,
  username: process.env.REDDIT_USERNAME,
  password: process.env.REDDIT_PASSWORD
});

const TEAM_NAMES = {
  'Atlanta Hawks': '1610612737',
  'Boston Celtics': '1610612738',
  'Brooklyn Nets': '1610612751',
  'Charlotte Hornets': '1610612766',
  'Chicago Bulls': '1610612741',
  'Cleveland Cavaliers': '1610612739',
  'Dallas Mavericks': '1610612742',
  'Denver Nuggets': '1610612743',
  'Detroit Pistons': '1610612765',
  'Golden State': '1610612744',
  'Houston Rockets': '1610612745',
  'Indiana Pacers': '1610612754',
  'LA Clippers': '1610612746',
  'Los Angeles Lakers': '1610612747',
  'Memphis Grizzlies': '1610612763',
  'Miami Heat': '1610612748',
  'Milwaukee Bucks': '1610612749',
  'Minnesota Timberwolves':'1610612750',
  'New Orleans Pelicans': '1610612740',
  'New York Knicks': '1610612752',
  'Oklahoma City Thunder': '1610612760',
  'Orlando Magic': '1610612753',
  'Philadelphia 76ers': '1610612755',
  'Phoenix Suns': '1610612756',
  'Portland Trail Blazers': '1610612757',
  'Sacramento Kings': '1610612758',
  'San Antonio Spurs': '1610612759',
  'Toronto Raptors': '1610612761',
  'Utah Jazz': '1610612762',
  'Washington Wizards': '1610612764'
}

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

async function findGameThreads(recentMatches, matchRepository, startOfToday) {
  return new Promise(async(resolve, reject) => {
    let gameThreadsToCreate = [];
    let posts = await r.getSubreddit('nba').search({ sort: 'top', query: `GAME THREAD`, syntax: 'cloudsearch', time: 'day'});
    console.log('----- retrieved list of posts with GAME THREAD query -----');
    if (posts.length > 0) {
      await forEachSeries(posts, async(post, i) => {
        console.log(post.title);
        if (post.link_flair_text === 'Game Thread') {
          // console.log(post)
          if (post.title.includes(`${startOfToday.format('MMMM DD, YYYY')}`) || post.title.includes(`${startOfToday.format('MMM D, YYYY')}`) || post.title.includes(`${startOfToday.format('MMM. D, YYYY')}`)  || post.title.includes(`${startOfToday.format('MMM. DD, YYYY')}`) || post.title.includes(`${startOfToday.format('MM DD , YYYY')}`)) {
            console.log(' ---------- passed the title name test -----------');
            console.log(post.url);
            // console.log(post.title);
            const match = await figureOutWhatMatchItIs(post.title, startOfToday.format('YYYYMMDD'), matchRepository);

            // if match was found, create the thread record
            if (match) {
              console.log('match was found against DB records');
              // console.log(match);
              let fullCommentsFromReddit = await post.expandReplies({ limit: 1, depth: 1 }).then(data => { return data.comments.toJSON() }).catch(error => console.log(error));
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

              gameThreadsToCreate.push({
                match: match[0],
                gameThread: post,
                fullCommentsFromReddit,
                topComments,
              });
            }
          }
        }
      });
    }
    // return list of gameThreads to create
    resolve(gameThreadsToCreate);
  });
}

async function figureOutWhatMatchItIs(title, date, matchRepository) {
  return new Promise(async(resolve, reject) => {
    const teams = Object.keys(TEAM_NAMES);
    let teamsFoundInTitle = [];
    for (let team of teams) {
      if (title.includes(team)) {
        console.log(TEAM_NAMES[team]);
        teamsFoundInTitle.push(TEAM_NAMES[team]);
      };
    }
    console.log(date, teamsFoundInTitle[0], teamsFoundInTitle[1]);
    // if the game match exists & its within 6 hours of the match ending > we should create or update the thread record
    const possible1 = await matchRepository.find({where: { startDateEastern: date, hTeamId: teamsFoundInTitle[0], vTeamId: teamsFoundInTitle[1]}});
    const possible2 = await matchRepository.find({where: { startDateEastern: date, hTeamId: teamsFoundInTitle[1], vTeamId: teamsFoundInTitle[0]}});

    if (possible1.length === 1) {
      resolve(possible1);
    } else if (possible2.length === 1) {
      resolve(possible2);
    } else {
      resolve(null);
    }
  });
}

async function findPostGameThreads(matchRepository, postGameThreadRepository) {
    // 1. grab todays matches from DB
    // 2. go through each one
    // 3. is it statusNum 3?
    // 4. is it within X hours since the game ended?
    // 5  if both true, update/insert post game record
    //    1.
    // 6. if statusNum isn't 3, game is not over so wait
    // 7 if it isn't within X hours dont update anymore

  return new Promise(async(resolve,reject) => {
    const finishedMatches = await matchRepository.find({where: { statusNum : 3}});
    let postGameThreads = await r.getSubreddit('nba').search({ sort: 'new', query: `Post Game Thread`, syntax: 'cloudsearch', time: 'day'});
    console.log('----- retrieved list of posts with POST GAME THREAD query -----');
    await forEachSeries(finishedMatches, async match => {
      // console.log(moment().diff(moment(match.endTimeUTC), 'hours'));
      if (moment().diff(moment(match.endTimeUTC), 'hours') > 12) {
        // console.log('6 hours+ since game ended');
      } else {
        console.log('hasnt been 12 hours since game');
        const hTeamName = TRI_CODE_TO_TEAM_NAME[match.hTeamTriCode];
        const vTeamName = TRI_CODE_TO_TEAM_NAME[match.vTeamTriCode];
        console.log(`hteam name according to match record: ${hTeamName}`);
        console.log(`vteam name according to match record: ${vTeamName}`);

        for (let i =0; i<postGameThreads.length; i++) {
          // TODO: consider case of multiple threads being created when game ends, figure out how to determine which one is the correct one
          if (postGameThreads[i].title.includes(hTeamName) && postGameThreads[i].title.includes(vTeamName)) {
            console.log(`Found a post game thread: ${postGameThreads[i].title}`);
            let fullCommentsFromReddit = await postGameThreads[i].expandReplies({ limit: 1, depth: 1 }).then(data => { return data.comments.toJSON() }).catch(error => console.log(error));
            let topComments = await postGameThreads[i].expandReplies({ limit: 1, depth: 1 }).then(data => {
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
            await savePostGameThreadOrUpdate(postGameThreads[i], fullCommentsFromReddit, topComments, match.id, match.matchId, postGameThreadRepository, matchRepository);
            console.log('done saving to db');
          }
        }
      }
    });
    resolve();
  })
}

const youtubeApiKey = 'AIzaSyCwrAJB7iMG7KzGlUSLOks1QxRIwQ8ezF4';

module.exports = {
  findGameThreads,
  findPostGameThreads
};

