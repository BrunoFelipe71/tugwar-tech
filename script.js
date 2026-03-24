// ============================================================
//  TugWar Tech — script.js (CORRIGIDO)
// ============================================================

// 🔥 FIREBASE CONFIG (já estava ok)
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
//  🔧 VARIÁVEIS GLOBAIS (CORREÇÃO PRINCIPAL)
// ============================================================

let db = null;
let gameRoom = null;

// ✅ CORREÇÃO: garantir que questions sempre exista
let questions = JSON.parse(localStorage.getItem('tugwar_questions') || '[]');

// ✅ CORREÇÃO: definir UMA única vez
const LETTERS = ['A','B','C','D'];

// ============================================================
//  FIREBASE INIT
// ============================================================

try {
  if (!firebase.apps.length) {
    firebase.initializeApp(FIREBASE_CONFIG);
  }
  db = firebase.database();
  console.log('✅ Firebase conectado');
} catch(e) {
  console.warn('⚠️ Firebase erro:', e.message);
}

// ============================================================
//  GERA SALA
// ============================================================

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for(let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// ============================================================
//  INIT PROFESSOR
// ============================================================

function initProfessor() {

  const savedRoom = sessionStorage.getItem('tugwar_room');

  if(savedRoom) {
    gameRoom = savedRoom;
  } else {
    gameRoom = generateRoomCode();
    sessionStorage.setItem('tugwar_room', gameRoom);
  }

  document.getElementById('roomCode').textContent = gameRoom;

  const playerUrl = `${window.location.origin}/player.html?room=${gameRoom}`;
  document.getElementById('roomLink').textContent = playerUrl;

  if(db) {

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

      db.ref(`rooms/${gameRoom}/questions`).set(questions);
    });

    db.ref(`rooms/${gameRoom}/players`).on('value', snap => {
      const players = snap.val() || {};
      updatePlayersUI(players);
    });

    db.ref(`rooms/${gameRoom}/answers`).on('value', snap => {
      const answers = snap.val() || {};
      processAnswers(answers);
    });

    db.ref(`rooms/${gameRoom}/state`).on('value', snap => {
      const state = snap.val() || {};
      syncStateToUI(state);
    });

  }

  updateRope(0);
}

// ============================================================
//  INICIAR JOGO
// ============================================================

let questionAnswered = false;

function startGame() {

  if(questions.length === 0) {
    alert('Adicione perguntas primeiro');
    return;
  }

  const firstQ = questions[0];

  db.ref(`rooms/${gameRoom}/answers`).remove();

  db.ref(`rooms/${gameRoom}/state`).set({
    status: 'active',
    position: 0,
    currentQuestionIndex: 0,
    currentQuestion: firstQ
  });

}

// ============================================================
//  PROCESSAR RESPOSTAS
// ============================================================

function processAnswers(answers) {

  if(questionAnswered) return;

  const list = Object.values(answers);

  if(list.length === 0) return;

  list.sort((a,b) => a.timestamp - b.timestamp);

  const stateRef = db.ref(`rooms/${gameRoom}/state`);

  stateRef.once('value').then(snap => {

    const state = snap.val();
    const q = state.currentQuestion;

    for(let ans of list) {

      if(ans.answer === q.correct) {

        questionAnswered = true;

        const delta = ans.team === 'blue' ? -1 : 1;

        let newPos = (state.position || 0) + delta;

        newPos = Math.max(-6, Math.min(6, newPos));

        stateRef.update({
          position: newPos,
          lastResult: {
            winnerTeam: ans.team,
            correctAnswer: q.correct
          }
        });

        if(Math.abs(newPos) >= 6) {
          setTimeout(() => endGame(newPos), 500);
        }

        break;
      }
    }

  });

}

// ============================================================
//  FINALIZAR JOGO
// ============================================================

function endGame(position) {

  const winner = position < 0 ? 'blue' : 'red';

  db.ref(`rooms/${gameRoom}/state`).update({
    status: 'finished',
    winner
  });

}

// ============================================================
//  UI
// ============================================================

function updatePlayersUI(players) {

  const all = Object.values(players);

  const blues = all.filter(p => p.team === 'blue');
  const reds = all.filter(p => p.team === 'red');

  document.getElementById('blueCount').textContent = blues.length;
  document.getElementById('redCount').textContent = reds.length;

}

function updateRope(position) {

  const pct = ((position + 6) / 12) * 100;

  document.getElementById('ropeKnot').style.left = pct + '%';

}

function syncStateToUI(state) {

  if(state.position !== undefined) {
    updateRope(state.position);
  }

}
