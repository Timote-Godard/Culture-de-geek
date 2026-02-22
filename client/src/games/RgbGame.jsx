
import React, { useState, useEffect } from 'react';

export const RgbGame = ({ theme, remplirText, review, valueText, pseudoReview, reponse, rTarget, gTarget, bTarget }) => {
  // Parsing de la réponse pour la review
  const parseRgb = (str) => {
    const match = str.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    return match ? { r: parseInt(match[1]), g: parseInt(match[2]), b: parseInt(match[3]) } : { r: 128, g: 128, b: 128 };
  };

  const initialValues = review ? parseRgb(valueText) : { r: 128, g: 128, b: 128 };
  const [values, setValues] = useState(initialValues);

  const updateValue = (key, val) => {
    if (review) return;
    const newValues = { ...values, [key]: parseInt(val) };
    setValues(newValues);
    if (remplirText) remplirText(`rgb(${newValues.r}, ${newValues.g}, ${newValues.b})`);
  };

  const targetColor = reponse; // rgb(x, y, z)
  const currentColor = `rgb(${values.r}, ${values.g}, ${values.b})`;

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-md px-2">
      {/* Visualisation */}
      <div className="flex flex-row justify-center items-center gap-4 md:gap-8 w-full mb-2">
        <div className="flex flex-col items-center gap-1 flex-1">
          <label className="text-[10px] md:text-xs font-black text-purple-900 uppercase">Cible</label>
          <div 
            className="w-20 h-20 md:w-32 md:h-32 rounded-2xl md:rounded-3xl border-4 border-white shadow-lg transition-all duration-500"
            style={{ backgroundColor: targetColor }}
          />
        </div>

        <div className="flex flex-col items-center gap-1 flex-1">
          <label className="text-[10px] md:text-xs font-black text-purple-900 uppercase">{review ? pseudoReview : "Ton choix"}</label>
          <div 
            className="w-20 h-20 md:w-32 md:h-32 rounded-2xl md:rounded-3xl border-4 border-white shadow-lg transition-all duration-500"
            style={{ backgroundColor: currentColor }}
          />
        </div>
      </div>

      {/* Sliders RGB */}
      <div className="w-full space-y-3 bg-white/20 p-4 rounded-2xl border-2 border-white/10 shadow-inner">
        {['r', 'g', 'b'].map((color) => (
          <div key={color} className="flex items-center gap-4">
            <span className={`w-4 font-black uppercase ${color === 'r' ? 'text-red-500' : color === 'g' ? 'text-green-500' : 'text-blue-500'}`}>
              {color}
            </span>
            <input 
              type="range" 
              min="0" 
              max="255" 
              disabled={review}
              value={values[color]}
              onChange={(e) => updateValue(color, e.target.value)}
              className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
            />
            <span className="w-8 text-right font-mono font-bold text-sm text-slate-100">
              {values[color]}
            </span>
          </div>
        ))}
      </div>

      {/* Mode Review : Affichage de la réponse */}
      {review && (
        <div className="mt-2 text-center bg-emerald-500/20 p-3 rounded-xl w-full border-2 border-emerald-500/30">
          <p className="text-slate-300 uppercase text-[10px] font-black tracking-widest mb-1">Code RGB correct</p>
          <p className="text-2xl md:text-3xl font-black text-emerald-400 font-mono tracking-tighter">{reponse}</p>
        </div>
      )}
    </div>
  );
};
