const express = require("express");
const crypto = require("crypto");
const axios = require("axios");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

function sendWebhookRequest(url, postData) {
  return axios
    .post(url, postData)
    .then((response) => {
      console.log("Webhook request sent successfully.");
    })
    .catch((error) => {
      console.error("Error sending webhook request:", error);
    });
}

app.post("/response", (req, res) => {
  console.log("hi");

  let data = "";

  req.on("data", (chunk) => {
    data += chunk.toString();
    console.log("Received chunk:", chunk.toString());
  });

  req.on("end", () => {
    console.log("Request body:", data);

    const responseFields = data.split("&").reduce((obj, item) => {
      const [key, value] = item.split("=");
      obj[key] = decodeURIComponent(value);
      return obj;
    }, {});

    console.log("responseFields:", responseFields);

    const { ORDER_ID, RESULT, MESSAGE, SUPPLEMENTARY_DATA, AMOUNT, AUTHCODE } = responseFields;

    if (RESULT === "00") {
      console.log(`Payment for order ${ORDER_ID} was successful.`);
      // const successMessage = `Your payment was successful. Thank you for your purchase. Supplementary data: ${SUPPLEMENTARY_DATA}`;
      const successMessage = `Your payment was successful. Thank you for your purchase.`;
      res.send(successMessage);

      const webhookUrl = "https://dev.ajddigital.com/webhook/globalpay-response";
      const postData = {
        success: true,
        bookingId: SUPPLEMENTARY_DATA,
        amount: AMOUNT,
        authCode: AUTHCODE,
      };

      sendWebhookRequest(webhookUrl, postData)
        .then(() => {
          console.log("Success webhook request completed.");
        })
        .catch(() => {
          console.error("Error sending success webhook request.");
        });
    } else {
      console.log(`Payment for order ${ORDER_ID} failed with message: ${MESSAGE}`);
      res.send("There was an issue processing your payment.");

      const webhookUrl = "https://dev.ajddigital.com/webhook/globalpay-response";
      const postData = {
        success: false,
        bookingId: SUPPLEMENTARY_DATA,
        amount: AMOUNT,
        authCode: AUTHCODE,
      };

      sendWebhookRequest(webhookUrl, postData)
        .then(() => {
          console.log("Failure webhook request completed.");
        })
        .catch(() => {
          console.error("Error sending failure webhook request.");
        });
    }
  });
});

app.post("/webhook", (req, res) => {
  const { amount, bookingId, phoneNumber } = req.body;

  if (!amount || !bookingId || !phoneNumber) {
    res.status(400).json({ error: "Amount, bookingId, or phoneNumber is missing in the request." });
    return;
  }

  const merchantId = "dev150982075579245497";
  const account = "internet";
  const orderId = crypto.randomBytes(16).toString("hex");
  const currency = "USD";
  const sharedSecret = "Y9go4mpkml";
  const responseUrl = `${process.env.APP_URL || 'http://localhost:3000'}/response`;

  const timestamp = new Date().toISOString().slice(0, 19).replace(/[-T:]/g, "");
  const hashString = `${timestamp}.${merchantId}.${orderId}.${amount}.${currency}`;
  const hashStringWithSecret = crypto.createHash("sha1").update(hashString).digest("hex") + `.${sharedSecret}`;
  const sha1Hash = crypto.createHash("sha1").update(hashStringWithSecret).digest("hex");
  const hppLink = `https://pay.sandbox.realexpayments.com/pay?SUPPLEMENTARY_DATA=${bookingId}&TIMESTAMP=${timestamp}&MERCHANT_ID=${merchantId}&ACCOUNT=${account}&ORDER_ID=${orderId}&AMOUNT=${amount}&CURRENCY=${currency}&AUTO_SETTLE_FLAG=1&COMMENT1=Mobile%20Channel&HPP_VERSION=2&HPP_CHANNEL=ECOM&HPP_LANG=en&HPP_CAPTURE_ADDRESS=true&HPP_REMOVE_SHIPPING=true&HPP_DO_NOT_RETURN_ADDRESS=false&MERCHANT_RESPONSE_URL=${responseUrl}&CARD_PAYMENT_BUTTON=Pay%20Invoice&CUSTOM_FIELD_NAME=Custom%20Field%20Data&HPP_CUSTOMER_PHONENUMBER_MOBILE=${encodeURIComponent(phoneNumber)}&SHA1HASH=${sha1Hash}`;

  res.json({ hppLink });
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
