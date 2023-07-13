const express = require("express");
const crypto = require("crypto");
const axios = require("axios");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

function sendWebhookRequest(url, postData) {
  return axios
    .post(url, postData)
    .then(response => {
      console.log("Webhook request sent successfully.");
    })
    .catch(error => {
      console.error("Error sending webhook request:", error);
    });
}

app.post("/response", (req, res) => {
  console.log("Received response from Global Payments:");
  console.log(req.body);

  const { ORDER_ID, RESULT, MESSAGE, SUPPLEMENTARY_DATA } = req.body;

  if (RESULT === "00") {
    console.log(`Payment for order ${ORDER_ID} was successful.`);

    const webhookUrl = "https://dev.ajddigital.com/webhook/globalpay-response";
    const postData = {
      success: true,
      bookingId: SUPPLEMENTARY_DATA
    };

    sendWebhookRequest(webhookUrl, postData)
      .then(() => {
        console.log("Success webhook request completed.");
        res.send('Your transaction has been successful. Thank you for your purchase.');
      })
      .catch(() => {
        console.error("Error sending success webhook request.");
        res.status(500).send('There was an issue connecting back to the merchant\'s website. Please contact the merchant and advise them that you received this error message.');
      });
  } else {
    console.log(`Payment for order ${ORDER_ID} failed with message: ${MESSAGE}`);

    const webhookUrl = "https://dev.ajddigital.com/webhook/globalpay-response";
    const postData = {
      success: false,
      bookingId: SUPPLEMENTARY_DATA
    };

    sendWebhookRequest(webhookUrl, postData)
      .then(() => {
        console.log("Failure webhook request completed.");
        res.status(500).send('There was an issue connecting back to the merchant\'s website. Please contact the merchant and advise them that you received this error message.');
      })
      .catch(() => {
        console.error("Error sending failure webhook request.");
        res.status(500).send('There was an issue connecting back to the merchant\'s website. Please contact the merchant and advise them that you received this error message.');
      });
  }
});

app.post("/webhook", (req, res) => {
  const { amount, bookingId } = req.body;

  if (!amount || !bookingId) {
    res.status(400).json({ error: "Amount or bookingId is missing in the request." });
    return;
  }

  const merchantId = "dev150982075579245497";
  const account = "internet";
  const orderId = crypto.randomBytes(16).toString("hex");
  const currency = "EUR";
  const sharedSecret = "Y9go4mpkml";
  const responseUrl = `${process.env.APP_URL || 'http://localhost:3000'}/response`;

  const timestamp = new Date().toISOString().slice(0, 19).replace(/[-T:]/g, "");
  const hashString = `${timestamp}.${merchantId}.${orderId}.${amount}.${currency}`;
  const hashStringWithSecret = crypto.createHash("sha1").update(hashString).digest("hex") + `.${sharedSecret}`;
  const sha1Hash = crypto.createHash("sha1").update(hashStringWithSecret).digest("hex");

  const additionalFields = "HPP_CUSTOMER_EMAIL=test@example.com&HPP_CUSTOMER_PHONENUMBER_MOBILE=44%7C789456123&HPP_BILLING_STREET1=Flat%20123&HPP_BILLING_STREET2=House%20456&HPP_BILLING_STREET3=Unit%204&HPP_BILLING_CITY=Halifax&HPP_BILLING_POSTALCODE=W5%209HR&HPP_BILLING_COUNTRY=826&HPP_SHIPPING_STREET1=Apartment%20852&HPP_SHIPPING_STREET2=Complex%20741&HPP_SHIPPING_STREET3=House%20963&HPP_SHIPPING_CITY=Chicago&HPP_SHIPPING_STATE=IL&HPP_SHIPPING_POSTALCODE=50001&HPP_SHIPPING_COUNTRY=840&HPP_ADDRESS_MATCH_INDICATOR=FALSE&HPP_CHALLENGE_REQUEST_INDICATOR=NO_PREFERENCE";

  const hppParams = `MERCHANT_ID=${encodeURIComponent(merchantId)}&ACCOUNT=${encodeURIComponent(account)}&ORDER_ID=${encodeURIComponent(orderId)}&AMOUNT=${amount}&CURRENCY=${currency}&TIMESTAMP=${encodeURIComponent(timestamp)}&SHA1HASH=${sha1Hash}&${additionalFields}&HPP_RESPONSE_URL=${encodeURIComponent(responseUrl)}`;

  const hppLink = `https://pay.sandbox.realexpayments.com/pay?${hppParams}`;

  res.json({ hppLink });
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
