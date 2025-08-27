import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDxVeL6h23bCKknBH2hMxJzP39jj0EOy4Q",
  authDomain: "nova-77067.firebaseapp.com",
  projectId: "nova-77067",
  storageBucket: "nova-77067.firebasestorage.app",
  messagingSenderId: "371963756889",
  appId: "1:371963756889:web:f1ba78ca31498f7b3a0c48",
  measurementId: "G-3X29Y0KCNK"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);


