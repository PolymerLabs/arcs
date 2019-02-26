const g = global;

g.envPaths = {
  root: '.',
  map: {
    'https://$build/': `../../lib/build/`,
    'https://$particles/': `../../../particles/`
  }
};

g.logLevel = 2;
