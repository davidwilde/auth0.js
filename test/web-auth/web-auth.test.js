var expect = require('expect.js');
var stub = require('sinon').stub;
var request = require('superagent');

var storage = require('../../src/helper/storage');
var IframeHandler = require('../../src/helper/iframe-handler');

var RequestMock = require('../mock/request-mock');

var SilentAuthenticationHandler = require('../../src/web-auth/silent-authentication-handler');
var WebAuth = require('../../src/web-auth');

describe('auth0.WebAuth', function () {
  context('nonce validation', function () {
    after(function(){
      SilentAuthenticationHandler.prototype.login.restore();
      delete global.window;
    })

    before(function(){
      global.window = {};
      global.window.localStorage = {};
      global.window.localStorage.removeItem = function(key) {
        expect(key).to.be('com.auth0.auth.456');
      };
      global.window.localStorage.getItem = function(key) {
        expect(key).to.be('com.auth0.auth.456');
        return JSON.stringify({
          nonce: 'thenonce',
          appState: null
        });
      };
      storage.reload();
    })

    it('should fail if the nonce is not valid', function (done) {
      stub(SilentAuthenticationHandler.prototype, 'login', function(usePostMessage, cb) {
        cb(null, {
          state: '456',
          id_token: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwczovL21kb2NzLmF1dGgwLmNvbS8iLCJzdWIiOiJhdXRoMHw0QVpERjU2Nzg5IiwiYXVkIjpbIjBIUDcxR1NkNlB1b1JZSjNEWEtkaVhDVVVkR21CYnVwIl0sIm5vbmNlIjoiYXNhcyIsImV4cCI6MTQ3ODU2MjI1MywiaWF0IjoxNDc4NTI2MjUzfQ.-EUSbYg3ILUtFjlwCY8WyC3MAh9jGwpFN8KVihwrY0M'
        })
      });

      var webAuth = new WebAuth({
        domain: 'mdocs.auth0.com',
        redirectUri: 'http://page.com/callback',
        clientID: '0HP71GSd6PuoRYJ3DXKdiXCUUdGmBbup',
        responseType: 'id_token',
        scope: 'openid name read:blog',
        audience: 'urn:site:demo:blog',
        _sendTelemetry: false
      });

      var options = {
        nonce: '123',
        state: '456'
      };

      webAuth.renewAuth(options, function (err, data) {
        expect(err).to.eql({
          error: 'invalid_token',
          errorDescription: 'Nonce does not match'
        });
        expect(data).to.be(undefined);
        done();
      });
    });
  })
  context('paseHash', function () {
    before(function() {
      global.window = {};
      global.window.location = {};
      global.window.location.hash = '#access_token=asldkfjahsdlkfjhasd&id_token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwczovL21kb2NzLmF1dGgwLmNvbS8iLCJzdWIiOiJhdXRoMHw0QVpERjU2Nzg5IiwiYXVkIjoiMEhQNzFHU2Q2UHVvUllKM0RYS2RpWENVVWRHbUJidXAiLCJleHAiOjE0Nzg1NjIyNTMsImlhdCI6MTQ3ODUyNjI1M30.LELBxWWxcGdYTaE_gpSmlNSdcucqyrhuHQo-s7hTDBA&token_type=Bearer&state=theState&refresh_token=kajshdgfkasdjhgfas';
    });

    it('should parse a valid hash', function () {
      var webAuth = new WebAuth({
        domain: 'mdocs.auth0.com',
        redirectUri: 'http://example.com/callback',
        clientID: '0HP71GSd6PuoRYJ3DXKdiXCUUdGmBbup',
        responseType: 'token'
      });

      var data = webAuth.parseHash('#access_token=VjubIMBmpgQ2W2&id_token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwczovL21kb2NzLmF1dGgwLmNvbS8iLCJzdWIiOiJhdXRoMHw0QVpERjU2Nzg5IiwiYXVkIjpbIjBIUDcxR1NkNlB1b1JZSjNEWEtkaVhDVVVkR21CYnVwIl0sImV4cCI6MTQ3ODU2MjI1MywiaWF0IjoxNDc4NTI2MjUzfQ.3x97RcBqXq9UE3isgbPdVlC0XdU7kQrPhaOFR-Fb4TA&token_type=Bearer&state=theState&refresh_token=kajshdgfkasdjhgfas'); // eslint-disable-line

      expect(data).to.eql({
        accessToken: 'VjubIMBmpgQ2W2',
        idToken: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwczovL21kb2NzLmF1dGgwLmNvbS8iLCJzdWIiOiJhdXRoMHw0QVpERjU2Nzg5IiwiYXVkIjpbIjBIUDcxR1NkNlB1b1JZSjNEWEtkaVhDVVVkR21CYnVwIl0sImV4cCI6MTQ3ODU2MjI1MywiaWF0IjoxNDc4NTI2MjUzfQ.3x97RcBqXq9UE3isgbPdVlC0XdU7kQrPhaOFR-Fb4TA',
        idTokenPayload: {
          aud: ['0HP71GSd6PuoRYJ3DXKdiXCUUdGmBbup'],
          exp: 1478562253,
          iat: 1478526253,
          iss: 'https://mdocs.auth0.com/',
          sub: 'auth0|4AZDF56789'
        },
        appStatus: null,
        refreshToken: 'kajshdgfkasdjhgfas',
        state: 'theState',
        expiresIn: null,
        tokenType: 'Bearer'
      });
    });

    it('should parse a valid hash from the location.hash', function () {
      var webAuth = new WebAuth({
        domain: 'mdocs.auth0.com',
        redirectUri: 'http://example.com/callback',
        clientID: '0HP71GSd6PuoRYJ3DXKdiXCUUdGmBbup',
        responseType: 'token'
      });

      var data = webAuth.parseHash();

      expect(data).to.eql({
        accessToken: 'asldkfjahsdlkfjhasd',
        idToken: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwczovL21kb2NzLmF1dGgwLmNvbS8iLCJzdWIiOiJhdXRoMHw0QVpERjU2Nzg5IiwiYXVkIjoiMEhQNzFHU2Q2UHVvUllKM0RYS2RpWENVVWRHbUJidXAiLCJleHAiOjE0Nzg1NjIyNTMsImlhdCI6MTQ3ODUyNjI1M30.LELBxWWxcGdYTaE_gpSmlNSdcucqyrhuHQo-s7hTDBA', // eslint-disable-line
        idTokenPayload: {
          aud: '0HP71GSd6PuoRYJ3DXKdiXCUUdGmBbup',
          exp: 1478562253,
          iat: 1478526253,
          iss: 'https://mdocs.auth0.com/',
          sub: 'auth0|4AZDF56789'
        },
        appStatus: null,
        refreshToken: 'kajshdgfkasdjhgfas',
        state: 'theState',
        expiresIn: null,
        tokenType: 'Bearer'
      });
    });

    it('should parse a valid hash without id_token', function () {
      var webAuth = new WebAuth({
        domain: 'mdocs.auth0.com',
        redirectUri: 'http://example.com/callback',
        clientID: '0HP71GSd6PuoRYJ3DXKdiXCUUdGmBbup',
        responseType: 'token'
      });

      var data = webAuth.parseHash('#access_token=VjubIMBmpgQ2W2&token_type=Bearer&state=theState&refresh_token=kajshdgfkasdjhgfas'); // eslint-disable-line

      expect(data).to.eql({
        accessToken: 'VjubIMBmpgQ2W2',
        idToken: null,
        idTokenPayload: null,
        appStatus: null,
        refreshToken: 'kajshdgfkasdjhgfas',
        state: 'theState',
        expiresIn: null,
        tokenType: 'Bearer'
      });
    });

    it('should fail with an invalid audience', function () {
      var webAuth = new WebAuth({
        domain: 'mdocs.auth0.com',
        redirectUri: 'http://example.com/callback',
        clientID: '0HP71GSd6PuoRYJ3p',
        responseType: 'token'
      });

      var data = webAuth.parseHash('#access_token=VjubIMBmpgQ2W2&id_token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwczovL21kb2NzLmF1dGgwLmNvbS8iLCJzdWIiOiJhdXRoMHw0QVpERjU2Nzg5IiwiYXVkIjoiMEhQNzFHU2Q2UHVvUllKM0RYS2RpWENVVWRHbUJidXAiLCJleHAiOjE0Nzg1NjIyNTMsImlhdCI6MTQ3ODUyNjI1M30.LELBxWWxcGdYTaE_gpSmlNSdcucqyrhuHQo-s7hTDBA&token_type=Bearer&state=theState&refresh_token=kajshdgfkasdjhgfas'); // eslint-disable-line

      expect(data).to.eql({
        error: 'invalid_token',
        errorDescription: 'The clientID configured (0HP71GSd6PuoRYJ3p) does not match with the clientID set in the token (0HP71GSd6PuoRYJ3DXKdiXCUUdGmBbup).' // eslint-disable-line
      });
    });

    it('should fail with an invalid issuer', function () {
      var webAuth = new WebAuth({
        domain: 'mdocs_2.auth0.com',
        redirectUri: 'http://example.com/callback',
        clientID: '0HP71GSd6PuoRYJ3DXKdiXCUUdGmBbup',
        responseType: 'token'
      });

      var data = webAuth.parseHash('#access_token=VjubIMBmpgQ2W2&id_token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwczovL21kb2NzLmF1dGgwLmNvbS8iLCJzdWIiOiJhdXRoMHw0QVpERjU2Nzg5IiwiYXVkIjoiMEhQNzFHU2Q2UHVvUllKM0RYS2RpWENVVWRHbUJidXAiLCJleHAiOjE0Nzg1NjIyNTMsImlhdCI6MTQ3ODUyNjI1M30.LELBxWWxcGdYTaE_gpSmlNSdcucqyrhuHQo-s7hTDBA&token_type=Bearer&state=theState&refresh_token=kajshdgfkasdjhgfas'); // eslint-disable-line

      expect(data).to.eql({
        error: 'invalid_token',
        errorDescription: 'The domain configured (https://mdocs_2.auth0.com/) does not match with the domain set in the token (https://mdocs.auth0.com/).' // eslint-disable-line
      });
    });


    it('should fail if there is no token', function () {
      var webAuth = new WebAuth({
        domain: 'mdocs_2.auth0.com',
        redirectUri: 'http://example.com/callback',
        clientID: '0HP71GSd6PuoRYJ3DXKdiXCUUdGmBbup',
        responseType: 'token'
      });

      var data = webAuth.parseHash('#token_type=Bearer&state=theState'); // eslint-disable-line

      expect(data).to.be(null);
    });

    it('should parse an error response', function () {
      var webAuth = new WebAuth({
        domain: 'mdocs_2.auth0.com',
        redirectUri: 'http://example.com/callback',
        clientID: '0HP71GSd6PuoRYJ3DXKdiXCUUdGmBbup',
        responseType: 'token'
      });

      var data = webAuth.parseHash('#error=the_error_code&error_description=the_error_description&state=some_state');

      expect(data).to.eql({
        error: 'the_error_code',
        errorDescription: 'the_error_description',
        state: 'some_state'
      });
    });
  });

  context('renewAuth', function () {
    before(function(){
      global.window = {};
      global.window.removeEventListener = function(){};
    });
    after(function(){
      IframeHandler.prototype.init.restore();
    });

    it('should pass the correct authorize url', function (done) {
      stub(IframeHandler.prototype, 'init', function(message) {
        expect(this.url).to.be('https://me.auth0.com/authorize?client_id=...&response_type=id_token&response_mode=fragment&redirect_uri=http%3A%2F%2Fpage.com%2Fcallback&audience=urn%3Asite%3Ademo%3Ablog&scope=openid%20name%20read%3Ablog&state=456&nonce=123&prompt=none');
        this.timeoutCallback();
      });

      var webAuth = new WebAuth({
        domain: 'me.auth0.com',
        redirectUri: 'http://page.com/callback',
        clientID: '...',
        responseType: 'id_token',
        scope: 'openid name read:blog',
        audience: 'urn:site:demo:blog',
        _sendTelemetry: false
      });

      var options = {
        nonce: '123',
        state: '456'
      };

      webAuth.renewAuth(options, function (err, data) {
        expect(err.error).to.be('timeout');
        expect(err.description).to.be('Timeout during authentication renew.');
        expect(data).to.be(undefined);
        done();
      });
    });
  });

  context('login', function () {
    it('should check that responseType is present', function () {
      global.window = { location: '' };
      var webAuth = new WebAuth({
        domain: 'me.auth0.com',
        redirectUri: 'http://page.com/callback',
        clientID: '...',
        scope: 'openid name read:blog',
        audience: 'urn:site:demo:blog',
        _sendTelemetry: false
      });

      expect(function() {
        webAuth.authorize({ connection: 'facebook' })
      }).to.throwException(function (e) {
        expect(e.message).to.be('responseType option is required');
      });

      delete global.window;
    });
  });

  context('renewAuth', function () {
    beforeEach(function(){
      global.window = {};
    });

    afterEach(function () {
      delete global.window;
      SilentAuthenticationHandler.prototype.login.restore();
    });

    it('should validate the token', function (done) {
      stub(SilentAuthenticationHandler.prototype, 'login', function(usePostMessage, cb) {
        cb(null, {
          id_token: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwczovL21kb2NzLmF1dGgwLmNvbS8iLCJzdWIiOiJhdXRoMHw0QVpERjU2Nzg5IiwiYXVkIjpbIjBIUDcxR1NkNlB1b1JZSjNEWEtkaVhDVVVkR21CYnVwIl0sImV4cCI6MTQ3ODU2MjI1MywiaWF0IjoxNDc4NTI2MjUzfQ.3x97RcBqXq9UE3isgbPdVlC0XdU7kQrPhaOFR-Fb4TA'
        })
      });

      var webAuth = new WebAuth({
        domain: 'mdocs.auth0.com',
        redirectUri: 'http://page.com/callback',
        clientID: '0HP71GSd6PuoRYJ3DXKdiXCUUdGmBbup',
        responseType: 'id_token',
        scope: 'openid name read:blog',
        audience: 'urn:site:demo:blog',
        _sendTelemetry: false
      });

      var options = {
        nonce: '123',
        state: '456'
      };

      webAuth.renewAuth(options, function (err, data) {
        expect(err).to.be(null);
        expect(data).to.eql({
          id_token: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwczovL21kb2NzLmF1dGgwLmNvbS8iLCJzdWIiOiJhdXRoMHw0QVpERjU2Nzg5IiwiYXVkIjpbIjBIUDcxR1NkNlB1b1JZSjNEWEtkaVhDVVVkR21CYnVwIl0sImV4cCI6MTQ3ODU2MjI1MywiaWF0IjoxNDc4NTI2MjUzfQ.3x97RcBqXq9UE3isgbPdVlC0XdU7kQrPhaOFR-Fb4TA',
          idTokenPayload:
          {
            payload:
            {
              iss: 'https://mdocs.auth0.com/',
              sub: 'auth0|4AZDF56789',
              aud: [ '0HP71GSd6PuoRYJ3DXKdiXCUUdGmBbup' ],
              exp: 1478562253,
              iat: 1478526253
            },
            transaction: null
          }
        });
        done();
      });
    });

    it('should return the access_token', function (done) {
      stub(SilentAuthenticationHandler.prototype, 'login', function(usePostMessage, cb) {
        cb(null, {
          access_token: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1'
        })
      });

      var webAuth = new WebAuth({
        domain: 'mdocs.auth0.com',
        redirectUri: 'http://page.com/callback',
        clientID: '0HP71GSd6PuoRYJ3DXKdiXCUUdGmBbup',
        responseType: 'token',
        scope: 'openid name read:blog',
        audience: 'urn:site:demo:blog',
        _sendTelemetry: false
      });

      var options = {
        state: 'asdfasd'
      };

      webAuth.renewAuth(options, function (err, data) {
        expect(err).to.be(null);
        expect(data).to.eql({
          access_token: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1'
        });
        done();
      });
    });

    it('should validate the token and fail', function (done) {
      stub(SilentAuthenticationHandler.prototype, 'login', function(usePostMessage, cb) {
        cb(null, {
          id_token: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwczovL21kb2NzLmF1dGgwLmNvbS8iLCJzdWIiOiJhdXRoMHw0QVpERjU2Nzg5IiwiYXVkIjpbIjBIUDcxR1NkNlB1b1JZSjNEWEtkaVhDVVVkR21CYnVwIl0sImV4cCI6MTQ3ODU2MjI1MywiaWF0IjoxNDc4NTI2MjUzfQ.3x97RcBqXq9UE3isgbPdVlC0XdU7kQrPhaOFR-Fb4TA'
        })
      });

      var webAuth = new WebAuth({
        domain: 'mdocs.auth0.com',
        redirectUri: 'http://page.com/callback',
        clientID: '...',
        responseType: 'id_token',
        scope: 'openid name read:blog',
        audience: 'urn:site:demo:blog',
        _sendTelemetry: false
      });

      var options = {
        nonce: '123',
        state: '456'
      };

      webAuth.renewAuth(options, function (err, data) {
        expect(data).to.be(undefined);
        expect(err).to.eql({
          error: 'invalid_token',
          errorDescription: 'The clientID configured (...) does not match with the clientID set in the token (0HP71GSd6PuoRYJ3DXKdiXCUUdGmBbup).'
        });
        done();
      });
    });
  });

  context('change password', function () {
    before(function () {
      this.auth0 = new WebAuth({
        domain: 'me.auth0.com',
        clientID: '...',
        redirectUri: 'http://page.com/callback',
        responseType: 'code',
        _sendTelemetry: false
      });
    });

    afterEach(function () {
      request.post.restore();
    });

    it('should call db-connection changePassword with all the options', function (done) {
      stub(request, 'post', function (url) {
        expect(url).to.be('https://me.auth0.com/dbconnections/change_password');
        return new RequestMock({
          body: {
            client_id: '...',
            connection: 'the_connection',
            email: 'me@example.com'
          },
          headers: {
            'Content-Type': 'application/json'
          },
          cb: function (cb) {
            cb(null, {});
          }
        });
      });

      this.auth0.changePassword({
        connection: 'the_connection',
        email: 'me@example.com'
      }, function (err) {
        expect(err).to.be(null);
        done();
      });
    });

    it('should call db-connection changePassword should ignore password option', function (done) {
      stub(request, 'post', function (url) {
        expect(url).to.be('https://me.auth0.com/dbconnections/change_password');
        return new RequestMock({
          body: {
            client_id: '...',
            connection: 'the_connection',
            email: 'me@example.com'
          },
          headers: {
            'Content-Type': 'application/json'
          },
          cb: function (cb) {
            cb(null, {});
          }
        });
      });

      this.auth0.changePassword({
        connection: 'the_connection',
        email: 'me@example.com',
        password: '123456'
      }, function (err) {
        expect(err).to.be(null);
        done();
      });
    });
  });

  context('passwordless start', function () {
    before(function () {
      this.auth0 = new WebAuth({
        domain: 'me.auth0.com',
        clientID: '...',
        redirectUri: 'http://page.com/callback',
        responseType: 'code',
        _sendTelemetry: false
      });
    });

    afterEach(function () {
      request.post.restore();
    });

    it('should call passwordless start sms with all the options', function (done) {
      stub(request, 'post', function (url) {
        expect(url).to.be('https://me.auth0.com/passwordless/start');
        return new RequestMock({
          body: {
            client_id: '...',
            connection: 'the_connection',
            phone_number: '123456'
          },
          headers: {
            'Content-Type': 'application/json'
          },
          cb: function (cb) {
            cb(null, {
              body: {}
            });
          }
        });
      });

      this.auth0.passwordlessStart({
        connection: 'the_connection',
        phoneNumber: '123456',
        type: 'sms'
      }, function (err, data) {
        expect(err).to.be(null);
        expect(data).to.eql({});
        done();
      });
    });

    it('should call passwordless start email with all the options', function (done) {
      stub(request, 'post', function (url) {
        expect(url).to.be('https://me.auth0.com/passwordless/start');
        return new RequestMock({
          body: {
            client_id: '...',
            connection: 'the_connection',
            email: 'me@example.com'
          },
          headers: {
            'Content-Type': 'application/json'
          },
          cb: function (cb) {
            cb(null, {
              body: {}
            });
          }
        });
      });

      this.auth0.passwordlessStart({
        connection: 'the_connection',
        email: 'me@example.com',
        type: 'email'
      }, function (err, data) {
        expect(err).to.be(null);
        expect(data).to.eql({});
        done();
      });
    });
  });

  context('signup and login', function () {
    before(function () {
      this.auth0 = new WebAuth({
        domain: 'me.auth0.com',
        clientID: '...',
        redirectUri: 'http://page.com/callback',
        responseType: 'token',
        _sendTelemetry: false
      });
    });

    afterEach(function () {
      request.post.restore();
    });

    it('should call db-connection signup with all the options', function (done) {

      stub(request, 'post', function (url) {

        if (url === 'https://me.auth0.com/oauth/token') {
          return new RequestMock({
            body: {
              client_id: '...',
              realm: 'the_connection',
              grant_type: 'http://auth0.com/oauth/grant-type/password-realm',
              username: 'me@example.com',
              password: '123456',
              scope: 'openid'
            },
            headers: {
              'Content-Type': 'application/json'
            },
            cb: function(cb) {
              cb(null, {
                body: {
                  'token_type': 'Bearer',
                  'expires_in': 36000,
                  'id_token': 'eyJ...'
                }
              });
            }
          });
        }

        if (url === 'https://me.auth0.com/dbconnections/signup') {
          return new RequestMock({
            body: {
              client_id: '...',
              connection: 'the_connection',
              email: 'me@example.com',
              password: '123456'
            },
            headers: {
              'Content-Type': 'application/json'
            },
            cb: function (cb) {
              cb(null, {
                body: {
                  _id: '...',
                  email_verified: false,
                  email: 'me@example.com'
                }
              });
            }
          });
        }

        throw new Error('Invalid url in request post stub');
      });

      this.auth0.signupAndAuthorize({
        connection: 'the_connection',
        email: 'me@example.com',
        password: '123456',
        scope: 'openid'
      }, function (err, data) {
        done();
      });
    });

    it('should propagate signup errors', function (done) {
      stub(request, 'post', function (url) {

        expect(url).to.be('https://me.auth0.com/dbconnections/signup');

        return new RequestMock({
          body: {
            client_id: '...',
            connection: 'the_connection',
            email: 'me@example.com',
            password: '123456'
          },
          headers: {
            'Content-Type': 'application/json'
          },
          cb: function (cb) {
            cb({
              response: {
                "statusCode":400,
                body: {
                  "code":"user_exists",
                  "description":"The user already exists."
                }
              }
            });
          }
        });
      });

      this.auth0.signupAndAuthorize({
        connection: 'the_connection',
        email: 'me@example.com',
        password: '123456',
        scope: 'openid'
      }, function (err, data) {
        expect(data).to.be(undefined);
        expect(err).to.eql({
          original: {
            response: {
              "statusCode":400,
              body: {
                "code":"user_exists",
                "description":"The user already exists."
              }
            }
          },
          "code":"user_exists",
          "description":"The user already exists.",
          "statusCode":400
        });
        done();
      });
    });
  });
});
