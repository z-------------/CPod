# Cumulonimbus

<div style="font-size: 50px; background-color: red; color: white;">Current build doesn't work at all. WIP.</div>

**A simple, beautiful podcast app for the web.**

![Screenshot](http://i.imgur.com/zHOoF70.png)

## Dependencies

Please install the following:

+ `node`
+ `npm` (should come with `node`)
+ `bower`
+ `gulp`

Then run `npm install` and `bower install` to install Node and Bower modules, respectively.

## Run

Run `npm start` to start. Cumulonimbus will now be running on `localhost` at port `3000`. Navigate to that address in a web browser to see it in action.

(Optionally, you can run `foreman start` instead, and Cumulonimbus will start listening on the `PORT` specified in `.env`.)

Run `gulp` to compile all the pug and scss. `gulp watch` to compile when anything changes.

## To-do

- [x] Cache stream
- [x] Keep `audio`s after refreshing stream
- [x] Cache "known podcasts", query by `id`, `url` etc
- [x] Show episodes in podcast detail view
- [ ] Queue rearranging
- [ ] Remove items from queue
- [ ] Persistent currently playing and queue across sessions
- [ ] Discover popular podcasts
- [x] Export podcasts as OPML
- [x] Import podcasts by OPML
- [x] More robust episode caching and updating
