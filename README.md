# 🎮 TugWar Tech — Cabo de Guerra Educacional

Sistema de jogo educacional em tempo real no estilo "Cabo de Guerra", onde dois times competem respondendo perguntas.

---

## 📁 Arquivos

| Arquivo | Descrição |
|---------|-----------|
| `index.html` | Painel do professor (login + dashboard + gestão de questões) |
| `player.html` | Interface do aluno (celular) |
| `script.js` | Motor do jogo + integração Firebase |

---

## 🔥 CONFIGURAÇÃO DO FIREBASE (Obrigatório)

### Passo 1 — Criar projeto

1. Acesse [console.firebase.google.com](https://console.firebase.google.com)
2. Clique em **Adicionar projeto**
3. Dê um nome (ex: `tugwar-tech`) e conclua o wizard

### Passo 2 — Ativar Realtime Database

1. No menu lateral, clique em **Build → Realtime Database**
2. Clique em **Criar banco de dados**
3. Escolha o servidor mais próximo (EUA ou Europa)
4. Em **Modo de segurança**, selecione **Modo de teste** (por enquanto)

### Passo 3 — Configurar Regras

No Realtime Database, clique em **Regras** e cole:

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

> ⚠️ Regras de produção (depois de testar):
> ```json
> {
>   "rules": {
>     "rooms": {
>       "$roomId": {
>         ".read": true,
>         ".write": true,
>         "state": { ".write": true },
>         "players": { ".write": true },
>         "answers": { ".write": true }
>       }
>     }
>   }
> }
> ```

### Passo 4 — Obter credenciais

1. Vá em **Configurações do projeto** (engrenagem ⚙️)
2. Role até **Seus aplicativos** → clique em `</>` (Web)
3. Registre o app com um nome qualquer
4. Copie o objeto `firebaseConfig`

### Passo 5 — Colar em script.js

Abra `script.js` e substitua o bloco `FIREBASE_CONFIG`:

```javascript
const FIREBASE_CONFIG = {
  apiKey: "AIzaSy...",
  authDomain: "tugwar-tech.firebaseapp.com",
  databaseURL: "https://tugwar-tech-default-rtdb.firebaseio.com",
  projectId: "tugwar-tech",
  storageBucket: "tugwar-tech.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

---

## 🚀 PUBLICAR NO VERCEL (Grátis)

### Opção A — Via interface web

1. Coloque os 3 arquivos em uma pasta
2. Acesse [vercel.com](https://vercel.com) e faça login
3. Clique em **Add New → Project**
4. Arraste a pasta ou faça upload dos arquivos
5. Clique em **Deploy**
6. Pronto! Você receberá uma URL como `https://tugwar-tech.vercel.app`

### Opção B — Via GitHub + Vercel

1. Crie um repositório no GitHub com os 3 arquivos
2. No Vercel, conecte o repositório
3. Deploy automático a cada commit

### Opção C — Via CLI

```bash
npm install -g vercel
cd pasta-do-projeto
vercel
# Siga as instruções
```

---

## 🎓 COMO USAR EM SALA DE AULA

### Professor

1. Acesse `https://seu-site.vercel.app/index.html`
2. Login: **admin** / Senha: **admin123**
3. Na aba **Questões**, adicione suas perguntas
4. Na aba **Jogo**, copie o **Código da Sala** ou o **Link**
5. Compartilhe com os alunos
6. Clique em **INICIAR** para começar
7. Use **PRÓXIMA** para avançar as perguntas

### Alunos

1. Acessam `https://seu-site.vercel.app/player.html?room=CODIGO`
2. Digitam o nome e escolhem o time (Azul ou Vermelho)
3. Clicam em **ENTRAR NA SALA**
4. Aguardam o professor iniciar
5. Respondem as perguntas (botões grandes, feito para celular)

---

## 📋 IMPORTAR QUESTÕES VIA JSON

Na aba **Questões**, você pode importar um lote de perguntas via JSON:

```json
[
  {
    "question": "Qual é a capital do Brasil?",
    "options": ["São Paulo", "Brasília", "Rio de Janeiro", "Manaus"],
    "correct": 1
  },
  {
    "question": "Quanto é 7 × 8?",
    "options": ["54", "56", "63", "64"],
    "correct": 1
  },
  {
    "question": "Quem escreveu Dom Casmurro?",
    "options": ["José de Alencar", "Machado de Assis", "Clarice Lispector", "Drummond"],
    "correct": 1
  }
]
```

> 💡 O campo `correct` é o **índice** (0 = A, 1 = B, 2 = C, 3 = D)

---

## 🔐 ALTERAR CREDENCIAIS DO PROFESSOR

No arquivo `index.html`, localize:

```javascript
const CREDENTIALS = { admin: 'admin123' };
```

Altere para:

```javascript
const CREDENTIALS = { 
  'seunome': 'suasenha',
  'professor2': 'outrasenha'
};
```

---

## 🏆 MECÂNICA DO JOGO

- Posição vai de **-6** (Azul ganha) até **+6** (Vermelho ganha)
- Cada resposta correta move +1 ponto para o time vencedor
- O **primeiro time a responder corretamente** ganha o ponto
- Se um time errar, o outro ainda pode responder
- Vitória ao atingir **6 pontos**

---

## 📱 COMPATIBILIDADE

| Dispositivo | Suporte |
|-------------|---------|
| iPhone (Safari) | ✅ |
| Android (Chrome) | ✅ |
| Desktop (Chrome/Firefox/Edge) | ✅ |
| iPad | ✅ |

---

## 🛠️ TECNOLOGIAS

- **HTML5 + CSS3 + JavaScript** puro (sem frameworks)
- **Firebase Realtime Database** para sincronização
- **Google Fonts** (Bebas Neue + Barlow)
- **Vercel** para hospedagem

---

## 🆘 PROBLEMAS COMUNS

**"Sala não encontrada"**
→ Verifique se o Firebase está configurado e se o código está correto.

**Alunos não aparecem no painel**
→ Confirme que o `databaseURL` em `FIREBASE_CONFIG` está correto.

**Jogo não sincroniza**
→ Verifique as Regras do Firebase (`.read: true, .write: true`).

**Link não funciona**
→ Certifique-se de que `player.html` está na mesma pasta que `index.html` no Vercel.

---

Feito com ❤️ para educação em sala de aula.
