module.exports = {
  "extends": "google",
  "parserOptions": {
    "ecmaVersion": 2017,
    "sourceType": "module",
  },
  "rules": {
    // Things we do, but probably shouldn't.
    "no-var": "off",
    "no-throw-literal": "off",
    "one-var": "off",
    "brace-style": "off",
    "camelcase": "off",
    "no-unused-vars": "off",
    "new-cap": "off",

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

    // Thigns we might care about if clang-format did them.
    "arrow-parens": "off",
    "curly": "off",

    // TODO: Once clang-format is working, we can enable some of these.
    // Formatting rules, (probably) handled by clang-format.
  },
};
