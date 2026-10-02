import fs from 'fs';
import path from 'path';

// List of exclusions: names, countries, abbreviations, tech brands, etc.
const EXCLUDE_SET = new Set([
  // Web/Tech abbrevs & brands
  'html', 'http', 'https', 'css', 'pdf', 'jpg', 'png', 'gif', 'url', 'uri', 'faq', 'rss', 'xml', 'php', 'asp', 'aspx', 'jsp',
  'sql', 'sdk', 'api', 'seo', 'dns', 'vpn', 'cpu', 'ram', 'usb', 'lan', 'wan', 'atm', 'fps', 'rgb', 'cmyk', 'dpi', 'svg',
  'google', 'yahoo', 'microsoft', 'intel', 'cisco', 'adobe', 'linux', 'ubuntu', 'debian', 'redhat', 'fedora', 'suse',
  'dell', 'ibm', 'sony', 'panasonic', 'nokia', 'samsung', 'apple', 'macintosh', 'toshiba', 'lenovo', 'asus', 'acer', 'hp',
  'ebay', 'paypal', 'facebook', 'twitter', 'myspace', 'youtube', 'wikipedia', 'flickr', 'craigslist', 'amazon', 'hulu',
  'netflix', 'linkedin', 'reddit', 'tumblr', 'skype', 'android', 'oracle', 'symantec', 'mcafee', 'mozilla', 'firefox',
  'bluetooth', 'wifi', 'ipod', 'ipad', 'iphone', 'xbox', 'playstation', 'nintendo', 'sega',
  
  // File extensions & domains
  'com', 'net', 'org', 'gov', 'edu', 'mil', 'biz', 'info', 'mobi', 'name', 'pro', 'aero', 'coop', 'museum', 'int',
  'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'tsv', 'rtf', 'odt', 'ods', 'odp', 'zip', 'rar', 'tar', 'gz',
  'exe', 'dll', 'bin', 'iso', 'dmg', 'apk', 'src', 'inc', 'ltd', 'corp', 'llc', 'gmbh', 'plc',
  
  // Days / Months / Abbreviations
  'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun',
  'jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
  'january', 'february', 'march', 'april', 'june', 'july', 'august', 'september', 'october', 'november', 'december',
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
  'etc', 'vs', 'via', 'dept', 'est', 'approx', 'misc', 'mgr', 'std', 'avg', 'min', 'max', 'cfg', 'dir', 'sys',

  // Extra Countries / Cities / Institutions / Proper Nouns
  'greece', 'greek', 'irish', 'ireland', 'scottish', 'scotland', 'welsh', 'wales', 'dutch', 'holland', 'sweden',
  'swedish', 'norway', 'norwegian', 'denmark', 'danish', 'finland', 'finnish', 'poland', 'polish', 'austria',
  'austrian', 'belgium', 'belgian', 'swiss', 'switzerland', 'portugal', 'portuguese', 'turkey', 'turkish',
  'egypt', 'egyptian', 'israel', 'israeli', 'iran', 'iranian', 'iraq', 'iraqi', 'korea', 'korean', 'vietnam',
  'vietnamese', 'thailand', 'thai', 'taiwan', 'taiwanese', 'singapore', 'malaysia', 'indonesia', 'philippines',
  'filipino', 'nz', 'zealand', 'smithsonian', 'pentagon', 'hollywood', 'broadway', 'harvard', 'stanford', 'oxford',
  'cambridge', 'mit', 'nasa', 'fbi', 'cia', 'unicef', 'unesco', 'nato', 'un',
  'marijuana', 'cannabis', 'cocaine', 'heroin', 'nazi', 'hitler', 'isis',
  
  // Proper names (people)
  'john', 'mary', 'david', 'sarah', 'james', 'robert', 'michael', 'william', 'richard', 'joseph', 'thomas', 'charles',
  'christopher', 'daniel', 'matthew', 'anthony', 'donald', 'mark', 'paul', 'steven', 'andrew', 'kenneth', 'joshua',
  'kevin', 'brian', 'george', 'edward', 'ronald', 'timothy', 'jason', 'jeffrey', 'ryan', 'jacob', 'gary', 'nicholas',
  'eric', 'stephen', 'jonathan', 'larry', 'justin', 'scott', 'brandon', 'benjamin', 'samuel', 'gregory', 'alexander',
  'patrick', 'frank', 'raymond', 'jack', 'dennis', 'jerry', 'tyler', 'aaron', 'jose', 'adam', 'nathan', 'henry',
  'douglas', 'zachary', 'peter', 'kyle', 'walter', 'ethan', 'jeremy', 'harold', 'keith', 'christian', 'roger', 'noah',
  'gerald', 'carl', 'terry', 'sean', 'austin', 'arthur', 'lawrence', 'jesse', 'dylan', 'bryan', 'joe', 'jordan',
  'billy', 'bruce', 'albert', 'willie', 'gabriel', 'logan', 'alan', 'juan', 'wayne', 'roy', 'ralph', 'randy',
  'eugene', 'vincent', 'russell', 'louis', 'philip', 'bobby', 'johnny', 'bradley', 'emma', 'olivia', 'sophia', 'isabella',
  'ava', 'mia', 'emily', 'abigail', 'madison', 'elizabeth', 'charlotte', 'avery', 'sofia', 'chloe', 'ella', 'harper',
  'amelia', 'aubrey', 'addison', 'evelyn', 'natalie', 'grace', 'hannah', 'zoey', 'victoria', 'lillian', 'lily', 'brooklyn',
  'samantha', 'layla', 'zoe', 'audrey', 'allison', 'anna', 'savannah', 'camila', 'penelope', 'gabriella', 'claire',
  'hailey', 'eva', 'kaylee', 'kylie', 'riley', 'jessica', 'ashley', 'amanda', 'melissa', 'deborah', 'stephanie',
  'rebecca', 'sharon', 'laura', 'cynthia', 'kathleen', 'amy', 'shirley', 'angela', 'helen', 'brenda', 'pamela', 'nicole',
  'katherine', 'samantha', 'christine', 'debra', 'rachel', 'carolyn', 'janet', 'maria', 'heather', 'diane', 'julie',
  'joyce', 'victoria', 'kelly', 'christina', 'lauren', 'joan', 'evelyn', 'judith', 'megan', 'cheryl', 'andrea', 'hannah',
  'martha', 'jacqueline', 'frances', 'gloria', 'ann', 'teresa', 'kathryn', 'sara', 'janice', 'jean', 'alice', 'madison',
  'doris', 'abigail', 'julia', 'judy', 'grace', 'denise', 'amber', 'marilyn', 'beverly', 'danielle', 'theresa', 'diana',
  'brittany', 'natalie', 'sophia', 'rose', 'isabella', 'alexis', 'kayla', 'charlotte',
  
  // Countries / Major Cities / Regions
  'america', 'england', 'britain', 'london', 'paris', 'france', 'germany', 'berlin', 'canada', 'ottawa', 'toronto',
  'australia', 'sydney', 'melbourne', 'japan', 'tokyo', 'china', 'beijing', 'shanghai', 'india', 'delhi', 'mumbai',
  'mexico', 'brazil', 'russia', 'moscow', 'spain', 'madrid', 'italy', 'rome', 'california', 'texas', 'florida',
  'chicago', 'boston', 'seattle', 'atlanta', 'dallas', 'houston', 'miami', 'denver', 'detroit', 'philadelphia',
  'phoenix', 'sandiego', 'austin', 'columbus', 'charlotte', 'memphis', 'baltimore', 'milwaukee', 'albuquerque',
  'tucson', 'fresno', 'sacramento', 'kansas', 'mesa', 'omaha', 'cleveland', 'tulsa', 'oakland', 'minneapolis',
  'wichita', 'arlington', 'bakersfield', 'tampa', 'honolulu', 'anaheim', 'aurora', 'santaana', 'riverside', 'corpus',
  'lexington', 'stockton', 'henderson', 'saintpaul', 'cincinnati', 'greensboro', 'pittsburgh',
  'lincoln', 'orlando', 'irvine', 'newark', 'toledo', 'durham', 'chula', 'fortwayne', 'jersey', 'stpetersburg',
  'laredo', 'madison', 'chandler', 'buffalo', 'lubbock', 'scottsdale', 'reno', 'glendale', 'gilbert', 'winston',
  'northlasvegas', 'norfolk', 'chesapeake', 'garland', 'irving', 'hialeah', 'fremont', 'boise', 'richmond',
  'batonrouge', 'spokane', 'desmoines', 'tacoma', 'sanbernardino', 'modesto', 'fontana', 'santaclarita', 'birmingham',
  'fayetteville', 'rochester', 'oxnard', 'morenovalley', 'huntington', 'saltlake', 'amarillo', 'yonkers', 'montgomery',
  'akron', 'littlerock', 'huntsville', 'augusta', 'portland', 'grandrapids', 'tallahassee', 'overland', 'knoxville',
  'worcester', 'brownsville', 'vancouver', 'montreal', 'calgary', 'edmonton', 'quebec', 'winnipeg', 'hamilton',
  'europe', 'asia', 'africa', 'antarctica', 'arctic', 'pacific', 'atlantic', 'mediterranean', 'caribbean',
  'alaska', 'hawaii', 'arizona', 'colorado', 'connecticut', 'delaware', 'georgia', 'idaho', 'illinois', 'indiana',
  'iowa', 'kansas', 'kentucky', 'louisiana', 'maine', 'maryland', 'massachusetts', 'michigan', 'minnesota',
  'mississippi', 'missouri', 'montana', 'nebraska', 'nevada', 'hampshire', 'jersey', 'mexico', 'york', 'carolina',
  'dakota', 'ohio', 'oklahoma', 'oregon', 'pennsylvania', 'rhode', 'carolina', 'dakota', 'tennessee', 'texas',
  'utah', 'vermont', 'virginia', 'washington', 'wisconsin', 'wyoming',
  
  // Short grammar stop words to avoid
  'the', 'and', 'for', 'are', 'was', 'you', 'not', 'that', 'this', 'with', 'from', 'your', 'have', 'more',
  'will', 'can', 'all', 'has', 'one', 'our', 'out', 'what', 'which', 'their', 'time', 'been', 'had', 'who',
  'them', 'some', 'these', 'would', 'into', 'her', 'two', 'him', 'see', 'his', 'how', 'its',
  'any', 'were', 'also', 'did', 'off', 'too', 'why', 'let', 'she', 'may', 'put', 'say', 'got', 'nor', 'yet',
  'per', 'via', 'etc',
]);

async function build() {
  console.log('Fetching Google 10k English word list...');
  const res = await fetch('https://raw.githubusercontent.com/first20hours/google-10000-english/master/google-10000-english-usa-no-swears.txt');
  const text = await res.text();
  const lines = text.split('\n');

  const wordSet = new Set();

  for (const line of lines) {
    const w = line.trim().toLowerCase();
    if (w.length >= 3 && w.length <= 12 && /^[a-z]+$/.test(w)) {
      if (!EXCLUDE_SET.has(w)) {
        wordSet.add(w);
      }
    }
  }

  // Extra high quality real-English words for balance and rare letters
  const extraWords = [
    // Dynamic game & action words
    'volt', 'dash', 'hero', 'echo', 'leap', 'warp', 'bolt', 'rush',
    'drop', 'wind', 'flip', 'zeal', 'apex', 'neon', 'sync', 'flow',
    'zoom', 'grip', 'fury', 'hawk', 'byte', 'jump', 'dive',
    'spider', 'venom', 'glide', 'raptor', 'falcon', 'bounce', 'zipline',
    'cyber', 'sonic', 'titan', 'ninja', 'climb', 'orbit', 'magnet',
    'matrix', 'pulse', 'shadow', 'cosmic', 'strike', 'vector', 'signal',
    'flight', 'launch', 'radar', 'blast', 'turbo', 'sprint', 'avatar',
    'thunder', 'kinetic', 'phantom', 'velocity', 'momentum', 'horizon',
    'gravity', 'overdrive', 'blaster', 'spectre', 'turbine', 'valiant',
    'catalyst', 'infinity', 'resonance', 'supernova', 'nightfall', 'accelerate',
    'camera', 'forest', 'bridge', 'rocket', 'planet', 'window', 'engine', 'castle',
    'beacon', 'crystal', 'quantum', 'cipher', 'dynamo', 'vortex', 'prism', 'glider',
    'zenith', 'arcade', 'breeze', 'canyon', 'daring', 'ember', 'frost', 'galaxy',
    'harbor', 'impact', 'jungle', 'knight', 'legend', 'meteor', 'nebula', 'ocean',
    'portal', 'quasar', 'radiant', 'safari', 'tempo', 'unreal', 'valley', 'wizard',
    'blaze', 'crane', 'drift', 'eagle', 'flare', 'grove', 'haven', 'ignite',
    'jolt', 'karma', 'laser', 'mystic', 'nexus', 'oasis', 'quiver', 'rebel',
    'spark', 'trace', 'uplink', 'vigor', 'wraith', 'yield',

    // Q words
    'quarry', 'quartz', 'quasar', 'queen', 'quest', 'quick', 'quid', 'quiet', 'quilt',
    'quirk', 'quota', 'quote', 'quake', 'qualm', 'quark', 'quart', 'query', 'queue',
    'quench', 'quiver', 'quaint', 'quantum', 'quarter', 'quality', 'qualify', 'question',

    // X words
    'xenon', 'xerox', 'xylem', 'xenial', 'xylophone',

    // Z words
    'zeal', 'zebra', 'zenith', 'zero', 'zest', 'zigzag', 'zinc', 'zone', 'zoom',
    'zipper', 'zodiac', 'zombie', 'zealous', 'zippy', 'zesty',

    // J words
    'jade', 'jail', 'jazz', 'jeep', 'jelly', 'jest', 'jets', 'jewel', 'jigsaw',
    'jingle', 'jockey', 'join', 'joint', 'joke', 'jolt', 'journal', 'journey',
    'judge', 'juice', 'juicy', 'jumbo', 'jump', 'jumper', 'jungle', 'junior',
    'juror', 'jury', 'justice', 'justify',

    // V words
    'vapor', 'vault', 'vector', 'vegan', 'veil', 'vein', 'velvet', 'vendor',
    'venom', 'venture', 'venue', 'verb', 'verge', 'verify', 'verse', 'version',
    'vessel', 'veteran', 'viable', 'vibrant', 'victim', 'victor', 'victory',
    'video', 'view', 'vigor', 'villa', 'village', 'vintage', 'vinyl', 'viola',
    'violet', 'violin', 'viper', 'viral', 'virtual', 'virtue', 'virus', 'visa',
    'vision', 'visit', 'visitor', 'visual', 'vital', 'vivid', 'vocal', 'voice',
    'void', 'volcano', 'volume', 'vortex', 'voter', 'voyage', 'vulture'
  ];

  for (const w of extraWords) {
    const cleaned = w.trim().toLowerCase();
    if (cleaned.length >= 3 && cleaned.length <= 12 && /^[a-z]+$/.test(cleaned)) {
      if (!EXCLUDE_SET.has(cleaned)) {
        wordSet.add(cleaned);
      }
    }
  }

  const sortedWords = Array.from(wordSet).sort();
  console.log(`Curated clean real-English word bank size: ${sortedWords.length} words.`);

  // Write JSON
  const publicDir = path.resolve('public/data');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  fs.writeFileSync(path.join(publicDir, 'word-bank.json'), JSON.stringify(sortedWords, null, 2), 'utf-8');
  console.log('Wrote public/data/word-bank.json');

  // Also write lib/game/word-bank-data.ts with direct array export
  const tsContent = `// Auto-generated real-English word bank (${sortedWords.length} words)
// Strictly validated: lowercase, a-z only, length 3-12, clean & recognizable vocabulary

export const RAW_WORD_BANK: string[] = ${JSON.stringify(sortedWords)};
`;

  fs.writeFileSync(path.resolve('lib/game/word-bank-data.ts'), tsContent, 'utf-8');
  console.log('Wrote lib/game/word-bank-data.ts');
}

build();
