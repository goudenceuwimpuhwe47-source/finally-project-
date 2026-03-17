export type DiseaseOption = { value: string; label: string };

export const chronicDiseasesRW: DiseaseOption[] = [
  { value: 'diabetes', label: 'Diabetes / Diyabete' },
  { value: 'hypertension', label: 'Hypertension (High Blood Pressure) / Umuvuduko w’amaraso uri hejuru' },
  { value: 'asthma', label: 'Asthma / Igituntu cy’ihumeka (Asima)' },
  { value: 'hiv_aids', label: 'HIV/AIDS / Virusi itera Sida (Sida)' },
  { value: 'tuberculosis', label: 'Tuberculosis (TB) / Igituntu' },
  { value: 'ckd', label: 'Chronic Kidney Disease / Indwara z’impyiko' },
  { value: 'respiratory', label: 'Chronic Respiratory Diseases (COPD, Bronchitis) / Indwara z’ubuhumekero z’igihe kirekire' },
  { value: 'cancer', label: 'Cancer / Kanseri' },
  { value: 'sickle_cell', label: 'Sickle Cell Disease / Indwara y’amaraso (Sickle Cell)' },
  { value: 'liver', label: 'Chronic Liver Disease (Hepatitis-related) / Indwara y’umwijima (Hepatite)' },
  { value: 'epilepsy', label: 'Epilepsy / Epilepsiya' },
  { value: 'cardiovascular', label: 'Cardiovascular Diseases / Indwara z’umutima' },
];

export const dosageFrequencies: DiseaseOption[] = [
  { value: 'weekly', label: 'Weekly dose' },
  { value: 'monthly', label: 'Monthly dose' },
  { value: 'bi_monthly', label: 'Two-monthly dose' },
];

export const genders: DiseaseOption[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

export const paymentMethods: DiseaseOption[] = [
  { value: 'pay_in_pharmacy', label: 'Pay at pharmacy' },
  { value: 'pay_on_delivery', label: 'Pay on delivery' },
  { value: 'pay_online', label: 'Pay online (recommended)' },
];
