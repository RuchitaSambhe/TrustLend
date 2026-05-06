import { useState, useRef, useEffect } from "react";
import { Mic, MicOff } from "lucide-react";

// Hindi number words to digits
const HINDI_NUMBERS = {
  ek: 1, do: 2, teen: 3, char: 4, paanch: 5, panch: 5,
  chhe: 6, saat: 7, aath: 8, nau: 9, das: 10,
  gyarah: 11, barah: 12, terah: 13, chaudah: 14, pandrah: 15,
  solah: 16, satrah: 17, athaarah: 18, unees: 19, bees: 20,
  pachees: 25, tees: 30, paintees: 35, chaalees: 40, pachaas: 50,
  saath: 60, sattar: 70, assi: 80, nabbe: 90, sau: 100,
};

const PURPOSE_KEYWORDS = {
  // English
  home: "Home Loan", house: "Home Loan", flat: "Home Loan",
  apartment: "Home Loan", renovation: "Home Loan", property: "Home Loan",
  car: "Vehicle Loan", vehicle: "Vehicle Loan", bike: "Vehicle Loan",
  business: "Business Loan", shop: "Business Loan", startup: "Business Loan",
  company: "Business Loan",
  education: "Education Loan", study: "Education Loan", college: "Education Loan",
  university: "Education Loan", school: "Education Loan",
  personal: "Personal Loan", marriage: "Personal Loan",
  wedding: "Personal Loan", medical: "Personal Loan",
  // Hinglish
  ghar: "Home Loan", makaan: "Home Loan",
  gaadi: "Vehicle Loan", gaddi: "Vehicle Loan", gadi: "Vehicle Loan",
  padhai: "Education Loan", padhne: "Education Loan",
  shaadi: "Personal Loan", shadi: "Personal Loan",
  vyapar: "Business Loan", dukaan: "Business Loan", karobar: "Business Loan",
};

function hindiWordToNumber(word) {
  const w = word.toLowerCase().trim();
  if (HINDI_NUMBERS[w] !== undefined) return HINDI_NUMBERS[w];
  return null;
}

function parseAll(text) {
  const lower = text.toLowerCase();
  const parsed = {};

  // --- NAME ---
  const namePatterns = [
    // English
    /(?:my name is|i am|i'm|name is|this is|myself)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+){0,3})/i,
    /(?:name)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+){0,3})/i,
    // Hinglish
    /(?:mera naam|mera name|naam)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+){0,3})\s*(?:hai|he|h)?/i,
    /(?:main|mai|me)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+){0,3})\s+(?:bol raha|bol rahi|hoon|hun|hu)/i,
  ];
  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match) {
      let name = match[1].trim()
        .replace(/\b(hai|he|h|hoon|hun|hu|bol|raha|rahi)\b/gi, "")
        .trim()
        .replace(/\b\w/g, (c) => c.toUpperCase());
      if (name.length > 2) {
        parsed.name = name;
        break;
      }
    }
  }

  // --- PHONE ---
  const phonePatterns = [
    /(?:phone|mobile|number|contact|mera number|phone number|mera phone)[\s:is]*(\d[\d\s]{8,12}\d)/i,
    /(?:number|phone)[\s:is]*(\d[\d\s]{8,12}\d)\s*(?:hai|he|h)?/i,
    /\b([6-9]\d{9})\b/,
  ];
  for (const pattern of phonePatterns) {
    const match = lower.match(pattern);
    if (match) {
      const digits = match[1].replace(/\s/g, "");
      if (digits.length === 10) {
        parsed.phone = digits;
        break;
      }
    }
  }

  // --- LOAN AMOUNT ---
  // First try Hindi number words + lakh/crore
  const hindiAmountPatterns = [
    /(?:mujhe|muje|chahiye|loan|amount|need|want|borrow|require|dedo|de do|chahie)[\s\w]*?(\w+)\s*(?:lakh|lac|lacs|lakhs)/i,
    /(\w+)\s*(?:lakh|lac|lacs|lakhs)\s*(?:ka|ki|chahiye|chahie|loan|rupee|rs)?/i,
    /(\w+)\s*(?:crore|karod|cr)\s*(?:ka|ki|chahiye|chahie|loan)?/i,
  ];
  let amountFound = false;
  for (const pattern of hindiAmountPatterns) {
    const match = lower.match(pattern);
    if (match && !amountFound) {
      let numStr = match[1].trim();
      let num = parseFloat(numStr);
      if (isNaN(num)) {
        const hindiNum = hindiWordToNumber(numStr);
        if (hindiNum) num = hindiNum;
        else continue;
      }
      if (match[0].includes("crore") || match[0].includes("karod")) {
        parsed.loan_amount = String(Math.round(num * 10000000));
      } else {
        parsed.loan_amount = String(Math.round(num * 100000));
      }
      amountFound = true;
      break;
    }
  }
  // Fallback: numeric patterns
  if (!amountFound) {
    const numAmountPatterns = [
      /(\d+\.?\d*)\s*(?:lakh|lac|lacs|lakhs)/i,
      /(\d+\.?\d*)\s*(?:crore|cr)/i,
      /(\d+\.?\d*)\s*(?:thousand|hazar|hazaar)/i,
      /(?:loan|amount)[\s:is]*(\d{5,})/i,
    ];
    for (const pattern of numAmountPatterns) {
      const match = lower.match(pattern);
      if (match) {
        const num = parseFloat(match[1]);
        if (match[0].includes("lakh") || match[0].includes("lac")) {
          parsed.loan_amount = String(Math.round(num * 100000));
        } else if (match[0].includes("crore")) {
          parsed.loan_amount = String(Math.round(num * 10000000));
        } else if (match[0].includes("thousand") || match[0].includes("hazar")) {
          parsed.loan_amount = String(Math.round(num * 1000));
        } else {
          parsed.loan_amount = String(Math.round(num));
        }
        break;
      }
    }
  }

  // --- MONTHLY INCOME ---
  const incomePatterns = [
    // Hinglish
    /(?:meri income|meri salary|income|salary|kamaai|kamata|kamati|earn|earning|mahine ka|monthly)[\s:is]*(\d+\.?\d*)\s*(?:lakh|lac|lakhs)/i,
    /(?:meri income|meri salary|income|salary|kamaai|kamata|kamati|earn|earning|mahine ka|monthly)[\s:is]*(\d+\.?\d*)\s*(?:thousand|hazar|hazaar|k\b)/i,
    /(?:meri income|meri salary|income|salary|kamaai|kamata|kamati|earn|earning|mahine ka|monthly)[\s:is]*(\d{4,})/i,
    // Hindi word numbers for income
    /(?:meri income|income|salary|mahine ka)[\s:is]*(\w+)\s*(?:thousand|hazar|hazaar)/i,
    /(?:meri income|income|salary|mahine ka)[\s:is]*(\w+)\s*(?:lakh|lac)/i,
  ];
  for (const pattern of incomePatterns) {
    const match = lower.match(pattern);
    if (match) {
      let num = parseFloat(match[1]);
      if (isNaN(num)) {
        const hindiNum = hindiWordToNumber(match[1].trim());
        if (hindiNum) num = hindiNum;
        else continue;
      }
      if (match[0].includes("lakh") || match[0].includes("lac")) {
        parsed.monthly_income = String(Math.round(num * 100000));
      } else if (match[0].includes("thousand") || match[0].includes("hazar") || match[0].includes("k")) {
        parsed.monthly_income = String(Math.round(num * 1000));
      } else {
        parsed.monthly_income = String(Math.round(num));
      }
      break;
    }
  }

  // --- CIBIL SCORE ---
  const cibilPatterns = [
    /(?:mera cibil|cibil score|cibil|credit score|credit|score)[\s:is]*(\d{3})\s*(?:hai|he|h)?/i,
    /(\d{3})\s*(?:cibil|credit)/i,
  ];
  for (const pattern of cibilPatterns) {
    const match = lower.match(pattern);
    if (match) {
      const score = parseInt(match[1]);
      if (score >= 300 && score <= 900) {
        parsed.cibil_score = String(score);
        break;
      }
    }
  }

  // --- LOAN PURPOSE ---
  // Hinglish purpose patterns
  if (lower.includes("ghar ke liye") || lower.includes("ghar lena") || lower.includes("makaan")) {
    parsed.loan_purpose = "Home Loan";
  } else if (lower.includes("gaadi ke liye") || lower.includes("gaddi") || lower.includes("gadi ke liye")) {
    parsed.loan_purpose = "Vehicle Loan";
  } else if (lower.includes("business ke liye") || lower.includes("dukaan") || lower.includes("karobar")) {
    parsed.loan_purpose = "Business Loan";
  } else if (lower.includes("padhai ke liye") || lower.includes("padhne ke liye")) {
    parsed.loan_purpose = "Education Loan";
  } else if (lower.includes("shaadi") || lower.includes("shadi ke liye")) {
    parsed.loan_purpose = "Personal Loan";
  } else {
    // English keywords fallback
    for (const [keyword, purpose] of Object.entries(PURPOSE_KEYWORDS)) {
      if (lower.includes(keyword)) {
        parsed.loan_purpose = purpose;
        break;
      }
    }
  }

  // --- TENURE ---
  const tenurePatterns = [
    /(\d+)\s*(?:saal|year|years|yr)/i,
    /(\d+)\s*(?:mahine|mahina|month|months)/i,
    /(?:tenure|period|time|emi|avadhi)[\s:is]*(\d+)\s*(?:month|months|year|years|saal|mahine)/i,
  ];
  for (const pattern of tenurePatterns) {
    const match = lower.match(pattern);
    if (match) {
      const num = parseInt(match[1]);
      if (match[0].includes("year") || match[0].includes("yr") || match[0].includes("saal")) {
        parsed.tenure_months = String(num * 12);
      } else {
        parsed.tenure_months = String(num);
      }
      break;
    }
  }

  return parsed;
}

export default function VoiceRecorder({ onParsed }) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [supported, setSupported] = useState(true);
  const [parsedFields, setParsedFields] = useState({});
  const recognitionRef = useRef(null);
  const lastParsedRef = useRef("");

  useEffect(() => {
    if (!transcript || transcript === lastParsedRef.current) return;
    lastParsedRef.current = transcript;
    const parsed = parseAll(transcript);
    if (Object.keys(parsed).length > 0) {
      setParsedFields(parsed);
      onParsed(parsed);
    }
  }, [transcript, onParsed]);

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-IN"; // Indian English handles Hinglish naturally

    recognition.onresult = (event) => {
      let finalText = "";
      for (let i = 0; i < event.results.length; i++) {
        finalText += event.results[i][0].transcript;
      }
      setTranscript(finalText);
    };

    recognition.onerror = () => { setListening(false); };
    recognition.onend = () => { setListening(false); };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
    setTranscript("");
    setParsedFields({});
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setListening(false);
  };

  if (!supported) {
    return (
      <p className="text-xs text-gray-500 text-center">
        Voice input not supported in this browser. Use Chrome for best results.
      </p>
    );
  }

  const fieldLabels = {
    name: "Name", phone: "Phone", loan_amount: "Loan Amount",
    monthly_income: "Income", cibil_score: "CIBIL",
    loan_purpose: "Purpose", tenure_months: "Tenure",
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={listening ? stopListening : startListening}
        className={`relative w-14 h-14 rounded-full flex items-center justify-center transition-all ${
          listening
            ? "bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/30"
            : "bg-gray-800 hover:bg-gray-700 border border-gray-700"
        }`}
        aria-label={listening ? "Stop recording" : "Start recording"}
      >
        {listening ? (
          <>
            <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-30" />
            <MicOff className="w-6 h-6 text-white relative z-10" />
          </>
        ) : (
          <Mic className="w-6 h-6 text-cyan-400" />
        )}
      </button>
      <p className="text-xs text-gray-500">
        {listening ? "Listening... speak naturally, then click to stop" : "Click to speak (English or Hinglish)"}
      </p>
      {transcript && (
        <div className="w-full mt-2 p-3 rounded-lg bg-gray-800/50 border border-gray-700">
          <p className="text-xs text-gray-400 mb-1">Heard:</p>
          <p className="text-sm text-gray-200 italic">{transcript}</p>
        </div>
      )}
      {Object.keys(parsedFields).length > 0 && (
        <div className="w-full mt-1 flex flex-wrap gap-2">
          {Object.entries(parsedFields).map(([key, val]) => (
            <span key={key} className="px-2 py-1 rounded bg-cyan-900/40 border border-cyan-700/50 text-xs text-cyan-300">
              {fieldLabels[key] || key}: {val}
            </span>
          ))}
        </div>
      )}
      {!listening && !transcript && (
        <div className="w-full text-xs text-gray-600 mt-1 text-center">
          <p>Try: &quot;Mera naam Rajesh hai, mujhe 10 lakh ka home loan chahiye, income 80 thousand, CIBIL 750&quot;</p>
        </div>
      )}
    </div>
  );
}
