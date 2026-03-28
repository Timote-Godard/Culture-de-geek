
// ==================================================================================
// 1. CONFIGURATION ATOMIQUE (Couleurs & Ombres de base)
// ==================================================================================

export const COLORS = {
  purple: {
    main: "rgb(147,51,234)", // Pour usage JS si besoin (canvas etc)
    text: "text-purple-600",
    textDark: "text-purple-900",
    bg: "bg-purple-400",
    border: "border-purple-600",
  },
  slate: {
    bg: "bg-slate-100",
    text: "text-slate-100",
    disabled: "bg-slate-300 cursor-not-allowed"
  },
  status: {
    success: "bg-emerald-500",
    successLight: "bg-emerald-300",
    error: "bg-rose-400",
    neutral: "bg-slate-200"
  },

  hover: "hover:cursor-pointer hover:brightness-100 brightness-95"
};

export const SHADOWS = {
  // L'ombre violette standard utilisée partout
  color: "rgb(147,51,234)", 
  
  // Les définitions CSS complètes
  small: {
    css: "shadow-[0_6px_0_rgb(147,51,234)]",
    active: "active:translate-y-[6px] active:shadow-none"
  },
  large: {
    css: "shadow-[0_15px_0_rgb(147,51,234)]",
    active: "active:translate-y-[15px] active:shadow-none"
  },
  input: {
    css: "shadow-[0_4px_0_rgb(147,51,234)]"
  }
};

export const PALETTE_LUMIERE = {
  contour: "rounded-xl border border-blue-500/30 ring-1 ring-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.5)]"
}

// ==================================================================================
// 4. STRUCTURES ET MISES EN PAGE (Layouts Responsifs)
// ==================================================================================

// Vous pouvez modifier ici séparément l'aspect Mobile et Ordinateur
export const CONFIG_VISUELLE = {
  MOBILE: {
    card: "w-full h-full rounded-none border-none p-4 ring-0",
    lobby: "flex w-full flex-col p-4",
    room: "w-full flex-col",
    timerText: "text-3xl",
    glassHeader: "p-4 text-sm",
  },
  COMPUTER: {
    card: "md:rounded-3xl md:ring-8 md:p-8 md:shadow-2xl",
    lobby: "md:w-96 md:flex-col md:p-7 md:gap-3",
    room: "md:w-full md:flex-col md:p-5",
    timerText: "md:text-4xl",
    glassHeader: "md:p-8 md:text-3xl",
  }
};

export const DIMENSIONS = {
  // Mobile (Valeurs par défaut)
  MOBILE: {
    lobby: "w-full h-full",
    loading: "w-full h-60",
    playing: "w-full h-full",
    review: "w-full h-full",
    resultat: "w-full h-full"
  },
  // Ordinateur (Appliqué avec md:)
  COMPUTER: {
    lobby: "w-115 h-180",
    loading: "w-180 h-80",
    playing: "w-400 h-250",
    review: "w-400 h-220",
    resultat: "w-200 h-200"
  }
};

export const LAYOUTS = {
  // Global
  main: "bg-cover bg-center h-screen w-screen overflow-hidden flex items-center justify-center relative",
  card: `transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] ring-inset ring-[rgba(226,232,240,0.3)] flex flex-col relative overflow-hidden ${CONFIG_VISUELLE.MOBILE.card} ${CONFIG_VISUELLE.COMPUTER.card}`,
  fullscreen: "fixed inset-0 !max-w-none !max-h-none bg-slate-900 rounded-none border-none !p-0 z-[101]",

  // Lobby
  lobby: `${CONFIG_VISUELLE.MOBILE.lobby} ${CONFIG_VISUELLE.COMPUTER.lobby} rounded-xl items-center`,
  room: `${CONFIG_VISUELLE.MOBILE.room} ${CONFIG_VISUELLE.COMPUTER.room} flex flex-col items-center`,
  playersList: `grid grid-cols-1 gap-2 md:gap-3 w-full h-[25vh] md:h-[20vh] overflow-y-auto custom-scrollbar p-2 mb-4 md:mb-6 rounded-xl ${COLORS.slate.bg} ${COLORS.purple.border} ${COLORS.purple.textDark} ${SHADOWS.input.css} text-xl md:text-2xl text-center`,
  playersListTitle: "mb-1 font-black text-xs md:text-base text-purple-900 uppercase tracking-widest text-center w-full block",

  // Game & UI
  gameView: "h-full w-full flex flex-col",
  timerContainer: "shrink-0 flex flex-col items-center pt-1 md:pt-6 z-0",
  contentArea: "flex-1 w-full flex flex-col items-center",
  progressBar: "shrink-0 w-full p-3 md:p-6 pt-1 md:pt-2 z-10",
  progressBarBg: "w-full h-3 md:h-4 rounded-full overflow-hidden shadow-inner",
  
  // Question internals
  questionHeader: "flex flex-col w-full gap-1 md:gap-2 items-center text-center ",
  optionsGrid: "grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4 w-full px-2 md:px-0 mb-4 md:mb-8",

  // Review
  reviewView: "h-full w-full flex flex-col",
  reviewContent: "flex-1 overflow-y-auto w-full p-4 md:p-6 pb-2 flex flex-col items-center custom-scrollbar",
  reviewFooter: "shrink-0 w-full p-4 px-6 flex flex-col md:flex-row justify-center md:justify-end gap-2 md:gap-4 z-10",

  // Results
  results: "w-full max-w-4xl p-4 md:p-5 flex flex-col h-full",
  resultsList: "flex flex-col gap-2",
  resultsItem: "bg-white/90 p-4 rounded-xl flex justify-between items-center font-bold text-purple-800 animate-bounce",
};

export const COMPONENTS = {
  chat: {
    container: "fixed bottom-0 right-4 md:right-10 z-[110] flex flex-col bg-purple-400 w-[calc(100%-2rem)] md:w-80 h-80 md:h-96 rounded-t-2xl shadow-[0_120px_0_rgb(147,51,234)] transition-transform duration-500 ease-[cubic-bezier(0.34,1.20,0.64,1)]",
    button: `absolute -top-10 right-0 h-10 px-4 rounded-t-xl border-t-2 border-l-2 border-r-2 border-purple-600 border-b-0 font-bold text-base transition-all duration-300 flex items-center gap-2 border-2 border-purple-600 bg-slate-100 text-purple-600 p-2 rounded-t-xl font-bold transition-all shadow-[0_4px_0_rgb(147,51,234)] ${COLORS.hover} active:translate-y-[4px] active:shadow-none`,
    history: "h-56 md:h-70 overflow-y-scroll shadow-[inset_0_2px_10px_rgba(0,0,0,0.3)] rounded-xl p-2 text-purple-900 bg-slate-50/50",
    input: "p-2 md:p-3 border-2 mt-1 text-purple-800 border-[rgba(0,0,0,0.1)] transition-all duration-100 outline-none focus:shadow-[inset_0_2px_8px_rgba(0,0,0,0.3)] rounded-xl w-full text-sm md:text-base",
    sendBtn: "w-max border border-[rgba(0,0,0,0.3)] rounded-xl font-bold text-[rgba(0,0,0,0.5)] shadow-[0_3px_0_rgba(0,0,0,0.3)] hover:cursor-pointer active:translate-y-[3px] active:shadow-none mt-1 ml-1 mb-1 p-1 px-4 md:px-5",
  },
  photoProfil: {
    container: "relative h-44 w-40 flex items-end justify-center group cursor-pointer mx-auto mb-10 mt-5 z-0",
    bgCircle: "absolute bottom-0 w-40 h-40 bg-white rounded-full border-4 border-purple-600 transition-all duration-300",
    avatarWrapper: "relative z-10 w-36 h-full mb-1 items-end justify-center overflow-visible transition-all duration-300 -translate-y-3",
    cache: "absolute top-full z-0 w-50 h-50 bg-purple-400 pointer-events-none",
    bottomRim: "absolute bottom-0 z-20 w-40 h-20 rounded-b-full border-b-4 border-l-4 border-r-4 border-purple-600 pointer-events-none transition-all duration-300",
  }
};

// ==================================================================================
// 2. STRUCTURES DE BASE (Molécules - Formes réutilisables)
// ==================================================================================

export const BASES_COMIC = {
  // Le squelette de tous les boutons
  btn: `transition-all ease-in-out font-bold z-45 rounded-xl border-2 flex items-center justify-center`,
  
  // Le squelette de tous les inputs
  input: "p-2 border-2 rounded-xl w-full text-xl z-45 font-bold outline-none placeholder-slate-300 transition-all",
  
  // Le squelette des cartes/conteneurs
  card: "transition-all duration-500 ease-in-out rounded-3xl"
};

export const BASES_LUMIERE = {
  // Le squelette de tous les boutons
  btn: `transition-all ease-in-out font-bold rounded-xl border-2 ${COLORS.hover} flex items-center justify-center`,
  
  
  // Le squelette de tous les inputs
  input: "p-2 border-2 rounded-xl w-full text-lg font-bold outline-none placeholder-slate-300 transition-all",
  
  // Le squelette des cartes/conteneurs
  card: "transition-all duration-500 ease-in-out rounded-3xl"
};

// ==================================================================================
// 3. ASSEMBLAGE FINAL DU THÈME (Organismes - À utiliser dans le JSX)
// ==================================================================================

export const THEMES_CONFIG = {
  comic: {
    name: "comic",

    bg: {
      color: "none",
      image: "url(/images/bg.jpg)",
    },
    
    container: {
      centered: "flex items-center justify-center min-h-screen bg-cover bg-center",
      // La carte principale (Lobby, Jeu, etc.)
      card: `${COLORS.purple.bg} ${BASES_COMIC.card} flex flex-col gap-4 justify-center `,
      // Le header blanc "verre" pour les questions
      glassHeader: "w-full p-3 md:p-5 text-lg md:text-2xl font-black text-purple-700 bg-white/90 backdrop-blur-md rounded-2xl md:rounded-3xl border-b-[6px] md:border-b-[10px] border-purple-900/20 text-center uppercase leading-tight md:leading-normal",
    },

    input: {
      // Input standard (Lobby)
      lobby: `${BASES_COMIC.input} ${COLORS.slate.bg} ${COLORS.purple.border} ${COLORS.purple.text} ${SHADOWS.input.css} text-base md:text-xl`,
      // Input de jeu (plus gros)
      game: `${BASES_COMIC.input} ${COLORS.slate.bg} ${COLORS.purple.border} ${COLORS.purple.textDark} ${SHADOWS.input.css} text-xl md:text-2xl h-10 md:h-12 text-center`,

      disabled: `${BASES_COMIC.input} ${COLORS.purple.border} ${COLORS.purple.text} ${SHADOWS.input.css} ${COLORS.slate.disabled}`,
    },

    button: {
      // Bouton standard (Menu, Prêt, Lobby)
      disabled:`
        ${BASES_COMIC.btn} brightness-95
        ${COLORS.slate.bg} ${COLORS.purple.text} ${COLORS.purple.border} 
        translate-y-[4px] md:translate-y-[6px]  ${COLORS.slate.disabled}
        p-3 md:p-4 text-lg md:text-xl
      `,

      primary: `
        ${BASES_COMIC.btn} ${COLORS.hover}
        ${COLORS.slate.bg} ${COLORS.purple.text} ${COLORS.purple.border} 
        ${SHADOWS.small.css} ${SHADOWS.small.active}
        p-3 md:p-4 text-lg md:text-xl
      `,
      
      // Gros bouton de réponse (Jeu) - ADAPTÉ MOBILE
      gameAnswer: `
        ${BASES_COMIC.btn} ${COLORS.hover}
        ${COLORS.slate.bg} ${COLORS.purple.text} ${COLORS.purple.border}
        ${SHADOWS.large.css} ${SHADOWS.large.active}
        p-2 w-full md:w-120 h-14 md:h-50 md:mr-15 mt-1 md:mt-5 mb-1 md:mb-5 text-sm md:text-xl
      `,

      // Petit bouton carré (Choix nombres)
      choice: `
        ${BASES_COMIC.btn} ${COLORS.hover}
        bg-slate-100 ${COLORS.purple.text} ${COLORS.purple.border}
        ${SHADOWS.small.css} ${SHADOWS.small.active}
        p-2 w-12 md:w-15 h-max mr-1 md:mr-2 text-base md:text-xl
      `,

      choiceDisabled: `
        ${BASES_COMIC.btn} 
         ${COLORS.slate.disabled} ${COLORS.purple.text} ${COLORS.purple.border}
        ${SHADOWS.small.css} 
        p-2 w-12 md:w-15 h-max mr-1 md:mr-2 text-base md:text-xl
      `,

      // États spécifiques
      stateQcm: {
        wrong: `font-bold rounded-xl border-2
          ${COLORS.status.error} ${COLORS.purple.text} ${COLORS.purple.border}
          ${SHADOWS.large.css}
          p-2 w-full md:w-120 h-14 md:h-50 md:mr-15 mt-1 md:mt-5 mb-1 md:mb-5 text-sm md:text-xl}`,

        correct: `font-bold rounded-xl border-2
          ${COLORS.status.success} ${COLORS.purple.text} ${COLORS.purple.border}
          ${SHADOWS.large.css}
          p-2 w-full md:w-120 h-14 md:h-50 md:mr-15 mt-1 md:mt-5 mb-1 md:mb-5 text-sm md:text-xl}`,

        neutral: `font-bold rounded-xl border-2
          ${COLORS.status.neutral} ${COLORS.purple.text} ${COLORS.purple.border}
          ${SHADOWS.large.css}
          p-2 w-full md:w-120 h-14 md:h-50 md:mr-15 mt-1 md:mt-5 mb-1 md:mb-5 text-sm md:text-xl}`,
          pressed: "translate-y-[6px] shadow-none brightness-100",
          pressedGame: "translate-y-[12px] md:translate-y-[15px] shadow-none brightness-100",
          disabled: "opacity-50 cursor-not-allowed active:translate-y-0 active:shadow-[0_6px_0_rgb(147,51,234)]"

        },

        stateBtnBon: {
        wrong: `
          ${BASES_COMIC.btn} ${COLORS.status.error} 
          ${COLORS.purple.text} ${COLORS.purple.border} 
        ${SHADOWS.small.css} ${SHADOWS.small.active} ${COLORS.hover}
        p-3 md:p-4 text-lg md:text-xl`,
          disabled: "opacity-50 cursor-not-allowed active:translate-y-0 active:shadow-[0_6px_0_rgb(147,51,234)]",

        correct: `
          ${BASES_COMIC.btn} ${COLORS.status.success}
          ${COLORS.purple.text} ${COLORS.purple.border} 
        ${SHADOWS.small.css} ${SHADOWS.small.active}
        p-3 md:p-4 text-lg md:text-xl`,

        },
        
      },

    text: {
      label: "text-purple-900 font-black text-[10px] md:text-sm uppercase ml-1 w-full",
      title: "text-slate-100 font-bold text-xs md:text-sm uppercase ml-1",
      timer: "text-2xl md:text-4xl font-bold",
      loading: "text-slate-100 font-black text-3xl md:text-5xl text-center",
      reviewPseudo: "text-center text-2xl md:text-4xl mb-3 md:mb-5 font-bold text-slate-100 drop-shadow-md w-full",
      resultTitle: "text-2xl md:text-3xl font-black text-white text-center mb-6 md:mb-8",
      code: {
        normal: "text-purple-900 font-black text-lg md:text-2xl ml-1 font-semibold outline-none border-b-2 border-cyan-500 focus:border-purple-400 transition-colors uppercase",
        wrong: "text-rose-500 font-black text-lg md:text-2xl ml-1 font-semibold outline-none border-b-2 border-rose-500 focus:border-rose-400 transition-colors uppercase",
      }
    }
  },


  lumiere: {
    name: "lumière",
    
    bg: {
      color: "rgb(0,0,0)",
      image: `linear-gradient(rgba(0,0,0,0.9), rgba(0,0,0,0.9)), url(images/bg.jpg)`,
    },

    container: {
      centered: "flex items-center justify-center min-h-screen bg-cover bg-center",
      // La carte principale (Lobby, Jeu, etc.)
      card: `bg-slate-900 p-8 ${PALETTE_LUMIERE.contour} ${BASES_LUMIERE.card} p-10 flex flex-row gap-4`,
      // Le header blanc "verre" pour les questions
      glassHeader: "flex-1 w-full p-8 text-3xl font-black text-purple-700 bg-white/90 backdrop-blur-md rounded-3xl border-b-[10px] border-purple-900/20 text-center uppercase",
    },

    input: {
      // Input standard (Lobby)
      lobby: `${BASES_LUMIERE.input} ${COLORS.slate.bg} ${COLORS.purple.border} ${COLORS.purple.text} ${SHADOWS.input.css}`,
      // Input de jeu (plus gros)
      game: `${BASES_LUMIERE.input} ${COLORS.slate.bg} ${COLORS.purple.border} ${COLORS.purple.textDark} ${SHADOWS.input.css} text-2xl h-12 text-center`,
    },

    button: {
      // Bouton standard (Menu, Prêt, Lobby)
      primary: `
        ${BASES_LUMIERE.btn} 
        ${COLORS.slate.bg} ${COLORS.purple.text} ${PALETTE_LUMIERE.contour} 
        ${SHADOWS.small.css} ${SHADOWS.small.active}
        p-4 text-xl
      `,
      
      // Gros bouton de réponse (Jeu)
      gameAnswer: `
        ${BASES_LUMIERE.btn}
        ${COLORS.slate.bg} ${COLORS.purple.text} ${COLORS.purple.border}
        ${SHADOWS.large.css} ${SHADOWS.large.active}
        p-2 w-120 h-50 mr-15 mt-5 mb-5 text-xl
      `,

      // Petit bouton carré (Choix nombres)
      choice: `
        ${BASES_LUMIERE.btn}
        bg-slate-200 ${COLORS.purple.text} ${COLORS.purple.border}
        ${SHADOWS.small.css} ${SHADOWS.small.active}
        p-2 w-15 h-max mr-2 text-xl
      `,

      // États spécifiques
      state: {
        pressed: "translate-y-[6px] shadow-none brightness-100",
        pressedGame: "translate-y-[15px] shadow-none brightness-100",
        disabled: "opacity-50 cursor-not-allowed active:translate-y-0 active:shadow-[0_6px_0_rgb(147,51,234)]"
      }
    },

    text: {
      label: "text-purple-900 font-black text-sm uppercase ml-1",
      title: "text-slate-100 font-bold text-sm uppercase ml-1",
      timer: "text-4xl font-bold",
      loading: "text-slate-100 font-black text-5xl text-center",
      reviewPseudo: "text-center text-4xl mb-5 font-bold text-slate-100 drop-shadow-md w-full",
      resultTitle: "text-3xl font-black text-white text-center mb-8",
    }
  }
};
