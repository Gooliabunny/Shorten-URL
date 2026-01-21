import React from 'react'
import { useState } from 'react';


const App = () => {
  const [url, setUrl] = useState('');
  const [result, setResult] = useState();

  const handleInput = (e) => {
    setUrl(e.target.value);
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!url || url.indexOf('.') === -1 || url.split('.')[1] === '') return;

    try {
    const response = await fetch('https://shorten-url-backend-production.up.railway.app/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ value: url }),
    });
    setResult(await response.json());
  } catch (error) {
    console.error('Error:', error);
  }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(`https://shorten-url-backend-production.up.railway.app/${result}`);
  }

  return (
    <main>
      <header>Shorten URL</header>

      <section className='firstSection'>
        <form onSubmit={handleSubmit}>
          <label htmlFor="link">Enter your URL:<br /></label>
          <input 
            id="link" 
            value={url} 
            onChange={handleInput} 
            placeholder="https://example.com"
          />
          <br />
          <button type="submit">Shorten</button>
        </form>
      </section>
      { result &&
        <section>
          <h4>shorten-url-backend-production.up.railway.app/{result}</h4>
          <button onClick={handleCopy}>Copy to Clipboard</button>
        </section>
      }
    </main>
  )
}

export default App
