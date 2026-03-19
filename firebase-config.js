import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth }        from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore }   from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey:            "AIzaSyDVKdq-l1UkKjuh54449Vuv4n3PeudRraA",
  authDomain:        "spiderman-project-ffbb3.firebaseapp.com",
  projectId:         "spiderman-project-ffbb3",
  storageBucket:     "spiderman-project-ffbb3.appspot.com",
  messagingSenderId: "781009940390",
  appId:             "1:781009940390:web:998adf2280474f4b4e967"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);