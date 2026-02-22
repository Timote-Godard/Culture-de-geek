const fs = require('fs');
const path = require('path');
const dicoBrut = require('an-array-of-french-words');

const listePays = require('./pays.json');
const listeMeme = require('./memes.json');
const chronologieData = require('./chronologie.json');

const codeTrouDir = path.join(__dirname, 'codeTrou');
const snippetsData = {};
fs.readdirSync(codeTrouDir).forEach(file => {
  if (file.endsWith('.json')) {
    let langageName = file.replace('.json', '');
    langageName = langageName.charAt(0).toUpperCase() + langageName.slice(1);
    snippetsData[langageName] = require(path.join(codeTrouDir, file));
  }
});

const questionsOuvertesDir = path.join(__dirname, 'questionsOuvertes');
const questionsOuvertesData = {};
if (fs.existsSync(questionsOuvertesDir)) {
  fs.readdirSync(questionsOuvertesDir).forEach(file => {
    if (file.endsWith('.json')) {
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
      let themeName = file.replace('.json', '').toLowerCase();
      questionsQcmData[themeName] = require(path.join(questionsQcmDir, file));
    }
  });
}

const dictionnaireFr = new Set(
  dicoBrut.map(mot =>
    mot.normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z]/g, "")
      .toUpperCase()
  )
);

const wordleWordsByLength = {
  4: Array.from(dictionnaireFr).filter(mot => mot.length === 4),
  5: Array.from(dictionnaireFr).filter(mot => mot.length === 5),
  6: Array.from(dictionnaireFr).filter(mot => mot.length === 6),
  7: Array.from(dictionnaireFr).filter(mot => mot.length === 7)
};

const wikiConcepts = JSON.parse(fs.readFileSync(path.join(__dirname, 'concepts.json'), 'utf8')).cibles;

module.exports = {
  listePays,
  listeMeme,
  chronologieData,
  snippetsData,
  questionsOuvertesData,
  questionsQcmData,
  dictionnaireFr,
  wordleWordsByLength,
  wikiConcepts
};
