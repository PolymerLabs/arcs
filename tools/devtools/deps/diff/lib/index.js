/// BareSpecifier=diff\lib\index
/*istanbul ignore start*/
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
Object.defineProperty(exports, "Diff", {
  enumerable: true,
  get: function get() {
    return _base.default;
  }
});
Object.defineProperty(exports, "diffChars", {
  enumerable: true,
  get: function get() {
    return _character.diffChars;
  }
});
Object.defineProperty(exports, "diffWords", {
  enumerable: true,
  get: function get() {
    return _word.diffWords;
  }
});
Object.defineProperty(exports, "diffWordsWithSpace", {
  enumerable: true,
  get: function get() {
    return _word.diffWordsWithSpace;
  }
});
Object.defineProperty(exports, "diffLines", {
  enumerable: true,
  get: function get() {
    return _line.diffLines;
  }
});
Object.defineProperty(exports, "diffTrimmedLines", {
  enumerable: true,
  get: function get() {
    return _line.diffTrimmedLines;
  }
});
Object.defineProperty(exports, "diffSentences", {
  enumerable: true,
  get: function get() {
    return _sentence.diffSentences;
  }
});
Object.defineProperty(exports, "diffCss", {
  enumerable: true,
  get: function get() {
    return _css.diffCss;
  }
});
Object.defineProperty(exports, "diffJson", {
  enumerable: true,
  get: function get() {
    return _json.diffJson;
  }
});
Object.defineProperty(exports, "canonicalize", {
  enumerable: true,
  get: function get() {
    return _json.canonicalize;
  }
});
Object.defineProperty(exports, "diffArrays", {
  enumerable: true,
  get: function get() {
    return _array.diffArrays;
  }
});
Object.defineProperty(exports, "applyPatch", {
  enumerable: true,
  get: function get() {
    return _apply.applyPatch;
  }
});
Object.defineProperty(exports, "applyPatches", {
  enumerable: true,
  get: function get() {
    return _apply.applyPatches;
  }
});
Object.defineProperty(exports, "parsePatch", {
  enumerable: true,
  get: function get() {
    return _parse.parsePatch;
  }
});
Object.defineProperty(exports, "merge", {
  enumerable: true,
  get: function get() {
    return _merge.merge;
  }
});
Object.defineProperty(exports, "structuredPatch", {
  enumerable: true,
  get: function get() {
    return _create.structuredPatch;
  }
});
Object.defineProperty(exports, "createTwoFilesPatch", {
  enumerable: true,
  get: function get() {
    return _create.createTwoFilesPatch;
  }
});
Object.defineProperty(exports, "createPatch", {
  enumerable: true,
  get: function get() {
    return _create.createPatch;
  }
});
Object.defineProperty(exports, "convertChangesToDMP", {
  enumerable: true,
  get: function get() {
    return _dmp.convertChangesToDMP;
  }
});
Object.defineProperty(exports, "convertChangesToXML", {
  enumerable: true,
  get: function get() {
    return _xml.convertChangesToXML;
  }
});

/*istanbul ignore end*/
var
/*istanbul ignore start*/
_base = _interopRequireDefault(require("./diff/base"))
/*istanbul ignore end*/
;

var
/*istanbul ignore start*/
_character = require("./diff/character")
/*istanbul ignore end*/
;

var
/*istanbul ignore start*/
_word = require("./diff/word")
/*istanbul ignore end*/
;

var
/*istanbul ignore start*/
_line = require("./diff/line")
/*istanbul ignore end*/
;

var
/*istanbul ignore start*/
_sentence = require("./diff/sentence")
/*istanbul ignore end*/
;

var
/*istanbul ignore start*/
_css = require("./diff/css")
/*istanbul ignore end*/
;

var
/*istanbul ignore start*/
_json = require("./diff/json")
/*istanbul ignore end*/
;

var
/*istanbul ignore start*/
_array = require("./diff/array")
/*istanbul ignore end*/
;

var
/*istanbul ignore start*/
_apply = require("./patch/apply")
/*istanbul ignore end*/
;

var
/*istanbul ignore start*/
_parse = require("./patch/parse")
/*istanbul ignore end*/
;

var
/*istanbul ignore start*/
_merge = require("./patch/merge")
/*istanbul ignore end*/
;

var
/*istanbul ignore start*/
_create = require("./patch/create")
/*istanbul ignore end*/
;

var
/*istanbul ignore start*/
_dmp = require("./convert/dmp")
/*istanbul ignore end*/
;

var
/*istanbul ignore start*/
_xml = require("./convert/xml")
/*istanbul ignore end*/
;

/*istanbul ignore start*/function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

/*istanbul ignore end*/