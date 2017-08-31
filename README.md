# Cumulonimbus

**A simple, beautiful podcast app.**

![Screenshot](http://i.imgur.com/zHOoF70.png)

## Installing and building

### For normal use

Get the latest binaries from the ![Releases](https://github.com/z-------------/cumulonimbus/releases) tab (currently only built for Windows).

### For development

1. Install Node and Bower modules (`npm install`, `bower install`)
2. Run Gulp to compile SCSS and Pug, concatenate .js files, etc (`gulp`)
3. Start the app (`electron .`)

To package the app, run `yarn dist`.

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
- [x] Move dev-only dependencies to `devDependencies`
