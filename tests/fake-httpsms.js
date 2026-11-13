/**
 * Faux httpSMS (https://api.httpsms.com/v1/messages/send), pour tester l'envoi
 * des SMS sans téléphone. À charger après les autres faux serveurs : les autres
 * adresses leur sont transmises.
 */
(function (g) {
  'use strict';

  var previous = g.UrlFetchApp.fetch;

  var fake = g.__fakeHttpsms = {
    key: 'httpsms-cle-de-test-pas-une-vraie-0001',
    messages: [],
    calls: [],
    queue: [],      // réponses forcées, utilisées dans l'ordre (ex. { code: 500 })
    down: false,    // true : httpSMS injoignable
    reset: function () { fake.messages = []; fake.calls = []; fake.queue = []; fake.down = false; }
  };

  function respond(code, body) {
    var text = typeof body === 'string' ? body : JSON.stringify(body);
    return {
      getResponseCode: function () { return code; },
      getContentText: function () { return text; },
      getAllHeaders: function () { return {}; }
    };
  }

  g.UrlFetchApp = {
    fetch: function (url, params) {
      params = params || {};
      if (String(url).indexOf('https://api.httpsms.com/') !== 0) return previous(url, params);
      if (fake.down) throw new Error('Address unavailable : api.httpsms.com');
      var headers = params.headers || {};
      var body = params.payload ? JSON.parse(params.payload) : {};
      fake.calls.push({ url: url, headers: headers, body: body, options: params });
      if (fake.queue.length) {
        var forced = fake.queue.shift();
        return respond(forced.code, forced.body || { message: 'forced', status: 'error' });
      }
      if (headers['x-api-key'] !== fake.key) {
        return respond(401, { message: 'You are not authorized to carry out this request.', status: 'error', data: 'Make sure your API key is set in the [X-API-Key] header in the request' });
      }
      if (!/^\+\d{9,15}$/.test(String(body.to || '')) || !String(body.content || '').trim()) {
        return respond(422, { message: 'validation errors while sending message', status: 'error', data: { to: ['The to field must be a valid E.164 phone number'] } });
      }
      fake.messages.push(body);
      return respond(200, {
        data: { id: 'msg-' + fake.messages.length, contact: body.to, content: body.content, owner: body.from, status: 'pending' },
        message: 'message added to queue', status: 'success'
      });
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
