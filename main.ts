import makeWASocket, { useMultiFileAuthState } from 'baileys';
import * as QRCode from 'qrcode';
import { FlowManager } from './src/services/FlowManager';
import { ServicosFlow } from './src/flows/ServicosFlow';
import { existsSync, unlinkSync, readFileSync, writeFileSync } from 'fs';
import express from 'express';

const HISTORY_FILE = './history.json';
function loadHistory(): Record<string, string[]> {
    if (existsSync(HISTORY_FILE)) {
        const data = readFileSync(HISTORY_FILE, 'utf-8');
        return JSON.parse(data);
    }
    return {};
}
function saveHistory(history: Record<string, string[]>): void {
    writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf-8');
}
const messageHistory = loadHistory();

let sockGlobal: any = null;


const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));
const PROJECT_NAME = pkg.name || 'Projeto';
const BOT_NAME = pkg.botName || 'Bot';

async function connectToWhatsApp(): Promise<void> {
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
    const sock = makeWASocket({ auth: state });
    sockGlobal = sock;

    const flowManager = new FlowManager();
    flowManager.registerFlow(new ServicosFlow());

    sock.ev.on('connection.update', (update) => {
        const { connection, qr, lastDisconnect } = update;
        if (qr) {
            QRCode.toFile('./qrcode.png', qr, (err: any) => {
                if (err) console.error('Erro ao gerar QR Code', err);
                else console.log('QR Code gerado: qrcode.png');
            });
        }
        if (connection === 'open') {
            console.log('✅ Conectado ao WhatsApp');
        } else if (connection === 'close') {
            let reason = '';
            if (lastDisconnect && lastDisconnect.error) {
                reason = ` Motivo: ${(lastDisconnect.error as Error).message}`;
                console.error('Erro de conexão:', lastDisconnect.error);
            }
            console.log(`❌ Conexão encerrada.${reason}`);
            if (existsSync('./qrcode.png')) unlinkSync('./qrcode.png');
        }
    });

    async function sendMessage(number: string, text: string, quotedMsg?: any): Promise<void> {
        const finalMessage = '🤖\n' + text;
        await sock.sendMessage(number, { text: finalMessage }, { quoted: quotedMsg });
    }

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg || !msg.message) return;

        const from = msg.key.remoteJid!;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
        if (!text) return;

        let nomeContato: string;
        let nomeGrupo: string = '';
        if (from.endsWith('@g.us')) {
            try {
                const groupMetadata = await sock.groupMetadata(from);
                nomeGrupo = groupMetadata.subject || 'Grupo sem nome';
                if (msg.key.fromMe) {
                    nomeContato = BOT_NAME;
                } else if (msg.pushName) {
                    nomeContato = msg.pushName;
                } else if (msg.key.participant) {
                    // Extrai o número do JID (ex: 556599377914@s.whatsapp.net)
                    const jid = msg.key.participant;
                    const match = jid.match(/^(\d+)(@.*)?$/);
                    nomeContato = match ? match[1] : jid;
                } else {
                    nomeContato = 'Desconhecido';
                }
            } catch (err) {
                nomeGrupo = 'Grupo desconhecido';
                nomeContato = 'Desconhecido';
            }
        } else {
            if (msg.key.fromMe) {
                nomeContato = BOT_NAME;
            } else {
                nomeContato = msg.pushName || msg.key.participant || from;
            }
        }
        const nomeContatoFormatado = nomeGrupo ? `[${nomeGrupo}] ${nomeContato}` : nomeContato;
        console.log(`📥 Mensagem de ${nomeContatoFormatado}: ${text}`);

        if (!messageHistory[from]) messageHistory[from] = [];
        messageHistory[from].push(`${nomeContatoFormatado}: ${text}`);
        saveHistory(messageHistory);

        const senderId = from.endsWith('@g.us') ? (msg.key.participant || from) : from;
        await flowManager.handleMessage(from, text, senderId, async (reply) => {
            await sendMessage(from, reply, msg);
        });
    });

    sock.ev.on('creds.update', saveCreds);
}

connectToWhatsApp();


const app = express();
app.use(express.json());

app.post('/send', async (req, res) => {
    const { id, mensagem } = req.body;
    if (!id || !mensagem) {
        return res.status(400).json({ error: 'id e mensagem são obrigatórios' });
    }
    if (!sockGlobal) {
        return res.status(503).json({ error: 'WhatsApp não conectado ainda.' });
    }
    try {
        await sockGlobal.sendMessage(id, { text: mensagem });
        if (!messageHistory[id]) messageHistory[id] = [];
        messageHistory[id].push(`(API): ${mensagem}`);
        saveHistory(messageHistory);
        res.json({ status: 'Mensagem enviada', id, mensagem });
    } catch (e: any) {
        res.status(500).json({ error: 'Erro ao enviar mensagem', details: e.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Express rodando na porta ${PORT}`);
});
