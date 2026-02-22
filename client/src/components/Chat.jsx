
import React, { useState, useEffect, useRef } from 'react';
import { COMPONENTS } from '../theme';

export const Chat = ({ onClick, historiqueChat, theme }) => {
  const [texteChat, changerTexteChat] = useState("");
  const finChatRef = useRef(null);
  const [open, setOpen] = useState(false);

  const scrollToBottom = () => {
    finChatRef.current?.scrollIntoView({ behavior: "auto" });
  };

  useEffect(() => {
    if (open) scrollToBottom();
  }, [historiqueChat, open]);

  return (
    <div className={`${COMPONENTS.chat.container} ${open ? "translate-y-0" : "translate-y-[calc(100%-10px)]"}`}>
      <button
        onClick={() => setOpen(!open)}
        className={COMPONENTS.chat.button}
      >
        {open ? "▼ Fermer" : "▲ Chat"}
      </button>

      <div className='h-full p-4 md:p-9 flex flex-col'>
        <div className={COMPONENTS.chat.history} >
          {historiqueChat.map ((chat, index) => (
            <p key={index} className="mb-1 text-sm md:text-base">{chat}</p>
          ))}
          <div ref={finChatRef} />
        </div>

        <div className='flex flex-row gap-2 mt-auto'>
          <input
            type="text" placeholder='Écris ici...' value={texteChat} 
            onChange={(e) => changerTexteChat(e.target.value)} 
            className={`${COMPONENTS.chat.input} ${texteChat === "" ? "" : "shadow-[inset_0_2px_8px_rgba(0,0,0,0.3)]" }`}
            onKeyDown={(e) => { if (e.key === 'Enter') { onClick(texteChat); changerTexteChat(""); } }}
          />
          <button onClick={() => {onClick(texteChat); changerTexteChat(""); }} className={COMPONENTS.chat.sendBtn}>
            ➤
          </button>
        </div>
      </div>
    </div>
  );
};
