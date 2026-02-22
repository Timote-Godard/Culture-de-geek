
import React, { useState, useEffect } from 'react';

export const HexaGame = ({ theme, remplirText, review, valueText, pseudoReview, reponse }) => {
  const [currentHex, setCurrentHex] = useState(review ? valueText : "#808080");

  const handleChange = (e) => {
    let val = e.target.value.toUpperCase();
    if (!val.startsWith('#')) val = '#' + val;
    val = val.substring(0, 7);
    setCurrentHex(val);
    if (remplirText) remplirText(val);
  };

  const handlePaletteClick = (hex) => {
    if (review) return;
    setCurrentHex(hex);
    if (remplirText) remplirText(hex);
  };

  const palette = [
    "#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FF00FF", "#00FFFF",
    "#FFFFFF", "#000000", "#808080", "#FFA500", "#800080", "#A52A2A"
  ];

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-md px-4">
      {/* Affichage des couleurs */}
      <div className="flex flex-row justify-center items-center gap-8 w-full">
        <div className="flex flex-col items-center gap-2 flex-1">
          <label className={theme.text.label}>Cible</label>
          <div 
            className="w-24 h-24 md:w-32 md:h-32 rounded-3xl border-4 border-white shadow-xl transition-all duration-500"
            style={{ backgroundColor: review ? reponse : reponse }}
          />
        </div>

        <div className="flex flex-col items-center gap-2 flex-1">
          <label className={theme.text.label}>{review ? pseudoReview : "Ton choix"}</label>
          <div 
            className="w-24 h-24 md:w-32 md:h-32 rounded-3xl border-4 border-white shadow-xl transition-all duration-500"
            style={{ backgroundColor: currentHex }}
          />
        </div>
      </div>

      {/* Input de saisie */}
      <div className="w-full">
        <input 
          type="text"
          disabled={review}
          value={currentHex}
          onChange={handleChange}
          maxLength={7}
          className={`${theme.input.game} font-mono`}
          placeholder="#000000"
        />
      </div>

      {/* Palette rapide */}
      {!review && (
        <div className="grid grid-cols-6 gap-2 w-full">
          {palette.map((color) => (
            <button
              key={color}
              onClick={() => handlePaletteClick(color)}
              className="w-full pt-[100%] rounded-lg border-2 border-white shadow-sm active:scale-90 transition-transform"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      )}

      {/* Mode Review : Affichage de la réponse */}
      {review && (
        <div className="mt-4 text-center bg-white/10 p-4 rounded-2xl w-full border-2 border-white/20">
          <p className="text-slate-300 uppercase text-xs font-black tracking-widest mb-1">Code correct</p>
          <p className="text-4xl font-black text-white font-mono tracking-wider">{reponse}</p>
        </div>
      )}
    </div>
  );
};
