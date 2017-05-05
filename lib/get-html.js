var request = require('request');
var charset = require('charset');
var iconv = require('iconv-lite');
var jschardet = require('jschardet');

module.exports = getHTML;

/**
 * Fetch HTML page
 * retrieveHTML('http://hoge', function(err, html, url){ ... })
 * The url argument of callback function is actual URL.
 * It's different from specified one if the page is redirected like shorten URL.
 *
 * @param {string}   url  The URL to fetch
 * @param {function} cb   The callback function
 * @return {Promise}  The promise resolving the HTML content:
 *  {
 *    html: {string} The html content
 *    url: {string} The actual URL retrieved from
 *  }
 */
function getHTML (url){
  return new Promise(function(fulfill, reject) {
    var purl = require('url').parse(url);
    if (!purl.protocol) {
      purl = require('url').parse("http://"+url);
    }
    url = require('url').format(purl);

    var options = {
      url: url,
      encoding: null,
      followRedirect: true,
      headers: {
        'User-Agent': 'Agent:Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/43.0.2357.65 Safari/537.36'
      }
    };

    request(options, function(err, res, body) {
      if (err) {
        reject(err);
      }
      else {
        var enc = charset(res.headers, body) || jschardet.detect(body).encoding.toLowerCase();
        body = iconv.decode(body, enc);
        if (res.statusCode >= 300 && res.statusCode < 400) {
          retrieveHTML(res.headers.location).then(fulfill, reject);
        }
        else {
          fulfill({ html: body, url: res.request.uri.href });
        }
      }
    });
  });
}
