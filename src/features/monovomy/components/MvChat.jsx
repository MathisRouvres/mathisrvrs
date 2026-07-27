import { useState } from 'react'

export default function MvChat({ messages, onSend }) {
  const [text, setText] = useState('')

  const submit = (event) => {
    event.preventDefault()
    onSend(text)
    setText('')
  }

  return (
    <section className="mv-chat">
      <div className="mv-chat__log">
        {messages.length === 0 && <p className="mv-chat__empty">Chambre vide… lance une pique 👀</p>}
        {messages.map((m, i) => (
          <p key={`${m.at}-${i}`} className="mv-chat__msg">
            <b>{m.name}</b> {m.text}
          </p>
        ))}
      </div>
      <form className="mv-chat__form" onSubmit={submit}>
        <input
          className="mv-input"
          value={text}
          maxLength={140}
          placeholder="Écris un message…"
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit" className="mv-btn mv-btn--primary mv-chat__send">
          ➤
        </button>
      </form>
    </section>
  )
}
