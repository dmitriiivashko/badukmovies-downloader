import * as Constants from './constants';
import Parser from 'cheerio';

/**
 * BadukMovies authenticator
 */
export default class {
  /**
   * Auth Constructor
   * @param  {Object} request Request Lib
   * @param  {Object} cookies Cookie jar
   */
  constructor(request, cookies) {
    this.request = request;
    this.cookies = cookies;
  }

  /**
   * Perform authentication and return parsed dashboard
   * @param  {String} email    User email
   * @param  {String} password User password
   * @return {Object}          Parsed dashboard page
   */
  auth(email, password) {
    return this.request.get(Constants.LOGIN_URL, {
      jar: this.cookies,
      transform: (body) => Parser.load(body),
    })
    .then((doc) => {
      const token = doc(`input[name=${Constants.LOGIN_FIELDS.TOKEN}]`).val();

      const form = {};
      form[Constants.LOGIN_FIELDS.EMAIL] = email;
      form[Constants.LOGIN_FIELDS.PASSWORD] = password;
      form[Constants.LOGIN_FIELDS.TOKEN] = token;

      return this.request.post(Constants.LOGIN_URL, {
        jar: this.cookies,
        simple: false,
        form,
      })
      .then((data) => {
        if (data.match(/Invalid email or password/i)) {
          throw new Error('Login Failed');
        }
      });
    })
    .then(() => this.request.get(Constants.DASHBOARD_URL, {
      jar: this.cookies,
      transform: (body) => Parser.load(body),
    }));
  }
}
