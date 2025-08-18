// Carregar dados quando a página for carregada
document.addEventListener('DOMContentLoaded', function() {
    // Verificar se estamos na página do coordenador
    if (document.getElementById('acessosChart')) {
        loadCoordinatorData();
    }
    
    // Verificar se estamos na página do aluno
    if (document.getElementById('materias-container')) {
        loadStudentSubjects();
    }
});

// Carregar dados do coordenador
function loadCoordinatorData() {
    // Simular dados
    const acessos = [
        { nome: "Aluno 1", ra: "AL001", entrada: "10:00", saida: "10:30", questoes: 5, acertos: 3 },
        { nome: "Aluno 2", ra: "AL002", entrada: "10:15", saida: "11:00", questoes: 10, acertos: 7 },
        { nome: "Aluno 3", ra: "AL003", entrada: "11:30", saida: "12:00", questoes: 8, acertos: 6 }
    ];
    
    // Atualizar estatísticas
    document.getElementById('acessos-hoje').textContent = acessos.length;
    document.getElementById('questoes-respondidas').textContent = acessos.reduce((sum, aluno) => sum + aluno.questoes, 0);
    
    const totalAcertos = acessos.reduce((sum, aluno) => sum + aluno.acertos, 0);
    const totalQuestoes = acessos.reduce((sum, aluno) => sum + aluno.questoes, 0);
    const taxaAcerto = totalQuestoes > 0 ? Math.round((totalAcertos / totalQuestoes) * 100) : 0;
    document.getElementById('taxa-acerto').textContent = `${taxaAcerto}%`;
    
    // Preencher tabela de acessos
    const tableBody = document.querySelector('#acessosTable tbody');
    tableBody.innerHTML = '';
    
    acessos.forEach(aluno => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${aluno.nome}</td>
            <td>${aluno.ra}</td>
            <td>${aluno.entrada}</td>
            <td>${aluno.saida}</td>
            <td>${aluno.questoes}</td>
            <td>${aluno.acertos}</td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Criar gráficos
    createCharts();
}

// Criar gráficos
function createCharts() {
    // Dados simulados
    const dias = ["Seg", "Ter", "Qua", "Qui", "Sex"];
    const acessos = [15, 20, 25, 18, 30];
    const acertos = [65, 70, 75, 80, 85];
    
    // Gráfico de acessos
    const acessosCtx = document.getElementById('acessosChart').getContext('2d');
    new Chart(acessosCtx, {
        type: 'bar',
        data: {
            labels: dias,
            datasets: [{
                label: 'Acessos por dia',
                data: acessos,
                backgroundColor: 'rgba(26, 75, 140, 0.7)',
                borderColor: 'rgba(26, 75, 140, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
    
    // Gráfico de desempenho
    const desempenhoCtx = document.getElementById('desempenhoChart').getContext('2d');
    new Chart(desempenhoCtx, {
        type: 'line',
        data: {
            labels: dias,
            datasets: [{
                label: 'Taxa de acerto (%)',
                data: acertos,
                backgroundColor: 'rgba(76, 175, 80, 0.2)',
                borderColor: 'rgba(76, 175, 80, 1)',
                borderWidth: 2,
                tension: 0.1,
                fill: true
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: false,
                    min: 50,
                    max: 100
                }
            }
        }
    });
}

// Carregar matérias do aluno
function loadStudentSubjects() {
    const materias = [
        { nome: "Matemática", professor: "Prof. Souza" },
        { nome: "Português", professor: "Prof. Silva" },
        { nome: "Ciências", professor: "Prof. Oliveira" },
        { nome: "História", professor: "Prof. Santos" }
    ];
    
    const container = document.getElementById('materias-container');
    container.innerHTML = '';
    
    materias.forEach(materia => {
        const card = document.createElement('div');
        card.className = 'materia-card';
        card.innerHTML = `
            <h3>${materia.nome}</h3>
            <p>${materia.professor}</p>
        `;
        
        card.addEventListener('click', function() {
            alert(`Você selecionou ${materia.nome}`);
            // Aqui você pode redirecionar para os conteúdos da matéria
        });
        
        container.appendChild(card);
    });
}