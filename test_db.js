const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: persons, error } = await supabase.from('persons').select('*');
  if (error) {
    console.error(error);
    return;
  }
  console.log('Total persons:', persons.length);
  // check for suspicious records: no name, name containing test, or is_deleted if such column exists
  const suspicious = persons.filter(p => !p.full_name || p.full_name.toLowerCase().includes('test') || p.full_name.includes('admin') || p.is_deleted);
  console.log('Suspicious persons:', suspicious);
  
  // Also calculate total without sonsInLaw descendants just like the stats page:
  const { data: relationships } = await supabase.from('relationships').select('*');
  
  const excluded = new Set();
  const sonsInLaw = persons.filter(p => p.gender === 'male' && p.is_in_law);
  sonsInLaw.forEach(p => excluded.add(p.id));

  const spouseMap = new Map();
  relationships.forEach(r => {
    if (r.type === 'marriage') {
      if (!spouseMap.has(r.person_a)) spouseMap.set(r.person_a, []);
      if (!spouseMap.has(r.person_b)) spouseMap.set(r.person_b, []);
      spouseMap.get(r.person_a).push(r.person_b);
      spouseMap.get(r.person_b).push(r.person_a);
    }
  });

  const childrenByParent = new Map();
  relationships.forEach(r => {
    if (r.type === 'biological_child' || r.type === 'adopted_child') {
      if (!childrenByParent.has(r.person_a)) childrenByParent.set(r.person_a, []);
      childrenByParent.get(r.person_a).push(r.person_b);
    }
  });

  const addDescendants = (parentId) => {
    const children = childrenByParent.get(parentId) || [];
    children.forEach(childId => {
      if (!excluded.has(childId)) {
        excluded.add(childId);
        addDescendants(childId);
      }
    });
  };

  sonsInLaw.forEach(sonInLaw => {
    addDescendants(sonInLaw.id);
    const spouses = spouseMap.get(sonInLaw.id) || [];
    spouses.forEach(spouseId => addDescendants(spouseId));
  });

  sonsInLaw.forEach(p => excluded.delete(p.id));

  const filteredPersons = persons.filter(p => !excluded.has(p.id));
  console.log('Total persons after excluding descendants of sons in law:', filteredPersons.length);
  
  // Look for duplicate names
  const names = {};
  const duplicates = [];
  filteredPersons.forEach(p => {
    if(names[p.full_name]) {
      duplicates.push(p);
    } else {
      names[p.full_name] = p;
    }
  });
  console.log('Duplicates in filtered:', duplicates.map(d => d.full_name));
}
run();
