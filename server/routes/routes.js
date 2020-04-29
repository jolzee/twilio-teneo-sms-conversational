"use strict";
/**
 * Twilio SMS Conversational connector with Teneo
 * author: Peter Joles
 * email: peter.joles@artificial-solutions.com
 */
require("dotenv").config();
const MessagingResponse = require("twilio").twiml.MessagingResponse;
import Cache from "@jolzee/cache";
import TIE from "@artificialsolutions/tie-api-client";
const uniqueKey = "twilio-teneo-sms-session";

let cache;

if (process.env.REDIS_HOST || process.env.REDIS_URL) {
  if (process.env.REDIS_URL) {
    console.log(process.env.REDIS_URL);
    cache = new Cache({
      redisUrl: process.env.REDIS_URL,
      defaultTimeToLiveMin: 20
    });
  } else {
    console.log(process.env.REDIS_HOST);
    cache = new Cache({
      redisHost: process.env.REDIS_HOST,
      redisPort: process.env.REDIS_PORT,
      redisPassword: process.env.REDIS_PASSWORD,
      defaultTimeToLiveMin: 20
    });
  }

  console.log("Using Redis for Cache");
} else {
  cache = new Cache({
    defaultTimeToLiveMin: 20
  });
  console.log("Using In-memory Cache");
}

const logTeneoResponse = teneoResponse => {
  console.log("Teneo Response:", teneoResponse);
  return teneoResponse;
};

const teneoProcess = async sms => {
  const smsText = sms.Body;
  const fromNumber = sms.From;
  const teneoSessionId = await cache.get(fromNumber);

  const data = {
    text: smsText,
    channel: "twilio-sms",
    countryCode: sms.FromCountry, // ["GB" / "US"]
    city: sms.FromCity,
    regionCode: sms.FromState, // "CA"
    zip: sms.FromZip,
    fromNumber: fromNumber
  };

  if (process.env.SHEET_ID) {
    data.sheetId = process.env.SHEET_ID;
  }

  return new Promise((resolve, reject) => {
    TIE.sendInput(process.env.TIE_URL, teneoSessionId, data)
      .then(logTeneoResponse)
      .then(teneoResponse => {
        cache.set(fromNumber, teneoResponse.sessionId);
        let extraInfo = teneoResponse.output.parameters; // not using yet
        let responseText = teneoResponse.output.text;
        let responseObj = {
          text: responseText
        };
        if (teneoResponse.output.parameters.image)
          responseObj.mediaUrl = teneoResponse.output.parameters.image;
        resolve(responseObj);
      })
      .catch(err => {
        console.error("Teneo ERROR:", err);
        resolve({
          text:
            "Thanks for your message. We're experiencing issues at the moment. Please try again later."
        });
      });
  });
};

export const handleInboundSms = (req, res) => {
  console.log("Inbound SMS:", req.body);
  const sms = req.body;
  teneoProcess(sms).then(teneoRes => {
    const twiml = new MessagingResponse();
    const message = twiml.message();
    message.body(teneoRes.text);
    if ("mediaUrl" in teneoRes) {
      message.media(teneoRes.mediaUrl);
    }
    res.writeHead(200, { "Content-Type": "text/xml" });
    res.end(twiml.toString());
  });
};
