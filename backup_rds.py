import pymysql

conn = pymysql.connect(
    host='bdquiz.csxgw0k06o4g.us-east-1.rds.amazonaws.com',
    user='admin',
    password='Bd2025bd',
    database='bdquiz',
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
            cursor.execute(f"DESCRIBE {table}")
            columns = [col[0] for col in cursor.fetchall()]
            
            for row in rows:
                values = []
                for val in row:
                    if val is None:
                        values.append('NULL')
                    elif isinstance(val, str):
                        val_escaped = val.replace("\\", "\\\\").replace("'", "\\'")
                        values.append(f"'{val_escaped}'")
                    else:
                        values.append(str(val))
                
                f.write(f"INSERT INTO {table} VALUES ({', '.join(values)});\n")

cursor.close()
conn.close()

print("\nBackup completo!")
