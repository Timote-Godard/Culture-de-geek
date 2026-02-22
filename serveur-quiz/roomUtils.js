const { syllabesBomb } = require('./constants');

function generateRoomCode() {
  const liste = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += liste.charAt(Math.floor(Math.random() * liste.length));
  }
  return result;
}

function getResultatFin(room) {
  let resultatsFin = [];
  room.joueurs.forEach((joueur) => {
    let score = 0;
    room.reponsesGlobales[joueur.permanentId].reponses.forEach((rep, index) => {
      if (rep[1] === true) {
        score = score + room.questionsDejaPosees[index].difficulty;
      } else if (Array.isArray(rep[1])) {
        score = score + rep[1].filter(val => val === true).length;
      } else if (typeof rep[1] === 'number') {
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

function nextBombPlayer(room) {
  room.bombData.syllabe = syllabesBomb[Math.floor(Math.random() * syllabesBomb.length)];
  room.bombData.turnTimeLeft = 10;

  let loops = 0;
  do {
    room.bombData.currentPlayerIndex = (room.bombData.currentPlayerIndex + 1) % room.joueurs.length;
    loops++;
  } while (
    room.bombData.vies[room.joueurs[room.bombData.currentPlayerIndex].permanentId] <= 0
    && loops <= room.joueurs.length
  );

  let playersAlive = room.joueurs.filter(j => room.bombData.vies[j.permanentId] > 0).length;
  if (playersAlive <= 1 && room.tempsRestant > 5) {
    room.tempsRestant = 5;
  }
}

module.exports = {
  generateRoomCode,
  getResultatFin,
  getBombStatePayload,
  nextBombPlayer
};
