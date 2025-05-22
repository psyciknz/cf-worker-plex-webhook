export default {
  async fetch(request, env, ctx) {
    console.log("Start");
    const url = new URL(request.url);

    // Check if the request is for the webhook trigger
      const token = url.searchParams.get('token');
      if (!token) {
        return new Response('Token not provided', { status: 400 });
      }
      console.log(token);
      if (token !== env.WEBHOOK_SECRET) {
        return new Response(":(", {
            headers: {'content-type': 'text/plain'},
            status: 401
        })
    }

      // Construct the target URL with the token
      const targetUrl = `${env.RYOT_URL}/_i/${env.WEBHOOK_SECRET}`;
      console.log(`Target URL:${targetUrl}`);

      // Clone the original request to modify headers
      let newRequest = new Request(targetUrl, request);

      // Add or modify headers
      newRequest.headers.set('CF-Access-Client-Id', env.CF_CLIENT_ID);
      newRequest.headers.set('CF-Access-Client-Secret', env.CF_CLIENT_SECRET);

      console.log(newRequest);

      // Forward the request to the target service
      let response = await fetch(newRequest);
      console.log(response)
      // Return the original response if not a 302 redirect
      return response;
    
  },
};

