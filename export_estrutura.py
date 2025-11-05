import sys
sys.path.insert(0, '/home/ec2-user/ESCOLA')
from app import get_db_connection

conn = get_db_connection()
cursor = conn.cursor()

with open('/tmp/estrutura_bdquiz.sql', 'w', encoding='utf-8') as f:
    cursor.execute("SHOW TABLES")
    tables = [list(row.values())[0] for row in cursor.fetchall()]
    
    print(f"Exportando estrutura de {len(tables)} tabelas...")
    
    for table in tables:
        print(f"  - {table}")
        cursor.execute(f"SHOW CREATE TABLE {table}")
        result = cursor.fetchone()
        create_table = list(result.values())[1]
        f.write(f"\nDROP TABLE IF EXISTS {table};\n")
        f.write(create_table + ";\n\n")

cursor.close()
conn.close()
print("\n✅ Estrutura salva em /tmp/estrutura_bdquiz.sql")
