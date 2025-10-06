// ---- Elements
const screenStart   = document.getElementById('screen-start');
const screenGame    = document.getElementById('screen-game');
const screenResults = document.getElementById('screen-results');

const btnStart  = document.getElementById('btn-start');
const btnPhish  = document.getElementById('btn-phish');
const btnSafe   = document.getElementById('btn-safe');
const btnNext   = document.getElementById('btn-next');
const btnReplay = document.getElementById('btn-replay');
const shareLink = document.getElementById('share-link');

const idxEl   = document.getElementById('idx');
const totalEl = document.getElementById('total');
const scoreEl = document.getElementById('score');

const scenarioTitle   = document.getElementById('scenario-title');
const scenarioContent = document.getElementById('scenario-content');

const feedbackBox     = document.getElementById('feedback');
const feedbackResult  = document.getElementById('feedback-result');
const feedbackReasons = document.getElementById('feedback-reasons');

const finalScore = document.getElementById('final-score');
const badgeEl    = document.getElementById('badge');
const blindspots = document.getElementById('blindspots');

// ---- State
let scenarios = [];
let i = 0;
let score = 0;
let missesByFlag = {}; // { flag: count }

// ---- Helpers
function show(el){ el.classList.remove('hidden'); }
function hide(el){ el.classList.add('hidden'); }
function shuffle(arr){
  for (let j = arr.length - 1; j > 0; j--){
    const k = Math.floor(Math.random() * (j + 1));
    [arr[j], arr[k]] = [arr[k], arr[j]];
  }
  return arr;
}
function escapeHtml(str = ''){
  return String(str)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#39;');
}


const titles = ["Trust or Trap?","Don’t Take the Bait","Spot the Scam"];
document.addEventListener("DOMContentLoaded", () => {
  const titleEl = document.getElementById("start-title");
  if (titleEl) titleEl.textContent = titles[Math.floor(Math.random() * titles.length)];
});


function renderScenarioContent(s){
  const c = s.content || {};

  if (s.type === 'email'){
    const fromDisplay = escapeHtml(c.fromDisplay || 'Unknown');
    const fromEmail   = escapeHtml(c.fromEmail || '');
    const subject     = escapeHtml(c.subject || '');
    const body        = escapeHtml(c.body || '');

    const linksHtml = (c.links || []).map(l => {
      const text = escapeHtml(l.text || l.href || '');
      const href = escapeHtml(l.href || '');
      return `
        <div class="email-box link-box">
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

        ${subject ? `
        <div class="email-box subject-box">
          <div class="label">Subject</div>
          <div class="email-text">${subject}</div>
        </div>` : ''}

        <div class="email-box body-box">
          <div class="label">Message</div>
          <div class="email-text">${body}</div>
        </div>

        ${linksHtml}
      </div>
    `;
  }

  if (s.type === 'sms'){
    const fromDisplay = escapeHtml(c.fromDisplay || 'SMS');
    const body        = escapeHtml(c.body || '');
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

  
  return `
    <div class="email">
      <div class="email-box body-box">
        <div class="label">Details</div>
        <pre class="email-text">${escapeHtml(JSON.stringify(c, null, 2))}</pre>
      </div>
    </div>`;
}

function updateProgress(){
  idxEl.textContent = i + 1;
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
    
    const res = await fetch('./scenarios.json');
    if (!res.ok) throw new Error('Failed to load scenarios.json');
    return await res.json();
  }catch(err){
    console.error(err);
    alert('Could not load scenarios.json');
    return [];
  }
}

function startGame(){
  i = 0;
  score = 0;
  missesByFlag = {};
  
  scenarios = shuffle([...scenarios]).slice(0, 10);
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

  if (!correct){
    (s.reasons || []).forEach(flag => {
      missesByFlag[flag] = (missesByFlag[flag] || 0) + 1;
    });
  }

  feedbackResult.className = 'feedback-result ' + (correct ? 'correct' : 'incorrect');
  feedbackResult.textContent = correct ? 'Correct ✅' : 'Not quite ❌';
  feedbackReasons.innerHTML = (s.reasons || []).map(r => `<li>${humanReason(r)}</li>`).join('');
  show(feedbackBox);
  setButtonsEnabled(false);
  updateProgress();
}

function nextScenario(){
  i++;
  if (i >= scenarios.length) showResults();
  else renderCurrent();
}

function showResults(){
  hide(screenGame);
  show(screenResults);

  finalScore.textContent = `${score}/${scenarios.length}`;
  badgeEl.textContent = badgeForScore(score, scenarios.length);

  const entries = Object.entries(missesByFlag).sort((a,b)=>b[1]-a[1]);
  blindspots.innerHTML = entries.length
    ? entries.map(([flag,count]) => `<li><strong>${humanReason(flag)}</strong> — missed ${count} time(s)</li>`).join('')
    : `<li>No consistent blind spots detected. Great job!</li>`;

  const shareText = encodeURIComponent(`I scored ${score}/${scenarios.length} on the Phishing Awareness Simulator!`);
  shareLink.href = `https://twitter.com/intent/tweet?text=${shareText}`;
}

// ---- Labels / Badges
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
btnReplay.addEventListener('click', ()=>{ hide(screenResults); show(screenStart); });


(async function init(){
  scenarios = await loadScenarios();
  totalEl.textContent = scenarios.length;
})();
