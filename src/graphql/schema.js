const { gql } = require('apollo-server');

// The GraphQL schema
const typeDefs = gql`
  scalar JSON

  type Query {
    "A simple type for getting started!"
    hello: String
    "A match type representing one nba match, for a specific ID"
    match(matchId: String): Match
    "All matches for a specific day"
    matchByDate(date: String): [Match]
  }

  type Match {
    id: ID
    matchId: String
    isGameActivated: Boolean
    startDateEastern: String
    startTimeUTCString: String
    startTimeUTC: String
    hTeamId: String
    hTeamLosses: String
    hTeamTriCode: String
    hTeamScore: String
    vTeamId: String
    vTeamLosses: String
    vTeamTriCode: String
    vTeamScore: String
    youtubevideos: [Video]
    statusNum: Int
    currentPeriod: Int
    periodType: Int
    maxRegular: Int
    isHalfTime: Boolean
    isEndOfPeriod: Boolean
  }

  type Video {
    id: ID
    match: Match
    player: [Player]
    videoId: String
    matchId: String
    title: String
    channelTitle: String
    channelId: String
    publishedAt: String
    publishedAtString: String
    description: String
    thumbnailUrlLarge: String
    thumbnailUrlMedium: String
    thumbnailUrlSmall: String
    videoType: String
  }

  type Player {
    id: ID,
    name: String
    firstName: String
    lastName: String
    playerId: String
    number: String
    position: String
    heightweight: String
    birthdate: String
    age: String
    teamId: String
    teamTriCode: String
    teamName: String
    youtubevideos: [Video]
  }

  type Mutation {
    "Update a match record"
    updateMatch(matchId: String): Match
  }
`;

// A map of functions which return data for the schema.
const resolvers = {
  Query: {
    hello: () => 'world',
    match: async (_, { matchId }, { matchrepository }) => {
      let match = await matchrepository
        .createQueryBuilder('match')
        .where({ matchId: matchId })
        .getOne();
      console.log(match);
      return match;
    },
    matchByDate: async (_, { date }, { matchrepository }) => {
      let matches;
      try {
        matches = await matchrepository
        .createQueryBuilder('match')
        .where({ startDateEastern: date })
        .leftJoinAndSelect('match.youtubevideos', 'video')
        .leftJoinAndSelect('video.player', 'player')
        .getMany();
        console.log(matches);
      } catch(error) {
        return error;
      }
      return matches;
    }
  },
  Mutation: {
    updateMatch: async ( _, { matchId, updatedMatchObject }, { matchrepository }) => {
      try {
        const existingMatch = await matchrepository.findOne({where: {matchId: matchId}});
        console.log('match exists, updating now...');
        existingMatch.hTeamScore = '399';
        let updatedMatch = await matchrepository.save(existingMatch);
        return updatedMatch;
      } catch(error) {
        console.log('could not update', error);
      }
    }
  }
}  

module.exports = {
  typeDefs,
  resolvers,
};
