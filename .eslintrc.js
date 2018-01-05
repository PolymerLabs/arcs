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

    // Thigns we might care about if clang-format did them.
    "arrow-parens": "off",
    "curly": "off",

    // TODO: Once clang-format is working, we can enable some of these.
    // Formatting rules, (probably) handled by clang-format.
    "quotes": "off",
    "eol-last": "off",
    "comma-dangle": "off",
    "max-len": "off",

    // TODO: Once clang-format is working, we can enable some of these.
    // Spacing rules, (probably) handled by clang-format.
    "padded-blocks": "off",
    "spaced-comment": "off",
    "block-spacing": "off",
    "no-multi-spaces": "off",
    "object-curly-spacing": "off",
    "keyword-spacing": "off",
    "no-trailing-spaces": "off",
    "space-before-function-paren": "off",
    "key-spacing": "off",
    "func-call-spacing": "off",
    "generator-star-spacing": "off",
    "space-before-blocks": "off",
    "array-bracket-spacing": "off",
  },
};
