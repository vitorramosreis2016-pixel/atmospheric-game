// ====================================================================
// CORE METEOROLOGICAL ENGINE - MESOSCALE ANALYST WORKSTATION (2026)
// ====================================================================

let spcMatrix = null;

/**
 * Inicializa o simulador e carrega a matriz de risco
 */
async function initSimulator() {
    try {
        const response = await fetch('outlook.json');
        spcMatrix = await response.json();
        console.log("[SYSTEM] Matriz Conditional Intensity Outlooks SPC 2026 injetada.");
        
        // Executa a primeira leitura para popular a tela com os valores iniciais
        updateSimulationEngine();
    } catch (error) {
        console.error("[ERROR] Falha crítica ao carregar o arquivo outlook.json:", error);
    }
}

/**
 * Motor de Física Atmosférica (Aproximação Paramétrica Baseada em SHARPpy)
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

/**
 * Determina o Eixo Horizontal da Matriz (Categorização CIG de 2026)
 */
function getCIGLevel(indices) {
    if (indices.stp < 1.0) return "<CIG1";
    if (indices.stp >= 1.0 && indices.stp < 3.0) return "CIG1";
    if (indices.stp >= 3.0 && indices.stp < 5.0) return "CIG2";
    return "CIG3"; 
}

/**
 * Varre a estrutura matricial do JSON para capturar o nível e a cor do alerta
 */
function findRiskFromMatrix(threatType, probability, cigLevel) {
    if (!spcMatrix || !spcMatrix[threatType]) {
        return { category: "TSTM", level: 0, color: "#C1FFC1" };
    }
    
    const match = spcMatrix[threatType].matrix.find(
        item => item.prob === probability && item.cig === cigLevel
    );
    
    return match || { category: "TSTM", level: 0, color: "#C1FFC1" };
}

/**
 * CORE LOGIC FUNCTION - Conectada aos IDs em Português da imagem
 */
function updateSimulationEngine() {
    // 1. Puxa os dados dos inputs capturando os IDs corretos do seu HTML
    // Se no seu index.html os IDs forem ligeiramente diferentes, ajuste aqui dentro do getElementById
    const t = parseFloat(document.getElementById('input-temp')?.value || document.getElementById('input-temperature')?.value) || 24.3;
    const td = parseFloat(document.getElementById('input-dew')?.value || document.getElementById('input-dewpoint')?.value) || 17.8;
    const shear = parseFloat(document.getElementById('input-shear')?.value) || 45.0;
    const modelSelect = document.getElementById('model-select');
    const model = modelSelect ? modelSelect.value.toUpperCase() : "HRRR";

    // 2. Processa os algoritmos meteorológicos
    const indices = calculateAtmosphericIndices(t, td, shear);
    const cig = getCIGLevel(indices);

    // 3. Determina a Cobertura/Probabilidade baseada no Cisalhamento
    let simProb = 0.05;
    if (shear >= 30 && shear < 45) simProb = 0.15;
    if (shear >= 45 && shear < 55) simProb = 0.30;
    if (shear >= 55 && shear < 65) simProb = 0.45;
    if (shear >= 65) simProb = 0.60;

    // 4. Varre o JSON buscando o cruzamento do risco de Tornado
    const risk = findRiskFromMatrix('tornado', simProb, cig);

    // 5. ATUALIZAÇÃO DOS COMPONENTES VISUAIS DA IMAGEM
    
    // Atualiza a barra superior "CALCULANDO O RISCO..."
    const badge = document.getElementById('outlook-risk-badge');
    if (badge) {
        badge.style.backgroundColor = risk.color;
        badge.style.color = (risk.level >= 2 && risk.level !== 4) ? "#000000" : "#ffffff";
        badge.innerText = `RISCO CONFIGURADO: ${risk.level} - ${risk.category} (${cig})`;
        
        if (risk.category === 'not_used') {
            badge.style.backgroundColor = '#7F7F7F';
            badge.style.color = '#ffffff';
            badge.innerText = 'VETOR DE PROBABILIDADE NÃO UTILIZADO NO CIG';
        }
    }

    // Atualiza a seção "MATRIZ DE PROBABILIDADE:"
    const probDiv = document.getElementById('outlook-probs');
    if (probDiv) {
        probDiv.innerHTML = `
            <div style="display: flex; gap: 40px; margin-top: 5px; color: #8892b0;">
                <span>COBERTURA AVALIADA (EIXO Y): <span style="color: #00ff66;">${(simProb * 100)}%</span></span>
                <span>VETOR DE INTENSIDADE (EIXO X): <span style="color: #00ff66;">${cig}</span></span>
            </div>
        `;
    }

    // Injeta o Diagnóstico Técnico dentro do bloco "[DIAGNÓSTICO DO AMBIENTE...]"
    const textDiv = document.getElementById('outlook-text');
    if (textDiv) {
        textDiv.innerHTML = `
            <p style="color: #38bdf8; font-weight: bold; margin-bottom: 8px;">[MONITORAMENTO DE MATRIZ CONVECTIVA DINÂMICA]</p>
            <p>FONTE DE DADOS ATIVA: <span style="color: #ffffff;">PROJEÇÃO MODELO ${model}</span></p>
            <p>SBCAPE CALCULADO: <span style="color: #00ff66;">${indices.cape} J/kg</span> | SBCIN: <span style="color: #ef4444;">-${indices.cin} J/kg</span></p>
            <p>PARAMETRO DE TORNADO SIGNIFICATIVO (STP): <span style="color: #ffffff;">${indices.stp}</span></p>
            <p>PARAMETRO DE GRANIZO SIGNIFICATIVO (SHIP): <span style="color: #ffffff;">${indices.ship}</span></p>
            <br>
            <p style="color: #64748b; line-height: 1.4;">ANÁLISE DO PERFIL: O acoplamento entre a instabilidade termodinâmica superficial e o cisalhamento profundo de ${shear} kts estabelece organização de tempestades estruturada em modo ${cig}.</p>
        `;
    }

    // Adiciona o fluxo de dados na janela de logs inferior
    const logList = document.getElementById('log-container');
    if (logList) {
        const time = new Date().toISOString().substr(11, 8);
        const li = document.createElement('li');
        li.innerHTML = `<span class="log-timestamp">[${time}]</span> <span style="color:#00ff66;">INJECTOR_RUN:</span> MODELO=${model} | CAPE=${indices.cape} | STP=${indices.stp} -> STATUS: ${risk.category}`;
        logList.appendChild(li);
        
        while (logList.children.length > 5) {
            logList.removeChild(logList.firstChild);
        }
    }
}

// Vincula a inicialização do motor ao ciclo de vida da página
window.addEventListener('DOMContentLoaded', initSimulator);
