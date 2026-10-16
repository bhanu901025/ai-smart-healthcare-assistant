/**
 * Prediction Controller
 * Coordinates with the Python ML Microservice (port 5001) for Random Forest inference,
 * with a resilient built-in Bayesian/Jaccard clinical matcher fallback.
 * Automatically logs prediction events to the tamper-evident audit log.
 */

const fs = require('fs');
const path = require('path');
const { logAuditEvent } = require('./auditController');

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
        confidence: Math.min(Math.round(matchRatio * 96 + 3), 98),
        specialist: profile.specialist,
        severity: profile.severity,
        urgency_score: profile.urgency_score,
        precautions: profile.precautions || [],
        diet: profile.diet || { recommended: [], avoid: [] },
        matchedSymptoms: [...coreSymptoms, ...optionalSymptoms].filter(s => inputSet.has(s))
      });
    }
  }

  scoredCandidates.sort((a, b) => b.score - a.score || b.confidence - a.confidence);

  if (scoredCandidates.length === 0) {
    return {
      success: false,
      message: 'No clinical match found. Please verify the selected symptoms or speak with a general physician.'
    };
  }

  const primary = scoredCandidates[0];
  const alternatives = scoredCandidates.slice(1, 4).map(c => ({
    disease: c.disease,
    confidence: Math.round(c.confidence * 0.75),
    specialist: c.specialist
  }));

  return {
    success: true,
    predicted_disease: primary.disease,
    confidence: primary.confidence,
    specialist: primary.specialist,
    severity: primary.severity,
    urgency_score: primary.urgency_score,
    precautions: primary.precautions,
    diet: primary.diet,
    alternative_diagnoses: alternatives,
    matched_symptoms: primary.matchedSymptoms,
    total_symptoms_evaluated: normalizedInput.length,
    engine: 'Clinical Weighted Bayesian Matcher (Node.js Fallback Engine)'
  };
}

exports.predictDisease = async (req, res) => {
  try {
    const { symptoms } = req.body;
    const callerId = req.headers['x-user-id'] || 'usr-01';
    const callerRole = req.headers['x-user-role'] || 'patient';
    const callerName = req.headers['x-user-name'] || 'Alexander Wright';
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';

    if (!symptoms || !Array.isArray(symptoms) || symptoms.length === 0) {
      return res.status(400).json({
        status: 'error',
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

    logAuditEvent({
      action: 'AI_PREDICTION_EXECUTED',
      actorId: callerId,
      actorName: callerName,
      actorRole: callerRole,
      resource: '/api/predict',
      status: 'SUCCESS',
      details: `Symptoms: [${symptoms.slice(0, 4).join(', ')}${symptoms.length > 4 ? '...' : ''}] → Predicted: ${predictionResult.predicted_disease} (${predictionResult.confidence}%)`,
      ipAddress
    });

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
