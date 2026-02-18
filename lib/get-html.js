var http = require('http')
var https = require('https')
var { URL } = require('url')
var charset = require('charset')
var iconv = require('iconv-lite')
var jschardet = require('jschardet')

module.exports = getHTML

var MAX_REDIRECTS = 10
var USER_AGENT =
  'Agent:Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/43.0.2357.65 Safari/537.36'

/**
 * Fetch HTML page
 *
 * @param {string} url  The URL to fetch
 * @param {number} [remainingRedirects]  Internal redirect counter
 * @return {Promise}  The promise resolving the HTML content:
 *  {
 *    html: {string} The html content
 *    url: {string} The actual URL retrieved from
 *  }
 */
function getHTML(url, remainingRedirects) {
  if (remainingRedirects === undefined) {
    remainingRedirects = MAX_REDIRECTS
  }

  return new Promise(function (fulfill, reject) {
    var parsedUrl
    try {
      parsedUrl = new URL(url)
    } catch (_e) {
      try {
        parsedUrl = new URL('http://' + url)
      } catch (_e2) {
        reject(new Error('Invalid URL: ' + url))
        return
      }
    }

    var client = parsedUrl.protocol === 'https:' ? https : http

    var options = {
      headers: {
        'User-Agent': USER_AGENT
      }
    }

    client
      .get(parsedUrl.href, options, function (res) {
        if (
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          if (remainingRedirects <= 0) {
            reject(new Error('Too many redirects'))
            return
          }
          var redirectUrl = new URL(res.headers.location, parsedUrl.href).href
          getHTML(redirectUrl, remainingRedirects - 1).then(fulfill, reject)
          return
        }

        var chunks = []
        res.on('data', function (chunk) {
          chunks.push(chunk)
        })
        res.on('error', reject)
        res.on('end', function () {
          var body = Buffer.concat(chunks)
          var enc =
            charset(res.headers, body) ||
            jschardet.detect(body).encoding.toLowerCase()
          var html = iconv.decode(body, enc)
          fulfill({ html: html, url: parsedUrl.href })
        })
      })
      .on('error', reject)
  })
}
