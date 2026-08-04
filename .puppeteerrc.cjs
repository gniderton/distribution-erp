const {join} = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // Changes the cache location for Puppeteer to the project directory
  // This is required for Render deployments to ensure the Chrome binary is cached properly.
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};
