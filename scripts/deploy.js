// Publishes build/ to the gh-pages branch.
//
// gh-pages clones the repo into node_modules/.cache/gh-pages, and inside the
// OneDrive folder those paths exceed Windows' 260-character limit
// ("Filename too long"). Enabling core.longpaths for just this process's git
// commands fixes that without touching anyone's global git config.
const ghpages = require('gh-pages');

process.env.GIT_CONFIG_COUNT = '1';
process.env.GIT_CONFIG_KEY_0 = 'core.longpaths';
process.env.GIT_CONFIG_VALUE_0 = 'true';

ghpages.publish('build', (err) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log('Published');
});
