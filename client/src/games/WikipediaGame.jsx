
import React, { useState, useEffect, useRef, memo } from 'react';
import { ScoreBadge } from '../components/ScoreBadge';

export const WikipediaGame = memo(({ depart, arrivee, socket, review, valueText, estBon, isFullscreen, toggleFullscreen, pseudoReview, theme, remplirText }) => {
  const [currentPage, setCurrentPage] = useState(depart);
  const [hasWon, setHasWon] = useState(false);
  const [loading, setLoading] = useState(false);
  const [htmlContent, setHtmlContent] = useState("");
  
  const scrollContainerRef = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    if (!socket || review) return;
    const handleWin = () => setHasWon(true);
    socket.on('wiki_win', handleWin);
    return () => socket.off('wiki_win', handleWin);
  }, [socket, review]);

  const fetchWikiPage = async (title) => {
    setLoading(true);
    if (contentRef.current) {
      contentRef.current.innerHTML = "";
    }

    try {
      const res = await fetch(`https://fr.wikipedia.org/w/api.php?origin=*&action=parse&page=${encodeURIComponent(title)}&format=json&prop=text&mobileformat=1&disableeditsection=1`);
      const data = await res.json();
      
      if (data && data.parse && data.parse.text) {
        setHtmlContent(data.parse.text['*'].replace(/src="\/\//g, 'src="https://'));
        setCurrentPage(title);
      }
    } catch (e) {
      console.error("Erreur API Wiki");
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!review && depart) {
      fetchWikiPage(depart);
      if (remplirText) remplirText(depart);
    }
  }, [depart, review]);

  useEffect(() => {
    if (!contentRef.current || !htmlContent || hasWon || review) return;

    contentRef.current.innerHTML = htmlContent;

    const allLinks = contentRef.current.querySelectorAll('a');
    allLinks.forEach(aTag => {
      const href = aTag.getAttribute('href');
      
      if (!href || href.startsWith('#') || !(aTag.className === '')) {
        aTag.classList.add('lien-interdit');
        return;
      }

      let targetTitle = null;
      if (href.includes('/wiki/')) {
        targetTitle = href.substring(href.indexOf('/wiki/') + 6).split('#')[0];
      } else if (href.startsWith('./')) {
        targetTitle = href.substring(2).split('#')[0];
      } else if (href.includes('title=')) {
        const urlParams = new URLSearchParams(href.substring(href.indexOf('?')));
        targetTitle = urlParams.get('title');
      }

      if (targetTitle) {
        const cleanTitle = decodeURIComponent(targetTitle).replace(/_/g, ' ');
        aTag.setAttribute('data-destination', cleanTitle);
      }
    });

    if (scrollContainerRef.current) scrollContainerRef.current.scrollTo(0, 0);

    const handleClick = (e) => {
      const aTag = e.target.closest('a');
      if (!aTag) return; 

      e.preventDefault();

      const href = aTag.getAttribute('href');
      if (!href || href.startsWith('#')) return;

      let nextTitle = null;
      if (href.includes('/wiki/')) {
        nextTitle = href.substring(href.indexOf('/wiki/') + 6).split('#')[0];
      } else if (href.startsWith('./')) {
        nextTitle = href.substring(2).split('#')[0];
      } else if (href.includes('title=')) {
        const urlParams = new URLSearchParams(href.substring(href.indexOf('?')));
        nextTitle = urlParams.get('title');
      }

      if (nextTitle) {
        nextTitle = decodeURIComponent(nextTitle);
        const badPrefixes = ['Spécial:', 'Fichier:', 'Catégorie:', 'Portail:', 'Aide:', 'Wikipédia:', 'Discussion:'];
        if (badPrefixes.some(prefix => nextTitle.startsWith(prefix))) return;

        socket.emit('wiki_click', nextTitle);
        fetchWikiPage(nextTitle);

        // Mise à jour locale du parcours dans repOuverte
        if (remplirText) {
          const currentPath = valueText || "";
          const newPath = currentPath === "" ? nextTitle : `${currentPath} ➔ ${nextTitle}`;
          remplirText(newPath);
        }
      }
    };

    contentRef.current.addEventListener('click', handleClick);
    return () => {
      if (contentRef.current) {
        contentRef.current.removeEventListener('click', handleClick);
        contentRef.current.innerHTML = "";
      }
    };
  }, [htmlContent, hasWon, review]);

  if (review) {
    const parcours = (typeof valueText === 'string' ? valueText : "").split(' ➔ ');
    return (
      <div className="flex flex-col items-center animate-fade-in w-full max-w-2xl px-4 py-6">
        <div className="p-6 md:p-8 rounded-3xl w-full">
          
          <div className="flex flex-col items-center gap-2">
            {parcours.map((page, index, array) => (
              <React.Fragment key={index}>
                <div className={`
                  group relative flex items-center justify-center px-6 py-3 rounded-2xl shadow-lg transition-all duration-300 hover:scale-105 w-full max-w-sm text-center font-black
                  ${index === 0 ? 'bg-blue-600 text-white ring-4 ring-blue-400/30' : 
                    index === array.length - 1 && estBon > 0 ? 'bg-emerald-600 text-white ring-4 ring-emerald-400/30' : 
                    'text-slate-200 bg-slate-700 border-2 border-slate-600'}
                `}>
                  <span className="truncate">{page}</span>
                  {index === 0 && <span className="absolute -left-3 -top-3 bg-blue-500 text-[10px] px-2 py-1 rounded-full uppercase tracking-tighter">Départ</span>}
                  {index === array.length - 1 && estBon > 0 && <span className="absolute -right-3 -bottom-3 bg-emerald-500 text-[10px] px-2 py-1 rounded-full uppercase tracking-tighter">Arrivée</span>}
                </div>
                
                {index < array.length - 1 && (
                  <div className="flex flex-col items-center">
                    <span className="text-slate-500 font-black text-xl">↓</span>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
        
        {!estBon && parcours.length > 0 && (
          <div className="mt-10 bg-rose-500/20 border-2 border-rose-500/50 px-8 py-3 rounded-2xl">
            <div className="text-rose-500 text-2xl font-black uppercase tracking-widest animate-pulse text-center">
              Objectif non atteint
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center w-full transition-all duration-500 ${isFullscreen ? "h-full flex-1 max-w-none" : "h-full max-w-5xl"}`}>
      <div className="flex flex-row items-center justify-between w-full bg-slate-800 p-3 md:p-4 rounded-t-xl border-2 border-slate-600 border-b-0 shadow-lg gap-2 shrink-0">
        <div className="text-left flex-1 truncate">
          <p className="text-slate-400 text-[10px] md:text-xs uppercase tracking-wider font-bold">Actuel</p>
          <p className="text-blue-400 text-sm md:text-xl font-black truncate">{currentPage}</p>
        </div>
        <button 
          onClick={toggleFullscreen}
          className="bg-slate-700 hover:bg-slate-600 text-white p-2 rounded-lg font-bold text-xl md:text-2xl transition-colors mx-2 shadow-inner"
        >
          {isFullscreen ? "↙️" : "⛶"}
        </button>
        <div className="text-right flex-1 truncate">
          <p className="text-slate-400 text-[10px] md:text-xs uppercase tracking-wider font-bold">Cible</p>
          <p className="text-emerald-400 text-sm md:text-xl font-black truncate">{arrivee}</p>
        </div>
      </div>

      {hasWon ? (
        <div 
          ref={scrollContainerRef}
          className={`w-full bg-white text-black rounded-b-xl p-4 md:p-8 overflow-y-auto shadow-inner wiki-container ${isFullscreen ? "flex-1 min-h-0" : "h-[65vh]"}`}
        >
          <div className="text-6xl md:text-8xl animate-bounce">🏆</div>
          <h2 className="text-3xl md:text-5xl text-emerald-400 font-black mt-4 text-center">CIBLE ATTEINTE !</h2>
          <p className="text-slate-300 mt-4 text-xl">Attente des autres joueurs...</p>
        </div>
      ) : (
        <div 
          ref={scrollContainerRef}
          className={`w-full bg-white text-black rounded-b-xl p-4 md:p-8 overflow-y-auto shadow-inner wiki-container ${isFullscreen ? "h-full" : "h-[65vh]"}`}
        >
          <style>{`
            .wiki-container { font-family: -apple-system, sans-serif; color: #202122; line-height: 1.6; font-size: 16px; }
            .wiki-container h1, .wiki-container h2, .wiki-container h3 { font-family: 'Linux Libertine', Georgia, serif; border-bottom: 1px solid #eaecf0; margin-top: 1.5em; margin-bottom: 0.5em; padding-bottom: 0.25em; font-weight: normal; }
            .wiki-container h1 { font-size: 2em; } .wiki-container h2 { font-size: 1.5em; }
            .wiki-container a:not(.lien-interdit) { color: #3b82f6; text-decoration: none; font-weight: 500; cursor: pointer; position: relative; }
            .wiki-container a:not(.lien-interdit):hover { text-decoration: underline; color: #1d4ed8; }
            .wiki-container a.lien-interdit { 
              color: #94a3b8; 
              cursor: not-allowed; 
              text-decoration: none; 
              pointer-events: none; 
            }
            .wiki-container img { max-width: 100%; height: auto; border-radius: 6px; }
            .wiki-container .infobox { width: 100%; border: 1px solid #a2a9b1; background-color: #f8f9fa; margin: 1em 0; padding: 15px; border-radius: 12px; }
            .wiki-container .infobox th { text-align: left; padding-right: 10px; }
            .wiki-container ul { list-style-type: disc; margin-left: 1.5em; margin-bottom: 1em; }
            .wiki-container .navbox, .wiki-container .metadata, .wiki-container .ambox, .wiki-container .mw-editsection, .wiki-container .reference { display: none !important; }
            
            @keyframes fadeSlideIn {
              from { opacity: 0; transform: translateY(15px); }
              to { opacity: 1; transform: translateY(0); }
            }
            .page-transition {
              animation: fadeSlideIn 0.4s ease-out forwards;
            }

            .wiki-container a[data-destination]:hover::after {
              content: "➔ " attr(data-destination);
              position: absolute;
              bottom: 120%;
              left: 50%;
              transform: translateX(-50%);
              background-color: #1e293b;
              color: #34d399;
              padding: 6px 12px;
              border-radius: 6px;
              font-size: 13px;
              font-weight: bold;
              white-space: nowrap;
              z-index: 1000;
              pointer-events: none;
              box-shadow: 0 4px 10px rgba(0,0,0,0.3);
              animation: popTooltip 0.15s ease-out forwards;
            }

            @keyframes popTooltip {
              from { opacity: 0; transform: translate(-50%, 5px); }
              to { opacity: 1; transform: translate(-50%, 0); }
            }
          `}</style>

          {loading ? (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 font-bold text-2xl animate-pulse min-h-[40vh]">
              <span className="text-5xl mb-4">🌍</span> Voyage en cours...
            </div>
          ) : (
            <div className="page-transition" ref={contentRef} />
          )}
        </div>
      )}
    </div>
  );
});
