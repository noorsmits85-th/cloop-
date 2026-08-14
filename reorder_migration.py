import re

with open('prisma/migrations/20260814094500_normalize_naming/migration.sql', 'r', encoding='utf-8') as f:
    sql = f.read()

# The script has sections like:
# -- DropForeignKey
# -- DropTable
# -- CreateTable
# -- CreateIndex
# -- AddForeignKey

# We want the order to be:
# 1. DropForeignKey
# 2. CreateTable
# 3. CreateIndex
# 4. Copy Data
# 5. DropTable
# 6. AddForeignKey

def extract_sections(sql):
    blocks = re.split(r'\n(?=-- (?:DropForeignKey|DropTable|DropIndex|CreateTable|CreateIndex|AddForeignKey|AlterTable))', sql)
    return blocks

blocks = extract_sections(sql)

drop_fk = []
drop_table = []
drop_index = []
create_table = []
create_index = []
add_fk = []
alter_table = []

for b in blocks:
    if b.startswith('-- DropForeignKey'): drop_fk.append(b)
    elif b.startswith('-- DropTable'): drop_table.append(b)
    elif b.startswith('-- DropIndex'): drop_index.append(b)
    elif b.startswith('-- CreateTable'): create_table.append(b)
    elif b.startswith('-- CreateIndex'): create_index.append(b)
    elif b.startswith('-- AddForeignKey'): add_fk.append(b)
    elif b.startswith('-- AlterTable'): alter_table.append(b)
    else: pass # could be warnings at top

# Let's map old tables to new tables for data copying
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
    copy_data.append(f'INSERT INTO "{new}" SELECT * FROM "{old}";')

# Combine them in safe order
new_sql = "\n\n".join(drop_fk + drop_index + create_table + create_index + alter_table + copy_data + drop_table + add_fk)

with open('prisma/migrations/20260814094500_normalize_naming/migration.sql', 'w', encoding='utf-8') as f:
    f.write(new_sql)
