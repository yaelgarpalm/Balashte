const mysql = require('mysql2/promise');

async function dumpSchema() {
    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'rootbd1',
            database: 'orchid_pos'
        });

        const [tables] = await connection.query('SHOW TABLES');
        
        let schemaDoc = '# Estructura de la Base de Datos `orchid_pos`\n\n';

        for (const row of tables) {
            const tableName = Object.values(row)[0];
            const [columns] = await connection.query(`DESCRIBE \`${tableName}\``);
            
            schemaDoc += `## Tabla: \`${tableName}\`\n`;
            schemaDoc += '| Campo | Tipo | Nulo | Llave | Por defecto | Extra |\n';
            schemaDoc += '|---|---|---|---|---|---|\n';
            
            for (const col of columns) {
                schemaDoc += `| ${col.Field} | ${col.Type} | ${col.Null} | ${col.Key} | ${col.Default || 'NULL'} | ${col.Extra} |\n`;
            }
            schemaDoc += '\n';
        }

        const [views] = await connection.query("SHOW FULL TABLES WHERE TABLE_TYPE LIKE 'VIEW'");
        if (views.length > 0) {
            schemaDoc += '# Vistas\n\n';
            for (const row of views) {
                const viewName = Object.values(row)[0];
                const [createView] = await connection.query(`SHOW CREATE VIEW \`${viewName}\``);
                schemaDoc += `## Vista: \`${viewName}\`\n`;
                schemaDoc += '```sql\n' + createView[0]['Create View'] + '\n```\n\n';
            }
        }

        console.log(schemaDoc);
        await connection.end();
    } catch (error) {
        console.error('Error:', error);
    }
}

dumpSchema();
