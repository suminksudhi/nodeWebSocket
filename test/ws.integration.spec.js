const expect = require('chai').expect;
const wsServer = require('../lib/wsServer');
const { wsClient, Subscribe } = require('../lib/wsClient');
const http = require('http');
const WSRequest = require('superwstest');

describe('Websocket server tests', function(){
    let server = undefined;
    let wsc = undefined;
    let wss = undefined;

    before(async () => {
        server = http.createServer(() => console.log(" -/- "));
        wss = wsServer({ server });
        wsc = wsClient('ws://localhost:8080');
        server.listen(8080);
    });

    after(function(done) {
        if(server) {
            wsc && wsc.terminate();
            server.on('close', () => { done(); });
            server.close(() => { server.unref(); });
        }
    });

    it('Subscribe Test', function(done) {
        Subscribe(wsc);
        done();
    });

    it('Should return bad formatted payload if not json', async () => {
        await WSRequest(server)
            .ws('/')
            .expectText('Welcome')
            .sendText('foo')
            .expectText((actual) => {
                expect(actual).contain('Bad formatted payload');
            })
            .close()
            .expectClosed();
    });

    it('Should return requested method not implemented if not one of common message pattern', async () => {
        await WSRequest(server)
            .ws('/')
            .expectText('Welcome')
            .sendText('{"type":"magic"}')
            .expectText((actual) => {
                expect(actual).contain('Requested method not implemented');
            })
            .close()
            .expectClosed();
    });

    it('Should subscribe upon client request', async () => {
        await WSRequest(server)
            .ws('/')
            .expectText('Welcome')
            .sendText('{"type":"Subscribe"}')
            .expectText((actual) => {
                expect(actual).contain('Subscribed');
            })
            .wait(1000)
            .sendText('{"type":"Subscribe"}')
            .expectText((actual) => {
                expect(actual).contain('Subscribed');
            })
            .sendText('{"type":"CountSubscribers"}')
            .expectText((actual) => {
                expect(actual).contain('"count":1');
            })
            .close()
            .expectClosed();
    });

    it('Should subscribe and unsubscribe', async () => {
        await WSRequest(server)
            .ws('/')
            .expectText('Welcome')
            .sendText('{"type":"Subscribe"}')
            .expectText((actual) => {
                expect(actual).contain('Subscribe');
            })
            .sendText('{"type":"CountSubscribers"}')
            .expectText((actual) => {
                expect(actual).contain('"count":1');
            })
            .wait(1000)
            .sendText('{"type":"Unscubscribe"}')
            .expectText((actual) => {
                expect(actual).contain('Unsubscribed');
            })
            .sendText('{"type":"CountSubscribers"}')
            .expectText((actual) => {
                expect(actual).contain('"count":0');
            })
            .wait(1000)
            .sendText('{"type":"Unscubscribe"}')
            .expectText((actual) => {
                expect(actual).contain('Unsubscribed');
            })
            .sendText('{"type":"CountSubscribers"}')
            .expectText((actual) => {
                expect(actual).contain('"count":0');
            })
            .close()
            .expectClosed();
    }).timeout(30000);
})