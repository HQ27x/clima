const http = require('http');
const { callOpenAI } = require('./client');

const server = http.createServer(async (req, res) => {
  if(req.method === 'POST' && req.url === '/openai-test'){
    try{
      let body = '';
      for await (const chunk of req) body += chunk;
      const payload = JSON.parse(body || '{}');
      const messages = payload.messages || [{ role: 'user', content: 'Hola, dame un resumen corto del clima.' }];
      const data = await callOpenAI({ messages });
      res.writeHead(200, {'Content-Type':'application/json'});
      res.end(JSON.stringify(data));
    }catch(err){
      res.writeHead(500, {'Content-Type':'application/json'});
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  res.writeHead(404); res.end('Not found');
});

server.listen(4004, ()=> console.log('OpenAI example listening on :4004'));
