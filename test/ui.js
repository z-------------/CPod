const { expect } = require("chai")
const path = require("path")

const Application = require("spectron").Application

describe("ui", function() {
  this.timeout(10000)

  console.log(require("electron"), __dirname, path.join(__dirname, "..", "main.js"))

  beforeEach(function() {
    this.app = new Application({
      path: require("electron"),
      args: [path.join(__dirname, "..", "main.js")]
    })
    return this.app.start()
  })

  afterEach(function() {
    if (this.app && this.app.isRunning()) {
      return this.app.stop()
    }
  })

  it("should show an initial window", function() {
    return this.app.client.getWindowCount().then(function(windowCount) {
      expect(windowCount).to.equal(1)
    })
  })

  it("tab navigation should work", function(done) {
    let client = this.app.client;

    client.element(".header_nav a:nth-child(2)").click()
    client.getAttribute(".content-container .content:nth-of-type(1)", "class").then(classesFirstStr => {
      var classesFirst = classesFirstStr.split(" ")
      client.getAttribute(".content-container .content:nth-of-type(2)", "class").then(classesSecondStr => {
        var classesSecond = classesSecondStr.split(" ")

        expect(classesFirst).to.not.include("current")
        expect(classesFirst).to.include("left")
        expect(classesSecond).to.not.include("right")
        expect(classesSecond).to.include("current")
        done()
      })
    })

  })
})
