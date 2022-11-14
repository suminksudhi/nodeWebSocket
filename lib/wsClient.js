const WebSocket = require('ws');
const EventEmitter = require('events');
const { stringify } = require('./utils');
const eventEmitter = new EventEmitter();

/**
 * listening to server send heartbeat signals
 * @param data
 */
function heartbeat(data) {
    data && console.log(`Client: HeartBeat Received: ${data}`)
    clearTimeout(this.pingTimeout);
    this.pingTimeout = setTimeout(() => {
        this.terminate();
    }, 30000 + 1000);
}

/**
 * Websocket client
 * @param serverUrl
 * @returns {WebSocket}
 */
const wsClient = (serverUrl) => {
    const wsc = new WebSocket(serverUrl || 'ws://localhost:8080', {
        perMessageDeflate: false,
        handshakeTimeout : 10000
    });

    wsc.on('message', function message(data) {
        console.log('Client: Received Message: %s', data);
        try {
            const parsedData = JSON.parse(data);
            eventEmitter.emit(`wsm:${parsedData.type}`, parsedData);
        } catch (e) {
            console.log('Not to be processed');
        }
    });

    wsc.on('open', heartbeat);
    wsc.on('ping', heartbeat);
    wsc.on('close', function clear() {
        clearTimeout(this.pingTimeout);
    });

    return wsc;
}

/**
 *
 * @param wsClient
 * @param type
 * @returns {Promise<void>}
 */
const sendMessage = (wsClient, type) => {
    if(wsClient.readyState === WebSocket.OPEN) {
        wsClient.send(stringify({
            type
        }));
    } else {
        return console.log(`Client: WebSocket is closed: ${wsClient.readyState}`);
    }
}

module.exports = { wsClient, sendMessage, eventEmitter };