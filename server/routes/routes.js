"use strict";
/**
 * Twilio SMS Conversational connector with Teneo
 * author: Peter Joles
 * email: peter.joles@artificial-solutions.com
 */
require("dotenv").config();
const MessagingResponse = require("twilio").twiml.MessagingResponse;
import Redis from "ioredis";
import TIE from "@artificialsolutions/tie-api-client";
const uniqueKey = "twilio-teneo-sms-session";

const redis = new Redis({
  port: parseInt(process.env.REDIS_PORT), // Redis port
  host: process.env.REDIS_HOST, // Redis host
  family: 4, // 4 (IPv4) or 6 (IPv6)
  password: process.env.REDIS_PASSWORD
});

const logTeneoResponse = teneoResponse => {
  console.log("Teneo Response:", teneoResponse);
  return teneoResponse;
};

const session = {
  deleteSessionId: uniqueSessionKey => {
    redis.del(`${uniqueKey}_${uniqueSessionKey}`).then(() => {
      console.log("REDIS:DEL[SESSION] Deleted cache for key: ${uniqueSessionKey}");
    });
  },
  findSessionId: async uniqueSessionKey => {
    return new Promise((resolve, reject) => {
      redis
        .get(`${uniqueKey}_${uniqueSessionKey}`)
        .then(teneoSesisonId => {
          console.log("REDIS:GET[SESSION] Teneo Session ID: ", teneoSesisonId);
          resolve(teneoSesisonId);
        })
        .catch(err => {
          console.log("REDIS:HGET[SESSION]", err);
          resolve(null);
        });
    });
  },
  cacheSessionId: (uniqueSessionKey, teneoSessionId) => {
    let minutes = 20;
    redis.set(`${uniqueKey}_${uniqueSessionKey}`, teneoSessionId, "EX", minutes * 60);
    console.log(
      `REDIS:SET[SESSION] Caching Session Info for [${minutes}min]: `,
      uniqueSessionKey,
      teneoSessionId
    );
  }
};

const teneoProcess = async (fromNumber, smsText) => {
  const teneoSessionId = await session.findSessionId(fromNumber);
  return new Promise((resolve, reject) => {
    TIE.sendInput(process.env.TIE_URL, teneoSessionId, {
      text: smsText,
      channel: "twillio-sms"
    })
      .then(logTeneoResponse)
      .then(teneoResponse => {
        session.cacheSessionId(fromNumber, teneoResponse.sessionId);
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
  console.log(req.body);
  const sms = req.body;
  const smsText = sms.Body;
  const fromNumber = sms.From;
  teneoProcess(fromNumber, smsText).then(teneoRes => {
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
