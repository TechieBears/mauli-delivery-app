module.exports = {
  presets: [
    ['module:@react-native/babel-preset', { unstable_transformProfile: 'hermes-stable' }],
  ],
  plugins: [
    ['module:react-native-dotenv', {
      moduleName: '@env',
      path: '.env',
      allowUndefined: true,
    }],
    // Reanimated v4 uses the worklets plugin (must stay last in this array)
    'react-native-worklets/plugin',
  ],
};
