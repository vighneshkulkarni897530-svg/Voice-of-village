/**
 * Gram Panchayat Samasya Nivaran - Shared Client Engine
 * Handles Authentication, Bilingual i18n, Toast Notifications, Location Hierarchy, and Modal Dialogs.
 */

const API_BASE = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
    ? window.location.origin
    : (window.location.protocol === 'file:' ? 'http://localhost:3000' : window.location.origin);

/* ==========================================================================
   1. LOCATION HIERARCHY (Maharashtra Districts, Talukas & Major Villages)
   ========================================================================== */
const MAHARASHTRA_LOCATIONS = {
    "Ahmednagar": {
        talukas: ["Ahmednagar", "Akole", "Jamkhed", "Karjat", "Kopargaon", "Nevasa", "Parner", "Pathardi", "Rahata", "Rahuri", "Sangamner", "Shevgaon", "Shrigonda", "Shrirampur"],
        villages: ["Shirdi", "Loni", "Bableshwar", "Ashwi", "Puntamba", "Chitali", "Walki", "Sakur", "Kotul", "Belwandi", "Deolali Pravara", "Sonai", "Tisgaon", "Takli Dhokeshwar"]
    },
    "Akola": {
        talukas: ["Akola", "Akot", "Balapur", "Barshitakli", "Murtijapur", "Patur", "Telhara"],
        villages: ["Borgaon Manju", "Ural", "Kapshi", "Karanja Ramzanpur", "Hiwarkhed", "Wadegaon", "Paras", "Pinjar", "Mahan", "Babhulgaon"]
    },
    "Amravati": {
        talukas: ["Amravati", "Achalpur", "Anjangaon Surji", "Bhatkuli", "Chandur Bazar", "Chandur Railway", "Chikhaldara", "Daryapur", "Dhamangaon Railway", "Dharni", "Morshi", "Nandgaon Khandeshwar", "Teosa", "Warud"],
        villages: ["Paratwada", "Karasgaon", "Walgaon", "Badnera Rural", "Nerpingalai", "Semadoh", "Harisal", "Pusla", "Benoda", "Loni", "Talegaon Dashasar"]
    },
    "Chhatrapati Sambhajinagar (Aurangabad)": {
        talukas: ["Chhatrapati Sambhajinagar", "Gangapur", "Kannad", "Khuldabad", "Paithan", "Phulambri", "Sillod", "Soegaon", "Vaijapur"],
        villages: ["Ellora (Verul)", "Chitegaon", "Waluj Rural", "Bidkin", "Gevrai", "Pachod", "Pishor", "Ajantha", "Shivar", "Ladsawangi"]
    },
    "Beed": {
        talukas: ["Beed", "Ambejogai", "Ashti", "Dharur", "Georai", "Kaij", "Majalgaon", "Parli", "Patoda", "Shirur Kasar", "Wadwani"],
        villages: ["Pimpalner", "Neknoor", "Chinchwan", "Bardapur", "Kada", "Talkhed", "Kada", "Ranjani", "Sirsal", "Yelamb Ghat"]
    },
    "Bhandara": {
        talukas: ["Bhandara", "Lakhandur", "Lakhani", "Mohadi", "Pauni", "Sakoli", "Tumsar"],
        villages: ["Sihora", "Shahapur", "Kardi", "Dighori", "Adyal", "Palandur", "Sendurwafa", "Pohra", "Bawanthadi"]
    },
    "Buldhana": {
        talukas: ["Buldhana", "Chikhli", "Deulgaon Raja", "Jalgaon Jamod", "Khamgaon", "Lonar", "Malkapur", "Mehkar", "Motala", "Nandura", "Sangrampur", "Shegaon", "Sindkhed Raja"],
        villages: ["Dhad", "Undri", "Pimpalgaon Raja", "Sonati", "Sultanpur", "Janephal", "Paturda", "Dhamangaon", "Bhadgaon", "Raher"]
    },
    "Chandrapur": {
        talukas: ["Chandrapur", "Ballarpur", "Bhadrawati", "Brahmapuri", "Chimur", "Corpana", "Gondpipri", "Jiwati", "Mul", "Nagbhid", "Pombhurna", "Rajura", "Sawali", "Sindewahi", "Warora"],
        villages: ["Tadoba Gate", "Shegaon Rural", "Visapur", "Navegaon Mor", "Talodhi", "Ghughus Rural", "Sonurli", "Ashti", "Korpana", "Durgapur"]
    },
    "Dhule": {
        talukas: ["Dhule", "Sakri", "Shirpur", "Sindkheda"],
        villages: ["Songir", "Kusumba", "Nardana", "Dondaicha Rural", "Thalner", "Boradi", "Dusane", "Nijampur", "Pimpalner", "Kapadan"]
    },
    "Gadchiroli": {
        talukas: ["Gadchiroli", "Aheri", "Armori", "Bhamragad", "Chamorshi", "Dhanora", "Etapalli", "Korchi", "Kurkheda", "Mulchera", "Sironcha", "Wadsa"],
        villages: ["Porla", "Allapalli", "Ashti", "Ghot", "Kuner", "Potegaon", "Jimalgatta", "Venkatappapur", "Kasansur"]
    },
    "Gondia": {
        talukas: ["Gondia", "Amgaon", "Arjuni Morgaon", "Deori", "Goregaon", "Sadak Arjuni", "Salekasa", "Tirora"],
        villages: ["Kati", "Dasgaon", "Bhatera", "Navegaon Bandh", "Chichgarh", "Mundikota", "Darekasa", "Kamtha", "Fulchur"]
    },
    "Hingoli": {
        talukas: ["Hingoli", "Aundha Nagnath", "Basmath", "Kalamnuri", "Sengaon"],
        villages: ["Narsi Namdev", "Malhargad", "Ardhapur", "Kurunda", "Sirli", "Goregaon", "Wapti", "Pardi"]
    },
    "Jalgaon": {
        talukas: ["Jalgaon", "Amalner", "Bhadgaon", "Bhusawal", "Bodwad", "Chalisgaon", "Chopda", "Dharangaon", "Erandol", "Jamner", "Muktainagar", "Pachora", "Parola", "Raver", "Yawal"],
        villages: ["Savda", "Varangaon", "Neri", "Nandre", "Pahur", "Paldhi", "Nashirabad", "Bahadarpur", "Faizpur", "Nagardeola"]
    },
    "Jalna": {
        talukas: ["Jalna", "Ambad", "Badnapur", "Bhokardan", "Ghansawangi", "Jafrabad", "Mantha", "Partur"],
        villages: ["Ranjani", "Anwa", "Shahgad", "Watur", "Tembhurni", "Hasanabad", "Kumbharzari", "Wadigodri", "Ner"]
    },
    "Kolhapur": {
        talukas: ["Karveer", "Ajara", "Bhudargad", "Chandgad", "Gadhinglaj", "Gaganbawda", "Hatkanangale", "Kagal", "Panhala", "Radhanagari", "Shahuwadi", "Shirol"],
        villages: ["Hupari", "Ichalkaranji Rural", "Gandhinagar", "Uchgaon", "Jaysingpur", "Nrusinhawadi", "Bambavade", "Bidri", "Gargoti", "Halgewadi"]
    },
    "Latur": {
        talukas: ["Latur", "Ahmadpur", "Ausa", "Chakur", "Deoni", "Jalkot", "Nilanga", "Renapur", "Shirur Anantpal", "Udgir"],
        villages: ["Murud", "Bhadgaon", "Kasar Sirsi", "Aurad Shahajani", "Halgara", "Kingaon", "Wadhwana", "Nalegaon", "Lamjana"]
    },
    "Mumbai City": {
        talukas: ["Colaba", "Fort", "Girgaon", "Malabar Hill", "Dadar"],
        villages: ["Ward A", "Ward B", "Ward C", "Ward D", "Ward G"]
    },
    "Mumbai Suburban": {
        talukas: ["Andheri", "Bandra", "Borivali", "Kurla"],
        villages: ["Marol", "Versova", "Malad Rural", "Dahisar Rural", "Ghatkopar Rural", "Chembur Village"]
    },
    "Nagpur": {
        talukas: ["Nagpur Urban", "Nagpur Rural", "Hingna", "Kamptee", "Katol", "Kalmeshwar", "Kuhi", "Mouda", "Narkhed", "Parseoni", "Ramtek", "Savner", "Umred", "Bhiwapur"],
        villages: ["Wadi", "Besur", "Bori", "Mansar", "Nagardhan", "Mahadula", "Gumgaon", "Pachgaon", "Dhapewada", "Kelwad"]
    },
    "Nanded": {
        talukas: ["Nanded", "Ardhapur", "Bhokar", "Biloli", "Deglur", "Dharmabad", "Hadgaon", "Himayatnagar", "Kandhar", "Kinwat", "Loha", "Mahur", "Mudkhed", "Mukhed", "Naigaon", "Umri"],
        villages: ["Tirkut", "Songaon", "Limbgaon", "Barad", "Tamsa", "Mandvi", "Unkeshwar", "Wazirabad", "Kuntur"]
    },
    "Nandurbar": {
        talukas: ["Nandurbar", "Akkalkuwa", "Akrani (Dhadgaon)", "Navapur", "Shahada", "Taloda"],
        villages: ["Prakasha", "Sarangkheda", "Khandbara", "Molgi", "Ranala", "Toranmal", "Borad", "Chinchpada"]
    },
    "Nashik": {
        talukas: ["Nashik", "Baglan (Satana)", "Chandwad", "Deola", "Dindori", "Igatpuri", "Kalwan", "Malegaon", "Nandgaon", "Niphad", "Peint", "Sinnar", "Surgana", "Trimbakeshwar", "Yevla"],
        villages: ["Pimpalgaon Baswant", "Ozar", "Lasalgaon", "Ghoti", "Vani", "Saykheda", "Deolali Village", "Naydongri", "Manmad Rural", "Andarsul"]
    },
    "Dharashiv (Osmanabad)": {
        talukas: ["Dharashiv", "Bhum", "Kalamb", "Lohara", "Omerga", "Paranda", "Tuljapur", "Washi"],
        villages: ["Dhoki", "Ter", "Naldurg", "Murum", "Yermala", "Kati", "Itkal", "Salgar", "Jawalga"]
    },
    "Palghar": {
        talukas: ["Palghar", "Dahanu", "Jawhar", "Mokhada", "Talasari", "Vada", "Vasai", "Vikramgad"],
        villages: ["Boisar", "Safale", "Manor", "Kelve", "Gholvad", "Bordi", "Virar Rural", "Kudus", "Khodala"]
    },
    "Parbhani": {
        talukas: ["Parbhani", "Gangakhed", "Jintur", "Manwath", "Palam", "Pathri", "Purna", "Sailu", "Sonpeth"],
        villages: ["Pingli", "Tadkalas", "Bori", "Zari", "Dhalegaon", "Charthana", "Pedgaon", "Wadgaon Sukre"]
    },
    "Pune": {
        talukas: ["Pune City", "Haveli", "Ambegaon", "Baramati", "Bhor", "Daund", "Indapur", "Junnar", "Khed (Rajgurunagar)", "Maval", "Mulshi", "Purandar (Saswad)", "Shirur", "Velhe"],
        villages: ["Wagholi", "Khadakwasla", "Manchar", "Alandi", "Lonavala Rural", "Talegaon Rural", "Chakan", "Uruli Kanchan", "Narayangaon", "Bhigwan", "Jejuri", "Paud", "Somatane"]
    },
    "Raigad": {
        talukas: ["Alibag", "Karjat", "Khalapur", "Mahad", "Mangaon", "Mhasla", "Murud", "Panvel", "Pen", "Poladpur", "Roha", "Shrivardhan", "Sudhagad (Pali)", "Tala", "Uran"],
        villages: ["Revdanda", "Chaul", "Neral", "Matheran Rural", "Rasayani", "Nagothane", "Kihim", "Varsoli", "Kashid", "Birwadi", "Indapur (Raigad)"]
    },
    "Ratnagiri": {
        talukas: ["Ratnagiri", "Chiplun", "Dapoli", "Guhagar", "Khed", "Lanja", "Mandangad", "Rajapur", "Sangameshwar"],
        villages: ["Ganpatipule", "Jaigad", "Pawale", "Anjarle", "Kelshi", "Dervan", "Makhjan", "Devrukh", "Pachal", "Hateed"]
    },
    "Sangli": {
        talukas: ["Miraj", "Atpadi", "Jat", "Kadegaon", "Kavathe Mahankal", "Khanapur (Vita)", "Palus", "Shirala", "Tasgaon", "Walwa (Islampur)"],
        villages: ["Madhavnagar", "Budhgaon", "Kundal", "Kirloskarwadi", "Kasegaon", "Ashta", "Savlaj", "Dhalgaon", "Kokrud", "Uppalavani"]
    },
    "Satara": {
        talukas: ["Satara", "Jaoli", "Karad", "Khandala", "Khatav (Vaduj)", "Koregaon", "Mahabaleshwar", "Man (Dahiwadi)", "Patan", "Phaltan", "Wai"],
        villages: ["Panchgani Rural", "Shirwal", "Medha", "Lonand", "Ond", "Rahimatpur", "Helwak", "Bhuinj", "Umbraj", "Pusesawali"]
    },
    "Sindhudurg": {
        talukas: ["Kankavli", "Devgad", "Dodamarg", "Kudal", "Malvan", "Sawantwadi", "Vaibhavwadi", "Vengurla"],
        villages: ["Tarkarli", "Achara", "Kunkeshwar", "Mithbav", "Pinguli", "Amboli", "Shiroda", "Banda", "Talere"]
    },
    "Solapur": {
        talukas: ["Solapur North", "Solapur South", "Akkalkot", "Barshi", "Karmala", "Madha", "Malshiras", "Mangalwedha", "Mohol", "Pandharpur", "Sangola"],
        villages: ["Vairag", "Kurduvadi Rural", "Natepute", "Akluj", "Piliv", "Karkamb", "Barsi Rural", "Mandrup", "Kegaon", "Walsang"]
    },
    "Thane": {
        talukas: ["Thane", "Ambarnath", "Bhiwandi", "Kalyan", "Murbad", "Shahapur", "Ulhasnagar"],
        villages: ["Padgha", "Titwala", "Badlapur Rural", "Khardi", "Asangaon", "Tokawade", "Dhasai", "Kalyan Rural", "Anjur"]
    },
    "Wardha": {
        talukas: ["Wardha", "Arvi", "Ashti", "Deoli", "Hinganghat", "Karanja", "Samudrapur", "Seloo"],
        villages: ["Sevagram", "Pavnar", "Talegaon Shyamji Pant", "Pulgaon Rural", "Girad", "Rohna", "Allipur", "Sindi"]
    },
    "Washim": {
        talukas: ["Washim", "Karanja Lad", "Malegaon", "Mangrulpir", "Manora", "Risod"],
        villages: ["Shirpur Jain", "Kenwad", "Asegaon", "Shelu Bazar", "Medshi", "Pohradevi", "Kupta", "Dhanora"]
    },
    "Yavatmal": {
        talukas: ["Yavatmal", "Arni", "Babhulgaon", "Darwha", "Digras", "Ghatanji", "Kalamb", "Kelapur (Pandharkawada)", "Mahagaon", "Maregaon", "Ner", "Pusad", "Ralegaon", "Umarkhed", "Wani", "Zari-Jamani"],
        villages: ["Gunj", "Fulsawangi", "Mukutban", "Korpana Border", "Jawala", "Patanbori", "Lohara", "Runza", "Wadhona"]
    }
};

/* ==========================================================================
   2. BILINGUAL DICTIONARY & I18N MANAGER
   ========================================================================== */
const I18N_DICTIONARY = {
    en: {
        portalTitle: "Government of Maharashtra",
        portalSubTitle: "Gram Panchayat Samasya Nivaran",
        voiceOfVillageBadge: "📢 Voice of Village",
        portalTagline: "Grievance Redressal & Village Development Portal",
        home: "Home",
        myComplaints: "My Complaints",
        reportProblem: "File Grievance",
        operatorPanel: "Officer Dashboard",
        logout: "Logout",
        login: "Login",
        register: "Register",
        signInWithGoogle: "Continue with Google",
        orDivider: "OR",
        userLoginTitle: "Citizen Login",
        userLoginDesc: "Access your dashboard to file grievances and track real-time resolution progress.",
        operatorLoginTitle: "Government Officer Login",
        operatorLoginDesc: "Gram Sevak / BDO / Operator portal for grievance verification and resolution.",
        dontHaveAccount: "Don't have an account?",
        alreadyHaveAccount: "Already have an account?",
        createCitizenAccount: "Create Citizen Account",
        createOperatorAccount: "Create Officer Account",
        fullName: "Full Name",
        email: "Email Address",
        mobileNumber: "Mobile Number (10 digits)",
        username: "Username",
        password: "Password",
        operatorCode: "Officer Security Code",
        sendOtp: "Send OTP",
        verifyOtp: "Verify OTP",
        resendOtpIn: "Resend in",
        verifiedBadge: "✅ Email Verified",
        locationDetails: "Select Your Jurisdiction",
        locationSubtitle: "Choose your District, Taluka, and Gram Panchayat to proceed.",
        selectDistrict: "Select District",
        selectTaluka: "Select Taluka",
        typeVillage: "Select / Type Gram Panchayat (Village)",
        continueBtn: "Continue",
        reportNewTitle: "File a New Grievance",
        reportNewSubtitle: "Submit village issues directly to the local Gram Panchayat authority.",
        category: "Grievance Category",
        comment: "Detailed Description of Problem",
        locationLandmark: "Specific Location / Landmark in Village",
        uploadPhoto: "Upload Proof Photo (Optional)",
        dragDropPhoto: "Click or Drag & Drop photo here (Max 5MB)",
        submitGrievance: "Submit Grievance",
        totalComplaints: "Total Grievances",
        pendingComplaints: "Pending Review",
        inProgressComplaints: "Under Investigation",
        resolvedComplaints: "Resolved",
        searchPlaceholder: "Search by keyword, location, ID...",
        filterStatus: "All Statuses",
        noComplaintsFound: "No grievances registered yet.",
        actions: "Actions",
        status: "Status",
        date: "Date",
        viewPhoto: "View Photo",
        markComplete: "Mark Resolved",
        markInProgress: "Mark In Progress",
        deleteGrievance: "Delete",
        confirmDelete: "Are you sure you want to delete this grievance? This action cannot be undone.",
        designedBy: "Designed with ❤️ for Maharashtra Village Redressal — IDEA AVENGERS",
        allRightsReserved: "Government of Maharashtra. All rights reserved."
    },
    mr: {
        portalTitle: "महाराष्ट्र शासन",
        portalSubTitle: "ग्रामपंचायत समस्या निवारण पोर्टल",
        voiceOfVillageBadge: "📢 गावचा आवाज (Voice of Village)",
        portalTagline: "ग्राम विकास व नागरिक तक्रार निवारण प्रणाली",
        home: "मुख्यपृष्ठ",
        myComplaints: "माझ्या तक्रारी",
        reportProblem: "तक्रार नोंदवा",
        operatorPanel: "अधिकारी डॅशबोर्ड",
        logout: "लॉगआउट",
        login: "लॉगिन",
        register: "नोंदणी करा",
        signInWithGoogle: "Google द्वारे लॉगिन करा",
        orDivider: "किंवा",
        userLoginTitle: "नागरिक लॉगिन",
        userLoginDesc: "तक्रार दाखल करण्यासाठी आणि निराकरण स्थिती ट्रॅक करण्यासाठी लॉगिन करा.",
        operatorLoginTitle: "शासकीय अधिकारी लॉगिन",
        operatorLoginDesc: "ग्रामसेवक / बीडीओ / ऑपरेटर पोर्टल - तक्रार निवारण व अद्ययावत करण्यासाठी.",
        dontHaveAccount: "खाते नाही का?",
        alreadyHaveAccount: "आधीच खाते आहे का?",
        createCitizenAccount: "नागरिक नोंदणी करा",
        createOperatorAccount: "अधिकारी नोंदणी करा",
        fullName: "पूर्ण नाव",
        email: "ईमेल पत्ता",
        mobileNumber: "मोबाईल नंबर (१० अंकी)",
        username: "वापरकर्ता नाव",
        password: "पासवर्ड",
        operatorCode: "अधिकारी गुप्त कोड",
        sendOtp: "ओटीपी पाठवा",
        verifyOtp: "ओटीपी पडताळा",
        resendOtpIn: "पुन्हा पाठवा",
        verifiedBadge: "✅ ईमेल पडताळणी पूर्ण",
        locationDetails: "आपले कार्यक्षेत्र निवडा",
        locationSubtitle: "पुढे जाण्यासाठी आपला जिल्हा, तालुका आणि ग्रामपंचायत निवडा.",
        selectDistrict: "जिल्हा निवडा",
        selectTaluka: "तालुका निवडा",
        typeVillage: "ग्रामपंचायत (गाव) निवडा / प्रविष्ट करा",
        continueBtn: "पुढे चला",
        reportNewTitle: "नवीन समस्या नोंदवा",
        reportNewSubtitle: "गावातील नागरी समस्या थेट ग्रामपंचायत प्रशासनाकडे दाखल करा.",
        category: "समस्येचा प्रकार",
        comment: "समस्येचे सविस्तर वर्णन",
        locationLandmark: "गावातील नेमके ठिकाण / खूण",
        uploadPhoto: "समस्येचा फोटो जोडा (पर्यायी)",
        dragDropPhoto: "येथे फोटो निवडा किंवा ओढून टाका (कमाल ५MB)",
        submitGrievance: "तक्रार दाखल करा",
        totalComplaints: "एकूण तक्रारी",
        pendingComplaints: "प्रलंबित",
        inProgressComplaints: "प्रक्रियेत",
        resolvedComplaints: "निवारण झाले",
        searchPlaceholder: "कीवर्ड, ठिकाण, आयडीने शोधा...",
        filterStatus: "सर्व स्थिती",
        noComplaintsFound: "कोणतीही तक्रार आढळली नाही.",
        actions: "कृती",
        status: "स्थिती",
        date: "दिनांक",
        viewPhoto: "फोटो पहा",
        markComplete: "निवारण पूर्ण",
        markInProgress: "प्रक्रियेत ठेवा",
        deleteGrievance: "हटवा",
        confirmDelete: "तुम्हाला ही तक्रार नक्की हटवायची आहे का? ही क्रिया पूर्ववत करता येणार नाही.",
        designedBy: "महाराष्ट्र ग्राम विकासासाठी समर्पित — IDEA AVENGERS",
        allRightsReserved: "महाराष्ट्र शासन. सर्व हक्क राखीव."
    }
};

const LanguageManager = {
    getLanguage() {
        return localStorage.getItem('portal_lang') || 'en';
    },

    setLanguage(lang) {
        if (!I18N_DICTIONARY[lang]) return;
        localStorage.setItem('portal_lang', lang);
        document.documentElement.lang = lang;
        this.applyLanguage();
    },

    applyLanguage() {
        const lang = this.getLanguage();
        const dict = I18N_DICTIONARY[lang] || I18N_DICTIONARY.en;

        // Apply data-i18n attributes
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (dict[key]) {
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                    el.placeholder = dict[key];
                } else {
                    el.textContent = dict[key];
                }
            }
        });

        // Apply fallback data-en / data-mr
        document.querySelectorAll('[data-en][data-mr]').forEach(el => {
            const text = el.getAttribute(`data-${lang}`);
            if (text) el.textContent = text;
        });

        // Update active class on language toggle buttons
        document.querySelectorAll('.lang-btn').forEach(btn => {
            if (btn.dataset.lang === lang) {
                btn.classList.add('active');
                btn.setAttribute('aria-pressed', 'true');
            } else {
                btn.classList.remove('active');
                btn.setAttribute('aria-pressed', 'false');
            }
        });
    }
};

/* ==========================================================================
   3. AUTHENTICATION & SESSION HELPER
   ========================================================================== */
const Auth = {
    getUser() {
        try {
            return JSON.parse(sessionStorage.getItem('user')) || null;
        } catch (e) {
            return null;
        }
    },

    setUser(user) {
        sessionStorage.setItem('user', JSON.stringify(user));
    },

    getOperator() {
        try {
            return JSON.parse(sessionStorage.getItem('operator')) || null;
        } catch (e) {
            return null;
        }
    },

    setOperator(operator) {
        sessionStorage.setItem('operator', JSON.stringify(operator));
        sessionStorage.setItem('isOperator', 'true');
    },

    isLoggedIn() {
        return !!(this.getUser() || this.getOperator());
    },

    isOperator() {
        return sessionStorage.getItem('isOperator') === 'true' || !!this.getOperator();
    },

    logout() {
        sessionStorage.clear();
        window.location.href = 'index.html';
    },

    requireCitizenAuth() {
        const user = this.getUser();
        if (!user || !user.username) {
            Toast.show('Please log in as a citizen first.', 'warning');
            setTimeout(() => {
                window.location.href = 'userlogin.html';
            }, 1000);
            return false;
        }
        return true;
    },

    requireOperatorAuth() {
        const op = this.getOperator() || sessionStorage.getItem('operatorUsername');
        if (!op) {
            Toast.show('Please log in as an authorized official.', 'warning');
            setTimeout(() => {
                window.location.href = 'operatorlogin.html';
            }, 1000);
            return false;
        }
        return true;
    }
};

/* ==========================================================================
   4. TOAST NOTIFICATION SYSTEM
   ========================================================================== */
const Toast = {
    container: null,

    init() {
        if (this.container) return;
        this.container = document.createElement('div');
        this.container.className = 'toast-container';
        document.body.appendChild(this.container);
    },

    show(message, type = 'info', duration = 3800) {
        this.init();
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let icon = 'ℹ️';
        if (type === 'success') icon = '✅';
        if (type === 'error') icon = '❌';
        if (type === 'warning') icon = '⚠️';

        toast.innerHTML = `
            <span class="toast-icon">${icon}</span>
            <span class="toast-message">${message}</span>
            <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
        `;

        this.container.appendChild(toast);

        // Auto remove
        setTimeout(() => {
            toast.classList.add('toast-fade-out');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
};

/* ==========================================================================
   5. MODAL DIALOG CONTROLLER (Image Zoom & Confirmation)
   ========================================================================== */
const Modal = {
    openImage(src, caption = 'Grievance Photo Evidence') {
        let modal = document.getElementById('globalImageModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'globalImageModal';
            modal.className = 'gov-modal-overlay';
            modal.innerHTML = `
                <div class="gov-modal-box">
                    <div class="gov-modal-header">
                        <h4 id="modalImageCaption">${caption}</h4>
                        <button class="gov-modal-close" onclick="Modal.closeImage()">&times;</button>
                    </div>
                    <div class="gov-modal-body text-center">
                        <img id="modalImageElem" src="" alt="Proof photo" class="gov-modal-img">
                    </div>
                </div>
            `;
            modal.addEventListener('click', (e) => {
                if (e.target === modal) Modal.closeImage();
            });
            document.body.appendChild(modal);
        }

        document.getElementById('modalImageCaption').textContent = caption;
        document.getElementById('modalImageElem').src = src;
        modal.classList.add('active');
    },

    closeImage() {
        const modal = document.getElementById('globalImageModal');
        if (modal) modal.classList.remove('active');
    },

    confirm(message, onConfirm) {
        const lang = LanguageManager.getLanguage();
        const confirmTitle = lang === 'mr' ? 'पुष्टी करा' : 'Please Confirm';
        const okText = lang === 'mr' ? 'होय, सुरू ठेवा' : 'Yes, Proceed';
        const cancelText = lang === 'mr' ? 'रद्द करा' : 'Cancel';

        let modal = document.getElementById('globalConfirmModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'globalConfirmModal';
            modal.className = 'gov-modal-overlay';
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div class="gov-modal-box gov-modal-box-sm">
                <div class="gov-modal-header">
                    <h4>${confirmTitle}</h4>
                    <button class="gov-modal-close" onclick="document.getElementById('globalConfirmModal').classList.remove('active')">&times;</button>
                </div>
                <div class="gov-modal-body">
                    <p style="margin:0 0 16px; font-size:1rem; color:#334155;">${message}</p>
                    <div style="display:flex; justify-content:flex-end; gap:10px;">
                        <button type="button" class="btn btn-outline" id="confirmCancelBtn">${cancelText}</button>
                        <button type="button" class="btn btn-danger" id="confirmOkBtn">${okText}</button>
                    </div>
                </div>
            </div>
        `;

        modal.classList.add('active');

        document.getElementById('confirmCancelBtn').onclick = () => {
            modal.classList.remove('active');
        };

        document.getElementById('confirmOkBtn').onclick = () => {
            modal.classList.remove('active');
            if (typeof onConfirm === 'function') onConfirm();
        };
    }
};

/* ==========================================================================
   6. REALTIME KPI STATS ENGINE
   ========================================================================== */
const LiveStats = {
    _intervals: new Map(),
    _lastValues: new Map(),

    animateValue(id, start, end, duration = 600) {
        const obj = document.getElementById(id);
        if (!obj) return;
        if (start === end) {
            obj.textContent = end;
            return;
        }

        const range = end - start;
        let current = start;
        const increment = end > start ? 1 : -1;
        const stepTime = Math.max(20, Math.abs(Math.floor(duration / (Math.abs(range) || 1))));
        const timer = setInterval(() => {
            current += increment;
            obj.textContent = current;
            if (current === end) {
                clearInterval(timer);
            }
        }, stepTime);

        // Pulse the parent stat-card if value changed
        const card = obj.closest('.stat-card');
        if (card) {
            card.classList.remove('updated');
            void card.offsetWidth; // trigger reflow
            card.classList.add('updated');
        }
    },

    updateElement(id, newVal) {
        const currentVal = this._lastValues.has(id) ? this._lastValues.get(id) : parseInt(document.getElementById(id)?.textContent || '0', 10);
        if (currentVal !== newVal) {
            this.animateValue(id, currentVal, newVal);
            this._lastValues.set(id, newVal);
        } else {
            const el = document.getElementById(id);
            if (el) el.textContent = newVal;
        }
    },

    async fetchAndApply(elemMap, params = {}) {
        try {
            const query = new URLSearchParams(params).toString();
            const res = await fetch(`${API_BASE}/api/stats${query ? '?' + query : ''}`);
            const data = await res.json();
            if (data.success && data.stats) {
                const { total, resolved, progress, pending } = data.stats;
                if (elemMap.total) this.updateElement(elemMap.total, total);
                if (elemMap.resolved) this.updateElement(elemMap.resolved, resolved);
                if (elemMap.progress) this.updateElement(elemMap.progress, progress);
                if (elemMap.pending) this.updateElement(elemMap.pending, pending);
            }
        } catch (e) {
            // silent network resilience
        }
    },

    startPolling(name, elemMap, params = {}, intervalMs = 3000) {
        this.stopPolling(name);
        this.fetchAndApply(elemMap, params);
        const timer = setInterval(() => {
            this.fetchAndApply(elemMap, params);
        }, intervalMs);
        this._intervals.set(name, timer);
    },

    stopPolling(name) {
        if (this._intervals.has(name)) {
            clearInterval(this._intervals.get(name));
            this._intervals.delete(name);
        }
    }
};

/* ==========================================================================
   7. GLOBAL UI SYSTEM INITIALIZER (Navbar, Footer & Language Switch)
   ========================================================================== */
function initGlobalUI() {
    // 1. Language Toggle listener
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            LanguageManager.setLanguage(btn.dataset.lang);
        });
    });

    // 2. Apply initial i18n
    LanguageManager.applyLanguage();

    // 3. Populate User details in navbar if present
    const user = Auth.getUser();
    const op = Auth.getOperator();
    const userDisplay = document.getElementById('navUserDisplay');
    if (userDisplay) {
        if (user && user.username) {
            userDisplay.innerHTML = `<span class="user-pill citizen-pill">👤 ${user.fullname || user.username} (Citizen)</span>`;
        } else if (op && op.username) {
            userDisplay.innerHTML = `<span class="user-pill operator-pill">🛡️ ${op.operatorname || op.username} (Officer)</span>`;
        } else {
            userDisplay.innerHTML = '';
        }
    }
}

// Auto-run when DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGlobalUI);
} else {
    initGlobalUI();
}

// Export globals to window
window.API_BASE = API_BASE;
window.MAHARASHTRA_LOCATIONS = MAHARASHTRA_LOCATIONS;
window.I18N_DICTIONARY = I18N_DICTIONARY;
window.LanguageManager = LanguageManager;
window.Auth = Auth;
window.Toast = Toast;
window.Modal = Modal;
window.LiveStats = LiveStats;
