# Cumulonimbus

**A simple, beautiful podcast app for the web.**

![Screenshot of episodes stream](https://i.imgur.com/OwnyW7m.png)
![Screenshot of episode details](https://i.imgur.com/Cvz7yEQ.png)

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

- [ ] Cache stream
- [ ] Keep `audio`s after refreshing stream
- [ ] Queue rearranging
- [ ] Remove items from queue
- [ ] Persistent currently playing and queue across sessions
