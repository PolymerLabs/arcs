import {BrowserLoader} from '../../../source/browser-loader.js';
import ArcsUtils from '../../lib/arcs-utils.js';

const input = document.querySelector('[in]');
const out = document.querySelector('[out]');
const publish = document.querySelector('button');
const store = 'arcs-0.4-meta-recipes';

const arcToRecipe = serialization => {
  let template = templatize({serialization});
  template += '  description `user composed recipe (so meta)`';
  const recipes = JSON.parse(localStorage.getItem(store) || '{}');
  const key = 'meta';
  recipes[key] = template;
  console.log('generalized:', template);
  localStorage.setItem(store, JSON.stringify(recipes));
};

const randid = () => Math.floor((Math.random()+1)*1e3);

const accumulate = (serialization, tabWidth) => {
  const lines = serialization.split('\n');
  let blocks = [];
  let line = 0;
  let block = '';
  while (line < lines.length) {
    const chars = lines[line];
    if (chars) {
      if (chars[tabWidth] !== ' ') {
        if (block) {
          blocks.push(block);
        }
        block = '';
      }
      block += chars + '\n';
    }
    line++;
  }
  blocks.push(block);
  return blocks;
};

const recipeFixer = block => {
  let recipe = [];
  let lines = accumulate(block, 2)
    // remote `slot` and `description` pragmas
    .filter(line => !hasPrefix(line, ['  slot', '  description']))
    .map(line => handleFixer(line))
    ;
  return lines.join('');
};

const hasPrefix = (s, prefixi) => prefixi.some(prefix => s.startsWith(prefix));

const handleFixer = line => {
  // for `use` handles
  if (line.startsWith('  use')) {
    // retain ParticleShape as is
    if (!line.includes('ParticleShape')) {
      // otherwise, remove id
      line = line.replace(/ \'[^']*\'/g, '');
      // and generalize fate
      line = line.replace('use', '?');
    }
  }
  // remove comments
  line = line.replace(/(.*?)\/\/.*/, '$1');
  return line;
};

const templatize = ({serialization}) => {
  // remove the following blocks
  //const prefixi = ['resource', 'meta', 'store', '@active'];
  const prefixi = ['meta', '@active'];
  let blocks = accumulate(serialization, 0);
  blocks = blocks.filter(block => !hasPrefix(block, prefixi));
  //
  // flattens paths with `..` in them
  blocks = blocks.map(block => block.replace(/(.*?\')[^']*?(\.\..*$)/m, '$1$2'));
  //
  let manifest = [];
  blocks.forEach(block => {
    // work on recipe blocks
    if (block.startsWith('recipe')) {
      block = recipeFixer(block);
    }
    // work on store blocks
    else if (block.startsWith('store')) {
      // elide stores that aren't for ParticleShape(s)
      if (!block.includes('ParticleShape')) {
        return;
      }
    }
    manifest.push(block);
  });
  manifest = manifest.join('\n');
  return manifest;
  //text.textContent = manifest;
  //console.log(manifest);
};

export {arcToRecipe};
