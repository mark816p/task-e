/**
 * Task E - Natural Language Parser (ES Module)
 * Extracts structured tasks from speech transcripts:
 * - Splits compound sentences into distinct task items
 * - Extracts priority (high, medium, low)
 * - Extracts due dates / times (relative & absolute)
 * - Categorizes into contextual tags (work, shopping, personal, finance, home, study, general)
 * - Normalizes titles into clean imperative forms
 */

// Regex to identify task boundaries.
// Splits on sentence breaks, conjunctions (then, also), or (and / comma) followed by an action/intent token.
const BOUNDARY_REGEX = /(?:[.!?;\n]+|(?:\s*,\s*|\s+)and\s+(?:then|also|after that)\b|\b(?:then|also|after that|additionally)\b|(?:\s*,\s*and\s+|\s*,\s*|\s+and\s+)(?=(?:(?:urgently|urgent|asap|please|remind me to|remember to|don't forget to|make sure to|i need to|i have to|i should|we need to)\b)|(?:(?:call|phone|buy|purchase|get|order|pick up|pickup|submit|send|email|mail|write|finish|complete|start|clean|wash|do|make|fix|repair|pay|schedule|book|cancel|prepare|check|review|read|study|take|bring|deliver|visit|meet|ask|tell|print|update|setup|organize|tidy|workout|exercise|cook|bake|post|transfer|renew|file|draft|install|upload)\b)))/gi;

const CATEGORY_RULES = [
  {
    category: 'shopping',
    keywords: [
      'buy', 'purchase', 'order', 'grocery', 'groceries', 'supermarket',
      'milk', 'eggs', 'bread', 'amazon', 'store', 'cart', 'meat',
      'produce', 'vegetables', 'fruits', 'shopping', 'market', 'ingredients'
    ]
  },
  {
    category: 'work',
    keywords: [
      'report', 'presentation', 'submit', 'email', 'client', 'boss',
      'project', 'deadline', 'meeting', 'pr', 'jira', 'code', 'review',
      'slide', 'slides', 'office', 'invoice', 'contract', 'spreadsheet',
      'document', 'resume', 'interview', 'coworker', 'colleague', 'sprint',
      'ticket', 'bug', 'deploy', 'release', 'deck', 'manager'
    ]
  },
  {
    category: 'personal',
    keywords: [
      'mom', 'dad', 'family', 'doctor', 'dentist', 'workout', 'gym',
      'exercise', 'medicine', 'medication', 'pill', 'haircut', 'birthday',
      'friend', 'brother', 'sister', 'pet', 'dog', 'cat', 'vet', 'walk',
      'daughter', 'son', 'partner', 'call mom', 'call dad'
    ]
  },
  {
    category: 'finance',
    keywords: [
      'pay', 'bill', 'rent', 'bank', 'tax', 'taxes', 'transfer',
      'credit card', 'utility', 'utilities', 'fine', 'expense', 'payroll',
      'fee', 'subscription', 'mortgage', 'salary', 'deposit', 'wire'
    ]
  },
  {
    category: 'home',
    keywords: [
      'clean', 'laundry', 'dishes', 'trash', 'garbage', 'fix', 'repair',
      'cook', 'dinner', 'lunch', 'breakfast', 'vacuum', 'tidy', 'lawn',
      'plants', 'bake', 'kitchen', 'room', 'bed', 'mow'
    ]
  },
  {
    category: 'study',
    keywords: [
      'study', 'read', 'book', 'homework', 'assignment', 'class', 'exam',
      'quiz', 'lecture', 'chapter', 'paper', 'test', 'essay', 'course',
      'tutorial', 'notes'
    ]
  }
];

/**
 * Splits raw speech into individual task clauses.
 * Preserves noun-level conjunctions (e.g. "milk and eggs").
 * @param {string} text
 * @returns {string[]}
 */
export function splitTranscript(text) {
  if (!text || !text.trim()) return [];
  const normalized = text.trim().replace(/\s+/g, ' ');
  return normalized
    .split(BOUNDARY_REGEX)
    .map(clause => clause.trim())
    .filter(clause => clause.length > 0);
}

/**
 * Extracts priority from text and returns cleaned string.
 * @param {string} text
 * @returns {{ priority: 'high'|'medium'|'low', cleanText: string }}
 */
export function extractPriority(text) {
  const highRegex = /\b(urgently|urgent|asap|emergency|important|critical|high priority|highest priority)\b/i;
  const lowRegex = /\b(low priority|lowest priority|whenever|someday|not urgent|if possible|no rush)\b/i;

  if (highRegex.test(text)) {
    return {
      priority: 'high',
      cleanText: text.replace(highRegex, ' ').replace(/\s+/g, ' ').trim()
    };
  }
  if (lowRegex.test(text)) {
    return {
      priority: 'low',
      cleanText: text.replace(lowRegex, ' ').replace(/\s+/g, ' ').trim()
    };
  }
  return {
    priority: 'medium',
    cleanText: text
  };
}

/**
 * Assigns category based on keyword heuristic.
 * @param {string} text
 * @returns {string}
 */
export function extractCategory(text) {
  const lower = text.toLowerCase();
  for (const rule of CATEGORY_RULES) {
    for (const kw of rule.keywords) {
      const kwRegex = new RegExp(`\\b${kw}\\b`, 'i');
      if (kwRegex.test(lower)) {
        return rule.category;
      }
    }
  }
  return 'general';
}

/**
 * Parses relative & absolute dates/times from task text.
 * Returns structured date info and cleaned text with date removed.
 * @param {string} text
 * @param {Date} [baseDate=new Date()]
 * @returns {{ dueDate: { raw: string, display: string, date: Date, iso: string } | null, cleanText: string }}
 */
export function extractDueDate(text, baseDate = new Date()) {
  let clean = text;
  let dateObj = null;
  let raw = null;
  let display = null;

  // 1. "tomorrow morning/afternoon/evening/night"
  const tmrwPeriodRegex = /\b(?:due\s+|by\s+|on\s+)?tomorrow\s+(morning|afternoon|evening|night)\b/i;
  const tmrwPeriodMatch = clean.match(tmrwPeriodRegex);
  if (tmrwPeriodMatch) {
    raw = tmrwPeriodMatch[0];
    clean = clean.replace(tmrwPeriodRegex, ' ');
    const d = new Date(baseDate);
    d.setDate(d.getDate() + 1);
    const p = tmrwPeriodMatch[1].toLowerCase();
    if (p === 'morning') { d.setHours(9, 0, 0, 0); display = 'Tomorrow 9:00 AM'; }
    else if (p === 'afternoon') { d.setHours(14, 0, 0, 0); display = 'Tomorrow 2:00 PM'; }
    else if (p === 'evening') { d.setHours(18, 0, 0, 0); display = 'Tomorrow 6:00 PM'; }
    else if (p === 'night') { d.setHours(20, 0, 0, 0); display = 'Tomorrow 8:00 PM'; }
    dateObj = d;
  }

  // 2. "tomorrow at [time]" (e.g. "tomorrow at 5", "tomorrow 5pm", "tomorrow at 10:30 am")
  if (!dateObj) {
    const tmrwTimeRegex = /\b(?:due\s+|by\s+|on\s+)?tomorrow(?:\s+at)?\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i;
    const tmrwTimeMatch = clean.match(tmrwTimeRegex);
    if (tmrwTimeMatch) {
      raw = tmrwTimeMatch[0];
      clean = clean.replace(tmrwTimeRegex, ' ');
      const d = new Date(baseDate);
      d.setDate(d.getDate() + 1);
      let hour = parseInt(tmrwTimeMatch[1], 10);
      const min = tmrwTimeMatch[2] ? parseInt(tmrwTimeMatch[2], 10) : 0;
      const meridiem = tmrwTimeMatch[3] ? tmrwTimeMatch[3].toLowerCase() : null;
      if (meridiem === 'pm' && hour < 12) hour += 12;
      if (meridiem === 'am' && hour === 12) hour = 0;
      if (!meridiem && hour >= 1 && hour <= 7) hour += 12; // default to PM for afternoon/evening
      d.setHours(hour, min, 0, 0);
      dateObj = d;
      display = `Tomorrow ${formatDisplayTime(d)}`;
    }
  }

  // 3. Plain "tomorrow"
  if (!dateObj) {
    const tmrwRegex = /\b(?:due\s+|by\s+|on\s+)?tomorrow\b/i;
    const tmrwMatch = clean.match(tmrwRegex);
    if (tmrwMatch) {
      raw = tmrwMatch[0];
      clean = clean.replace(tmrwRegex, ' ');
      const d = new Date(baseDate);
      d.setDate(d.getDate() + 1);
      d.setHours(9, 0, 0, 0);
      dateObj = d;
      display = 'Tomorrow';
    }
  }

  // 4. "today/tonight/this morning/this evening"
  if (!dateObj) {
    const todayPeriodRegex = /\b(?:due\s+|by\s+|on\s+)?(?:today\s+(morning|afternoon|evening|night)|tonight|this\s+(evening|afternoon|morning))\b/i;
    const todayPeriodMatch = clean.match(todayPeriodRegex);
    if (todayPeriodMatch) {
      raw = todayPeriodMatch[0];
      clean = clean.replace(todayPeriodRegex, ' ');
      const d = new Date(baseDate);
      const p = (todayPeriodMatch[1] || todayPeriodMatch[2] || 'night').toLowerCase();
      if (p === 'morning') { d.setHours(9, 0, 0, 0); display = 'Today 9:00 AM'; }
      else if (p === 'afternoon') { d.setHours(14, 0, 0, 0); display = 'Today 2:00 PM'; }
      else if (p === 'evening') { d.setHours(18, 0, 0, 0); display = 'Today 6:00 PM'; }
      else if (p === 'night') { d.setHours(20, 0, 0, 0); display = 'Tonight 8:00 PM'; }
      dateObj = d;
    }
  }

  // 5. "today at [time]"
  if (!dateObj) {
    const todayTimeRegex = /\b(?:due\s+|by\s+|on\s+)?today(?:\s+at)?\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i;
    const todayTimeMatch = clean.match(todayTimeRegex);
    if (todayTimeMatch) {
      raw = todayTimeMatch[0];
      clean = clean.replace(todayTimeRegex, ' ');
      const d = new Date(baseDate);
      let hour = parseInt(todayTimeMatch[1], 10);
      const min = todayTimeMatch[2] ? parseInt(todayTimeMatch[2], 10) : 0;
      const meridiem = todayTimeMatch[3] ? todayTimeMatch[3].toLowerCase() : null;
      if (meridiem === 'pm' && hour < 12) hour += 12;
      if (meridiem === 'am' && hour === 12) hour = 0;
      if (!meridiem && hour >= 1 && hour <= 7) hour += 12;
      d.setHours(hour, min, 0, 0);
      dateObj = d;
      display = `Today ${formatDisplayTime(d)}`;
    }
  }

  // 6. Day of the week (e.g. "by Friday", "next Friday", "on Monday at 2pm", "this Tuesday")
  if (!dateObj) {
    const dowRegex = /\b(?:due\s+|by\s+|on\s+|before\s+)?(next|this)?\s*(monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?:\s+(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?)?\b/i;
    const dowMatch = clean.match(dowRegex);
    if (dowMatch) {
      raw = dowMatch[0];
      clean = clean.replace(dowRegex, ' ');
      const modifier = (dowMatch[1] || '').toLowerCase();
      const dayName = dowMatch[2].toLowerCase();
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const targetDay = days.indexOf(dayName);
      const currentDay = baseDate.getDay();

      let diff = targetDay - currentDay;
      if (diff <= 0) diff += 7;
      if (modifier === 'next') diff += 7;

      const d = new Date(baseDate);
      d.setDate(d.getDate() + diff);

      if (dowMatch[3]) {
        let hour = parseInt(dowMatch[3], 10);
        const min = dowMatch[4] ? parseInt(dowMatch[4], 10) : 0;
        const meridiem = dowMatch[5] ? dowMatch[5].toLowerCase() : null;
        if (meridiem === 'pm' && hour < 12) hour += 12;
        if (meridiem === 'am' && hour === 12) hour = 0;
        if (!meridiem && hour >= 1 && hour <= 7) hour += 12;
        d.setHours(hour, min, 0, 0);
        display = `${capitalize(dayName)} ${formatDisplayTime(d)}`;
      } else {
        d.setHours(17, 0, 0, 0); // Default deadline: 5:00 PM
        display = capitalize(dayName);
      }
      dateObj = d;
    }
  }

  // 7. Relative offsets: "in 2 hours", "in 30 minutes", "in 3 days"
  if (!dateObj) {
    const offsetRegex = /\bin\s+(\d+)\s*(minute|hour|day|week)s?\b/i;
    const offsetMatch = clean.match(offsetRegex);
    if (offsetMatch) {
      raw = offsetMatch[0];
      clean = clean.replace(offsetRegex, ' ');
      const amount = parseInt(offsetMatch[1], 10);
      const unit = offsetMatch[2].toLowerCase();
      const d = new Date(baseDate);

      if (unit === 'minute') d.setMinutes(d.getMinutes() + amount);
      else if (unit === 'hour') d.setHours(d.getHours() + amount);
      else if (unit === 'day') d.setDate(d.getDate() + amount);
      else if (unit === 'week') d.setDate(d.getDate() + (amount * 7));

      dateObj = d;
      display = `In ${amount} ${unit}${amount > 1 ? 's' : ''}`;
    }
  }

  // 8. Plain time of day: "at 5pm", "at 3:30 pm", "by 4 o'clock"
  if (!dateObj) {
    const timeRegex = /\b(?:at|by)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm|o'clock)?\b/i;
    const timeMatch = clean.match(timeRegex);
    if (timeMatch && (timeMatch[3] || clean.includes('today') || clean.includes('tonight'))) {
      raw = timeMatch[0];
      clean = clean.replace(timeRegex, ' ');
      const d = new Date(baseDate);
      let hour = parseInt(timeMatch[1], 10);
      const min = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      const meridiem = (timeMatch[3] || '').toLowerCase();
      if (meridiem === 'pm' && hour < 12) hour += 12;
      if (meridiem === 'am' && hour === 12) hour = 0;
      if (!meridiem && hour >= 1 && hour <= 7) hour += 12;
      d.setHours(hour, min, 0, 0);
      dateObj = d;
      display = `Today ${formatDisplayTime(d)}`;
    }
  }

  return {
    dueDate: dateObj ? {
      raw,
      display,
      date: dateObj,
      iso: toLocalISOString(dateObj)
    } : null,
    cleanText: clean
  };
}

/**
 * Strips conversational fillers and normalizes into an imperative action title.
 * @param {string} text
 * @returns {string}
 */
export function cleanTitle(text) {
  let cleaned = text
    // Strip leading conversational intent prefixes
    .replace(/^(?:please\s+)?(?:remind me to|remember to|don't forget to|make sure to|be sure to|i need to|i have to|i should|i want to|we need to|we should|could you|can you|let's|schedule\s+(?:a|an)?)\s*/i, '')
    // Strip leading conjunctions / adverbs
    .replace(/^(?:and|then|also|after that|next|additionally)\s*/i, '')
    // Strip priority words that were at the very front
    .replace(/^(?:urgently|urgent|asap|important|please)\s*/i, '')
    // Strip dangling prepositions left over after date stripping
    .replace(/\s+(?:by|at|on|for|before|in|due|to)$/i, '')
    // Strip surrounding punctuation & normalize spaces
    .replace(/^[,\-–—:;.]+|\s*[,\-–—:;.]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return '';
  return capitalize(cleaned);
}

/**
 * Main parsing pipeline: converts a raw transcript string into an array of structured tasks.
 * @param {string} rawText
 * @param {Date} [now=new Date()]
 * @returns {Array<Object>}
 */
export function parseSpeech(rawText, now = new Date()) {
  if (!rawText || !rawText.trim()) return [];

  const clauses = splitTranscript(rawText);

  return clauses.map((clause, index) => {
    let text = clause;

    // 1. Priority extraction
    const priorityResult = extractPriority(text);
    const priority = priorityResult.priority;
    text = priorityResult.cleanText;

    // 2. Category extraction
    const category = extractCategory(text);

    // 3. Due date extraction
    const dueResult = extractDueDate(text, now);
    const dueDateInfo = dueResult.dueDate;
    text = dueResult.cleanText;

    // 4. Title normalization into imperative form
    const title = cleanTitle(text);

    return {
      id: `task_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 6)}`,
      title: title || clause,
      completed: false,
      priority,
      category,
      dueDate: dueDateInfo ? dueDateInfo.display : null,
      dueISO: dueDateInfo ? dueDateInfo.iso : null,
      rawDatePhrase: dueDateInfo ? dueDateInfo.raw : null,
      createdAt: now.toISOString(),
      userId: null
    };
  });
}

export function formatDisplayTime(date) {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const minStr = minutes < 10 ? '0' + minutes : minutes;
  return `${hours}:${minStr} ${ampm}`;
}

export function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function toLocalISOString(date) {
  const pad = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
