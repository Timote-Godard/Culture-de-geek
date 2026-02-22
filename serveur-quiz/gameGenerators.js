const axios = require('axios');
const { decode } = require('html-entities');
const {
  listePays,
  listeMeme,
  chronologieData,
  snippetsData,
  questionsOuvertesData,
  questionsQcmData,
  wordleWordsByLength,
  wikiConcepts
} = require('./dataLoader');
const {
  lettresPetitBac,
  categoriesPetitBac,
} = require('./constants');

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
      difficulty: 5
    };
  } catch (e) {
    return { quizData: { question: "Wiki-Racing", depart: "Pomme", arrivee: "Cheval" }, difficulty: 5 };
  }
}

function genererPetitBacLocal() {
  const lettre = lettresPetitBac[Math.floor(Math.random() * lettresPetitBac.length)];
  const melange = [...categoriesPetitBac].sort(() => 0.5 - Math.random());
  const categoriesChoisies = melange.slice(0, 5);
  return {
    quizData: {
      question: `Petit Bac : Trouve 5 mots commençant par la lettre`,
      lettre: lettre,
      categories: categoriesChoisies,
      reponse: "Validation manuelle du Chef"
    },
    difficulty: 5
  };
}

function genererCodeTrouLocal() {
  const langagesDisponibles = Object.keys(snippetsData);
  if (langagesDisponibles.length === 0) {
    return { quizData: { question: "Erreur", langage: "Aucun", code: "Dossier vide", reponse: "Erreur" }, difficulty: 1 };
  }
  const langageChoisi = langagesDisponibles[Math.floor(Math.random() * langagesDisponibles.length)];
  const questionsDuLangage = snippetsData[langageChoisi];
  const snippet = questionsDuLangage[Math.floor(Math.random() * questionsDuLangage.length)];
  return {
    quizData: {
      question: snippet.question,
      langage: langageChoisi,
      code: snippet.code,
      reponse: snippet.reponse
    },
    difficulty: snippet.difficulte
  };
}

async function memeFlou() {
  const randomMeme = listeMeme[Math.floor(Math.random() * listeMeme.length)];
  const quizData = {
    question: "Qui est-ce ?",
    image: randomMeme.url,
    reponse: randomMeme.nom
  }
  let difficulty;
  switch (randomMeme.difficulte) {
    case "easy": difficulty = 1; break;
    case "medium": difficulty = 2; break;
    case "hard": difficulty = 3; break;
    default: difficulty = 0; break;
  }
  return { quizData, difficulty };
}

async function fetchQuizQuestion() {
  try {
    const response = await axios.get('https://opentdb.com/api.php?amount=1&type=multiple');
    const data = response.data.results[0];
    const question = decode(data.question);
    const correct_answer = decode(data.correct_answer);
    const incorrect_answers = data.incorrect_answers.map(ans => decode(ans));
    let difficulty;
    switch (decode(data.difficulty)) {
      case "easy": difficulty = 1; break;
      case "medium": difficulty = 2; break;
      case "hard": difficulty = 3; break;
      default: difficulty = 0; break;
    }
    const options = [...incorrect_answers, correct_answer].sort(() => Math.random() - 0.5);
    const quizData = { question, options, reponse: correct_answer };
    return { quizData, difficulty };
  } catch (error) {
    console.error("Erreur lors de l'appel API OpenTDB:", error);
    return null;
  }
}

function genererQuestionOuverteLocale() {
  const themesDisponibles = Object.keys(questionsOuvertesData);
  if (themesDisponibles.length === 0) {
    return { quizData: { question: "Erreur serveur", reponse: "Aucune question" }, difficulty: 1 };
  }
  const themeChoisi = themesDisponibles[Math.floor(Math.random() * themesDisponibles.length)];
  const questionsDuTheme = questionsOuvertesData[themeChoisi];
  const q = questionsDuTheme[Math.floor(Math.random() * questionsDuTheme.length)];
  return {
    quizData: { question: q.question, reponse: q.reponse },
    difficulty: q.difficulte || 2
  };
}

function genererChronologieLocale() {
  let shuffled = [...chronologieData].sort(() => 0.5 - Math.random());
  let selected = shuffled.slice(0, 4);
  let correctOrder = [...selected].sort((a, b) => a.annee - b.annee);
  let questionItems = [...selected].sort(() => 0.5 - Math.random());
  return {
    quizData: {
      question: "Remets ces éléments dans l'ordre chronologique (du plus ancien au plus récent) :",
      items: questionItems,
      reponse: correctOrder,
    },
    difficulty: 3
  };
}

function genererQuestionQcmLocale() {
  const themesDisponibles = Object.keys(questionsQcmData);
  if (themesDisponibles.length === 0) {
    return { quizData: { question: "Erreur serveur", reponse: "Aucune question", options: ["", "", "", ""] }, difficulty: 1 };
  }
  const themeChoisi = themesDisponibles[Math.floor(Math.random() * themesDisponibles.length)];
  const questionsDuTheme = questionsQcmData[themeChoisi];
  const q = questionsDuTheme[Math.floor(Math.random() * questionsDuTheme.length)];
  return {
    quizData: { question: q.question, reponse: q.reponse, options: q.options },
    difficulty: q.difficulte || 2
  };
}

async function devineDrapeau() {
  const pays = listePays[Math.floor(Math.random() * listePays.length)];
  return {
    question: "Quel est le pays associé à ce drapeau ?",
    reponse: pays.nom,
    image: `https://flagcdn.com/${pays.code}.svg`
  };
}

module.exports = {
  genererRgbLocal,
  genererWordleLocal,
  genererWikipedia,
  genererPetitBacLocal,
  genererCodeTrouLocal,
  memeFlou,
  fetchQuizQuestion,
  genererQuestionOuverteLocale,
  genererChronologieLocale,
  genererQuestionQcmLocale,
  devineDrapeau
};
