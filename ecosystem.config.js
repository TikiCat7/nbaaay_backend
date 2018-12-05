const postDeployProduction = () => {
  console.log("------------------------- PRODUCTION ------------------------------")
  return [
    'npm install',
    './node_modules/.bin/pm2 install typescript',
    'pm2 startOrRestart ecosystem.config.js',
  ].join(" && ");
}

module.exports = {
  apps: [
  {
    name: 'nbaaay_API',
    script: './src/server.ts'
  },
  {
    name: 'nbaaay_scraper',
    script: 'src/scripts/orchestrate.ts',
    cron_restart: "*/2 * * * *",
    // log_file: "logs/pm2_child.log",
    error_file: "logs/pm2_error.log",
  },
  {
    name: 'nbaaay_youtube_update',
    script: 'src/scripts/youtubeUpdate.ts',
    cron_restart: "*/5 * * * *",
    // log_file: "logs/pm2_child.log",
    error_file: "logs/pm2_error.log",
  },
  {
    // run once a day to update the team records for upcoming matches (otherwise the team records are stuck from the day all matches were fetched)
    name: 'nbaaay_daily_match_update',
    script: 'src/scripts/dailyMatchUpdate.ts',
    cron_restart: "20 2 * * *",
    error_file: "logs/pm2_error.log",
  }
  ],
  deploy: {
    production: {
      user: 'ubuntu',
      host: 'ec2-18-216-119-191.us-east-2.compute.amazonaws.com',
      key: '~/.ssh/nbaaay.pem',
      ref: 'origin/master',
      repo: 'git@github.com:WataruKay/nbaaay_backend.git',
      path: '/home/ubuntu/nbaaay',
      'post-deploy': postDeployProduction(),
    },
    api: {
      user: 'ubuntu',
      host: 'ec2-18-191-168-87.us-east-2.compute.amazonaws.com',
      key: '~/.ssh/nbaaay.pem',
      ref: 'origin/master',
      repo: 'git@github.com:WataruKay/nbaaay_backend.git',
      path: '/home/ubuntu/nbaaay',
      'post-deploy': postDeployProduction(),
    }
  }
}