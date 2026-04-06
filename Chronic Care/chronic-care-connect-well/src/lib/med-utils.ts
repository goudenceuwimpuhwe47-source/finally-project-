/**
 * Detects the medication form (Solid, Liquid, Units, Puffs) based on a string label.
 * Returns specialized labels and units for UI consistency across Doctor and Pharmacist views.
 */
export const getMedType = (label: string) => {
  const l = (label || '').toLowerCase();
  
  if (l.includes('ml') || l.includes('syrup') || l.includes('liquid')) {
    return { 
      type: 'liquid', 
      totalLabel: 'Total Volume (ml)', 
      dailyLabel: 'Daily Volume (ml)', 
      placeholder: 'e.g. 500', 
      unit: 'ml' 
    };
  }
  
  if (l.includes('iu') || l.includes('unit') || l.includes('injection')) {
    return { 
      type: 'units', 
      totalLabel: 'Total Units (IU)', 
      dailyLabel: 'Daily Units (IU)', 
      placeholder: 'e.g. 1000', 
      unit: 'units' 
    };
  }
  
  if (l.includes('inhaler') || l.includes('mcg') || l.includes('puff')) {
    return { 
      type: 'puffs', 
      totalLabel: 'Total Puffs', 
      dailyLabel: 'Daily Puffs', 
      placeholder: 'e.g. 200', 
      unit: 'puff(s)' 
    };
  }

  // Default to solid forms
  return { 
    type: 'solid', 
    totalLabel: 'Total Pills/Tabs', 
    dailyLabel: 'Pills per Day', 
    placeholder: 'e.g. 30', 
    unit: 'piece(s)' 
  };
};
