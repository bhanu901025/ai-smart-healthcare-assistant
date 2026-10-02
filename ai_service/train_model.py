"""
AI-Powered Smart Healthcare Assistant - Machine Learning Model Trainer
Trains a Random Forest Classifier for Disease Prediction based on clinical symptoms.
Outputs:
  - disease_model.joblib: Serialized trained classification pipeline
  - model_metadata.json: Symptom vocabulary, disease intelligence, specialist map, metrics
"""

import json
import os
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import accuracy_score, classification_report
import joblib

# Set random seed for reproducibility
np.random.seed(42)

# Full master symptom vocabulary (48 symptoms)
SYMPTOMS = [
    "itching", "skin_rash", "nodal_skin_eruptions", "continuous_sneezing", "shivering",
    "chills", "joint_pain", "stomach_pain", "acidity", "ulcers_on_tongue",
    "muscle_wasting", "vomiting", "burning_micturition", "spotting_urination", "fatigue",
    "weight_gain", "anxiety", "cold_hands_and_feets", "mood_swings", "weight_loss",
    "restlessness", "lethargy", "patches_in_throat", "irregular_sugar_level", "cough",
    "high_fever", "sunken_eyes", "breathlessness", "sweating", "dehydration",
    "indigestion", "headache", "yellowish_skin", "dark_urine", "nausea",
    "loss_of_appetite", "pain_behind_the_eyes", "back_pain", "constipation", "abdominal_pain",
    "diarrhoea", "mild_fever", "yellowing_of_eyes", "swelled_lymph_nodes", "chest_pain",
    "fast_heart_rate", "dizziness", "swelling_joints"
]

# Disease intelligence database: Clinical mappings, severity, specialist, precautions, diet
DISEASE_PROFILES = {
    "Common Cold": {
        "core_symptoms": ["continuous_sneezing", "cough", "headache", "fatigue", "chills"],
        "optional_symptoms": ["mild_fever", "loss_of_appetite"],
        "specialist": "General Physician",
        "severity": "Low",
        "urgency_score": 1,
        "precautions": [
            "Stay well hydrated with warm liquids like herbal teas and clear broths",
            "Take adequate rest to allow your immune system to recover",
            "Use saline nasal drops or steam inhalation to ease congestion",
            "Avoid cold and chilled beverages"
        ],
        "diet": {
            "recommended": ["Citrus fruits rich in Vitamin C", "Ginger-honey tea", "Warm vegetable soups"],
            "avoid": ["Chilled dairy", "Deep-fried foods", "High sugar drinks"]
        }
    },
    "Influenza (Flu)": {
        "core_symptoms": ["high_fever", "chills", "cough", "fatigue", "headache", "joint_pain"],
        "optional_symptoms": ["sweating", "loss_of_appetite", "vomiting"],
        "specialist": "General Physician",
        "severity": "Moderate",
        "urgency_score": 2,
        "precautions": [
            "Maintain strict bed rest for at least 3-5 days",
            "Monitor body temperature every 4-6 hours",
            "Isolate in a well-ventilated room to prevent household transmission",
            "Consult a physician if fever exceeds 102°F or persists past 3 days"
        ],
        "diet": {
            "recommended": ["Chicken or lentil soup", "Electrolyte-replenishing drinks", "Soft cooked oats"],
            "avoid": ["Heavy greasy foods", "Caffeinated drinks", "Alcohol"]
        }
    },
    "Pneumonia": {
        "core_symptoms": ["high_fever", "breathlessness", "cough", "chest_pain", "fatigue", "chills"],
        "optional_symptoms": ["sweating", "fast_heart_rate", "loss_of_appetite"],
        "specialist": "Pulmonologist",
        "severity": "Critical",
        "urgency_score": 4,
        "precautions": [
            "Seek prompt medical consultation or hospital triage immediately",
            "Keep pulse oximeter handy to check oxygen saturation (SpO2)",
            "Do not suppress productive cough without doctor approval",
            "Maintain upright sitting posture to facilitate easier breathing"
        ],
        "diet": {
            "recommended": ["Warm protein-rich broths", "Hydrating fresh juices", "Soft easily digestible grains"],
            "avoid": ["Cold refrigerated food", "Mucus-producing dairy", "Processed snacks"]
        }
    },
    "Bronchial Asthma": {
        "core_symptoms": ["breathlessness", "cough", "chest_pain", "fatigue"],
        "optional_symptoms": ["fast_heart_rate", "restlessness", "anxiety"],
        "specialist": "Pulmonologist",
        "severity": "High",
        "urgency_score": 3,
        "precautions": [
            "Keep prescribed rescue inhaler (bronchodilator) accessible at all times",
            "Avoid known triggers such as dust, pollen, pet dander, and smoke",
            "Practice diaphragmatic breathing exercises",
            "Check peak expiratory flow (PEF) regularly if monitoring at home"
        ],
        "diet": {
            "recommended": ["Omega-3 rich foods (flaxseeds, walnuts)", "Antioxidant berries", "Steamed greens"],
            "avoid": ["Sulfited dried fruits", "Processed cold cuts", "Cold carbonated sodas"]
        }
    },
    "COVID-19": {
        "core_symptoms": ["high_fever", "cough", "fatigue", "loss_of_appetite", "breathlessness"],
        "optional_symptoms": ["headache", "joint_pain", "diarrhoea", "chills"],
        "specialist": "Infectious Disease Specialist",
        "severity": "High",
        "urgency_score": 3,
        "precautions": [
            "Self-isolate immediately and wear an N95 mask around others",
            "Continuously monitor SpO2 levels and seek emergency care if below 94%",
            "Perform RT-PCR or rapid antigen testing for clinical confirmation",
            "Stay hydrated and avoid strenuous physical exertion"
        ],
        "diet": {
            "recommended": ["Zinc & Vitamin D fortified foods", "Turmeric milk", "Hydrating coconut water"],
            "avoid": ["Ultra-processed fast foods", "Excessive sugars", "Salty chips"]
        }
    },
    "Hypertension": {
        "core_symptoms": ["headache", "dizziness", "fast_heart_rate", "fatigue"],
        "optional_symptoms": ["chest_pain", "anxiety", "restlessness"],
        "specialist": "Cardiologist",
        "severity": "Moderate",
        "urgency_score": 2,
        "precautions": [
            "Strictly monitor blood pressure morning and evening",
            "Restrict sodium (salt) intake to less than 2,000 mg per day",
            "Engage in 30 minutes of moderate aerobic activity (e.g. brisk walking)",
            "Adopt stress-reduction techniques such as meditation or yoga"
        ],
        "diet": {
            "recommended": ["DASH diet rich in leafy greens", "Bananas (potassium)", "Garlic & beetroot"],
            "avoid": ["Pickles and canned soups", "Caffeine", "Processed cured meats"]
        }
    },
    "Coronary Heart Disease": {
        "core_symptoms": ["chest_pain", "breathlessness", "fast_heart_rate", "fatigue", "sweating"],
        "optional_symptoms": ["dizziness", "anxiety", "nausea"],
        "specialist": "Cardiologist",
        "severity": "Critical",
        "urgency_score": 4,
        "precautions": [
            "Emergency medical evaluation required immediately if chest discomfort radiates to arm/jaw",
            "Never ignore sudden unprovoked sweating or shortness of breath",
            "Avoid strenuous exertion until cleared by a cardiac specialist",
            "Adhere strictly to prescribed cardiac medication"
        ],
        "diet": {
            "recommended": ["Heart-healthy olive oil", "Oatmeal and soluble fibers", "Omega-3 rich foods"],
            "avoid": ["Trans-fats & fried foods", "Full-fat dairy", "High-cholesterol processed meals"]
        }
    },
    "Type 2 Diabetes": {
        "core_symptoms": ["fatigue", "weight_loss", "restlessness", "lethargy", "irregular_sugar_level"],
        "optional_symptoms": ["sunken_eyes", "dehydration", "spotting_urination"],
        "specialist": "Endocrinologist",
        "severity": "Moderate",
        "urgency_score": 2,
        "precautions": [
            "Track fasting and post-prandial blood glucose levels regularly",
            "Inspect feet daily for cuts, blisters, or slow-healing sores",
            "Maintain a consistent meal schedule without prolonged fasting",
            "Schedule biannual HbA1c testing and annual retinal checkups"
        ],
        "diet": {
            "recommended": ["Low GI whole grains (quinoa, brown rice)", "High fiber vegetables", "Lentils and legumes"],
            "avoid": ["Refined sugars & pastries", "Sweetened beverages", "White bread and refined flour"]
        }
    },
    "Gastroesophageal Reflux Disease (GERD)": {
        "core_symptoms": ["acidity", "stomach_pain", "chest_pain", "indigestion", "cough"],
        "optional_symptoms": ["vomiting", "ulcers_on_tongue", "nausea"],
        "specialist": "Gastroenterologist",
        "severity": "Low",
        "urgency_score": 1,
        "precautions": [
            "Elevate head of bed by 6 inches while sleeping",
            "Avoid lying down within 2 to 3 hours after eating meals",
            "Eat smaller, more frequent meals rather than large heavy dinners",
            "Avoid tight-fitting waist clothing that increases abdominal pressure"
        ],
        "diet": {
            "recommended": ["Non-citrus fruits (apples, pears, bananas)", "Oatmeal and almond milk", "Steamed vegetables"],
            "avoid": ["Spicy chili foods", "Chocolate and mint", "Tomatoes and citrus juices"]
        }
    },
    "Peptic Ulcer Disease": {
        "core_symptoms": ["stomach_pain", "acidity", "vomiting", "indigestion", "loss_of_appetite"],
        "optional_symptoms": ["abdominal_pain", "nausea", "weight_loss"],
        "specialist": "Gastroenterologist",
        "severity": "Moderate",
        "urgency_score": 2,
        "precautions": [
            "Avoid non-steroidal anti-inflammatory drugs (NSAIDs) like ibuprofen or aspirin",
            "Refrain from tobacco and alcoholic beverages completely",
            "Consult specialist for Helicobacter pylori diagnostic testing",
            "Take prescribed antacids or proton pump inhibitors (PPIs) consistently"
        ],
        "diet": {
            "recommended": ["Probiotic yogurts and kefir", "Cooked carrots and squashes", "Bland porridge"],
            "avoid": ["Black pepper and strong spices", "Coffee and acidic drinks", "Raw coarse veggies"]
        }
    },
    "Gastroenteritis": {
        "core_symptoms": ["vomiting", "diarrhoea", "stomach_pain", "dehydration", "sunken_eyes"],
        "optional_symptoms": ["mild_fever", "nausea", "fatigue"],
        "specialist": "Gastroenterologist",
        "severity": "Moderate",
        "urgency_score": 2,
        "precautions": [
            "Drink Oral Rehydration Salts (ORS) solution continuously to replace fluids and electrolytes",
            "Wash hands thoroughly with soap after every bathroom visit",
            "Gradually reintroduce mild solid foods following the BRAT diet (Banana, Rice, Applesauce, Toast)",
            "Seek medical attention if vomiting prevents fluid retention for 12 hours"
        ],
        "diet": {
            "recommended": ["Oral Rehydration Solution (ORS)", "Steamed white rice & plain congee", "Clear broth"],
            "avoid": ["Dairy products and milk", "Greasy fried foods", "Sugary sodas"]
        }
    },
    "Migraine": {
        "core_symptoms": ["headache", "nausea", "pain_behind_the_eyes", "dizziness", "vomiting"],
        "optional_symptoms": ["anxiety", "fatigue", "mood_swings"],
        "specialist": "Neurologist",
        "severity": "Moderate",
        "urgency_score": 2,
        "precautions": [
            "Rest in a quiet, dark, and cool room when migraine strikes",
            "Maintain a consistent sleep-wake schedule even on weekends",
            "Identify and log sensory triggers such as bright lights, loud noises, or strong scents",
            "Stay hydrated throughout the day"
        ],
        "diet": {
            "recommended": ["Magnesium-rich foods (spinach, pumpkin seeds)", "Hydrating cucumbers", "Ginger tea"],
            "avoid": ["Aged cheeses", "Artificial sweeteners (aspartame)", "Processed meats with nitrates"]
        }
    },
    "Tension Headache": {
        "core_symptoms": ["headache", "back_pain", "fatigue", "dizziness"],
        "optional_symptoms": ["anxiety", "restlessness", "mood_swings"],
        "specialist": "Neurologist",
        "severity": "Low",
        "urgency_score": 1,
        "precautions": [
            "Practice regular neck, shoulder, and ergonomic posture stretches",
            "Take frequent breaks during long computer or desk work sessions (20-20-20 rule)",
            "Apply a warm compress or heating pad to neck and shoulder muscles",
            "Ensure at least 7-8 hours of sound sleep nightly"
        ],
        "diet": {
            "recommended": ["Adequate water intake (2.5L daily)", "Chamomile tea", "Whole grain complex carbs"],
            "avoid": ["Excessive caffeine", "Energy drinks", "Skipping meals"]
        }
    },
    "Dengue Fever": {
        "core_symptoms": ["high_fever", "pain_behind_the_eyes", "joint_pain", "vomiting", "fatigue", "skin_rash"],
        "optional_symptoms": ["chills", "nausea", "loss_of_appetite", "back_pain"],
        "specialist": "General Physician",
        "severity": "High",
        "urgency_score": 3,
        "precautions": [
            "Get a complete blood count (CBC) to monitor platelet count daily",
            "Avoid aspirin or ibuprofen as they increase hemorrhage risk (use paracetamol only if advised)",
            "Use mosquito repellent, bed nets, and eliminate stagnant water around residence",
            "Immediate hospitalization if severe abdominal pain, persistent vomiting, or mucosal bleeding occurs"
        ],
        "diet": {
            "recommended": ["Papaya leaf extract juice", "Fresh coconut water", "Pomegranate juice", "Hydrating soups"],
            "avoid": ["Dark or red-colored food (can confuse with blood in vomit)", "Oily fast foods"]
        }
    },
    "Malaria": {
        "core_symptoms": ["chills", "vomiting", "high_fever", "sweating", "headache", "nausea"],
        "optional_symptoms": ["diarrhoea", "muscle_wasting", "loss_of_appetite"],
        "specialist": "General Physician",
        "severity": "High",
        "urgency_score": 3,
        "precautions": [
            "Confirm diagnosis with rapid diagnostic blood smear (Malaria smear/antigen test)",
            "Complete full course of prescribed antimalarial medications without stopping midway",
            "Sleep under insecticide-treated bed nets",
            "Keep surroundings free of mosquito breeding sites"
        ],
        "diet": {
            "recommended": ["High-calorie easily absorbable meals", "Fresh orange & sweet lime juice", "Boiled vegetables"],
            "avoid": ["Spicy, acidic, and fatty foods", "Unpasteurized foods"]
        }
    },
    "Typhoid Fever": {
        "core_symptoms": ["high_fever", "chills", "fatigue", "headache", "abdominal_pain", "diarrhoea"],
        "optional_symptoms": ["vomiting", "loss_of_appetite", "constipation"],
        "specialist": "General Physician",
        "severity": "High",
        "urgency_score": 3,
        "precautions": [
            "Drink only boiled, filtered, or sealed bottled water",
            "Strict adherence to prescribed antibiotic regimen to avoid relapse",
            "Avoid street food, raw salads, and unpeeled fruits",
            "Disinfect household utensils and wash hands meticulously"
        ],
        "diet": {
            "recommended": ["Soft cooked rice with diluted lentils (Khichdi)", "Boiled potatoes", "Clear vegetable broths"],
            "avoid": ["Raw unwashed vegetables", "Spicy curries", "Coarse high-fiber raw grains"]
        }
    },
    "Rheumatoid Arthritis": {
        "core_symptoms": ["joint_pain", "swelling_joints", "fatigue", "stiffness", "muscle_wasting"],
        "optional_symptoms": ["mild_fever", "loss_of_appetite", "weight_loss"],
        "specialist": "Rheumatologist",
        "severity": "Moderate",
        "urgency_score": 2,
        "precautions": [
            "Perform gentle joint range-of-motion exercises every morning to reduce stiffness",
            "Apply warm compresses to stiff joints and cold packs during flare-up inflammation",
            "Maintain optimal healthy body weight to minimize joint load",
            "Consult rheumatologist regularly for disease-modifying antirheumatic drugs (DMARDs) monitoring"
        ],
        "diet": {
            "recommended": ["Anti-inflammatory foods (turmeric, ginger, olive oil)", "Fatty fish (salmon)", "Walnuts"],
            "avoid": ["Processed sugars", "Red meat", "Fried processed snacks"]
        }
    },
    "Osteoarthritis": {
        "core_symptoms": ["joint_pain", "swelling_joints", "back_pain", "dizziness"],
        "optional_symptoms": ["fatigue", "muscle_wasting"],
        "specialist": "Orthopedic Surgeon",
        "severity": "Moderate",
        "urgency_score": 2,
        "precautions": [
            "Engage in low-impact joint-friendly physical activities like swimming and cycling",
            "Use supportive ergonomic footwear with shock-absorbing soles",
            "Utilize assistive devices or knee braces during extended walking if advised",
            "Avoid heavy weight-lifting or sudden high-impact joint stresses"
        ],
        "diet": {
            "recommended": ["Calcium & Vitamin D fortified foods", "Leafy green vegetables", "Bone broths"],
            "avoid": ["Inflammatory refined oils", "Excess salt", "Excessive alcohol"]
        }
    },
    "Eczema / Atopic Dermatitis": {
        "core_symptoms": ["itching", "skin_rash", "nodal_skin_eruptions"],
        "optional_symptoms": ["fatigue", "restlessness"],
        "specialist": "Dermatologist",
        "severity": "Low",
        "urgency_score": 1,
        "precautions": [
            "Apply fragrance-free moisturizing ceramide creams immediately after bathing while skin is damp",
            "Avoid hot showers and switch to lukewarm water with mild soap-free cleansers",
            "Wear soft, breathable natural cotton clothing and avoid scratchy wool",
            "Keep fingernails trimmed short to prevent skin excoriation and secondary bacterial infection"
        ],
        "diet": {
            "recommended": ["Omega-3 rich seeds", "Probiotic yogurt", "Zinc rich foods (spinach, pumpkin seeds)"],
            "avoid": ["Artificial food colorings", "Preservatives", "Known food allergens"]
        }
    },
    "Psoriasis": {
        "core_symptoms": ["skin_rash", "itching", "swelling_joints", "joint_pain"],
        "optional_symptoms": ["fatigue", "mood_swings"],
        "specialist": "Dermatologist",
        "severity": "Moderate",
        "urgency_score": 2,
        "precautions": [
            "Keep affected skin consistently hydrated with thick emollient ointments",
            "Get safe, moderate natural sunlight exposure (10-15 mins daily) under dermatologic advice",
            "Avoid picking, scratching, or peeling skin plaques",
            "Manage psychological stress through mindfulness, as stress triggers flare-ups"
        ],
        "diet": {
            "recommended": ["Cold-pressed extra virgin olive oil", "Leafy greens", "Antioxidant rich berries"],
            "avoid": ["Nightshade vegetables if sensitive (eggplant, tomatoes)", "Alcohol", "Processed red meat"]
        }
    },
    "Chronic Kidney Disease": {
        "core_symptoms": ["fatigue", "loss_of_appetite", "vomiting", "weight_loss", "swelling_joints"],
        "optional_symptoms": ["dark_urine", "burning_micturition", "breathlessness"],
        "specialist": "Nephrologist",
        "severity": "Critical",
        "urgency_score": 4,
        "precautions": [
            "Regular kidney function testing (Serum Creatinine, eGFR, Blood Urea Nitrogen)",
            "Strictly follow physician guidance regarding daily fluid and protein intake quotas",
            "Do not consume over-the-counter pain medications without nephrologist clearance",
            "Maintain tight control over both blood pressure and blood glucose levels"
        ],
        "diet": {
            "recommended": ["Renal-diet formulated low potassium & low phosphorus foods", "Apples, cabbage, egg whites"],
            "avoid": ["Bananas & oranges (high potassium)", "Dairy products (high phosphorus)", "Canned high-sodium goods"]
        }
    },
    "Urinary Tract Infection (UTI)": {
        "core_symptoms": ["burning_micturition", "spotting_urination", "stomach_pain", "abdominal_pain"],
        "optional_symptoms": ["mild_fever", "dark_urine", "nausea"],
        "specialist": "Urologist",
        "severity": "Moderate",
        "urgency_score": 2,
        "precautions": [
            "Drink 2.5 to 3 liters of fresh water daily to help flush bacteria from urinary tract",
            "Urinate promptly when the urge arises; do not hold urine for extended periods",
            "Undergo urine culture and sensitivity testing before finishing full antibiotic course",
            "Avoid feminine hygiene sprays and harsh scented soaps in pelvic area"
        ],
        "diet": {
            "recommended": ["Pure unsweetened cranberry extract or juice", "Abundant clean water", "Probiotic kefir"],
            "avoid": ["Caffeinated coffees and teas", "Citrus fruits during acute burning", "Alcohol and spicy foods"]
        }
    }
}

def generate_synthetic_dataset(samples_per_disease=90):
    """
    Generates realistic patient samples incorporating primary and secondary symptoms,
    biological variance, and stochastic noise.
    """
    X_samples = []
    y_labels = []

    symptom_to_idx = {sym: idx for idx, sym in enumerate(SYMPTOMS)}
    num_symptoms = len(SYMPTOMS)

    for disease_name, profile in DISEASE_PROFILES.items():
        core = [s for s in profile["core_symptoms"] if s in symptom_to_idx]
        optional = [s for s in profile.get("optional_symptoms", []) if s in symptom_to_idx]

        for _ in range(samples_per_disease):
            patient_vector = np.zeros(num_symptoms, dtype=int)

            # High probability of having core symptoms (85% - 100%)
            for sym in core:
                if np.random.rand() > 0.12:
                    patient_vector[symptom_to_idx[sym]] = 1

            # Ensure at least 2 core symptoms are always present
            if np.sum(patient_vector) < 2 and len(core) >= 2:
                for sym in core[:2]:
                    patient_vector[symptom_to_idx[sym]] = 1

            # Moderate probability of having optional symptoms (30% - 60%)
            for sym in optional:
                if np.random.rand() < 0.45:
                    patient_vector[symptom_to_idx[sym]] = 1

            # Small random background noise (1% chance of unrelated minor symptom)
            noise_idx = np.random.randint(0, num_symptoms)
            if np.random.rand() < 0.05:
                patient_vector[noise_idx] = 1

            X_samples.append(patient_vector)
            y_labels.append(disease_name)

    return np.array(X_samples), np.array(y_labels)

def train_and_export():
    print("=" * 60)
    print("  AI-Powered Smart Healthcare Assistant: ML Model Training  ")
    print("=" * 60)

    print(f"Generating synthetic clinical dataset for {len(DISEASE_PROFILES)} diseases...")
    X, y = generate_synthetic_dataset(samples_per_disease=100)
    print(f"Total dataset shape: {X.shape[0]} patient records, {X.shape[1]} symptom features.")

    # Split dataset
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    print("\nTraining Random Forest Ensemble Classifier...")
    model = RandomForestClassifier(
        n_estimators=120,
        max_depth=16,
        min_samples_split=3,
        random_state=42,
        class_weight="balanced"
    )
    model.fit(X_train, y_train)

    # Evaluation
    y_pred = model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    cv_scores = cross_val_score(model, X, y, cv=5)

    print(f"\nModel Test Accuracy: {acc * 100:.2f}%")
    print(f"5-Fold Cross-Validation Accuracy: {cv_scores.mean() * 100:.2f}% (+/- {cv_scores.std() * 100:.2f}%)")

    # Serialize Model
    script_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(script_dir, "disease_model.joblib")
    joblib.dump(model, model_path)
    print(f"Model successfully saved to: {model_path}")

    # Export Metadata for Node.js / Python API
    metadata = {
        "version": "1.0.0",
        "algorithm": "RandomForestClassifier",
        "num_estimators": 120,
        "test_accuracy": round(float(acc) * 100, 2),
        "cv_accuracy": round(float(cv_scores.mean()) * 100, 2),
        "symptoms": SYMPTOMS,
        "diseases": list(DISEASE_PROFILES.keys()),
        "disease_profiles": DISEASE_PROFILES
    }

    metadata_path = os.path.join(script_dir, "model_metadata.json")
    with open(metadata_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
    print(f"Metadata exported to: {metadata_path}")

    # Also copy metadata to backend/data for fast native Node.js access & resilience
    backend_data_dir = os.path.join(script_dir, "..", "backend", "data")
    os.makedirs(backend_data_dir, exist_ok=True)
    backend_metadata_path = os.path.join(backend_data_dir, "model_metadata.json")
    with open(backend_metadata_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
    print(f"Metadata synced to backend at: {backend_metadata_path}")

    print("\nTraining completed successfully! Ready for inference.")

if __name__ == "__main__":
    train_and_export()
