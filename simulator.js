// ==========================================================
// MESOSCALE ANALYST WORKSTATION - CORE ENGINE (2026 BASELINE)
// ==========================================================

let spcMatrix = null;

/**
 * Inicializa o simulador carregando a matriz de risco do outlook.json
 */
async function initSimulator() {
    try {
        const response = await fetch('outlook.json');
        spcMatrix = await response.json();
        console.log("[SYSTEM] Matriz de Intensidade SPC 2026 carregada com sucesso.");
    } catch (error) {
        console.error("[ERROR] Falha ao carregar o arquivo outlook.json:", error);
    }
}

/**
 * Calcula a classificação do CIG com base nos parâmetros físicos do ambiente
 * @param {number} stp - Significant Tornado Parameter
 * @param {number} ship - Significant Hail Parameter
 * @param {string} threatType - 'tornado', 'hail' ou 'wind'
 */
function calculateCIGLevel(stp, ship, threatType) {
    if (threatType === 'tornado') {
        if (stp < 1.0) return "<CIG1";
        if (stp >= 1.0 && stp < 3.0) return "CIG1";
        if (stp >= 3.0 && stp < 5.0) return "CIG2";
        return "CIG3"; // Extremo / Alto Impacto
    } 
    
    // Para Granizo e Vento (Baseado no SHIP ou energia convectiva)
    if (threatType === 'hail' || threatType === 'wind') {
        if (ship < 1.0) return "<CIG1";
        if (ship >= 1.0 && ship < 2.5) return "CIG1";
        return "CIG2"; // As matrizes de vento/granizo de 2026 usam até CIG2
    }

    return "<CIG1";
}

/**
 * Executa a varredura bidimensional na matriz do JSON (Eixo Cobertura vs Eixo Intensidade)
 * @param {string} threatType - 'tornado' ou 'hail_wind_3dir'
 * @param {number} probability - Cobertura escolhida (ex: 0.05, 0.15, 0.30, 0.45, 0.60)
 * @param {string} cigLevel - Nível calculado ("<CIG1", "CIG1", "CIG2", "CIG3")
 */
function getConvectiveRisk(threatType, probability, cigLevel) {
    if (!spcMatrix || !spcMatrix[threatType]) {
        return { category: "TSTM", level: 0, color: "#C1FFC1" };
    }

    const matrix = spcMatrix[threatType].matrix;

    // Busca o cruzamento exato da linha (probabilidade) com a coluna (CIG)
    const match = matrix.find(item => item.prob === probability && item.cig === cigLevel);

    if (match) {
        return {
            category: match.category,
            level: match.level,
            color: match.color
        };
    }

    return { category: "TSTM", level: 0, color: "#C1FFC1" };
}

/**
 * Função principal disparada pelos Sliders ou pela seleção de Modelos (HRRR, MONAN)
 */
function updateSimulation() {
    // 1. Coleta os dados de entrada da sua interface HTML (Exemplos de IDs)
    const selectedProb = parseFloat(document.getElementById('select-probability').value); // ex: 0.30
    const currentSTP = parseFloat(document.getElementById('input-stp').value);
    const currentSHIP = parseFloat(document.getElementById('input-ship').value);

    // 2. Determina a coluna CIG de forma dinâmica
    const tornadoCIG = calculateCIGLevel(currentSTP, currentSHIP, 'tornado');
    const severeCIG = calculateCIGLevel(currentSTP, currentSHIP, 'hail');

    // 3. Executa a varredura nas tabelas do outlook.json
    const tornadoRisk = getConvectiveRisk('tornado', selectedProb, tornadoCIG);
    const severeRisk = getConvectiveRisk('hail_wind_3dir', selectedProb, severeCIG);

    // 4. Renderiza o resultado na tela mudando as cores e as siglas (MRGL, SLGT, ENH, MDT, HIGH)
    updateRiskDisplay('tornado-panel', tornadoRisk, tornadoCIG);
    updateRiskDisplay('severe-panel', severeRisk, severeCIG);
}

function updateRiskDisplay(panelId, riskData, cigLevel) {
    const panel = document.getElementById(panelId);
    if (!panel) return;

    // Atualiza o texto interno e a cor de fundo com base no JSON
    panel.style.backgroundColor = riskData.color;
    panel.innerText = `${riskData.level} ${riskData.category} (${cigLevel})`;
    
    // Tratamento para áreas desativadas da matriz ("not used")
    if (riskData.category === 'not_used') {
        panel.style.backgroundColor = '#7F7F7F';
        panel.innerText = 'NOT USED';
    }
}

// Executa a inicialização do simulador ao carregar a página
window.addEventListener('DOMContentLoaded', initSimulator);
