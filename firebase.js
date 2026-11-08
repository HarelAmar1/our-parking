import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase Web configuration is public. Access is controlled by Firestore rules.
const config = {
  apiKey: 'AIzaSyDHcNihP2vCTb8cXJoXANTCuXlGH4EOZcc',
  authDomain: 'parking-b6302.firebaseapp.com',
  projectId: 'parking-b6302',
  appId: '1:891992171586:web:09b81a6fa8c920b5ecf9db'
};
export const configured = true;
const app = initializeApp(config);
export const auth = getAuth(app);
export const db = getFirestore(app);
