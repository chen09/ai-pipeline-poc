const { makeHandlerMap } = require("./handlers-v1");

function getHandlerMap() {
  return makeHandlerMap("v2", 2);
}

module.exports = { getHandlerMap };
