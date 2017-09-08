const { expect } = require("chai")

const Application = require("spectron").Application

describe("ui", function () {
  this.timeout(10000)

  console.log(require("electron"), __dirname)

  beforeEach(function () {
    this.app = new Application({
      path: require("electron"),
      args: ["main.js"]
    })
    return this.app.start()
  })

  afterEach(function () {
    if (this.app && this.app.isRunning()) {
      return this.app.stop()
    }
  })

  it("shows an initial window", function() {
    return this.app.client.getWindowCount().then(function(windowCount) {
      expect(windowCount).to.equal(1)
    })
  })

  it("tab navigation works", function() {
    this.app.webContents.on("did-finish-load", function(event) {
      let client = this.app.client
      client.element(".header_nav a:nth-child(2)").click()
      let classesFirst = client.getAttribute(".content-container .content:nth-of-type(1)", "class").split(" ")
      let classesSecond = client.getAttribute(".content-container .content:nth-of-type(2)", "class").split(" ")
      expect(classesFirst).to.not.include("current")
      expect(classesFirst).to.include("left")
      expect(classesSecond).to.not.include("right")
      expect(classesSecond).to.include("current")
    })
  })
})
