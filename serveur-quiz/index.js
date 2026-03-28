const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
require('dotenv').config();

// --- IMPORTS DES MODULES LOCAUX ---
const {
  typesDisponibles,
  tempsType,
  descriptionsJeux,
  nomsJeux,
  syllabesBomb
} = require('./constants');

const {
  dictionnaireFr,
} = require('./dataLoader');

const {
  genererRgbLocal,
  genererWordleLocal,
  genererWikipedia,
  genererPetitBacLocal,
  genererCodeTrouLocal,
  memeFlou,
  genererQuestionOuverteLocale,
  genererChronologieLocale,
  genererQuestionQcmLocale,
  devineDrapeau
} = require('./gameGenerators');

const {
  generateRoomCode,
  getResultatFin,
  getBombStatePayload,
  nextBombPlayer
} = require('./roomUtils');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

let rooms = {};

// --- LOGIQUE DE JEU ---

const demarrerTimer = (roomCode) => {
    const room = rooms[roomCode];
    if (room.timerInterval) clearInterval(room.timerInterval); 
    room.tempsRestant = tempsType[room.type]; 
    
    room.timerInterval = setInterval(() => {
        room.tempsRestant--;

        if (room.type === 'bombParty' && room.bombData) {
            room.bombData.turnTimeLeft--;
            if (room.bombData.turnTimeLeft <= 0) {
                const currentPlayer = room.joueurs[room.bombData.currentPlayerIndex];
                room.bombData.vies[currentPlayer.permanentId]--; 
                nextBombPlayer(room);
            }
            io.to(roomCode).emit('bomb_update', getBombStatePayload(room));
        }

        io.to(roomCode).emit('timer_update', room.tempsRestant);

        if (room.tempsRestant <= 0) {
            clearInterval(room.timerInterval);
            room.timerInterval = null;
            io.to(roomCode).emit('timer_update', 0); 

            if (room.type === 'bombParty') {
                room.joueurs.forEach(j => {
                    const viesRestantes = Math.max(0, room.bombData.vies[j.permanentId]);
                    room.reponsesGlobales[j.permanentId].reponses[room.questionsDejaPosees.length - 1] = [`${viesRestantes} vie(s)`, viesRestantes];
                });
            }

            if (room.type === 'wikipedia') {
              room.joueurs.forEach(j => {
                const pId = j.permanentId;
                const cheminArray = room.wikiData.chemins[pId] || [];
                const cheminString = cheminArray.join(" ➔ ");
                const aGagne = room.wikiData.gagnants.includes(pId);
                const score = aGagne ? (room.questionsDejaPosees[room.questionsDejaPosees.length - 1]?.difficulty || 5) : 0;
                if (room.reponsesGlobales[pId]) {
                  room.reponsesGlobales[pId].reponses[room.questionsDejaPosees.length - 1] = [cheminString, score];
                }
              });
            }

            io.to(roomCode).emit('loading_status', { loading: true, nextGame: "Chargement...", description: "Calcul de la suite..." });
            setTimeout(() => { passerALaSuite(roomCode); }, 1000);
        }
    }, 1000);
};

async function passerALaSuite(roomCode) {
    const room = rooms[roomCode];
    if (!room) return;
    
    if (room.questionsDejaPosees.length >= room.nombreQuestions) {
        if (room.indexQuestionReview >= room.questionsDejaPosees.length) {
            io.to(roomCode).emit("resultats", getResultatFin(room));
            io.to(roomCode).emit('loading_status', { loading: false });
            return;
        }
        if (room.timerInterval) {
            clearInterval(room.timerInterval);
            room.timerInterval = null;
        }

        const joueurActuel = room.joueurs[room.indexJoueurReview];
        if (!joueurActuel) {
            room.indexJoueurReview = 0;
            room.indexQuestionReview++;
            return passerALaSuite(roomCode);
        }

        const dataJ = room.reponsesGlobales[joueurActuel.permanentId] || { pseudo: joueurActuel.pseudo, reponses: [] };
        const reponseInfo = dataJ.reponses[room.indexQuestionReview] || ["Aucune réponse", 0];
        const questionPosee = room.questionsDejaPosees[room.indexQuestionReview];

        let reponseTexte = reponseInfo[0];
        if (Array.isArray(reponseTexte)) reponseTexte = reponseTexte.join(" ➔ ");
        if (reponseTexte === null || reponseTexte === undefined) reponseTexte = "Pas de réponse";

        if (questionPosee.type === "wordle") {
            try {
                const wordleData = JSON.parse(reponseTexte);
                io.to(roomCode).emit("update_etat", wordleData.won);
            } catch (e) {
                io.to(roomCode).emit("update_etat", false);
            }
        } else if (questionPosee.type === "wikipedia") {
            io.to(roomCode).emit("update_etat", (reponseInfo[1] || 0) > 0);
        } else if (questionPosee.data.reponse === reponseTexte) {
          io.to(roomCode).emit("update_etat", true);
        } else {
          io.to(roomCode).emit("update_etat", false);
        }

        io.to(roomCode).emit('question_review', 
            questionPosee.data,
            questionPosee.type,
            reponseInfo[1] || 0, 
            reponseTexte, 
            dataJ.pseudo
        );

        io.to(roomCode).emit('loading_status', { loading: false }); 

        room.indexJoueurReview++;
        if (room.indexJoueurReview >= room.joueurs.length) {
            room.indexJoueurReview = 0;
            room.indexQuestionReview ++;
        }
        return;
    }
    
    try {
        io.to(roomCode).emit('loading_status', { loading: true, nextGame: "Préparation..." });
        const {quizData, type, difficulty} = await nouvelleQuestion(roomCode);
        
        io.to(roomCode).emit('loading_status', { 
            loading: true, 
            nextGame: nomsJeux[type] || type,
            description: descriptionsJeux[type] || ""
        });

        setTimeout(() => {
            io.to(roomCode).emit('new_question',{data: quizData, type: type, difficulty:difficulty, duration:tempsType[type]});
            io.to(roomCode).emit('loading_status', { loading: false });
            demarrerTimer(roomCode);
        }, 3000);
        
    } catch (err) {
        console.error(err);
        io.to(roomCode).emit('loading_status', { loading: false });
    }
}

async function nouvelleQuestion(roomCode) {
  const room = rooms[roomCode];
  const type = typesDisponibles[Math.floor(Math.random() * typesDisponibles.length)];
  room.type = type;
  
  let quizData;
  let difficulty;
  room.joueurs.forEach(joueur => {
    if (!room.reponsesGlobales[joueur.permanentId]) {
        room.reponsesGlobales[joueur.permanentId] = { pseudo: joueur.pseudo, reponses: [] };
    }
  });

  switch (type) {
    case 'qcm':
      room.joueurs.forEach(joueur => { room.reponsesGlobales[joueur.permanentId].reponses[room.questionsDejaPosees.length] = ["", false]; });
      ({quizData,difficulty} = genererQuestionQcmLocale());
      room.questionsDejaPosees.push({data:quizData,type:type, difficulty:difficulty});
      break;
    case 'ouverte':
      room.joueurs.forEach(joueur => { room.reponsesGlobales[joueur.permanentId].reponses[room.questionsDejaPosees.length] = ["", false]; });
      ({quizData,difficulty} = genererQuestionOuverteLocale());
      room.questionsDejaPosees.push({data: quizData, type: type, difficulty: difficulty});
      break;
    case 'drapeau':
      room.joueurs.forEach(joueur => { room.reponsesGlobales[joueur.permanentId].reponses[room.questionsDejaPosees.length] = ["", false]; });
      quizData = await devineDrapeau();
      difficulty = 1;
      room.questionsDejaPosees.push({data:quizData,type:type, difficulty:difficulty});
      break;
    case 'devineMeme':
      room.joueurs.forEach(joueur => { room.reponsesGlobales[joueur.permanentId].reponses[room.questionsDejaPosees.length] = ["", false]; });
      ({quizData,difficulty} = await memeFlou());
      room.questionsDejaPosees.push({data:quizData,type:type, difficulty:difficulty});
      break;
    case 'codeTrou':
      room.joueurs.forEach(joueur => { room.reponsesGlobales[joueur.permanentId].reponses[room.questionsDejaPosees.length] = ["", false]; });
      ({quizData, difficulty} = genererCodeTrouLocal());
      room.questionsDejaPosees.push({ data: quizData, type: type, difficulty: difficulty });
      break;
    case "chronologie":
      room.joueurs.forEach(joueur => { room.reponsesGlobales[joueur.permanentId].reponses[room.questionsDejaPosees.length] = ["", false]; });
      ({ quizData, difficulty } = genererChronologieLocale());
      room.questionsDejaPosees.push({ data: quizData, type: type, difficulty: difficulty });
      break;
    case 'petitBac':
      room.joueurs.forEach(joueur => { room.reponsesGlobales[joueur.permanentId].reponses[room.questionsDejaPosees.length] = [JSON.stringify(["", "", "", "", ""]), false]; });
      ({ quizData, difficulty } = genererPetitBacLocal());
      room.questionsDejaPosees.push({ data: quizData, type: type, difficulty: difficulty });
      break;
    case 'bombParty':
      room.bombData = {
          vies: {},
          currentPlayerIndex: 0,
          syllabe: syllabesBomb[Math.floor(Math.random() * syllabesBomb.length)],
          usedWords: [],
          turnTimeLeft: 10,
          rep: {},
      };
      room.joueurs.forEach(joueur => { 
          room.bombData.vies[joueur.permanentId] = 3;
          room.bombData.rep[joueur.permanentId] = "";
          room.reponsesGlobales[joueur.permanentId].reponses[room.questionsDejaPosees.length] = ["0 vie", 0]; 
      });
      quizData = { question: "Bomb Party : Survivez !" };
      difficulty = 3; 
      room.questionsDejaPosees.push({ data: quizData, type: type, difficulty: difficulty });
      break;
    case 'wikipedia':
      const wikiRes = await genererWikipedia();
      quizData = wikiRes.quizData;
      difficulty = wikiRes.difficulty;
      room.wikiData = { arrivee: quizData.arrivee, chemins: {}, gagnants: [] };
      room.joueurs.forEach(joueur => { 
          room.wikiData.chemins[joueur.permanentId] = [quizData.depart];
          room.reponsesGlobales[joueur.permanentId].reponses[room.questionsDejaPosees.length] = ["En cours...", 0]; 
      });
      room.questionsDejaPosees.push({ data: quizData, type: type, difficulty: difficulty });
      break;
    case 'wordle':
      room.joueurs.forEach(joueur => { room.reponsesGlobales[joueur.permanentId].reponses[room.questionsDejaPosees.length] = ["---", false]; });
      const wordleInfo = genererWordleLocal();
      const realAnswer = wordleInfo.quizData.reponse;
      room.wordleSecret = realAnswer;
      quizData = { ...wordleInfo.quizData, longueur: realAnswer.length };
      delete quizData.reponse; 
      room.questionsDejaPosees.push({ data: { ...quizData, reponse: realAnswer }, type: type, difficulty: wordleInfo.difficulty });
      difficulty = wordleInfo.difficulty;
      break;
    case 'rgb':
      room.joueurs.forEach(joueur => { room.reponsesGlobales[joueur.permanentId].reponses[room.questionsDejaPosees.length] = ["rgb(128, 128, 128)", 0]; });
      ({ quizData, difficulty } = genererRgbLocal());
      room.questionsDejaPosees.push({ data: { ...quizData }, type: type, difficulty: difficulty });
      break;
  }
  return {quizData, type, difficulty};
}

function rejoindreLobby({ socket,pseudo, permanentId, roomCode }){
  const code = roomCode.toUpperCase();
  if (!rooms[code]) {
    io.to(socket.id).emit('room_not_found');
    return;
  }
  socket.join(code);
  socket.roomCode = code;
  const room = rooms[code];
  socket.emit('lobby_joined', roomCode);

  const joueurExistant = room.joueurs.find(j => j.permanentId === permanentId);
  if (joueurExistant) {
      joueurExistant.id = socket.id;
      joueurExistant.pseudo = pseudo;
  } else {
      room.joueurs.push({ 
          id: socket.id, 
          pseudo, 
          permanentId, 
          pret: room.joueurs.length === 0
      });
  }
  
  io.to(code).emit('update_lobby', {
    joueurs: room.joueurs,
    theme: room.themeActuel,
    nbQuestions: room.nbQuestionsActuel
  });
}

// --- SOCKET.IO EVENT HANDLERS ---

io.on('connection', (socket) => {
    
    socket.on('wordle_check_word', (word) => {
        const room = rooms[socket.roomCode];
        if (!room || room.type !== 'wordle' || !room.wordleSecret) return;

        const upperWord = word.toUpperCase();
        const target = room.wordleSecret.toUpperCase();

        if (!dictionnaireFr.has(upperWord)) {
            socket.emit('wordle_res', { isValid: false, message: "Mot inconnu !" });
            return;
        }

        const result = new Array(target.length).fill("absent");
        const targetLetters = target.split("");
        const guessLetters = upperWord.split("");

        guessLetters.forEach((letter, i) => {
            if (letter === targetLetters[i]) {
                result[i] = "correct";
                targetLetters[i] = null;
                guessLetters[i] = null;
            }
        });

        guessLetters.forEach((letter, i) => {
            if (letter && targetLetters.includes(letter)) {
                result[i] = "present";
                targetLetters[targetLetters.indexOf(letter)] = null;
            }
        });

        const won = upperWord === target;
        socket.emit('wordle_res', { isValid: true, result, won });
    });
    
    socket.on('create_lobby', ({ pseudo, permanentId }) => {
      let code;
      do { code = generateRoomCode() } while (rooms[code]);

      rooms[code] = {
          joueurs: [],
          sousThemes: [],
          questionsDejaPosees: [],
          themeActuel: "",
          nbQuestions: 5,
          reponsesGlobales: {},
          tempsRestant: null,
          timerInterval: null,
          tempsRestantTotal: 0,
          nbQuestionsActuel: 0,
          historiqueChat: [],
          indexQuestionReview: 0,
          indexJoueurReview: 0,
          gameStat: "lobby",
          type: ""
      };

      rejoindreLobby({ socket, pseudo, permanentId, roomCode:code });
    });

    socket.on('join_lobby', ({ pseudo, permanentId, roomCode }) => {
        rejoindreLobby({ socket, pseudo, permanentId, roomCode });
    });

    socket.on('submit_bomb_letters', (letters) => {
        const room = rooms[socket.roomCode];
        if (!room || !room.bombData) return;
        const currentPlayer = room.joueurs[room.bombData.currentPlayerIndex];
        if (currentPlayer && currentPlayer.id === socket.id) {
          room.bombData.rep[currentPlayer.permanentId] = letters;
          io.to(socket.roomCode).emit('bomb_update', getBombStatePayload(room));
        }
    });

    socket.on('wiki_click', (pageCible) => {
        const room = rooms[socket.roomCode];
        if (!room || room.type !== 'wikipedia' || !room.wikiData) return;
        const pId = room.joueurs.find(j => j.id === socket.id)?.permanentId;
        if (!pId) return;
        room.wikiData.chemins[pId].push(pageCible);
        if (room.reponsesGlobales[pId]) {
            room.reponsesGlobales[pId].reponses[room.questionsDejaPosees.length - 1] = [room.wikiData.chemins[pId].join(" ➔ "), 0];
        }
        if (pageCible === room.wikiData.arrivee && !room.wikiData.gagnants.includes(pId)) {
            room.wikiData.gagnants.push(pId);
            if (room.reponsesGlobales[pId]) {
                const score = room.questionsDejaPosees[room.questionsDejaPosees.length - 1]?.difficulty || 5;
                room.reponsesGlobales[pId].reponses[room.questionsDejaPosees.length - 1] = [room.wikiData.chemins[pId].join(" ➔ "), score];
            }
            socket.emit('wiki_win'); 
            if (room.wikiData.gagnants.length === room.joueurs.length) {
                room.tempsRestant = 5; 
            }
        }
    });

    socket.on('submit_bomb_word', (word) => {
        const room = rooms[socket.roomCode];
        if (!room || room.type !== 'bombParty' || !room.bombData) return;
        const currentPlayer = room.joueurs[room.bombData.currentPlayerIndex];
        if (!currentPlayer || currentPlayer.id !== socket.id) return; 
        const upperWord = word.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z]/g, "").toUpperCase();
        if (!upperWord.includes(room.bombData.syllabe)) {
            socket.emit('bomb_error', "Il manque la syllabe !");
            return;
        }
        if (!dictionnaireFr.has(upperWord)) {
            socket.emit('bomb_error', "Ce mot n'existe pas !");
            return;
        }
        if (room.bombData.usedWords.includes(upperWord)) {
            socket.emit('bomb_error', "Déjà dit !");
            return;
        }
        room.bombData.usedWords.push(upperWord);
        nextBombPlayer(room);
        io.to(socket.roomCode).emit('bomb_update', getBombStatePayload(room));
    });

    socket.on("change_etat", (etat) => {
      const room = rooms[socket.roomCode];
      if (room && room.joueurs.length > 0 && socket.id === room.joueurs[0].id) {
        io.to(socket.roomCode).emit("update_etat", etat);
      }
    });

    socket.on("send_chat", (texte) => {
      const room = rooms[socket.roomCode];
      if (room) {
        room.historiqueChat.push(texte);
        io.to(socket.roomCode).emit("update_chat", texte);
      }
    });

    socket.on("next_review", (estBon) => {
      const room = rooms[socket.roomCode];
      if (room && room.joueurs.length > 0 && socket.id === room.joueurs[0].id) {
        if (room.indexJoueurReview == 0) {
          const joueur = room.joueurs[room.joueurs.length-1];
          room.reponsesGlobales[joueur.permanentId].reponses[room.indexQuestionReview-1][1] = estBon;
        } else {
          const joueur = room.joueurs[room.indexJoueurReview-1];
          room.reponsesGlobales[joueur.permanentId].reponses[room.indexQuestionReview][1] = estBon;
        }
        passerALaSuite(socket.roomCode);
      }
    });

    socket.on("ready", () => {
      const room = rooms[socket.roomCode];
      const joueur = room?.joueurs.find(j => j.id === socket.id);
      if (joueur) {
        joueur.pret = true;
        io.to(socket.roomCode).emit('update_pret', room.joueurs);
      }
    });

    socket.on("unready", () => {
      const room = rooms[socket.roomCode];
      const joueur = room?.joueurs.find(j => j.id === socket.id);
      if (joueur) {
        joueur.pret = false;
        io.to(socket.roomCode).emit('update_pret', room.joueurs);
      }
    });

    socket.on('send_rep', (rep) => {
      const room = rooms[socket.roomCode];
      if (!room || room.joueurs.length === 0) return;
      const joueur = room.joueurs.find(j => j.id === socket.id);
      if (joueur) {
          const indexQuestionEnCours = room.questionsDejaPosees.length - 1;
          if (room.reponsesGlobales[joueur.permanentId]) {
              room.reponsesGlobales[joueur.permanentId].reponses[indexQuestionEnCours] = [rep, false];
          }
      }
    });

    socket.on('start_game', async (nombreQuestions) => {
      const room = rooms[socket.roomCode];
      if (!room || room.joueurs.length === 0 || socket.id !== room.joueurs[0].id) return;
      io.to(socket.roomCode).emit('loading_status', { loading: true, nextGame: "Initialisation..." }); 
      try {
          room.questionsDejaPosees = [];
          room.indexQuestionReview = 0;
          room.indexJoueurReview = 0;
          room.nombreQuestions = nombreQuestions;
          const {quizData, type, difficulty} = await nouvelleQuestion(socket.roomCode);
          io.to(socket.roomCode).emit('loading_status', { 
              loading: true, 
              nextGame: nomsJeux[type] || type,
              description: descriptionsJeux[type] || ""
          });
          setTimeout(() => {
              io.to(socket.roomCode).emit('game_started', {data:quizData,type:type, difficulty:difficulty, duration:tempsType[type]});
              io.to(socket.roomCode).emit('loading_status', { loading: false });
              demarrerTimer(socket.roomCode);
          }, 5000);
      } catch (err) {
          console.error(err);
          io.to(socket.roomCode).emit('loading_status', { loading: false });
      }
    });

    socket.on('change_nb_questions', (n) => {
      const room = rooms[socket.roomCode];
      if (room && room.joueurs.length > 0 && socket.id === room.joueurs[0].id) {
          room.nbQuestionsActuel = n;
          io.to(socket.roomCode).emit("updateNbQuestions", n);
      }
    });

    socket.on('change_theme', (theme) => {
      const room = rooms[socket.roomCode];
      if (room && room.joueurs.length > 0 && socket.id === room.joueurs[0].id) {
        room.themeActuel = theme;
        io.to(socket.roomCode).emit("updateTheme", theme);
      }
    });

    socket.on('disconnect', () => {
      const room = rooms[socket.roomCode];
      if (room) {
        room.joueurs = room.joueurs.filter(player => player.id !== socket.id);
        if (room.joueurs.length > 0) {
          room.joueurs[0].pret = true;
          io.to(socket.roomCode).emit('update_pret', room.joueurs);
        }
      }
    });
});

const port = process.env.PORT || 3001;
server.listen(port, () => console.log(`Serveur Multi lancé sur le port ${port}`));
