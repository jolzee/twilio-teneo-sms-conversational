# twilio-teneo-sms-conversational

> A simple connector that allows Teneo to maintain a conversation with a human over SMS. This connector runs as a Express server. Configure the server's base URL with Twilio as a webhook for inbound SMS'.

[Configure Your Webhook URL in Twilio](https://www.twilio.com/docs/sms/tutorials/how-to-receive-and-reply-node-js#configure-your-webhook-url)

### Configuration

Copy `.sample.env` to `.env` and update that variables. The only mandatory value is your TIE url.

The connector can store TIE session in either Redis or In-memory. To use the In-memory cache then just leave the value for `REDIS_HOST` **empty**

### Teneo Output Parameters

If you want to send an image along with the Teneo response then just specify a output parameter called `image` with the value containing a URL to an image.

### Heroku

You can get up and running quickly by using the deploy to Heroku button below:

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/jolzee/twilio-teneo-sms-conversational)

### Docker & Docker Compose

You can optionally run the connector using either Docker or Docker Compose.

#### Docker Example:

```sh
docker run -p 3000:3000 -it --env TIE_URL=https://<TIE-HOST>/<TIE-CTX-PATH>/ jolzee/twilio-teneo-sms-conversational:latest
```

#### Dokcer Compose Example:

This combines a NGROK container that exposes the server on a public URL that can then be used as the webhook url in Twilio.

> Update your TIE url in the `docker-compose.yml` file before running the command below.

```sh
docker-compose up
```

```yml
version: "3"
services:
  twilio-teneo-sms-conversational:
    image: jolzee/twilio-teneo-sms-conversational
    container_name: twilio-teneo-sms-conversational
    ports:
      - "3000:3000"
    environment:
      - TIE_URL=
      - REDIS_HOST=
      - REDIS_PORT=6379
      - REDIS_PASSWORD=
  ngrok:
    image: "wernight/ngrok:latest"
    container_name: ngrok
    command: [sh, -c, "echo NGROK Admin URL http://localhost:4040 && /entrypoint.sh"]
    links:
      - twilio-teneo-sms-conversational:http
    ports:
      - "4040:4040"
    environment:
      - NGROK_PORT=twilio-teneo-sms-conversational:3000
      - NGROK_REGION=us
      - NGROK_BINDTLS=true
```
