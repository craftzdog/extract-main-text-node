extract-main-text-node
======================

Ported from [mono0x/extractcontent](https://github.com/mono0x/extractcontent).

## Installing

```
npm install extract-main-text
```

## Usage

```JavaScript
var BodyExtractor = require('extract-main-text');
var extractor = new BodyExtractor({
    url: 'http://***.com/'
  });
extractor.analyze()
  .then(function(text) {
    console.log(extractor.title);
    console.log(extractor.mainText);
  });
```

## License

The BSD license

