
import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

// Import du style et des layouts
import { THEMES_CONFIG, LAYOUTS, DIMENSIONS, CONFIG_VISUELLE } from './theme';

// Import des composants utilitaires
import { BorderTimer } from './components/BorderTimer';
import { Chat } from './components/Chat';
import { PhotoProfil } from './components/PhotoProfil';
import { OtpInput } from './components/OtpInput';
import { ScoreBadge } from './components/ScoreBadge';
import { 
  ButtonRepReview, 
  ButtonRep, 
  BoutonValide, 
  ButtonChoix, 
  SuivantReview, 
  ButtonPret 
} from './components/UI';

// Import des mini-jeux
import { WikipediaGame } from './games/WikipediaGame';
import { ChronologieGame } from './games/ChronologieGame';
import { WordleGame } from './games/WordleGame';
import { PetitBacGame } from './games/PetitBacGame';
import { BombPartyGame } from './games/BombPartyGame';
import { QcmGame } from './games/QcmGame';
import { OuverteGame, DrapeauxGame, MemeGame, CodeTrouGame } from './games/OuverteGame';

// ==================================================================================
// LOGIQUE DE L'APPLICATION
// ==================================================================================

let permanentId = localStorage.getItem('idQuiz');
if (!permanentId) {
    permanentId = Math.random().toString(36).substring(2, 15);
    localStorage.setItem('idQuiz', permanentId);
}

let socket;

export default function App() {
  const [typeJeu, setTypeJeu] = useState("qcm");
  const [gameStat, setGameStat] = useState("lobby");
  const [questionData, setQuestionData] = useState(null);
  const [indexQuestion, setIndexQuestion] = useState(0);
  const [loading, setLoading] = useState(false);
  const [nombreQuestions, setNombreQuestions] = useState(0);
  const [repOuverte, setRepOuverte] = useState("");
  const [lobby, setLobby] = useState([]);
  const [pseudo, setPseudo] = useState("");
  const [isChef, setIsChef] = useState(false);
  const [isPret, setIsPret] = useState(false);
  const [inRoom, setinRoom] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [tempsQuestion, setTempsQuestion] = useState(0);
  const [pseudoReview, setPseudoReview] = useState("");
  const [estBon, setEstBon] = useState(false);
  const [historiqueChat, setHistoriqueChat] = useState([]);
  const [listeResultat, setListeResultat] = useState([]);
  const [resultatsAffiches, setResultatsAffiches] = useState([]);
  const [indexResultat, setIndexResultat] = useState(0);
  const [hasSent, setHasSent] = useState(false);
  const [progress, setProgress] = useState(1);
  const endTimeRef = useRef(null);
  const durationRef = useRef(0);
  const [roomCode, setRoomCode] = useState("");
  const [cantJoin, setCantJoin] = useState(false);
  const [difficulty, setDifficulty] = useState(0);
  const [isWikiFullscreen, setIsWikiFullscreen] = useState(false);

  useEffect(() => {
    const permanentPseudo = localStorage.getItem('pseudoQuiz');
    if (permanentPseudo) {
      setPseudo(permanentPseudo);
    }
  }, []); 
  
  const [currentThemeName] = useState("comic");
  const theme = THEMES_CONFIG[currentThemeName];
  const choixNombreQuestions = ["2", "10", "20", "30"];

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getDimension = () => {
    const currentStatus = loading ? "loading" : (gameStat || "lobby");
    const device = isMobile ? "MOBILE" : "COMPUTER";
    return DIMENSIONS[device][currentStatus] || DIMENSIONS[device].lobby;
  };

  const dimensionContour = getDimension();

  useEffect(() => {
    let frame;
    const update = () => {
      if (!endTimeRef.current || gameStat !== "playing" || loading) {
        frame = requestAnimationFrame(update);
        return;
      }
      const now = Date.now();
      const remaining = endTimeRef.current - now;
      const currentDuration = durationRef.current || 1;
      const newProgress = Math.max(0, remaining / ((currentDuration-0.5) * 1000));
      setProgress(newProgress);
      if (newProgress > 0) {
        frame = requestAnimationFrame(update);
      }
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [gameStat, loading, tempsQuestion]);

  useEffect(() => {
    if (timeLeft === tempsQuestion) setHasSent(false);
    if (timeLeft === 0 && gameStat === "playing" && !hasSent) {
      socket.emit("send_rep", repOuverte);
      setHasSent(true);
    }
  }, [timeLeft, gameStat, hasSent, repOuverte, tempsQuestion]);

  useEffect(() => {
    if (gameStat === "resultat" && indexResultat < listeResultat.length) {
      const timer = setTimeout(() => {
        setResultatsAffiches((prev) => [...prev, listeResultat[indexResultat]]);
        setIndexResultat((prev) => prev + 1);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [gameStat, indexResultat, listeResultat]);

  useEffect(() => {
    if (!socket) {
      socket = io('http://localhost:3001');
      socket.on('connect', () => { console.log("Connecté avec le socket :", socket.id); });
    }

    socket.on('update_lobby', (data) => joueurRejoins(data));
    socket.on('update_pret', (lobby) => updateLobby(lobby));
    socket.on("update_etat", (etat) => {setEstBon(etat)});  
    socket.on('update_chat', (texte) => { setHistoriqueChat((prev) => [...prev, texte]); });
    socket.on('lobby_joined', (roomCode) => { setinRoom(true); setRoomCode(roomCode); });
    socket.on('room_not_found', () => { 
      setCantJoin(true); 
      setTimeout(() => setCantJoin(false), 1000);  
    });

    if (!inRoom) {
       return () => {
        socket.off('update_lobby');
        socket.off("connect");
        socket.off('update_pret');
        socket.off('lobby_joined');
        socket.off('update_etat');
        socket.off("update_chat");
       }
    }

    socket.on('timer_update', (t) => { setTimeLeft(t); });
    socket.on('resultats', (res) => {
      setGameStat("resultat");
      setListeResultat(res);
    });
    socket.on('game_started', ({data,type,difficulty,duration}) => {
      setTempsQuestion(duration);
      durationRef.current = duration;
      setTimeLeft(duration);
      setDifficulty(difficulty);
      setIndexQuestion(1);
      setGameStat("playing");
      endTimeRef.current = Date.now() + (duration * 1000);
      setTypeJeu(type);
      setQuestionData(data);
      setRepOuverte("");
      setLoading(false);
    });

    socket.on('new_question', ({data,type,duration,difficulty}) => {
      setTimeLeft(duration);
      setTempsQuestion(duration);
      durationRef.current = duration;
      setDifficulty(difficulty);
      endTimeRef.current = Date.now() + (duration * 1000);
      setTypeJeu(type);
      setQuestionData(data);
      setRepOuverte("");
      setLoading(false);
      setIsWikiFullscreen(false);
      setTimeout(() => {
        setIndexQuestion(prev => prev + 1);
      }, 500);
    });

    socket.on('loading_status', (isLoading) => { setLoading(isLoading); });
    socket.on('question_review', (question,type,difficulty,rep,pseudo) => {
      setGameStat("review");
      setDifficulty(difficulty);
      setQuestionData(question);
      setPseudoReview(pseudo);
      setRepOuverte(rep);
      setTypeJeu(type);
    });
    socket.on('updateNbQuestions', (n) => { setNombreQuestions(n); });

    return () => {
      socket.off('update_lobby');
      socket.off('game_started');
      socket.off('new_question');
      socket.off('loading_status');
      socket.off('update_nb_questions');
      socket.off('connect');
      socket.off('lobby_joined');
      socket.off('timer_update');
    };
  }, [inRoom]);

  const rejoindreLobby = (roomCode) => {
    if (pseudo) {
      localStorage.setItem('pseudoQuiz', pseudo);
      socket.emit('join_lobby', { pseudo: pseudo, permanentId: permanentId, roomCode: roomCode });
    }
  };

  const creerLobby = () => { 
    if (pseudo) {
      localStorage.setItem('pseudoQuiz', pseudo);
      socket.emit('create_lobby', { pseudo: pseudo, permanentId: permanentId });
    }
  };

  const joueurRejoins = (data) => {
    if (data.joueurs) {
      updateLobby(data.joueurs);
      setNombreQuestions(data.nbQuestions);
    } else {
        updateLobby(data);
    }
  };

  const seMettrePretSocket = () => { setIsPret(true); socket.emit('ready'); };
  
  const updateLobby = (lobbyData) => {
    setLobby(lobbyData);
    if (lobbyData.length > 0) {
      if (lobbyData[0].permanentId === permanentId) { setIsChef(true); }
    }
  };

  const annulerPretSocket = () => { setIsPret(false); socket.emit('unready'); };
  const isinRoom = () => { return lobby.find(j => j.permanentId === permanentId); };

  const lancerPartieSocket = () => {
    setLoading(true);
    socket.emit('start_game', nombreQuestions);
  };

  const nextReview = () => {
    if (gameStat === "review") { socket.emit('next_review', estBon); }
    else { socket.emit('next_review', null); }
  };

  const tousPrets = () => { return lobby.every(j => j.pret); };
  const changeEtat = (etat) => { if (isChef) socket.emit("change_etat", etat); };
  const changerNbQuestions = (n) => { socket.emit('change_nb_questions', n); };
  const envoyerChat = (texte) => { socket.emit('send_chat', texte); };

  const afficherContenuQuestion = (isReviewing) => {
    const questionTitle = !isWikiFullscreen && (
      <h1 className={`${theme.container.glassHeader} mb-2`}>
        {questionData?.question}
      </h1>
    );

    const pointsBadge = !isWikiFullscreen && (
      <ScoreBadge 
        points={isReviewing && typeJeu === "petitBac" && Array.isArray(estBon) ? estBon.filter(Boolean).length : difficulty} 
        theme={theme} 
        className="mb-4" 
      />
    );

    const reviewImage = isReviewing && (typeJeu === "drapeau" || typeJeu === "devineMeme") && (
      <div className="mb-6 relative">
        <img 
          src={questionData.image} 
          alt="Question"
          className={`w-48 h-auto rounded-2xl border-4 border-white shadow-xl ${typeJeu === "devineMeme" ? "blur-0" : ""}`} 
        />
      </div>
    );

    const reviewInfo = isReviewing && (
      <div className="bg-purple-600 text-white px-6 py-1 rounded-full font-black text-lg uppercase tracking-wider shadow-md mb-6">
        {pseudoReview}
      </div>
    );

    const solutionBox = (label = "Réponse :", solution = questionData?.reponse) => isReviewing && (
      <div className="w-full max-w-md mt-6">
        <label className={`${theme.text.label} mb-1 block`}>{label}</label>
        <div className={`${theme.input.game} bg-emerald-100 border-emerald-500 text-emerald-800 flex items-center justify-center min-h-[3rem] h-auto py-2`}>
          {solution}
        </div>
      </div>
    );

    switch (typeJeu) {  
      case "ouverte":
        return ( 
          <div className="flex flex-col items-center w-full">
            {questionTitle}
            {pointsBadge}
            {reviewImage}
            {reviewInfo}
            <OuverteGame 
                remplirText={setRepOuverte} 
                valueText={repOuverte}
                review={isReviewing}
                theme={theme}
            />
            {solutionBox()}
          </div>
        );

      case "qcm":
        return ( 
          <div className="flex flex-col h-full w-full pb-8 items-center">
            {questionTitle}
            {pointsBadge}
            {reviewImage}
            {reviewInfo}
            <QcmGame 
              options={questionData.options}
              onChoixFait={setRepOuverte}
              repOuverte={repOuverte}
              theme={theme}
              review={isReviewing}
              valueText={repOuverte}
              vraieReponse={questionData.reponse}
            />
            {solutionBox()}
          </div>
        );

      case "drapeau": 
        return (
          <div className="flex flex-col items-center w-full">
            {questionTitle}
            {pointsBadge}
            {reviewImage}
            {reviewInfo}
            <DrapeauxGame 
              image={questionData.image} 
              remplirText={setRepOuverte} 
              valueText={repOuverte}
              review={isReviewing}
              theme={theme}
            />
            {solutionBox()}
          </div>
        );

      case 'codeTrou':
        return (
          <div className="flex flex-col items-center w-full">
            {questionTitle}
            {pointsBadge}
            {reviewImage}
            {reviewInfo}
            <CodeTrouGame 
              code={questionData.code} 
              langage={questionData.langage}
              remplirText={setRepOuverte} 
              valueText={repOuverte}
              review={isReviewing}
              theme={theme}
            />
            {!isReviewing && (
               <div className="w-full mt-4">
                 <input 
                   type="text" 
                   placeholder="Complète le code..." 
                   value={repOuverte} 
                   onChange={(e) => setRepOuverte(e.target.value)} 
                   className={theme.input.game}
                 />
               </div>
            )}
            {solutionBox("Vraie Réponse :")}
          </div>
        );

      case 'devineMeme':
        return (
          <div className="flex flex-col items-center w-full">
            {questionTitle}
            {pointsBadge}
            {reviewImage}
            {reviewInfo}
            <MemeGame 
              image={questionData.image} 
              remplirText={setRepOuverte} 
              valueText={repOuverte}
              review={isReviewing}
              theme={theme}
            />
            {solutionBox()}
          </div>
        );

      case 'chronologie':
        return (
          <div className="flex flex-col items-center w-full">
            {questionTitle}
            {pointsBadge}
            {reviewImage}
            {reviewInfo}
            <ChronologieGame 
              items={questionData.items} 
              remplirText={setRepOuverte} 
              valueText={repOuverte}
              review={isReviewing}
              vraieReponse={questionData.reponse}
              theme={theme}
            />
            {isReviewing && <div className="mt-4"></div>}
          </div>
        );

      case 'petitBac':
        return (
          <div className="flex flex-col items-center w-full">
            {questionTitle}
            {pointsBadge}
            {reviewImage}
            {reviewInfo}
            <PetitBacGame 
              categories={questionData.categories}
              lettre={questionData.lettre}
              remplirText={setRepOuverte} 
              valueText={repOuverte}
              review={isReviewing}
              theme={theme}
              isChef={isChef}
              etatLignes={estBon}
              changeEtat={changeEtat}
            />
          </div>
        );

      case 'bombParty':
        return (
          <div className="flex flex-col items-center w-full">
            {questionTitle}
            {pointsBadge}
            {reviewImage}
            {reviewInfo}
            <BombPartyGame 
              socket={socket}
              review={isReviewing}
              pseudoReview={pseudoReview} 
              estBon={estBon}
              theme={theme}
            />
            {solutionBox("Solution possible :", questionData?.reponse)}
          </div>
        );

      case 'wikipedia':
        return (
          <div className="flex flex-col items-center w-full h-full">
            {isReviewing && (
              <>
                {questionTitle}
                {pointsBadge}
                {reviewInfo}
              </>
            )}
            <WikipediaGame 
              depart={questionData.depart}
              arrivee={questionData.arrivee}
              socket={socket}
              review={isReviewing}
              pseudoReview={pseudoReview} 
              remplirText={setRepOuverte}
              valueText={repOuverte}
              estBon={isReviewing ? difficulty : estBon} // Utilise le score réel pendant la review
              theme={theme}
              isFullscreen={isWikiFullscreen}
              toggleFullscreen={() => setIsWikiFullscreen(!isWikiFullscreen)}
            />
          </div>
        );

      case 'wordle':
        return (
          <div className="flex flex-col items-center w-full">
            {questionTitle}
            {pointsBadge}
            {reviewImage}
            {reviewInfo}
            <WordleGame 
              socket={socket}
              reponse={questionData?.reponse}
              longueur={questionData?.longueur}
              remplirText={setRepOuverte} 
              valueText={repOuverte}
              review={isReviewing}
              pseudoReview={pseudoReview}
              estBon={estBon}
              theme={theme}
            />
          </div>
        );

      default:
        return <p className="text-white">Chargement du type de question...</p>;
    }
  };

//<Chat historiqueChat={historiqueChat} onClick={envoyerChat} theme={theme}/>

  return (
    <div style={{backgroundImage: `${theme.bg.image}`,backgroundColor: `${theme.bg.color}`}} className={LAYOUTS.main}>
      
      <BorderTimer progress={progress} visible={gameStat === "playing" && !loading} color={timeLeft < 5 ? "#ef4444" : "#3b82f6"} isFullscreen={isWikiFullscreen}>
        <div 
          className={`${LAYOUTS.card} ${isWikiFullscreen ? LAYOUTS.fullscreen : `${theme.container.card} shadow-2xl`}`}
          style={{
            width: isWikiFullscreen ? '100vw' : (isMobile ? '100vw' : `min(95vw, ${dimensionContour.split(' ')[0].replace('w-', '') * 4}px)`),
            height: isWikiFullscreen ? '100vh' : (isMobile ? '100vh' : `min(95vh, ${dimensionContour.split(' ')[1].replace('h-', '') * 4}px)`),
          }}
        >
          {gameStat === "lobby" && !loading ? (
            !inRoom ? (
              <div className={LAYOUTS.lobby}>
                <PhotoProfil />
                <div className="w-full relative z-45">
                  <label className={theme.text.title}> Pseudo </label>
                  <input 
                    value={pseudo} 
                    onChange={(e) => setPseudo(e.target.value)}   
                    placeholder="Écris ton pseudo..." 
                    className={theme.input.lobby}
                  />
                </div>  
                <button onClick={creerLobby} className={`w-full relative z-45 ${theme.button.primary} mt-7 mb-7`}>
                  {isinRoom() ? "Changer de pseudo" : "Créer le salon"}
                </button>
                <div className='flex flex-row'> 
                  <OtpInput pseudoExist={pseudo.length > 0} cantJoin={cantJoin} theme={theme} onComplete={rejoindreLobby}/>
                </div>
              </div>
            ) : (
              <div className='flex flex-col w-full h-full items-center'>
                <div className={LAYOUTS.room}>
                  <div className="flex flex-col items-center mb-8">
                     <p className="text-purple-900 font-black uppercase text-[10px] tracking-[0.3em] mb-2 opacity-70">Salon Privé</p>
                     <div className="bg-slate-200 backdrop-blur-sm px-10 py-4 rounded-3xl border-4 border-purple-600 shadow-[0_10px_0_rgb(147,51,234)] transform -rotate-1">
                        <h2 className="text-4xl md:text-6xl font-black text-purple-700 tracking-[0.15em] drop-shadow-sm">
                          {roomCode}
                        </h2>
                     </div>
                  </div>
                  <div className="w-full flex flex-col items-center">
                    <h2 className={LAYOUTS.playersListTitle}>Joueurs connectés ({lobby.length})</h2>
                    <div className={LAYOUTS.playersList}>
                      {lobby.map((j,index) => (
                        <div key={j.id} className={`flex h-[40px] items-center justify-between pr-1 rounded-2xl border-2 transition-all duration-300 transform
                          ${j.pret ? "bg-emerald-500/10 border-emerald-500 shadow-[0_4px_0_rgb(16,185,129)]" : "bg-white/80 border-purple-200 shadow-[0_4px_0_rgb(233,213,255)]"}
                          ${j.id === socket?.id ? "ring-4 ring-purple-400/30" : ""}
                        `}>
                          <div className="flex items-center">
                             {index === 0 ? 
                               <img className='w-8 h-8 animate-bounce' src='/images/couronne.png' alt="chef" />
                               : 
                               <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center font-black text-purple-400 text-xs">
                                 {index + 1}
                               </div>
                             }
                             <span className={`font-black text-lg truncate max-w-[140px] ${j.pret ? "text-emerald-700" : "text-purple-900"}`}>
                               {j.pseudo} {j.id === socket?.id ? "(Moi)" : ""}
                             </span>
                          </div>
                          <div className={`px-3 py-1 rounded-full font-black text-[10px] uppercase tracking-tighter ${j.pret ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"}`}>
                             {j.pret ? "Prêt !" : "Attente"}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className='flex flex-col items-center mb-2 w-full'>
                    <label className={`${theme.text.label} text-center mb-3 block text-lg`}>Combien de questions ?</label>
                    <div className='flex flex-wrap justify-center gap-1'>
                      {choixNombreQuestions.map((nb,idx) => (
                        <ButtonChoix key={idx} valeur={nb} changerChoix={changerNbQuestions} isSelected={nombreQuestions === nb} isChef={isChef} theme={theme}/>
                      ))}
                    </div>
                  </div>
                  <div className="w-full flex justify-center mt-2">
                    {isChef 
                      ? <ButtonPret theme={theme} tousPrets={tousPrets()} lancerPartieSocket={lancerPartieSocket} texte="🚀 LANCER LA PARTIE"/>
                      : <ButtonPret theme={theme} tousPrets={isinRoom()} lancerPartieSocket={isPret ? annulerPretSocket : seMettrePretSocket} texte={isPret ? "PAS PRÊT" : "PRÊT"}/>
                    }
                  </div>
                </div>
              </div>
            )
          ) : gameStat === "playing" || loading ? (
            <div className={LAYOUTS.gameView}>
              {!loading && !isWikiFullscreen && (
                <div className={LAYOUTS.timerContainer}>
                  <div className={`${CONFIG_VISUELLE.MOBILE.timerText} ${CONFIG_VISUELLE.COMPUTER.timerText} font-bold ${timeLeft < 5 ? 'text-red-500 animate-pulse' : 'text-blue-600'}`}>
                      {timeLeft}s
                  </div>
                </div>
              )}
              <div className={`${LAYOUTS.contentArea} ${isWikiFullscreen ? "p-0" : "p-4 md:p-6"}`}>
                {loading ? (
                  <div className="m-auto flex items-center justify-center">
                    <h1 className={theme.text.loading}>{gameStat === "review" ? "Résultats..." :  "Génération de la question..."}</h1>
                  </div>
                ) : (
                  afficherContenuQuestion(false)
                )}
              </div>
              {!loading && !isWikiFullscreen && (
                <div className={LAYOUTS.progressBar}>
                  <div style={{backgroundColor:"rgba(147,51,234, 0.3)"}} className={LAYOUTS.progressBarBg}>
                      <div className="bg-purple-600 h-full rounded-full transition-all duration-1000" style={{ width: `${(indexQuestion / nombreQuestions) * 100}%` }}></div> 
                  </div>
                </div>
              )}
            </div>
          ) : gameStat === "review" ? (
            <div className={LAYOUTS.reviewView}>
              <div className={LAYOUTS.reviewContent}>
                 {afficherContenuQuestion(true)}
              </div>
              <div className={LAYOUTS.reviewFooter}>
                {typeJeu !== "petitBac" && typeJeu !== "bombParty" && (
                  <BoutonValide changeEtat={changeEtat} theme={theme} etat={estBon} isChef={isChef}/>
                )}
                {isChef && <SuivantReview theme={theme} passerSuivant={nextReview}/>}
              </div>
            </div>
          ) : gameStat === "resultat" ? (
            <div className={LAYOUTS.results}>
              <h2 className={theme.text.resultTitle}>RÉSULTATS</h2>
              <div className={LAYOUTS.resultsList}>
                {resultatsAffiches.map((result,idx) => (
                  <div key={idx} className={LAYOUTS.resultsItem}> 
                    <span>{idx + 1}. {result.pseudo}</span>
                    <ScoreBadge points={result.score} theme={theme} className="scale-75" />
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </BorderTimer>
    </div>
  );
}
