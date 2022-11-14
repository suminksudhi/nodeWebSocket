// integration test using client and server implementation

const expect = require('chai').expect;
const wsServer = require('../lib/wsServer');
const { wsClient, sendMessage, eventEmitter } = require('../lib/wsClient');
const http = require('http');
const { sleep } = require("../lib/utils");
const ENVS = require('../lib/constant');
const WebSocket = require("ws");

const { SUBSCRIPTION_RESPONSE_DELAY, UNSUBSCRIPTION_RESPONSE_DELAY } = ENVS;
describe('Websocket Server/Client integration tests', function(){
    let server = undefined;
    let wsc = undefined;
    let wss = undefined;

    before(async () => {
        server = http.createServer(() => console.log(" -/- "));
        wss = wsServer({ server });
        wsc = wsClient('ws://localhost:8080');
        server.listen(8080);
        await sleep(5);
    });

    after(async () => {
        if(server) {
            wsc && wsc.terminate();
            server.close(() => { server.unref(); });
        }
        eventEmitter.removeAllListeners();
    });

    afterEach(async () => {
        eventEmitter.removeAllListeners();
    });

    it('Should return bad formatted payload if not json', async () => {
        if(wsc.readyState === WebSocket.OPEN) {
            wsc.send("hello");
        }
        eventEmitter.on('wsm:Error',async (data) => {
            await expect(data.error).equal('Bad formatted payload, non JSON');
        });
        await sleep(2500);
    }).timeout(3000);

    it('Should return requested method not implemented if not one of common message pattern (Subscribe|Unscubscribe|CountSubscribers)', async () => {
        sendMessage(wsc,'MAgIC');
        eventEmitter.on('wsm:Error',async (data) => {
            await expect(data.error).equal('Requested method not implemented');
        });
    });

    it('Should show 0 subscription', async () => {
        sendMessage(wsc, 'CountSubscribers');
        eventEmitter.on('wsm:CountSubscribers',async (data) => {
            await expect(data.count).equal(0);
        });
        await sleep(10);
    });

    it('Subscribe Test', async () => {
        sendMessage(wsc,'Subscribe');
        eventEmitter.on('wsm:Subscribe',async (data) => {
            await expect(data.status).equal('Subscribed');
        });
        await sleep(SUBSCRIPTION_RESPONSE_DELAY + 5);
    }).timeout(SUBSCRIPTION_RESPONSE_DELAY + 20);


    it('Should show 1 subscription and test Subscription idempotent rule', async () => {
        sendMessage(wsc,'Subscribe');
        let firstSubscriptionData, secondSubscriptionData;
        eventEmitter.on('wsm:Subscribe',async (data) => {
            firstSubscriptionData = data;
            await expect(data.status).equal('Subscribed');
        });
        await sleep(SUBSCRIPTION_RESPONSE_DELAY + 5);
        eventEmitter.removeAllListeners('wsm:Subscribe');

        sendMessage(wsc,'Subscribe');
        eventEmitter.on('wsm:Subscribe',async (data) => {
            secondSubscriptionData = data;
            await expect(data.status).equal('Subscribed');
        });
        await sleep(SUBSCRIPTION_RESPONSE_DELAY + 50);

        // subscription idempotent test
        expect(firstSubscriptionData.updatedAt).equal(secondSubscriptionData.updatedAt);

        sendMessage(wsc, 'CountSubscribers');
        eventEmitter.on('wsm:CountSubscribers',async (data) => {
            await expect(data.count).equal(1);
        });
        await sleep(10);
    }).timeout(2 * SUBSCRIPTION_RESPONSE_DELAY + 500);

    it('Should successfully subscribe -> count(1) -> 2 * unsubscribe (idempotent) -> count(0)', async () => {
        let firstUnSubscriptionData, secondUnSubscriptionData;
        sendMessage(wsc,'Subscribe');
        eventEmitter.on('wsm:Subscribe',async (data) => {
            await expect(data.status).equal("Subscribed");
        });
        await sleep(SUBSCRIPTION_RESPONSE_DELAY + 5);
        sendMessage(wsc, 'CountSubscribers');
        eventEmitter.on('wsm:CountSubscribers',async (data) => {
            await expect(data.count).equal(1);
        });
        eventEmitter.removeAllListeners('wsm:CountSubscribers');
        await sleep(100);

        sendMessage(wsc,'Unscubscribe');
        eventEmitter.on('wsm:Unscubscribe',async (data) => {
            firstUnSubscriptionData = data;
            await expect(data.status).equal("Unsubscribed");
        });
        await sleep(UNSUBSCRIPTION_RESPONSE_DELAY + 100);

        sendMessage(wsc,'Unscubscribe');
        eventEmitter.on('wsm:Unscubscribe',async (data) => {
            secondUnSubscriptionData = data;
            await expect(data.status).equal("Unsubscribed");
        });
        await sleep(UNSUBSCRIPTION_RESPONSE_DELAY + 5);

        // unsubscription idempotent test
        expect(firstUnSubscriptionData.updatedAt).equal(secondUnSubscriptionData.updatedAt);

        sendMessage(wsc, 'CountSubscribers');
        eventEmitter.on('wsm:CountSubscribers',async (data) => {
            await expect(data.count).equal(0);
        });
        await sleep(10);
    }).timeout(SUBSCRIPTION_RESPONSE_DELAY + (2 * UNSUBSCRIPTION_RESPONSE_DELAY) + 500);

})