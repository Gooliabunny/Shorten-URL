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
    const response = await fetch('http://localhost:8000/', {
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
    await navigator.clipboard.writeText(`http://localhost:8000/${result}`);
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
          <h4>http://localhost:8000/{result}</h4>
          <button onClick={handleCopy}>Copy to Clipboard</button>
        </section>
      }
    </main>
  )
}

export default App