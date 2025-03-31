// server.js
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { spawn } from 'child_process';

const app = express();
const PORT = 11434; // port utilisé par Ollama

app.use(cors());
app.use(bodyParser.json());

app.post('/anecdote', async (req, res) => {
    const { pokemonName } = req.body;
    const prompt = `Donne une anecdote amusante ou intéressante sur le Pokémon ${pokemonName}, en une ou deux phrases.`;

    const ollama = spawn('ollama', ['run', 'mistral'], { stdio: ['pipe', 'pipe', 'pipe'] });

    let output = '';
    ollama.stdout.on('data', (data) => {
        output += data.toString();
    });

    ollama.stdin.write(prompt + '\n');
    ollama.stdin.end();

    ollama.on('close', () => {
        res.json({ anecdote: output.trim() });
    });
});

app.listen(3001, () => {
    console.log(`Serveur API lancé sur http://localhost:3001`);
});
