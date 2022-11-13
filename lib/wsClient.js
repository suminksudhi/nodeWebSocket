const WebSocket = require('ws');
const { stringify } = require('./utils');

function heartbeat(data) {
    console.log(`client heart beat called ${data}`)
    clearTimeout(this.pingTimeout);
    this.pingTimeout = setTimeout(() => {
        this.terminate();
    }, 30000 + 1000);
}

const wsClient = (serverUrl) => {
    const wsc = new WebSocket(serverUrl || 'ws://localhost:8080', {
        perMessageDeflate: false,
        handshakeTimeout : 10000
    });

    wsc.on('open', function open() {
        wsc.send('something1');
    });

    wsc.on('message', function message(data) {
        console.log('Client Received: %s', data);
    });

    wsc.on('open', heartbeat);
    wsc.on('ping', heartbeat);
    wsc.on('close', function clear() {
        clearTimeout(this.pingTimeout);
    });

    return wsc;
}

// subscribe to websocket
function Subscribe(wsClient) {
    wsClient.on('open', () => {
        wsClient.send(stringify({
            type: 'Subscribe'
        }));
    });
}

// subscribe to websocket
function UnSubscribe(wsClient) {
    wsClient.on('open', () => {
        wsClient.send(stringify({
            type: 'UnSubscribe'
        }));
    });
}

// subscribe to websocket
function CountSubscriber(wsClient) {
    wsClient.on('open', () => {
        wsClient.send(stringify({
            type: 'UnSubscribe'
        }));
    });
}
module.exports = { wsClient, Subscribe };