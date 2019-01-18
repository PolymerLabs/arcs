import {PlatformLoader} from '../../build/platform/loader-web.js';
import {PecIndustry} from '../../build/platform/pec-industry-web.js';
import {Utils} from '../lib/utils.js';

export const App = () => {
  const loader = new PlatformLoader({
    'https://$shell/': `../../shells/`
  });
  console.log('I have a loader...');
  console.log(`[$shell] resolves to [${loader._resolve('https://$shell/')}].`);
  const pecFactory = PecIndustry(loader);
  console.log('I have a pecFactory...');
  const pec = pecFactory('foo');
  console.log('I have a pec.');
};
