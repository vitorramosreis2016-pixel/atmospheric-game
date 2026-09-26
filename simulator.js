// ====================================================================
// CORE METEOROLOGICAL ENGINE - MESOSCALE ANALYST WORKSTATION (2026)
// ====================================================================

let spcMatrix = null;

/**
 * Inicializa o simulador e carrega a matriz de risco assincronamente (Serverless)
 */
async function initSimulator() {
    try {
        // Busca o arquivo JSON localizado na mesma pasta raiz
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
 * Deriva os índices térmicos e cinemáticos a partir dos dados da superfície e do cisalhamento
 */
function calculateAtmosphericIndices(t, td, shear) {
    let cape = 0;
    let cin = 0;
    let lapseRate = 6.5; // Gradiente térmico padrão da troposfera (°C/km)

    // Avalia o gatilho de convecção com base na energia úmida superficial
    if (t > 12 && td > 8) {
        let spread = t - td;
        // Perfis secos em superfície aumentam o lapse rate da camada limite
        lapseRate = 5.8 + (spread * 0.15); 
        
        // Integração simplificada da área positiva da parcela (CAPE)
        cape = Math.max(0, (t - 13) * (lapseRate - 4.8) * 190);
        // Energia de Inibição Convectiva (CIN) baseada na subsidência/estabilidade inicial
        cin = Math.max(0, spread * 10);
    }

    // Fórmulas matemáticas de regressão para os proxies severos da SPC
    let stp = (cape > 1000) ? (cape / 1500) * (shear / 40) * (lapseRate / 6.5) : (cape / 2200) * (shear / 45);
    let ship = (cape / 1400) * (lapseRate / 6.0) * (shear / 35);

    // Garante limites de segurança física realistas dentro da sandbox
    return {
        cape: Math.round(Math.min(cape, 6000)),
        cin: Math.round(Math.min(cin, 500)),
        stp: parseFloat(Math.max(0, stp).toFixed(1)),
        ship: parseFloat(Math.max(0, ship).toFixed(1))
    };
}

/**
 * Determina o Eixo Horizontal da Matriz (Categorização CIG de 2026)
 * Mapeia os limites exatos com base na intensidade potencial do perigo
 */
function getCIGLevel(indices) {
    // Escalonamento de severidade condicional pelo Significant Tornado Parameter (STP)
    if (indices.stp < 1.0) return "<CIG1";
    if (indices.stp >= 1.0 && indices.stp < 3.0) return "CIG1";
    if (indices.stp >= 3.0 && indices.stp < 5.0) return "CIG2";
    return "CIG3"; // Cenários de impactos extremos / catastróficos
}

/**
 * Varre a estrutura matricial do JSON para capturar o nível e a cor do alerta
 */
function findRiskFromMatrix(threatType, probability, cigLevel) {
    if (!spcMatrix || !spcMatrix[threatType]) {
        return { category: "TSTM", level: 0, color: "#C1FFC1" };
    }
    
    // Procura o cruzamento exato [Eixo Vertical X Eixo Horizontal]
    const match = spcMatrix[threatType].matrix.find(
        item => item.prob === probability && item.cig === cigLevel
    );
    
    return match || { category: "TSTM", level: 0, color: "#C1FFC1" };
}

/**
 * CORE LOGIC FUNCTION - Orquestra a coleta de dados, processamento e renderização
 */
function updateSimulationEngine() {
    // 1. Puxa os dados dos seletores exatos criados no seu index.html
    const t = parseFloat(document.getElementById('input-temp').value) || 0;
    const td = parseFloat(document.getElementById('input-dew').value) || 0;
    const shear = parseFloat(document.getElementById('input-shear').value) || 0;
    const model = document.getElementById('model-select').value.toUpperCase();

    // 2. Processa o algoritmo térmico para gerar o diagnóstico estrutural
    const indices = calculateAtmosphericIndices(t, td, shear);
    const cig = getCIGLevel(indices);

    // 3. Determina a Cobertura/Probabilidade de forma dinâmica baseada no Cisalhamento dinâmico
    // (Mais vento em altos níveis = maior organização de tempestades/cobertura)
    let simProb = 0.05;
    if (shear >= 30 && shear < 45) simProb = 0.15;
    if (shear >= 45 && shear < 55) simProb = 0.30;
    if (shear >= 55 && shear < 65) simProb = 0.45;
    if (shear >= 65) simProb = 0.60;

    // 4. Executa a varredura cruzada na matriz do seu outlook.json
    const risk = findRiskFromMatrix('tornado', simProb, cig);

    // 5. RENDERIZAÇÃO DA INTERFACE GRAPHICA (Injeta as informações na tela do usuário)
    
    // Atualiza o Badge de Risco Central (Muda a cor de fundo e a sigla do alerta da SPC)
    const badge = document.getElementById('outlook-risk-badge');
    if (badge) {
        badge.style.backgroundColor = risk.color;
        // Alterna o texto para preto caso a cor de fundo seja clara (melhoria de legibilidade)
        badge.style.color = (risk.level >= 2 && risk.level !== 4) ? "#000000" : "#ffffff";
        badge.innerText = `${risk.level} - ${risk.category} RISK (${cig})`;
        
        if (risk.category === 'not_used') {
            badge.style.backgroundColor = '#7F7F7F';
            badge.style.color = '#ffffff';
            badge.innerText = 'PROBABILITY VECTOR NOT USED IN CIG';
        }
    }

    // Alimenta a tabela de informações estatísticas
    const probDiv = document.getElementById('outlook-probs');
    if (probDiv) {
        probDiv.innerHTML = `
            <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                <span>EVALUATED COVERAGE (Y-AXIS): <span style="color: #ffffff;">${(simProb * 100)}%</span></span>
                <span>INTENSITY VECTOR (X-AXIS): <span style="color: #ffffff;">${cig}</span></span>
            </div>
        `;
    }

    // Monta o relatório em formato de texto técnico descritivo no bloco central
    const textDiv = document.getElementById('outlook-text');
    if (textDiv) {
        textDiv.innerHTML = `
            <p style="color: #00ff66;">[DIAGNOSTIC MATRIX DATASTREAM - ONLINE]</p>
            <p style="margin-top: 5px;">ACTIVE DATA SOURCE: <span style="color: #ffffff;">${model} FORECAST RUN</span></p>
            <p>COMPUTED SBCAPE: <span style="color: #38bdf8;">${indices.cape} J/kg</span> | SBCIN: <span style="color: #ef4444;">${indices.cin} J/kg</span></p>
            <p>SIGNIFICANT TORNADO PARAMETER (STP): <span style="color: #38bdf8;">${indices.stp}</span></p>
            <p>SIGNIFICANT HAIL PARAMETER (SHIP): <span style="color: #38bdf8;">${indices.ship}</span></p>
            <br>
            <p style="color: #64748b; text-transform: uppercase;">[ENVIRONMENT METRICS]: O gradiente vertical térmico e os vetores cinemáticos calculados projetam organização convectiva com classificação de intensidade em nível <span style="color: #ffffff;">${cig}</span>.</p>
        `;
    }

    // Injeta novas entradas de telemetria em tempo real no console de logs do rodapé
    const logList = document.getElementById('log-container');
    if (logList) {
        const time = new Date().toISOString().substr(11, 8);
        const li = document.createElement('li');
        li.innerHTML = `<span class="log-timestamp">[${time}]</span> INJECTOR: CAPE=${indices.cape} J/kg | STP=${indices.stp} -> SECTOR STATUS: ${risk.category}`;
        logList.appendChild(li);
        
        // Controla o estouro de tela (overflow) mantendo apenas os últimos 6 logs visíveis
        while (logList.children.length > 6) {
            logList.removeChild(logList.firstChild);
        }
    }
}

// Conecta o gatilho de inicialização do motor ao carregamento completo do navegador
window.addEventListener('DOMContentLoaded', initSimulator);
