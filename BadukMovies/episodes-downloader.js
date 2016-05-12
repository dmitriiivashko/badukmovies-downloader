import * as Constants from './constants.js';
import Path from 'path';
import Fs from 'fs';
import Progress from 'progress';
import Parser from 'cheerio';
import Promise from 'bluebird';
import mkdirp from 'mkdirp';
import Chalk from 'chalk';

/**
 * Downloader module
 */
export default class {
  /**
   * Downloader constructor
   * @param  {Object} request     Promosified Request module
   * @param  {Object} requestPipe Raw Request module to be used in streaming
   * @param  {Object} cookies     Cookie Jar
   */
  constructor(request, requestPipe, cookies) {
    this.request = request;
    this.requestPipe = requestPipe;
    this.cookies = cookies;
  }

  /**
   * Download Episodes
   * @param  {Array}   episodes         List Of Episodes
   * @param  {Boolean} skipIfPathExists Skip episode if directory already exists
   * @return {Promise}                  Promise
   */
  downloadEpisodes(episodes, skipIfPathExists = true) {
    const bar = new Progress(`${Chalk.bold.green('[:bar]')} (:current of :total episodes)`, {
      total: episodes.length,
      width: 10000,
    });
    bar.tick(0);

    return Promise.resolve(episodes)
    .each((episode) => {
      const files = this._parseEpisodeData(episode.url);
      const destination = Path.resolve(__dirname, '..', 'episodes', episode.slug);
      if (skipIfPathExists && this._pathExists(destination)) {
        bar.tick();
        return false;
      }
      return this._downloadFiles(files, destination)
      .then(() => bar.tick());
    });
  }

  /**
   * Parse downloadable data from episode url
   * @private
   * @param  {String}   url Episode Url
   * @return {Promise}      List of description objects for downloadable files for the episode
   */
  _parseEpisodeData(url) {
    return this.request.get(url, {
      jar: this.cookies,
      transform: (data) => Parser.load(data),
    })
    .then((episodeDoc) => {
      const html = episodeDoc.html();

      const files = [];
      files.push({ dest: 'video', url: `${url}/download` });

      /* eslint-disable max-len */
      let found;
      const subtitlesRegexp = new RegExp(`href="(${Constants.BASE_URL}/subtitles/[0-9]+)"`, 'ig');
      const readRegexp = new RegExp(`<a class="btn btn-small" href="(${Constants.BASE_URL}/episode_sgfs/[0-9]+)"><i class="icon-book"></i> Read</a>`, 'ig');
      const bonusRegexp = new RegExp(`<a class="btn btn-mini" href="(${Constants.BASE_URL}/episode_sgfs/[0-9]+/download)"><i class="icon-download icon-black"></i> Download sgf</a>`, 'ig');
      /* eslint-enable max-len */

      /* eslint-disable no-cond-assign */
      while ((found = subtitlesRegexp.exec(html)) !== null) {
        files.push({ dest: 'video/subtitles', url: found[1] });
      }
      while ((found = readRegexp.exec(html)) !== null) {
        files.push({ dest: 'read', url: `${found[1]}/download` });
      }
      while ((found = bonusRegexp.exec(html)) !== null) {
        files.push({ dest: 'bonus', url: `${found[1]}` });
      }
      /* eslint-enable no-cond-assign */

      return files;
    });
  }

  /**
   * Download the given list of files
   * @private
   * @param  {Array}    files  List of file objects to download
   * @param  {String}   path   File download destination path
   * @return {Promise}         Promise
   */
  _downloadFiles(files, path) {
    return Promise.resolve(files)
    .each((file) => this._downloadFile(file.url, Path.resolve(path, file.dest)));
  }

  /**
   * Check if given path exists
   * @private
   * @param  {String}   pathToCheck Path
   * @return {Boolean}              Path exists
   */
  _pathExists(pathToCheck) {
    let exists = true;

    try {
      Fs.statSync(pathToCheck);
    } catch (_) {
      exists = false;
    }

    return exists;
  }

  /**
   * Download given file
   * @private
   * @param  {String}  url      URL to download from
   * @param  {String}  path     Download destination
   * @param  {String}  filename Output filename (default: null)
   * @return {Promise}          Promise
   */
  _downloadFile(url, path, filename = null) {
    let filePath = '';
    const nameRegexp = /filename="(.*)"/gi;
    mkdirp.sync(path);

    if (filename) {
      filePath = Path.resolve(path, filename);
      if (this._pathExists(filePath)) {
        return Promise.resolve(null);
      }
    }

    return new Promise((resolve, reject) => {
      const downloadRequest = this.requestPipe.get(url, { jar: this.cookies })
      .on('response', (res) => {
        if (!filename) {
          filePath = Path.resolve(path, nameRegexp.exec(res.headers['content-disposition'])[1]);
          if (this._pathExists(filePath)) {
            downloadRequest.abort();
            return;
          }
        }
        res.pipe(Fs.createWriteStream(filePath));
      })
      .on('end', () => {
        resolve(filePath);
      })
      .on('error', (error) => reject(error));
    });
  }
}
