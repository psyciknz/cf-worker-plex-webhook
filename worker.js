
addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request))
})


async function handleRequest(request) {
  const headers = request.headers

  // You should always have a configured webhook secret. We should validate we received a request with this secret
  // before proceeding any further. Environment variables can either be configured in the Cloudflare UI or with the
  // wrangler.toml file (there is an example in this repo).
  // You can read more about this here: https://developers.cloudflare.com/workers/platform/environment-variables
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  if (token !== WEBHOOK_SECRET) {
      return new Response(":(", {
          headers: {'content-type': 'text/plain'},
          status: 401
      })
  }
  console.log("wait for json payload")
  console.log(RYOT_URL + '/_i/' + WEBHOOK_SECRET)
  console.log(CF_CLIENT_ID)
  
  let incReq = await request
  // so we can see what we actually get sent.
  console.log(incReq)


  // if you have created a generic webhook in the notification tab, the request should look the same as the format in
  // sample-data.json. We therefore now want to transform it into a format that our webhook service receives. In this
  // example, I have used Rocket chat. An example of what a webhook for rocket chat looks like it available in
  // rocket-chat.json
    //let msg = incReq.text
    //console.log('Msg:' + msg)
    //let webhookName = incReq.name
    let rocketBody = {
        "text": "webhookname",
        "attachments": [
            {
                "title": "Cloudflare Webhook",
                "text": "some text",
                "title_link": "https://cloudflare.com",
                "color": "#764FA5"
            }
        ]
   }
   console.log("Constructing new request payload")
   const rocketReq = {
      headers: {
          'content-type': 'application/json',
          'CF-Access-Client-Id': CF_CLIENT_ID,
          'CF-Access-Client-Secret': CF_CLIENT_SECRET,
  
      },
      method: 'POST',
      body: JSON.stringify(rocketBody),
  }

  console.log(rocketReq)
  const response = await fetch(
      RYOT_URL + '/_i/' + WEBHOOK_SECRET,
      rocketReq,
  )
  console.log("Before await response")
  const res = await response
  console.log("after await response")
  console.log(res)
  // TODO: You will likely want to do more with failure scenarios here.

  console.log("returning response")
  return response
}
