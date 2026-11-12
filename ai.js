// Rewriting is server-backed. Never silently substitute keyword sorting for AI.
let rewriting=false;
const aiBanner=document.createElement('div');
aiBanner.className='ai-notice';
aiBanner.innerHTML='<strong>Same person. A resume written for this role.</strong><p>Rewrite your summary, experience bullets and skills around the JD. Your name, contact details, employers, job titles and dates stay fixed. Unsupported requirements are shown for review.</p><span id="aiStatus">Checking AI connection…</span><p>Clicking “Rewrite for this JD” sends the extracted resume text and job description to Groq for rewriting.</p><div id="rewriteError" role="alert"></div>';
$('#stage2').prepend(aiBanner);
const review=document.createElement('div');review.className='card change-review';review.id='changeReview';review.innerHTML='<h3>What changed for this role</h3><p class="subtext">Review the wording against your original experience before downloading.</p><div id="changeItems"></div><h3>Requirements to review</h3><div id="requirementItems"></div>';
$('.editor-tools').prepend(review);
const original=document.createElement('button');original.className='text-button';original.textContent='↔ View original resume';original.onclick=()=>info('Your original resume',`<pre class="original-text">${esc($('#resumeText').value)}</pre>`);$('#fullEditBtn').before(original);
$('#generateBtn').textContent='Rewrite for this JD ✦';
async function checkConnection(){try{if(location.protocol==='file:')throw new Error();const response=await fetch('/api/status');const status=await response.json();$('#aiStatus').textContent=status.configured?'● AI connected · ready to rewrite':'○ AI setup required · no rewrite will be generated until connected';return status.configured}catch{$('#aiStatus').textContent='○ Open the app through its server to use AI rewriting';return false}}
checkConnection();
function renderChanges(result){$('#changeItems').innerHTML=result.changes.map(change=>`<details><summary>${esc(change.section)} · View rewrite</summary><small>BEFORE</small><p>${esc(change.before)}</p><small>AFTER</small><p class="after">${esc(change.after)}</p><p class="subtext">${esc(change.reason)}</p></details>`).join('');$('#requirementItems').innerHTML=result.missingRequirements.length?result.missingRequirements.map(x=>`<p class="gap-item">○ ${esc(x)}</p>`).join(''):'<p class="subtext">No additional unsupported requirements were flagged. Please still review the complete JD.</p>';$('#requirementItems').insertAdjacentHTML('beforeend','<p class="subtext">These are not added to your resume. If you have this experience, add accurate details to your source resume and rewrite again.</p>')}
async function requestRewrite(resume,instruction=''){
  if(location.protocol==='file:')throw new Error('AI rewriting requires the server. Run START.bat, then open http://127.0.0.1:4173.');
  const response=await fetch('/api/tailor',{method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(100000),body:JSON.stringify({resume,jd:$('#jdText').value,instruction})});
  let result;try{result=await response.json()}catch{throw new Error('AI server is unavailable. Start the app using START.bat.')}
  if(!response.ok)throw new Error(result.error||'Rewriting failed. Please try again.');
  if(typeof result.resume!=='string'||!Array.isArray(result.changes)||!Array.isArray(result.missingRequirements))throw new Error('The AI server returned an invalid result. Your resume has not changed.');
  return result;
}
function busy(on){rewriting=on;$('#generateBtn').disabled=on;$('#generateBtn').textContent=on?'Rewriting your resume…':generated?'Apply template →':'Rewrite for this JD ✦';$('#workspace').setAttribute('aria-busy',String(on));$$('.step, #navTemplates, #back1').forEach(b=>b.disabled=on);$('#resumePreview').contentEditable=String(!on);$$('.editor-tools button, .editor-tools input, .actions button').forEach(b=>b.disabled=on)}
$('#generateBtn').onclick=async()=>{
  if(rewriting||!valid())return;
  const template=$('input[name="template"]:checked').value;
  $('#rewriteError').textContent='';
  if(generated){checkpoint();$('#resumePreview').className='resume-sheet '+template;$('#templateLabel').textContent=names[template];showStage(3);return}
  busy(true);
  try{const result=await requestRewrite($('#resumeText').value.trim());$('#resumePreview').innerHTML=textToHTML(result.resume);$('#resumePreview').className='resume-sheet '+template;$('#templateLabel').textContent=names[template];history=[];generated=true;renderChanges(result);renderKeywords();showStage(3);toast('Rewritten for this JD. Compare the changes and review every claim.')}catch(error){$('#rewriteError').textContent=error.name==='TimeoutError'?'Rewriting timed out. Your original resume is unchanged. Please try again.':error.message;toast('Could not rewrite yet. See the message above.')}finally{busy(false)}
};
const exactChatHandler=$('#chatForm').onsubmit;
$('#chatForm').onsubmit=async e=>{
  const prompt=$('#chatInput').value.trim();
  if(/^(replace|change)\s+["“]/i.test(prompt)||/^(undo|undo edit)$/i.test(prompt)){exactChatHandler(e);return}
  e.preventDefault();if(!prompt||rewriting)return;
  chat(prompt,true);$('#chatInput').value='';busy(true);
  try{const result=await requestRewrite($('#resumePreview').innerText,prompt);checkpoint();$('#resumePreview').innerHTML=textToHTML(result.resume);renderChanges(result);renderKeywords();chat('Updated the supported wording. Check “What changed for this role”; unsupported requirements are listed separately. You can undo this edit.')}catch(error){chat(error.name==='TimeoutError'?'That edit timed out. Your resume is unchanged.':error.message)}finally{busy(false)}
};
$('#chatInput').placeholder='e.g. Make my summary more relevant to this JD';
$('#chatLog').innerHTML='<div class="bubble">Tell me how you want to refine your summary, experience or skills. I’ll keep the same person and facts. For an exact edit, use <b>replace "old" with "new"</b>.</div>';
$('#howBtn').onclick=()=>info('Same person. A more relevant resume.','<p><b>1. Resume + JD</b><br>Upload or paste both. Use clear Summary, Experience and Skills headings and bullet points below each job.</p><p><b>2. Rewrite the content</b><br>The AI rewrites the summary, experience wording and skills presentation to match the role, using only evidence from your resume. Identity and employer/title/date lines are preserved by the server.</p><p><b>3. Compare and refine</b><br>Review before/after changes and unsupported requirements. Edit manually or use the AI companion, then export.</p><p>AI connection is required. Original structure preserves section order, not the exact formatting of an uploaded PDF/DOCX. Check the final wording for accuracy.</p>');
$('#privacyBtn').onclick=()=>info('Your resume and AI rewriting','<p>Files are read in your browser. When you click Rewrite or request an AI edit, extracted resume text, the JD and your editing request are sent through this app’s server to Groq. The app does not save drafts or log resume content.</p><p>Groq’s service data handling policies apply. API credentials stay on the server. Fonts and document readers load from Google Fonts and Cloudflare’s CDN.</p><p>Drafts disappear when you close or reload the page. Download before leaving.</p>');
for(const input of ['#resumeText','#jdText'])$(input).addEventListener('input',()=>$('#generateBtn').textContent='Rewrite for this JD ✦');
