# Cumulonimbus

**A simple, beautiful podcast app.**

![Screenshot](http://i.imgur.com/eZ5Q25g.png)

## Installing and building

### For normal use

Get the latest binaries from the [Releases](https://github.com/z-------------/cumulonimbus/releases) tab. Available for Windows, macOS, and Linux. (Only Windows 64-bit versions are guaranteed to be available for every release.)

### For development

0. Have [Yarn](https://yarnpkg.com/en/docs/install) and [Gulp](https://gulpjs.com) installed.
1. Run `yarn install` to install Node modules.
2. Run `gulp` to compile SCSS and Pug, concatenate JavaScript files, etc.
3. Run `yarn start` to start the app.

To package the app, run `yarn dist-{win|mac|linux}`.

(You can probably achieve the same results with [npm](https://www.npmjs.com/get-npm), but it's a lot less fiddly with Yarn and `electron-builder` isn't guaranteed to work properly with npm.)

## To-do

- [x] Cache stream
- [x] Keep `audio`s after refreshing stream
- [x] Cache "known podcasts", query by `id`, `url` etc
- [x] Show episodes in podcast detail view
- [ ] Queue rearranging
- [x] Remove items from queue
- [x] Persistent currently playing across sessions
- [ ] Persistent queue across sessions
- [ ] Discover popular podcasts
- [x] Export podcasts as OPML
- [x] Import podcasts by OPML
- [x] More robust episode caching and updating
- [x] Move dev-only dependencies to `devDependencies`
