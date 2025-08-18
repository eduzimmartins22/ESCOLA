// Simulação de um banco de dados simples usando localStorage

// Inicializar dados se não existirem
if (!localStorage.getItem('salas')) {
    localStorage.setItem('salas', JSON.stringify([
        { id: 1, nome: "9A", alunos: ["ALUNO001", "ALUNO002"] },
        { id: 2, nome: "9B", alunos: ["ALUNO003", "ALUNO004"] }
    ]));
}

if (!localStorage.getItem('materias')) {
    localStorage.setItem('materias', JSON.stringify([
        { id: 1, nome: "Matemática", salaId: 1, professorId: 1, conteudos: [] },
        { id: 2, nome: "Português", salaId: 1, professorId: 2, conteudos: [] }
    ]));
}

if (!localStorage.getItem('professores')) {
    localStorage.setItem('professores', JSON.stringify([
        { id: 1, cpf: "98765432109", nome: "Professor Souza", matricula: "PROF001" },
        { id: 2, cpf: "12345678901", nome: "Professor Silva", matricula: "PROF002" }
    ]));
}

if (!localStorage.getItem('banners')) {
    localStorage.setItem('banners', JSON.stringify([
        { 
            id: 1, 
            titulo: "PAEBES", 
            imagem: "paebes.png", 
            data: "15/11/2023", 
            materias: "Português e Matemática",
            dicas: "Revise os conteúdos das últimas aulas e faça os exercícios propostos."
        }
    ]));
}

// Funções para acessar os dados
const db = {
    // Salas
    getSalas: function() {
        return JSON.parse(localStorage.getItem('salas'));
    },
    
    addSala: function(nome) {
        const salas = this.getSalas();
        const novaSala = {
            id: salas.length > 0 ? Math.max(...salas.map(s => s.id)) + 1 : 1,
            nome: nome,
            alunos: []
        };
        
        salas.push(novaSala);
        localStorage.setItem('salas', JSON.stringify(salas));
        return novaSala;
    },
    
    // Matérias
    getMaterias: function() {
        return JSON.parse(localStorage.getItem('materias'));
    },
    
    addMateria: function(nome, salaId, professorId) {
        const materias = this.getMaterias();
        const novaMateria = {
            id: materias.length > 0 ? Math.max(...materias.map(m => m.id)) + 1 : 1,
            nome: nome,
            salaId: salaId,
            professorId: professorId,
            conteudos: []
        };
        
        materias.push(novaMateria);
        localStorage.setItem('materias', JSON.stringify(materias));
        return novaMateria;
    },
    
    // Professores
    getProfessores: function() {
        return JSON.parse(localStorage.getItem('professores'));
    },
    
    addProfessor: function(cpf, nome, matricula) {
        const professores = this.getProfessores();
        const novoProfessor = {
            id: professores.length > 0 ? Math.max(...professores.map(p => p.id)) + 1 : 1,
            cpf: cpf,
            nome: nome,
            matricula: matricula
        };
        
        professores.push(novoProfessor);
        localStorage.setItem('professores', JSON.stringify(professores));
        return novoProfessor;
    },
    
    // Banners
    getBanners: function() {
        return JSON.parse(localStorage.getItem('banners'));
    },
    
    addBanner: function(banner) {
        const banners = this.getBanners();
        const novoBanner = {
            id: banners.length > 0 ? Math.max(...banners.map(b => b.id)) + 1 : 1,
            ...banner
        };
        
        banners.push(novoBanner);
        localStorage.setItem('banners', JSON.stringify(banners));
        return novoBanner;
    }
};