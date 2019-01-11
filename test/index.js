var BodyExtractor = require('../lib')
var should = require('should')

describe('The main text extractor', function() {
  var extractor

  it('can initialize', function() {
    extractor = new BodyExtractor({
      //url: 'http://toyokeizai.net/articles/-/75910'
      //url: 'http://d.hatena.ne.jp/shi3z/20150720/1437347243'
      url: 'https://anond.hatelabo.jp/20150719014315'
    })
  })

  it('can analyze', function() {
    return extractor.analyze().then(function(text) {
      should(text).be.ok()
      extractor.should.have.property('mainText')
      console.log(extractor.mainText)
    })
  })

  it('can extract title', function() {
    should(extractor.title).be.ok()
  })
})
