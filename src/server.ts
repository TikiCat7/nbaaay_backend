import * as express from 'express';
import "reflect-metadata";
import { Request, Response } from 'express';
import * as bodyParser from 'body-parser';
import { createConnection, getConnection } from 'typeorm';
import { Match } from './entity/Match';
import { Thread } from './entity/Thread';
import { PostGameThread } from './entity/PostGameThread';
import { YoutubeVideo } from './entity/YoutubeVideo';
import { Streamable } from './entity/Streamable';
import { Player } from './entity/Player';
import { Test } from './entity/Test';
const moment = require('moment');

// create typeorm connection
createConnection().then(connection => {
  const matchRepositiory = connection.getRepository(Match);
  const threadRepository = connection.getRepository(Thread);
  const postgamethreadRepository = connection.getRepository(PostGameThread);
  const youtubeVideoRepository = connection.getRepository(YoutubeVideo);
  const streamableRepository = connection.getRepository(Streamable);
  const testRepository = connection.getRepository(Test);
  const playerRepository = connection.getRepository(Player);

  // create and setup express app
  const app = express();
  app.use(bodyParser.json());

  // register routes
  app.get("/allMatches", async function(req: Request, res: Response) {
    console.log('recieved request for /matches');
    try {
      // const matches = await matchRepositiory.find({ select: ["matchId", "isGameActivated", "hTeamTriCode", "vTeamTriCode"], where: { hTeamTriCode: "CLE"}, relations: ["thread", "postGameThread", "youtubevideos"]});
      const matches = await matchRepositiory.find({});
      res.send(matches);
    } catch(error) {
     console.log(error);
     res.send(error);
    }
  });

  app.get("/matches/:date", async function(req: Request, res: Response) {
    try {
      console.log(`recieved request for /matches/${req.params.date}`);
      let matches;

      // only add json comments if query is provided since it can be quite heavy
      if(req.query.includeComments === 'true') {
         matches = await matchRepositiory.createQueryBuilder("match")
        .where({startDateEastern: req.params.date})
        .leftJoinAndSelect("match.youtubevideos", 'video')
        .leftJoinAndSelect("match.thread", "thread")
        .addSelect('thread.fullCommentsFromReddit')
        .addSelect('thread.topComments')
        .leftJoinAndSelect("match.postGameThread", "postGameThread")
        .getMany();
      } else {
        matches = await matchRepositiory.find({ where: {startDateEastern: req.params.date}, relations: ["thread","postGameThread", "youtubevideos"]});
      }
      res.send(matches);
    } catch(error) {
      console.log(error);
      res.send(error);
    }
  });

  app.get("/match/:id", async function(req: Request, res: Response) {
    console.log(`recieved request for /match/${req.params.id}`);
    const match = await matchRepositiory.find({ where: { matchId: req.params.id }, relations: ["thread", "postGameThread", "youtubevideos"]});
    res.send(match);
  });

  app.get("/todayMatches", async function(req: Request, res: Response) {
    try {
      console.log('reqest recieved for todayMatches');
      let todayDate = moment().startOf('day').utc();
      console.log(todayDate);
      let matches = await matchRepositiory.createQueryBuilder("match")
        .where("match.startTimeUTC > :todayDate", { todayDate })
        .leftJoinAndSelect("match.youtubevideos", 'video')
        .leftJoinAndSelect("match.thread", "thread")
        // .addSelect('thread.fullCommentsFromReddit')
        // .addSelect('thread.topComments')
        .leftJoinAndSelect("match.postGameThread", "postGameThread")
        .getMany();

      res.send(matches);
    } catch(error) {
      console.log(error);
      res.send(error);
    }
  });

  app.get("/thread/:id", async function(req: Request, res: Response) {
    console.log(`recieved request for /thread/${req.params.id}`);
    const thread = await threadRepository.find({ where: { postId: req.params.id }});
    res.send(thread);
  });

  app.get("/postgamethread/:id", async function(req: Request, res: Response) {
    console.log(`recieved request for /postgamethread/${req.params.id}`);
    const postgamethread = await postgamethreadRepository.find({ where: { postId: req.params.id}});
    res.send(postgamethread);
  });

  app.get("/youtubevideo/:id", async function(req: Request, res:Response) {
    console.log(`recieved request for /youtubevideo/${req.params.id}`);
    const youtubevideo = await youtubeVideoRepository.find({where: {id: req.params.id}});
    res.send(youtubevideo);
  });

  app.get("/youtubevideos/:date", async function(req: Request, res: Response) {
    try {
      console.log(`recieved request for /youtubevideos/${req.params.date}`);
      let startDate = moment(req.params.date, "YYYYMMDD").startOf('day');
      let endDate = moment(req.params.date, "YYYYMMDD").startOf('day').add(1, 'day');
      console.log(startDate, endDate);

      const youtubevideos = await youtubeVideoRepository.createQueryBuilder("youtubevideos")
        .where("youtubevideos.publishedAt > :startDate", {startDate})
        .andWhere("youtubevideos.publishedAt < :endDate", {endDate})
        .getMany();

      res.send(youtubevideos);
    } catch(error) {
      console.log(error);
      res.send(error);
    }
  });

  app.get("/streamable/:id", async function(req: Request, res: Response) {
    console.log(`recieved request for streamable ${req.params.id}`);
    const streamable = await streamableRepository.find({where: {postId: req.params.id}});
    res.send(streamable);
  });

  app.get("/streamables/:date", async function(req: Request, res: Response) {
    try {
      console.log(`recieved request for streamable on ${req.params.date}`);
      const requestDate = moment(req.params.date, "YYYYMMDD").startOf('day').unix();
      const requestEndDate = moment(req.params.date, "YYYYMMDD").startOf('day').add(1, 'day').unix();
      console.log(requestDate);
      const streamable = await streamableRepository.createQueryBuilder("streamable")
        .where("streamable.created > :requestDate", { requestDate })
        .andWhere("streamable.created < :requestEndDate", { requestEndDate })
        .getMany();
      res.send(streamable);
    } catch(error) {
      console.log(error);
      res.send(error);
    }
  });

  app.get("/test/:date", async function(req: Request, res: Response) {
    try {
      let todayDate = moment(req.params.date).startOf('day').utc();
      const testResult = await testRepository.createQueryBuilder("test")
        .where("test.publishedAt > :todayDate", {todayDate})
        // .andWhere("youtubevideos.publishedAt < :endDate", {endDate})
        .getMany();
        res.send(testResult);
    } catch(error) {
      console.log(error);
      res.send(error);
    }
  });

  app.get("/player/:id", async function(req: Request, res: Response) {
    try {
      console.log(`got request for player ${req.params.id}`);

      const player = await connection
      .getRepository(Player)
      .createQueryBuilder("player")
      .where("player.id = :playerId", { playerId: req.params.id })
      .leftJoinAndSelect("player.youtubevideos", "youtubeVideoId")
      .getOne();

      // let player = await playerRepository.find({where: {id: req.params.id}, relations: ["youtubevideos"]});
      res.send(player);
    } catch(error) {
      console.log(error);
      res.send(error);
    }
  });

  // start express server
  app.listen(3000);
});
