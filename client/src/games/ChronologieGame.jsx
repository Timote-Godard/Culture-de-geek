
import React, { useState, useEffect, useRef } from 'react';

export const ChronologieGame = ({ items, theme, remplirText, review, valueText, vraieReponse }) => {
  const [liste, setListe] = useState([]);
  const dragItem = useRef(null);
  const dragOverItem = useRef(null);
  const itemsRef = useRef([]);
  const [hoverIndex, setHoverIndex] = useState(null);

  const [animState, setAnimState] = useState({
    active: false,
    source: null,
    target: null,
    step: 0,
    sourceDist: 0,
    shifts: []
  });

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initialisation de la liste au début d'une question
  useEffect(() => {
    if (!review && items) {
      setListe(items);
      remplirText(items.map(i => i.nom).join('|'));
    }
  }, [items]); // On n'initialise que quand les items (la question) changent

  // Mise à jour de la liste uniquement en mode révision
  useEffect(() => {
    if (review && valueText && items) {
      const nomsJoueur = valueText.split('|');
      const listeJoueur = nomsJoueur.map(nom => items.find(i => i.nom === nom)).filter(Boolean);
      setListe(listeJoueur.length === items.length ? listeJoueur : items);
    }
  }, [review, valueText, items]);

  const triggerAnimation = (sourceIndex, targetIndex) => {
    if (sourceIndex === targetIndex || sourceIndex < 0 || targetIndex >= liste.length || animState.active) return;

    const sourceEl = itemsRef.current[sourceIndex];
    const targetEl = itemsRef.current[targetIndex];
    
    const sourceDist = isMobile 
      ? targetEl.offsetTop - sourceEl.offsetTop 
      : targetEl.offsetLeft - sourceEl.offsetLeft;

    let shifts = new Array(liste.length).fill(0);
    if (sourceIndex < targetIndex) {
      for (let i = sourceIndex + 1; i <= targetIndex; i++) {
        shifts[i] = isMobile
          ? itemsRef.current[i - 1].offsetTop - itemsRef.current[i].offsetTop
          : itemsRef.current[i - 1].offsetLeft - itemsRef.current[i].offsetLeft;
      }
    } else {
      for (let i = targetIndex; i < sourceIndex; i++) {
        shifts[i] = isMobile
          ? itemsRef.current[i + 1].offsetTop - itemsRef.current[i].offsetTop
          : itemsRef.current[i + 1].offsetLeft - itemsRef.current[i].offsetLeft;
      }
    }

    setAnimState({ active: true, source: sourceIndex, target: targetIndex, step: 1, sourceDist, shifts });
    setHoverIndex(null);

    setTimeout(() => setAnimState(prev => ({ ...prev, step: 2 })), 150);
    setTimeout(() => setAnimState(prev => ({ ...prev, step: 3 })), 400);

    setTimeout(() => {
      let _liste = [...liste];
      const draggedItem = _liste.splice(sourceIndex, 1)[0];
      _liste.splice(targetIndex, 0, draggedItem);
      
      setListe(_liste);
      remplirText(_liste.map(i => i.nom).join('|'));
      setAnimState({ active: false, source: null, target: null, step: 0, sourceDist: 0, shifts: [] });
      dragItem.current = null;
      dragOverItem.current = null;
    }, 600);
  };

  const getTransform = (index) => {
    if (!animState.active) return "translate(0, 0)";

    const axis = isMobile ? 'Y' : 'X';
    const sideAxis = isMobile ? 'X' : 'Y';
    const sideDist = isMobile ? 40 : -150;

    if (index === animState.source) {
      if (animState.step === 1) return `translate${sideAxis}(${sideDist}px) scale(1.05)`;
      if (animState.step === 2) return `translate${axis}(${animState.sourceDist}px) translate${sideAxis}(${sideDist}px) scale(1.05)`;
      if (animState.step === 3) return `translate${axis}(${animState.sourceDist}px) scale(1)`;
    } else if (animState.step >= 2) {
      return `translate${axis}(${animState.shifts[index]}px)`;
    }
    return "translate(0, 0)";
  };

  const renderCard = (item, index, isCorrection = false) => {
    const isCorrect = isCorrection || (review && valueText.split('|')[index] === vraieReponse[index].nom);
    const borderColor = isCorrection ? 'border-purple-500' : (isCorrect ? 'border-emerald-500' : 'border-rose-500');

    return (
      <div
        key={item.nom + index + (isCorrection ? '-corr' : '')}
        ref={el => !isCorrection && (itemsRef.current[index] = el)}
        draggable={!review && !animState.active && !isCorrection}
        onDragStart={(e) => {
          dragItem.current = index;
          const img = new Image();
          img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
          e.dataTransfer.setDragImage(img, 0, 0);
        }}
        onDragEnter={() => !isCorrection && setHoverIndex(index)}
        onDragEnd={(e) => {
          e.preventDefault();
          if (hoverIndex !== null) triggerAnimation(dragItem.current, hoverIndex);
        }}
        onDragOver={(e) => e.preventDefault()}
        style={{
          transform: !isCorrection ? getTransform(index) : 'none',
          transition: animState.active ? "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)" : "none",
          zIndex: animState.source === index ? 50 : 1
        }}
        className={`flex flex-row md:flex-col items-center bg-slate-800 rounded-2xl p-2 md:p-3 border-4 w-full md:flex-1 md:min-w-[120px] shadow-lg relative
          ${!review && !isCorrection ? 'border-purple-500 cursor-grab active:cursor-grabbing' : borderColor}
          ${hoverIndex === index && !animState.active && dragItem.current !== index ? 'brightness-125 border-dashed scale-[0.98]' : ''}
          ${animState.source === index ? 'shadow-2xl brightness-110' : ''}
        `}
      >
        <div className="w-20 h-20 md:w-full md:h-32 shrink-0 overflow-hidden rounded-xl">
          <img src={item.image} alt={item.nom} className="w-full h-full object-cover" />
        </div>
        
        <div className="flex-1 px-3 md:px-0 md:mt-2">
          <p className="text-white font-black text-sm md:text-xs leading-tight text-left md:text-center uppercase tracking-tight">
            {item.nom}
          </p>
        </div>

        {!review && !isCorrection && (
          <div className="flex flex-col gap-1 md:hidden">
            <button 
              onClick={(e) => { e.stopPropagation(); triggerAnimation(index, index - 1); }} 
              disabled={index === 0 || animState.active}
              className="bg-purple-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold disabled:opacity-30 shadow-md active:scale-90 transition-transform"
            >↑</button>
            <button 
              onClick={(e) => { e.stopPropagation(); triggerAnimation(index, index + 1); }} 
              disabled={index === liste.length - 1 || animState.active}
              className="bg-purple-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold disabled:opacity-30 shadow-md active:scale-90 transition-transform"
            >↓</button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-5xl py-4 overflow-x-hidden"> 
      <div className={`flex flex-col md:flex-row justify-center items-stretch gap-3 md:gap-4 w-full relative px-4 md:px-0 ${isMobile ? 'max-w-sm' : ''}`}>
        <div className={`absolute bg-slate-700/50 rounded-full -z-10
          ${isMobile 
            ? 'left-1/2 -translate-x-1/2 w-2 h-[90%] top-[5%]' 
            : 'top-1/2 -translate-y-1/2 w-[90%] left-[5%] h-2'}
        `}></div>
        {liste.map((item, index) => renderCard(item, index))}
      </div>

      {review && (
        <div className="w-full mt-10 border-t-4 border-dashed border-slate-700 pt-8">
          <label className={`${theme.text.label} block text-center mb-6 text-xl`}>— Solution Correcte —</label>
          <div className={`flex flex-col md:flex-row justify-center items-stretch gap-3 md:gap-4 w-full px-4 md:px-0 ${isMobile ? 'max-w-sm mx-auto' : ''}`}>
             {vraieReponse.map((item, index) => renderCard(item, index, true))}
          </div>
        </div>
      )}
    </div>
  );
};
