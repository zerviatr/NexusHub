// Regex Lab Pro Engine: ReDoS Scanner, AST Parser & Multi-Language Exporter
// Zero-dependency, safe static analysis, production grade

export type ReDoSSeverity = 'safe' | 'low' | 'medium' | 'high' | 'critical'

export interface ReDoSFinding {
  id: string
  title: string
  patternSnippet: string
  severity: 'warning' | 'critical' | 'info'
  explanation: string
  remedy: string
}

export interface ReDoSAnalysisResult {
  score: number // 0-100
  severity: ReDoSSeverity
  headline: string
  isVulnerable: boolean
  findings: ReDoSFinding[]
  pathologicalInput?: string
  worstCaseComplexity: string
}

// -------------------------------------------------------------
// 1. ReDoS Vulnerability Scanner (Static Analysis Engine)
// -------------------------------------------------------------
export function analyzeReDoS(pattern: string): ReDoSAnalysisResult {
  if (!pattern || pattern.trim().length === 0) {
    return {
      score: 100,
      severity: 'safe',
      headline: 'Güvenli (Boş Desen)',
      isVulnerable: false,
      findings: [],
      worstCaseComplexity: 'O(1) Sabit'
    }
  }

  const findings: ReDoSFinding[] = []
  let score = 100
  let sampleVulnerableChar = 'a'

  // 1. Check for Nested Quantifiers e.g. (a+)+, (.*)*, ([a-z]+)*, (\d+)+
  // Regex looks for a group containing +, *, {n,m} followed immediately by +, *, {n,m}
  const nestedQuantifierRegex = /\((?:[^()]*?[+*]|\([^()]*?\)[+*])[^()]*?\)[+*]|\((?:[^()]*?\{[0-9]+,?[0-9]*\})[^()]*?\)[+*]/g
  let match: RegExpExecArray | null

  while ((match = nestedQuantifierRegex.exec(pattern)) !== null) {
    const snippet = match[0]
    score -= 60
    findings.push({
      id: `nested-${match.index}`,
      title: 'İç İçe Niceleyici Tuzağı (Nested Quantifiers)',
      patternSnippet: snippet,
      severity: 'critical',
      explanation: `"${snippet}" yapısında içteki ve dıştaki tekrarlar (quantifiers) çarpışmaktadır. Eşleşmeyen bir girdi durumunda motor tüm dallanmaları dener ve O(2^N) üstel karmaşıklıkla CPU'yu kilitler.`,
      remedy: 'İç içe quantifiers yerine tek bir karakter sınıfı veya atomik grup kullanın. Örneğin: (a+)+ yerine tekil a+ tercih edin.'
    })
    if (snippet.includes('\\d')) sampleVulnerableChar = '9'
    else if (snippet.includes('x')) sampleVulnerableChar = 'x'
    else sampleVulnerableChar = 'a'
  }

  // 2. Quantified nested character class e.g. ([a-zA-Z0-9]+)* or ([0-9]+)+
  const nestedClassRegex = /\(\s*\[[^\]]+\][+*]\s*\)[+*]/g
  while ((match = nestedClassRegex.exec(pattern)) !== null) {
    const snippet = match[0]
    // Don't duplicate if already caught above
    if (!findings.some((f) => f.patternSnippet === snippet)) {
      score -= 55
      findings.push({
        id: `nested-class-${match.index}`,
        title: 'İç İçe Karakter Sınıfı Tekrarı',
        patternSnippet: snippet,
        severity: 'critical',
        explanation: `Karakter sınıfı halihazırda "+" veya "*" ile tekrarlanırken, dış grup da tekrar edilmektedir ("${snippet}"). Bu, ReDoS patlamalarının en yaygın kaynağıdır.`,
        remedy: 'Dıştaki veya içteki niceleyiciyi kaldırın. Sadece [karakterler]+ kullanmak aynı eşleşmeyi güvenle sağlar.'
      })
    }
  }

  // 3. Overlapping Alternation inside Quantified Group e.g. (a|aa)+, (a+|b+)+, (\w|\d)+
  const overlappingAltRegex = /\((?:[a-zA-Z0-9_\\]+[+*]?\s*\|)+\s*[a-zA-Z0-9_\\]+[+*]?\s*\)[+*]/g
  while ((match = overlappingAltRegex.exec(pattern)) !== null) {
    const snippet = match[0]
    if (snippet.includes('+') || snippet.includes('*')) {
      score -= 40
      findings.push({
        id: `alt-overlap-${match.index}`,
        title: 'Örtüşen Alternatifli Tekrar Grubu (Overlapping Alternation)',
        patternSnippet: snippet,
        severity: 'critical',
        explanation: `Grup içindeki alternatifler birbirleriyle örtüşebilir ve dış niceleyici (${snippet}) her iki yoldan da ilerleyerek katastrofik geri adım (backtracking) oluşturur.`,
        remedy: 'Alternatifleri ayrık (disjoint) hale getirin veya ortak önekleri grup dışına çıkarın.'
      })
    }
  }

  // 4. Consecutive unanchored wildcards e.g. .*.* or .+.+ or .*\s*.*
  const consecutiveWildcards = /\.\*[\s\S]*?\.\*|\.\+[\s\S]*?\.\+/g
  while ((match = consecutiveWildcards.exec(pattern)) !== null) {
    const snippet = match[0]
    if (snippet.length < 12) {
      score -= 30
      findings.push({
        id: `wildcard-${match.index}`,
        title: 'Ardışık Açgözlü Jokerler (Consecutive Greedy Wildcards)',
        patternSnippet: snippet,
        severity: 'warning',
        explanation: `Ardışık "${snippet}" gibi doyumsuz eşleşmeler, eşleşme başarısız olduğunda O(N^2) polinomik geri adım gecikmesine yol açar.`,
        remedy: 'Belirsiz ".*" yerine beklenen karakter kümesini sınırlandırın veya tembel niceleyici (.*?) kullanın.'
      })
    }
  }

  // 5. Repeated word/digits with soft separators e.g. \w+\s*\w+ inside a loop
  const repeatedTokensInLoop = /\((?:\\w\+|\\d\+|\[\^?\w+\]\+)[^)]*\)[+*]/g
  while ((match = repeatedTokensInLoop.exec(pattern)) !== null) {
    const snippet = match[0]
    if (!findings.some((f) => f.patternSnippet === snippet)) {
      score -= 25
      findings.push({
        id: `token-loop-${match.index}`,
        title: 'Belirsiz Sınır Tekrarı',
        patternSnippet: snippet,
        severity: 'warning',
        explanation: `"${snippet}" ifadesi belirsiz sınırlarla tekrarlanmaktadır. Uzun dizgilerde arama süresini ciddi derecede uzatabilir.`,
        remedy: 'Kelime sınırları (\\b) veya kesin ayrıştırıcılar ekleyerek dallanma derinliğini düşürün.'
      })
    }
  }

  score = Math.max(10, Math.min(100, score))

  let severity: ReDoSSeverity = 'safe'
  let headline = 'Güvenli (O(N) Lineer Motor Dostu)'
  let worstCaseComplexity = 'O(N) Lineer Süre'
  let isVulnerable = false

  if (score < 50) {
    severity = 'critical'
    headline = 'Kritik ReDoS Riski (Katastrofik Üstel Backtracking)'
    worstCaseComplexity = 'O(2^N) Üstel Zaman'
    isVulnerable = true
  } else if (score < 75) {
    severity = 'medium'
    headline = 'Orta Risk (Polinomik Karmaşıklık Potansiyeli)'
    worstCaseComplexity = 'O(N^2) Polinom Zaman'
    isVulnerable = true
  } else if (score < 90) {
    severity = 'low'
    headline = 'Düşük Risk (Küçük Sınır Kontrolü Önerilir)'
    worstCaseComplexity = 'O(N) - O(N^2)'
    isVulnerable = false
  }

  // Generate simulated pathological input if vulnerable
  const pathologicalInput = isVulnerable
    ? `${sampleVulnerableChar.repeat(28)}! (Sonunda eşleşmeyen karakter)`
    : undefined

  return {
    score,
    severity,
    headline,
    isVulnerable,
    findings,
    pathologicalInput,
    worstCaseComplexity
  }
}

// -------------------------------------------------------------
// 2. AST Breakdown & Human-Friendly Token Explainer
// -------------------------------------------------------------
export type TokenType =
  | 'lookaround'
  | 'group'
  | 'class'
  | 'quantifier'
  | 'anchor'
  | 'alternation'
  | 'literal'
  | 'meta'

export interface RegexToken {
  id: string
  raw: string
  type: TokenType
  badge: string
  title: string
  explanation: string
  depth: number
}

export function parseRegexAST(pattern: string): RegexToken[] {
  if (!pattern) return []
  const tokens: RegexToken[] = []
  let i = 0
  let depth = 0
  let groupCounter = 1

  while (i < pattern.length) {
    const ch = pattern[i]
    const next = pattern[i + 1] || ''

    // Escaped sequences
    if (ch === '\\') {
      const seq = pattern.slice(i, i + 2)
      i += 2
      switch (seq) {
        case '\\d':
          tokens.push({
            id: `tok-${i}`,
            raw: '\\d',
            type: 'class',
            badge: 'Sınıf',
            title: 'Rakam Karakteri',
            explanation: '0 ile 9 arasındaki herhangi bir basamak ile eşleşir ([0-9]).',
            depth
          })
          break
        case '\\D':
          tokens.push({
            id: `tok-${i}`,
            raw: '\\D',
            type: 'class',
            badge: 'Sınıf',
            title: 'Rakam Olmayan Karakter',
            explanation: 'Basamak (0-9) DIŞINDAKİ herhangi bir karakterle eşleşir.',
            depth
          })
          break
        case '\\w':
          tokens.push({
            id: `tok-${i}`,
            raw: '\\w',
            type: 'class',
            badge: 'Sınıf',
            title: 'Sözcük Karakteri',
            explanation: 'Harf, rakam veya alt çizgi ile eşleşir ([a-zA-Z0-9_]).',
            depth
          })
          break
        case '\\W':
          tokens.push({
            id: `tok-${i}`,
            raw: '\\W',
            type: 'class',
            badge: 'Sınıf',
            title: 'Sözcük Olmayan Karakter',
            explanation: 'Harf, rakam veya alt çizgi DIŞINDAKİ özel simge veya boşluklarla eşleşir.',
            depth
          })
          break
        case '\\s':
          tokens.push({
            id: `tok-${i}`,
            raw: '\\s',
            type: 'class',
            badge: 'Sınıf',
            title: 'Boşluk Karakteri',
            explanation: 'Boşluk, sekme (tab) veya satır sonu (newline) karakteriyle eşleşir.',
            depth
          })
          break
        case '\\S':
          tokens.push({
            id: `tok-${i}`,
            raw: '\\S',
            type: 'class',
            badge: 'Sınıf',
            title: 'Boşluk Olmayan Karakter',
            explanation: 'Boşluk karakterleri hariç her şeyle eşleşir.',
            depth
          })
          break
        case '\\b':
          tokens.push({
            id: `tok-${i}`,
            raw: '\\b',
            type: 'anchor',
            badge: 'Çapa',
            title: 'Kelime Sınırı (Word Boundary)',
            explanation: 'Kelime karakteri (\\w) ile kelime olmayan karakter arasındaki sınırda konumlanır; karakter tüketmez.',
            depth
          })
          break
        case '\\B':
          tokens.push({
            id: `tok-${i}`,
            raw: '\\B',
            type: 'anchor',
            badge: 'Çapa',
            title: 'Kelime Olmayan Sınır',
            explanation: 'Kelime sınırı OLMAYAN bir noktada eşleşir.',
            depth
          })
          break
        default:
          tokens.push({
            id: `tok-${i}`,
            raw: seq,
            type: 'literal',
            badge: 'Sabit',
            title: `Kaçışlı Karakter ('${seq[1] || ''}')`,
            explanation: `Özel regex anlamı iptal edilmiş birebir "${seq[1] || ''}" karakteriyle eşleşir.`,
            depth
          })
          break
      }
      continue
    }

    // Anchors
    if (ch === '^') {
      tokens.push({
        id: `tok-${i}`,
        raw: '^',
        type: 'anchor',
        badge: 'Çapa',
        title: 'Metin / Satır Başı',
        explanation: 'Metnin (veya multiline modunda satırın) en başlangıç noktasını işaret eder.',
        depth
      })
      i++
      continue
    }

    if (ch === '$') {
      tokens.push({
        id: `tok-${i}`,
        raw: '$',
        type: 'anchor',
        badge: 'Çapa',
        title: 'Metin / Satır Sonu',
        explanation: 'Metnin (veya multiline modunda satırın) en bitiş noktasını işaret eder.',
        depth
      })
      i++
      continue
    }

    // Groups & Lookarounds
    if (ch === '(') {
      depth++
      const lookaheadPrefix = pattern.slice(i, i + 3)
      const lookbehindPrefix = pattern.slice(i, i + 4)

      if (lookbehindPrefix === '(?<=') {
        tokens.push({
          id: `tok-${i}`,
          raw: '(?<=...)',
          type: 'lookaround',
          badge: 'Lookbehind',
          title: 'Pozitif Geriye Bakış (Positive Lookbehind)',
          explanation: 'Öncesinde bu ifadenin yer almasını şart koşar; bulunan kısmı eşleşmeye dahil etmez.',
          depth
        })
        i += 4
      } else if (lookbehindPrefix === '(?<!') {
        tokens.push({
          id: `tok-${i}`,
          raw: '(?<!...)',
          type: 'lookaround',
          badge: 'Lookbehind',
          title: 'Negatif Geriye Bakış (Negative Lookbehind)',
          explanation: 'Öncesinde bu ifadenin KESİNLİKLE OLMAMASINI şart koşar.',
          depth
        })
        i += 4
      } else if (lookaheadPrefix === '(?=') {
        tokens.push({
          id: `tok-${i}`,
          raw: '(?=...)',
          type: 'lookaround',
          badge: 'Lookahead',
          title: 'Pozitif İleriye Bakış (Positive Lookahead)',
          explanation: 'Sonrasında bu ifadenin gelmesini şart koşar; eşleşme uzunluğuna eklenmez.',
          depth
        })
        i += 3
      } else if (lookaheadPrefix === '(?!') {
        tokens.push({
          id: `tok-${i}`,
          raw: '(?!...)',
          type: 'lookaround',
          badge: 'Lookahead',
          title: 'Negatif İleriye Bakış (Negative Lookahead)',
          explanation: 'Sonrasında bu ifadenin KESİNLİKLE GELMEMESİNİ zorunlu kılar.',
          depth
        })
        i += 3
      } else if (lookaheadPrefix === '(?:') {
        tokens.push({
          id: `tok-${i}`,
          raw: '(?:...)',
          type: 'group',
          badge: 'Grup',
          title: 'Yakalamayan Mantıksal Grup (Non-Capturing)',
          explanation: 'İfadeleri mantıksal olarak gruplar ancak hafızada grup ($1, $2) olarak saklamaz (daha hızlıdır).',
          depth
        })
        i += 3
      } else if (pattern.slice(i, i + 3) === '(?<') {
        // Named group (?<name>...)
        const endName = pattern.indexOf('>', i)
        const name = endName !== -1 ? pattern.slice(i + 3, endName) : 'ad'
        tokens.push({
          id: `tok-${i}`,
          raw: `(?<${name}>...)`,
          type: 'group',
          badge: 'İsimli Grup',
          title: `İsimlendirilmiş Grup: <${name}>`,
          explanation: `Eşleşen alt metni yakalar ve eşleşme nesnesinde "${name}" anahtarıyla sunar.`,
          depth
        })
        i = endName !== -1 ? endName + 1 : i + 3
      } else {
        tokens.push({
          id: `tok-${i}`,
          raw: '(...)',
          type: 'group',
          badge: 'Yakalama',
          title: `Yakalama Grubu #${groupCounter++}`,
          explanation: `İçindeki eşleşmeyi yakalar ve $${groupCounter - 1} referansı ile saklar.`,
          depth
        })
        i++
      }
      continue
    }

    if (ch === ')') {
      depth = Math.max(0, depth - 1)
      i++
      continue
    }

    // Character class [abc] or [^abc]
    if (ch === '[') {
      let closeIdx = pattern.indexOf(']', i + 1)
      // Check if ] is escaped or right after [ (e.g. []abc] or [^]abc])
      while (closeIdx !== -1 && pattern[closeIdx - 1] === '\\') {
        closeIdx = pattern.indexOf(']', closeIdx + 1)
      }
      const rawClass = closeIdx !== -1 ? pattern.slice(i, closeIdx + 1) : pattern.slice(i)
      const isNegated = rawClass.startsWith('[^')
      tokens.push({
        id: `tok-${i}`,
        raw: rawClass,
        type: 'class',
        badge: isNegated ? 'Negatif Sınıf' : 'Karakter Kümesi',
        title: isNegated ? 'Hariç Tutulan Küme' : 'Karakter Kümesi Seçimi',
        explanation: isNegated
          ? `Belirtilen ${rawClass} karakterleri DIŞINDAKİ herhangi bir karakterle eşleşir.`
          : `Köşeli parantez içindeki karakterlerden herhangi biriyle tek bir konumda eşleşir.`,
        depth
      })
      i = closeIdx !== -1 ? closeIdx + 1 : pattern.length
      continue
    }

    // Quantifiers
    if (ch === '+' || ch === '*' || ch === '?') {
      const isLazy = next === '?'
      const rawQuant = isLazy ? ch + '?' : ch
      let qTitle = ''
      let qDesc = ''

      if (ch === '+') {
        qTitle = isLazy ? 'Tembel Bir veya Daha Fazla (+?)' : 'Açgözlü Bir veya Daha Fazla (+)'
        qDesc = isLazy
          ? 'En az 1 kez eşleşir, mümkün olan en kısa eşleşmede durur.'
          : 'En az 1 kez veya daha fazla tekrar eder (Greedy).'
      } else if (ch === '*') {
        qTitle = isLazy ? 'Tembel Sıfır veya Daha Fazla (*?)' : 'Açgözlü Sıfır veya Fazla (*)'
        qDesc = isLazy
          ? '0 veya daha çok kez eşleşir, en kısa yolu seçer.'
          : '0 veya daha çok kez sınırsız tekrar eder.'
      } else if (ch === '?') {
        qTitle = isLazy ? 'Tembel İsteğe Bağlı (??)' : 'İsteğe Bağlı (0 veya 1 Kez - ?)'
        qDesc = 'Önceki ögenin var olabileceğini veya olmayabileceğini belirtir.'
      }

      tokens.push({
        id: `tok-${i}`,
        raw: rawQuant,
        type: 'quantifier',
        badge: 'Niceleyici',
        title: qTitle,
        explanation: qDesc,
        depth
      })
      i += isLazy ? 2 : 1
      continue
    }

    // Quantifier {min,max}
    if (ch === '{') {
      const closeIdx = pattern.indexOf('}', i)
      if (closeIdx !== -1) {
        const rawBrace = pattern.slice(i, closeIdx + 1)
        tokens.push({
          id: `tok-${i}`,
          raw: rawBrace,
          type: 'quantifier',
          badge: 'Niceleyici',
          title: `Tekrar Aralığı ${rawBrace}`,
          explanation: `Önceki ifadenin tam olarak ${rawBrace.slice(1, -1)} aralığında tekrar etmesini şart koşar.`,
          depth
        })
        i = closeIdx + 1
        continue
      }
    }

    // Alternation |
    if (ch === '|') {
      tokens.push({
        id: `tok-${i}`,
        raw: '|',
        type: 'alternation',
        badge: 'Mantıksal',
        title: 'Mantıksal VEYA (Alternation)',
        explanation: 'Solundaki veya sağındaki alt ifadeden herhangi birinin eşleşmesini sağlar.',
        depth
      })
      i++
      continue
    }

    // Dot wildcard
    if (ch === '.') {
      tokens.push({
        id: `tok-${i}`,
        raw: '.',
        type: 'meta',
        badge: 'Joker',
        title: 'Herhangi Bir Tek Karakter (Wildcard)',
        explanation: 'Yeni satır (\\n) hariç herhangi bir tek karakterle eşleşir (DotAll /s modunda yeni satırı da kapsar).',
        depth
      })
      i++
      continue
    }

    // Normal literal character runs
    let literalRun = ch
    i++
    const specials = ['\\', '^', '$', '(', ')', '[', ']', '{', '}', '+', '*', '?', '|', '.']
    while (i < pattern.length && !specials.includes(pattern[i])) {
      literalRun += pattern[i]
      i++
    }

    tokens.push({
      id: `tok-${i}`,
      raw: literalRun,
      type: 'literal',
      badge: 'Metin',
      title: `Birebir Metin: "${literalRun}"`,
      explanation: `Girdi metninde birebir "${literalRun}" dizgisini arar.`,
      depth
    })
  }

  return tokens
}

// -------------------------------------------------------------
// 3. Multi-Language Code Export Generator
// -------------------------------------------------------------
export interface CodeSnippet {
  id: 'typescript' | 'python' | 'go' | 'rust' | 'java' | 'csharp'
  name: string
  extension: string
  code: string
  description: string
}

export function generateCodeSnippets(pattern: string, flags: string, sampleText: string): CodeSnippet[] {
  const safePattern = pattern || '^[a-zA-Z0-9]+$'
  const safeFlags = flags || 'g'
  const sample = sampleText || 'Test metni buraya gelecek.'

  // 1. TypeScript / JavaScript
  const tsCode = `// TypeScript / JavaScript (Node.js & Modern Tarayıcı)
const pattern: RegExp = /${safePattern}/${safeFlags};
const text: string = ${JSON.stringify(sample)};

console.log("--- Regex Canlı Testi ---");
const matches = [...text.matchAll(pattern)];
console.log(\`Toplam \${matches.length} eşleşme bulundu:\`);

matches.forEach((m, idx) => {
  console.log(\`[\${idx + 1}] Eşleşme: "\${m[0]}" (İndeks: \${m.index})\`);
  if (m.groups && Object.keys(m.groups).length > 0) {
    console.log("    Gruplar:", m.groups);
  }
});
`

  // 2. Python
  const pyFlagsList: string[] = []
  if (safeFlags.includes('i')) pyFlagsList.push('re.IGNORECASE')
  if (safeFlags.includes('m')) pyFlagsList.push('re.MULTILINE')
  if (safeFlags.includes('s')) pyFlagsList.push('re.DOTALL')
  const pyFlagsStr = pyFlagsList.length > 0 ? `, flags=${pyFlagsList.join(' | ')}` : ''

  const pyCode = `# Python 3
import re

pattern = r"${safePattern}"
text = """${sample.replace(/"""/g, '\\"\\"\\"')}"""

matches = list(re.finditer(pattern, text${pyFlagsStr}))
print(f"Toplam {len(matches)} eşleşme bulundu:")

for idx, match in enumerate(matches, 1):
    print(f"[{idx}] Eşleşme: '{match.group()}' (Aralık: {match.span()})")
    if match.groupdict():
        print(f"    Gruplar: {match.groupdict()}")
`

  // 3. Go
  let goPattern = safePattern
  let goFlagsPrefix = ''
  if (safeFlags.includes('i')) goFlagsPrefix += 'i'
  if (safeFlags.includes('m')) goFlagsPrefix += 'm'
  if (safeFlags.includes('s')) goFlagsPrefix += 's'
  if (goFlagsPrefix) {
    goPattern = `(?${goFlagsPrefix})${goPattern}`
  }

  const goCode = `package main

import (
	"fmt"
	"regexp"
)

func main() {
	pattern := \`${goPattern.replace(/`/g, '` + "`" + `')}\`
	text := \`${sample.replace(/`/g, '` + "`" + `')}\`

	re, err := regexp.Compile(pattern)
	if err != nil {
		fmt.Printf("Regex derleme hatası: %v\\n", err)
		return
	}

	matches := re.FindAllStringSubmatchIndex(text, -1)
	fmt.Printf("Toplam %d eşleşme bulundu:\\n", len(matches))

	for i, loc := range matches {
		matchStr := text[loc[0]:loc[1]]
		fmt.Printf("[%d] Eşleşme: '%s' (Aralık: %d-%d)\\n", i+1, matchStr, loc[0], loc[1])
	}
}
`

  // 4. Rust
  let rustPattern = safePattern
  let rustFlags = ''
  if (safeFlags.includes('i')) rustFlags += 'i'
  if (safeFlags.includes('m')) rustFlags += 'm'
  if (safeFlags.includes('s')) rustFlags += 's'
  if (rustFlags) {
    rustPattern = `(?${rustFlags})${rustPattern}`
  }

  const rustCode = `// Cargo.toml -> [dependencies] regex = "1"
use regex::Regex;

fn main() {
    let pattern = r#"${rustPattern}"#;
    let text = r#"${sample}"#;

    let re = match Regex::new(pattern) {
        Ok(r) => r,
        Err(e) => {
            eprintln!("Regex derleme hatası: {}", e);
            return;
        }
    };

    let matches: Vec<_> = re.find_iter(text).collect();
    println!("Toplam {} eşleşme bulundu:", matches.len());

    for (i, m) in matches.iter().enumerate() {
        println!("[{}] Eşleşme: '{}' (Aralık: {}-{})", i + 1, m.as_str(), m.start(), m.end());
    }
}
`

  // 5. Java
  const javaEscapedPattern = safePattern.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  const javaFlagsList: string[] = []
  if (safeFlags.includes('i')) javaFlagsList.push('Pattern.CASE_INSENSITIVE')
  if (safeFlags.includes('m')) javaFlagsList.push('Pattern.MULTILINE')
  if (safeFlags.includes('s')) javaFlagsList.push('Pattern.DOTALL')
  const javaFlagsArg = javaFlagsList.length > 0 ? `, ${javaFlagsList.join(' | ')}` : ''

  const javaCode = `// Java (JDK 11+)
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class RegexRunner {
    public static void main(String[] args) {
        String regex = "${javaEscapedPattern}";
        String text = ${JSON.stringify(sample)};

        Pattern pattern = Pattern.compile(regex${javaFlagsArg});
        Matcher matcher = pattern.matcher(text);

        int count = 0;
        while (matcher.find()) {
            count++;
            System.out.printf("[%d] Eşleşme: '%s' (Aralık: %d-%d)%n",
                count, matcher.group(), matcher.start(), matcher.end());
        }
        System.out.printf("Toplam %d eşleşme bulundu.%n", count);
    }
}
`

  // 6. C# (.NET)
  const csEscapedPattern = safePattern.replace(/"/g, '""')
  const csOptionsList: string[] = []
  if (safeFlags.includes('i')) csOptionsList.push('RegexOptions.IgnoreCase')
  if (safeFlags.includes('m')) csOptionsList.push('RegexOptions.Multiline')
  if (safeFlags.includes('s')) csOptionsList.push('RegexOptions.Singleline')
  const csOptionsArg = csOptionsList.length > 0 ? `, ${csOptionsList.join(' | ')}` : ''

  const csCode = `// C# (.NET 8+)
using System;
using System.Text.RegularExpressions;

class Program
{
    static void Main()
    {
        string pattern = @"${csEscapedPattern}";
        string text = ${JSON.stringify(sample)};

        MatchCollection matches = Regex.Matches(text, pattern${csOptionsArg});
        Console.WriteLine($"Toplam {matches.Count} eşleşme bulundu:");

        int i = 1;
        foreach (Match match in matches)
        {
            Console.WriteLine($"[{i++}] Eşleşme: '{match.Value}' (İndeks: {match.Index}, Uzunluk: {match.Length})");
            foreach (Group group in match.Groups)
            {
                if (group.Success && group.Name != "0")
                {
                    Console.WriteLine($"    Grup [{group.Name}]: '{group.Value}'");
                }
            }
        }
    }
}
`

  return [
    {
      id: 'typescript',
      name: 'TypeScript / JS',
      extension: 'ts',
      code: tsCode,
      description: 'Modern ES2020 matchAll() iterator ve regex nesnesi'
    },
    {
      id: 'python',
      name: 'Python 3',
      extension: 'py',
      code: pyCode,
      description: 'Standart "re" modülü ile finditer döngüsü ve groupdict()'
    },
    {
      id: 'go',
      name: 'Go (Golang)',
      extension: 'go',
      code: goCode,
      description: 'RE2 motoru tabanlı "regexp" paketi ve güvenli derleme'
    },
    {
      id: 'rust',
      name: 'Rust',
      extension: 'rs',
      code: rustCode,
      description: 'Zero-cost soyutlamalı "regex" crate find_iter optimizasyonu'
    },
    {
      id: 'java',
      name: 'Java',
      extension: 'java',
      code: javaCode,
      description: 'java.util.regex.Pattern ve Matcher API uygulaması'
    },
    {
      id: 'csharp',
      name: 'C# (.NET)',
      extension: 'cs',
      code: csCode,
      description: 'System.Text.RegularExpressions Regex.Matches koleksiyonu'
    }
  ]
}
