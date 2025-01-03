import dotenv from "dotenv";
dotenv.config();

import { initializeApp, cert } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import cors from "cors";
import express from "express";

// Initialize Firebase Admin SDK with environment variables
const serviceAccount = {
  type: process.env.FIREBASE_TYPE,
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"), // Replace escaped newlines
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI,
  token_uri: process.env.FIREBASE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
};

// Initialize Firebase Admin SDK explicitly
initializeApp({
  credential: cert(serviceAccount),
});

const app = express();
app.use(express.json());
app.use(cors());

// Endpoint for sending notifications
app.post("/sendNotification", async (req, res) => {
  const { token, notification, data } = req.body;

  if (!token || !notification) {
    return res.status(400).json({ error: "Missing required parameters" });
  }

  try {
    const result = await getMessaging().send({
      token,
      notification,
      data: data || {},
    });
    return res.json({ success: true, result });
  } catch (error) {
    if (error.code === "messaging/registration-token-not-registered") {
      console.error("Unregistered token. Remove it from your database.");
    } else {
      console.error("Error sending notification:", error);
    }
    return res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
