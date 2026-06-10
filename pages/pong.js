const canvas = document.getElementById("pongCanvas");
const ctx = canvas.getContext("2d");

// --- SISTEMA DE SOM (Web Audio API) ---
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();

function emitirBip(frequencia, duracao) {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    const oscilador = audioCtx.createOscillator();
    const controleVolume = audioCtx.createGain();

    oscilador.type = 'square'; 
    oscilador.frequency.value = frequencia;

    controleVolume.gain.setValueAtTime(0.1, audioCtx.currentTime);
    controleVolume.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duracao);

    oscilador.connect(controleVolume);
    controleVolume.connect(audioCtx.destination);

    oscilador.start();
    oscilador.stop(audioCtx.currentTime + duracao);
}

// --- ESTADO DE CONTROLE DO JOGO ---
let jogoPausado = true; 

// --- CONFIGURAÇÕES DE VELOCIDADE E HARDWARE ---
const raqueteLargura = 15;
const raqueteAltura = 80;

const velocidadeBaseBola = 5; // 👈 Velocidade inicial estática (para onde o jogo SEMPRE retorna no ponto)
const incrementoVelocidade = 0.6; // 👈 O quanto a bola acelera a cada rebatida (mude aqui para calibrar)

const jogador = { x: 10, y: canvas.height/2 - raqueteAltura/2, score: 0 };
const computador = { x: canvas.width - 10 - raqueteLargura, y: canvas.height/2 - raqueteAltura/2, score: 0 };

// A bola começa com a velocidade base de partida
const bola = { x: canvas.width/2, y: canvas.height/2, raio: 7, velocidadeX: velocidadeBaseBola, velocidadeY: velocidadeBaseBola };

// --- EVENTOS DE CONTROLE E PAUSA (PC e Celular) ---

// 1. CONTROLES PARA PC (MOUSE)
canvas.addEventListener("mousemove", (procuraMouse) => {
    const retanguloCanvas = canvas.getBoundingClientRect();
    const escalaY = canvas.height / retanguloCanvas.height;
    jogador.y = (procuraMouse.clientY - retanguloCanvas.top) * escalaY - raqueteAltura / 2;
});

canvas.addEventListener("mouseenter", () => { jogoPausado = false; });
canvas.addEventListener("mouseleave", () => { jogoPausado = true; });

// 2. CONTROLES PARA CELULAR (TOUCH)
function controlarRaqueteTouch(e) {
    e.preventDefault(); 
    const toque = e.touches[0];
    const retanguloCanvas = canvas.getBoundingClientRect();
    const escalaY = canvas.height / retanguloCanvas.height;
    jogador.y = (toque.clientY - retanguloCanvas.top) * escalaY - raqueteAltura / 2;
}

canvas.addEventListener("touchmove", (e) => { controlarRaqueteTouch(e); }, { passive: false });
canvas.addEventListener("touchstart", (e) => { jogoPausado = false; controlarRaqueteTouch(e); }, { passive: false });
canvas.addEventListener("touchend", () => { jogoPausado = true; });


// --- RESET DA BOLA (VOLTA À VELOCIDADE ORIGINAL) ---
function resetBola() {
    bola.x = canvas.width / 2;
    bola.y = canvas.height / 2;
    
    // 🚨 AQUI ESTÁ O SEGREDO: Força a bola a voltar EXATAMENTE para o valor de velocidadeBaseBola (5)
    bola.velocidadeX = bola.velocidadeX > 0 ? -velocidadeBaseBola : velocidadeBaseBola;
    bola.velocidadeY = velocidadeBaseBola * (Math.random() > 0.5 ? 1 : -1);
}

function atualizar() {
    bola.x += bola.velocidadeX;
    bola.y += bola.velocidadeY;

    // Inteligência Artificial do computador
    const meioComputador = computador.y + raqueteAltura / 2;
    if (meioComputador < bola.y - 15) {
        computador.y += 4.5;
    } else if (meioComputador > bola.y + 15) {
        computador.y -= 4.5;
    }

    // Colisão com teto e chão (Mantém a velocidade atual, apenas inverte)
    if (bola.y - bola.raio < 0 || bola.y + bola.raio > canvas.height) {
        bola.velocidadeY = -bola.velocidadeY;
        emitirBip(220, 0.1);
    }

    let raqueteAlvo = (bola.x < canvas.width / 2) ? jogador : computador;

    // Colisão com as raquetes (ONDE A MÁGICA ACONTECE)
    if (bola.x - bola.raio < raqueteAlvo.x + raqueteLargura && 
        bola.x + bola.raio > raqueteAlvo.x && 
        bola.y + bola.raio > raqueteAlvo.y && 
        bola.y - bola.raio < raqueteAlvo.y + raqueteAltura) {
        
        // 1. Primeiro invertemos a direção horizontal da bola
        bola.velocidadeX = -bola.velocidadeX; 
        
        // 2. 🚨 INCREMENTO PROGRESSIVO: Adiciona velocidade respeitando a direção atual da bola
        // Se estiver indo para a direita (positivo), soma. Se for para a esquerda (negativo), subtrai.
        bola.velocidadeX += (bola.velocidadeX > 0) ? incrementoVelocidade : -incrementoVelocidade;
        bola.velocidadeY += (bola.velocidadeY > 0) ? incrementoVelocidade : -incrementoVelocidade;
        
        emitirBip(440, 0.15);
    }

    // Pontuação (Aciona o resetBola que limpa os incrementos acumulados)
    if (bola.x - bola.raio < 0) {
        computador.score++;
        emitirBip(150, 0.3);
        resetBola();
    } else if (bola.x + bola.raio > canvas.width) {
        jogador.score++;
        emitirBip(150, 0.3);
        resetBola();
    }
}

function desenhar() {
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "#ffffff";
    ctx.setLineDash([15, 15]);
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(jogador.x, jogador.y, raqueteLargura, raqueteAltura);
    ctx.fillRect(computador.x, computador.y, raqueteLargura, raqueteAltura);
    ctx.fillRect(bola.x - bola.raio, bola.y - bola.raio, bola.raio * 2, bola.raio * 2);

    ctx.font = "60px Arial";
    ctx.setLineDash([]); 
    ctx.fillText(jogador.score, canvas.width / 4, 80);
    ctx.fillText(computador.score, (canvas.width / 4) * 3, 80);
}

function loop() {
    if (!jogoPausado) {
        atualizar();
    }
    desenhar();

    if (jogoPausado) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#ffffff";
        ctx.font = "24px Arial";
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";
        ctx.fillText("JOGO PAUSADO", canvas.width / 2, canvas.height / 2 - 10);
        ctx.font = "14px Arial";
        ctx.fillText("Passe o mouse ou use o dedo aqui para jogar", canvas.width / 2, canvas.height / 2 + 25);
        ctx.textAlign = "left";
    }

    requestAnimationFrame(loop);
}

loop();