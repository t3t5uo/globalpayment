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




app.get("/confirm/:bookingId", (req, res) => {
  const { bookingId } = req.params;

  // Render the confirmation page with a "Confirm" button
  const confirmationPage = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Confirmation Page</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        text-align: center;
        padding: 20px;
      }
      h1 {
        margin-bottom: 20px;
      }
      button {
        background-color: #007BFF;
        color: #FFFFFF;
        border: none;
        padding: 10px 20px;
        font-size: 16px;
        border-radius: 5px;
        cursor: pointer;
      }
      #message {
        margin-top: 20px;
        font-size: 18px;
      }
      @media screen and (max-width: 480px) {
        /* Mobile optimization */
        h1 {
          font-size: 24px;
        }
        button {
          font-size: 14px;
          padding: 8px 16px;
        }
      }
    </style>
  </head>
  <body>
    <h1>Bermuda Island Taxi</h1>
    <p>Please press 'Confirm' if you would like to pay for your ride (<span id="bookingId"></span>) by credit card.</p>
    <button onclick="confirmBooking('${bookingId}')">Confirm</button>
    <div id="message"></div>
    <script>
      // Get the bookingId value from the server-side rendering
      const bookingId = '${bookingId}';
      document.getElementById('bookingId').innerText = bookingId;
  
      function confirmBooking(bookingId) {
        fetch('/complete/' + bookingId, { method: 'POST' })
          .then(response => {
            if (response.ok) {
              document.getElementById('message').innerText = 'Thank you for confirming. When your trip ends you will be sent a payment link.';
            } else {
              document.getElementById('message').innerText = 'Error confirming booking.';
            }
          })
          .catch(error => {
            console.error('Error confirming booking:', error);
            document.getElementById('message').innerText = 'An error occurred while confirming the booking.';
          });
      }
    </script>
  </body>
  </html>
  `;
  res.send(confirmationPage);
});

app.post("/complete/:bookingId", (req, res) => {
  const { bookingId } = req.params;

  // Make a POST call to https://dev.ajddigital.com/webhook/updatebooking with the bookingId and action: "complete"
  const webhookUrl = "https://dev.ajddigital.com/webhook/updatebooking";
  const postData = {
    bookingId: bookingId,
    action: "complete",
  };

  axios
    .post(webhookUrl, postData)
    .then((response) => {
      console.log("Booking update request sent successfully.");
      // Check if the webhook response is in the expected format (you may need to adjust this based on the actual response structure)
      if (response.data && response.data.success === true) {
        res.json({ success: true });
      } else {
        res.json({ success: false });
      }
    })
    .catch((error) => {
      console.error("Error sending booking update request:", error);
      res.json({ success: false });
    });
});



app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
