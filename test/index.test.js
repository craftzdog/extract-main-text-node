var BodyExtractor = require('../lib')

describe('The main text extractor', function () {
  var extractor

  it('can initialize', function () {
    extractor = new BodyExtractor({
      url: 'https://anond.hatelabo.jp/20150719014315'
    })
  })

  it('can analyze', function () {
    return extractor.analyze().then(function (text) {
      expect(text).toBeTruthy()
      expect(extractor).toHaveProperty('mainText')
    })
  })

  it('can extract title', function () {
    expect(extractor.title).toBeTruthy()
  })
})
