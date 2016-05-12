import * as Constants from './constants';

/**
 * Class for extracting episodes from dashboard doc
 */
export default class EpisodesParser {

  /**
   * Parse dashboard into array of episodes
   * @param  {Object} dashboardDoc Dashbord Doc Object
   * @return {array}               Array of episode objects
   */
  parseEpisodes(dashboardDoc) {
    const episodes = [];

    dashboardDoc('tr.episode').each((_, row) => {
      const link = dashboardDoc(row).find('a');
      if (link.length === 0) {
        return;
      }
      const name = link.text();
      const url = `${Constants.BASE_URL}${link.attr('href')}`;
      const slug =
        name
        .replace(/\s+/gi, '_')
        .replace(/#/gi, '')
        .replace(/\+/gi, 'plus')
        .replace(/[^a-z0-9_\-]/gi, '')
        .replace(/^\s+/gi, '')
        .replace(/^_+/gi, '_')
        .replace(/\(\)/gi, '');
      episodes.push({ name, url, slug });
    });

    return episodes;
  }
}
