export type MedicineOption = { value: string; label: string; category: string };

export const availableMedicines: MedicineOption[] = [
  // Diabetes Medications
  { value: 'metformin', label: 'Metformin (500mg, 850mg, 1000mg)', category: 'Diabetes' },
  { value: 'glibenclamide', label: 'Glibenclamide (5mg)', category: 'Diabetes' },
  { value: 'insulin_regular', label: 'Insulin Regular (100IU/ml)', category: 'Diabetes' },
  { value: 'insulin_nph', label: 'Insulin NPH (100IU/ml)', category: 'Diabetes' },
  { value: 'glipizide', label: 'Glipizide (5mg, 10mg)', category: 'Diabetes' },

  // Hypertension Medications
  { value: 'amlodipine', label: 'Amlodipine (5mg, 10mg)', category: 'Hypertension' },
  { value: 'enalapril', label: 'Enalapril (5mg, 10mg, 20mg)', category: 'Hypertension' },
  { value: 'hydrochlorothiazide', label: 'Hydrochlorothiazide (25mg)', category: 'Hypertension' },
  { value: 'atenolol', label: 'Atenolol (50mg, 100mg)', category: 'Hypertension' },
  { value: 'nifedipine', label: 'Nifedipine (10mg, 20mg)', category: 'Hypertension' },
  { value: 'lisinopril', label: 'Lisinopril (10mg, 20mg)', category: 'Hypertension' },

  // Asthma & Respiratory
  { value: 'salbutamol_inhaler', label: 'Salbutamol Inhaler (100mcg)', category: 'Respiratory' },
  { value: 'beclomethasone_inhaler', label: 'Beclomethasone Inhaler (50mcg, 100mcg)', category: 'Respiratory' },
  { value: 'theophylline', label: 'Theophylline (200mg)', category: 'Respiratory' },
  { value: 'prednisolone', label: 'Prednisolone (5mg)', category: 'Respiratory' },

  // HIV/AIDS Medications
  { value: 'tenofovir_lamivudine_efavirenz', label: 'TDF/3TC/EFV (Tenofovir/Lamivudine/Efavirenz)', category: 'HIV/AIDS' },
  { value: 'abacavir_lamivudine', label: 'ABC/3TC (Abacavir/Lamivudine)', category: 'HIV/AIDS' },
  { value: 'dolutegravir', label: 'Dolutegravir (50mg)', category: 'HIV/AIDS' },
  { value: 'zidovudine', label: 'Zidovudine (AZT) (300mg)', category: 'HIV/AIDS' },

  // Tuberculosis (TB) Medications
  { value: 'rifampicin_isoniazid_pyrazinamide_ethambutol', label: 'RHZE (Rifampicin/Isoniazid/Pyrazinamide/Ethambutol)', category: 'Tuberculosis' },
  { value: 'rifampicin_isoniazid', label: 'RH (Rifampicin/Isoniazid)', category: 'Tuberculosis' },
  { value: 'streptomycin', label: 'Streptomycin Injection (1g)', category: 'Tuberculosis' },

  // Chronic Kidney Disease
  { value: 'furosemide', label: 'Furosemide (40mg)', category: 'Kidney Disease' },
  { value: 'calcium_carbonate', label: 'Calcium Carbonate (500mg)', category: 'Kidney Disease' },
  { value: 'erythropoietin', label: 'Erythropoietin Injection', category: 'Kidney Disease' },

  // Cancer & Chemotherapy
  { value: 'cyclophosphamide', label: 'Cyclophosphamide (50mg)', category: 'Cancer' },
  { value: 'methotrexate', label: 'Methotrexate (2.5mg)', category: 'Cancer' },
  { value: 'tamoxifen', label: 'Tamoxifen (20mg)', category: 'Cancer' },

  // Epilepsy Medications
  { value: 'phenobarbital', label: 'Phenobarbital (30mg, 60mg)', category: 'Epilepsy' },
  { value: 'carbamazepine', label: 'Carbamazepine (200mg)', category: 'Epilepsy' },
  { value: 'phenytoin', label: 'Phenytoin (100mg)', category: 'Epilepsy' },
  { value: 'valproic_acid', label: 'Valproic Acid (200mg, 500mg)', category: 'Epilepsy' },

  // Cardiovascular Medications
  { value: 'aspirin', label: 'Aspirin (75mg, 100mg)', category: 'Cardiovascular' },
  { value: 'simvastatin', label: 'Simvastatin (20mg, 40mg)', category: 'Cardiovascular' },
  { value: 'atorvastatin', label: 'Atorvastatin (10mg, 20mg)', category: 'Cardiovascular' },
  { value: 'clopidogrel', label: 'Clopidogrel (75mg)', category: 'Cardiovascular' },

  // Liver Disease
  { value: 'lactulose', label: 'Lactulose Syrup', category: 'Liver Disease' },
  { value: 'ursodeoxycholic_acid', label: 'Ursodeoxycholic Acid (250mg)', category: 'Liver Disease' },

  // Pain Management
  { value: 'paracetamol', label: 'Paracetamol (500mg, 1000mg)', category: 'Pain Management' },
  { value: 'ibuprofen', label: 'Ibuprofen (200mg, 400mg)', category: 'Pain Management' },
  { value: 'tramadol', label: 'Tramadol (50mg)', category: 'Pain Management' },
  { value: 'morphine', label: 'Morphine (10mg, 30mg)', category: 'Pain Management' },

  // Antibiotics (Common)
  { value: 'amoxicillin', label: 'Amoxicillin (250mg, 500mg)', category: 'Antibiotics' },
  { value: 'ciprofloxacin', label: 'Ciprofloxacin (500mg)', category: 'Antibiotics' },
  { value: 'azithromycin', label: 'Azithromycin (500mg)', category: 'Antibiotics' },
  { value: 'doxycycline', label: 'Doxycycline (100mg)', category: 'Antibiotics' },

  // Vitamins & Supplements
  { value: 'folic_acid', label: 'Folic Acid (5mg)', category: 'Vitamins' },
  { value: 'vitamin_b_complex', label: 'Vitamin B Complex', category: 'Vitamins' },
  { value: 'ferrous_sulfate', label: 'Ferrous Sulfate (200mg)', category: 'Vitamins' },
  { value: 'calcium_vitamin_d', label: 'Calcium + Vitamin D3', category: 'Vitamins' },

  // Other Common Medications
  { value: 'omeprazole', label: 'Omeprazole (20mg)', category: 'Gastrointestinal' },
  { value: 'ranitidine', label: 'Ranitidine (150mg)', category: 'Gastrointestinal' },
  { value: 'diazepam', label: 'Diazepam (5mg, 10mg)', category: 'Mental Health' },
  { value: 'fluoxetine', label: 'Fluoxetine (20mg)', category: 'Mental Health' },
];

// Group medicines by category for easier selection
export const medicineCategories = Array.from(
  new Set(availableMedicines.map(m => m.category))
).sort();

// Helper function to get medicines by category
export const getMedicinesByCategory = (category: string): MedicineOption[] => {
  return availableMedicines.filter(m => m.category === category);
};
