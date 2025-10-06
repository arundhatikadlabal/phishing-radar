// ---- Elements
const screenStart   = document.getElementById('screen-start');
const screenGame    = document.getElementById('screen-game');
const screenResults = document.getElementById('screen-results');

const btnStart = document.getElementById('btn-start');
const btnPhish = document.getElementById('btn-phish');
const btnSafe  = document.getElementById('btn-safe');
const btnNext  = document.getElementById('btn-next');
const btnReplay= document.getElementById('btn-replay');
const shareLink= document.getElementById('share-link');

const idxEl   = document.getElementById('idx');
const totalEl = document.getElementById('total');
const scoreEl = document.getElementById('score');

const scenarioTitle   = document.getElementById('scenario-title');
const scenarioContent = document.getElementById('scenario-content');

const feedbackBox    = document.getElementById('feedback');
const feedbackResult = document.getElementById('feedback-result');
const feedbackReasons= document.getElementById('feedback-reasons');

const finalScore = document.getElementById('final-score');
const badgeEl    = document.getElementById('badge');
const blindspots = document.getElementById('blindspots');

// ---- State
let fullScenarios = []; // full pool from JSON
let scenarios = [];     // subset used in current game
let i = 0;
let score = 0;
let missesByFlag = {}; // e.g., { "lookalike-domain": 2, "urgency": 1 }

// ---- Helpers
function show(el){ el.classList.remove('hidden'); }
function hide(el){ el.classList.add('hidden'); }
function clamp(n,min,max){ return Math.max(min, Math.min(max, n)); }

function shuffle(arr){
  for(let j=arr.length-1;j>0;j--){
    const k = Math.floor(Math.random() * (j+1));
    [arr[j], arr[k]] = [arr[k], arr[j]];
  }
  return arr;
}

// safe escaping for text inserted into HTML
function escapeHtml(str = '') {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

// Rotating titles for the start card
const titles = [
  "Trust or Trap?",
  "Don’t Take the Bait",
  "Spot the Scam"
];

document.addEventListener("DOMContentLoaded", () => {
  const titleEl = document.getElementById("start-title");
  if (titleEl) {
    const randomTitle = titles[Math.floor(Math.random() * titles.length)];
    titleEl.textContent = randomTitle;
  }
});

// Render an email/link preview based on scenario.type
function renderScenarioContent(s){
  const c = s.content || {};

  // EMAIL type: render nested boxes
  if (s.type === 'email'){
    // From box
    const fromDisplay = escapeHtml(c.fromDisplay || 'Unknown');
    const fromEmail = escapeHtml(c.fromEmail || '');
    const subject = escapeHtml(c.subject || '');
    const body = escapeHtml(c.body || '');

    const linksHtml = (c.links || []).map(l => {
      const text = escapeHtml(l.text || l.href || '');
      const href = escapeHtml(l.href || '');
      return `<div class="email-box link-box">
                <div class="label">Link</div>
                <div class="email-text"><strong>${text}</strong> → <span class="link">${href}</span></div>
              </div>`;
    }).join('');

    return `
      <div class="email">
        <div class="email-box from-box">
          <div class="label">From</div>
          <div class="email-text"><strong>${fromDisplay}</strong> &lt;${fromEmail}&gt;</div>
        </div>

        ${ subject ? `<div class="email-box subject-box">
                        <div class="label">Subject</div>
                        <div class="email-text">${subject}</div>
                      </div>` : '' }

        <div class="email-box body-box">
          <div class="label">Message</div>
          <div class="email-text">${body}</div>
        </div>

        ${linksHtml}
      </div>
    `;
  }

  // SMS type: render sender + message in boxes
  if (s.type === 'sms'){
    const fromDisplay = escapeHtml(c.fromDisplay || 'SMS');
    const body = escapeHtml(c.body || '');
    return `
      <div class="email">
        <div class="email-box from-box">
          <div class="label">From</div>
          <div class="email-text"><strong>${fromDisplay}</strong></div>
        </div>

        <div class="email-box body-box">
          <div class="label">Message</div>
          <div class="email-text">${body}</div>
        </div>
      </div>
    `;
  }

  // Fallback: show pretty-printed JSON in a monospace box
  return `<div class="email"><div class="email-box body-box"><pre class="email-text">${escapeHtml(JSON.stringify(c, null, 2))}</pre></div></div>`;
}

function updateProgress(){
  idxEl.textContent = i+1;
  totalEl.textContent = scenarios.length;
  scoreEl.textContent = score;
}

function setButtonsEnabled(enabled){
  btnPhish.disabled = !enabled;
  btnSafe.disabled  = !enabled;
}

// ---- Game flow
async function loadScenarios(){
  try{
    const res = await fetch('./data/scenarios.json');
    if(!res.ok) throw new Error('Failed to load scenarios.json');
    const data = await res.json();
    return data;
  }catch(err){
    console.error(err);
    alert('Could not load scenarios. If running locally, use a local server like VS Code Live Server.');
    return [];
  }
}

function startGame(){
  i = 0;
  score = 0;
  missesByFlag = {};

  // pick a random subset (10) from the fullScenarios pool
  scenarios = shuffle([...fullScenarios]).slice(0, 10);
  updateProgress();
  show(screenGame);
  hide(screenStart);
  hide(screenResults);
  renderCurrent();
}

function renderCurrent(){
  const s = scenarios[i];
  scenarioTitle.textContent = `Scenario ${i+1}`;
  scenarioContent.innerHTML = renderScenarioContent(s);
  hide(feedbackBox);
  setButtonsEnabled(true);
  updateProgress();
}

function onChoice(userThinksPhish){
  const s = scenarios[i];
  const correct = (userThinksPhish === s.isPhish);
  if (correct) score++;

  // Track misses by red-flag category when user is wrong
  if (!correct){
    (s.reasons || []).forEach(flag => {
      missesByFlag[flag] = (missesByFlag[flag] || 0) + 1;
    });
  }

  // Show feedback
  feedbackResult.className = 'feedback-result ' + (correct ? 'correct' : 'incorrect');
  feedbackResult.textContent = correct ? 'Correct ✅' : 'Not quite ❌';
  feedbackReasons.innerHTML = (s.reasons || []).map(r => `<li>${humanReason(r)}</li>`).join('');
  show(feedbackBox);
  setButtonsEnabled(false);
  updateProgress();
}

function nextScenario(){
  i++;
  if (i >= scenarios.length){
    showResults();
  } else {
    renderCurrent();
  }
}

function showResults(){
  hide(screenGame);
  show(screenResults);

  finalScore.textContent = `${score}/${scenarios.length}`;
  badgeEl.textContent = badgeForScore(score, scenarios.length);

  // Blind spots (sort by highest misses)
  const entries = Object.entries(missesByFlag).sort((a,b)=>b[1]-a[1]);
  if (entries.length === 0){
    blindspots.innerHTML = `<li>No consistent blind spots detected. Great job!</li>`;
  } else {
    blindspots.innerHTML = entries.map(([flag,count]) => `<li><strong>${humanReason(flag)}</strong> — missed ${count} time(s)</li>`).join('');
  }

  // Share link (optional)
  const shareText = encodeURIComponent(`I scored ${score}/${scenarios.length} on the Phishing Awareness Simulator!`);
  shareLink.href = `https://twitter.com/intent/tweet?text=${shareText}`;
}

// Map internal reason codes to friendly strings
function humanReason(code){
  const map = {
    'urgency':'Urgency pressure',
    'lookalike-domain':'Lookalike/misspelled domain',
    'sensitive-info-request':'Requests sensitive info (bank/PAN/password)',
    'misspelled-domain':'Misspelled domain',
    'mismatched-link-text':'Link text does not match actual URL',
    'threat':'Threat of account lock/ban',
    'unusual-request':'Unusual out-of-policy request',
    'external-sender':'External/personal sender for official matter',
    'urgency-secrecy':'Urgency or secrecy instruction',
    'official-domain':'Official sender/domain',
    'no-credentials-requested':'No credentials requested',
    'expected-context':'Expected/normal context',
    'http-not-https':'Uses HTTP (not HTTPS)',
    'unexpected-reset':'Unexpected password reset request',
    'non-official-domain':'Non-official domain',
    'login-request':'Asks you to log in via provided link',
    'promise-of-money':'Too-good-to-be-true refund/payout',
    'too-good-to-be-true':'Too-good-to-be-true reward',
    'unfamiliar-domain':'Unfamiliar or brand-new domain',
    'wallet-connect':'Requests wallet connect',
    'common-context':'Common, non-suspicious context'
  };
  return map[code] || code;
}

function badgeForScore(s, total){
  const pct = (s/total)*100;
  if (pct >= 90) return '🏆 Cyber Sentinel';
  if (pct >= 70) return '🛡️ Cyber Scout';
  if (pct >= 50) return '🔎 Alert Learner';
  return '🌱 Getting Started';
}

// ---- Events
btnStart.addEventListener('click', startGame);
btnPhish.addEventListener('click', ()=> onChoice(true));
btnSafe .addEventListener('click', ()=> onChoice(false));
btnNext .addEventListener('click', nextScenario);
btnReplay.addEventListener('click', ()=>{
  hide(screenResults);
  show(screenStart);
});

// ---- Init
(async function init(){
  fullScenarios = await loadScenarios();
  // display total available in pool (useful for debugging)
  totalEl.textContent = fullScenarios.length;
  // Keep start screen visible; game begins on click
})();
