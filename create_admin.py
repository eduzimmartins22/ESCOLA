import pymysql
import uuid
import bcrypt
import os
from dotenv import load_dotenv

load_dotenv()

# --- CONFIGURAÇÃO DO SEU PRIMEIRO ADMIN ---
NOME = "Administrador Principal"
CPF = "00000000000"  # Use um CPF válido (11 dígitos)
SENHA = "fn@2025"
MATRICULA = "ADMIN01"
# ------------------------------------------

def create_first_admin():
    print("--- Criando Primeiro Coordenador ---")
    
    conn = pymysql.connect(
        host=os.getenv('DB_HOST'),
        user=os.getenv('DB_USER'),
        password=os.getenv('DB_PASSWORD'),
        database=os.getenv('DB_NAME'),
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=True
    )

    try:
        with conn.cursor() as cursor:
            # Verifica se já existe
            cursor.execute("SELECT id FROM users WHERE cpf = %s", (CPF,))
            if cursor.fetchone():
                print(f"❌ Erro: CPF {CPF} já está cadastrado!")
                return

            # Cria o Hash da senha
            senha_hash = bcrypt.hashpw(SENHA.encode('utf-8'), bcrypt.gensalt())
            user_id = str(uuid.uuid4())

            # Insere o Super-Coordenador
            sql = """
                INSERT INTO users (id, role, nome, cpf, matricula, senha_hash, is_assistente)
                VALUES (%s, 'coordenador', %s, %s, %s, %s, 0)
            """
            cursor.execute(sql, (user_id, NOME, CPF, MATRICULA, senha_hash))
            
            print(f"✅ Sucesso! Coordenador '{NOME}' criado.")
            print(f"ID: {user_id}")
            print("Agora você pode fazer login e apagar o formulário de registro público.")

    except Exception as e:
        print(f"❌ Erro: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    create_first_admin()
