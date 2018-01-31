const fs = require('fs');
const readline = require('readline');
const path = require('path');
const google = require('googleapis');
const googleAuth = require('google-auth-library');

// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/youtube-nodejs-quickstart.json
const SCOPES = ['https://www.googleapis.com/auth/youtube.readonly'];
const TOKEN_DIR = path.join(__dirname);
const TOKEN_PATH = TOKEN_DIR + '/youtube-nodejs-quickstart.json';

async function videoFromChannel(channelId, query, gameStartTime) {
  return new Promise(async (resolve, reject) => {
    try {
      const content = await fs.readFileSync(path.join(__dirname, 'client_secret.json'));
      const auth = await authorize(JSON.parse(content));
      const videos = await searchChannel(auth, channelId, query, gameStartTime);

      console.log('got response from youtube');
      console.log(`Found ${videos.items.length} videos for criteria`);
      resolve(videos);
    } catch (error) {
      // console.log(error);
      reject(error);
    }
  });
}

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials) {
  return new Promise((resolve, reject) => {
    const clientSecret = credentials.installed.client_secret;
    const clientId = credentials.installed.client_id;
    const redirectUrl = credentials.installed.redirect_uris[0];
    const auth = new googleAuth();
    const oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, function(err, token) {
      if (err) {
        console.log(err);
        getNewToken(oauth2Client);
      } else {
        oauth2Client.credentials = JSON.parse(token);
        resolve(oauth2Client);
      }
    });
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
function getNewToken(oauth2Client, callback) {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
  });
  console.log('Authorize this app by visiting this url: ', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question('Enter the code from that page here: ', function(code) {
    rl.close();
    oauth2Client.getToken(code, function(err, token) {
      if (err) {
        console.log('Error while trying to retrieve access token', err);
        return;
      }
      oauth2Client.credentials = token;
      storeToken(token);
      callback(oauth2Client);
    });
  });
}

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken(token) {
  try {
    fs.mkdirSync(TOKEN_DIR);
  } catch (err) {
    if (err.code != 'EEXIST') {
      throw err;
    }
  }
  fs.writeFile(TOKEN_PATH, JSON.stringify(token));
  console.log('Token stored to ' + TOKEN_PATH);
}

/**
 * Lists the names and IDs of up to 10 files.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function searchChannel(auth, channelId, q, publishedAfter) {
  return new Promise((resolve, reject) => {
    const service = google.youtube('v3');
    // console.log(publishedAfter.toISOString());
    console.log(`searching for video with, channelID: ${channelId}, query: ${q}, publishedAfter: ${publishedAfter}`);
    service.search.list({
      auth,
      part: 'snippet',
      channelId,
      order: 'viewCount',
      maxResults: '50',
      publishedAfter,
      q
    }, (err, response) => {
      if (err) {
        console.log(`The API returned an error:${err}`);
        reject(err);
      } else {
        // console.log(response);
        resolve(response);
      }
    });
  });
}

module.exports = {
  videoFromChannel
};
