const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ensure fonts are properly handled in web builds
config.resolver.assetExts.push('ttf', 'otf', 'woff', 'woff2');

// Add font loading optimization for web
if (process.env.EXPO_PLATFORM === 'web') {
  config.transformer.assetRegistryPath = 'react-native/Libraries/Image/AssetRegistry';
}

module.exports = config;