

to test locally:

nvm install v6.14
nvm use v6.14
firebase serve --only hosting,functions


to update keys (for instance, for the places api)

firebase functions:config:get
firebase functions:config:set places.key='server_key'

To test those environment variables, 
functions> firebase functions:config:get > .runtimeconfig.json
