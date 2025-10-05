const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-5-mini';
const API_URL = 'https://api.openai.com/v1/chat/completions';

async function callOpenAI({ messages, model, max_tokens = 512, temperature = 0.7, timeout = 15000 }){
  if(!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set in env');

  const usedModel = model || DEFAULT_MODEL;
  const controller = new AbortController();
  const id = setTimeout(()=> controller.abort(), timeout);

  try{
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({ model: usedModel, messages, max_tokens, temperature }),
      signal: controller.signal
    });

    clearTimeout(id);

    if(!res.ok){
      const body = await res.text().catch(()=>'<no body>');
      const err = new Error(`OpenAI error ${res.status}: ${res.statusText} - ${body}`);
      err.status = res.status;
      throw err;
    }

    const data = await res.json();
    return data;
  }catch(err){
    if(err.name === 'AbortError') throw new Error('OpenAI request timed out');
    throw err;
  }
}

module.exports = { callOpenAI, DEFAULT_MODEL };
