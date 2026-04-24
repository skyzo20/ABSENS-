// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB78sKqt1S3GTm3a3Saytii0nS1Ui4uAbE",
  authDomain: "absentomoro.firebaseapp.com",
  projectId: "absentomoro",
  storageBucket: "absentomoro.firebasestorage.app",
  messagingSenderId: "768129527812",
  appId: "1:768129527812:web:aa72bac2c0fdce8683c551",
  measurementId: "G-3K048VWDY7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, analytics, auth, db };