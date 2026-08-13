(function(){
  const navbar = document.getElementById('navbar');
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');

  window.addEventListener('scroll', () => {
    if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 20);
  }, {passive:true});

  const menuOverlay = document.getElementById('menuOverlay');

  const setMenu = (open) => {
    navLinks?.classList.toggle('open', open);
    document.body.classList.toggle('menu-open', open);
    navToggle?.setAttribute('aria-expanded', open ? 'true' : 'false');
    navToggle?.setAttribute('aria-label', open ? 'Tutup menu' : 'Buka menu');
    menuOverlay?.setAttribute('aria-hidden', open ? 'false' : 'true');
  };

  navToggle?.addEventListener('click', () => {
    setMenu(!navLinks?.classList.contains('open'));
  });

  menuOverlay?.addEventListener('click', () => setMenu(false));

  navLinks?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    setMenu(false);
  }));

  window.addEventListener('resize', () => {
    if (window.innerWidth > 1100) setMenu(false);
  });

  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const target = document.querySelector(a.getAttribute('href'));
      if(target){
        e.preventDefault();
        target.scrollIntoView({behavior:'smooth', block:'start'});
      }
    });
  });

  const reveal = () => {
    document.querySelectorAll('.reveal, .reveal-stagger').forEach(el => {
      if(el.getBoundingClientRect().top < window.innerHeight * .88) el.classList.add('in-view');
    });
  };
  window.addEventListener('scroll', reveal, {passive:true});
  reveal();

  const year = document.getElementById('year');
  if(year) year.textContent = new Date().getFullYear();
})();

(function(){
  const API_URL = "https://kdkmp-ai.jolehaksimpang.workers.dev/chat";

  const fab=document.getElementById('aiFab');
  const chat=document.getElementById('aiChat');
  const close=document.getElementById('aiClose');
  const input=document.getElementById('aiInput');
  const send=document.getElementById('aiSend');
  const body=document.getElementById('aiChatBody');
  if(!fab || !chat) return;

  function openChat(){ chat.classList.add('open'); chat.setAttribute('aria-hidden','false'); setTimeout(()=>input?.focus(),150); }
  function shut(){ chat.classList.remove('open'); chat.setAttribute('aria-hidden','true'); }

  function escapeHTML(text){
    return String(text ?? '')
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#039;');
  }

  function formatAIInline(text){
    return text
      .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
      .replace(/`(.+?)`/g,'<code>$1</code>');
  }

  function renderAIText(text){
    const safe=escapeHTML(text);
    const lines=safe.split(/\r?\n/);
    let html='';
    let inList=false;

    lines.forEach(line=>{
      const trimmed=line.trim();

      if(!trimmed){
        if(inList){ html+='</ul>'; inList=false; }
        return;
      }

      const listMatch=trimmed.match(/^[-*•]\s+(.*)$/);

      if(listMatch){
        if(!inList){ html+='<ul>'; inList=true; }
        html+='<li>'+formatAIInline(listMatch[1])+'</li>';
      }else{
        if(inList){ html+='</ul>'; inList=false; }
        html+='<p>'+formatAIInline(trimmed)+'</p>';
      }
    });

    if(inList) html+='</ul>';
    return html || '<p>Maaf, saya belum mendapatkan jawaban.</p>';
  }

  function addMessage(text, user=false){
    const w=document.createElement('div');
    w.className='ai-message '+(user?'ai-message-user':'ai-message-bot');
    const b=document.createElement('div');
    b.className='ai-bubble';

    if(user){
      b.textContent=text;
    }else{
      b.innerHTML=renderAIText(text);
    }

    w.appendChild(b);
    body.appendChild(w);
    body.scrollTop=body.scrollHeight;
    return w;
  }

  function setBusy(busy){
    send.disabled=busy;
    input.disabled=busy;
    send.style.opacity=busy ? '.6' : '1';
  }

  async function sendMessage(text){
    text=(text||'').trim();
    if(!text || send.disabled) return;

    addMessage(text,true);
    input.value='';
    setBusy(true);
    const typing=addMessage('Sedang mencari jawaban…',false);
    typing.querySelector('.ai-bubble').classList.add('ai-typing');

    try{
      const res=await fetch(API_URL,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({message:text})
      });
      const data=await res.json().catch(()=>({}));
      typing.remove();

      if(!res.ok) throw new Error(data.error || 'Server AI tidak dapat dihubungi.');
      addMessage(data.answer || 'Maaf, saya belum mendapatkan jawaban.',false);
    }catch(err){
      typing.remove();
      addMessage('Maaf, Asisten KDKMP sedang tidak dapat dihubungi. Silakan coba lagi atau hubungi pengurus melalui WhatsApp.',false);
      console.error(err);
    }finally{
      setBusy(false);
      input.focus();
    }
  }

  fab.onclick=()=>chat.classList.contains('open')?shut():openChat();
  close.onclick=shut;
  send.onclick=()=>sendMessage(input.value);
  input.onkeydown=e=>{if(e.key==='Enter')sendMessage(input.value)};
  body.querySelectorAll('.ai-suggestions button').forEach(b=>b.onclick=()=>sendMessage(b.textContent));
})();

(function(){
  document.querySelectorAll('.faq5-q').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const item=btn.closest('.faq5-item');
      const wasOpen=item.classList.contains('open');

      document.querySelectorAll('.faq5-item.open').forEach(openItem=>{
        openItem.classList.remove('open');
      });

      if(!wasOpen) item.classList.add('open');
    });
  });

  const cats=document.querySelectorAll('.faq5-cat');
  const items=document.querySelectorAll('.faq5-item');

  cats.forEach(cat=>{
    cat.addEventListener('click',()=>{
      cats.forEach(c=>c.classList.remove('active'));
      cat.classList.add('active');

      const selected=cat.dataset.cat;

      items.forEach(item=>{
        const show=selected==='all' || item.dataset.cat===selected;
        item.style.display=show ? '' : 'none';
        if(!show) item.classList.remove('open');
      });
    });
  });

  const askAI=document.getElementById('faqAskAI');
  if(askAI){
    askAI.addEventListener('click',()=>{
      const fab=document.getElementById('aiFab');
      if(fab) fab.click();
      setTimeout(()=>{
        const input=document.getElementById('aiInput');
        if(input) input.focus();
      },250);
    });
  }
})();

/* =========================================================
   DARK MODE
   ========================================================= */
(function () {
  const root = document.documentElement;
  const toggle = document.getElementById('themeToggle');

  if (localStorage.getItem('kdkmp-theme') === 'dark') {
    root.classList.add('dark-mode');
  }

  if (!toggle) return;

  function updateThemeButton() {
    const isDark = root.classList.contains('dark-mode');
    toggle.setAttribute('aria-pressed', isDark ? 'true' : 'false');
    toggle.setAttribute('aria-label', isDark ? 'Aktifkan mode terang' : 'Aktifkan mode gelap');
    toggle.setAttribute('title', isDark ? 'Mode terang' : 'Mode gelap');
  }

  updateThemeButton();

  toggle.addEventListener('click', function () {
    const isDark = root.classList.toggle('dark-mode');
    localStorage.setItem('kdkmp-theme', isDark ? 'dark' : 'light');
    updateThemeButton();
  });
})();

/* =========================================================
   NAVIGATION ACTIVE STATE
   ========================================================= */
(function () {
  const links = Array.from(document.querySelectorAll('.nav-links a[href^="#"]'));
  const sections = links
    .map(link => document.querySelector(link.getAttribute('href')))
    .filter(Boolean);

  if (!links.length || !sections.length || !('IntersectionObserver' in window)) return;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      links.forEach(link => link.classList.toggle(
        'active',
        link.getAttribute('href') === '#' + entry.target.id
      ));
    });
  }, { rootMargin: '-30% 0px -55% 0px', threshold: 0 });

  sections.forEach(section => observer.observe(section));
})();

/* =========================================================
   V1.4 — BACK TO TOP
   ========================================================= */
(function () {
  const button = document.getElementById('backToTop');
  if (!button) return;

  const update = () => {
    button.classList.toggle('show', window.scrollY > 520);
  };

  window.addEventListener('scroll', update, { passive: true });
  update();

  button.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();
