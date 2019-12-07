config.module.rules.push(
    {
        test: /\.js$/,
        use: ['source-map-loader'],
        enforce: 'pre'
    })
config.devtool= "source-map"
