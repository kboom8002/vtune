const fs = require('fs');
const path = require('path');

const seedFile = 'c:/Users/User/vtune/TONE_CARD_SEED_DATA.json';
const targetFile = 'c:/Users/User/vtune/supabase/seed.sql';

const unescapedRaw = fs.readFileSync(seedFile, 'utf8');

try {
  const data = JSON.parse(unescapedRaw);
  
  // The structure seems to be: data[0].cards is an array 
  // Let's verify by printing
  const payload = Array.isArray(data) ? data[0] : data;
  const cards = payload.cards || [];
  
  let sql = '-- Auto-generated seed file for tone_term\n\n';
  
  if (cards.length === 0) {
      console.error('No cards found in seed data.');
      process.exit(1);
  }

  for (const card of cards) {
      const term_key = card.card_id;
      const display_name = card.display_name;
      // "definition" isn't explicitly in the card from what we've seen, let's just use genre_words or similar if it's missing
      const definition = card.definition || card.genre_words?.join(', ') || '';
      const qpe_mu = JSON.stringify(card.qpe_mu);
      const qpe_sigma = JSON.stringify(card.qpe_sigma);
      const anchors_good = JSON.stringify(card.guards?.must || []);
      const anchors_bad  = JSON.stringify(card.guards?.avoid || []);
      
      const esc = (str) => typeof str === 'string' ? `'${str.replace(/'/g, "''")}'` : 'NULL';
      
      sql += `INSERT INTO tone_term (term_key, display_name, definition, qpe_mu, qpe_sigma, anchors_good, anchors_bad) VALUES (${esc(term_key)}, ${esc(display_name)}, ${esc(definition)}, ${esc(qpe_mu)}::jsonb, ${esc(qpe_sigma)}::jsonb, ${esc(anchors_good)}::jsonb, ${esc(anchors_bad)}::jsonb) ON CONFLICT (term_key) DO NOTHING;\n`;
  }
  
  fs.writeFileSync(targetFile, sql);
  console.log(`Seed script written successfully to ${targetFile} (${cards.length} cards)`);
} catch(e) {
  console.error("Error parsing seed data:", e);
  process.exit(1);
}
