import os
import pymysql.cursors
from flask import Flask, jsonify, request, render_template, url_for
from flask_cors import CORS
from dotenv import load_dotenv
import re
import uuid
import bcrypt
import datetime # Import necessário para formatar datas
from werkzeug.utils import secure_filename

# Carrega as variáveis de ambiente do arquivo .env
load_dotenv()

app = Flask(__name__, static_folder="static", template_folder="templates")

# CORS liberado para a API
CORS(app, resources={r"/api/*": {"origins": "*"}})

# --- Configuração da Conexão com o Banco de Dados ---
def get_db_connection():
    """Cria e retorna uma nova conexão com o banco de dados."""
    try:
        connection = pymysql.connect(
            host=os.getenv('DB_HOST'),
            user=os.getenv('DB_USER'),
            password=os.getenv('DB_PASSWORD'),
            database=os.getenv('DB_NAME'),
            cursorclass=pymysql.cursors.DictCursor,
            autocommit=True
        )
        return connection
    except pymysql.MySQLError as e:
        print(f"Erro ao conectar ao banco de dados: {e}")
        return None

# ===========================
# 🔹 ROTA PRINCIPAL
# ===========================
@app.route('/')
def index():
    """Serve a página principal da aplicação."""
    return render_template('index.html')

# ===========================
# 🔹 ROTAS DE API - AUTENTICAÇÃO E USUÁRIOS
# ===========================

@app.route('/api/login', methods=['POST'])
def login():
    """Autentica um usuário."""
    data = request.get_json()
    cpf = (data.get('cpf') or "").strip()
    senha = (data.get('senha') or "").strip()
    role = data.get('role')

    if not re.fullmatch(r"\d{11}", cpf):
        return jsonify({"error": "CPF inválido. Use 11 dígitos numéricos."}), 400
    if not senha or not role:
        return jsonify({"error": "CPF, senha e perfil são obrigatórios."}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Falha na conexão com o servidor."}), 500

    try:
        with conn.cursor() as cursor:
            sql = "SELECT id, nome, cpf, role, sala_id, senha_hash FROM users WHERE cpf=%s AND role=%s"
            cursor.execute(sql, (cpf, role))
            user = cursor.fetchone()

            if user and bcrypt.checkpw(senha.encode('utf-8'), user['senha_hash'].encode('utf-8')):
                del user['senha_hash']
                return jsonify({"user": user})
            else:
                return jsonify({"error": "Credenciais inválidas"}), 401
    finally:
        if conn: conn.close()

@app.route('/api/users', methods=['POST'])
def create_user():
    """Cria um novo usuário."""
    data = request.get_json()
    role = data.get('role')

    if not all(k in data for k in ['nome', 'cpf', 'senha', 'role']):
        return jsonify({"error": "Campos nome, cpf, senha e role são obrigatórios"}), 400

    senha_hash = bcrypt.hashpw(data['senha'].encode('utf-8'), bcrypt.gensalt())

    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Falha na conexão com o servidor."}), 500

    try:
        with conn.cursor() as cursor:
            sql = """
                INSERT INTO users (id, role, nome, cpf, matricula, senha_hash, sala_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """
            user_id = str(uuid.uuid4())
            cursor.execute(sql, (
                user_id,
                role,
                data['nome'],
                data['cpf'],
                data.get('mat'), # Usando snake_case consistentemente
                senha_hash,
                data.get('sala_id') # Usando snake_case consistentemente
            ))
        return jsonify({"message": f"{role.capitalize()} criado com sucesso!", "id": user_id}), 201
    except pymysql.IntegrityError:
        return jsonify({"error": "CPF já cadastrado."}), 409
    except Exception as e:
        print(f"Erro inesperado em create_user: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Erro interno ao criar usuário"}), 500
    finally:
        if conn: conn.close()

@app.route('/api/users/<role>', methods=['GET'])
def list_users(role):
    """Lista todos os usuários de um determinado perfil."""
    valid_roles_map = {'alunos': 'aluno', 'professores': 'professor', 'coordenadores': 'coordenador',
                       'aluno': 'aluno', 'professor': 'professor', 'coordenador': 'coordenador'}
    if role not in valid_roles_map:
        return jsonify({"error": "Perfil inválido"}), 400

    db_role = valid_roles_map[role]

    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Falha na conexão com o servidor."}), 500

    try:
        with conn.cursor() as cursor:
            # Seleciona explicitamente as colunas com snake_case
            sql = "SELECT id, nome, cpf, matricula, sala_id, role FROM users WHERE role = %s"
            cursor.execute(sql, (db_role,))
            users = cursor.fetchall()
            return jsonify(users)
    finally:
        if conn: conn.close()

@app.route('/api/users/<role>/<user_id>', methods=['PUT'])
def update_user(role, user_id):
    """Atualiza os dados de um usuário específico."""
    data = request.get_json()
    print(f"--- Dados recebidos para atualização ({role}/{user_id}) ---")
    print(data)

    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Falha na conexão com o servidor."}), 500

    try:
        with conn.cursor() as cursor:
            fields = []
            params = []

            if 'nome' in data:
                fields.append("nome = %s")
                params.append(data['nome'])
            if 'mat' in data: # Frontend envia 'mat'
                fields.append("matricula = %s")
                params.append(data['mat'])
            if 'cpf' in data:
                fields.append("cpf = %s")
                params.append(data['cpf'])
            if 'senha' in data and data['senha']:
                senha_hash = bcrypt.hashpw(data['senha'].encode('utf-8'), bcrypt.gensalt())
                fields.append("senha_hash = %s")
                params.append(senha_hash)
            if 'salaId' in data: # Frontend envia 'salaId'
                fields.append("sala_id = %s")
                params.append(data['salaId'])

            if not fields:
                print("Nenhum campo válido encontrado para atualizar.")
                return jsonify({"error": "Nenhum campo para atualizar"}), 400

            params.append(user_id)
            sql = f"UPDATE users SET {', '.join(fields)} WHERE id = %s"

            print(f"--- Executando SQL ({role}/{user_id}) ---")
            print(sql)
            print("Parâmetros:", tuple(params))

            cursor.execute(sql, tuple(params))
            print(f"SQL executado com sucesso para {role}/{user_id}.")

        return jsonify({"message": "Usuário atualizado com sucesso!"}), 200
    except Exception as e:
        print(f"!!! Erro durante a execução do SQL ({role}/{user_id}) !!!")
        print(e)
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Erro ao atualizar no banco de dados"}), 500
    finally:
        if conn: conn.close()

@app.route('/api/users/<role>/<user_id>', methods=['DELETE'])
def delete_user(role, user_id):
    """Exclui um usuário."""
     # Mapeia plural/singular se necessário, ou usa o role como recebido se já for singular
    db_role = role.rstrip('es') if role.endswith('es') else role
    valid_roles = ['aluno', 'professor', 'coordenador']
    if db_role not in valid_roles:
         return jsonify({"error": "Perfil inválido para exclusão"}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Falha na conexão com o servidor."}), 500

    try:
        with conn.cursor() as cursor:
            sql = "DELETE FROM users WHERE id = %s AND role = %s"
            result = cursor.execute(sql, (user_id, db_role)) # Usa db_role (singular)
            if result == 0:
                return jsonify({"error": "Usuário não encontrado"}), 404
        return jsonify({"message": "Usuário excluído com sucesso!"}), 200
    finally:
        if conn: conn.close()

# ===========================
# 🔹 ROTAS DE API - SALAS E MATÉRIAS
# ===========================

@app.route('/api/salas', methods=['GET'])
def list_salas():
    """Lista todas as salas."""
    conn = get_db_connection()
    if not conn: return jsonify([]), 500
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT id, nome, capacidade FROM salas")
            return jsonify(cursor.fetchall())
    finally:
        if conn: conn.close()

@app.route('/api/salas', methods=['POST'])
def create_sala():
    """Cria uma nova sala."""
    data = request.get_json()
    conn = get_db_connection()
    if not conn: return jsonify({"error": "Falha na conexão"}), 500
    try:
        with conn.cursor() as cursor:
            sala_id = str(uuid.uuid4())
            sql = "INSERT INTO salas (id, nome, capacidade) VALUES (%s, %s, %s)"
            cursor.execute(sql, (sala_id, data['nome'], data.get('capacidade', 30))) # Usa get com default
        return jsonify({"message": "Sala criada com sucesso!", "id": sala_id}), 201
    except Exception as e:
        print(f"Erro ao criar sala: {e}")
        return jsonify({"error": "Erro interno ao criar sala"}), 500
    finally:
        if conn: conn.close()

@app.route('/api/salas/<sala_id>', methods=['PUT'])
def update_sala(sala_id):
    """Atualiza os dados de uma sala específica."""
    data = request.get_json()
    if not data or 'nome' not in data or 'capacidade' not in data:
        return jsonify({"error": "Campos nome e capacidade são obrigatórios"}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Falha na conexão com o servidor."}), 500

    try:
        with conn.cursor() as cursor:
            sql = "UPDATE salas SET nome = %s, capacidade = %s WHERE id = %s"
            result = cursor.execute(sql, (data['nome'], data['capacidade'], sala_id))
            if result == 0:
                return jsonify({"error": "Sala não encontrada"}), 404
        return jsonify({"message": "Sala atualizada com sucesso!"}), 200
    except Exception as e:
        print(f"Erro ao atualizar sala: {e}")
        return jsonify({"error": "Erro interno ao atualizar sala"}), 500
    finally:
        if conn: conn.close()

@app.route('/api/salas/<sala_id>', methods=['DELETE'])
def delete_sala(sala_id):
    """Exclui uma sala após desvincular os alunos."""
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Falha na conexão com o servidor."}), 500

    try:
        with conn.cursor() as cursor:
            # 1. Desvincular alunos (importante!)
            sql_update_alunos = "UPDATE users SET sala_id = NULL WHERE sala_id = %s AND role = 'aluno'"
            cursor.execute(sql_update_alunos, (sala_id,))

            # 2. Deletar a sala
            sql_delete_sala = "DELETE FROM salas WHERE id = %s"
            result = cursor.execute(sql_delete_sala, (sala_id,))
            if result == 0:
                return jsonify({"error": "Sala não encontrada"}), 404

        return jsonify({"message": "Sala excluída com sucesso!"}), 200
    except Exception as e:
        print(f"Erro ao excluir sala: {e}")
        return jsonify({"error": "Erro interno ao excluir sala"}), 500
    finally:
        if conn: conn.close()

@app.route('/api/materias', methods=['GET'])
def list_materias():
    """Lista todas as matérias e seus conteúdos E perguntas associadas."""
    conn = get_db_connection()
    if not conn: return jsonify([]), 500
    try:
        materias_dict = {} # Dicionário para facilitar a junção
        with conn.cursor() as cursor:
            # 1. Busca todas as matérias
            sql_materias = "SELECT id, nome, sala_id, owner_id, quiz_facil, quiz_medio, quiz_dificil FROM materias"
            cursor.execute(sql_materias)
            materias = cursor.fetchall()
            # Organiza as matérias num dicionário
            for m in materias:
                m['conteudos'] = [] # Inicializa lista de conteúdos
                m['perguntas'] = [] # Inicializa lista de perguntas <<-- NOVO
                materias_dict[m['id']] = m

            # 2. Busca todos os conteúdos
            sql_conteudos = "SELECT id, materia_id, nome, tipo, url FROM conteudos ORDER BY created_at ASC"
            cursor.execute(sql_conteudos)
            conteudos = cursor.fetchall()
            # Associa conteúdos às matérias
            for c in conteudos:
                materia_id = c.get('materia_id')
                if materia_id in materias_dict:
                    materias_dict[materia_id]['conteudos'].append(c)

            # 3. Busca todas as perguntas <<-- NOVO BLOCO
            sql_perguntas = """
                SELECT id, materia_id, nivel, enunciado, 
                       alt0, alt1, alt2, alt3, alt4, correta 
                FROM perguntas 
                ORDER BY created_at ASC 
            """
            cursor.execute(sql_perguntas)
            perguntas = cursor.fetchall()
            # Associa perguntas às matérias
            for p in perguntas:
                materia_id = p.get('materia_id')
                if materia_id in materias_dict:
                     # Ajusta o formato da pergunta para o esperado pelo aluno.js
                     # (converte alt0-4 para um array 'a')
                     pergunta_formatada = {
                         "id": p['id'],
                         "nivel": p['nivel'],
                         "q": p['enunciado'], # Renomeia 'enunciado' para 'q'
                         "a": [p['alt0'], p['alt1'], p['alt2'], p['alt3'], p['alt4']], # Cria array 'a'
                         "correta": p['correta']
                     }
                     materias_dict[materia_id]['perguntas'].append(pergunta_formatada)
            # --- FIM DO NOVO BLOCO ---

        # Converte o dicionário de volta para uma lista
        lista_materias_final = list(materias_dict.values())
        return jsonify(lista_materias_final)

    except Exception as e:
        print(f"Erro ao listar matérias com conteúdos e perguntas: {e}")
        import traceback
        traceback.print_exc()
        return jsonify([]), 500
    finally:
        if conn: conn.close()
        

@app.route('/api/materias', methods=['POST'])
def create_materia():
    """Cria uma nova matéria com tratamento robusto de quizConfig."""
    print("=" * 60)
    print("--- Iniciando create_materia ---")
    print("=" * 60)

    data = request.get_json()
    print(f"📥 Dados recebidos: {data}")

    # Validação básica
    if not data or not all(k in data for k in ['nome', 'sala_id']):
        print("❌ Erro: Dados incompletos recebidos.")
        return jsonify({"error": "Nome da matéria e sala são obrigatórios"}), 400

    conn = None
    try:
        print("🔌 Tentando obter conexão com DB...")
        conn = get_db_connection()
        if not conn:
            print("❌ Erro: Falha ao conectar ao DB.")
            return jsonify({"error": "Falha na conexão com o servidor."}), 500
        print("✅ Conexão DB obtida.")

        with conn.cursor() as cursor:
            materia_id = str(uuid.uuid4())

            # 🔧 CORREÇÃO CIRÚRGICA: Extração segura de quizConfig
            quiz_config = data.get('quizConfig')
            print(
                f"🎮 quizConfig RAW: {quiz_config} (tipo: {type(quiz_config)})")

            # Proteção dupla: garante que é dict e não None
            if not isinstance(quiz_config, dict) or quiz_config is None:
                print(f"⚠️  quizConfig inválido, usando padrões")
                quiz_config = {}

            # Extração segura dos valores
            quiz_facil = quiz_config.get('facil', 60)
            quiz_medio = quiz_config.get('medio', 30)
            quiz_dificil = quiz_config.get('dificil', 10)

            print(
                f"✅ Quiz extraído: facil={quiz_facil}, medio={quiz_medio}, dificil={quiz_dificil}")

            # SQL com snake_case
            sql = "INSERT INTO materias (id, nome, sala_id, owner_id, quiz_facil, quiz_medio, quiz_dificil) VALUES (%s, %s, %s, %s, %s, %s, %s)"

            # Parâmetros com valores seguros
            params = (
                materia_id,
                data['nome'],
                data['sala_id'],
                data.get('owner_id'),
                quiz_facil,    # ✅ Valor já extraído com segurança
                quiz_medio,    # ✅ Valor já extraído com segurança
                quiz_dificil   # ✅ Valor já extraído com segurança
            )

            print(f"📝 Executando SQL: {sql}")
            print(f"📦 Parâmetros: {params}")

            cursor.execute(sql, params)
            print("✅ SQL executado com sucesso.")

        print("=" * 60)
        print("✅ create_materia CONCLUÍDA COM SUCESSO")
        print("=" * 60)
        return jsonify({"message": "Matéria criada com sucesso!", "id": materia_id}), 201

    except pymysql.IntegrityError as e:
        print("=" * 60)
        print("❌ ERRO DE INTEGRIDADE DB")
        print("=" * 60)
        print(f"Erro: {e}")
        return jsonify({"error": f"Erro de integridade: {str(e)}"}), 409

    except KeyError as e:
        print("=" * 60)
        print("❌ ERRO: CHAVE AUSENTE")
        print("=" * 60)
        print(f"Chave faltando: {e}")
        return jsonify({"error": f"Dado ausente: {e}"}), 400

    except AttributeError as e:
        print("=" * 60)
        print("❌ ERRO: ATRIBUTO INVÁLIDO")
        print("=" * 60)
        print(f"Erro de atributo (provável None.get()): {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Erro ao processar quizConfig"}), 500

    except Exception as e:
        print("=" * 60)
        print("❌ ERRO INESPERADO")
        print("=" * 60)
        print(f"Tipo: {type(e).__name__}")
        print(f"Mensagem: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Erro interno no servidor"}), 500

    finally:
        if conn:
            conn.close()
            print("🔌 Conexão DB fechada.")


# ===========================
# 🔹 ROTAS DE API - LOGS, STATS E OUTROS
# ===========================

@app.route('/api/logs', methods=['GET'])
def list_logs():
    """Retorna os últimos utilizadores que fizeram login (nome e papel)."""
    conn = get_db_connection()
    if not conn: return jsonify([]), 500
    try:
        with conn.cursor() as cursor:
            # Busca apenas nome e papel, ordenado pelo login mais recente
            # DISTINCT pode ser útil se não quiser o mesmo user várias vezes seguidas
            sql = """
                SELECT DISTINCT user_name as user, user_role as role
                FROM access_logs
                ORDER BY login_time DESC
                LIMIT 15 
            """
            # Ou se quiser os últimos 15 logins individuais (pode ter repetidos):
            # sql = """
            #    SELECT user_name as user, user_role as role
            #    FROM access_logs
            #    ORDER BY login_time DESC
            #    LIMIT 15
            # """
            cursor.execute(sql)
            logs = cursor.fetchall()
            # Não precisamos mais de formatar datas
            return jsonify(logs)
    except Exception as e:
        print(f"Erro ao buscar logs simplificados: {e}")
        return jsonify([]), 500
    finally:
        if conn: conn.close()

@app.route('/api/logs', methods=['POST'])
def add_log():
    """Regista um evento de login ou logout.""" # Descrição atualizada
    data = request.get_json()
    if not data or 'type' not in data or 'user' not in data:
        return jsonify({"error": "Dados de log inválidos"}), 400

    user_info = data.get('user')
    log_type = data.get('type') # 'login' ou 'logout'

    if not isinstance(user_info, dict) or 'id' not in user_info:
         return jsonify({"error": "Informação do utilizador inválida no log"}), 400

    conn = get_db_connection()
    if not conn: return jsonify({"error": "Falha na conexão"}), 500

    log_id = str(uuid.uuid4()) # ID para inserção (login)

    try:
        with conn.cursor() as cursor:
            if log_type == 'login':
                sql = """
                    INSERT INTO access_logs (id, user_name, user_role, user_id, login_time)
                    VALUES (%s, %s, %s, %s, NOW())
                """
                cursor.execute(sql, (
                    log_id,
                    user_info.get('nome'),
                    user_info.get('role'),
                    user_info.get('id')
                ))
            # --- REATIVE ESTE BLOCO ---
            elif log_type == 'logout':
                # Encontra o último login aberto para este utilizador e atualiza o logout_time
                sql = """
                    UPDATE access_logs
                    SET logout_time = NOW()
                    WHERE user_id = %s AND logout_time IS NULL
                    ORDER BY login_time DESC
                    LIMIT 1
                """
                cursor.execute(sql, (user_info.get('id'),))
                log_id = "logout_update" # Indica que foi uma atualização
            # --- FIM DO BLOCO REATIVADO ---
            else:
                return jsonify({"error": "Tipo de log inválido"}), 400

        return jsonify({"message": "Log registado", "id": log_id}), 201
    except Exception as e:
        print(f"Erro ao registar log: {e}")
        return jsonify({"error": "Erro interno ao registar log"}), 500
    finally:
        if conn: conn.close()


@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Retorna estatísticas básicas."""
    conn = get_db_connection()
    stats_data = {"respostas": 0, "usuarios": 0, "materias": 0}
    if not conn: return jsonify(stats_data), 500
    try:
        with conn.cursor() as cursor:
            # Busca 'questions_answered'
            sql_q = "SELECT stat_value FROM app_stats WHERE stat_key = 'questions_answered'"
            cursor.execute(sql_q)
            result_q = cursor.fetchone()
            stats_data['respostas'] = result_q['stat_value'] if result_q else 0

            # Busca contagem de utilizadores
            cursor.execute("SELECT COUNT(*) as count FROM users")
            stats_data['usuarios'] = cursor.fetchone()['count']

            # Busca contagem de matérias
            cursor.execute("SELECT COUNT(*) as count FROM materias")
            stats_data['materias'] = cursor.fetchone()['count']

        return jsonify(stats_data)
    except Exception as e:
        print(f"Erro ao buscar stats: {e}")
        return jsonify(stats_data), 500 # Retorna default em caso de erro
    finally:
        if conn: conn.close()

@app.route('/api/stats/increment', methods=['POST'])
def increment_stat():
    """Incrementa um contador de estatística."""
    data = request.get_json()
    stat_key_to_increment = data.get('stat_key')

    if not stat_key_to_increment:
        return jsonify({"error": "stat_key é obrigatório"}), 400

    allowed_keys = ['questions_answered']
    if stat_key_to_increment not in allowed_keys:
        return jsonify({"error": "Chave de estatística inválida"}), 400

    conn = get_db_connection()
    if not conn: return jsonify({"error": "Falha na conexão"}), 500

    try:
        with conn.cursor() as cursor:
            sql = """
                INSERT INTO app_stats (stat_key, stat_value)
                VALUES (%s, 1)
                ON DUPLICATE KEY UPDATE stat_value = stat_value + 1
            """
            cursor.execute(sql, (stat_key_to_increment,))
        return jsonify({"message": f"Estatística '{stat_key_to_increment}' incrementada"}), 200
    except Exception as e:
        print(f"Erro ao incrementar estatística: {e}")
        return jsonify({"error": "Erro interno ao incrementar estatística"}), 500
    finally:
        if conn: conn.close()

@app.route('/api/banners', methods=['GET'])
def list_banners():
    """Lista os últimos banners da base de dados."""
    conn = get_db_connection()
    if not conn: return jsonify([]), 500
    try:
        with conn.cursor() as cursor:
            # Busca os últimos banners (ex: os 10 mais recentes)
            # Seleciona as colunas necessárias para a pré-visualização
            sql = """
                SELECT id, tit, data_evento, hora, local, materias, dicas, img_url 
                FROM banners 
                ORDER BY created_at DESC 
                LIMIT 10 
            """
            cursor.execute(sql)
            banners = cursor.fetchall()
            # Formata datas/horas se necessário para o frontend
            for banner in banners:
                if banner.get('data_evento'):
                    banner['data_evento'] = banner['data_evento'].isoformat()
                if banner.get('hora'):
                    # Converte timedelta (que pymysql pode retornar para TIME) para string
                    if isinstance(banner['hora'], datetime.timedelta):
                       total_seconds = int(banner['hora'].total_seconds())
                       hours, remainder = divmod(total_seconds, 3600)
                       minutes, seconds = divmod(remainder, 60)
                       banner['hora'] = f"{hours:02}:{minutes:02}:{seconds:02}"
                    # Se já for string (menos comum), mantém
                    elif isinstance(banner['hora'], str):
                         pass # Mantém a string como está
                    else: # Outros tipos podem precisar de formatação específica
                         banner['hora'] = str(banner['hora'])

            return jsonify(banners)
    except Exception as e:
        print(f"Erro ao buscar banners: {e}")
        return jsonify([]), 500
    finally:
        if conn: conn.close()

@app.route('/api/banners', methods=['POST'])
def create_banner():
    """Cria um novo banner."""
    # Os dados vêm como FormData, por isso usamos request.form para os campos de texto
    # e request.files para o ficheiro de imagem.
    titulo = request.form.get('tit')
    data_evento = request.form.get('data') # O nome no form é 'data'
    hora = request.form.get('hora')
    local = request.form.get('local')
    materias = request.form.get('mats') # O nome no form é 'mats'
    dicas = request.form.get('dicas')

    # Lógica básica de validação (pode expandir)
    if not titulo:
        return jsonify({"error": "Título é obrigatório"}), 400

    # --- Lógica de Upload de Imagem (Exemplo Simples - precisa de adaptação) ---
    img_file = request.files.get('img') # O nome no form é 'img'
    img_url = None # URL final da imagem (pode ser S3, ou um caminho local)
    if img_file:
        # Aqui entraria a lógica para guardar o ficheiro num local seguro
        # (ex: pasta 'static/uploads' ou bucket S3) e obter a URL
        # Por agora, apenas guardamos o nome do ficheiro (NÃO RECOMENDADO PARA PRODUÇÃO)
        # Certifique-se que a pasta static/uploads existe se usar este exemplo!
        # upload_folder = os.path.join(app.static_folder, 'uploads')
        # os.makedirs(upload_folder, exist_ok=True)
        # filename = str(uuid.uuid4()) + "_" + img_file.filename
        # save_path = os.path.join(upload_folder, filename)
        # img_file.save(save_path)
        # img_url = url_for('static', filename=f'uploads/{filename}') # Gera a URL relativa
        print(f"Recebido ficheiro de imagem: {img_file.filename}") # Log temporário
        img_url = f"placeholder_{img_file.filename}" # Placeholder
    # --- Fim da Lógica de Upload ---

    conn = get_db_connection()
    if not conn: return jsonify({"error": "Falha na conexão"}), 500

    banner_id = str(uuid.uuid4())

    try:
        with conn.cursor() as cursor:
            sql = """
                INSERT INTO banners (id, tit, data_evento, hora, local, materias, dicas, img_url)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """
            # Converte data/hora para formato correto ou NULL se vazio
            data_evento_db = data_evento if data_evento else None
            hora_db = hora if hora else None

            cursor.execute(sql, (
                banner_id, titulo, data_evento_db, hora_db, local, materias, dicas, img_url
            ))
        return jsonify({"message": "Banner criado com sucesso!", "id": banner_id}), 201
    except Exception as e:
        print(f"Erro ao criar banner: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Erro interno ao criar banner"}), 500
    finally:
        if conn: conn.close()

# Rota de exemplo para Ranking (precisa de implementação real)
@app.route('/api/ranking', methods=['GET'])
def list_ranking():
    """Retorna o ranking ordenado da base de dados."""
    conn = get_db_connection()
    if not conn: return jsonify([]), 500
    try:
        with conn.cursor() as cursor:
            # Busca nome e score, ordena pelo score (maior primeiro) e limita (ex: top 50)
            sql = """
                SELECT nome, score 
                FROM ranking 
                ORDER BY score DESC, created_at ASC 
                LIMIT 50 
            """
            cursor.execute(sql)
            ranking = cursor.fetchall()
            return jsonify(ranking)
    except Exception as e:
        print(f"Erro ao buscar ranking: {e}")
        return jsonify([]), 500
    finally:
        if conn: conn.close()

@app.route('/api/ranking', methods=['POST'])
def add_ranking_score():
    """Adiciona uma nova pontuação ao ranking."""
    data = request.get_json()

    # Validação básica
    nome = data.get('nome')
    score = data.get('score')
    if not nome or score is None: # Verifica se score é None (pode ser 0)
        return jsonify({"error": "Nome e score são obrigatórios"}), 400

    try:
        # Garante que score é um inteiro
        score_int = int(score)
    except (ValueError, TypeError):
         return jsonify({"error": "Score deve ser um número inteiro"}), 400

    conn = get_db_connection()
    if not conn: return jsonify({"error": "Falha na conexão"}), 500

    ranking_id = str(uuid.uuid4())

    try:
        with conn.cursor() as cursor:
            # Simplesmente insere a nova pontuação
            # (Pode adicionar lógica para atualizar a maior pontuação de um utilizador se preferir)
            sql = "INSERT INTO ranking (id, nome, score) VALUES (%s, %s, %s)"
            cursor.execute(sql, (ranking_id, nome, score_int))
        return jsonify({"message": "Pontuação adicionada ao ranking", "id": ranking_id}), 201
    except Exception as e:
        print(f"Erro ao adicionar ao ranking: {e}")
        return jsonify({"error": "Erro interno ao adicionar ao ranking"}), 500
    finally:
        if conn: conn.close()

@app.route('/api/ranking/all', methods=['DELETE'])
def reset_ranking():
    """Apaga todos os registos da tabela ranking."""
    conn = get_db_connection()
    if not conn: return jsonify({"error": "Falha na conexão"}), 500

    try:
        with conn.cursor() as cursor:
            # Apaga TUDO da tabela ranking
            sql = "DELETE FROM ranking"
            cursor.execute(sql)
        return jsonify({"message": "Ranking resetado com sucesso!"}), 200
    except Exception as e:
        print(f"Erro ao resetar ranking: {e}")
        return jsonify({"error": "Erro interno ao resetar ranking"}), 500
    finally:
        if conn: conn.close()

@app.route('/api/perguntas', methods=['POST'])
def create_pergunta():
    """Cria uma nova pergunta para uma matéria."""
    data = request.get_json()

    # Validação básica (adapte conforme necessário)
    required_fields = ['materia_id', 'nivel', 'enunciado', 'alt0', 'alt1', 'alt2', 'alt3', 'alt4', 'correta']
    if not data or not all(k in data for k in required_fields):
        return jsonify({"error": "Todos os campos da pergunta são obrigatórios"}), 400

    conn = get_db_connection()
    if not conn: return jsonify({"error": "Falha na conexão"}), 500

    pergunta_id = str(uuid.uuid4())

    try:
        with conn.cursor() as cursor:
            sql = """
                INSERT INTO perguntas (id, materia_id, nivel, enunciado, alt0, alt1, alt2, alt3, alt4, correta)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            cursor.execute(sql, (
                pergunta_id,
                data['materia_id'],
                data['nivel'],
                data['enunciado'],
                data['alt0'],
                data['alt1'],
                data['alt2'],
                data['alt3'],
                data['alt4'],
                data['correta']
            ))
        # Pode ser necessário atualizar a lista de perguntas na matéria em memória ou refazer a busca
        return jsonify({"message": "Pergunta criada com sucesso!", "id": pergunta_id}), 201
    except Exception as e:
        print(f"Erro ao criar pergunta: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Erro interno ao criar pergunta"}), 500
    finally:
        if conn: conn.close()

# ===========================
# 🔹 ROTAS DE API - CONTEÚDOS
# ===========================

@app.route('/api/conteudos', methods=['POST'])
def upload_conteudo():
    """Recebe uploads de ficheiros de conteúdo para uma matéria."""
    print("--- Iniciando upload_conteudo ---") # Log

    # Verifica se a matéria_id foi enviada no formulário
    materia_id = request.form.get('materia_id')
    if not materia_id:
        print("!!! Erro upload_conteudo: materia_id não fornecida.") # Log
        return jsonify({"error": "materia_id é obrigatório"}), 400

    # Verifica se foram enviados ficheiros
    if 'files' not in request.files:
        print("!!! Erro upload_conteudo: Nenhum ficheiro enviado com a chave 'files'.") # Log
        return jsonify({"error": "Nenhum ficheiro enviado"}), 400

    uploaded_files_info = []
    files = request.files.getlist('files') # Recebe a lista de ficheiros
    print(f"Recebidos {len(files)} ficheiros para matéria {materia_id}.") # Log

    conn = None
    try:
        print("Tentando obter conexão com DB...") # Log
        conn = get_db_connection()
        if not conn:
             print("!!! Erro upload_conteudo: Falha ao conectar ao DB.") # Log
             # Ainda assim, tentamos guardar os ficheiros se a conexão falhar? Ou retornamos erro?
             # Por agora, retornamos erro.
             return jsonify({"error": "Falha na conexão com o servidor."}), 500
        print("Conexão DB obtida.") # Log

        with conn.cursor() as cursor:
            for file in files:
                if file and file.filename != '':
                    try:
                        # --- Lógica de Guardar Ficheiro ---
                        upload_folder = os.path.join(app.static_folder, 'uploads', 'conteudos') # Pasta específica
                        os.makedirs(upload_folder, exist_ok=True)

                        filename = secure_filename(file.filename)
                        unique_filename = str(uuid.uuid4()) + "_" + filename
                        save_path = os.path.join(upload_folder, unique_filename)

                        print(f"Guardando ficheiro '{filename}' em '{save_path}'...") # Log
                        file.save(save_path)
                        print("Ficheiro guardado.") # Log

                        # Gera a URL pública relativa
                        file_url = url_for('static', filename=f'uploads/conteudos/{unique_filename}', _external=False)
                        print(f"URL gerada: {file_url}") # Log

                        # Extrai o tipo de ficheiro (MIME type)
                        file_type = file.mimetype
                        print(f"Tipo de ficheiro: {file_type}") # Log

                        # --- Lógica de Inserir no DB ---
                        conteudo_id = str(uuid.uuid4())
                        sql = """
                            INSERT INTO conteudos (id, materia_id, nome, tipo, url)
                            VALUES (%s, %s, %s, %s, %s)
                        """
                        params = (conteudo_id, materia_id, filename, file_type, file_url)
                        print(f"Executando SQL para conteúdo: {sql}") # Log
                        print(f"Parâmetros SQL: {params}") # Log
                        cursor.execute(sql, params)
                        print("Registo de conteúdo inserido no DB.") # Log

                        uploaded_files_info.append({"id": conteudo_id, "nome": filename, "url": file_url})

                    except Exception as e_file:
                        print(f"!!! Erro ao processar o ficheiro '{file.filename}': {e_file}") # Log erro ficheiro
                        # Decide se quer parar ou continuar com os outros ficheiros
                        # return jsonify({"error": f"Erro ao processar ficheiro {file.filename}: {e_file}"}), 500 # Para imediatamente
                        continue # Continua para o próximo ficheiro

        print(f"--- upload_conteudo: {len(uploaded_files_info)} ficheiros processados com sucesso. ---") # Log sucesso
        return jsonify({"message": f"{len(uploaded_files_info)} ficheiro(s) enviado(s) com sucesso!", "files": uploaded_files_info}), 201

    except Exception as e:
         print(f"!!! Erro inesperado em upload_conteudo: {e}") # Log erro geral
         import traceback
         traceback.print_exc()
         return jsonify({"error": "Erro interno no servidor ao fazer upload"}), 500
    finally:
        if conn:
            conn.close()
            print("Conexão DB fechada.") # Log

# ===========================
# 🔹 EXECUÇÃO
# ===========================
if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=True) # debug=True é útil para desenvolvimento