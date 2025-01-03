// Import the functions you need from the SDKs you need

"use client";
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { doc, getDoc, getFirestore, setDoc } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDjFXubOhOTPJgBiN_VnvKYVqbjsvKQVyA",
  authDomain: "snackspot-cd9c4.firebaseapp.com",
  projectId: "snackspot-cd9c4",
  storageBucket: "snackspot-cd9c4.firebasestorage.app",
  messagingSenderId: "739785021225",
  appId: "1:739785021225:web:6f28d4ac388eefcc500938",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
//export db
export const db = getFirestore(app);

const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export const realTimeDb = getDatabase(app);

// Only initialize messaging if we're in the browser
const messaging = typeof window !== "undefined" ? getMessaging(app) : null;

// Modified requestPermissionAndToken function
export const requestPermissionAndToken = async () => {
  // Check if we're in the browser and if notifications are supported
  if (typeof window === "undefined" || !("Notification" in window)) {
    console.log("Notifications not supported in this environment");
    return null;
  }

  try {
    console.log("Requesting notification permission...");
    const permission = await Notification.requestPermission();

    if (permission === "granted") {
      console.log("Notification permission granted.");

      // Get the FCM token
      if (!messaging) {
        throw new Error("Messaging is not initialized");
      }

      const token = await getToken(messaging, {
        vapidKey:
          "BHrABL8TQgU0rMF_nwuExQiyBSzeClXg4SpECxAOWqRTG-LPVuiDaMwkZIR_CN4cmItZXS4ZwnQkhDntZry5hSA",
      });

      if (token) {
        console.log("FCM Token:", token);
        return token;
      } else {
        console.error("Failed to get FCM token.");
        throw new Error("No FCM token available");
      }
    } else {
      console.error("Notification permission not granted.");
      throw new Error("Permission denied");
    }
  } catch (error) {
    console.error("Error getting FCM token:", error.message);
    throw error;
  }
};

// Function to send notification directly
export const sendNotification = async (
  userId,
  title,
  body,
  additionalData = {}
) => {
  try {
    // First check if user already has a valid token
    const tokenRef = doc(db, "userTokens", userId);
    const docSnap = await getDoc(tokenRef);

    let fcmToken;

    if (docSnap.exists() && docSnap.data().fcmToken) {
      fcmToken = docSnap.data().fcmToken;
      console.log("Using existing FCM token:", fcmToken);
    } else {
      // If no token exists, request a new one
      fcmToken = await requestPermissionAndToken();

      if (!fcmToken) {
        throw new Error("Failed to get FCM token");
      }

      console.log("New FCM Token received:", fcmToken);

      // Store the new token
      await setDoc(tokenRef, {
        fcmToken: fcmToken,
        updatedAt: new Date().toISOString(),
        userId: userId,
      });

      console.log("New token stored in Firestore successfully");
    }

    // Send notification using the token
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token: fcmToken,
        notification: {
          title,
          body,
        },
        data: additionalData,
      }),
    });

    const result = await response.json();

    if (response.ok) {
      console.log("Notification sent successfully:", result);
      listenForMessages();
    } else {
      console.error("Failed to send notification:", result);
      throw new Error(result.error || "Error sending notification");
    }
  } catch (error) {
    console.error("Error in sendNotification:", error.message);
    throw error;
  }
};

// Function to listen for incoming notifications
export const listenForMessages = () => {
  onMessage(messaging, (payload) => {
    console.log("Message received:", payload);
    // Handle the notification here, such as showing a browser notification
    if ("Notification" in window) {
      new Notification(payload.notification.title, {
        body: payload.notification.body,
      });
    }
  });
};

export { auth, googleProvider };
export default app;

const API_URL =
  process.env.NODE_ENV === "production"
    ? "https://snackspot.onrender.com/sendNotification"
    : "https://snackspot.onrender.com/sendNotification";
// : "http://localhost:4000/sendNotification";
