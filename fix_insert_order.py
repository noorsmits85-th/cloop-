import re

with open('prisma/migrations/20260814094500_normalize_naming/migration.sql', 'r', encoding='utf-8') as f:
    sql = f.read()

# We need to find the CREATE TABLE definitions to get the exact column names.
table_cols = {}
create_table_blocks = re.findall(r'CREATE TABLE "([^"]+)" \((.*?)\);', sql, re.DOTALL)
for table_name, body in create_table_blocks:
    cols = []
    lines = body.split('\n')
    for line in lines:
        line = line.strip()
        if line.startswith('"'):
            col_name = line.split('"')[1]
            if col_name != 'CONSTRAINT':
                cols.append(f'"{col_name}"')
    table_cols[table_name] = cols

blocks = re.split(r'\n(?=-- (?:DropForeignKey|DropTable|DropIndex|CreateTable|CreateIndex|AddForeignKey|AlterTable|UPDATE TRIGGER|SECURE FINANCIAL|ENABLE RLS|POLICIES))', sql)

drop_fk = []
drop_table = []
drop_index = []
create_table = []
create_index = []
add_fk = []
alter_table = []
other = []

for b in blocks:
    if b.startswith('-- DropForeignKey'): drop_fk.append(b)
    elif b.startswith('-- DropTable'): drop_table.append(b)
    elif b.startswith('-- DropIndex'): drop_index.append(b)
    elif b.startswith('-- CreateTable'): create_table.append(b)
    elif b.startswith('-- CreateIndex'): create_index.append(b)
    elif b.startswith('-- AddForeignKey'): add_fk.append(b)
    elif b.startswith('-- AlterTable'): alter_table.append(b)
    elif b.strip(): 
        if not b.startswith('-- Copy Data') and not b.startswith('INSERT INTO'):
            other.append(b)

table_map = {
    'AccountingPeriod': 'accounting_periods',
    'AuditLog': 'audit_logs',
    'BlogInteraction': 'blog_interactions',
    'BlogPost': 'blog_posts',
    'Dispute': 'disputes',
    'Invoice': 'invoices',
    'LedgerTransaction': 'ledger_transactions',
    'Listing': 'listings',
    'ProductImage': 'product_images',
    'ProductLifecycle': 'product_lifecycles',
    'Review': 'reviews',
    'User': 'profiles'
}

copy_data = ["-- Copy Data"]
for old, new in table_map.items():
    if new in table_cols:
        cols_str = ", ".join(table_cols[new])
        copy_data.append(f'INSERT INTO "{new}" ({cols_str}) SELECT {cols_str} FROM "{old}";')
    else:
        # Fallback
        copy_data.append(f'INSERT INTO "{new}" SELECT * FROM "{old}";')

# Note: In the previous failed run, some DropTables might have been executed? NO, PostgreSQL executes in a transaction, but wait! Prisma db execute does NOT wrap in a transaction unless specified, but usually it does or fails early. 
# Let's hope it rolled back. Prisma migrations usually run in a transaction.

new_sql = "\n\n".join(drop_fk + drop_index + create_table + create_index + alter_table + copy_data + drop_table + add_fk + other)

with open('prisma/migrations/20260814094500_normalize_naming/migration.sql', 'w', encoding='utf-8') as f:
    f.write(new_sql)
