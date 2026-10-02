# Placement Viva & Technical Job Interview Guide

This guide compiles high-frequency questions, architectural rationales, and model defense points designed to help you ace technical job interviews and university final-year project viva defenses.

---

### Q1: What is the core problem your project solves?
**Answer:**
Traditional healthcare systems suffer from two major bottlenecks:
1. **Misguided Specialist Routing:** Patients frequently book consultations with the wrong medical specialty (e.g., visiting a dermatologist for systemic allergic reactions or general physicians for acute cardiothoracic distress), leading to diagnostic delays.
2. **Hospital Waiting Room Inefficiencies:** Conventional first-come-first-served scheduling results in 45–70 minute average waiting lobby delays and fails to prioritize acute, high-risk cases.

Our project introduces an **end-to-end intelligent triage pipeline**: It utilizes a Random Forest classifier (97.5% accuracy) to identify likely diseases and their clinical severity tier from symptoms, and immediately triggers a **multi-factor slot optimization algorithm** that routes the patient to the exact specialist with priority queue allocation, saving up to 55 minutes of waiting time.

---

### Q2: Why did you choose Random Forest instead of Deep Learning (like CNNs or MLPs)?
**Answer:**
1. **Tabular, Categorical Nature of Symptom Features:** Clinical symptoms represent discrete binary/categorical indicators rather than continuous spatial or sequential data (like images or audio). Tree ensembles like Random Forests consistently match or outperform deep neural networks on tabular datasets without requiring millions of parameters.
2. **Interpretability & Differential Probabilities:** Random Forest produces well-calibrated class probability distributions across all 22 disease classes, enabling our UI to render ranked differential diagnoses rather than a single black-box output.
3. **Overfitting Resistance:** By training 120 de-correlated decision trees with random feature subsampling (\(\sqrt{p}\) features per split), Random Forest mitigates variance. Our model achieved **97.95% 5-fold cross-validation accuracy**.
4. **Inference Latency & Portability:** Model inference executes in less than 5 milliseconds and the serialized model artifact (`disease_model.joblib`) is under 2 MB, making it lightweight for production deployment.

---

### Q3: How does the Smart Appointment Optimization Algorithm work mathematically?
**Answer:**
Instead of a simple database lookup, our algorithm computes a **Fitness Score** for every candidate doctor slot:
\[
\text{Fitness}(s) = (w_{\text{urgency}} \cdot U) + (w_{\text{rating}} \cdot R_{\text{doc}}) - (w_{\text{delay}} \cdot H_{\text{delay}}) + B_{\text{slot}}
\]
- **Urgency Tier (\(U\)):** Derived directly from the disease triage engine (1: Routine, 2: Moderate, 3: High, 4: Critical).
- **Delay Offset (\(H_{\text{delay}}\)):** Penalizes slots that are too far into the future when urgency is high, ensuring acute patients are booked into express or emergency fast-track slots.
- **Doctor Rating (\(R_{\text{doc}}\)):** Factors in clinician quality and reviews.
- **Slot Type Bonus (\(B_{\text{slot}}\)):** Express and emergency reserved slots receive priority bonuses for urgent cases, balancing patient loads and preventing peak-hour clumping.

---

### Q4: Why use a microservice architecture (Python + Node.js) instead of doing everything in Python or Node.js?
**Answer:**
- **Separation of Concerns:** Python is the industry standard for scientific computing and machine learning (scikit-learn, numpy, joblib). Node.js and Express excel at high-throughput, non-blocking I/O, REST routing, and static asset serving.
- **Independent Scalability:** In an enterprise hospital deployment, the prediction microservice can be containerized (Docker) and scaled horizontally across GPU/CPU clusters, while the Node.js API Gateway handles WebSocket traffic, authentication, and database transactions.
- **Fault-Tolerant Fallback:** Our Node.js gateway implements an intelligent fallback algorithm that can continue delivering symptom triage if the Python service undergoes maintenance or cold starts.

---

### Q5: How do you handle medical liability and ethical AI safety?
**Answer:**
1. **Clear Clinical Disclaimers:** The system explicitly classifies itself as an auxiliary decision-support and triage tool, not a definitive medical diagnosis.
2. **Emergency Escalation Banner:** Prominent red banners guide patients with critical symptoms (e.g., chest tightness radiating to the arm, acute dyspnea) to immediately dial emergency services (911/112).
3. **Differential Diagnosis Display:** Rather than issuing an absolute verdict, the UI displays top 3 differential diagnoses with probability distributions, encouraging users to discuss possibilities with their physician.

---

### Q6: What are the primary REST API endpoints in your backend?
**Answer:**
- `GET /api/symptoms`: Categorized catalog of 48 symptoms with UI metadata.
- `POST /api/predict`: Symptom payload evaluation yielding predicted disease, severity, confidence %, precautions, and diet.
- `GET /api/appointments/optimize`: Query-based slot optimization taking specialty and urgency score.
- `POST /api/appointments/book`: Confirms booking and generates digital medical pass with encrypted token.
- `GET /api/appointments`: Fetches all confirmed patient appointments.
- `DELETE /api/appointments/:id`: Handles appointment cancellation.
- `POST /api/chat`: AI medical assistant conversation engine.
- `GET /api/stats`: Dashboard operational metrics.

---

### Q7: If you had more time, what would you add in Future Enhancements?
**Answer:**
1. **EHR / FHIR Integration:** Integration with HL7 FHIR standards to sync patient digital passes directly into hospital Electronic Health Records (Epic, Cerner).
2. **Automated SMS / WhatsApp Notifications:** Integration with Twilio for automated appointment reminders and queue position tracking.
3. **Telehealth Video Rooms:** WebRTC video consultation integration directly inside the booking confirmation modal.
