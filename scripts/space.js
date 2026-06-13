const canvas = document.getElementById("spaceCanvas");
const ctx = canvas.getContext("2d");

// --- SISTEMA DE SOM (Sintetizador Retrô) ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// As 4 famosas notas da "marcha" dos aliens (A, G, F, E graves)
const notasMarcha = [110, 104, 98, 92]; 
let notaAtual = 0;

function tocarSomMarcha(frequencia) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square'; 
    osc.frequency.value = frequencia;
    gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + 0.1);
}

function tocarSomTiro() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sawtooth'; // Som rasgado
    // Efeito de queda de frequência clássico (Pew!)
    osc.frequency.setValueAtTime(800, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + 0.2);
}

function tocarSomExplosao() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square';
    // Modulação brusca simula ruído de explosão 8-bits
    osc.frequency.setValueAtTime(100, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(10, audioCtx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + 0.3);
}

// --- VARIÁVEIS DE ESTADO DO JOGO ---
let jogoPausado = true;
let gameOver = false;
let score = 0;

// --- O JOGADOR (Nave) ---
const jogador = {
    x: canvas.width / 2 - 15,
    y: canvas.height - 40,
    largura: 30,
    altura: 15,
    podeAtirar: true
};

// --- OS ALIENS ---
let aliens = [];
const linhasAliens = 4;
const colunasAliens = 8;
const larguraAlien = 30;
const alturaAlien = 20;
let direcaoAliens = 1; // 1 = Direita, -1 = Esquerda
let moveTimer = 0; // Controla o tempo entre os passos dos aliens
let moveIntervaloBase = 800; // Milissegundos (Começa lento)

function criarAliens() {
    aliens = [];
    for (let l = 0; l < linhasAliens; l++) {
        for (let c = 0; c < colunasAliens; c++) {
            aliens.push({
                x: c * (larguraAlien + 15) + 50,
                y: l * (alturaAlien + 15) + 50,
                vivo: true
            });
        }
    }
}
criarAliens();

// --- PROJÉTEIS ---
let tiros = []; // Tiros do jogador
const velocidadeTiro = 7;

// --- CONTROLES (PC e Celular) ---
canvas.addEventListener("mouseenter", () => { if(!gameOver) jogoPausado = false; });
canvas.addEventListener("mouseleave", () => { jogoPausado = true; });

// Movimento do Mouse
canvas.addEventListener("mousemove", (e) => {
    if (jogoPausado || gameOver) return;
    const rect = canvas.getBoundingClientRect();
    
    // Calcula a proporção entre o tamanho interno do canvas e o tamanho visível na tela
    const scaleX = canvas.width / rect.width; 
    
    // Multiplica a posição do mouse pelo fator de escala
    let mouseX = (e.clientX - rect.left) * scaleX;
    jogador.x = mouseX - jogador.largura / 2;
    
    // Mantém a nave dentro da tela
    if (jogador.x < 0) jogador.x = 0;
    if (jogador.x + jogador.largura > canvas.width) jogador.x = canvas.width - jogador.largura;
});

// Tiro via Clique ou Teclado (Espaço)
function atirar() {
    if (jogoPausado || gameOver || !jogador.podeAtirar) return;
    tiros.push({ x: jogador.x + jogador.largura / 2 - 2, y: jogador.y, ativo: true });
    tocarSomTiro();
    jogador.podeAtirar = false;
    // Limita a velocidade de disparo do jogador
    setTimeout(() => { jogador.podeAtirar = true; }, 400); 
}
canvas.addEventListener("mousedown", atirar);
window.addEventListener("keydown", (e) => { if(e.key === " ") atirar(); });

// Touch Mobile
canvas.addEventListener("touchmove", (e) => {
    e.preventDefault();
    if (jogoPausado || gameOver) return;
    const rect = canvas.getBoundingClientRect();
    
    // Aplica a mesma lógica de escala para o celular
    const scaleX = canvas.width / rect.width;
    
    let touchX = (e.touches[0].clientX - rect.left) * scaleX;
    jogador.x = touchX - jogador.largura / 2;
    
    // Mantém a nave dentro da tela também no touch
    if (jogador.x < 0) jogador.x = 0;
    if (jogador.x + jogador.largura > canvas.width) jogador.x = canvas.width - jogador.largura;
}, { passive: false });

// --- LÓGICA PRINCIPAL ---
let ultimoTempo = 0;

function atualizar(tempoAtual) {
    let delta = tempoAtual - ultimoTempo;

    // 1. Atualizar Balas do Jogador
    for (let i = 0; i < tiros.length; i++) {
        tiros[i].y -= velocidadeTiro;
        if (tiros[i].y < 0) tiros[i].ativo = false; // Saiu da tela
    }
    tiros = tiros.filter(t => t.ativo); // Limpa as balas inativas da memória

    // 2. Colisão (Tiro do Jogador vs Aliens)
    aliens.forEach(alien => {
        if (alien.vivo) {
            tiros.forEach(tiro => {
                if (tiro.ativo && 
                    tiro.x > alien.x && tiro.x < alien.x + larguraAlien &&
                    tiro.y > alien.y && tiro.y < alien.y + alturaAlien) {
                    
                    alien.vivo = false;
                    tiro.ativo = false;
                    score += 10;
                    tocarSomExplosao();
                }
            });
        }
    });

    let aliensVivos = aliens.filter(a => a.vivo);
    if (aliensVivos.length === 0) {
        // Ganhou a rodada! Reseta a frota e aumenta a dificuldade base
        criarAliens();
        moveIntervaloBase -= 100; 
        if(moveIntervaloBase < 200) moveIntervaloBase = 200;
    }

    // 3. Movimentação da Frota Alienígena (Marcha)
    moveTimer += delta;
    
    // A genialidade do original: menos aliens = intervalo de tempo menor = mais rápido!
    let intervaloAtual = (aliensVivos.length / (linhasAliens * colunasAliens)) * moveIntervaloBase + 100;

    if (moveTimer > intervaloAtual) {
        moveTimer = 0;
        
        // Toca a próxima nota da marcha do áudio clássico
        tocarSomMarcha(notasMarcha[notaAtual]);
        notaAtual = (notaAtual + 1) % notasMarcha.length;

        let bateuNaBorda = false;
        aliensVivos.forEach(alien => {
            alien.x += 15 * direcaoAliens; // Dá um "salto" clássico pro lado
            if (alien.x + larguraAlien > canvas.width - 10 || alien.x < 10) {
                bateuNaBorda = true;
            }
        });

        // Se a frota bateu na borda, desce e inverte a direção
        if (bateuNaBorda) {
            direcaoAliens *= -1;
            aliensVivos.forEach(alien => {
                alien.y += 20; // Desce degrau
                // Se um alien encostar no chão, é Game Over
                if (alien.y + alturaAlien >= jogador.y) {
                    gameOver = true;
                }
            });
        }
    }
    ultimoTempo = tempoAtual;
}

// --- DESENHO NA TELA ---
function desenhar() {
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Interface Visual de Fundo
    ctx.fillStyle = "#ffffff";
    ctx.font = "20px Courier New";
    ctx.fillText("SCORE: " + score, 10, 30);
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - 10);
    ctx.lineTo(canvas.width, canvas.height - 10);
    ctx.strokeStyle = "#00ff00";
    ctx.stroke();

    // Desenha Tiros
    ctx.fillStyle = "#ff0000";
    tiros.forEach(tiro => {
        ctx.fillRect(tiro.x, tiro.y, 4, 10);
    });

    // Desenha Aliens Clássicos
    ctx.fillStyle = "#ffffff";
    aliens.forEach(alien => {
        if (alien.vivo) {
            // Desenha o alien como um bloco detalhado
            ctx.fillRect(alien.x, alien.y, larguraAlien, alturaAlien);
            // Faz os "olhinhos" vazados (pretos) no bloco branco
            ctx.fillStyle = "#000000";
            ctx.fillRect(alien.x + 5, alien.y + 5, 5, 5);
            ctx.fillRect(alien.x + 20, alien.y + 5, 5, 5);
            ctx.fillStyle = "#ffffff"; // Volta pro branco pro próximo
        }
    });

    // Desenha Jogador (Nave Verde)
    ctx.fillStyle = "#00ff00";
    ctx.fillRect(jogador.x, jogador.y, jogador.largura, jogador.altura);
    ctx.fillRect(jogador.x + 12, jogador.y - 8, 6, 8); // Canhão da nave

    // Telas de Status
    if (gameOver) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#ff0000";
        ctx.textAlign = "center";
        ctx.font = "40px Courier New";
        ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2);
    } else if (jogoPausado) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.font = "24px Courier New";
        ctx.fillText("PAUSADO", canvas.width / 2, canvas.height / 2);
        ctx.font = "14px Courier New";
        ctx.fillText("Interaja com o jogo para continuar", canvas.width / 2, canvas.height / 2 + 30);
    }
    ctx.textAlign = "left"; // Reseta alinhamento
}

function loop(timestamp) {
    if (!ultimoTempo) ultimoTempo = timestamp;
    if (!jogoPausado && !gameOver) {
        atualizar(timestamp);
    }
    desenhar();
    requestAnimationFrame(loop);
}

requestAnimationFrame(loop);