// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import {getStorage} from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBs_McCBwXuTABfVHeblu5tE6tnSagNjDg",
  authDomain: "gitops-ai-original.firebaseapp.com",
  projectId: "gitops-ai-original",
  storageBucket: "gitops-ai-original.firebasestorage.app",
  messagingSenderId: "181199764094",
  appId: "1:181199764094:web:e646cf0611fc602ab5f62f",
  measurementId: "G-FM21X23FLL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);


export const storage = getStorage(app);
