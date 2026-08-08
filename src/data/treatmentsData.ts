export interface TreatmentItem {
  id: string;
  en: string;
  hi: string;
  category: string;
  description: string;
  image?: string | null;
  remedies?: string[];
}

export const treatmentsData: TreatmentItem[] = [
  {
    id: "kidney-stones",
    en: "Kidney Stones",
    hi: "गुर्दे की पथरी",
    category: "Vital",
    description: "Kidney stones cause intense pain and urinary issues. Homeopathic remedies such as Berberis Vulgaris, Cantharis, and Lycopodium help dissolve stones, relieve pain, and prevent recurrence. At Dr. Trivedi’s Homeopathy Clinic, we provide personalized treatment plans that improve kidney function, reduce inflammation, and enhance overall urinary health. Our approach avoids invasive procedures and supports long-term kidney wellness.",
    image: "/assets/kidney.jpeg",
    remedies: ["Berberis Vulgaris", "Cantharis", "Lycopodium"]
  },
  {
    id: "arthritis",
    en: "Arthritis",
    hi: "गठिया",
    category: "Pain",
    description: "Arthritis causes joint stiffness, swelling, and reduced mobility. Homeopathy provides long-term relief without steroids or painkillers. Remedies like Rhus Tox, Bryonia, and Arnica help reduce inflammation and joint pain naturally. At Dr. Trivedi’s Homeopathy Clinic, we assess the type of arthritis—rheumatoid, osteoarthritis, or gout—and offer tailored treatment that improves mobility and quality of life. Our holistic approach focuses on both physical and emotional wellness.",
    image: "/assets/Arthritis.jpeg",
    remedies: ["Rhus Tox", "Bryonia", "Arnica"]
  },
  {
    id: "asthma",
    en: "Asthma",
    hi: "दमा",
    category: "Respiratory",
    description: "Asthma can significantly impact daily life, but homeopathy provides long-term relief by treating the root cause rather than just managing symptoms. At Dr. Trivedi’s Homeopathy Clinic, we develop personalized treatment plans that address each patient’s triggers—whether it’s allergies, weather changes, or stress. Homeopathic remedies help reduce the frequency and intensity of asthma attacks, improve lung function, and strengthen the immune system. This natural approach is safe for children and adults, and helps reduce dependency on inhalers or steroids over time.",
    image: "/assets/Asthma.jpeg"
  },
  {
    id: "acne",
    en: "Acne (Pimples)",
    hi: "मुँहासे (पिंपल्स)",
    category: "Skin",
    description: "Acne can be more than a skin issue—it affects confidence and emotional health. Homeopathy provides a holistic and side-effect-free solution by treating the underlying causes such as hormonal imbalances, digestive issues, or stress. At Dr. Trivedi’s Homeopathy Clinic, we use personalized remedies to control breakouts, reduce inflammation, and heal scars. Unlike chemical-based treatments, homeopathy restores your skin’s health from the inside out. With regular treatment, many patients notice clearer skin, reduced oiliness, and fewer flare-ups. It’s a natural, safe, and effective way to treat acne without damaging the skin.",
    image: "/assets/Acne.jpeg"
  },
  {
    id: "allergies",
    en: "Allergies",
    hi: "एलर्जी",
    category: "Immune",
    description: "Allergies can affect the skin, respiratory system, or digestive tract, and are often caused by environmental allergens like pollen, dust, food, or chemicals. Dr. Trivedi’s Homeopathy Clinic provides personalized remedies that build internal immunity and desensitize the body to allergens over time. Whether it's allergic rhinitis, skin rashes, urticaria, or food intolerance, homeopathy targets the root cause and not just the symptoms. Our safe and side-effect-free treatment helps patients achieve long-term freedom from allergic reactions and improves their resistance to recurring allergy episodes.",
    image: "/assets/Allergies.jpeg"
  },
  {
    id: "back-pain",
    en: "Back Pain",
    hi: "पीठ दर्द",
    category: "Pain",
    description: "Back pain, whether due to injury, posture, or degenerative conditions, can severely affect mobility and daily function. Homeopathy targets the root cause—be it muscular strain, nerve compression, or spine-related disorders—offering lasting relief without side effects. Dr. Trivedi’s Homeopathy Clinic uses safe, non-addictive remedies tailored to each patient’s pain type and medical history. Our holistic treatment reduces inflammation, improves mobility, and prevents relapse, providing a sustainable, natural approach to pain management.",
    image: "/assets/Back Pain.jpeg"
  },
  {
    id: "bone-disorders",
    en: "Bone-related Disorders",
    hi: "हड्डियों से संबंधित विकार",
    category: "Orthopedic",
    description: "Bone and joint issues like arthritis, osteoporosis, and back pain can severely limit mobility and quality of life. At Dr. Trivedi’s Homeopathy Clinic, we address bone-related disorders holistically. Homeopathic remedies promote better calcium absorption, reduce inflammation, and strengthen bones and connective tissues. Whether it's joint pain due to osteoarthritis or stiffness from spondylosis, our treatments provide long-term relief without the need for painkillers or steroids. Homeopathy helps manage symptoms while also slowing down the progression of degenerative bone diseases naturally. Patients experience improved flexibility, reduced pain, and enhanced bone strength through our customized approach.",
    image: "/assets/Bone-related Disorders.jpeg"
  },
  {
    id: "cervical",
    en: "Cervical Spondylitis",
    hi: "सर्वाइकल स्पॉन्डिलाइटिस",
    category: "Orthopedic",
    description: "Cervical spondylitis, a common degenerative condition of the neck spine, leads to neck pain, stiffness, and radiating discomfort in the shoulders and arms. At Dr. Trivedi’s Homeopathy Clinic, we approach cervical spondylitis holistically. Homeopathy targets the root cause by enhancing the body’s natural healing capacity, reducing inflammation, and improving mobility without the side effects of painkillers or steroids. Each patient receives a personalized treatment plan based on their symptoms, lifestyle, and medical history. Over time, homeopathic remedies can help in easing chronic pain, improving posture, and reducing recurrence. Our approach is gentle, effective, and long-lasting.",
    image: "/assets/Cervical Spondylitis.jpeg"
  },
  {
    id: "autism",
    en: "Autism",
    hi: "ऑटिज़्म",
    category: "Mental",
    description: "At Dr. Trivedi’s Homeopathy Clinic in Raipur, we provide safe, gentle, and effective homeopathic treatment for autism spectrum disorder (ASD). Our personalized approach targets the root causes of behavioral, sensory, and communication challenges, helping children achieve better emotional balance and improved social interactions. Homeopathy enhances brain development without any side effects, making it a natural alternative to conventional therapies. Dr. Trivedi has helped many children with autism through his compassionate and result-oriented care. If you're looking for holistic autism treatment in Raipur, Dr. Trivedi’s Homeopathy Clinic offers trusted solutions that support long-term developmental improvements in children.",
    image: "/assets/Autism.jpeg"
  },
  {
    id: "hip-pain",
    en: "Hip Pain",
    hi: "कूल्हे का दर्द",
    category: "Pain",
    description: "Hip pain can be caused by arthritis, bursitis, muscle strain, or age-related degeneration. At Dr. Trivedi’s Homeopathy Clinic, we provide safe and effective homeopathic remedies that help reduce pain, inflammation, and stiffness. Unlike conventional painkillers that offer temporary relief, homeopathy promotes natural healing of the affected tissues and improves joint mobility. Our treatment plan also supports bone health, strengthens muscles, and prevents further deterioration. Whether it’s an acute injury or chronic condition, our non-invasive and holistic care offers long-term improvement without side effects.",
    image: "/assets/Hip Pain.jpeg"
  },
  {
    id: "eye-disorders",
    en: "Eye Disorders",
    hi: "आंखों के विकार",
    category: "Specialty",
    description: "From conjunctivitis to dry eyes, allergies, and blurred vision, homeopathy offers gentle, natural remedies for various eye problems. It works by stimulating the body’s healing process to address underlying causes such as infections, strain, or systemic health issues like diabetes or hypertension. At Dr. Trivedi’s Homeopathy Clinic, we provide customized solutions based on your individual symptoms and medical history. Our remedies are non-invasive and suitable for all age groups, helping to maintain healthy eyesight without any side effects.",
    image: "/assets/Eye Disorders.jpeg"
  },
  {
    id: "mental-health",
    en: "Mental Health Issues",
    hi: "मानसिक स्वास्थ्य समस्याएँ",
    category: "Mental",
    description: "Mental health is just as vital as physical health. Homeopathy at Dr. Trivedi’s Clinic offers safe and effective treatment for anxiety, depression, stress, OCD, phobias, and sleep disorders. Our holistic approach goes beyond suppressing symptoms—we aim to balance the emotional and psychological well-being of the patient. Each prescription is personalized, considering the patient’s thoughts, behavior, lifestyle, and history. Homeopathy gently restores mental calmness, improves mood, and enhances your ability to cope with life’s challenges. Without dependency or side effects, homeopathy is a powerful tool for those seeking mental peace and emotional resilience naturally.",
    image: "/assets/Mental Health Issues.jpeg"
  },
  {
    id: "migraine",
    en: "Migraine",
    hi: "माइग्रेन",
    category: "Neurological",
    description: "Migraine is a recurring, pulsating headache often accompanied by nausea, vomiting, and sensitivity to light or sound. At Dr. Trivedi’s Homeopathy Clinic, we treat migraines not just by suppressing pain, but by identifying and addressing the underlying triggers such as stress, hormonal imbalance, gastric disturbances, or lifestyle habits. Homeopathic medicines are selected based on the individual’s unique symptoms and constitution, offering long-lasting relief without any side effects. Our holistic approach helps reduce the frequency, duration, and intensity of migraine attacks while improving overall nervous system health. Homeopathy is especially beneficial for those looking for natural, non-addictive alternatives to painkillers.",
    image: "/assets/Migraine.jpeg"
  },
  {
    id: "piles",
    en: "Piles (Hemorrhoids)",
    hi: "बवासीर (पाइल्स)",
    category: "Chronic",
    description: "Piles cause pain, itching, bleeding, and discomfort during bowel movements. At Dr. Trivedi’s Homeopathy Clinic, we offer effective non-surgical treatment for both internal and external hemorrhoids. Homeopathic medicines help shrink the swollen veins, ease bowel movements, relieve itching, and prevent recurrence. We also address associated problems like constipation and indigestion to provide holistic healing. Our gentle remedies eliminate the root cause and provide long-lasting relief without the need for surgery, making them ideal for patients seeking natural care.",
    image: "/assets/Piles.jpeg"
  },
  {
    id: "prostate",
    en: "Prostate Issues",
    hi: "प्रोस्टेट समस्याएँ",
    category: "Vital",
    description: "Prostate enlargement, also known as BPH (Benign Prostatic Hyperplasia), is common in aging men and can lead to urinary discomfort, frequent urination, and incomplete bladder emptying. At Dr. Trivedi’s Homeopathy Clinic, we provide safe and effective remedies to manage prostate issues without surgery. Homeopathy works by reducing glandular inflammation, improving urinary flow, and restoring normal prostate function. Our remedies are tailored to your unique symptoms and medical history, ensuring targeted relief. Unlike conventional medicines, homeopathy offers long-term management without side effects or dependency. Many patients report improved urinary health, better sleep, and enhanced well-being after consistent homeopathic treatment.",
    image: "/assets/Prostate Issues.jpeg"
  },
  {
    id: "lower-back-pain",
    en: "Lower Back Pain",
    hi: "कमर दर्द",
    category: "Pain",
    description: "Lower back pain can arise from muscle strain, spinal issues, herniated discs, or sedentary lifestyles. Dr. Trivedi’s Homeopathy Clinic offers individualized homeopathic solutions that address pain, stiffness, and inflammation at the source. Our holistic approach supports natural healing of the musculoskeletal system and restores spine health. Homeopathic medicines also help improve posture, reduce stress-related pain, and strengthen the core without any side effects. Whether it’s acute or chronic backache, our treatment provides long-lasting relief and prevents recurrence by addressing the root cause—not just suppressing the symptoms.",
    image: "/assets/Lower Back Pain.jpeg"
  },
  {
    id: "sciatica",
    en: "Sciatica",
    hi: "साइटिका",
    category: "Pain",
    description: "Sciatica is characterized by shooting pain from the lower back down the legs. Homeopathy helps by targeting nerve inflammation and root causes. Remedies like Colocynthis, Mag Phos, and Gnaphalium offer effective pain relief and reduce recurrence. At Dr. Trivedi’s Homeopathy Clinic, we focus on non-invasive pain management and restoring nerve function, offering patients natural and lasting solutions.",
    image: "/assets/Sciatica.jpeg",
    remedies: ["Colocynthis", "Mag Phos", "Gnaphalium"]
  },
  {
    id: "slip-disc",
    en: "Slip Disc",
    hi: "स्लिप डिस्क",
    category: "Orthopedic",
    description: "Slip disc, or herniated disc, is a painful spinal condition that can cause nerve compression, radiating pain, and restricted movement. Homeopathy provides an effective, non-surgical alternative by addressing the inflammation and improving the body's healing response. At Dr. Trivedi’s Homeopathy Clinic, we assess each case thoroughly to customize treatment that targets the disc issue and associated muscular or nerve problems. Homeopathy not only eases pain but also helps restore mobility and prevent further degeneration.",
    image: "/assets/Slip Disc.jpeg"
  },
  {
    id: "joint-muscular-pain",
    en: "Joint and Muscular Pain",
    hi: "जोड़ और मांसपेशियों का दर्द",
    category: "Pain",
    description: "At Dr. Trivedi's Homeopathy Clinic, we provide effective homeopathic treatment for joint and muscular pain caused by arthritis, sprains, overuse, or chronic conditions. Homeopathy addresses the root cause of pain by enhancing the body's natural healing response. Remedies like Rhus Toxicodendron, Arnica Montana, and Bryonia are commonly prescribed based on the individual’s symptoms, severity, and triggers. These natural remedies reduce inflammation, stiffness, and pain without any side effects. Whether it’s knee pain, shoulder discomfort, or muscle cramps, our personalized approach helps patients achieve lasting relief and improved mobility. Discover safe, non-invasive treatment for joint and muscle health.",
    image: "/assets/Joint and Muscular Pain.jpeg",
    remedies: ["Rhus Toxicodendron", "Arnica Montana", "Bryonia"]
  },
  {
    id: "paralysis",
    en: "Paralysis",
    hi: "लकवा",
    category: "Neurological",
    description: "Paralysis results from nerve damage or brain injury, affecting the motor functions of specific body parts. Homeopathy offers supportive treatment that may stimulate nerve regeneration and restore muscle tone. At Dr. Trivedi’s Clinic, we combine individualized remedies and long-term care to improve blood circulation, minimize muscle stiffness, and gradually enhance mobility. While complete reversal depends on severity and cause, many patients report noticeable improvement with consistent treatment. Homeopathy’s non-invasive approach brings hope and comfort to paralysis patients without aggressive interventions.",
    image: "/assets/Paralysis.jpeg"
  },
  {
    id: "thyroid",
    en: "Thyroid Disorders",
    hi: "थायरॉयड विकार",
    category: "Vital",
    description: "Whether it’s hypothyroidism or hyperthyroidism, thyroid imbalance can lead to fatigue, weight changes, hair loss, and mood disturbances. At Dr. Trivedi’s Homeopathy Clinic, we treat thyroid conditions by restoring the hormonal balance naturally. Homeopathic remedies stimulate the thyroid gland, regulate metabolism, and address associated symptoms such as constipation, depression, and irregular periods. Our customized treatments are non-hormonal and free from side effects. Homeopathy is particularly effective for early-stage thyroid issues and can help reduce dependency on lifelong medications when started early. With regular monitoring and personalized care, patients often report improved energy levels, mood, and weight control.",
    image: "/assets/Thyroid Disorders.jpeg"
  },
  {
    id: "urinary-disorders",
    en: "Urinary Disorders",
    hi: "मूत्र संबंधी विकार",
    category: "Vital",
    description: "Homeopathy is highly effective in managing urinary disorders such as recurrent urinary tract infections (UTIs), burning sensation, bed-wetting, and urinary incontinence. Unlike antibiotics that offer short-term relief, homeopathy strengthens the body’s immune system and addresses the root causes like bladder irritation, kidney function imbalance, or emotional triggers. At Dr. Trivedi’s Homeopathy Clinic, each patient receives a custom treatment plan that not only relieves symptoms but also prevents recurrence. Our remedies are gentle, non-invasive, and free from harmful side effects.",
    image: "/assets/Urinary Disorders.jpeg"
  },
  {
    id: "heart-diseases",
    en: "Heart Diseases",
    hi: "हृदय रोग",
    category: "Vital",
    description: "Heart conditions such as hypertension, palpitations, angina, and stress-induced cardiac issues can benefit from supportive homeopathic care. At Dr. Trivedi’s Homeopathy Clinic, our remedies work to regulate blood pressure, improve heart rhythm, and reduce anxiety and emotional stress—key contributors to heart ailments. While not a replacement for emergency care or surgery, homeopathy plays a vital role in long-term management and prevention. By strengthening the body’s core vitality, we aim to support overall heart health in a natural, side-effect-free manner.",
    image: "/assets/Heart Diseases.jpeg"
  },
  {
    id: "hair-fall",
    en: "Hair Fall",
    hi: "बाल झड़ना",
    category: "Skin",
    description: "Hair loss, thinning, dandruff, and scalp issues can be distressing and often indicate deeper health imbalances. At Dr. Trivedi’s Homeopathy Clinic, we treat hair fall from its root causes—whether due to stress, hormonal imbalance, thyroid issues, nutritional deficiencies, or genetics. Our personalized homeopathic remedies work to strengthen hair follicles, regulate hormonal levels, and improve scalp health. Homeopathy also supports hair regrowth and controls hair thinning without harmful chemicals or side effects. With consistent treatment, patients experience reduced hair fall, better hair texture, and renewed confidence. It’s a safe and natural choice for long-term hair care and restoration.",
    image: "/assets/Hair Fall.jpeg"
  },
  {
    id: "herpes",
    en: "Herpes",
    hi: "हरपीज",
    category: "Skin",
    description: "Herpes, whether oral or genital, can be emotionally and physically distressing. Homeopathy provides a natural, long-term solution by boosting immunity and reducing the frequency and intensity of outbreaks. At Dr. Trivedi’s Homeopathy Clinic, we understand the sensitivity of this condition and offer compassionate, confidential care. Our personalized remedies aim to heal lesions quickly, relieve discomfort, and minimize recurrence. Over time, homeopathy helps the body build resistance to the herpes virus, offering sustained relief and improved quality of life.",
    image: "/assets/Herpes.jpeg"
  },
  {
    id: "infertility",
    en: "Infertility",
    hi: "बांझपन",
    category: "Specialty",
    description: "Infertility can be emotionally challenging and physically draining for couples. At Dr. Trivedi’s Homeopathy Clinic, we offer natural and holistic homeopathic solutions to support fertility in both men and women. Homeopathy aims to correct hormonal imbalances, regulate menstrual cycles, improve sperm quality, and strengthen reproductive health—all without side effects. Our individualized treatment addresses underlying issues such as PCOS, endometriosis, stress, and thyroid imbalances that often contribute to infertility. Homeopathic medicines stimulate the body’s natural healing, enhancing the chances of conception safely and effectively. For those looking for a gentle, non-invasive, and long-term approach to fertility, homeopathy offers real hope and proven results.",
    image: "/assets/Infertility.jpeg"
  },
  {
    id: "dental-problems",
    en: "Dental Problems",
    hi: "दांतों की समस्याएँ",
    category: "Specialty",
    description: "Toothaches, bleeding gums, sensitivity, bad breath, and recurrent infections are common dental problems that can be managed effectively through homeopathy. At Dr. Trivedi’s Homeopathy Clinic, we use gentle, non-invasive remedies that promote oral health and reduce inflammation and infection naturally. Homeopathy helps in healing dental abscesses, preventing tooth decay, and reducing gum sensitivity. It is especially beneficial for patients who fear dental procedures or cannot undergo surgery. By addressing the root cause—be it poor immunity, digestive issues, or hormonal imbalances—homeopathy offers a long-term solution to recurring dental concerns. It supports overall oral hygiene in a safe and natural way.",
    image: "/assets/Dental Problems.jpeg"
  },
  {
    id: "liver-problems",
    en: "Liver Problems",
    hi: "लीवर की समस्याएँ",
    category: "Vital",
    description: "Liver disorders such as fatty liver, hepatitis, and cirrhosis can silently damage your health, affecting digestion, energy levels, and immunity. At Dr. Trivedi’s Homeopathy Clinic, we provide safe and natural homeopathic treatment that focuses on restoring liver function and detoxifying the body. Homeopathy works by gently stimulating the liver to function optimally, reducing inflammation, and improving bile flow. Our remedies are customized based on your symptoms, lifestyle, and medical history, offering holistic support without side effects. Whether you're struggling with a sluggish liver, alcohol-induced damage, or chronic liver conditions, our approach helps regenerate liver cells and improve overall metabolism. Early intervention with homeopathy can prevent complications and support long-term liver health in a natural, non-invasive way.",
    image: "/assets/Liver Problems.jpeg"
  },
  {
    id: "diarrhea",
    en: "Diarrhea and Dysentery",
    hi: "दस्त और पेचिश",
    category: "Digestive",
    description: "Frequent loose stools, abdominal cramps, and dehydration are common symptoms of diarrhea and dysentery. Instead of merely controlling the symptoms, Dr. Trivedi’s Homeopathy Clinic uses remedies that address the underlying infection, digestive weakness, or immunity issues. Homeopathy works naturally to restore gut balance, control frequent motions, and strengthen the digestive tract. It's especially effective for children and adults who suffer from recurrent or chronic gastrointestinal issues. Our individualized approach helps prevent future episodes and promotes healthy digestion without disturbing gut flora.",
    image: "/assets/Diarrhea and Dysentery.jpeg"
  },
  {
    id: "leucorrhoea",
    en: "Leucorrhoea",
    hi: "श्वेत प्रदर",
    category: "Specialty",
    description: "Leucorrhoea, or excessive vaginal discharge, can be uncomfortable and distressing. At Dr. Trivedi’s Homeopathy Clinic, we offer gentle, side-effect-free treatment to address both the symptoms and root causes. Homeopathy helps control infection, reduce inflammation, and regulate hormonal imbalances that often trigger leucorrhoea. Common causes like poor hygiene, PCOD, anemia, or emotional stress are considered while prescribing remedies. Our individualized treatment plan promotes long-term relief by boosting immunity and improving reproductive health. Homeopathy also helps in managing associated symptoms like backache, fatigue, and itching, offering holistic care and restoring your confidence and comfort.",
    image: "/assets/Leucorrhoea.jpeg"
  },
  {
    id: "sexual-health",
    en: "Sexual Health Problems",
    hi: "यौन स्वास्थ्य समस्याएँ",
    category: "Specialty",
    description: "Homeopathy addresses a wide range of male and female sexual health issues, including low libido, premature ejaculation, erectile dysfunction, and hormonal imbalances. Rather than offering temporary relief, it treats the root emotional and physiological causes such as stress, anxiety, or glandular disorders. At Dr. Trivedi’s Homeopathy Clinic, we provide discreet, personalized care in a comfortable environment. Homeopathic remedies help restore confidence, improve vitality, and support reproductive health without any side effects. With over 9 years of expertise, Dr. Uttkarsh Trivedi has helped numerous patients regain a healthy sexual life naturally.",
    image: "/assets/Sexual Health Problems.jpeg"
  },
  {
    id: "osteoarthritis",
    en: "Osteoarthritis",
    hi: "ऑस्टियोआर्थराइटिस",
    category: "Orthopedic",
    description: "Osteoarthritis is a degenerative joint disease that causes pain, stiffness, and reduced mobility. Dr. Trivedi’s Homeopathy Clinic offers natural and lasting relief through customized homeopathic remedies that reduce joint inflammation, nourish cartilage, and improve joint flexibility. Homeopathy not only eases pain but also slows the degeneration of joints over time. Our treatment is particularly beneficial for knees, hips, and spine-related osteoarthritis. Since homeopathy works holistically, it also addresses associated issues like obesity, metabolic imbalance, and calcium deficiency. Patients benefit from improved mobility, better pain tolerance, and enhanced quality of life—without the risks of steroids or joint replacement.",
    image: "/assets/Osteoarthritis.jpeg"
  },
  {
    id: "sinusitis",
    en: "Sinusitis",
    hi: "साइनसाइटिस",
    category: "Respiratory",
    description: "Sinusitis is the inflammation of the sinuses, often leading to headaches, facial pressure, nasal congestion, and thick mucus discharge. At Dr. Trivedi’s Homeopathy Clinic, we focus on treating the root cause of sinus infections—whether they are acute, chronic, or recurring. Homeopathic remedies help reduce inflammation of the sinus lining, clear the nasal passage, and improve immunity to prevent future infections. Our treatment is personalized based on the patient’s symptoms and triggers, such as allergies, weather changes, or respiratory issues. Unlike conventional treatments, homeopathy offers lasting relief without antibiotics or steroids, making it a safe option for children and adults alike.",
    image: "/assets/Sinusitis.jpeg"
  },
  {
    id: "anemia",
    en: "Anemia (Blood Deficiency)",
    hi: "एनीमिया (रक्त की कमी)",
    category: "Vital",
    description: "Anemia, marked by fatigue, weakness, and pale skin, can result from iron or vitamin deficiencies. Our homeopathic approach stimulates natural blood formation and absorption. Remedies such as Ferrum Phos, Cinchona, and Calcarea Phos are chosen based on the individual’s symptoms and cause of anemia. At Dr. Trivedi’s Homeopathy Clinic, we support hemoglobin improvement, correct nutrient deficiencies, and boost energy levels naturally. Homeopathy works effectively alongside a balanced diet to manage anemia holistically and safely for all age groups.",
    image: "/assets/Anemia.jpeg",
    remedies: ["Ferrum Phos", "Cinchona", "Calcarea Phos"]
  },
  {
    id: "ent",
    en: "Ear, Nose & Throat Disorders (ENT)",
    hi: "कान, नाक और गले के विकार (ईएनटी)",
    category: "Specialty",
    description: "Chronic ENT issues like sinusitis, ear infections, tonsillitis, allergic rhinitis, and sore throat are often recurring and resistant to conventional treatment. Homeopathy provides long-term relief by enhancing immune response and targeting the underlying imbalance causing ENT symptoms. Dr. Trivedi’s Homeopathy Clinic treats each patient based on their unique symptom pattern—resulting in reduced frequency, intensity, and recurrence. With no dependency on antibiotics or steroids, our homeopathic treatment is safe for all age groups and ideal for managing both acute and chronic ENT disorders.",
    image: "/assets/Ear, Nose & Throat Disorders (ENT).jpeg"
  },
  {
    id: "gynecology",
    en: "Gynecological Disorders (Women’s Health Issues)",
    hi: "स्त्री रोग (महिलाओं की स्वास्थ्य समस्याएँ)",
    category: "Specialty",
    description: "Homeopathy offers safe, non-hormonal treatment for gynecological problems like irregular periods, PCOD, fibroids, leucorrhoea, and menopause-related symptoms. At Dr. Trivedi’s Homeopathy Clinic, we provide individualized care that balances hormonal levels and enhances overall reproductive health. Medicines such as Pulsatilla, Sepia, and Lachesis are selected based on emotional and physical symptoms. Homeopathy gently regulates menstrual cycles, relieves pelvic pain, and addresses hormonal imbalances without side effects. Ideal for women of all ages, it promotes long-term wellness and fertility support naturally.",
    image: "/assets/Gynecological Disorders (Women’s Health Issues).jpeg",
    remedies: ["Pulsatilla", "Sepia", "Lachesis"]
  },
  {
    id: "pediatrics",
    en: "Pediatric Diseases (Children’s Health Problems)",
    hi: "बाल रोग (बच्चों की स्वास्थ्य समस्याएँ)",
    category: "Pediatric",
    description: "Children often suffer from colds, coughs, allergies, skin conditions, and digestive issues. Our homeopathic treatment is gentle, safe, and effective for infants and children. Remedies like Chamomilla, Belladonna, and Calcarea Carb help boost immunity, reduce recurring infections, and support healthy development. At Dr. Trivedi’s Homeopathy Clinic, we treat the root causes while considering the child’s emotional and physical well-being. No harsh chemicals or side effects make homeopathy a parent’s first choice for their child’s overall health.",
    image: "/assets/Pediatric Diseases (Children’s Health Problems).jpeg",
    remedies: ["Chamomilla", "Belladonna", "Calcarea Carb"]
  },
  {
    id: "skin-diseases",
    en: "Skin Diseases (Dermatological Issues)",
    hi: "त्वचा रोग (डर्मेटोलॉजिकल समस्याएँ)",
    category: "Skin",
    description: "Homeopathy treats a wide range of skin conditions including eczema, psoriasis, acne, urticaria, and fungal infections. By identifying the underlying triggers—be it hormonal imbalance, allergies, or stress—we prescribe remedies such as Sulphur, Graphites, and Natrum Mur. At Dr. Trivedi’s Homeopathy Clinic, our treatment works from within to clear the skin, reduce itching, inflammation, and prevent recurrences. Homeopathy not only improves skin appearance but also enhances overall immunity and confidence naturally.",
    image: "/assets/Skin Diseases (Dermatological Issues).jpeg",
    remedies: ["Sulphur", "Graphites", "Natrum Mur"]
  },
  {
    id: "chronic-diseases",
    en: "Chronic & Complex Diseases",
    hi: "पुरानी और जटिल बीमारियाँ",
    category: "Chronic",
    description: "Dr. Trivedi’s Homeopathy Clinic specializes in treating a wide range of chronic and complex diseases that are often labeled incurable by conventional medicine. Whether it’s autoimmune conditions, long-standing hormonal imbalances, psychosomatic disorders, or unexplained symptoms, homeopathy offers hope. Our individualized treatment targets the root cause of disease, strengthens the immune system, and restores balance without suppressing symptoms. With over 40 years of experience, we’ve successfully treated thousands of patients suffering from chronic illnesses—proving that homeopathy is not just alternative medicine, but effective medicine.",
    image: "/assets/Chronic & Complex Diseases.jpeg"
  },
  {
    id: "obesity",
    en: "Obesity (Weight Management)",
    hi: "मोटापा (वजन प्रबंधन)",
    category: "Chronic",
    description: "Homeopathy offers a safe and natural approach to weight management by targeting the root cause of obesity. Unlike crash diets or synthetic supplements, homeopathic remedies work gently to balance your metabolism, regulate hormones, and address underlying issues like thyroid imbalance, stress, or emotional eating. At Dr. Trivedi’s Homeopathy Clinic, we offer individualized treatment plans that are tailored to your body type, lifestyle, and health history. Homeopathy doesn't just suppress appetite—it works holistically to restore overall well-being. Many patients have reported gradual, sustained weight loss without side effects. With consistent treatment and lifestyle advice, you can achieve long-term success in managing your weight naturally.",
    image: "/assets/Obesity (Weight Management).jpeg"
  },
  {
    id: "respiratory-issues",
    en: "Respiratory Issues (Asthma, Breathing Difficulty)",
    hi: "श्वसन समस्याएँ (दमा, सांस लेने में कठिनाई)",
    category: "Respiratory",
    description: "Chronic cough, breathlessness, wheezing, asthma, and bronchitis are common respiratory concerns that affect quality of life. At Dr. Trivedi’s Homeopathy Clinic, we use safe and effective remedies to strengthen the lungs, reduce inflammation, and improve breathing capacity. Our treatment helps manage triggers such as allergens, pollution, weather changes, or infections. Homeopathy not only relieves symptoms but also boosts immunity to prevent frequent flare-ups. It is particularly helpful for children and elderly patients who want to avoid long-term use of inhalers, steroids, or antibiotics.",
    image: "/assets/Respiratory Issues (Asthma, Breathing Difficulty).jpeg"
  }
];
