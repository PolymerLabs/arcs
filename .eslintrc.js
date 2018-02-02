module.exports = {
  "extends": "google",
  "parserOptions": {
    "ecmaVersion": 2017,
    "sourceType": "module",
  },
  "rules": {
    // Things we do, but probably shouldn't.
    "no-throw-literal": "off",
    "one-var": "off",
    "brace-style": "off",
    "camelcase": "off",
    "no-unused-vars": "off",
    "new-cap": "off",
    "arrow-parens": "off", // puts parens around single arg arrow functions

    // Things we don't care about.
    "require-jsdoc": "off",
    "valid-jsdoc": "off",
    "quote-props": "off",
    "guard-for-in": "off",
    "padded-blocks": "off",
    "spaced-comment": "off",
    "block-spacing": "off",
    "no-trailing-spaces": "off",
    "eol-last": "off",
    "max-len": "off",
    "comma-dangle": "off",
    "linebreak-style": "off",

    // Things we might care about if we could automate them.
    "curly": "off", // curly braces even single line blocks, --fix does something weird.
  },
};
