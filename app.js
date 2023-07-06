const express = require("express");
const crypto = require("crypto");
const app = express();
const port = process.env.PORT || 3000;

// Twilio setup
const accountSid = "AC072d5085aa0b3699c7a333a295e72b63";
const authToken = "06699de0fcef90148e5876735472a34e";
const twilioClient = require("twilio")(accountSid, authToken);
const twilioPhoneNumber = "+447700168967";

app.get("/", (req, res) => {
  const merchantId = "dev150982075579245497";
  const account = "internet";
  const orderId = crypto.randomBytes(16).toString("hex"); // generate a random 32-character hexadecimal string for order id
  const amount = "1001";
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
  console.log(hppLink);

  // res.send(`<a href="${hppLink}">Click here to proceed to the payment page</a>`);

  const hppForm = `
    <form action="https://pay.sandbox.realexpayments.com/pay" method="post">
      <input type="hidden" name="MERCHANT_ID" value="${merchantId}">
      <input type="hidden" name="ACCOUNT" value="${account}">
      <input type="hidden" name="ORDER_ID" value="${orderId}">
      <input type="hidden" name="AMOUNT" value="${amount}">
      <input type="hidden" name="CURRENCY" value="${currency}">
      <input type="hidden" name="TIMESTAMP" value="${timestamp}">
      <input type="hidden" name="SHA1HASH" value="${sha1Hash}">
      ${additionalFields.split("&").map(field => {
        const [key, value] = field.split("=");
        return `<input type="hidden" name="${key}" value="${decodeURIComponent(value)}">`;
      }).join("")}
      <input type="hidden" name="HPP_RESPONSE_URL" value="${responseUrl}">
      <input type="submit" value="Proceed to the payment page">
    </form>
  `;

  // res.send(hppForm);

  const formString = additionalFields.split("&").map(field => {
    const [key, value] = field.split("=");
    return `${key}: ${decodeURIComponent(value)}`;
  }).join(", ");
  
  const response = `
    ${hppForm}
    <pre>${hppForm.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
  `;
  
  res.send(response);
});

// Handle the response from Realex
app.post("/response", (req, res) => {
  console.log("hi");
  let data = "";

  req.on("data", chunk => {
    data += chunk.toString();
  });

  req.on("end", () => {
    const responseFields = data.split("&").reduce((obj, item) => {
      const [key, value] = item.split("=");
      obj[key] = decodeURIComponent(value);
      return obj;
    }, {});

    const { ORDER_ID, RESULT, MESSAGE } = responseFields;

    if (RESULT === "00") {
      console.log(`Payment for order ${ORDER_ID} was successful.`);
      res.send('Your payment was successful. Thank you for your purchase.');
    } else {
      console.log(`Payment for order ${ORDER_ID} failed with message: ${MESSAGE}`);
      res.send('There was an issue processing your payment. Please contact the merchant for assistance.');
    }
  });
});

app.post("/webhook", (req, res) => {
  const merchantId = "dev150982075579245497";
  const account = "internet";
  const orderId = crypto.randomBytes(16).toString("hex");
  const amount = "1001";
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
  console.log(hppLink);

  const messageBody = `Payment link: ${hppLink}`;

  // Send SMS
  const sendSMS = () => {
    twilioClient.messages
      .create({
        body: messageBody,
        from: twilioPhoneNumber,
        to: "+447480947765" // Replace with the recipient's phone number
      })
      .then(message => {
        console.log(`SMS sent: ${message.sid}`);
        res.send("SMS sent successfully");
      })
      .catch(error => {
        console.error("Error sending SMS:", error);
        res.status(500).send("Failed to send SMS");
      });
  };

  sendSMS();
});


app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});



