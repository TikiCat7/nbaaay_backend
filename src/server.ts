import * as express from 'express';
import 'reflect-metadata';
import { Request, Response } from 'express';
import * as bodyParser from 'body-parser';

const { ApolloServer } = require('apollo-server-express');
const { typeDefs, resolvers } = require('./graphql/schema');

import { createConnection } from 'typeorm';
import { Match } from './entity/Match';
import { Thread } from './entity/Thread';
import { PostGameThread } from './entity/PostGameThread';
import { YoutubeVideo } from './entity/YoutubeVideo';
import { Streamable } from './entity/Streamable';
import { Player } from './entity/Player';
import { Test } from './entity/Test';
const moment = require('moment');
const cors = require('cors');

// create typeorm connection
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
      __dirname + '/entity/**.ts'
    ],
    "migrations": [
      __dirname + '/migration/**.ts'
    ],
    "subscribers": [
      __dirname + '/subscriber/**.ts'
    ],
    "cli": {
       "entitiesDir": "src/entity",
       "migrationsDir": "src/migration",
       "subscribersDir": "src/subscriber"
    }
}).then(connection => {
  const matchrepository = connection.getRepository(Match);
  const threadRepository = connection.getRepository(Thread);
  const postgamethreadRepository = connection.getRepository(PostGameThread);
  const youtubeVideoRepository = connection.getRepository(YoutubeVideo);
  const streamableRepository = connection.getRepository(Streamable);
  const testRepository = connection.getRepository(Test);
  const playerRepository = connection.getRepository(Player);

  const server = new ApolloServer({
    // These will be defined for both new or existing servers
    typeDefs,
    resolvers,
    context: {
      matchrepository: matchrepository,
    },
  });

  // create and setup express app
  const app = express();
  app.use(bodyParser.json());
  app.use(cors())

  // register routes
  app.get('/allMatches', async function(req: Request, res: Response) {
    console.log('recieved request for /matches');
    try {
      // const matches = await matchrepository.find({ select: ["matchId", "isGameActivated", "hTeamTriCode", "vTeamTriCode"], where: { hTeamTriCode: "CLE"}, relations: ["thread", "postGameThread", "youtubevideos"]});
      const matches = await matchrepository.find({});
      res.send(matches);
    } catch (error) {
      console.log(error);
      res.send(error);
    }
  });

  app.get('/matches/:date', async function(req: Request, res: Response) {
    try {
      console.log(`recieved request for /matches/${req.params.date}`);
      let matches;

      // only add json comments if query is provided since it can be quite heavy
      if (req.query.includeComments === 'true') {
        matches = await matchrepository
          .createQueryBuilder('match')
          .where({ startDateEastern: req.params.date })
          .leftJoinAndSelect('match.youtubevideos', 'video')
          .leftJoinAndSelect('match.thread', 'thread')
          .leftJoinAndSelect('match.matchstats', 'matchStat')
          .leftJoinAndSelect('matchStat.player', 'playerForMatchStat')
          .addSelect('thread.fullCommentsFromReddit')
          .addSelect('thread.topComments')
          .leftJoinAndSelect('match.postGameThread', 'postGameThread')
          .addSelect('postGameThread.fullCommentsFromReddit')
          .addSelect('postGameThread.topComments')
          .getMany();
      } else {
        matches = await matchrepository.find({
          where: { startDateEastern: req.params.date },
          relations: ['thread', 'postGameThread', 'youtubevideos'],
        });
      }
      res.send(matches);
    } catch (error) {
      console.log(error);
      res.send(error);
    }
  });

  app.get('/match/:id', async function(req: Request, res: Response) {
    console.log(`recieved request for /match/${req.params.id}`);
    let matchId = req.params.id;
    let match = await matchrepository
      .createQueryBuilder('match')
      .where('match.matchId = :matchId', { matchId })
      .leftJoinAndSelect('match.youtubevideos', 'video')
      .leftJoinAndSelect('match.thread', 'thread')
      .leftJoinAndSelect('video.player', 'player')
      .leftJoinAndSelect('match.matchStats', 'matchStat')
      .leftJoinAndSelect('matchStat.player', 'playerForMatchStat')
      // .addSelect('thread.fullCommentsFromReddit')
      // .addSelect('thread.topComments')
      .leftJoinAndSelect('match.postGameThread', 'postGameThread')
      .getOne();

    res.send(match);
  });

  app.get('/todayMatches', async function(req: Request, res: Response) {
    try {
      console.log('reqest recieved for todayMatches');
      let todayDate = moment()
        .startOf('day')
        .utc();
      console.log(todayDate);
      let matches = await matchrepository
        .createQueryBuilder('match')
        .where('match.startTimeUTC >= :todayDate', { todayDate })
        .leftJoinAndSelect('match.youtubevideos', 'video')
        .leftJoinAndSelect('match.thread', 'thread')
        // .addSelect('thread.fullCommentsFromReddit')
        // .addSelect('thread.topComments')
        .leftJoinAndSelect('match.postGameThread', 'postGameThread')
        .getMany();

      res.send(matches);
    } catch (error) {
      console.log(error);
      res.send(error);
    }
  });

  app.get('/thread/:id', async function(req: Request, res: Response) {
    console.log(`recieved request for /thread/${req.params.id}`);
    try {
      let thread;
      if (req.query.includeAllComments === 'true') {
        thread = await threadRepository
          .createQueryBuilder('thread')
          .where({ postId: req.params.id })
          .addSelect('thread.fullCommentsFromReddit')
          .addSelect('thread.topComments')
          .getOne();
      } else if (req.query.includeTopComments === 'true') {
        thread = await threadRepository
          .createQueryBuilder('thread')
          .where({ postId: req.params.id })
          .addSelect('thread.topComments')
          .getOne();
      } else {
        thread = await threadRepository.find({
          where: { postId: req.params.id },
        });
      }
      res.send(thread);
    } catch (error) {
      res.send(error);
    }
  });

  app.get('/postgamethread/:id', async function(req: Request, res: Response) {
    console.log(`recieved request for /postgamethread/${req.params.id}`);
    try {
      let postgamethread;
      if (req.query.includeAllComments === 'true') {
        postgamethread = await postgamethreadRepository
          .createQueryBuilder('thread')
          .where({ postId: req.params.id })
          .addSelect('thread.fullCommentsFromReddit')
          .addSelect('thread.topComments')
          .getOne();
      } else if (req.query.includeTopComments === 'true') {
        postgamethread = await postgamethreadRepository
          .createQueryBuilder('thread')
          .where({ postId: req.params.id })
          .addSelect('thread.topComments')
          .getOne();
      } else {
        postgamethread = await postgamethreadRepository.find({
          where: { postId: req.params.id },
        });
      }
      res.send(postgamethread);
    } catch (error) {
      res.send(error);
    }
  });

  app.get('/youtubevideo/:id', async function(req: Request, res: Response) {
    console.log(`recieved request for /youtubevideo/${req.params.id}`);
    const youtubevideo = await youtubeVideoRepository.find({
      where: { id: req.params.id },
    });
    res.send(youtubevideo);
  });

  app.get('/youtubevideos/:date', async function(req: Request, res: Response) {
    try {
      console.log(`recieved request for /youtubevideos/${req.params.date}`);
      let startDate = moment(req.params.date, 'YYYYMMDD').startOf('day');
      let endDate = moment(req.params.date, 'YYYYMMDD')
        .startOf('day')
        .add(1, 'day');
      console.log(startDate, endDate);

      const youtubevideos = await youtubeVideoRepository
        .createQueryBuilder('youtubevideos')
        .where('youtubevideos.publishedAt > :startDate', { startDate })
        .andWhere('youtubevideos.publishedAt < :endDate', { endDate })
        .leftJoinAndSelect('youtubevideos.player', 'player')
        .leftJoinAndSelect('youtubevideos.match', 'match')
        .orderBy('youtubevideos.id', 'DESC')
        .getMany();

      res.send(youtubevideos);
    } catch (error) {
      console.log(error);
      res.send(error);
    }
  });

  app.get('/streamable/:id', async function(req: Request, res: Response) {
    let id = req.params.id;
    let streamable;
    try {
      if (req.query.includeComments === 'true') {
        streamable = await streamableRepository
          .createQueryBuilder('streamable')
          .where('streamable.id = :id', { id })
          .addSelect('streamable.fullCommentsFromReddit')
          .addSelect('streamable.topComments')
          .getOne();
      } else {
        streamable = await streamableRepository
          .createQueryBuilder('streamable')
          .where('streamable.id = :id', { id })
          .getOne();
      }
      res.send(streamable);
    } catch (error) {
      console.log(error);
      res.send(error);
    }
  });

  app.get('/streamables/:date', async function(req: Request, res: Response) {
    try {
      console.log(`recieved request for streamable on ${req.params.date}`);
      const requestDate = moment(req.params.date, 'YYYYMMDD')
        .startOf('day')
        .unix();
      const requestEndDate = moment(req.params.date, 'YYYYMMDD')
        .startOf('day')
        .add(1, 'day')
        .unix();
      console.log(requestDate);
      const streamable = await streamableRepository
        .createQueryBuilder('streamable')
        .where('streamable.created > :requestDate', { requestDate })
        .andWhere('streamable.created < :requestEndDate', { requestEndDate })
        .getMany();
      res.send(streamable);
    } catch (error) {
      console.log(error);
      res.send(error);
    }
  });

  app.get('/streamablesrecent', async function(req: Request, res: Response) {
    try {
      console.log(`recieved request for streamables in last 24 hours`);
      const requestDate = moment()
        .subtract(24, 'hours')
        .unix();
      const requestEndDate = moment().unix();
      console.log(requestDate);
      const streamable = await streamableRepository
        .createQueryBuilder('streamable')
        .where('streamable.created > :requestDate', { requestDate })
        .andWhere('streamable.created < :requestEndDate', { requestEndDate })
        .getMany();
      res.send(streamable);
    } catch (error) {
      console.log(error);
      res.send(error);
    }
  });

  app.get('/test/:date', async function(req: Request, res: Response) {
    try {
      let todayDate = moment(req.params.date)
        .startOf('day')
        .utc();
      const testResult = await testRepository
        .createQueryBuilder('test')
        .where('test.publishedAt > :todayDate', { todayDate })
        // .andWhere("youtubevideos.publishedAt < :endDate", {endDate})
        .getMany();
      res.send(testResult);
    } catch (error) {
      console.log(error);
      res.send(error);
    }
  });

  app.get('/player/:id', async function(req: Request, res: Response) {
    try {
      console.log(`got request for player ${req.params.id}`);

      const player = await connection
        .getRepository(Player)
        .createQueryBuilder('player')
        .where('player.id = :playerId', { playerId: req.params.id })
        .leftJoinAndSelect('player.youtubevideos', 'youtubeVideoId')
        .getOne();

      // let player = await playerRepository.find({where: {id: req.params.id}, relations: ["youtubevideos"]});
      res.send(player);
    } catch (error) {
      console.log(error);
      res.send(error);
    }
  });

  app.get('/playerlist', async function(req: Request, res: Response) {
    try {
      console.log(`got request for all players`);
      const players = await connection
        .getRepository(Player)
        .createQueryBuilder('player')
        .getMany();

      res.send(players);
    } catch (error) {
      console.log(error);
      res.send(error);
    }
  });
  server.applyMiddleware({ app }); // app is from an existing express app

  app.listen({ port: 3000 }, () =>
    console.log(
      `🚀 Server ready at http://localhost:3000${server.graphqlPath}`,
    ),
  );
});
