import React, { useState, useEffect } from 'react';

export const WordleGame = ({ socket, theme, remplirText, review, valueText, pseudoReview, estBon, reponse, longueur }) => {
  const wordLength = reponse?.length || longueur || 5;
  const [guesses, setGuesses] = useState(new Array(6).fill(""));
  const [statuses, setStatuses] = useState(new Array(6).fill(null));
  const [currentGuess, setCurrentGuess] = useState("");
  const [currentRow, setCurrentRow] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [message, setMessage] = useState("");
  const [usedKeys, setUsedKeys] = useState({}); // { 'A': 'correct', 'B': 'absent' ... }
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (review && valueText) {
      try {
        const data = JSON.parse(valueText);
        setGuesses(data.guesses || new Array(6).fill(""));
        setStatuses(data.statuses || new Array(6).fill(null));
        setCurrentRow(data.currentRow || 0);
        setGameOver(true);
      } catch (e) {
        setGuesses(new Array(6).fill(""));
      }
    }
  }, [review, valueText]);

  useEffect(() => {
    if (review || !socket) return;

    const handleWordleRes = ({ isValid, result, won, message: serverMsg }) => {
        if (!isValid) {
            setMessage(serverMsg || "Mot invalide !");
            setShake(true);
            setTimeout(() => {
                setMessage("");
                setShake(false);
                setCurrentGuess("");
            }, 1000);
            return;
        }

        const newGuesses = [...guesses];
        const newStatuses = [...statuses];
        newGuesses[currentRow] = currentGuess;
        newStatuses[currentRow] = result;

        const newUsedKeys = { ...usedKeys };
        currentGuess.split("").forEach((letter, i) => {
            const currentStatus = result[i];
            const oldStatus = newUsedKeys[letter];
            
            if (currentStatus === "correct") {
                newUsedKeys[letter] = "correct";
            } else if (currentStatus === "present" && oldStatus !== "correct") {
                newUsedKeys[letter] = "present";
            } else if (!oldStatus) {
                newUsedKeys[letter] = "absent";
            }
        });

        setGuesses(newGuesses);
        setStatuses(newStatuses);
        setUsedKeys(newUsedKeys);

        if (won) {
            setGameOver(true);
            setMessage("Félicitations !");
            remplirText(JSON.stringify({ guesses: newGuesses, statuses: newStatuses, currentRow: currentRow + 1, won: true }));
        } else if (currentRow === 5) {
            setGameOver(true);
            setMessage("Perdu !");
            remplirText(JSON.stringify({ guesses: newGuesses, statuses: newStatuses, currentRow: 6, won: false }));
        } else {
            setCurrentRow(currentRow + 1);
            setCurrentGuess("");
            remplirText(JSON.stringify({ guesses: newGuesses, statuses: newStatuses, currentRow: currentRow + 1, won: false }));
        }
    };

    socket.on('wordle_res', handleWordleRes);
    return () => socket.off('wordle_res', handleWordleRes);
  }, [socket, currentGuess, currentRow, guesses, statuses, usedKeys, review, wordLength]);

  const onKeyPress = (key) => {
    if (gameOver || review) return;

    if (key === "ENTER") {
      if (currentGuess.length !== wordLength) {
        setMessage("Trop court !");
        setShake(true);
        setTimeout(() => {
            setMessage("");
            setShake(false);
        }, 800);
        return;
      }
      socket.emit('wordle_check_word', currentGuess);
    } else if (key === "BACKSPACE") {
      setCurrentGuess(currentGuess.slice(0, -1));
    } else if (currentGuess.length < wordLength && /^[A-Z]$/.test(key)) {
      setCurrentGuess(currentGuess + key);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const key = e.key.toUpperCase();
      if (key === "ENTER") onKeyPress("ENTER");
      else if (key === "BACKSPACE") onKeyPress("BACKSPACE");
      else if (/^[A-Z]$/.test(key)) onKeyPress(key);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentGuess, currentRow, gameOver, review, wordLength]);

  const getLetterStyle = (letter, index, rowIdx) => {
    if (rowIdx > currentRow || (rowIdx === currentRow && !review && !gameOver)) return "bg-slate-800 border-slate-600 text-white";
    
    const statusRow = statuses[rowIdx];
    if (!statusRow) return "bg-slate-800 border-slate-600 text-white";

    const status = statusRow[index];
    if (status === "correct") return "bg-emerald-500 border-emerald-500 text-white";
    if (status === "present") return "bg-yellow-500 border-yellow-500 text-white";
    if (status === "absent") return "bg-slate-600 border-slate-600 text-white";
    
    return "bg-slate-800 border-slate-600 text-white";
  };

  const getKeys = () => {
    const rows = [
      ["A", "Z", "E", "R", "T", "Y", "U", "I", "O", "P"],
      ["Q", "S", "D", "F", "G", "H", "J", "K", "L", "M"],
      ["ENTER", "W", "X", "C", "V", "B", "N", "BACKSPACE"],
    ];
    return rows;
  };

  const getKeyStyle = (key) => {
    let style = "bg-slate-400";
    if (key === "ENTER" || key === "BACKSPACE") style = "bg-slate-500 px-2 md:px-4";

    const status = usedKeys[key];
    if (status === "correct") return "bg-emerald-500 text-white";
    if (status === "present") return "bg-yellow-500 text-white";
    if (status === "absent") return "bg-slate-700 text-slate-400";

    return style + " text-white";
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-md">
      <style>{`
        @keyframes flip {
          0% { transform: rotateX(0deg); }
          50% { transform: rotateX(90deg); }
          100% { transform: rotateX(0deg); }
        }
        .letter-flip {
          animation: flip 0.6s ease-in-out;
        }
        .letter-pop {
          animation: pop 0.1s ease-in-out;
        }
        @keyframes pop {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
      `}</style>
      

      <div className={`grid grid-rows-6 gap-2 ${shake ? "animate-shake bg-red-500/20 p-2 rounded-xl" : ""}`}>
        {new Array(6).fill(0).map((_, rowIdx) => (
          <div key={rowIdx} className={`grid gap-1 md:gap-2`} style={{ gridTemplateColumns: `repeat(${wordLength}, minmax(0, 1fr))` }}>
            {new Array(wordLength).fill(0).map((__, colIdx) => {
              const letter = rowIdx === currentRow && !review ? currentGuess[colIdx] : (guesses[rowIdx] ? guesses[rowIdx][colIdx] : "");
              const isFilled = letter !== "";
              const shouldFlip = (review && guesses[rowIdx]) || rowIdx < currentRow;
              
              const boxSize = wordLength > 6 ? "w-9 h-9 md:w-12 md:h-12" : "w-11 h-11 md:w-14 md:h-14";
              const fontSize = wordLength > 6 ? "text-lg md:text-2xl" : "text-2xl";

              return (
                <div
                  key={colIdx}
                  className={`${boxSize} ${fontSize} border-2 flex items-center justify-center font-black rounded-sm transition-all duration-300 
                    ${isFilled && rowIdx === currentRow && !review ? "letter-pop border-slate-400" : ""}
                    ${shouldFlip ? "letter-flip" : ""}
                    ${getLetterStyle(letter, colIdx, rowIdx)}`}
                  style={{ animationDelay: shouldFlip ? `${colIdx * 100}ms` : "0ms" }}
                >
                  {letter}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {message && <div className={`bg-white text-black px-4 py-2 rounded-lg font-bold animate-bounce z-50 ${shake ? "border-2 border-red-500" : ""}`}>{message}</div>}

      {!review && !gameOver && (
        <div className="flex flex-col gap-1 md:gap-2 mt-2 md:mt-4 w-full px-2">
          {getKeys().map((row, i) => (
            <div key={i} className="flex justify-center gap-1">
              {row.map((key) => (
                <button
                  key={key}
                  onClick={() => onKeyPress(key)}
                  className={`h-10 md:h-12 rounded font-bold text-[10px] md:text-sm flex items-center justify-center min-w-[24px] md:min-w-[30px] flex-1 ${getKeyStyle(key)}`}
                >
                  {key === "BACKSPACE" ? "⌫" : key}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      {review && (
        <div className="mt-4 text-center">
            <p className="text-slate-400 uppercase text-xs font-bold">Le mot était</p>
            <p className="text-3xl font-black text-emerald-400">{reponse}</p>
        </div>
      )}
    </div>
  );
};
