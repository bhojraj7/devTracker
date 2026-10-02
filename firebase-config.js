// ===== Firebase Configuration =====
// Replace these values with the config from your Firebase Web App.
const firebaseConfig = {
    apiKey: "AIzaSyCTpLkPinvatvgXqtGr2UyaH7NXV2JXwzU",
    authDomain: "devtracker-fbb08.firebaseapp.com",
    projectId: "devtracker-fbb08",
    storageBucket: "devtracker-fbb08.firebasestorage.app",
    messagingSenderId: "264334609273",
    appId: "1:264334609273:web:8f359fb5ff475f8c827da8"
};

const hasFirebaseConfig = Object.values(firebaseConfig).every(value => {
    return value && !value.startsWith('YOUR_') && !value.includes('YOUR_PROJECT');
});

let auth = null;
let db = null;

if (hasFirebaseConfig) {
    firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();
} else {
    console.warn('Firebase is not configured. Guest mode is available, but account sync is disabled.');
}
