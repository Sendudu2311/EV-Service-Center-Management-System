// Guard system for EV Service chatbot
// Prevents prompt injection and out-of-scope queries

export const guardUserInput = (rawInput) => {
  const normalized = rawInput
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

  // Prompt injection patterns
  const INJECTION_PATTERNS = [
    /ignore (all )?(previous|prior|above) (instructions|messages|rules)/i,
    /disregard (the )?(rules|system|instructions)/i,
    /override (the )?(system|guard|policy|safety)/i,
    /jailbreak|bypass|prompt[ -]?injection|system prompt/i,
    /act as .* (without|bypassing) (rules|safety|guard)/i,
    /pretend you are not bound by/i,
    /forget (all |previous )?(instructions|rules|context)/i,
    /leak (system|prompt|instructions)/i,
    /repeat after me: (ignore|override)/i,
    /encoded: (base64|rot13|hex)/i,
    /become (someone else|unrestricted|admin)/i,
    /developer mode|debug mode|unrestricted mode/i,
    /you are now (free|unrestricted)/i,
  ];

  // Out-of-scope patterns (non-EV/automotive topics)
  const OUT_OF_SCOPE_PATTERNS = [
    // Cooking/recipes
    /recipe|cooking|cuisine|baking|cocktail|food preparation/i,
    
    // Finance/investment
    /stock market|crypto|bitcoin|forex|trading|investment advice/i,
    /financial planning|loan|mortgage|tax advice/i,
    
    // Medical
    /medical advice|diagnosis|prescription|disease|symptom|treatment/i,
    /medication|health condition|doctor|hospital/i,
    
    // Legal
    /legal advice|lawyer|lawsuit|contract review|court/i,
    /divorce|inheritance|will|attorney/i,
    
    // Adult content
    /18\+|xxx|nsfw|porn|erotic|adult content|sexual/i,
    
    // Hate speech/politics
    /hate speech|racism|terrorism|extremist|political campaign/i,
    
    // Gambling
    /casino|poker|betting|lottery|gambling/i,
    
    // Religion/superstition
    /horoscope|astrology|fortune telling|religious prophecy/i,
    
    // Violence/weapons
    /weapon|gun|explosive|violence|assault/i,
    
    // Piracy/hacking
    /crack|pirate|illegal download|hack (into|account)/i,
  ];

  // Check for injection attempts
  if (INJECTION_PATTERNS.some(pattern => pattern.test(normalized))) {
    return {
      allowed: false,
      reason: 'injection',
      message: 'I cannot process this request. Please ask questions about EV maintenance, appointments, or services.'
    };
  }

  // Check for out-of-scope topics
  if (OUT_OF_SCOPE_PATTERNS.some(pattern => pattern.test(normalized))) {
    return {
      allowed: false,
      reason: 'out_of_scope',
      message: 'I can only help with EV service-related questions like appointments, maintenance, parts, and vehicle services. Please ask about those topics!'
    };
  }

  return { allowed: true };
};

export const FALLBACK_MESSAGES = {
  injection: {
    en: "I'm designed to help with EV service questions only. Please ask about appointments, maintenance, parts, or vehicle services.",
    vi: "Tôi chỉ có thể hỗ trợ về dịch vụ EV. Vui lòng hỏi về lịch hẹn, bảo dưỡng, phụ tùng hoặc dịch vụ xe."
  },
  out_of_scope: {
    en: "I specialize in EV service assistance. Try asking about booking appointments, vehicle maintenance, available services, or parts availability!",
    vi: "Tôi chuyên hỗ trợ dịch vụ EV. Hãy hỏi về đặt lịch hẹn, bảo dưỡng xe, các dịch vụ có sẵn, hoặc tình trạng phụ tùng!"
  },
  error: {
    en: "Sorry, I'm experiencing technical difficulties. Please try again later or contact our support team.",
    vi: "Xin lỗi, tôi đang gặp sự cố kỹ thuật. Vui lòng thử lại sau hoặc liên hệ đội ngũ hỗ trợ."
  }
};

export const getFallbackMessage = (reason, language = 'en') => {
  const lang = language === 'vi' ? 'vi' : 'en';
  return FALLBACK_MESSAGES[reason]?.[lang] || FALLBACK_MESSAGES.error[lang];
};
