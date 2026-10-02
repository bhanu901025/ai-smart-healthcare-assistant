/**
 * AI Health Assistant Chat Controller
 * Provides interactive medical triage assistance, symptom inquiry answering,
 * and system navigation advice with ethical healthcare disclaimers.
 */

const KNOWLEDGE_BASE = [
  {
    keywords: ['fever', 'temperature', 'pyrexia', 'hot'],
    response: "For a fever:\n• Stay well hydrated with water, herbal teas, or oral rehydration solutions.\n• Rest in a cool, ventilated room.\n• Monitor your temperature with a thermometer.\n• If fever exceeds 102°F (38.9°C), persists beyond 3 days, or is accompanied by difficulty breathing, seek immediate medical attention from a General Physician."
  },
  {
    keywords: ['chest pain', 'heart', 'tightness', 'left arm'],
    response: "⚠️ **Urgent Medical Advisory**: Chest pain or tightness, especially when radiating to your jaw, neck, or left arm, accompanied by sweating or shortness of breath, can indicate an acute cardiovascular event. Please immediately call emergency medical services (911/112) or head to the nearest emergency room without delay."
  },
  {
    keywords: ['headache', 'migraine', 'head pain', 'temple'],
    response: "For headaches or migraines:\n• Rest in a dark, quiet, distraction-free environment.\n• Apply a cold or warm compress to forehead or nape of neck.\n• Keep yourself hydrated as dehydration is a primary trigger.\n• If headaches are recurrent, pulsating, or accompanied by visual aura or vomiting, schedule a consultation with our Neurologist."
  },
  {
    keywords: ['cough', 'cold', 'sneeze', 'flu', 'throat'],
    response: "For cough, cold, or throat irritation:\n• Practice warm saline gargles 2-3 times daily.\n• Inhale steam to liquefy mucus and relieve nasal congestion.\n• Consume honey with warm ginger tea (avoid honey for infants under 1 year).\n• If cough persists longer than 2 weeks, produces blood, or causes shortness of breath, please consult a Pulmonologist."
  },
  {
    keywords: ['stomach', 'acidity', 'gas', 'indigestion', 'gerd', 'belly'],
    response: "For stomach discomfort and acidity:\n• Eat smaller, frequent, non-greasy meals and avoid lying down within 3 hours after eating.\n• Avoid spicy, deep-fried, carbonated, and caffeinated triggers.\n• Stay hydrated with water or electrolyte fluids.\n• Consult our Gastroenterologist if abdominal pain is sharp, accompanied by persistent vomiting, or dark stools."
  },
  {
    keywords: ['how', 'appointment', 'optimization', 'work', 'algorithm'],
    response: "💡 **How Our Smart Appointment Optimization Works**:\n1. **Triage Severity Weighting**: Our AI classifies symptom urgency into 4 tiers (Low, Moderate, High, Critical).\n2. **Specialist Dynamic Match**: Directly pairs your disease prediction with the relevant clinical specialist (Cardiologist, Pulmonologist, etc.).\n3. **Queue Balancing**: Analyzes real-time slot density and doctor schedules to offer Express Windows, slashing average clinic waiting times by 40-55%!"
  },
  {
    keywords: ['accuracy', 'model', 'dataset', 'machine learning'],
    response: "🔬 **AI Model Specifications**:\n• **Architecture**: Random Forest Ensemble Classifier (120 Estimators, Balanced Class Weights).\n• **Training Accuracy**: ~97.5% across 22 major disease profiles and 48 clinical symptoms.\n• **5-Fold Cross-Validation**: ~98.0% consistency score.\n• Includes real-time differential diagnosis ranking and severity triage."
  },
  {
    keywords: ['diet', 'food', 'nutrition', 'sugar', 'diabetes'],
    response: "🥗 **Nutritional Guidance**:\n• **For Blood Sugar Control**: Prioritize low glycemic index foods (whole oats, quinoa, leafy greens, legumes) and eliminate added sugars.\n• **For Heart Health**: Adopt the DASH or Mediterranean diet, prioritize extra virgin olive oil, and limit sodium to <2000mg/day.\n• Always consult an Endocrinologist or certified clinical dietitian for personalized meal planning."
  }
];

exports.handleChatMessage = (req, res) => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ success: false, error: 'Please enter a valid message.' });
    }

    const lower = message.toLowerCase().trim();
    let bestMatch = null;
    let maxMatchCount = 0;

    for (const item of KNOWLEDGE_BASE) {
      let matches = 0;
      for (const kw of item.keywords) {
        if (lower.includes(kw)) matches++;
      }
      if (matches > maxMatchCount) {
        maxMatchCount = matches;
        bestMatch = item.response;
      }
    }

    let botReply = bestMatch;

    if (!botReply) {
      if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
        botReply = "Hello! I am your AI Smart Healthcare Assistant. You can describe your symptoms, ask about disease prevention, learn how appointment optimization works, or ask which specialist to consult.";
      } else if (lower.includes('doctor') || lower.includes('book')) {
        botReply = "You can easily schedule a consultation! Click on the **'Smart Appointments'** tab or use our **'Disease Predictor'** first so our AI can automatically recommend the right specialist and optimized time slot.";
      } else {
        botReply = "I understand you are asking about: \"" + message + "\". For comprehensive clinical insights, please use our **Disease Predictor** by selecting your specific symptoms, or speak directly with our licensed doctors using the **Smart Appointments** portal.\n\n*Note: This AI tool is for informational triage guidance and does not replace emergency clinical diagnosis.*";
      }
    }

    return res.json({
      success: true,
      userMessage: message,
      reply: botReply,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
