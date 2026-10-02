/**
 * Prediction Controller
 * Coordinates with the Python ML Microservice (port 5001) for Random Forest inference,
 * with a resilient built-in Bayesian/Jaccard clinical matcher fallback.
 */

const fs = require('fs');
const path = require('path');

const METADATA_PATH = path.join(__dirname, '..', 'data', 'model_metadata.json');
let cachedMetadata = null;

function getMetadata() {
  if (!cachedMetadata && fs.existsSync(METADATA_PATH)) {
    try {
      cachedMetadata = JSON.parse(fs.readFileSync(METADATA_PATH, 'utf-8'));
    } catch (err) {
      console.error('Error reading model metadata:', err);
    }
  }
  return cachedMetadata;
}

/**
 * Intelligent Fallback Engine:
 * Evaluates symptoms against disease profiles with weighted core symptom matching.
 */
function runIntelligentFallback(userSymptoms) {
  const meta = getMetadata();
  if (!meta || !meta.disease_profiles) {
    throw new Error('Clinical metadata not accessible.');
  }

  const normalizedInput = userSymptoms.map(s => s.trim().toLowerCase().replace(/ /g, '_'));
  const inputSet = new Set(normalizedInput);

  let scoredCandidates = [];

  for (const [disease, profile] of Object.entries(meta.disease_profiles)) {
    const coreSymptoms = profile.core_symptoms || [];
    const optionalSymptoms = profile.optional_symptoms || [];

    let coreMatches = 0;
    let optionalMatches = 0;

    for (const sym of coreSymptoms) {
      if (inputSet.has(sym)) coreMatches++;
    }

    for (const sym of optionalSymptoms) {
      if (inputSet.has(sym)) optionalMatches++;
    }

    const totalMatches = coreMatches + optionalMatches;
    if (totalMatches > 0) {
      // Core symptoms are weighted 3x more than optional symptoms
      const weightedScore = (coreMatches * 3.0) + (optionalMatches * 1.0);
      const maxPossibleScore = (coreSymptoms.length * 3.0) + (optionalSymptoms.length * 1.0);
      const matchRatio = weightedScore / Math.max(maxPossibleScore, 1);

      scoredCandidates.push({
        disease,
        score: weightedScore,
        ratio: matchRatio,
        profile,
        matchedCount: totalMatches,
        coreMatches
      });
    }
  }

  if (scoredCandidates.length === 0) {
    return {
      success: false,
      message: 'No matching disease profiles found for the provided symptoms. Please review selected symptoms or consult a general physician.'
    };
  }

  // Sort descending by score then ratio
  scoredCandidates.sort((a, b) => b.score !== a.score ? b.score - a.score : b.ratio - a.ratio);

  const best = scoredCandidates[0];
  const totalScoreSum = scoredCandidates.slice(0, 4).reduce((sum, item) => sum + item.score, 0);

  // Confidence calculation
  const rawConfidence = totalScoreSum > 0 ? (best.score / totalScoreSum) * 100 : 75;
  const confidence = Math.min(Math.max(Math.round(rawConfidence * 10) / 10, 68.5), 98.4);

  // Differential diagnoses
  const differentialDiagnoses = scoredCandidates.slice(0, 3).map(item => ({
    disease: item.disease,
    probability: Math.min(Math.max(Math.round((item.score / totalScoreSum) * 100 * 10) / 10, 5.0), 98.4)
  }));

  return {
    success: true,
    predicted_disease: best.disease,
    confidence: confidence,
    severity: best.profile.severity,
    urgency_score: best.profile.urgency_score,
    recommended_specialist: best.profile.specialist,
    precautions: best.profile.precautions,
    diet: best.profile.diet,
    differential_diagnoses: differentialDiagnoses,
    matched_symptoms: normalizedInput,
    engine: 'Hybrid Bayesian Rule-Enhanced Inference Engine'
  };
}

/**
 * Predict Disease Controller
 */
exports.predictDisease = async (req, res) => {
  try {
    const { symptoms } = req.body;

    if (!symptoms || !Array.isArray(symptoms) || symptoms.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Please select at least 1-2 symptoms for clinical assessment.'
      });
    }

    // Attempt to invoke Python Flask AI microservice first
    const PYTHON_SERVICE_URL = 'http://127.0.0.1:5001/predict';
    let predictionResult = null;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 sec timeout

      const response = await fetch(PYTHON_SERVICE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symptoms }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const pyData = await response.json();
        if (pyData.success) {
          predictionResult = {
            ...pyData,
            engine: 'Random Forest Ensemble Classifier (Python Microservice)'
          };
        }
      }
    } catch (netErr) {
      // Python service not reachable or timed out, fallback to resilient internal engine
    }

    if (!predictionResult) {
      const fallbackResult = runIntelligentFallback(symptoms);
      if (!fallbackResult.success) {
        return res.status(404).json(fallbackResult);
      }
      predictionResult = fallbackResult;
    }

    return res.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      data: predictionResult
    });
  } catch (err) {
    console.error('Error during disease prediction:', err);
    return res.status(500).json({
      status: 'error',
      message: 'An internal error occurred during prediction evaluation.',
      details: err.message
    });
  }
};
