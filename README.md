<h1 align="center">
  <br>
  <a href="https://github.com/z-------------/cumulonimbus">
    <img src="https://cdn.rawgit.com/z-------------/cumulonimbus/35c95868/build/icon.svg" width="128" height="128" alt="CPod logo" />
  </a>
  <br>
  CPod
  <br>
</h1>

<p align="center">(formerly Cumulonimbus)</p>
<h4 align="center">A simple, beautiful podcast app.</h4>

<div align="center">
  <a href="https://github.com/z-------------/CPod/releases"><img src="https://img.shields.io/github/release-date-pre/z-------------/CPod.svg?label=latest%20(pre)release" /></a>
  <a href="https://github.com/z-------------/CPod/commits/master"><img src="https://img.shields.io/github/last-commit/z-------------/CPod" /></a>
</div>
<br>

**NOTE: CPod is not actively maintained. Please expect bugs.**

A review by *OMG! Ubuntu!*: [A Terrific Podcast Client with a Terrible Name](http://www.omgubuntu.co.uk/2017/11/cumulonimbus-electron-podcast-client)

![Screenshot](https://i.imgur.com/S7K9wrr.png)

## Install

Get the [**latest releases**](https://github.com/z-------------/CPod/releases).

Available for **Windows**, **macOS**, and **Linux**.

### Install for development

0. Have [Node.js 8](https://nodejs.org/en/download/releases/), [Yarn](https://yarnpkg.com/docs/install), and [gulp-cli](https://gulpjs.com/) installed, and `cd` to the repo directory.
1. Run `yarn` to install npm dependencies.
2. Run `gulp` to compile and concatenate JavaScript, SCSS, Pug, etc. (or `gulp both` to also watch for changes).
3. Run `yarn start` to start CPod.

Be sure not to work on `all.js` or on any of the compiled `.html` or `.css` files when there is a `.pug` or `.scss` counterpart, respectively.

### Packaging

0. Follow steps 0 to 2 in [Install for development](#install-for-development)
1. (If electron-builder complains about missing dependencies) Set temporary environment variable: `ELECTRON_BUILDER_ALLOW_UNRESOLVED_DEPENDENCIES=true`
2. Run `yarn dist`

The binary/installer will be in the `dist` directory.

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md)

## License

```
Copyright 2015-2019 Zachary James Guard

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```
