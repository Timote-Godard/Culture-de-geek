
import React, { useEffect } from 'react';
import { BoutonValide } from '../components/UI';

export const PetitBacGame = ({ categories, lettre, theme, remplirText, review, valueText, isChef, etatLignes, changeEtat }) => {
  let reponses = ["", "", "", "", ""];
  try {
    if (valueText) reponses = JSON.parse(valueText);
  } catch(e) {}

  useEffect(() => {
    if (review && isChef && !Array.isArray(etatLignes)) {
       const autoValidation = reponses.map(mot => {
          const motNettoye = mot.trim().toLowerCase();
          return motNettoye.startsWith(lettre.toLowerCase()) && motNettoye.length > 1;
       });
       changeEtat(autoValidation);
    }
  }, [review, isChef, valueText, lettre, etatLignes, changeEtat]);

  const handleChange = (index, val) => {
    if (review) return;
    const newRep = [...reponses];
    newRep[index] = val;
    remplirText(JSON.stringify(newRep));
  };

  const toggleLigne = (index, statut) => {
    if (!Array.isArray(etatLignes)) return;
    const newEtat = [...etatLignes];
    newEtat[index] = statut;
    changeEtat(newEtat);
  };

  return (
    <div className="flex flex-col items-center gap-2 md:gap-6 w-full max-w-4xl px-2">
      <div className="relative mb-2 md:mb-4">
        <div className="absolute inset-0 bg-purple-500 rounded-xl md:rounded-2xl transform rotate-3 shadow-lg"></div>
        <div className="relative text-3xl md:text-5xl font-black text-purple-600 bg-white w-14 h-14 md:w-20 md:h-20 flex items-center justify-center rounded-xl md:rounded-2xl shadow-xl border-2 md:border-4 border-slate-200 transform -rotate-3 z-10">
          {lettre}
        </div>
      </div>

      <div className="w-full flex flex-col gap-2 md:gap-3 mt-2 md:mt-4">
        {categories.map((cat, i) => {
          const estLigneBonne = Array.isArray(etatLignes) ? etatLignes[i] : false;

          return (
            <div key={i} className={`flex flex-col md:flex-row items-center gap-2 md:gap-4 p-3 md:p-4 rounded-xl border-2 shadow-sm w-full transition-colors duration-300
              ${review ? (estLigneBonne ? 'bg-emerald-900/40 border-emerald-500' : 'bg-rose-900/40 border-rose-500') : 'bg-purple-500 border-purple-600'}
            `}>
              
              <span className={`font-bold w-full md:w-1/3 text-center md:text-right uppercase tracking-wider text-sm
                ${review ? (estLigneBonne ? 'text-emerald-400' : 'text-rose-400') : 'text-slate-100 font-bold'}
              `}>
                {cat}
              </span>

              <input
                disabled={review}
                type="text"
                value={reponses[i]}
                onChange={(e) => handleChange(i, e.target.value)}
                placeholder={`Commence par ${lettre}...`}
                className={`w-full md:w-2/3 ${theme.input.game} 
                  ${review ? (estLigneBonne ? 'text-emerald-300 bg-emerald-950/50 text-center font-bold border-none' : 'text-rose-300 bg-rose-950/50 text-center font-bold border-none line-through opacity-70') : ''}
                `}
              />

              {review && isChef && Array.isArray(etatLignes) && (
                <div className="flex gap-2 w-full md:w-auto justify-center mt-2 md:mt-0">
                  <BoutonValide changeEtat={(etat) => toggleLigne(i, etat)} theme={theme} etat={estLigneBonne} isChef={isChef}/>  
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
