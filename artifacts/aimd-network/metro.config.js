const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');

const config = getDefaultConfig(__dirname);
const artifactsRoot = path.dirname(__dirname);

// Expo discovers every workspace app. Sibling artifacts are independent products,
// not mobile dependencies; watching their builds adds unnecessary startup work.
// Keep Expo's shared-library and node_modules roots for pnpm symlink resolution.
config.watchFolders = config.watchFolders.filter(
  (folder) => path.dirname(folder) !== artifactsRoot || folder === __dirname,
);

const staticBuild = path.join(__dirname, 'static-build');
const escapedStaticBuild = staticBuild.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const defaultBlockList = config.resolver.blockList;
config.resolver.blockList = [
  ...(Array.isArray(defaultBlockList) ? defaultBlockList : defaultBlockList ? [defaultBlockList] : []),
  new RegExp(`^${escapedStaticBuild}(?:[/\\\\]|$)`),
];

module.exports = config;
