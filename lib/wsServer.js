const WebSocket = require('ws');
const { stringify, sleep } = require('./utils');

let clients = [];
const SUBSCRIPTION_RESPONSE_DELAY = 4000;
const UNSUBSCRIPTION_RESPONSE_DELAY = 8000;
const HEARTBEAT_INTERVAL = 1000;

/**
 * Server supported operations
 * @type {{Subscribe: (function(*): number), CountSubscribers: *, UnSubscribe: Ops.UnSubscribe}}
 */
const Ops = {
    Subscribe: async (ws) => {
        let index = clients.findIndex(x => ws === x.ws);
        const stat = {
            "type": "Subscribe",
            "status": "Subscribed",
            "updatedAt": new Date().toISOString()
        }
        await sleep(SUBSCRIPTION_RESPONSE_DELAY);
        if (index === -1) {
            clients.push({
                ws,
                stat
            });
            return stat;
        } else if(index > -1 && clients[index].stat.status !== 'Subscribed') {
            clients[index].stat = stat;
            return stat;
        } else {
            const { stat: status } = clients[index];
            return status;
        }
    },
    Unscubscribe: async (ws) => {
        let index = clients.findIndex(x => ws === x.ws);
        const stat = {
            "type": "Unscubscribe",
            "status": "Unsubscribed",
            "updatedAt": new Date().toISOString()
        };
        await sleep(UNSUBSCRIPTION_RESPONSE_DELAY);
        if (index === -1) {
            clients.push({
                ws,
                stat
            });
            return stat;
        } else if(index > -1 && clients[index].stat.status === 'Subscribed') {
            clients[index].stat = stat;
            return stat;
        } else {
            const { stat: status } = clients[index];
            return status;
        }
    },
    CountSubscribers: async () => {
        return {
            "type": "CountSubscribers",
            "count": clients.filter(x => x.stat.status === 'Subscribed').length,
            "updatedAt": new Date().toISOString()
        }
    },
    Default: async () => {
        return {
            "type": "Error",
            "error": "Requested method not implemented",
            "updatedAt": new Date().toISOString()
        }
    }
}

/**
 * main process handler
 * @param requestData
 * @returns {Promise<{type: string, error: string, updatedAt: string}|*|{type: string, error: string, updatedAt: string}>}
 */
const processRequest = async (requestData) => {
    try {
        const request = JSON.parse(requestData);
        return Ops[request.type] ? Ops[request.type]() : Ops['Default']();
    } catch (e) {
        return {
            "type": "Error",
            "error": "Bad formatted payload, non JSON",
            "updatedAt": new Date().toISOString()
        }
    }
}

/**
 * Socket Server
 * @param options
 * @returns {WebSocket.Server<T>}
 */
const wsServer = (options) =>  {

    function heartbeat() {
        this.isAlive = true;
    }

    const wss = new WebSocket.WebSocketServer({
        // port: 8080,
        perMessageDeflate: {
            zlibDeflateOptions: {
                // See zlib defaults.
                chunkSize: 1024,
                memLevel: 7,
                level: 3
            },
            zlibInflateOptions: {
                chunkSize: 10 * 1024
            },
            // Other options settable:
            clientNoContextTakeover: true, // Defaults to negotiated value.
            serverNoContextTakeover: true, // Defaults to negotiated value.
            serverMaxWindowBits: 10, // Defaults to negotiated value.
            // Below options specified as default values.
            concurrencyLimit: 10, // Limits zlib concurrency for perf.
            threshold: 1024 // Size (in bytes) below which messages
            // should not be compressed if context takeover is disabled.
        },
        ...options
    });

    wss.on('connection', (ws, request) => {
        ws.isAlive = true;
        ws.on('pong', heartbeat);
        ws.on('message', async (data) => {
            console.log(`Server: Request Received: ${data}`);
            const processedData = stringify(await processRequest(data));
            console.log(`Server: Processed Data ${new Date().toISOString()}: ${processedData}`);
            ws.send(processedData);
        });
        ws.send('Welcome');
    });

    /**
     * send heartbeat to clients
     * @type {number}
     */
    const interval = setInterval(function ping() {
        wss.clients.forEach(function each(ws) {
            if (ws.isAlive === false) return ws.terminate();
            ws.isAlive = false;
            ws.ping(stringify({
                "type": "Heatbeat",
                "updatedAt": new Date().toISOString()
            }));
        });
    }, HEARTBEAT_INTERVAL);

    wss.on('close', function close() {
        console.log('Socket close called')
        clearInterval(interval);
    });

    return wss;
}

module.exports = wsServer;

