// Replace with your actual Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDtE69gVgf35jCKKrN76ZvyEUYAF5-GtGo",
  authDomain: "hatch-575a7.firebaseapp.com",
  projectId: "hatch-575a7",
  storageBucket: "hatch-575a7.firebasestorage.app",
  messagingSenderId: "379734165477",
  appId: "1:379734165477:web:e0e5ed6c3df0b88eed110c"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const eggsCollection = db.collection('eggs');
const eggTypesCollection = db.collection('eggTypes');
window.db = db;
window.eggsCollection = eggsCollection;
window.eggTypesCollection = eggTypesCollection;
