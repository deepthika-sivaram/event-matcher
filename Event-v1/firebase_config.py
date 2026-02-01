import firebase_admin
from firebase_admin import credentials, firestore
import streamlit as st
from pathlib import Path

# Path to service account key
CRED_PATH = Path("serviceAccountKey.json")


def initialize_firebase():
    """Initializes Firebase App if not already initialized."""
    if not firebase_admin._apps:
        if CRED_PATH.exists():
            cred = credentials.Certificate(str(CRED_PATH))
            firebase_admin.initialize_app(cred)
            return True
        else:
            st.error(
                "⚠️ `serviceAccountKey.json` not found. Please add it to the project root."
            )
            return False
    return True


def get_db():
    """Returns Firestore client."""
    if initialize_firebase():
        return firestore.client()
    return None
