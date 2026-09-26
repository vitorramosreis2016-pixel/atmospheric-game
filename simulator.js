// ====================================================================
// CORE METEOROLOGICAL ENGINE - DATA SUITE MODEL PARSER (2026)
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
 * Faz o fetch dinâmico do arquivo de texto do modelo selecionado
 */
async function carregarDadosDoModelo() {
    const seletorModelo = document.getElementById('model-select');
    if (!seletorModelo) return;

    const modelo = seletorModelo.value.toLowerCase(); // hrrr, monan, gfs
    const caminhoArquivo = `modelos/${modelo}.txt`;

    const logList = document.getElementById('log-container');
    const time = new Date().toISOString().substr(11, 8);

    try {
        const response = await fetch(caminhoArquivo);
        if (!response.ok) throw new Error(`Arquivo ${caminhoArquivo} não encontrado.`);
        
        const textoBruto = await response.text();
        
        // Faz a leitura e extração dos parâmetros de dentro do arquivo txt
        const parametros = extrairParametrosDoTexto(textoBruto);

        // Atualiza os inputs numéricos na tela com os dados reais do arquivo
        if (parametros.temp !== null) document.getElementById('input-temp').value = parametros.temp;
        if (parametros.dew !== null) document.getElementById('input-dew').value = parametros.dew;
        if (parametros.shear !== null) document.getElementById('input-shear').value = parametros.shear;

        if (logList) {
            logList.innerHTML += `<li><span class="log-timestamp">[${time}]</span> <span style="color:#38bdf8;">MODEL_LOAD:</span> ${modelo.toUpperCase()}.txt processado com sucesso.</li>`;
        }

        // Executa o motor físico com os novos dados importados
        updateSimulationEngine();

    } catch (error) {
        console.error("[ERROR]", error.message);
        if (logList) {
            logList.innerHTML += `<li><span class="log-timestamp">[${time}]</span> <span class="log-alert">[ERROR]</span> Falha ao ler modelos/${modelo}.txt. Usando inputs manuais.</li>`;
        }
        // Fallback: Se o arquivo não existir, roda com o que já estiver digitado
        updateSimulationEngine();
    }
}

/**
 * Função Parser: Vasculha as linhas do arquivo de texto atrás de tags chave
 * Exemplo esperado dentro do txt: "TEMP=26.4" ou "SHEAR=52"
 */
function extrairParametrosDoTexto(texto) {
    const linhas = texto.split('\n');
    let dados = { temp: null, dew: null, shear: null };

    linhas.forEach(linha => {
        const linhaLimpa = linha.replace(/\s+/g, '').toUpperCase();
        
        if (linhaLimpa.includes('TEMP=')) {
            dados.temp = parseFloat(linhaLimpa.split('TEMP=')[1]);
        }
        if (linhaLimpa.includes('DEW=') || linhaLimpa.includes('DEWPOINT=')) {
            dados.dew = parseFloat(linhaLimpa.split('DEW=')[1] || linhaLimpa.split('DEWPOINT=')[1]);
        }
        if (linhaLimpa.includes('SHEAR=')) {
            dados.shear = parseFloat(linhaLimpa.split('SHEAR=')[1]);
        }
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
 * RENDERIZAÇÃO DA INTERFACE DINÂMICA
 */
function updateSimulationEngine() {
    const t = parseFloat(document.getElementById('input-temp').value) || 0;
    const td = parseFloat(document.getElementById('input-dew').value) || 0;
    const shear = parseFloat(document.getElementById('input-shear').value) || 0;
    
    const seletorModelo = document.getElementById('model-select');
    const model = seletorModelo ? seletorModelo.value.toUpperCase() : "MANUAL";

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
            <p>FONTE DE DADOS ATIVA: <span style="color: #ffffff;">PROJEÇÃO MODELO ${model}</span></p>
            <p>SBCAPE CALCULADO: <span style="color: #00ff66;">${indices.cape} J/kg</span> | SBCIN: <span style="color: #ef4444;">-${indices.cin} J/kg</span></p>
            <p>PARAMETRO DE TORNADO SIGNIFICATIVO (STP): <span style="color: #ffffff;">${indices.stp}</span></p>
            <p>PARAMETRO DE GRANIZO SIGNIFICATIVO (SHIP): <span style="color: #ffffff;">${indices.ship}</span></p>
            <br>
            <p style="color: #64748b; line-height: 1.4;">ANÁLISE DO PERFIL: O acoplamento entre a instabilidade termodinâmica e o empuxo cinemático estabelece modo operacional estruturado em ${cig}.</p>
        `;
    }

    const logList = document.getElementById('log-container');
    if (logList) {
        while (logList.children.length > 5) {
            logList.removeChild(logList.firstChild);
        }
    }
}

// Vincula o gatilho inicial
window.addEventListener('DOMContentLoaded', initSimulator);
