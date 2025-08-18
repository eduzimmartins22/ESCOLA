// Banco de dados de perguntas (simulado)
const questionsDatabase = {
    "matematica": {
        "facil": [
            {
                question: "Quanto é 2 + 2?",
                options: ["3", "4", "5", "6", "7"],
                answer: 2
            },
            {
                question: "Qual é o resultado de 5 x 3?",
                options: ["8", "10", "15", "20", "25"],
                answer: 3
            }
        ],
        "medio": [
            {
                question: "Qual é a raiz quadrada de 16?",
                options: ["2", "4", "6", "8", "10"],
                answer: 2
            }
        ],
        "dificil": [
            {
                question: "Qual é o valor de π (pi) arredondado para duas casas decimais?",
                options: ["3.12", "3.14", "3.16", "3.18", "3.20"],
                answer: 2
            }
        ]
    },
    "portugues": {
        "facil": [
            {
                question: "Qual é o plural de 'casa'?",
                options: ["casas", "cases", "casos", "casais", "casis"],
                answer: 1
            }
        ],
        "medio": [
            {
                question: "Qual é o sujeito na frase: 'O gato preto pulou o muro.'?",
                options: ["O gato", "preto", "pulou", "o muro", "gato preto"],
                answer: 1
            }
        ],
        "dificil": [
            {
                question: "Qual figura de linguagem está presente em 'O tempo é ouro'?",
                options: ["Metáfora", "Comparação", "Hipérbole", "Personificação", "Ironia"],
                answer: 1
            }
        ]
    }
};

// Variáveis do quiz
let currentQuestion = 0;
let currentLevel = "facil";
let score = 0;
let streak = 0;
let selectedSubject = "";
let quizQuestions = [];

// Iniciar o quiz
document.getElementById('start-quiz')?.addEventListener('click', function() {
    selectedSubject = document.getElementById('materia-select').value;
    
    if (!selectedSubject) {
        alert("Por favor, selecione uma matéria.");
        return;
    }
    
    // Carregar perguntas fáceis para começar
    quizQuestions = [...questionsDatabase[selectedSubject][currentLevel]];
    
    // Embaralhar perguntas
    quizQuestions = shuffleArray(quizQuestions).slice(0, 5);
    
    // Mostrar interface do quiz
    document.getElementById('quiz-start').style.display = 'none';
    document.getElementById('quiz-game').style.display = 'block';
    
    // Carregar primeira pergunta
    loadQuestion();
});

// Carregar pergunta
function loadQuestion() {
    const questionData = quizQuestions[currentQuestion];
    
    document.getElementById('question-text').textContent = questionData.question;
    document.getElementById('quiz-level').textContent = `Nível: ${translateLevel(currentLevel)}`;
    document.getElementById('quiz-score').textContent = `Pontos: ${score}`;
    document.getElementById('quiz-streak').textContent = `Sequência: ${streak}`;
    
    const options = document.querySelectorAll('.option');
    options.forEach((option, index) => {
        option.textContent = questionData.options[index];
    });
}

// Traduzir nível
function translateLevel(level) {
    const levels = {
        "facil": "Fácil",
        "medio": "Médio",
        "dificil": "Difícil"
    };
    return levels[level] || level;
}

// Responder pergunta
document.querySelectorAll('.option').forEach(option => {
    option.addEventListener('click', function() {
        const selectedOption = parseInt(this.getAttribute('data-option')) - 1;
        const correctAnswer = quizQuestions[currentQuestion].answer;
        const feedback = document.getElementById('quiz-feedback');
        const feedbackText = document.getElementById('feedback-text');
        
        // Desabilitar todas as opções
        document.querySelectorAll('.option').forEach(opt => {
            opt.disabled = true;
        });
        
        if (selectedOption === correctAnswer) {
            // Resposta correta
            feedbackText.textContent = "Resposta correta! Parabéns!";
            feedback.classList.add('correct');
            feedback.classList.remove('incorrect');
            
            // Atualizar pontuação
            score += 10;
            streak++;
            
            // Verificar se deve subir de nível
            if (streak >= 5 && currentLevel !== "dificil") {
                if (currentLevel === "facil") {
                    currentLevel = "medio";
                } else if (currentLevel === "medio") {
                    currentLevel = "dificil";
                }
                
                // Carregar novas perguntas do próximo nível
                quizQuestions = [...questionsDatabase[selectedSubject][currentLevel]];
                quizQuestions = shuffleArray(quizQuestions).slice(0, 5);
                currentQuestion = 0;
                streak = 0;
            }
        } else {
            // Resposta incorreta
            feedbackText.textContent = `Resposta incorreta. A resposta correta é: ${quizQuestions[currentQuestion].options[correctAnswer]}`;
            feedback.classList.add('incorrect');
            feedback.classList.remove('correct');
            
            // Resetar sequência
            streak = 0;
        }
        
        feedback.style.display = 'block';
    });
});

// Próxima pergunta
document.getElementById('next-question')?.addEventListener('click', function() {
    currentQuestion++;
    
    if (currentQuestion < quizQuestions.length) {
        // Carregar próxima pergunta
        loadQuestion();
        
        // Habilitar opções novamente
        document.querySelectorAll('.option').forEach(opt => {
            opt.disabled = false;
        });
        
        // Esconder feedback
        document.getElementById('quiz-feedback').style.display = 'none';
    } else {
        // Fim do quiz
        alert(`Quiz concluído! Sua pontuação final é: ${score}`);
        
        // Atualizar ranking
        updateRanking();
        
        // Resetar quiz
        resetQuiz();
    }
});

// Atualizar ranking
function updateRanking() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const streakToSave = streak > 0 ? streak : 1; // Garante que pelo menos 1 questão foi respondida
    
    let ranking = JSON.parse(localStorage.getItem('ranking')) || [];
    
    // Verificar se o usuário já está no ranking
    const userIndex = ranking.findIndex(item => item.id === currentUser.id);
    
    if (userIndex !== -1) {
        // Atualizar pontuação se for maior
        if (streakToSave > ranking[userIndex].streak) {
            ranking[userIndex].streak = streakToSave;
        }
    } else {
        // Adicionar novo usuário ao ranking
        ranking.push({
            id: currentUser.id,
            nome: currentUser.nome,
            turma: currentUser.turma || "N/A",
            streak: streakToSave
        });
    }
    
    // Ordenar ranking por streak (decrescente)
    ranking.sort((a, b) => b.streak - a.streak);
    
    // Salvar no localStorage
    localStorage.setItem('ranking', JSON.stringify(ranking));
    
    // Atualizar tabela de ranking se estiver na página
    if (document.getElementById('ranking-table')) {
        loadRanking();
    }
}

// Carregar ranking
function loadRanking() {
    const ranking = JSON.parse(localStorage.getItem('ranking')) || [];
    const tableBody = document.querySelector('#ranking-table tbody');
    
    tableBody.innerHTML = '';
    
    ranking.forEach((user, index) => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${index + 1}º</td>
            <td>${user.nome}</td>
            <td>${user.turma}</td>
            <td>${user.streak}</td>
        `;
        
        tableBody.appendChild(row);
    });
}

// Resetar quiz
function resetQuiz() {
    currentQuestion = 0;
    score = 0;
    streak = 0;
    currentLevel = "facil";
    quizQuestions = [];
    
    document.getElementById('quiz-start').style.display = 'block';
    document.getElementById('quiz-game').style.display = 'none';
    document.getElementById('quiz-feedback').style.display = 'none';
    
    // Habilitar opções novamente
    document.querySelectorAll('.option').forEach(opt => {
        opt.disabled = false;
    });
}

// Função para embaralhar array
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Carregar matérias no select
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('materia-select')) {
        const select = document.getElementById('materia-select');
        
        // Adicionar matérias disponíveis
        for (const subject in questionsDatabase) {
            const option = document.createElement('option');
            option.value = subject;
            option.textContent = subject.charAt(0).toUpperCase() + subject.slice(1);
            select.appendChild(option);
        }
    }
    
    // Carregar ranking se estiver na página
    if (document.getElementById('ranking-table')) {
        loadRanking();
    }
});