// Free matching and optional local browser AI. No server AI requests.
let rewriting=false;
const aiBanner=document.createElement('div');
aiBanner.className='ai-notice';
aiBanner.innerHTML='<strong>Your skills. Your projects. Matched to this role.</strong><p>Prioritize existing skills, project order and tech stack for the JD. Missing technologies appear as learning suggestions, never invented experience.</p><label for="rewriteMode">Choose how to tailor</label> <select id="rewriteMode"><option value="instant">Instant free matching — no AI download</option><option value="browser">Optional browser AI — download required</option></select><p id="aiStatus">Free matching runs on your device. No API key or AI rate limit.</p><p id="modeNote">Matching reorders existing content; it does not generate new experience. Browser AI downloads a large model, needs WebGPU and sufficient memory, and may be slow. Its suggestions need review.</p><div id="rewriteError" role="alert"></div>';
$('#stage2').prepend(aiBanner);
const review=document.createElement('div');review.className='card change-review';review.id='changeReview';review.innerHTML='<h3>What changed for this role</h3><p class="subtext">Review the wording against your original experience before downloading.</p><div id="changeItems"></div><h3>Requirements to review</h3><div id="requirementItems"></div>';
$('.editor-tools').prepend(review);
const original=document.createElement('button');original.className='text-button';original.textContent='↔ View original resume';original.onclick=()=>info('Your original resume',`<pre class="original-text">${esc($('#resumeText').value)}</pre>`);$('#fullEditBtn').before(original);
$('#generateBtn').textContent='Tailor for this JD →';
$('#rewriteMode').onchange=()=>{generated=false;$('#generateBtn').textContent='Tailor for this JD →';$('#aiStatus').textContent=$('#rewriteMode').value==='instant'?'Free matching runs on your device. No API key or AI rate limit.':'Browser AI is optional. Model download starts only when you click Tailor.'};
function renderChanges(result){$('#changeItems').innerHTML=result.changes.map(change=>`<details><summary>${esc(change.section)} · View rewrite</summary><small>BEFORE</small><p>${esc(change.before)}</p><small>AFTER</small><p class="after">${esc(change.after)}</p><p class="subtext">${esc(change.reason)}</p></details>`).join('');$('#requirementItems').innerHTML=result.missingRequirements.length?result.missingRequirements.map(x=>`<p class="gap-item">○ ${esc(x)}</p>`).join(''):'<p class="subtext">No additional unsupported requirements were flagged. Please still review the complete JD.</p>';$('#requirementItems').insertAdjacentHTML('beforeend','<p class="subtext">These are not added to your resume. If you have this experience, add accurate details to your source resume and rewrite again.</p>')}
async function requestRewrite(resume,instruction=''){
 const module=await import('./local-tailor.mjs');
 if(instruction&&$('#rewriteMode').value!=='browser')throw new Error('Instant mode supports exact word replacement and manual editing. Select optional Browser AI for wording suggestions.');
 const result=$('#rewriteMode').value==='browser'?await module.browserTailor(resume,$('#jdText').value+(instruction?'\nEditing request: '+instruction:''),text=>$('#aiStatus').textContent=text):module.localTailor(resume,$('#jdText').value);
 result.missingRequirements.push(...(result.suggestions||[]));
 if(!result.changes.length)result.changes.push({section:'review',before:'Existing skills and project order',after:'Kept unchanged',reason:'No keyword-based reordering was needed. Review missing skills and edit manually if needed.'});
 return result;
}
function busy(on){rewriting=on;$('#generateBtn').disabled=on;$('#generateBtn').textContent=on?'Tailoring on your device…':generated?'Apply template →':'Tailor for this JD →';$('#workspace').setAttribute('aria-busy',String(on));$$('.step, #navTemplates, #back1').forEach(b=>b.disabled=on);$('#resumePreview').contentEditable=String(!on);$$('.editor-tools button, .editor-tools input, .actions button').forEach(b=>b.disabled=on)}
$('#generateBtn').onclick=async()=>{
  if(rewriting||!valid())return;
  const template=$('input[name="template"]:checked').value;
  $('#rewriteError').textContent='';
  if(generated){checkpoint();$('#resumePreview').className='resume-sheet '+template;$('#templateLabel').textContent=names[template];showStage(3);return}
  busy(true);
  try{const result=await requestRewrite($('#resumeText').value.trim());$('#resumePreview').innerHTML=textToHTML(result.resume);$('#resumePreview').className='resume-sheet '+template;$('#templateLabel').textContent=names[template];history=[];generated=true;renderChanges(result);renderKeywords();showStage(3);toast('Tailored on your device. Review changes and suggestions.')}catch(error){$('#rewriteError').textContent=error.name==='TimeoutError'?'Rewriting timed out. Your original resume is unchanged. Please try again.':error.message;toast('Could not rewrite yet. See the message above.')}finally{busy(false)}
};
const exactChatHandler=$('#chatForm').onsubmit;
$('#chatForm').onsubmit=async e=>{
  const prompt=$('#chatInput').value.trim();
  if(/^(replace|change)\s+["“]/i.test(prompt)||/^(undo|undo edit)$/i.test(prompt)){exactChatHandler(e);return}
  e.preventDefault();if(!prompt||rewriting)return;
  chat(prompt,true);$('#chatInput').value='';busy(true);
  try{const result=await requestRewrite($('#resumePreview').innerText,prompt);checkpoint();$('#resumePreview').innerHTML=textToHTML(result.resume);renderChanges(result);renderKeywords();chat('Updated the supported wording. Check “What changed for this role”; unsupported requirements are listed separately. You can undo this edit.')}catch(error){chat(error.name==='TimeoutError'?'That edit timed out. Your resume is unchanged.':error.message)}finally{busy(false)}
};
$('#chatInput').placeholder='e.g. replace "old" with "new"';
$('#chatLog').innerHTML='<div class="bubble">Tell me how you want to refine your summary, experience or skills. I’ll keep the same person and facts. For an exact edit, use <b>replace "old" with "new"</b>.</div>';
$('#howBtn').onclick=()=>info('Free tailoring, on your device','<p>Upload your resume and JD, choose a template, then use Instant free matching to prioritize existing skills, technologies and whole projects. It uses keyword matching, not AI rewriting.</p><p>Optional Browser AI downloads a model and suggests wording on compatible devices. Review every claim. Missing skills and project ideas stay separate from your resume.</p><p>Edit manually, use exact word replacement, and export PDF or text. No Groq API or server AI is used.</p>');
$('#privacyBtn').onclick=()=>info('Your resume stays in this tab','<p>Resume extraction and matching run in your browser. Optional Browser AI also runs locally. Resume text is not sent to Groq or another hosted AI API.</p><p>Fonts, PDF/DOCX reader libraries, and optional AI model files are downloaded from external providers. They receive normal download requests, not your resume text. Downloaded model files may be cached by your browser.</p><p>Drafts disappear when you reload or close the tab. Download before leaving.</p>');
$('#chatLog').innerHTML='<div class="bubble">Use <b>replace "old" with "new"</b> for exact edits, or edit the full resume manually. Optional Browser AI can suggest wording; instant mode prioritizes existing content.</div>';
for(const input of ['#resumeText','#jdText'])$(input).addEventListener('input',()=>$('#generateBtn').textContent='Tailor for this JD →');
