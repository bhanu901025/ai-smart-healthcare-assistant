"""
AI-Powered Smart Healthcare Assistant - Python ML Inference Microservice
Runs on port 5001 to serve disease predictions and clinical triage insights.
"""

import os
import json
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib

app = Flask(__name__)
CORS(app)

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(SCRIPT_DIR, "disease_model.joblib")
METADATA_PATH = os.path.join(SCRIPT_DIR, "model_metadata.json")

model = None
metadata = None

def load_resources():
    global model, metadata
    if os.path.exists(MODEL_PATH) and os.path.exists(METADATA_PATH):
        try:
            model = joblib.load(MODEL_PATH)
            with open(METADATA_PATH, "r", encoding="utf-8") as f:
                metadata = json.load(f)
            print("ML model and metadata loaded successfully.")
        except Exception as e:
            print(f"Error loading model resources: {e}")
    else:
        print("Model or metadata not found. Train model first using train_model.py.")

load_resources()

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "online",
        "service": "AI Healthcare Prediction Microservice",
        "model_loaded": model is not None,
        "algorithm": metadata.get("algorithm") if metadata else "N/A",
        "accuracy": metadata.get("test_accuracy") if metadata else "N/A",
        "version": "1.0.0"
    })

@app.route("/symptoms", methods=["GET"])
def get_symptoms():
    if not metadata:
        return jsonify({"error": "Metadata not loaded"}), 500
    return jsonify({
        "symptoms": metadata["symptoms"],
        "count": len(metadata["symptoms"])
    })

@app.route("/predict", methods=["POST"])
def predict():
    global model, metadata
    if model is None or metadata is None:
        load_resources()
        if model is None:
            return jsonify({"error": "ML model is not initialized. Please train the model."}), 500

    data = request.get_json() or {}
    user_symptoms = data.get("symptoms", [])

    if not user_symptoms or not isinstance(user_symptoms, list):
        return jsonify({"error": "Please provide a non-empty list of symptoms."}), 400

    symptoms_list = metadata["symptoms"]
    symptom_to_idx = {s: i for i, s in enumerate(symptoms_list)}
    
    # Vectorize input
    feature_vector = np.zeros(len(symptoms_list), dtype=int)
    matched_input_symptoms = []

    for s in user_symptoms:
        normalized = s.strip().lower().replace(" ", "_")
        if normalized in symptom_to_idx:
            feature_vector[symptom_to_idx[normalized]] = 1
            matched_input_symptoms.append(normalized)

    if np.sum(feature_vector) == 0:
        return jsonify({
            "error": "None of the provided symptoms match the clinical database vocabulary.",
            "provided_symptoms": user_symptoms
        }), 400

    # Model inference
    probabilities = model.predict_proba([feature_vector])[0]
    classes = model.classes_
    top_indices = np.argsort(probabilities)[::-1]

    # Top primary prediction
    primary_idx = top_indices[0]
    predicted_disease = classes[primary_idx]
    confidence_score = float(probabilities[primary_idx]) * 100

    # Top 3 differential diagnoses
    top_predictions = []
    for idx in top_indices[:3]:
        prob = float(probabilities[idx]) * 100
        if prob > 1.0:  # Only include plausible differentials
            top_predictions.append({
                "disease": classes[idx],
                "probability": round(prob, 1)
            })

    # Disease clinical intelligence profile
    disease_profiles = metadata.get("disease_profiles", {})
    profile = disease_profiles.get(predicted_disease, {
        "specialist": "General Physician",
        "severity": "Moderate",
        "urgency_score": 2,
        "precautions": ["Consult a medical professional for comprehensive examination."],
        "diet": {"recommended": ["Balanced nutritious diet"], "avoid": ["Heavy processed foods"]}
    })

    response = {
        "success": True,
        "predicted_disease": predicted_disease,
        "confidence": round(confidence_score, 1),
        "severity": profile.get("severity", "Moderate"),
        "urgency_score": profile.get("urgency_score", 2),
        "recommended_specialist": profile.get("specialist", "General Physician"),
        "precautions": profile.get("precautions", []),
        "diet": profile.get("diet", {}),
        "differential_diagnoses": top_predictions,
        "matched_symptoms": matched_input_symptoms,
        "total_symptoms_evaluated": len(matched_input_symptoms)
    }

    return jsonify(response)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=False)
