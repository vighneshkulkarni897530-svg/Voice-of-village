// Firebase Web SDK Client Configuration
// Project: voice-of-village-cc1b7

const firebaseConfig = {
  apiKey: "AIzaSyAd-tb8gmxe3nG7SLTvqEFxQXgi4x-SM78",
  authDomain: "voice-of-village-cc1b7.firebaseapp.com",
  projectId: "voice-of-village-cc1b7",
  storageBucket: "voice-of-village-cc1b7.firebasestorage.app",
  messagingSenderId: "347315986294",
  appId: "1:347315986294:web:3e7fda3b481c3d0c426457",
  measurementId: "G-C73GFQQX0E"
};

// Export for browser and ES module environments
if (typeof window !== 'undefined') {
  window.firebaseConfig = firebaseConfig;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { firebaseConfig };
}
