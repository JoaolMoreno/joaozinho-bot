import makeWASocket, { useMultiFileAuthState } from 'baileys';
import * as QRCode from 'qrcode';
import { FlowManager } from './src/services/FlowManager';
import { ServicosFlow } from './src/flows/ServicosFlow';
import {existsSync, unlinkSync} from "fs";

async function connectToWhatsApp(): Promise<void> {
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
    const sock = makeWASocket({ auth: state });

    const flowManager = new FlowManager();
    flowManager.registerFlow(new ServicosFlow());

    sock.ev.on('connection.update', ({ connection, qr }) => {
        if (qr) {
            QRCode.toFile('./qrcode.png', qr, (err: any) => {
                if (err) console.error('Erro ao gerar QR Code', err);
                else console.log('QR Code gerado: qrcode.png');
            });
        }
        if (connection === 'open') {
            console.log('✅ Conectado ao WhatsApp');
        } else if (connection === 'close') {
            console.log('❌ Conexão encerrada');
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

        console.log(`📥 Mensagem de ${from}: ${text}`);

        if(!text.includes('🤖')){
            await flowManager.handleMessage(from, text, async (reply) => {
                await sendMessage(from, reply, msg);
            });
        }
    });

    sock.ev.on('creds.update', saveCreds);
}

connectToWhatsApp();
