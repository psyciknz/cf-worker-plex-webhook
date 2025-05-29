export default {
  async fetch(request, env, ctx) {
    const version = "0.1";

    const LOGLEVEL = (env.LOGLEVEL || 'INFO').toUpperCase();
    const webhookSecret = await env.WEBHOOK_SECRET.get();
    const serviceUrls = (env.SERVICE_URLS || '').split(";").filter(Boolean);

    const url = new URL(request.url);
    const method = request.method;

    if (method === 'GET') {
      console.log(`Webhook Secret: ${webhookSecret}`);
      console.log(`URLs: ${serviceUrls.join(',')}`);
      console.log(`GET Called, invalid operation`);
      return new Response(null, { status: 403 });
    }

    const token = url.searchParams.get('token');
    if (!token) {
      console.error(`No token specified`)
      return new Response('Token not provided', { status: 400 });
    }

    console.log(`Token: ${token}`);

    if (token !== webhookSecret) {
      console.error(`Invalid token specified`)
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
          console.log(`Posting payload`);
          payload = JSON.parse(params.get('payload'));
          console.log(`Event: ${payload.event}`);
          console.log(`Server: ${payload.Server?.title}`);
          
        }
      }
    } catch (err) {
      console.error('Error parsing request body', err);
    }

    const headers = new Headers(request.headers);
    headers.set('User-Agent', `Webhook-proxy-worker ${version}`);
    headers.set('CF-Access-Client-Id', await env.CF_CLIENT_ID.get());
    headers.set('CF-Access-Client-Secret', await env.CF_CLIENT_SECRET.get());

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

        console.log(`Response status from ${targetUrl}: ${res.status}`);

        const resHeaders = {};
        for (const [name, value] of res.headers.entries()) {
          if (!['content-encoding', 'content-length', 'transfer-encoding', 'connection'].includes(name.toLowerCase())) {
            resHeaders[name] = value;
          }
        }

        if (res.status > 499) {
          console.error(`Request to ${targetUrl} failed returned ${res.status}`);
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
      console.error(`Received an error`)
      return new Response(returnContent, {
        status: returnError,
        headers: returnHeaders
      });
    } else {
      console.log(`Received Success`)
      return new Response('success', {
        status: 200,
        headers: returnHeaders
      });
    }
  }
};
