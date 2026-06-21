const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Web export output lives under projectRoot/dist. Block only that tree —
// do NOT use a generic /dist/ pattern (it breaks react-native-web/dist/…).
const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const distPattern = new RegExp(`^${escape(path.join(__dirname, 'dist'))}${escape(path.sep)}`);
const webBuildPattern = new RegExp(`^${escape(path.join(__dirname, 'web-build'))}${escape(path.sep)}`);

config.resolver.blockList = [
  ...(Array.isArray(config.resolver.blockList)
    ? config.resolver.blockList
    : [config.resolver.blockList]),
  distPattern,
  webBuildPattern,
];

module.exports = config;
