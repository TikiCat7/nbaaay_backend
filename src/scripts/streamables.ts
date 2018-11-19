// export {};
import "reflect-metadata";
import {createConnection} from "typeorm";
import {Match} from "../entity/Match";
import {Thread} from "../entity/Thread";
import {User} from "../entity/User";
import {Profile} from "../entity/Profile";
import {YoutubeVideo} from "../entity/YoutubeVideo";
import {Player} from "../entity/Player";
import {videoFromChannel} from '../scripts//youtube';
import axios from 'axios';
import { Streamable } from "../entity/Streamable";
const moment = require('moment');
const Fuse = require('fuse.js');
const teams = require('./teamId');

const snoowrap = require('snoowrap');
const { forEachSeries, forEach } = require('p-iteration');

async function findStreamablePosts(date: Date, r: any) {
  try {
    let topPosts = await r.getSubreddit('nba').getTop();
    let hotPosts = await r.getSubreddit('nba').getHot();
    let newPosts = await r.getSubreddit('nba').getNew();
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
      // console.log(post.title);
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
        existingStreamable.score = parseInt(streamable.post.score);
        existingStreamable.numComments = parseInt(streamable.post.num_comments);
        existingStreamable.fullCommentsFromReddit = streamable.fullComments;
        existingStreamable.topComments = streamable.topComments;
        await streamableRepository.save(existingStreamable);
      } else {
        // stremale doesn't exist, save a new one
        console.log(`attempting to save streamable: ${streamable.post.title}...`);
        // console.log(streamable.post);
        let streamableToSave = new Streamable();
        // TO DO figure out what match this streamable is from...
        streamableToSave.matchId = process.env.NBAAAY_START_ID || '1';
        streamableToSave.author = await streamable.post.author.name;
        streamableToSave.created = streamable.post.created_utc;
        streamableToSave.createdISODate = moment(streamable.post.created_utc, 'X').toDate();
        streamableToSave.url = streamable.post.url;
        streamableToSave.title = streamable.post.title;
        streamableToSave.score = parseInt(streamable.post.score);
        streamableToSave.numComments = parseInt(streamable.post.num_comments);
        streamableToSave.postId = streamable.post.id;
        streamableToSave.fullCommentsFromReddit = streamable.fullComments;
        streamableToSave.topComments = streamable.topComments;

        await streamableRepository.save(streamableToSave);
        console.log('saved streamable');
      }
    } catch(error) {
      console.log('error');
      console.log(error);
    }
  });
}

module.exports = {
  findStreamablePosts,
  formatStreamablePosts,
  saveAndUpdateStreamables
}
