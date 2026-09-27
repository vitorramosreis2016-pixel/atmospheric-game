// ====================================================================
// RENDERIZADOR GRÁFICO DO SKEW-T / LOG-P (HTML5 CANVAS)
// ====================================================================

/**
 * Converte um valor de Temperatura (°C) e Pressão (mb) em coordenadas X/Y de pixel
 */
function convertToSkewTCoords(temp, pressure, width, height) {
    const minHeight = 0;
    const maxHeight = height;
    
    // Eixo Y: Escala Logarítmica da Pressão (1000mb na base, 100mb no topo)
    const logP = Math.log10(pressure);
    const log1000 = Math.log10(1000);
    const log100 = Math.log10(100);
    const y = maxHeight - ((logP - log1000) / (log100 - log1000)) * maxHeight;

    // Eixo X: Inclinado em 45 graus (A temperatura se desloca para a direita conforme sobe)
    // Centraliza o gráfico em torno de -40°C a +40°C
    const tempScale = width / 80; 
    const skewFactor = (maxHeight - y) * 0.7; // Inclinação de 45° baseada na altura atual
    const x = ((temp + 40) * tempScale) + skewFactor;

    return { x: x, y: y };
}

/**
 * Desenha o fundo do gráfico (Linhas de Pressão e Temperatura inclinadas)
 */
function drawSkewTBackground(ctx, w, h) {
    // Limpa o canvas com fundo preto puro
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, w, h);

    // 1. Desenha as linhas horizontais de Pressão (Isóbaras) em cinza escuro
    const pressaoLinhas =;
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 1;
    ctx.font = "9px monospace";
    ctx.fillStyle = "#64748b";

    pressaoLinhas.forEach(p => {
        // Pega um ponto qualquer de temperatura apenas para descobrir a altura Y da pressão
        const coords = convertToSkewTCoords(0, p, w, h);
        ctx.beginPath();
        ctx.moveTo(0, coords.y);
        ctx.lineTo(w, coords.y);
        ctx.stroke();
        
        // Texto identificador da pressão na lateral
        ctx.fillText(`${p}mb`, 5, coords.y - 3);
    });

    // 2. Desenha as linhas inclinadas de Temperatura (Isotermas) em azul escuro
    ctx.strokeStyle = "#0f172a"; 
    for (let t = -40; t <= 40; t += 10) {
        ctx.beginPath();
        // Desenha a linha indo da base (1000mb) até o topo (100mb) aplicando a inclinação
        const pBase = convertToSkewTCoords(t, 1000, w, h);
        const pTopo = convertToSkewTCoords(t, 100, w, h);
        
        ctx.moveTo(pBase.x, pBase.y);
        ctx.lineTo(pTopo.x, pTopo.y);
        ctx.stroke();

        // Rótulo da temperatura na base do gráfico
        if (pBase.x > 0 && pBase.x < w) {
            ctx.fillText(`${t}°C`, pBase.x - 10, h - 5);
        }
    }
}

/**
 * Plota as linhas de dados reais do modelo (Temperatura e Ponto de Orvalho)
 */
function drawSoundingLines(ctx, tSurf, tdSurf, w, h) {
    // Como ainda não estamos processando o perfil vertical completo do arquivo txt,
    // vamos simular um decréscimo térmico padrão para gerar as curvas na tela dinamicamente.
    const niveis =;
    
    let pontosTemp = [];
    let pontosDew = [];

    niveis.forEach((p, index) => {
        // Reduz a temperatura simulando o lapse rate conforme sobe na atmosfera
        let tAmbient = tSurf - (index * 8); 
        let tdAmbient = tdSurf - (index * 11);
        if (tdAmbient > tAmbient) tdAmbient = tAmbient; // Limite físico

        pontosTemp.push(convertToSkewTCoords(tAmbient, p, w, h));
        pontosDew.push(convertToSkewTCoords(tdAmbient, p, w, h));
    });

    // Desenha a linha de Temperatura (Vermelha)
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(pontosTemp[0].x, pontosTemp[0].y);
    for (let i = 1; i < pontosTemp.length; i++) {
        ctx.lineTo(pontosTemp[i].x, pontosTemp[i].y);
    }
    ctx.stroke();

    // Desenha a linha do Ponto de Orvalho (Verde)
    ctx.strokeStyle = "#10b981";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(pontosDew[0].x, pontosDew[0].y);
    for (let i = 1; i < pontosDew.length; i++) {
        ctx.lineTo(pontosDew[i].x, pontosDew[i].y);
    }
    ctx.stroke();
}

/**
 * Função mestre de renderização do Canvas chamado pelo motor do simulador
 */
function renderSkewTGraph(tSurf, tdSurf) {
    const canvas = document.getElementById('skewtCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    
    // Ajusta o tamanho interno de pixels do canvas para preencher a div perfeitamente
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    const w = canvas.width;
    const h = canvas.height;

    // Roda a pintura em camadas
    drawSkewTBackground(ctx, w, h);
    drawSoundingLines(ctx, tSurf, tdSurf, w, h);
}
