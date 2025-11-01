// speech-server.js
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const speech = require('@google-cloud/speech');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const client = new speech.SpeechClient();

wss.on('connection', (ws) => {
  const recognizeStream = client
    .streamingRecognize({
      config: {
        encoding: 'LINEAR16',
        sampleRateHertz: 16000,
        languageCode: 'en-US',
      },
      interimResults: true,
    })
    .on('data', (data) => {
      const transcript = data.results?.[0]?.alternatives?.[0]?.transcript;
      if (transcript) {
        ws.send(JSON.stringify({ transcript }));
      }
    });

  ws.on('message', (chunk) => {
    recognizeStream.write(chunk);
  });

  ws.on('close', () => {
    recognizeStream.destroy();
  });
});

server.listen(3001, () => console.log('🎙️ Speech server listening on http://localhost:3001'));
