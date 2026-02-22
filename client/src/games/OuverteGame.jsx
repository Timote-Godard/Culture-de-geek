
import React from 'react';

export const OuverteGame = ({ remplirText, valueText, review, theme }) => {
  return (
    <div className='w-full'>
      <input 
        disabled={review} 
        type="text" 
        placeholder='Réponse...' 
        value={valueText} 
        onChange={(e) => remplirText(e.target.value)} 
        className={`${theme.input.game} ${review ? "text-center" : ""}`}
      />
    </div>
  );
};

export const DrapeauxGame = ({ image, theme, remplirText, review, valueText }) => {
  return (
    <div className='flex flex-col justify-center items-center gap-6'>
      {!review && <img src={image} alt="Drapeau à deviner" className="w-48 h-auto rounded shadow-lg border-2 border-white/20" />}
      <input 
        disabled={review} 
        type="text" 
        placeholder='Réponse...' 
        value={valueText} 
        onChange={(e) => remplirText(e.target.value)} 
        className={`${theme.input.game} ${review ? "text-center" : ""}`}
      />
    </div>
  );
};

export const MemeGame = ({ image, theme, remplirText, review, valueText }) => {
  return (
    <div className='flex flex-col justify-center items-center gap-6'>
      {!review && <img src={image} alt="Même à deviner" className={`w-48 h-auto rounded shadow-lg border-2 border-white/20 ${review ? 'blur-0' : 'blur-sm'}`} />}
      <input 
        disabled={review} 
        type="text" 
        placeholder='Réponse...' 
        value={valueText} 
        onChange={(e) => remplirText(e.target.value)} 
        className={`${theme.input.game} ${review ? "text-center" : ""}`}
      />
    </div>
  );
};

export const CodeTrouGame = ({ code, langage, theme, remplirText, review, valueText }) => {
  const renderCodeAvecTrou = (texteCode) => {
    if (!texteCode) return <span className="text-rose-500">Erreur de génération du code...</span>;
    if (Array.isArray(texteCode)) texteCode = texteCode.join('\n');
    else if (typeof texteCode !== 'string') texteCode = String(texteCode);

    const parties = texteCode.split('___');
    return parties.map((partie, index) => (
      <span key={index}>
        {partie}
        {index < parties.length - 1 && (
          <span className="inline-block px-4 mx-1 bg-slate-700/80 border-2 border-dashed border-slate-400 rounded-md text-transparent animate-pulse shadow-inner">
            ????
          </span>
        )}
      </span>
    ));
  };

  return (
    <div className='flex flex-col justify-center items-center gap-4 w-full max-w-2xl'>
      <div className="w-full bg-slate-900 rounded-xl overflow-hidden shadow-[0_8px_0_rgb(30,41,59)] border-2 border-slate-700 flex flex-col">
        <div className="bg-slate-800 px-4 py-2 flex items-center gap-2 border-b border-slate-700 shrink-0">
          <div className="w-3 h-3 rounded-full bg-rose-500"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
          <span className="ml-2 text-xs font-bold text-slate-400 uppercase tracking-widest">{langage}</span>
        </div>
        <div className="p-4 md:p-6 overflow-y-auto overflow-x-hidden md:overflow-hidden max-h-64 custom-scrollbar ">
          <pre className="font-mono text-emerald-400 text-base md:text-lg leading-relaxed whitespace-pre-wrap break-words">
            {renderCodeAvecTrou(code)}
          </pre>
        </div>
      </div>
    </div>
  );
};
