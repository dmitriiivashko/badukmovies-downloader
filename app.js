import Request from 'request-promise';
import RequestPipe from 'request';
import Auth from './BadukMovies/auth';
import Dialogs from 'inquirer';
import EpisodesParser from './BadukMovies/episodes-parser';
import EpisodesDownloader from './BadukMovies/episodes-downloader';
import Chalk from 'chalk';

const cookies = Request.jar();
const authenticator = new Auth(Request, cookies);
const downloader = new EpisodesDownloader(Request, RequestPipe, cookies);
const parser = new EpisodesParser();

const questions = [
  {
    type: 'input',
    name: 'email',
    message: 'Your BadukMovies account email',
    validate: (input) => input !== '',
  },
  {
    type: 'password',
    name: 'password',
    message: 'Your BadukMovies account password',
    validate: (input) => input !== '',
  },
];

Dialogs.prompt(questions)
.then((answers) => authenticator.auth(answers.email, answers.password))
.then((dashboard) => parser.parseEpisodes(dashboard))
.then((episodes) => downloader.downloadEpisodes(episodes))
.catch((error) => {
  console.log(`${Chalk.bold.red('Error: ')}${error.message}`);
});
