const fs = require('fs');
const path = require('path');

const replacements = {
  '"AccountingPeriod"': '"accounting_periods"',
  "'AccountingPeriod'": "'accounting_periods'",
  '"AuditLog"': '"audit_logs"',
  "'AuditLog'": "'audit_logs'",
  '"BlogInteraction"': '"blog_interactions"',
  "'BlogInteraction'": "'blog_interactions'",
  '"BlogPost"': '"blog_posts"',
  "'BlogPost'": "'blog_posts'",
  '"Dispute"': '"disputes"',
  "'Dispute'": "'disputes'",
  '"Invoice"': '"invoices"',
  "'Invoice'": "'invoices'",
  '"LedgerTransaction"': '"ledger_transactions"',
  "'LedgerTransaction'": "'ledger_transactions'",
  '"Listing"': '"listings"',
  "'Listing'": "'listings'",
  '"ProductImage"': '"product_images"',
  "'ProductImage'": "'product_images'",
  '"ProductLifecycle"': '"product_lifecycles"',
  "'ProductLifecycle'": "'product_lifecycles'",
  '"Review"': '"reviews"',
  "'Review'": "'reviews'",
  '"User"': '"profiles"',
  "'User'": "'profiles'",
  '"users"': '"profiles"',
  "'users'": "'profiles'"
};

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else {
      callback(dirPath);
    }
  });
}

const directories = ['app', 'src', 'components', 'lib', 'utils'];

directories.forEach(dir => {
  if (fs.existsSync(dir)) {
    walkDir(dir, (filePath) => {
      if (filePath.endsWith('.ts') || filePath.endsWith('.tsx') || filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
        let content = fs.readFileSync(filePath, 'utf8');
        let modified = false;
        
        for (const [oldStr, newStr] of Object.entries(replacements)) {
          // Replace `from("OldName")` -> `from("new_name")`
          const searchStr1 = `from(${oldStr})`;
          const replaceStr1 = `from(${newStr})`;
          if (content.includes(searchStr1)) {
            content = content.split(searchStr1).join(replaceStr1);
            modified = true;
          }
          
          // Just in case it's `.from(  "OldName"  )` we can do regex, but let's just do exact string replacement for now.
        }
        
        if (modified) {
          console.log(`Updated: ${filePath}`);
          fs.writeFileSync(filePath, content, 'utf8');
        }
      }
    });
  }
});
