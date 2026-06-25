module.exports = {
  plugins: [
    require('@tailwindcss/postcss'),
    require('autoprefixer'),
    ...(process.env.NODE_ENV === 'production' ? [require('cssnano')()] : [])
  ]
}
