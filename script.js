// ============================================================
//  TugWar Tech — script.js
//  Firebase Realtime Database — Game Engine
// ============================================================
//
//  ⚠️ CONFIGURE SEU FIREBASE ABAIXO ⚠️
//  1. Acesse https://console.firebase.google.com
//  2. Crie um projeto → Web App
//  3. Copie as credenciais e cole aqui
//
// ============================================================

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBUM10PE9Fn8_DUXUmpIjaMSNX9Bmmkyv4",
  authDomain: "tugwar-tech-1.firebaseapp.com",
  databaseURL: "https://tugwar-tech-1-default-rtdb.firebaseio.com",
  projectId: "tugwar-tech-1",
  storageBucket: "tugwar-tech-1.firebasestorage.app",
  messagingSenderId: "101380598994",
  appId: "1:101380598994:web:86172adcee2cb07c38110b"
};

// ============================================================
//  INICIALIZAÇÃO FIREBASE
// ============================================================
let db = null;
let gameRoom = null;
let gameListeners = [];

try {
  if (!firebase.apps.length) {
    firebase.initializeApp(FIREBASE_CONFIG);
  }
  db = firebase.database();
  console.log('✅ Firebase conectado');
} catch(e) {
  console.warn('⚠️ Firebase não configurado. Rodando em modo demo local.', e.message);
}

// ============================================================
//  ESTADO LOCAL (fallback sem Firebase)
// ============================================================
let localState = {
  status: 'waiting',
  position: 0,
  currentQuestionIndex: -1,
  currentQuestion: null,
  players: {},
  answers: {}
};

// ============================================================
//  GERAÇÃO DE CÓDIGO DE SALA
// ============================================================
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for(let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// ============================================================
//  INICIALIZAÇÃO DO PROFESSOR
// ============================================================
function initProfessor() {
  // Verificar se já tem sala salva (refresh)
  const savedRoom = sessionStorage.getItem('tugwar_room');
  if(savedRoom) {
    gameRoom = savedRoom;
  } else {
    gameRoom = generateRoomCode();
    sessionStorage.setItem('tugwar_room', gameRoom);
  }

  // Exibir código e link
  document.getElementById('roomCode').textContent = gameRoom;
  const playerUrl = `${window.location.origin}${window.location.pathname.replace('index.html','').replace(/\/$/, '')}/player.html?room=${gameRoom}`;
  document.getElementById('roomLink').textContent = playerUrl;

  if(db) {
    // Criar/verificar sala no Firebase
    db.ref(`rooms/${gameRoom}`).once('value').then(snap => {
      if(!snap.exists()) {
        db.ref(`rooms/${gameRoom}`).set({
          createdAt: Date.now(),
          state: {
            status: 'waiting',
            position: 0,
            currentQuestionIndex: -1
          }
        });
      }
      // Sincronizar questões salvas
      const saved = localStorage.getItem('tugwar_questions');
      if(saved) {
        db.ref(`rooms/${gameRoom}/questions`).set(JSON.parse(saved));
      }
    });

    // Ouvir jogadores
    db.ref(`rooms/${gameRoom}/players`).on('value', snap => {
      const players = snap.val() || {};
      updatePlayersUI(players);
    });

    // Ouvir respostas
    db.ref(`rooms/${gameRoom}/answers`).on('value', snap => {
      const answers = snap.val() || {};
      processAnswers(answers);
    });

    // Ouvir estado do jogo
    db.ref(`rooms/${gameRoom}/state`).on('value', snap => {
      const state = snap.val() || {};
      syncStateToUI(state);
    });

  } else {
    // Modo demo: simular localmente
    console.log('🎮 Modo demo: Firebase não configurado.');
    document.getElementById('roomLink').textContent = 'Configure o Firebase em script.js para gerar link real.';
  }

  // Render rope at start
  updateRope(0);
  renderQuestions();
}

// ============================================================
//  CONTROLES DO JOGO
// ============================================================
let answersListener = null;
let currentAnswers = {};
let questionAnswered = false;

function startGame() {
  if(questions.length === 0) {
    alert('⚠️ Adicione questões antes de iniciar!');
    showTab('questions');
    return;
  }

  questionAnswered = false;
  currentAnswers = {};
  addFeedItem('🎮 Jogo iniciado!', null, 'O professor iniciou a partida.', 'correct');

  const firstQ = questions[0];
  const state = {
    status: 'active',
    position: 0,
    currentQuestionIndex: 0,
    currentQuestion: sanitizeQuestion(firstQ),
    startedAt: Date.now()
  };

  if(db) {
    // Limpar respostas antigas
    db.ref(`rooms/${gameRoom}/answers`).remove();
    db.ref(`rooms/${gameRoom}/state`).set(state);
  } else {
    localState = state;
    syncStateToUI(state);
  }

  document.getElementById('btnStart').disabled = true;
  document.getElementById('btnNext').disabled = false;
  showQInUI(firstQ, 0);
}

function nextQuestion() {
  if(!db && localState.status !== 'active') return;

  db.ref(`rooms/${gameRoom}/state`).once('value').then(snap => {
    const state = snap.val() || {};
    const nextIdx = (state.currentQuestionIndex || 0) + 1;

    if(nextIdx >= questions.length) {
      endGame(state.position || 0);
      return;
    }

    questionAnswered = false;
    currentAnswers = {};

    // Clear answers for new question
    db.ref(`rooms/${gameRoom}/answers`).remove();

    const nextQ = questions[nextIdx];
    const updates = {
      currentQuestionIndex: nextIdx,
      currentQuestion: sanitizeQuestion(nextQ),
      lastResult: null
    };

    db.ref(`rooms/${gameRoom}/state`).update(updates);
    showQInUI(nextQ, nextIdx);

  }).catch(() => {
    // Fallback demo
    const nextIdx = localState.currentQuestionIndex + 1;
    if(nextIdx >= questions.length) { endGame(localState.position); return; }
    questionAnswered = false;
    const nextQ = questions[nextIdx];
    localState.currentQuestionIndex = nextIdx;
    localState.currentQuestion = sanitizeQuestion(nextQ);
    syncStateToUI(localState);
    showQInUI(nextQ, nextIdx);
  });
}

function resetGame() {
  if(!confirm('Reiniciar o jogo? Todos os pontos serão zerados.')) return;

  const state = {
    status: 'waiting',
    position: 0,
    currentQuestionIndex: -1,
    currentQuestion: null,
    lastResult: null
  };

  if(db) {
    db.ref(`rooms/${gameRoom}/answers`).remove();
    db.ref(`rooms/${gameRoom}/state`).set(state);
  } else {
    localState = state;
    syncStateToUI(state);
  }

  document.getElementById('btnStart').disabled = false;
  document.getElementById('btnNext').disabled = true;
  document.getElementById('feedList').innerHTML = '<div style="color:var(--muted);font-size:0.8rem;text-align:center;padding:20px">Aguardando respostas...</div>';
  updateRope(0);
  document.getElementById('qStatus').className = 'q-status waiting';
  document.getElementById('qStatus').textContent = 'AGUARDANDO';
  document.getElementById('qText').textContent = 'Inicie o jogo para começar as perguntas.';
  document.getElementById('qAnswers').innerHTML = '';
  document.getElementById('qNum').textContent = 'Aguardando início...';
  closeWinner();
}

function endGame(position) {
  const winner = position < 0 ? 'blue' : position > 0 ? 'red' : 'draw';

  const state = { status: 'finished', winner, finalPosition: position };
  if(db) {
    db.ref(`rooms/${gameRoom}/state`).update(state);
  }

  document.getElementById('btnNext').disabled = true;
  if(winner !== 'draw') {
    showWinner(winner);
  } else {
    alert('🤝 Empate! Nenhum time atingiu 6 pontos!');
  }
}

// ============================================================
//  PROCESSAR RESPOSTAS DOS ALUNOS
// ============================================================
function processAnswers(answers) {
  if(questionAnswered) return;

  const state = getLocalOrFirebaseState();
  const qIdx = state.currentQuestionIndex;
  const q = state.currentQuestion;
  if(!q || qIdx === undefined || qIdx < 0) return;

  const relevantAnswers = Object.values(answers).filter(a => a.questionIndex === qIdx);
  if(relevantAnswers.length === 0) return;

  // Sort by timestamp
  relevantAnswers.sort((a, b) => a.timestamp - b.timestamp);

  // Find first correct per team
  let blueWinner = null, redWinner = null;

  for(const ans of relevantAnswers) {
    const isCorrect = ans.answer === q.correct;
    addFeedItem(
      ans.name || 'Anônimo',
      ans.team,
      isCorrect ? '✓ Correto' : '✗ Errado',
      isCorrect ? 'correct' : 'wrong'
    );

    if(isCorrect && !blueWinner && ans.team === 'blue') blueWinner = ans;
    if(isCorrect && !redWinner && ans.team === 'red') redWinner = ans;
  }

  // Determine who scored first
  let winnerTeam = null;
  if(blueWinner && redWinner) {
    winnerTeam = blueWinner.timestamp < redWinner.timestamp ? 'blue' : 'red';
  } else if(blueWinner) {
    winnerTeam = 'blue';
  } else if(redWinner) {
    winnerTeam = 'red';
  }

  if(winnerTeam) {
    questionAnswered = true;
    applyPoint(winnerTeam, q.correct, qIdx);
  }
}

function applyPoint(winnerTeam, correctAnswer, qIdx) {
  if(db) {
    db.ref(`rooms/${gameRoom}/state/position`).transaction(pos => {
      const current = pos || 0;
      const delta = winnerTeam === 'blue' ? -1 : 1;
      const newPos = Math.max(-6, Math.min(6, current + delta));

      // Check win condition
      if(Math.abs(newPos) >= 6) {
        setTimeout(() => endGame(newPos), 800);
      }
      return newPos;
    });

    db.ref(`rooms/${gameRoom}/state`).update({
      lastResult: {
        winnerTeam,
        correctAnswer,
        questionIndex: qIdx,
        timestamp: Date.now()
      }
    });
  } else {
    const delta = winnerTeam === 'blue' ? -1 : 1;
    localState.position = Math.max(-6, Math.min(6, (localState.position||0) + delta));
    updateRope(localState.position);
    if(Math.abs(localState.position) >= 6) {
      setTimeout(() => endGame(localState.position), 800);
    }
  }

  addFeedItem(
    winnerTeam === 'blue' ? '⚡ TIME AZUL' : '🔥 TIME VERMELHO',
    winnerTeam,
    '🏆 Ganhou o ponto!',
    'correct'
  );
}

// ============================================================
//  SINCRONIZAR UI COM ESTADO
// ============================================================
function syncStateToUI(state) {
  if(state.position !== undefined) updateRope(state.position);
}

function getLocalOrFirebaseState() {
  return localState;
}

// Mantém localState sincronizado quando usando Firebase
if(typeof db !== 'undefined' && db) {
  // Listener configurado em initProfessor
}

// ============================================================
//  EXIBIR PERGUNTA NA TELA DO PROFESSOR
// ============================================================
const LETTERS = ['A','B','C','D'];

function showQInUI(q, idx) {
  document.getElementById('qNum').textContent = `Pergunta ${idx+1} de ${questions.length}`;
  document.getElementById('qText').textContent = q.question;
  document.getElementById('qStatus').className = 'q-status active';
  document.getElementById('qStatus').textContent = 'ATIVA';

  const answersEl = document.getElementById('qAnswers');
  answersEl.innerHTML = q.options.map((opt, i) => `
    <div class="q-answer ${i === q.correct ? 'correct' : ''}">
      <span class="q-letter">${LETTERS[i]}</span>
      <span>${opt}</span>
      ${i === q.correct ? ' ✓' : ''}
    </div>
  `).join('');
}

// ============================================================
//  ATUALIZAR UI DE JOGADORES
// ============================================================
function updatePlayersUI(players) {
  const all = Object.values(players);
  const blues = all.filter(p => p.team === 'blue');
  const reds = all.filter(p => p.team === 'red');

  document.getElementById('blueCount').textContent = `${blues.length} jogador${blues.length !== 1 ? 'es' : ''}`;
  document.getElementById('redCount').textContent = `${reds.length} jogador${reds.length !== 1 ? 'es' : ''}`;

  // Players tab
  document.getElementById('statTotal').textContent = all.length;
  document.getElementById('statBlue').textContent = blues.length;
  document.getElementById('statRed').textContent = reds.length;

  const list = document.getElementById('playersList');
  if(all.length === 0) {
    list.innerHTML = '<div style="color:var(--muted);font-size:0.85rem;padding:20px">Aguardando jogadores...</div>';
  } else {
    list.innerHTML = all.map(p => `
      <div class="player-chip">
        <div class="player-avatar ${p.team}">${p.name.charAt(0).toUpperCase()}</div>
        <span class="player-name-chip">${p.name}</span>
      </div>
    `).join('');
  }
}

// ============================================================
//  LIVE FEED
// ============================================================
const MAX_FEED = 15;
let feedItems = [];

function addFeedItem(name, team, result, type) {
  const list = document.getElementById('feedList');
  const item = document.createElement('div');
  item.className = `feed-item ${type}`;
  item.innerHTML = `
    ${team ? `<span class="feed-badge ${team}">${team === 'blue' ? 'AZL' : 'VRM'}</span>` : ''}
    <span class="feed-name">${name}</span>
    <span class="feed-result">${result}</span>
  `;

  // Remove placeholder
  const placeholder = list.querySelector('div[style]');
  if(placeholder) list.innerHTML = '';

  list.prepend(item);

  feedItems.push(item);
  if(feedItems.length > MAX_FEED) {
    feedItems[0].remove();
    feedItems.shift();
  }
}

// ============================================================
//  UTILITÁRIOS
// ============================================================
function sanitizeQuestion(q) {
  // Remove the correct answer index from what's sent to players
  // (they receive full object, server validates)
  return {
    question: q.question,
    options: q.options,
    correct: q.correct // In production, you'd validate server-side
  };
}

// ============================================================
//  EXPORT para uso global
// ============================================================
window.db = db;
window.gameRoom = gameRoom;
window.questions = questions;

console.log(`
🎮 TugWar Tech — Cabo de Guerra Educacional
============================================
Para configurar o Firebase:
1. Acesse console.firebase.google.com
2. Crie um projeto e ative o Realtime Database
3. Em Regras, use:
   {
     "rules": {
       ".read": true,
       ".write": true
     }
   }
4. Cole as credenciais em FIREBASE_CONFIG acima
5. Publique no Vercel

Credenciais padrão do professor:
  Usuário: admin
  Senha: admin123
`);
