// ====================================================================
// CORE METEOROLOGICAL ENGINE & GRAPHICS SUITE - SERVERLESS BASELINE
// ====================================================================

let spcMatrix = null;

/**
 * Inicializa o simulador e carrega as matrizes bases
 */
async function initSimulator() {
    try {
        const response = await fetch('outlook.json');
        spcMatrix = await response.json();
        console.log("[SYSTEM] Matriz Conditional Intensity Outlooks SPC 2026 injetada.");
        
        // Dispara a carga inicial do modelo padrão
        await carregarDadosDoModelo();
    } catch (error) {
        console.error("[ERROR] Falha crítica ao carregar o arquivo outlook.json:", error);
    }
}

/**
 * Faz o fetch dinâmico combinando o Modelo Selecionado + o Horário da Rodada (Run)
 */
async function carregarDadosDoModelo() {
    const seletorModelo = document.getElementById('model-select');
    const seletorRun = document.getElementById('run-select');
    if (!seletorModelo || !seletorRun) return;

    const modelo = seletorModelo.value.toLowerCase(); 
    const run = seletorRun.value.toLowerCase();       
    const caminhoArquivo = `modelos/${modelo}_${run}.txt`;

    const logList = document.getElementById('log-container');
    const time = new Date().toISOString().substr(11, 8);

    try {
        const response = await fetch(caminhoArquivo);
        if (!response.ok) throw new Error(`Rodada ${modelo.toUpperCase()}_${run.toUpperCase()} indisponível.`);
        
        const textoBruto = await response.text();
        const parametros = extrairParametrosDoTexto(textoBruto);

        if (parametros.temp !== null) document.getElementById('input-temp').value = parametros.temp;
        if (parametros.dew !== null) document.getElementById('input-dew').value = parametros.dew;
        if (parametros.shear !== null) document.getElementById('input-shear').value = parametros.shear;

        if (logList) {
            logList.innerHTML += `<li><span class="log-timestamp">[${time}]</span> <span style="color:#38bdf8;">DATASTREAM_SUCCESS:</span> ${modelo.toUpperCase()} ${run.toUpperCase()} injetado.</li>`;
        }

        updateSimulationEngine();

    } catch (error) {
        console.warn("[WARNING]", error.message);
        if (logList) {
            logList.innerHTML += `<li><span class="log-timestamp">[${time}]</span> <span style="color:#ffa500;">[WARN]</span> Arquivo ${modelo}_${run}.txt ausente. Rodando modo livre.</li>`;
        }
        updateSimulationEngine();
    }
}

/**
 * Função Parser: Vasculha as linhas do arquivo de texto atrás de tags chave
 */
function extrairParametrosDoTexto(texto) {
    const lines = texto.split('\n');
    let dados = { temp: null, dew: null, shear: null };

    lines.forEach(line => {
        const cleanLine = line.replace(/\s+/g, '').toUpperCase();
        if (cleanLine.includes('TEMP=')) dados.temp = parseFloat(cleanLine.split('TEMP=')[1]);
        if (cleanLine.includes('DEW=')) dados.dew = parseFloat(cleanLine.split('DEW=')[1]);
        if (cleanLine.includes('SHEAR=')) dados.shear = parseFloat(cleanLine.split('SHEAR=')[1]);
    });

    return dados;
}

/**
 * Algoritmo de Conversão Física Convectiva (Aproximação SHARPpy)
 */
function calculateAtmosphericIndices(t, td, shear) {
    let cape = 0;
    let cin = 0;
    let lapseRate = 6.5; 

    if (t > 12 && td > 8) {
        let spread = t - td;
        lapseRate = 5.8 + (spread * 0.15); 
        cape = Math.max(0, (t - 13) * (lapseRate - 4.8) * 190);
        cin = Math.max(0, spread * 10);
    }

    let stp = (cape > 1000) ? (cape / 1500) * (shear / 40) * (lapseRate / 6.5) : (cape / 2200) * (shear / 45);
    let ship = (cape / 1400) * (lapseRate / 6.0) * (shear / 35);

    return {
        cape: Math.round(Math.min(cape, 6000)),
        cin: Math.round(Math.min(cin, 500)),
        stp: parseFloat(Math.max(0, stp).toFixed(1)),
        ship: parseFloat(Math.max(0, ship).toFixed(1))
    };
}

function getCIGLevel(indices) {
    if (indices.stp < 1.0) return "<CIG1";
    if (indices.stp >= 1.0 && indices.stp < 3.0) return "CIG1";
    if (indices.stp >= 3.0 && indices.stp < 5.0) return "CIG2";
    return "CIG3"; 
}

function findRiskFromMatrix(threatType, probability, cigLevel) {
    if (!spcMatrix || !spcMatrix[threatType]) {
        return { category: "TSTM", level: 0, color: "#C1FFC1" };
    }
    const match = spcMatrix[threatType].matrix.find(item => item.prob === probability && item.cig === cigLevel);
    return match || { category: "TSTM", level: 0, color: "#C1FFC1" };
}

/**
 * CORE LOGIC ENGINE - Orquestra e atualiza a interface gráfica
 */
function updateSimulationEngine() {
    const t = parseFloat(document.getElementById('input-temp').value) || 0;
    const td = parseFloat(document.getElementById('input-dew').value) || 0;
    const shear = parseFloat(document.getElementById('input-shear').value) || 0;
    
    const seletorModelo = document.getElementById('model-select');
    const seletorRun = document.getElementById('run-select');
    const modelStr = seletorModelo ? seletorModelo.value.toUpperCase() : "MANUAL";
    const runStr = seletorRun ? seletorRun.value.toUpperCase() : "00Z";

    const indices = calculateAtmosphericIndices(t, td, shear);
    const cig = getCIGLevel(indices);

    let simProb = 0.05;
    if (shear >= 30 && shear < 45) simProb = 0.15;
    if (shear >= 45 && shear < 55) simProb = 0.30;
    if (shear >= 55 && shear < 65) simProb = 0.45;
    if (shear >= 65) simProb = 0.60;

    const risk = findRiskFromMatrix('tornado', simProb, cig);

    const badge = document.getElementById('outlook-risk-badge');
    if (badge) {
        badge.style.backgroundColor = risk.color;
        badge.style.color = (risk.level >= 2 && risk.level !== 4) ? "#000000" : "#ffffff";
        badge.innerText = `RISCO CONFIGURADO: ${risk.level} - ${risk.category} (${cig})`;
    }

    const probDiv = document.getElementById('outlook-probs');
    if (probDiv) {
        probDiv.innerHTML = `
            <div style="display: flex; gap: 40px; margin-top: 5px; color: #8892b0;">
                <span>COBERTURA AVALIADA (EIXO Y): <span style="color: #00ff66;">${(simProb * 100)}%</span></span>
                <span>VETOR DE INTENSIDADE (EIXO X): <span style="color: #00ff66;">${cig}</span></span>
            </div>
        `;
    }

    const textDiv = document.getElementById('outlook-text');
    if (textDiv) {
        textDiv.innerHTML = `
            <p style="color: #38bdf8; font-weight: bold; margin-bottom: 8px;">[MONITORAMENTO DE MATRIZ CONVECTIVA DINÂMICA]</p>
            <p>FONTE DE DADOS ATIVA: <span style="color: #ffffff;">PROJEÇÃO MODELO ${modelStr} [RUN ${runStr}]</span></p>
            <p>SBCAPE CALCULADO: <span style="color: #00ff66;">${indices.cape} J/kg</span> | SBCIN: <span style="color: #ef4444;">-${indices.cin} J/kg</span></p>
            <p>PARAMETRO DE TORNADO SIGNIFICATIVO (STP): <span style="color: #ffffff;">${indices.stp}</span></p>
            <p>PARAMETRO DE GRANIZO SIGNIFICATIVO (SHIP): <span style="color: #ffffff;">${indices.ship}</span></p>
            <br>
            <p style="color: #64748b; line-height: 1.4;">ANÁLISE DO PERFIL: O acoplamento entre a instabilidade termodinâmica e o empuxo cinemático estabelece modo operacional estruturado em ${cig}.</p>
        `;
    }

    // Dispara a renderização gráfica do Skew-T Canvas
    renderSkewTGraph(t, td);

    const logList = document.getElementById('log-container');
    if (logList) {
        while (logList.children.length > 5) {
            logList.removeChild(logList.firstChild);
        }
    }
}

// ====================================================================
// RENDERIZADOR GRÁFICO DO SKEW-T / LOG-P (HTML5 CANVAS)
// ====================================================================

function convertToSkewTCoords(temp, pressure, width, height) {
    const maxHeight = height;
    const logP = Math.log10(pressure);
    const log1000 = Math.log10(1000);
    const log100 = Math.log10(100);
    const y = maxHeight - ((logP - log1000) / (log100 - log1000)) * maxHeight;

    const tempScale = width / 80; 
    const skewFactor = (maxHeight - y) * 0.7; 
    const x = ((temp + 40) * tempScale) + skewFactor;

    return { x: x, y: y };
}

function drawSkewTBackground(ctx, w, h) {
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, w, h);

    const pressaoLinhas =;
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 1;
    ctx.font = "9px monospace";
    ctx.fillStyle = "#64748b";

    pressaoLinhas.forEach(p => {
        const coords = convertToSkewTCoords(0, p, w, h);
        ctx.beginPath();
        ctx.moveTo(0, coords.y);
        ctx.lineTo(w, coords.y);
        ctx.stroke();
        ctx.fillText(`${p}mb`, 5, coords.y - 3);
    });

    ctx.strokeStyle = "#0f172a"; 
    for (let t = -40; t <= 40; t += 10) {
        ctx.beginPath();
        const pBase = convertToSkewTCoords(t, 1000, w, h);
        const pTopo = convertToSkewTCoords(t, 100, w, h);
        ctx.moveTo(pBase.x, pBase.y);
        ctx.lineTo(pTopo.x, pTopo.y);
        ctx.stroke();

        if (pBase.x > 0 && pBase.x < w) {
            ctx.fillText(`${t}°C`, pBase.x - 10, h - 5);
        }
    }
}

function drawSoundingLines(ctx, tSurf, tdSurf, w, h) {
    const niveis =;
    let pontosTemp = [];
    let pontosDew = [];

    niveis.forEach((p, index) => {
        let tAmbient = tSurf - (index * 8); 
        let tdAmbient = tdSurf - (index * 11);
        if (tdAmbient > tAmbient) tdAmbient = tAmbient;

        pontosTemp.push(convertToSkewTCoords(tAmbient, p, w, h));
        pontosDew.push(convertToSkewTCoords(tdAmbient, p, w, h));
    });

    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(pontosTemp[0].x, pontosTemp[0].y);
    for (let i = 1; i < pontosTemp.length; i++) {
