module.exports = {
  extends: [
    "eslint:recommended",
    "google",
  ],
  "parserOptions": {
    "ecmaVersion": 2017,
    "sourceType": "module",
  },
  "rules": {
    // Things we do, but probably shouldn't.
    "no-console": "off",
    "no-throw-literal": "off",
    "one-var": "off",
    "brace-style": "off",
    "camelcase": "off",
    "no-unused-vars": "off",
    "new-cap": "off",
    "arrow-parens": "off", // puts parens around single arg arrow functions
    "no-useless-escape": "off", // eg. [\.] in a regex, there are just too many to fix by hand atm.
    "no-undef": "off", // Particles use importScripts+globals, need to move to JS modules to fix
    "no-empty-pattern": "off", // No {} in patterns, but sometimes we use {} to denote an unused argument?

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
  env: {
    browser: true,
    node: true,
    es6: true,
    worker: true,
    mocha: true,
  },
  globals: {
    // particle implementations
    defineParticle: false,
    // tests
    chai: false,
    // devtools extension
    chrome: false,
    // selenium tests
    browser: false,

    // globals it would be good to figure out how to remove
    // - selenium tests
    target: false,
    assert: false,
    pierceShadows: false,
    pierceShadowsSingle: false,
    // - extension tests
    filter: false,
    flatten: false,
    deduplicate: false,
    _prepareResults: false,
    extractEntities: false,
    // - shell tests
    db: false,
    FakeDatabase: false,
    PersistentArc: false,
  },
};
