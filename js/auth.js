// Simulação de banco de dados de usuários
const users = {
    coordenadores: [
        { cpf: "ADM", nome: "Coordenador Silva", senha: "ADM", id: 1 }
    ],
    professores: [
        { cpf: "adm", nome: "Professor Souza", matricula: "adm", senha: "professor123", id: 1 }
    ],
    alunos: [
        { ra: "alu", nome: "Aluno Teste", senha: "alu", turma: "9A", id: 1 }
    ]
};

// Verificar se há um usuário logado
document.addEventListener('DOMContentLoaded', function() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    if (currentUser && window.location.pathname.endsWith('index.html')) {
        redirectToDashboard(currentUser.tipo);
    } else if (!currentUser && !window.location.pathname.endsWith('index.html')) {
        window.location.href = 'index.html';
    }
});

// Função de login
document.getElementById('loginForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const userType = document.getElementById('userType').value;
    const userId = document.getElementById('userId').value;
    const password = document.getElementById('password').value;
    
    let user;
    
    if (userType === 'coordenador') {
        user = users.coordenadores.find(u => u.cpf === userId && u.senha === password);
    } else if (userType === 'professor') {
        user = users.professores.find(u => u.cpf === userId && u.senha === password);
    } else if (userType === 'aluno') {
        user = users.alunos.find(u => u.ra === userId && u.senha === password);
    }
    
    if (user) {
        // Salvar usuário logado
        const currentUser = {
            id: user.id,
            nome: user.nome,
            tipo: userType,
            ...(userType === 'aluno' && { turma: user.turma }),
            ...(userType === 'professor' && { matricula: user.matricula }),
            ...(userType === 'coordenador' && { cpf: user.cpf })
        };
        
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        // Redirecionar para o dashboard apropriado
        redirectToDashboard(userType);
    } else {
        alert('Credenciais inválidas. Por favor, tente novamente.');
    }
});

// Função de logout
document.querySelectorAll('.logout').forEach(button => {
    button.addEventListener('click', function(e) {
        e.preventDefault();
        localStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    });
});

// Redirecionar para o dashboard apropriado
function redirectToDashboard(userType) {
    switch (userType) {
        case 'coordenador':
            window.location.href = 'coordenador.html';
            break;
        case 'professor':
            window.location.href = 'professor.html';
            break;
        case 'aluno':
            window.location.href = 'aluno.html';
            break;
    }
}

// Navegação entre seções
document.querySelectorAll('[data-section]').forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        
        // Remover classe active de todos os links e seções
        document.querySelectorAll('nav a').forEach(a => a.classList.remove('active'));
        document.querySelectorAll('.section').forEach(section => section.classList.remove('active'));
        
        // Adicionar classe active ao link clicado
        this.classList.add('active');
        
        // Mostrar a seção correspondente
        const sectionId = this.getAttribute('data-section');
        document.getElementById(sectionId).classList.add('active');
    });
});