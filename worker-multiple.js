export default {
  async fetch(request, env, ctx) {
    const version = "0.1";

    const LOGLEVEL = (env.LOGLEVEL || 'INFO').toUpperCase();
    const webhookSecret = env.WEBHOOK_SECRET;
    const serviceUrls = (env.SERVICE_URLS || '').split("\n").filter(Boolean);

    const url = new URL(request.url);
    const method = request.method;

    if (method === 'GET') {
      if (LOGLEVEL !== 'ERROR') {
        console.log(`Webhook Secret: ${webhookSecret}`);
        console.log(`URLs: ${serviceUrls.join(',')}`);
      }
      return new Response(null, { status: 403 });
    }

    const token = url.searchParams.get('token');
    if (!token) {
      return new Response('Token not provided', { status: 400 });
    }

    if (LOGLEVEL !== 'ERROR') console.log(`Token: ${token}`);

    if (token !== webhookSecret) {
      return new Response(':(', {
        status: 401,
        headers: { 'content-type': 'text/plain' }
      });
    }

    const contentType = request.headers.get('content-type') || '';
    let data;
    let payload;
    try {
      data = await request.text();
      if (contentType.includes('application/x-www-form-urlencoded')) {
        const params = new URLSearchParams(data);
        if (params.has('payload')) {
          payload = JSON.parse(params.get('payload'));
          if (LOGLEVEL === 'INFO' || LOGLEVEL === 'DEBUG') {
            console.log(`Event: ${payload.event}`);
            console.log(`Server: ${payload.Server?.title}`);
          }
        }
      }
    } catch (err) {
      if (LOGLEVEL === 'DEBUG') console.error('Error parsing request body', err);
    }

    const headers = new Headers(request.headers);
    headers.set('User-Agent', `Webhook-proxy ${version}`);

    let returnError = null;
    let returnContent = null;
    let returnHeaders = {};

    for (const targetUrl of serviceUrls) {
      try {
        const res = await fetch(targetUrl, {
          method: method,
          headers: headers,
          body: data
        });

        if (LOGLEVEL === 'INFO' || LOGLEVEL === 'DEBUG') {
          console.log(`Response status from ${targetUrl}: ${res.status}`);
        }

        const resHeaders = {};
        for (const [name, value] of res.headers.entries()) {
          if (!['content-encoding', 'content-length', 'transfer-encoding', 'connection'].includes(name.toLowerCase())) {
            resHeaders[name] = value;
          }
        }

        if (res.status > 399) {
          returnError = res.status;
          returnContent = await res.text();
        }

        returnHeaders = resHeaders;
      } catch (err) {
        console.error(`Request to ${targetUrl} failed:`, err);
        returnError = 500;
        returnContent = `Internal Server Error: ${err}`;
      }
    }

    if (returnError !== null) {
      return new Response(returnContent, {
        status: returnError,
        headers: returnHeaders
      });
    } else {
      return new Response('success', {
        status: 200,
        headers: returnHeaders
      });
    }
  }
};
