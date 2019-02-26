const g = global;

g.envPaths = {
  root: '.',
  map: {
    'https://$build/': `./`,
  }
};

g.logLevel = 2;
