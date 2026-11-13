import assert from 'node:assert/strict';
import {parseResume,applyEdits,tailorResume} from './tailoring.mjs';
const resume=`Riya Sharma
riya@example.com | 9876543210
SUMMARY
Designer with 3 years of experience building interfaces and conducting user research.
EXPERIENCE
Product Designer | Acme | 2021 — 2024
• Conducted interviews with 20 customers to understand onboarding problems.
SKILLS
Figma, User research, Prototyping
EDUCATION
B.Des | Design College | 2021`;
const lines=parseResume(resume);
const result={edits:[{lineId:3,replacement:'Designer with 3 years of experience in user research and interface design.',evidence:['3 years of experience','user research'],reason:'Emphasizes the research requirement.'},{lineId:6,replacement:'• Researched onboarding problems through interviews with 20 customers.',evidence:['interviews with 20 customers','onboarding problems'],reason:'Emphasizes research and onboarding.'},{lineId:8,replacement:'User research, Figma, Prototyping',evidence:['Figma, User research, Prototyping'],reason:'Puts the relevant existing skill first.'}],missingRequirements:['SQL is requested but is not evidenced in this resume.']};
const output=applyEdits(lines,result);
assert.equal(output.resume.split('\n')[0],'Riya Sharma');
for(const line of lines.filter(x=>x.kind==='locked'))assert.equal(output.resume.split('\n')[line.id],line.text);
assert.notEqual(output.resume,resume);assert.equal(output.changes.length,3);assert(!output.resume.includes('SQL'));
assert.throws(()=>applyEdits(lines,{...result,edits:[{...result.edits[0],lineId:0,replacement:'Another Person'}]}),/protected field/);
assert.throws(()=>applyEdits(lines,{...result,edits:[{...result.edits[1],replacement:'• Interviewed 50 customers.'}]}),/number or date/);
assert.throws(()=>applyEdits(lines,{...result,edits:[{...result.edits[1],evidence:['Managed engineers']}]}),/linked/);
assert.throws(()=>applyEdits(lines,{...result,edits:[result.edits[0],result.edits[0]]}),/protected/);
await assert.rejects(()=>tailorResume({resume,jd:'User researcher with strong SQL skills'},{},()=>{throw new Error('Must not call service')}),/not configured/);
let request;
const mock=async(url,options)=>{assert.equal(url,'https://api.groq.com/openai/v1/chat/completions');request=JSON.parse(options.body);return {ok:true,json:async()=>({choices:[{finish_reason:'stop',message:{content:JSON.stringify(result)}}]})}};
const rewritten=await tailorResume({resume,jd:'User researcher with strong SQL skills'},{GROQ_API_KEY:'fake-for-test'},mock);
assert.equal(rewritten.resume,output.resume);assert.equal(request.model,'openai/gpt-oss-120b');assert.equal(request.response_format.json_schema.strict,true);assert(!('store' in request));
await assert.rejects(()=>tailorResume({resume,jd:'User researcher with strong SQL skills'},{GROQ_API_KEY:'fake-for-test'},async()=>({ok:true,json:async()=>({choices:[{finish_reason:'length',message:{content:'partial'}}]})})),/incomplete/);
await assert.rejects(()=>tailorResume({resume,jd:'User researcher with strong SQL skills'},{GROQ_API_KEY:'fake-for-test'},async()=>({ok:false,status:429,json:async()=>({error:{code:'credit_balance_exhausted',type:'insufficient_quota'}})})),/quota/);
console.log('PASS: identity/employment preservation, real content changes, unsupported skill exclusion, metrics/evidence/duplicate validation, no-key handling, structured API contract, incomplete and quota errors. API responses were mocked; no live AI request made.');


let calls=0;
const recovered=await tailorResume({resume,jd:'User researcher with strong SQL skills'},{GROQ_API_KEY:'fake-for-test'},async(...args)=>{calls++;return calls===1?{ok:false,status:503,json:async()=>({})}:mock(...args)});
assert.equal(calls,2);assert.equal(recovered.resume,output.resume);
calls=0;
await assert.rejects(()=>tailorResume({resume,jd:'User researcher with strong SQL skills'},{GROQ_API_KEY:'fake-for-test'},async()=>{calls++;return {ok:false,status:422,json:async()=>({error:{message:'PRIVATE RESUME CONTENT'}})}}),/valid draft after retrying/);
assert.equal(calls,2);
calls=0;
await assert.rejects(()=>tailorResume({resume,jd:'User researcher with strong SQL skills'},{GROQ_API_KEY:'fake-for-test'},async()=>{calls++;return {ok:false,status:413,json:async()=>({error:{message:'PRIVATE RESUME CONTENT'}})}}),/size limit/);
assert.equal(calls,1);
console.log('PASS: transient recovery, bounded retry, size-limit guidance and private provider message exclusion.');
const wrapped=parseResume('TEST PERSON\nProfessional Summary\nEngineer with Python experience\nand automation skills.\nEXPERIENCE\nIntern | Example Co | 2023\n• Built a tool to generate\nreports.\nOther Intern | Second Co | 2024\nSKILLS\nPython, SQL\nand Git');
assert.equal(wrapped.find(x=>x.kind==='summary').text,'Engineer with Python experience and automation skills.');
assert.equal(wrapped.find(x=>x.kind==='experience').text,'• Built a tool to generate reports.');
assert(wrapped.some(x=>x.text==='Other Intern | Second Co | 2024'&&x.kind==='locked'));
assert.equal(wrapped.find(x=>x.kind==='skills').text,'Python, SQL and Git');
console.log('PASS: wrapped PDF paragraphs and bullets with protected employment boundaries.');
const typography={...result,edits:[{...result.edits[1],evidence:['onboarding problems'],replacement:'• Researched onboarding problems through interviews with 20 customers.'}]};
assert.equal(applyEdits(lines,typography).changes.length,1);
const mixed={...result,edits:[result.edits[0],{...result.edits[1],replacement:'• Interviewed 50 customers.'}]};
let mixedCalls=0;
const partial=await tailorResume({resume,jd:'User researcher with strong SQL skills'},{GROQ_API_KEY:'fake-for-test'},async()=>{mixedCalls++;return {ok:true,json:async()=>({choices:[{finish_reason:'stop',message:{content:JSON.stringify(mixed)}}]})}});
assert.equal(mixedCalls,1);assert.equal(partial.changes.length,1);assert(partial.resume.includes('20 customers'));assert(partial.missingRequirements.some(x=>x.includes('original lines were retained')));
console.log('PASS: invalid suggestion retained as original while verified edits succeed without an extra API call.');
const {localTailor}=await import('./local-tailor.mjs');
const freeInput='Person Name\nSUMMARY\nEngineer who builds applications.\nSKILLS\nJava, Python, SQL\nEXPERIENCE\nIntern | Company | 2023\n• Built applications.\nPROJECTS\nShop | Java\n• Built shopping tools.\nData Tool | Python, SQL\n• Analysed data with Python.\nEDUCATION\nCollege | 2024';
const free=localTailor(freeInput,'Python SQL engineer with Docker and data analysis');
assert(free.resume.indexOf('Data Tool | Python')<free.resume.indexOf('Shop | Java'));
assert(free.resume.includes('Python, SQL, Java'));assert(!free.resume.includes('Docker'));
assert(free.missingRequirements.some(x=>x.startsWith('Docker:')));assert(free.resume.includes('Intern | Company | 2023'));
assert(!localTailor('Person\nSKILLS\nJavaScript','Java developer').missingRequirements.some(x=>x.startsWith('JavaScript:')));
assert(localTailor('Person\nSKILLS\nJavaScript','Java developer').missingRequirements.some(x=>x.startsWith('Java:')));
console.log('PASS: free local skill ranking, intact project blocks, missing-tech suggestions, no invented skills.');
