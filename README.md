# Cumulonimbus

**A simple, beautiful podcast app for the web.**

![Screenshot of episodes stream](https://i.imgur.com/aOkZWqm.png)
![Screenshot of episode details](https://i.imgur.com/SFGXXU3.png)
![Screenshot of podcast manager](https://i.imgur.com/b4GcMxD.png)

## Dependencies

Please install the following:

+ `node` (should come with `npm`)
+ `bower`
+ `gulp`

Then run `npm install` and `bower install` to install Node and Bower modules, respectively.

## Run

`cd` to the `cumulonimbus` directory.

Run `npm start` to start. Cumulonimbus will now be running on `localhost` at port `3000`. Navigate to that address in a web browser to see it in action.

(Optionally, you can run `foreman start` instead, and Cumulonimbus will start listening on the `PORT` specified in `.env`.)

In order to compile the SCSS into CSS, run `gulp css`, and `gulp css:watch` to listen for changes and run automatically.

## To-do

- [x] Cache stream
- [x] Keep `audio`s after refreshing stream
- [ ] Cache "known podcasts", query by `id`, `url` etc
- [ ] Show episodes in podcast detail view
- [ ] Queue rearranging
- [ ] Remove items from queue
- [ ] Persistent currently playing and queue across sessions
