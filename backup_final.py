import pymysql
from dotenv import load_dotenv
import os

load_dotenv()

conn = pymysql.connect(
    host=os.getenv('DB_HOST'),
    user=os.getenv('DB_USER'),
    password=os.getenv('DB_PASSWORD'),
    database=os.getenv('DB_NAME'),
    charset='utf8mb4'
)

cursor = conn.cursor()

with open('/tmp/backup_bdquiz.sql', 'w', encoding='utf-8') as f:
    cursor.execute("SHOW TABLES")
    tables = [table[0] for table in cursor.fetchall()]
    
    print(f"Exportando {len(tables)} tabelas...")
    
    for table in tables:
        print(f"  - {table}")
        cursor.execute(f"SHOW CREATE TABLE {table}")
        create_table = cursor.fetchone()[1]
        f.write(f"\nDROP TABLE IF EXISTS {table};\n")
        f.write(create_table + ";\n\n")
        
        cursor.execute(f"SELECT * FROM {table}")
        rows = cursor.fetchall()
        
        if rows:
            for row in rows:
                values = []
                for val in row:
                    if val is None:
                        values.append('NULL')
                    elif isinstance(val, str):
                        clean_val = repr(val)
                        values.append(clean_val)
                    else:
                        values.append(repr(val))
                
                f.write(f"INSERT INTO {table} VALUES ({', '.join(values)});\n")

cursor.close()
conn.close()

print("\nBackup salvo em /tmp/backup_bdquiz.sql")
