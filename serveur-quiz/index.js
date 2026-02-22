const listePays = require('./pays.json');
const listeMeme = require('./memes.json');
const dicoBrut = require('an-array-of-french-words');
const express = require('express');
const axios = require('axios');
const { decode } = require('html-entities');
const cors = require('cors');
const http = require('http'); // Ajouté
const { Server } = require('socket.io'); // Ajouté
const { emit } = require('cluster');
const { diff } = require('util');
const fs = require('fs');
const path = require('path');
require('dotenv').config();



const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = require('socket.io')(server, {
  cors: {
    origin: "*", // Autorise n'importe quel site à se connecter
    methods: ["GET", "POST"]
  }
});



let rooms = {};

const typesDisponibles = ['qcm', 'ouverte', 'drapeau',"devineMeme", "codeTrou", "chronologie", "petitBac", "bombParty", "wikipedia", "wordle", "rgb"];

const tempsType = {
  "qcm": 20,
  "ouverte": 20,
  "drapeau": 15,
  "devineMeme" : 20,
  "codeTrou": 30, // 30 secondes pour lire le code
  "chronologie": 30,
  "petitBac" : 40,
  "bombParty": 60,
  "wikipedia": 120,
  "wordle": 90,
  "rgb": 20,
}

const chronologieData = require('./chronologie.json');

const codeTrouDir = path.join(__dirname, 'codeTrou');
const snippetsData = {};

fs.readdirSync(codeTrouDir).forEach(file => {
    if (file.endsWith('.json')) {
        // On récupère le nom sans l'extension (ex: "javascript")
        let langageName = file.replace('.json', '');
        
        // On met la première lettre en majuscule pour faire joli (Javascript, Python)
        langageName = langageName.charAt(0).toUpperCase() + langageName.slice(1);
        
        // On require le fichier et on l'ajoute à notre grand objet global
        snippetsData[langageName] = require(path.join(codeTrouDir, file));
    }
});


const questionsOuvertesDir = path.join(__dirname, 'questionsOuvertes');
const questionsOuvertesData = {};

if (fs.existsSync(questionsOuvertesDir)) {
    fs.readdirSync(questionsOuvertesDir).forEach(file => {
        if (file.endsWith('.json')) {
            // Le nom du fichier devient le nom du thème (ex: "histoire")
            let themeName = file.replace('.json', '').toLowerCase();
            questionsOuvertesData[themeName] = require(path.join(questionsOuvertesDir, file));
        }
    });
}


const questionsQcmDir = path.join(__dirname, 'questionsQcm');
const questionsQcmData = {};

if (fs.existsSync(questionsQcmDir)) {
    fs.readdirSync(questionsQcmDir).forEach(file => {
        if (file.endsWith('.json')) {
            // Le nom du fichier devient le nom du thème (ex: "histoire")
            let themeName = file.replace('.json', '').toLowerCase();
            questionsQcmData[themeName] = require(path.join(questionsQcmDir, file));
        }
    });
}


const lettresPetitBac = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "L", "M", "N", "O", "P", "R", "S", "T", "V"]; // On enlève K, Q, U, W, X, Y, Z
const categoriesPetitBac = [
    "Prénom", "Pays ou Ville", "Animal", "Métier", "Fruit ou Légume", 
    "Objet du quotidien", "Marque", "Célébrité", "Sport", "Couleur", 
    "Instrument de musique", "Film ou Série", "Plat ou Nourriture", 
    "Moyen de transport", "Vêtement", "Élément de la nature", "Jeu vidéo"
];

const syllabesBomb = ["TRA", "MEN", "ION", "PAR", "CHE", "QUE", "ENT", "ASS", "OUR", "ITE", "ONS", "EUR", "ANT", "EMENT", "TION", "AGE", "ETTE", "OIR"];

const dictionnaireFr = new Set(
    dicoBrut.map(mot => 
        mot.normalize("NFD")
           .replace(/[\u0300-\u036f]/g, "") // Supprime les accents
           .replace(/[^a-zA-Z]/g, "")       // Garde uniquement les lettres
           .toUpperCase()
    )
);

const wordleWordsByLength = {
    4: Array.from(dictionnaireFr).filter(mot => mot.length === 4),
    5: Array.from(dictionnaireFr).filter(mot => mot.length === 5),
    6: Array.from(dictionnaireFr).filter(mot => mot.length === 6),
    7: Array.from(dictionnaireFr).filter(mot => mot.length === 7)
};

const wikiConcepts = JSON.parse(fs.readFileSync('./concepts.json', 'utf8')).cibles;

console.log(`[BOMB PARTY] Dictionnaire chargé : ${dictionnaireFr.size} mots prêts !`);


// --- TIMER ---
const demarrerTimer = (roomCode) => {
    const room = rooms[roomCode];
    if (room.timerInterval) clearInterval(room.timerInterval); 
    room.tempsRestant = tempsType[room.type]; 
    
    room.timerInterval = setInterval(() => {
        room.tempsRestant--;

        // --- NOUVEAU : SOUS-CHRONO BOMB PARTY ---
        if (room.type === 'bombParty' && room.bombData) {
            room.bombData.turnTimeLeft--;
            
            if (room.bombData.turnTimeLeft <= 0) {
                // Temps écoulé pour ce joueur !
                const currentPlayer = room.joueurs[room.bombData.currentPlayerIndex];
                room.bombData.vies[currentPlayer.permanentId]--; // -1 vie
                nextBombPlayer(room);
            }
            // On broadcast l'état de la bombe en temps réel
            io.to(roomCode).emit('bomb_update', getBombStatePayload(room));
        }
        // ----------------------------------------

        io.to(roomCode).emit('timer_update', room.tempsRestant);

        if (room.tempsRestant <= 0) {
            clearInterval(room.timerInterval);
            room.timerInterval = null;
            io.to(roomCode).emit('timer_update', 0); 

            // --- NOUVEAU : SAUVEGARDE DES VIES POUR LE SCORE ---
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
                
                // On formate le chemin avec des petites flèches : "Page 1 ➔ Page 2 ➔ Page 3"
                const cheminString = cheminArray.join(" ➔ ");
                
                // S'il a gagné, il prend la difficulté max (ex: 5 points), sinon 0
                const aGagne = room.wikiData.gagnants.includes(pId);
                const score = aGagne ? (room.questionsDejaPosees[room.questionsDejaPosees.length - 1]?.difficulty || 5) : 0;

                // On sauvegarde dans reponsesGlobales pour la review
                if (room.reponsesGlobales[pId]) {
                  room.reponsesGlobales[pId].reponses[room.questionsDejaPosees.length - 1] = [cheminString, score];
                }
              });
            }
            // ---------------------------------------------------

            io.to(roomCode).emit('loading_status', { loading: true, nextGame: "Chargement...", description: "Calcul de la suite..." });
            setTimeout(() => { passerALaSuite(roomCode); }, 1000);
        }
    }, 1000);
};


const descriptionsJeux = {
  "qcm": "Choisis la bonne réponse parmi les 4 options.",
  "ouverte": "Tape la réponse exacte à la question posée.",
  "drapeau": "Identifie le pays correspondant au drapeau affiché.",
  "devineMeme" : "Retrouve le nom de ce célèbre mème internet.",
  "codeTrou": "Complète le morceau de code manquant.",
  "chronologie": "Remets les événements dans le bon ordre chronologique.",
  "petitBac" : "Trouve un mot commençant par la lettre pour chaque catégorie.",
  "bombParty": "Trouve un mot contenant la syllabe avant l'explosion !",
  "wikipedia": "Atteins la page cible en cliquant sur les liens Wikipédia.",
  "wordle": "Devine le mot secret en un minimum d'essais.",
  "rgb": "Trouve les valeurs Rouge, Vert et Bleu de la couleur."
};

const nomsJeux = {
  "qcm": "QCM",
  "ouverte": "Question Ouverte",
  "drapeau": "Drapeaux",
  "devineMeme": "Mème Flou",
  "codeTrou": "Code à Trou",
  "chronologie": "Chronologie",
  "petitBac": "Petit Bac",
  "bombParty": "Bomb Party",
  "wikipedia": "Wiki-Racing",
  "wordle": "Wordle",
  "rgb": "Rgb Game"
};

// Fonction utilitaire pour éviter la répétition de code
async function passerALaSuite(roomCode) {
    const room = rooms[roomCode];
    if (!room) return;
    
    console.log(room.nombreQuestions);
console.log(room.questionsDejaPosees);
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

        // On synchronise sur la liste actuelle des joueurs pour la review
        const joueurActuel = room.joueurs[room.indexJoueurReview];
        if (!joueurActuel) {
            room.indexJoueurReview = 0;
            room.indexQuestionReview++;
            return passerALaSuite(roomCode);
        }

        const dataJ = room.reponsesGlobales[joueurActuel.permanentId] || { pseudo: joueurActuel.pseudo, reponses: [] };
        const reponseInfo = dataJ.reponses[room.indexQuestionReview] || ["Aucune réponse", 0];
        const questionPosee = room.questionsDejaPosees[room.indexQuestionReview];

        // Formatage de la réponse si c'est un tableau (Wikipedia parcours)
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
            // Pour Wikipedia, la réussite est déterminée par le score (reponseInfo[1] > 0)
            io.to(roomCode).emit("update_etat", (reponseInfo[1] || 0) > 0);
        } else if (questionPosee.data.reponse === reponseTexte) {
          io.to(roomCode).emit("update_etat", true);
        }
        else {
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
    
    // Si on arrive ici, c'est une nouvelle question :
    try {
        io.to(roomCode).emit('loading_status', { loading: true, nextGame: "Préparation..." });
        
        // On génère la question à l'avance pour savoir quel est le prochain jeu
        const {quizData, type, difficulty} = await nouvelleQuestion(roomCode);
        
        // On prévient les joueurs du prochain jeu
        io.to(roomCode).emit('loading_status', { 
            loading: true, 
            nextGame: nomsJeux[type] || type,
            description: descriptionsJeux[type] || ""
        });

        // On attend 5 secondes comme demandé
        setTimeout(() => {
            io.to(roomCode).emit('new_question',{data: quizData, type: type, difficulty:difficulty, duration:tempsType[type]});
            io.to(roomCode).emit('loading_status', { loading: false });
            demarrerTimer(roomCode);
        }, 5000);
        
    } catch (err) {
        console.error(err);
        io.to(roomCode).emit('loading_status', { loading: false });
    }
}

function genererRgbLocal() {
    const r = Math.floor(Math.random() * 256);
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);
    return {
        quizData: {
            question: "RgbGame : Trouvez les valeurs Rouge, Vert et Bleu !",
            reponse: `rgb(${r}, ${g}, ${b})`,
            r, g, b
        },
        difficulty: 5
    };
}

function genererWordleLocal() {
    const lengths = [4, 5, 6];
    const chosenLength = lengths[Math.floor(Math.random() * lengths.length)];
    const words = wordleWordsByLength[chosenLength];
    const word = words[Math.floor(Math.random() * words.length)];
    return {
        quizData: {
            question: `Wordle : Devine le mot de ${chosenLength} lettres !`,
            reponse: word,
        },
        difficulty: chosenLength
    };
}


async function genererWikipedia() {
    try {
        // On demande 2 articles au hasard (namespace 0 = articles standards)
        const response = await fetch("https://fr.wikipedia.org/w/api.php?action=query&list=random&rnnamespace=0&rnlimit=2&format=json&origin=*");
        const data = await response.json();
        
        const pageDepart = data.query.random[0].title;

        const indexAleatoire = Math.floor(Math.random() * wikiConcepts.length);
        const pageArrivee = wikiConcepts[indexAleatoire];

        return {
            quizData: { 
                question: "Wiki-Racing : Atteignez la page cible !", 
                depart: pageDepart, 
                arrivee: pageArrivee 
            },
            difficulty: 5 // 5 points pour ceux qui y arrivent !
        };
    } catch (e) {
        // Sécurité en cas de crash de l'API
        return { quizData: { question: "Wiki-Racing", depart: "Pomme", arrivee: "Cheval" }, difficulty: 5 };
    }
}

// Fonction pour formater l'état de la bombe pour le front-end
function getBombStatePayload(room) {
    if (!room.bombData) return null;
    return {
        syllabe: room.bombData.syllabe,
        turnTimeLeft: room.bombData.turnTimeLeft,
        currentPlayerId: room.joueurs[room.bombData.currentPlayerIndex].id,
        currentPlayerPseudo: room.joueurs[room.bombData.currentPlayerIndex].pseudo,
        joueursStatus: room.joueurs.map(j => ({
            pseudo: j.pseudo,
            vies: room.bombData.vies[j.permanentId],
            isCurrent: room.bombData.currentPlayerIndex === room.joueurs.indexOf(j),
            rep: room.bombData.rep[j.permanentId],
        }))
    };
}

// Fonction pour passer au joueur suivant (qui est encore en vie)
function nextBombPlayer(room) {
    room.bombData.syllabe = syllabesBomb[Math.floor(Math.random() * syllabesBomb.length)];
    room.bombData.turnTimeLeft = 10; // 10 secondes pour répondre
    
    let loops = 0;
    do {
        room.bombData.currentPlayerIndex = (room.bombData.currentPlayerIndex + 1) % room.joueurs.length;
        loops++;
    } while (
        room.bombData.vies[room.joueurs[room.bombData.currentPlayerIndex].permanentId] <= 0 
        && loops <= room.joueurs.length
    );

    // Si tout le monde est mort, on accélère la fin du jeu
    let playersAlive = room.joueurs.filter(j => room.bombData.vies[j.permanentId] > 0).length;
    if (playersAlive <= 1 && room.tempsRestant > 5) {
        room.tempsRestant = 5; // Fera terminer le chrono global à la prochaine seconde
    }
}

function genererPetitBacLocal() {
    // 1. Tirage de la lettre
    const lettre = lettresPetitBac[Math.floor(Math.random() * lettresPetitBac.length)];
    
    // 2. Tirage de 5 catégories uniques
    const melange = [...categoriesPetitBac].sort(() => 0.5 - Math.random());
    const categoriesChoisies = melange.slice(0, 5);

    return {
        quizData: {
            question: `Petit Bac : Trouve 5 mots commençant par la lettre`,
            lettre: lettre,
            categories: categoriesChoisies,
            reponse: "Validation manuelle du Chef" // Indication pour la review
        },
        difficulty: 5 // 5 points (1 point par mot virtuel) !
    };
}


function genererCodeTrouLocal() {
    // 1. On liste les langages chargés depuis le dossier
    const langagesDisponibles = Object.keys(snippetsData);
    
    // Si le dossier est vide, on renvoie une erreur propre
    if (langagesDisponibles.length === 0) {
        return { quizData: { question: "Erreur", langage: "Aucun", code: "Dossier vide", reponse: "Erreur" }, difficulty: 1 };
    }

    // 2. On choisit un langage au hasard
    const langageChoisi = langagesDisponibles[Math.floor(Math.random() * langagesDisponibles.length)];
    
    // 3. On choisit une question au hasard dans ce langage
    const questionsDuLangage = snippetsData[langageChoisi];
    const snippet = questionsDuLangage[Math.floor(Math.random() * questionsDuLangage.length)];
    
    // 4. On retourne le tout
    return {
        quizData: {
            question: snippet.question,
            langage: langageChoisi, // Le nom du fichier avec majuscule
            code: snippet.code,
            reponse: snippet.reponse
        },
        difficulty: snippet.difficulte
    };
}
// --- FONCTIONS LOGIQUE IA ---



  async function memeFlou() {
    const randomMeme = listeMeme[Math.floor(Math.random() * listeMeme.length)];

    const quizData = {
      question: "Qui est-ce ?",
        image: randomMeme.url,
        reponse: randomMeme.nom
    }

    let difficulty;

    switch (randomMeme.difficulte) {
      case "easy":
        difficulty = 1;
        break;
      case "medium":
        difficulty = 2;
        break;
      case "hard":
        difficulty = 3;
        break;
      default:
        difficulty = 0;
        break;
    }


    return {
        quizData, difficulty
        
    };
}

async function fetchQuizQuestion() {
  try {
    const response = await axios.get('https://opentdb.com/api.php?amount=1&type=multiple');
    const data = response.data.results[0];

    // On décode le texte pour enlever les &quot;, &#039;, etc.
    const question = decode(data.question);
    const correct_answer = decode(data.correct_answer);
    const incorrect_answers = data.incorrect_answers.map(ans => decode(ans));

    let difficulty;
    switch (decode(data.difficulty)) {
      case "easy":
        difficulty = 1;
        break;
      case "medium":
        difficulty = 2;
        break;
      case "hard":
        difficulty = 3;
        break;
      default:
        difficulty = 0;
        break;
    }

    // On crée le tableau d'options et on le mélange
    const options = [...incorrect_answers, correct_answer].sort(() => Math.random() - 0.5);

    // quizData de la forme { reponse : "", options : ["","","",""], question: ""}*
    const quizData = {question: question,
      options: options,
      reponse: correct_answer}

    return {quizData, difficulty};
  } catch (error) {
    console.error("Erreur lors de l'appel API OpenTDB:", error);
    return null;
  }
}

// Endpoint pour générer une question par sous-thème
function genererQuestionOuverteLocale() {
    const themesDisponibles = Object.keys(questionsOuvertesData);
    
    if (themesDisponibles.length === 0) {
        return { quizData: { question: "Erreur serveur", reponse: "Aucune question" }, difficulty: 1 };
    }

    const themeChoisi = themesDisponibles[Math.floor(Math.random() * themesDisponibles.length)];

    // On tire une question au hasard dans ce thème
    const questionsDuTheme = questionsOuvertesData[themeChoisi];
    const q = questionsDuTheme[Math.floor(Math.random() * questionsDuTheme.length)];

    return {
        quizData: {
            question: q.question,
            reponse: q.reponse
        },
        difficulty: q.difficulte || 2
    };
}

function genererChronologieLocale() {
    // 1. On mélange la base de données totale et on prend 4 objets
    let shuffled = [...chronologieData].sort(() => 0.5 - Math.random());
    let selected = shuffled.slice(0, 4);

    // 2. On calcule le bon ordre (du plus ancien au plus récent)
    let correctOrder = [...selected].sort((a, b) => a.annee - b.annee);

    // 3. On remélange les 4 objets choisis pour les envoyer au client dans le désordre
    let questionItems = [...selected].sort(() => 0.5 - Math.random());

    return {
        quizData: {
            question: "Remets ces éléments dans l'ordre chronologique (du plus ancien au plus récent) :",
            items: questionItems,
            reponse: correctOrder,
        },
        difficulty: 3 // C'est un exercice difficile !
    };
}

function genererQuestionQcmLocale() {
    const themesDisponibles = Object.keys(questionsQcmData);
    
    if (themesDisponibles.length === 0) {
        return { quizData: { question: "Erreur serveur", reponse: "Aucune question", options:["","","",""] }, difficulty: 1 };
    }

    const themeChoisi = themesDisponibles[Math.floor(Math.random() * themesDisponibles.length)];

    // On tire une question au hasard dans ce thème
    const questionsDuTheme = questionsQcmData[themeChoisi];
    const q = questionsDuTheme[Math.floor(Math.random() * questionsDuTheme.length)];

    return {
        quizData: {
            question: q.question,
            reponse: q.reponse,
            options: q.options,
        },
        difficulty: q.difficulte || 2
    };
}


// FONCTION POUR CHAQUE TYPE DE QUESTION

async function devineDrapeau() {
  pays = listePays[Math.floor(Math.random() * listePays.length)];
  return { question:"Quel est le pays associé à ce drapeau ?", reponse : pays.nom, image: `https://flagcdn.com/${pays.code}.svg`}
}


// RESERVÉ AUX FONCTIONS HORS JEU

function generateRoomCode()  {
  const liste = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += liste.charAt(Math.floor(Math.random() * liste.length));
  }
  return result;
};

function getResultatFin(room) {
  let resultatsFin = [];
  room.joueurs.forEach((joueur) => {
    let score = 0;
    room.reponsesGlobales[joueur.permanentId].reponses.forEach((rep, index) => {
      
      // Question classique : vrai ou faux
      if (rep[1] === true) {
        score = score + room.questionsDejaPosees[index].difficulty;
      } 
      else if (Array.isArray(rep[1])) {
        score = score + rep[1].filter(val => val === true).length;
      }
      else if (typeof rep[1] === 'number') {
        // Le joueur gagne le nombre de points = le nombre de vies !
        score = score + rep[1];
      }
      
    });

    resultatsFin.push({
      pseudo: joueur.pseudo,  
      score: score,
    });
  });
  resultatsFin.sort((a, b) => b.score - a.score);
  return resultatsFin;
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


        // 1. Chercher si le permanentId est déjà dans le tableau 'lobby'
        const joueurExistant = room.joueurs.find(j => j.permanentId === permanentId);

        if (joueurExistant) {
            // 2. Si oui, on met juste à jour son socket.id actuel
            joueurExistant.id = socket.id;
            joueurExistant.pseudo = pseudo;
        } else {
            // 3. Sinon, on l'ajoute comme d'habitude
            room.joueurs.push({ 
                id: socket.id, 
                pseudo, 
                permanentId, 
                pret: room.joueurs.length === 0
            });
            
        }
        
        // 4. On prévient tout le monde (pour que la liste s'affiche chez le nouveau venu aussi)
        io.to(code).emit('update_lobby', {
          joueurs: room.joueurs,
          theme: room.themeActuel,
          nbQuestions: room.nbQuestionsActuel
        });
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
      
      // On ajoute une réponse "Vide" par défaut pour cette question
      // Si le joueur répond, on remplacera ce "Pas de réponse"
      
  });

  switch (type) {
    case 'qcm':
      room.joueurs.forEach(joueur => { room.reponsesGlobales[joueur.permanentId].reponses[room.questionsDejaPosees.length] = ["", false]; });
      
      ({quizData,difficulty} = genererQuestionQcmLocale());
      // quizData de la forme { reponse : "", options : ["","","",""], question: ""}
      room.questionsDejaPosees.push({data:quizData,type:type, difficulty:difficulty});
        
      return {quizData, type, difficulty}
      
    case 'ouverte':
      room.joueurs.forEach(joueur => { room.reponsesGlobales[joueur.permanentId].reponses[room.questionsDejaPosees.length] = ["", false]; });
      
      const qOuverte = genererQuestionOuverteLocale();
      quizData = qOuverte.quizData;
      difficulty = qOuverte.difficulty;

      room.questionsDejaPosees.push({data: quizData, type: type, difficulty: difficulty});

      return {quizData, type, difficulty};

    case 'drapeau':
      room.joueurs.forEach(joueur => { room.reponsesGlobales[joueur.permanentId].reponses[room.questionsDejaPosees.length] = ["", false]; });
      quizData = await devineDrapeau();
      difficulty = 1;
      // quizData de la forme { reponse : "", image: ""}
      room.questionsDejaPosees.push({data:quizData,type:type, difficulty:difficulty});
      return {quizData, type, difficulty}


    case 'devineMeme':
      room.joueurs.forEach(joueur => { room.reponsesGlobales[joueur.permanentId].reponses[room.questionsDejaPosees.length] = ["", false]; });
      ({quizData,difficulty} = await memeFlou());
      // quizData de la forme { reponse : "", image: ""}
      room.questionsDejaPosees.push({data:quizData,type:type, difficulty:difficulty});
      return {quizData, type, difficulty}

    case 'codeTrou':
      room.joueurs.forEach(joueur => { 
          room.reponsesGlobales[joueur.permanentId].reponses[room.questionsDejaPosees.length] = ["", false]; 
      });
      
      // On assigne DIRECTEMENT le résultat à quizData (sans les accolades de déstructuration)
      ({quizData, difficulty} = genererCodeTrouLocal());
      
      room.questionsDejaPosees.push({ data: quizData, type: type, difficulty: difficulty });
      
      return { quizData, type, difficulty };

    case "chronologie":
      room.joueurs.forEach(joueur => { 
          room.reponsesGlobales[joueur.permanentId].reponses[room.questionsDejaPosees.length] = ["", false]; 
      });
      
      const { quizData: dataChrono, difficulty: diffChrono } = genererChronologieLocale();
      
      room.questionsDejaPosees.push({ data: dataChrono, type: type, difficulty: diffChrono });
      
      return { quizData: dataChrono, type, difficulty: diffChrono };

    case 'petitBac':
      // On initialise avec un tableau JSON de 5 cases vides
      room.joueurs.forEach(joueur => { 
          room.reponsesGlobales[joueur.permanentId].reponses[room.questionsDejaPosees.length] = [JSON.stringify(["", "", "", "", ""]), false]; 
      });
      
      const { quizData: dataBac, difficulty: diffBac } = genererPetitBacLocal();
      
      room.questionsDejaPosees.push({ data: dataBac, type: type, difficulty: diffBac });
      
      return { quizData: dataBac, type, difficulty: diffBac };

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
          room.bombData.vies[joueur.permanentId] = 3; // 3 vies chacun
          room.bombData.rep[joueur.permanentId] = "";
          // On initialise la réponse à 0 point par défaut
          room.reponsesGlobales[joueur.permanentId].reponses[room.questionsDejaPosees.length] = ["0 vie", 0]; 
      });
      
      quizData = { question: "Bomb Party : Survivez !" };
      difficulty = 3; 
      
      room.questionsDejaPosees.push({ data: quizData, type: type, difficulty: difficulty });
      
      return { quizData, type, difficulty };


    case 'wikipedia':
      const wikiRes = await genererWikipedia();
      quizData = wikiRes.quizData;
      difficulty = wikiRes.difficulty;

      // On crée un dictionnaire pour stocker le chemin de chaque joueur
      room.wikiData = {
          arrivee: quizData.arrivee,
          chemins: {}, // ex: { "id_joueur": ["Pomme", "Fruit", "Arbre"] }
          gagnants: []
      };

      room.joueurs.forEach(joueur => { 
          // Le chemin initial contient juste la page de départ
          room.wikiData.chemins[joueur.permanentId] = [quizData.depart];
          room.reponsesGlobales[joueur.permanentId].reponses[room.questionsDejaPosees.length] = ["En cours...", 0]; 
      });

      room.questionsDejaPosees.push({ data: quizData, type: type, difficulty: difficulty });
      
      return { quizData, type, difficulty };

    case 'wordle':
      room.joueurs.forEach(joueur => { 
          room.reponsesGlobales[joueur.permanentId].reponses[room.questionsDejaPosees.length] = ["---", false]; 
      });
      const wordleInfo = genererWordleLocal();
      quizData = { ...wordleInfo.quizData };
      const realAnswer = quizData.reponse;
      
      // On stocke la réponse secrète dans la room mais on l'enlève du quizData envoyé aux clients
      room.wordleSecret = realAnswer;
      quizData.longueur = realAnswer.length; // On informe le client de la longueur
      delete quizData.reponse; 

      room.questionsDejaPosees.push({ data: { ...quizData, reponse: realAnswer }, type: type, difficulty: wordleInfo.difficulty });
      return { quizData, type, difficulty: wordleInfo.difficulty };

    case 'rgb':
      room.joueurs.forEach(joueur => { 
          room.reponsesGlobales[joueur.permanentId].reponses[room.questionsDejaPosees.length] = ["rgb(128, 128, 128)", 0]; 
      });
      const rgbInfo = genererRgbLocal();
      quizData = { ...rgbInfo.quizData };
      
      room.questionsDejaPosees.push({ data: { ...quizData }, type: type, difficulty: rgbInfo.difficulty });
      return { quizData, type, difficulty: rgbInfo.difficulty };
  }
}


// --- FONCTIONS SOCKET.IO ---

io.on('connection', (socket) => {
    
    socket.on('wordle_check_word', (word) => {
        const room = rooms[socket.roomCode];
        if (!room || room.type !== 'wordle' || !room.wordleSecret) return;

        const upperWord = word.toUpperCase();
        const target = room.wordleSecret.toUpperCase();

        // 1. Vérification dictionnaire
        if (!dictionnaireFr.has(upperWord)) {
            socket.emit('wordle_res', { isValid: false, message: "Mot inconnu !" });
            return;
        }

        // 2. Calcul des statuts (Vert, Jaune, Gris)
        const result = new Array(target.length).fill("absent");
        const targetLetters = target.split("");
        const guessLetters = upperWord.split("");

        // Pass 1: Verts
        guessLetters.forEach((letter, i) => {
            if (letter === targetLetters[i]) {
                result[i] = "correct";
                targetLetters[i] = null;
                guessLetters[i] = null;
            }
        });

        // Pass 2: Jaunes
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
      do {
        code = generateRoomCode()
      }
      while (rooms[code]);


      if (!rooms[code]) {
            rooms[code] = {
                joueurs: [],
                sousThemes: [],
                questionsDejaPosees: [],
                themeActuel: "",
                nbQuestions: 5,
                reponsesGlobales: [],
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
        }

        rejoindreLobby({ socket, pseudo, permanentId, roomCode:code });
    
    });

    
    // Un joueur rejoint le lobby
    socket.on('join_lobby', ({ pseudo, permanentId, roomCode }) => {
        rejoindreLobby({ socket, pseudo, permanentId, roomCode });
    });

    socket.on('submit_bomb_letters', (letters) => {
        const room = rooms[socket.roomCode];
        const currentPlayer = room.joueurs[room.bombData.currentPlayerIndex];
        if (currentPlayer.id === socket.id) {
          room.bombData.rep[currentPlayer.permanentId] = letters;
          io.to(socket.roomCode).emit('bomb_update', getBombStatePayload(room));
        }
    });

    socket.on('wiki_click', (pageCible) => {
        const room = rooms[socket.roomCode];
        if (!room || room.type !== 'wikipedia' || !room.wikiData) return;

        const pId = room.joueurs.find(j => j.id === socket.id)?.permanentId;
        if (!pId) return;

        // On ajoute la page cliquée au chemin du joueur
        room.wikiData.chemins[pId].push(pageCible);

        // Sauvegarde en temps réel du parcours
        if (room.reponsesGlobales[pId]) {
            room.reponsesGlobales[pId].reponses[room.questionsDejaPosees.length - 1] = [room.wikiData.chemins[pId].join(" ➔ "), 0];
        }

        // A-t-il gagné ?
        if (pageCible === room.wikiData.arrivee && !room.wikiData.gagnants.includes(pId)) {
            room.wikiData.gagnants.push(pId);
            
            // On met à jour le score dans la sauvegarde
            if (room.reponsesGlobales[pId]) {
                const score = room.questionsDejaPosees[room.questionsDejaPosees.length - 1]?.difficulty || 5;
                room.reponsesGlobales[pId].reponses[room.questionsDejaPosees.length - 1] = [room.wikiData.chemins[pId].join(" ➔ "), score];
            }

            socket.emit('wiki_win'); // On prévient le joueur qu'il a fini !
            
            // Si tout le monde a gagné, on accélère la fin
            if (room.wikiData.gagnants.length === room.joueurs.length) {
                room.tempsRestant = 5; 
            }
        }
    });


    socket.on('submit_bomb_word', (word) => {
        const room = rooms[socket.roomCode];
        if (!room || room.type !== 'bombParty' || !room.bombData) return;

        const currentPlayer = room.joueurs[room.bombData.currentPlayerIndex];
        if (currentPlayer.id !== socket.id) return; // Ce n'est pas ton tour !

        // On nettoie le mot tapé par le joueur de la même manière que le dico
        const upperWord = word
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") 
            .replace(/[^a-zA-Z]/g, "")
            .toUpperCase();
        
        // 1. Vérification de la syllabe
        if (!upperWord.includes(room.bombData.syllabe)) {
            socket.emit('bomb_error', "Il manque la syllabe !");
            return;
        }

        // 2. Vérification dans le dictionnaire français
        if (!dictionnaireFr.has(upperWord)) {
            socket.emit('bomb_error', "Ce mot n'existe pas !");
            return;
        }

        // 3. Vérification des mots déjà utilisés
        if (room.bombData.usedWords.includes(upperWord)) {
            socket.emit('bomb_error', "Déjà dit !");
            return;
        }

        // Si on arrive ici, le mot est PARFAIT !
        room.bombData.usedWords.push(upperWord);
        nextBombPlayer(room); // On passe au joueur suivant (ta fonction d'avant)
        io.to(socket.roomCode).emit('bomb_update', getBombStatePayload(room));
    });

    socket.on("change_etat", (etat) => {
      const room = rooms[socket.roomCode];
      if (socket.id === room.joueurs[0].id) {
        io.to(socket.roomCode).emit("update_etat", etat);
      }
    });

    socket.on("send_chat", (texte) => {
      const room = rooms[socket.roomCode];
      room.historiqueChat.push(texte);
      io.to(socket.roomCode).emit("update_chat", texte);
    });

    socket.on("next_review", (estBon) => {
      const room = rooms[socket.roomCode];
      const isChef = socket.id === room.joueurs[0].id;
      
      const indexQuestionEnCours = room.questionsDejaPosees.length - 1; // La question actuelle
      
      if (isChef) {
        if (room.indexJoueurReview == 0) {
          const joueur = room.joueurs[room.joueurs.length-1];
          const id = joueur.permanentId;
          room.reponsesGlobales[id].reponses[room.indexQuestionReview-1][1] = estBon;
        }
        else {
          const joueur = room.joueurs[room.indexJoueurReview-1];
          const id = joueur.permanentId;
          room.reponsesGlobales[id].reponses[room.indexQuestionReview][1] = estBon;
        }
        

        
        passerALaSuite(socket.roomCode);
      }
    });


    socket.on("ready", () => {
      const room = rooms[socket.roomCode];
      const joueur = room.joueurs.find(j => j.id === socket.id);
  
      // 2. Si on le trouve, on change son état
      if (joueur) {
        joueur.pret = true;
        // 3. IMPORTANT : On prévient tout le monde que le lobby a changé
        io.to(socket.roomCode).emit('update_pret', room.joueurs);
      }
    });

    socket.on("unready", () => {
      const room = rooms[socket.roomCode];
      const joueur = room.joueurs.find(j => j.id === socket.id);
  
      // 2. Si on le trouve, on change son état
      if (joueur) {
        joueur.pret = false;
        // 3. IMPORTANT : On prévient tout le monde que le lobby a changé
        io.to(socket.roomCode).emit('update_pret', room.joueurs);
      }
    });

    socket.on('send_rep', (rep) => {
      const room = rooms[socket.roomCode];
      if (room.joueurs.length === 0) {
      return 
      }
    const joueur = room.joueurs.find(j => j.id === socket.id);
    if (joueur) {
        const id = joueur.permanentId;
        const indexQuestionEnCours = room.questionsDejaPosees.length - 1; // La question actuelle

        if (room.reponsesGlobales[id]) {
            // On remplace la valeur vide par la vraie réponse du joueur
            room.reponsesGlobales[id].reponses[indexQuestionEnCours] = [rep, false];
        }
    }
});
    

    // Lancement de la partie par un joueur
    socket.on('start_game', async (nombreQuestions) => {
      const room = rooms[socket.roomCode];
      const isChef = socket.id === room.joueurs[0].id;
      if (!isChef) {
        return;
      }
        io.to(socket.roomCode).emit('loading_status', { loading: true, nextGame: "Initialisation..." }); 
        
        try {
            room.questionsDejaPosees = [];
            room.indexQuestionReview = 0;
            room.indexJoueurReview = 0;
            room.nombreQuestions = nombreQuestions;

            const {quizData, type, difficulty} = await nouvelleQuestion(socket.roomCode);
            
            // On informe du premier jeu
            io.to(socket.roomCode).emit('loading_status', { 
                loading: true, 
                nextGame: nomsJeux[type] || type,
                description: descriptionsJeux[type] || ""
            });

            // On attend 5 secondes
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
      if (room.joueurs.length > 0) {
        if (socket.id === room.joueurs[0].id) {
          room.nbQuestionsActuel = n;
          io.to(socket.roomCode).emit("updateNbQuestions", n);
          
        }
      }
    })


    socket.on('change_theme', (theme) => {
      const room = rooms[socket.roomCode];
      if (socket.id === room.joueurs[0].id) {
        room.themeActuel = theme;
        io.to(socket.roomCode).emit("updateTheme", theme);
        
      }
    })

    socket.on('disconnect', () => {
      const room = rooms[socket.roomCode];
      if (room) {
        lobby = room.joueurs.filter(player => player.id !== socket.id);
        if (lobby.length > 0) {
          lobby[0].pret = true;
          io.to(socket.roomCode).emit('update_pret', lobby);
        }
      }
    });
});

server.listen(3001, () => console.log("Serveur Multi lancé sur le port 3001"));
