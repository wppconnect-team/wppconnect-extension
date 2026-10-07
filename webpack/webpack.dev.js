const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');

const SpeedMeasurePlugin = require('speed-measure-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const smp = new SpeedMeasurePlugin();

const config = merge(common, {
    devtool: 'inline-source-map',
    mode: 'development'
});

// Keep the CSS extraction instance outside the timing wrapper so its loader can find it.
const cssPlugins = config.plugins.filter(plugin => plugin instanceof MiniCssExtractPlugin);
config.plugins = config.plugins.filter(plugin => !(plugin instanceof MiniCssExtractPlugin));
module.exports = smp.wrap(config);
module.exports.plugins.push(...cssPlugins);
