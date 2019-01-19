import {App} from './app.js';

// notify user we are live
console.log('\n--- Arcs Shell ---\n');

// run App
(async () => {
  try {
    await App();
  } catch (x) {
    console.error(x);
  }
  console.log('');
})();
