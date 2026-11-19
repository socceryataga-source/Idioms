'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const blocks = [
    window.IDIOM_QUIZ_001_100,window.IDIOM_QUIZ_101_200,
    window.IDIOM_QUIZ_201_300,window.IDIOM_QUIZ_301_400,
    window.IDIOM_QUIZ_401_500,window.IDIOM_QUIZ_501_600,
    window.IDIOM_QUIZ_601_700,window.IDIOM_QUIZ_701_800
  ];
  const bank = window.IDIOM_ANSWER_BANK || {};
  const examples = window.IDIOM_EXAMPLES || {};
  let state = null;
  const screens = ['home','quiz','result'];
  const rangeText = b => `NO. ${b*100+1}–${b*100+100}`;
  function showScreen(id) {
    screens.forEach(name => { $('screen-'+name).hidden = name !== id; });
    window.scrollTo({top:0,behavior:'instant'});
  }
  function shuffle(input) {
    const a = [...input];
    for (let i=a.length-1;i>0;i--) {
      const j = Math.floor(Math.random()*(i+1));
      [a[i],a[j]]=[a[j],a[i]];
    }
    return a;
  }
  const byId = new Map(blocks.flat().map(q=>[q.id,q]));
  const sameAnswer = (a,b) => String(a).replace(/\s+/g,'').normalize('NFKC')===String(b).replace(/\s+/g,'').normalize('NFKC');
  function validateData() {
    if (blocks.some((b,i)=>!Array.isArray(b) || b.length!==100)) throw new Error('100問単位の問題データが見つかりません。dataフォルダ内の8つの問題ファイルを確認してください。');
    if (Object.keys(bank).length !== 800 || Object.keys(examples).length !== 800 || byId.size!==800) throw new Error('800問の問題・解答データが揃っていません。');
    for (let i=1;i<=800;i++) {
      const q=byId.get(i);
      if (!q || q.answerId !== i || !q.idiom || !bank[i] || !examples[i] || !Array.isArray(q.distractorIds) || q.distractorIds.length!==3) throw new Error(`No.${i} の問題データを確認してください。`);
      const values=[q.answerId,...q.distractorIds].map(n=>bank[n]);
      if (values.some(v=>!v) || values.some((v,j)=>values.some((w,k)=>j!==k && sameAnswer(v,w)))) throw new Error(`No.${i} の選択肢データに重複・欠落があります。`);
    }
  }
  function startSession(settings, forcedIds=null) {
    const source = forcedIds ? forcedIds.map(id=>byId.get(id)).filter(Boolean) : [...blocks[settings.block]];
    const items = forcedIds ? source : (settings.order==='random' ? shuffle(source) : source).slice(0,settings.count);
    if (!items.length) return;
    state={settings, items, index:0, correct:0, wrongIds:[], answered:false, shownOptions:[], isReview:!!forcedIds};
    $('quiz-range').textContent=rangeText(settings.block)+(forcedIds?' / REVIEW':'');
    showScreen('quiz');
    renderQuestion();
  }
  function makeChoices(question) {
    const all=[question.answerId,...question.distractorIds].map(id=>({id,text:bank[id],correct:id===question.answerId}));
    return shuffle(all);
  }
  function renderQuestion() {
    const s=state,q=s.items[s.index],total=s.items.length;
    s.answered=false;
    s.shownOptions=makeChoices(q);
    $('quiz-counter').textContent=`QUESTION ${String(s.index+1).padStart(2,'0')} / ${total}`;
    $('quiz-score').textContent=`${s.correct} CORRECT`;
    $('progress-fill').style.width=`${s.index/total*100}%`;
    $('progress-track').setAttribute('aria-valuenow',String(Math.round(s.index/total*100)));
    $('question-id').textContent=`IDIOM / ${String(q.id).padStart(3,'0')}`;
    $('quiz-title').textContent=q.idiom;
    $('options').replaceChildren();
    s.shownOptions.forEach((option,i)=> {
      const btn=document.createElement('button');
      btn.type='button';btn.className='option-btn';btn.dataset.position=String(i);
      const letter=document.createElement('span');letter.className='opt-label';letter.textContent='ABCD'[i];
      const words=document.createElement('span');words.className='opt-text';words.textContent=option.text;
      btn.append(letter,words);
      btn.addEventListener('click',()=>answer(i));
      $('options').appendChild(btn);
    });
    $('answer-panel').hidden=true;
    $('next-btn').hidden=true;
    $('quiz-help').textContent='選択肢をタップして解答';
  }
  function answer(i) {
    const s=state;
    if(!s || s.answered || !s.shownOptions[i]) return;
    s.answered=true;
    const q=s.items[s.index], picked=s.shownOptions[i], right=picked.correct;
    if(right) s.correct++; else s.wrongIds.push(q.id);
    [...$('options').children].forEach((button,n)=>{
      button.disabled=true;
      const option=s.shownOptions[n];
      if(option.correct) button.classList.add('is-correct');
      else if(n===i) button.classList.add('is-wrong');
      if(option.correct || n===i){const icon=document.createElement('span');icon.className='option-icon';icon.textContent=option.correct?'✓':'×';button.appendChild(icon);}
    });
    $('answer-heading').textContent=right?'正解！ Excellent!':'惜しい！ Keep going!';
    $('answer-heading').className='answer-heading '+(right?'correct-text':'wrong-text');
    $('answer-detail').textContent=`${q.idiom} ＝ ${bank[q.answerId]}`;
    $('answer-example').textContent=examples[q.id] || ''; 
    $('answer-panel').hidden=false;
    $('quiz-score').textContent=`${s.correct} CORRECT`;
    $('progress-fill').style.width=`${(s.index+1)/s.items.length*100}%`;
    $('progress-track').setAttribute('aria-valuenow',String(Math.round((s.index+1)/s.items.length*100)));
    $('quiz-help').textContent=right?'Nice work!':'正答を確認して次へ進もう';
    $('next-btn').hidden=false;
    $('next-btn').innerHTML = s.index+1===s.items.length ? 'See results <span>→</span>' : 'Next question <span>→</span>';
    $('next-btn').focus({preventScroll:true});
  }
  function next() {
    if(!state || !state.answered)return;
    if(state.index===state.items.length-1){renderResults();return;}
    state.index++;
    renderQuestion();
  }
  function renderResults() {
    const s=state,total=s.items.length,wrong=total-s.correct,percent=Math.round(100*s.correct/total);
    $('result-percent').innerHTML=`${percent}<small>%</small>`;
    $('result-correct').textContent=s.correct;
    $('result-wrong').textContent=wrong;
    $('result-total').textContent=total;
    $('result-message').textContent=percent===100?'Perfect! 全問正解です。この調子で次の範囲にも挑戦！':percent>=80?'Great job! よくできました。間違えた表現も確認して定着させよう。':percent>=50?'Good progress! 復習を重ねて、知っている表現を増やしていこう。':'Every step counts. 間違えた問題を復習して、少しずつ身につけていこう。';
    $('retry-wrong').hidden=wrong===0;
    $('retry-wrong').textContent=`間違えた${wrong}問を復習 ↗`;
    showScreen('result');
  }
  function goHome() {state=null;showScreen('home');}
  function askHome() {
    if(!state || $('screen-home').hidden===false){goHome();return;}
    if($('screen-result').hidden===false){goHome();return;}
    const dialog=$('home-dialog');
    if(typeof dialog.showModal==='function') dialog.showModal();
    else if(window.confirm('学習を中断してHOMEに戻りますか？')) goHome();
  }
  try {validateData();} catch(e) {
    const box=$('data-error');box.hidden=false;box.textContent=e.message;
    $('setup-form').querySelector('button[type="submit"]').disabled=true;
  }
  $('setup-form').addEventListener('submit',e=>{
    e.preventDefault();
    const settings={block:Number($('range-select').value),order:document.querySelector('input[name="order"]:checked').value,count:Number(document.querySelector('input[name="count"]:checked').value)};
    startSession(settings);
  });
  $('next-btn').addEventListener('click',next);
  $('quiz-home').addEventListener('click',askHome);
  $('logo-home').addEventListener('click',e=>{e.preventDefault();askHome();});
  $('cancel-home').addEventListener('click',()=>$('home-dialog').close());
  $('confirm-home').addEventListener('click',()=>{$('home-dialog').close();goHome();});
  $('result-home').addEventListener('click',goHome);
  $('result-home-top').addEventListener('click',goHome);
  $('retry-same').addEventListener('click',()=>{if(state)startSession(state.settings);});
  $('retry-wrong').addEventListener('click',()=>{if(state&&state.wrongIds.length)startSession(state.settings,[...state.wrongIds]);});
  document.addEventListener('keydown',e=>{
    if($('screen-quiz').hidden || !state || e.altKey || e.ctrlKey || e.metaKey || ['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName))return;
    if(state.answered && e.key==='Enter'){e.preventDefault();next();}
    if(!state.answered && ['1','2','3','4'].includes(e.key)){answer(Number(e.key)-1);}
  });
})();
