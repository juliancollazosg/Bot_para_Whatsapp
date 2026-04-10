const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');

const client = new Client({
    authStrategy: new LocalAuth()
});

const appsCriticas = ["AC", "ACPLUS", "DIGITURNOS","PQRS"];
let ultimoEnvio = "";

let contadorApps = {};
let contadorPrioridad = {
    "🔴 ALTA": 0,
    "🟡 MEDIA": 0,
    "🟢 BAJA": 0
};

const apps = {
    "IVR": ["ivr"],
    "WHATSAPP": ["whatsapp"],
    "CRM": ["crm", "onyx"],
    "AC": ["ac", "acplus"],
    "PQRS": ["pqrs", "pqr", "gestor pqrs"],
    "DIGITURNOS": ["digiturnos"],
    "POSVENTA": ["posventa"]
};

const keywords = [
    "julian.guerrero", 
    "ac", 
    "acplus", 
    "gestor pqrs", 
    "digiturnos",
    "pqr",
    "posventa",
    "julian collazos"
];

let ultimaAlerta = {};
const TIEMPO_ESPERA = 60000;

// 🔹 FUNCIONES FUERA (CORRECTO)

function detectarApp(texto) {
    for (const app in apps) {
        const encontrada = apps[app].some(p => new RegExp(`\\b${p}\\b`, 'i').test(texto));
        if (encontrada) return app;
    }
    return "DESCONOCIDA";
}

function detectarPrioridad(texto) {
    if (texto.includes("alta") || texto.includes("critica")) return "🔴 ALTA";
    if (texto.includes("media")) return "🟡 MEDIA";
    if (texto.includes("bajo") || texto.includes("baja")) return "🟢 BAJA";
    return "🟡 MEDIA";
}

function guardarAlerta(app, prioridad, grupo, mensaje) {
    const ahora = new Date();
    const linea = `"${ahora.toLocaleDateString()}","${ahora.toLocaleTimeString()}","${app}","${prioridad}","${grupo}","${mensaje.replace(/"/g, '')}"\n`;

    fs.appendFile('alertas.csv', linea, () => {});
}

function generarResumen() {
    let resumen = "📊 *RESUMEN DE ALERTAS*\n\n";

    resumen += "📱 *Por Aplicación:*\n";
    for (const app in contadorApps) {
        resumen += `- ${app}: ${contadorApps[app]}\n`;
    }

    resumen += "\n⚠️ *Por Prioridad:*\n";
    for (const p in contadorPrioridad) {
        resumen += `- ${p}: ${contadorPrioridad[p]}\n`;
    }

    return resumen;
}

// 🔹 EVENTOS

client.on('qr', qr => qrcode.generate(qr, { small: true }));

client.on('ready', () => {
    console.log('✅ Bot listo');
});

client.on('message', async message => {

    const chat = await message.getChat();
    const nombreChat = chat.name || "Chat privado";

    const texto = message.body.toLowerCase();
    const normalizado = texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const encontrado = keywords.some(p => new RegExp(`\\b${p}\\b`, 'i').test(normalizado));

    if (!encontrado) return;

    const ahora = Date.now();
    const clave = nombreChat;

    const appDetectada = detectarApp(normalizado);
    const prioridad = detectarPrioridad(normalizado);

    guardarAlerta(appDetectada, prioridad, nombreChat, message.body);

    contadorApps[appDetectada] = (contadorApps[appDetectada] || 0) + 1;
    contadorPrioridad[prioridad]++;

    const esAppCritica = appsCriticas.includes(appDetectada);
    const esAlta = prioridad.includes("🔴");

    if (!esAppCritica && !esAlta) return;

    if (ultimaAlerta[clave] && (ahora - ultimaAlerta[clave] < TIEMPO_ESPERA)) return;

    ultimaAlerta[clave] = ahora;

    client.sendMessage(
        "120363424715603892@g.us",
`🚨 *ALERTA CRÍTICA*

📱 *App:* ${appDetectada}
⚠️ *Prioridad:* ${prioridad}
🎯 *Tipo:* ${esAlta ? "🔴 ALTA PRIORIDAD" : "🟡 APP CRÍTICA"}
👥 *Grupo:* ${nombreChat}

💬 *Detalle:*
${message.body}`
    );

});

// 🔹 RESUMEN DIARIO

setInterval(() => {

    const ahora = new Date();
    const hora = ahora.getHours();
    const minutos = ahora.getMinutes();
    const fechaHoy = ahora.toLocaleDateString();

    if (hora === 19 && minutos === 0 && ultimoEnvio !== fechaHoy) {

        const resumen = generarResumen();

        client.sendMessage(
            "120363424715603892@g.us",
            `📊 *RESUMEN DIARIO*\n\n${resumen}`
        );

        ultimoEnvio = fechaHoy;

        contadorApps = {};
        contadorPrioridad = {
            "🔴 ALTA": 0,
            "🟡 MEDIA": 0,
            "🟢 BAJA": 0
        };
    }

}, 60000);

// 🔹 INICIO
client.initialize();