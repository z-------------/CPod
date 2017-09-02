# Cumulonimbus

**A simple, beautiful podcast app.**

![Screenshot](http://i.imgur.com/eZ5Q25g.png)

## Installing and building

### For normal use

Get the latest binaries from the ![Releases](https://github.com/z-------------/cumulonimbus/releases) tab. Available for Windows, macOS, and Linux.

### For development

1. Install Node and Bower dependencies (`npm install` or `yarn install`; `bower install`)
2. Run Gulp to compile SCSS and Pug, concatenate .js files, etc (`gulp`)
3. Start the app (`electron .`)

To package the app, run `yarn dist-{win|linux}`. (If it tells you `electron-builder` isn't a valid command, do `yarn add electron-builder --dev` and try again.)

## To-do

- [x] Cache stream
- [x] Keep `audio`s after refreshing stream
- [x] Cache "known podcasts", query by `id`, `url` etc
- [x] Show episodes in podcast detail view
- [ ] Queue rearranging
- [ ] Remove items from queue
- [x] Persistent currently playing across sessions
- [ ] Persistent queue across sessions
- [ ] Discover popular podcasts
- [x] Export podcasts as OPML
- [x] Import podcasts by OPML
- [x] More robust episode caching and updating
- [x] Move dev-only dependencies to `devDependencies`
