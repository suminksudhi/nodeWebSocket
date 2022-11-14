const wsServer = require('./wsServer');
const { wsClient, sendMessage, eventEmitter: clientEvent } = require('./wsClient');

module.exports = { wsServer, wsClient, sendMessage, clientEvent }