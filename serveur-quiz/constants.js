const typesDisponibles = ['qcm', 'ouverte', 'drapeau', "devineMeme", "codeTrou", "chronologie", "petitBac", "bombParty", "wikipedia", "wordle", "rgb"];

const tempsType = {
  "qcm": 20,
  "ouverte": 20,
  "drapeau": 15,
  "devineMeme": 20,
  "codeTrou": 30,
  "chronologie": 30,
  "petitBac": 40,
  "bombParty": 60,
  "wikipedia": 120,
  "wordle": 90,
  "rgb": 20,
};

const descriptionsJeux = {
  "qcm": "Choisis la bonne réponse parmi les 4 options.",
  "ouverte": "Tape la réponse exacte à la question posée.",
  "drapeau": "Identifie le pays correspondant au drapeau affiché.",
  "devineMeme": "Retrouve le nom de ce célèbre mème internet.",
  "codeTrou": "Complète le morceau de code manquant.",
  "chronologie": "Remets les événements dans le bon ordre chronologique.",
  "petitBac": "Trouve un mot commençant par la lettre pour chaque catégorie.",
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

const lettresPetitBac = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "L", "M", "N", "O", "P", "R", "S", "T", "V"];
const categoriesPetitBac = [
  "Prénom", "Pays ou Ville", "Animal", "Métier", "Fruit ou Légume",
  "Objet du quotidien", "Marque", "Célébrité", "Sport", "Couleur",
  "Instrument de musique", "Film ou Série", "Plat ou Nourriture",
  "Moyen de transport", "Vêtement", "Élément de la nature", "Jeu vidéo"
];

const syllabesBomb = ["TRA", "MEN", "ION", "PAR", "CHE", "QUE", "ENT", "ASS", "OUR", "ITE", "ONS", "EUR", "ANT", "EMENT", "TION", "AGE", "ETTE", "OIR"];

module.exports = {
  typesDisponibles,
  tempsType,
  descriptionsJeux,
  nomsJeux,
  lettresPetitBac,
  categoriesPetitBac,
  syllabesBomb
};
