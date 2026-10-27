// DEVELOPMENT ONLY: fills the database with demo data.  Run: npm run seed
// Demo login: demo@parampara.com / password123
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../src/models/User');
const Family = require('../src/models/Family');
const FamilyMember = require('../src/models/FamilyMember');
const Relationship = require('../src/models/Relationship');
const Memory = require('../src/models/Memory');

(async () => {
  if (process.env.NODE_ENV === 'production') throw new Error('Do not seed production');
  await mongoose.connect(process.env.MONGO_URI);

  // remove the previous demo data so the script can be re-run
  const old = await User.findOne({ email: 'demo@parampara.com' });
  if (old) {
    const fams = await Family.find({ owner: old._id });
    for (const f of fams) {
      await Memory.deleteMany({ family: f._id });
      await Relationship.deleteMany({ family: f._id });
      await FamilyMember.deleteMany({ family: f._id });
      await f.deleteOne();
    }
    await old.deleteOne();
  }

  const user = await User.create({ name: 'Demo User', email: 'demo@parampara.com', password: await bcrypt.hash('password123', 10) });
  const family = await Family.create({ name: 'The Thakur Family', description: 'Roots in the hills of Himachal', owner: user._id });
  const mk = (name, birthDate, bio) => FamilyMember.create({ family: family._id, name, birthDate, bio });

  const dadi = await mk('Kamla Devi', '1948-03-12', 'Grandmother. Makes the best siddu in the village.');
  const papa = await mk('Rajesh Thakur', '1974-08-02', 'Father. Worked in the electricity board.');
  const mummy = await mk('Sunita Thakur', '1977-01-20', 'Mother. Keeps all the family recipes.');
  const me = await mk('Demo Kid', '2003-06-15', 'Engineering student.');

  const rel = (source, target, type) => Relationship.create({ family: family._id, source: source._id, target: target._id, type });
  await rel(dadi, papa, 'parent');
  await rel(papa, me, 'parent');
  await rel(mummy, me, 'parent');
  await rel(papa, mummy, 'spouse');

  const mem = (title, content, category, eventDate, location, people) =>
    Memory.create({ family: family._id, author: user._id, title, content, category, eventDate, location, people: people.map((p) => p._id) });

  await mem('Dadi\'s siddu recipe', 'Knead the dough with yeast and let it rest overnight. Fill with poppy seeds and walnuts, steam, and serve with ghee.', 'Recipe', '2015-12-01', 'Dharamshala', [dadi]);
  await mem('The winter we got snowed in', 'The road was closed for four days. We played carrom by candlelight and Dadi told stories from her childhood.', 'Story', '2012-01-15', 'Dharamshala', [dadi, papa, me]);
  await mem('First day of engineering', 'Papa dropped me at the bus stand and pretended he was not emotional.', 'Achievement', '2021-09-01', 'Chandigarh', [papa, me]);

  console.log('Seeded. Login with demo@parampara.com / password123');
  await mongoose.disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });
