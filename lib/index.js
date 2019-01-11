var assert = require('assert')
var getHTML = require('./get-html')
var merge = require('lodash.merge')
var defaults = require('lodash.defaults')
var Entities = require('html-entities').AllHtmlEntities
var entities = new Entities()

/**
 * Initialize new extractor.
 * Either parans.html or params.url must be specified.
 *
 * @param {object} params   The parameters
 * @param {string} params.html  Optional, the HTML content
 * @param {string} params.url   Optional, the URL
 */
function BodyExtractor(params, opts) {
  assert.equal(
    typeof params,
    'object',
    'The params must be an object: ' + params
  )

  this.html = params.html
  this.url = params.url
  merge(
    this,
    defaults(opts || {}, {
      threshold: 100,
      min_length: 80,
      decay_factor: 0.73,
      continuous_factor: 1.62,
      punctuation_weight: 10,
      punctuations: /([、。，．！？]|\.[^A-Za-z0-9]|,[^0-9]|!|\?)/,
      waste_expressions: /Copyright|All Rights Reserved/i,
      debug: true
    })
  )
}

BodyExtractor.prototype.loadHTML = function() {
  assert.equal(
    typeof this.url,
    'string',
    'The this.url must be a stirng: ' + this.url
  )
  var self = this
  return getHTML(this.url).then(function(res) {
    self.html = res.html
    self.url = res.url
    return res
  })
}

/**
 * Parse HTML content
 * @return {Promise}  The promise
 */
BodyExtractor.prototype.analyze = function() {
  var self = this
  var promise = Promise.resolve()
  if (!this.html && this.url) {
    promise = promise.then(function() {
      return self.loadHTML()
    })
  }
  promise = promise.then(function() {
    var html = self.html

    if (
      html.match(
        /<\/frameset>|<meta\s+http-equiv\s*=\s*["']?refresh['"]?[^>]*url/i
      )
    ) {
      return
    }
    html = html.replace(
      /<!--\s*google_ad_section_start\(weight=ignore\)\s*-->[\s\S]*?<!--\s*google_ad_section_end.*?-->/gm,
      ''
    )
    if (html.match(/<!--\s*google_ad_section_start[^>]*-->/)) {
      var m = html.match(
        /<!--\s*google_ad_section_start[^>]*-->([\s\S]*?)<!--\s*google_ad_section_end.*?-->/m
      )
      html = m[1]
    }

    html = eliminate_useless_tags(html)

    var title = self.title
    // h? block including title
    html = html.replace(/(<h\d\s*>\s*(.*?)\s*<\/h\d\s*>)/gi, function(
      $0,
      $1,
      $2,
      _$3
    ) {
      if ($2.length >= 3 && title.indexOf($2) >= 0) {
        return '<div>' + $2 + '</div>'
      } else {
        return $1
      }
    })

    var factor = (continuous = 1.0)
    var body = ''
    var score = 0
    var bodylist = []
    var list = html.split(
      /<\/?(?:div|center|td)[^>]*>|<p\s*[^>]*class\s*=\s*["']?(?:posted|plugin-\w+)['"]?[^>]*>/
    )
    list.forEach(function(block) {
      if (!block) {
        return
      }
      block = block.trim()
      if (has_only_tags(block)) {
        return
      }
      if (body.length > 0) {
        continuous /= self.continuous_factor
      }

      // リンク除外＆リンクリスト判定
      var notlinked = eliminate_link(block)
      if (notlinked.length < self.min_length) {
        return
      }

      // スコア算出
      var c =
        (notlinked.length +
          str_scan(notlinked, self.punctuations).length *
            self.punctuation_weight) *
        factor
      factor *= self.decay_factor
      var not_body_rate =
        str_scan(block, self.waste_expressions).length +
        str_scan(block, /amazon[a-z0-9\.\/\-\?&]+-22/i).length / 2.0
      if (not_body_rate > 0) {
        c *= Math.pow(0.72, not_body_rate)
      }
      var c1 = c * continuous

      if (self.debug) {
        console.log(c, '*', continuous, '=', c1, notlinked.length)
      }

      // ブロック抽出＆スコア加算
      if (c1 > self.threshold) {
        body += block.trim() + '\n'
        score += c1
        continuous = self.continuous_factor
      } else if (c > self.threshold) {
        // continuous block end
        bodylist.push([body, score])
        body = block.trim() + '\n'
        score = c
        continuous = self.continuous_factor
      }
    })
    bodylist.push([body, score])
    body = bodylist.reduce(
      function(a, b) {
        if (a[1] >= b[1]) {
          return a
        } else {
          return b
        }
      },
      ['', 0]
    )
    self.mainText = strip_tags(body[0], self.dom_separator)
    return self.mainText
  })
  return promise
}

BodyExtractor.prototype.__defineGetter__('title', function() {
  var m = this.html.match(/<title[^>]*>\s*(.*?)\s*<\/title\s*>/i)
  if (m) {
    return strip_tags(m[1])
  } else {
    return ''
  }
})

module.exports = BodyExtractor

function eliminate_useless_tags(html) {
  // eliminate useless symbols
  html = html.replace(
    /[\342\200\230-\342\200\235]|[\342\206\220-\342\206\223]|[\342\226\240-\342\226\275]|[\342\227\206-\342\227\257]|\342\230\205|\342\230\206/g,
    ''
  )

  // eliminate useless html tags
  html = html.replace(
    /<(script|style|select|noscript)[^>]*>[\s\S]*?<\/\1\s*>/gim,
    ''
  )
  html = html.replace(/<meta.*\/>/gi, '')
  html = html.replace(/<!--[\s\S]*?-->/gm, '')
  html = html.replace(/<![A-Za-z].*?>/g, '')
  html = html.replace(
    /<div\s[^>]*class\s*=\s*['"]?alpslab-slide["']?[^>]*>[\s\S]*?<\/div\s*>/gm,
    ''
  )
  html = html.replace(
    /<div\s[^>]*(id|class)\s*=\s*['"]?\S*more\S*["']?[^>]*>/gi,
    ''
  )

  return html
}

// Checks if the given block has only tags without text.
function has_only_tags(st) {
  return (
    st
      .replace(/<[^>]*>/gim, '')
      .replace(/&nbsp;/g, '')
      .trim().length == 0
  )
}

// リンク除外＆リンクリスト判定
function eliminate_link(html) {
  var count = 0
  var notlinked = html
    .replace(/<a\s[^>]*>[\s\S]*?<\/a\s*>/gim, function() {
      count += 1
      return ''
    })
    .replace(/<form\s[^>]*>[\s\S]*?<\/form\s*>/gim, '')
  notlinked = strip_tags(notlinked)
  if (notlinked.length < 20 * count || islinklist(html)) {
    return ''
  }
  return notlinked
}

/*
 * Strips tags from html.
 */
function strip_tags(html, separator) {
  if (separator === undefined) {
    separator = ''
  }
  var st = html.replace(/<.+?>/gm, separator)
  // Convert from wide character to ascii
  // symbols, 0-9, A-Z
  st = st.replace(
    /[Ａ-Ｚａ-ｚ０-９－！”＃＄％＆’（）＝＜＞，．？＿［］｛｝＠＾～￥]/g,
    function(s) {
      return String.fromCharCode(s.charCodeAt(0) - 0xfee0)
    }
  )
  // keisen
  st = st.replace(
    /[\342\224\200-\342\224\277]|[\342\225\200-\342\225\277]/g,
    ''
  )
  st = st.replace(/\343\200\200/g, ' ')
  st = entities.decode(st)
  st.replace(/[ \t]+/g, ' ')
  st.replace(/\n\s*/g, '\n')
  return st
}

// リンクリスト判定
// リストであれば非本文として除外する
function islinklist(st) {
  var m = st.match(/<(?:ul|dl|ol)(.+?)<\/(?:ul|dl|ol)>/im)
  if (m) {
    var listpart = m[1]
    var outside = st
      .replace(/<(?:ul|dl)(.+?)<\/(?:ul|dl)>/gim, '')
      .replace(/<.+?>/gm, '')
      .replace(/\s+/g, ' ')
    var list = listpart.split(/<li[^>]*>/)
    list.shift()
    var rate = evaluate_list(list)
    return outside.length <= st.length / (45 / rate)
  } else {
    return false
  }
}

// リンクリストらしさを評価
function evaluate_list(list) {
  if (list.length == 0) {
    return 1
  }
  var hit = 0
  list.forEach(function(line) {
    if (line.match(/<a\s+href=(['"]?)([^"'\s]+)\1/im)) {
      hit++
    }
  })
  return 9 * Math.pow((1.0 * hit) / list.length, 2) + 1
}

function str_scan(str, regexp) {
  var r = []
  str.replace(regexp, function() {
    r.push(Array.prototype.slice.call(arguments, 1, -2))
  })
  return r
}
