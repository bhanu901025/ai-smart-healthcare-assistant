/**
 * Multilingual Healthcare Localization (i18n) Engine
 * Supports English (EN), Telugu (TE - తెలుగు), and Hindi (HI - हिंदी)
 * Provides localized clinical notices, emergency guidance, and diagnostic feedback.
 */

const I18N_DATA = {
  en: {
    emergencyBanner: "Emergency Notice: For acute chest pressure, respiratory distress, or stroke symptoms, dial 112 / 108 immediately.",
    navDashboard: "Visual Dashboard",
    navPredictor: "AI Disease Predictor",
    navAppointments: "Smart Appointments",
    navRecords: "Patient EHR Records",
    navValidation: "AI Validation & Evidence",
    navAdmin: "Admin & Audit Logs",
    quickConsult: "Start AI Clinical Triage",
    chatWelcome: "Hello! I am your AI Clinical Assistant. You can describe what symptoms you're feeling, ask about diet advice, or learn how our appointment optimization cuts hospital queues. How can I assist you today?",
    botNotice: "HealthPulse AI is an auxiliary educational decision support system. It does not replace registered physician examination."
  },
  te: {
    emergencyBanner: "అత్యవసర హెచ్చరిక: తీవ్రమైన ఛాతీ నొప్పి, శ్వాస తీసుకోవడంలో ఇబ్బంది ఉంటే వెంటనే 112 లేదా 108 కి కాల్ చేయండి.",
    navDashboard: "విజువల్ డాష్‌బోర్డ్",
    navPredictor: "AI వ్యాధి నిర్ధారణ",
    navAppointments: "స్మార్ట్ అపాయింట్‌మెంట్లు",
    navRecords: "రోగి వైద్య రికార్డులు (EHR)",
    navValidation: "AI మోడల్ విశ్లేషణ & సాక్ష్యం",
    navAdmin: "అడ్మిన్ & ఆడిట్ లాగ్స్",
    quickConsult: "AI క్లినికల్ పరీక్షను ప్రారంభించండి",
    chatWelcome: "నమస్కారం! నేను మీ AI క్లినికల్ సహాయకుడిని. మీ లక్షణాలను వివరించండి, ఆహార సలహాలు పొందండి లేదా ఆసుపత్రి వేచి ఉండే సమయాన్ని ఎలా తగ్గించవచ్చో తెలుసుకోండి.",
    botNotice: "HealthPulse AI అనేది సహాయక విద్యా వ్యవస్థ. ఇది వైద్యుడి ప్రత్యక్ష పరీక్షకు ప్రత్యామ్నాయం కాదు."
  },
  hi: {
    emergencyBanner: "आपातकालीन सूचना: सीने में तेज दर्द, सांस लेने में तकलीफ या गंभीर लक्षणों के लिए तुरंत 112 या 108 पर कॉल करें।",
    navDashboard: "विजुअल डैशबोर्ड",
    navPredictor: "AI रोग निदान",
    navAppointments: "स्मार्ट अपॉइंटमेंट",
    navRecords: "रोगी स्वास्थ्य रिकॉर्ड (EHR)",
    navValidation: "AI सत्यापन एवं साक्ष्य",
    navAdmin: "प्रशासक एवं ऑडिट लॉग",
    quickConsult: "AI क्लिनिकल जांच शुरू करें",
    chatWelcome: "नमस्ते! मैं आपका AI क्लिनिकल सहायक हूँ। अपने लक्षणों का वर्णन करें, आहार संबंधी सलाह लें, या अस्पताल में प्रतीक्षा समय कम करने की जानकारी प्राप्त करें।",
    botNotice: "HealthPulse AI एक सहायक शैक्षणिक निर्णय प्रणाली है। यह चिकित्सक की प्रत्यक्ष जांच का विकल्प नहीं है।"
  }
};

let currentLanguage = localStorage.getItem('healthpulse_lang') || 'en';

function setLanguage(lang) {
  if (!I18N_DATA[lang]) lang = 'en';
  currentLanguage = lang;
  localStorage.setItem('healthpulse_lang', lang);

  // Update language selector active pills
  document.querySelectorAll('.lang-pill').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });

  applyTranslations(lang);
  showToast(`Language switched to ${lang === 'te' ? 'తెలుగు (Telugu)' : lang === 'hi' ? 'हिंदी (Hindi)' : 'English'}`, 'info');
}

function applyTranslations(lang) {
  const dict = I18N_DATA[lang] || I18N_DATA.en;

  const emergencyEl = document.getElementById('emergency-text-content');
  if (emergencyEl) emergencyEl.innerHTML = dict.emergencyBanner;

  const btnPredict = document.getElementById('topbar-btn-predict-text');
  if (btnPredict) btnPredict.textContent = dict.quickConsult;

  // Update bot first bubble if present
  const botFirstMsg = document.querySelector('.chat-msg.bot .msg-bubble');
  if (botFirstMsg && !botFirstMsg.dataset.userChatStarted) {
    botFirstMsg.textContent = dict.chatWelcome;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  applyTranslations(currentLanguage);
});
