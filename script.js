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

  ensureAIFormattingStyles();

  /*
   * =======================================================
   * AI CONVERSATION MEMORY
   * =======================================================
   *
   * Menyimpan percakapan selama chat terbuka.
   * History dikirim ke Worker setiap kali user bertanya.
   *
   * Contoh:
   * User: "Apa itu SHU?"
   * AI:   "SHU adalah..."
   * User: "Cara menghitungnya?"
   *
   * Worker menerima ketiganya sehingga "nya" dapat dipahami
   * sebagai SHU.
   */
  const conversationHistory = [];

  const MAX_LOCAL_HISTORY = 12;
  const MAX_LOCAL_TEXT = 1200;

  /*
   * Styling tambahan untuk formatting jawaban AI.
   * Hanya ditambahkan sekali.
   */
  function ensureAIFormattingStyles(){

    if(document.getElementById('aiFormattingStyles')){
      return;
    }

    const style=document.createElement('style');

    style.id='aiFormattingStyles';

    style.textContent=`
      .ai-bubble p{
        margin:0 0 10px;
      }

      .ai-bubble p:last-child{
        margin-bottom:0;
      }

      .ai-bubble strong{
        font-weight:700;
      }

      .ai-bubble em{
        font-style:italic;
      }

      .ai-bubble code{
        padding:2px 5px;
        border-radius:5px;
        background:rgba(0,0,0,.06);
        font-family:monospace;
        font-size:.92em;
      }

      .ai-bubble .ai-heading{
        margin:12px 0 7px;
        line-height:1.3;
      }

      .ai-bubble .ai-heading-1{
        font-size:1.25em;
      }

      .ai-bubble .ai-heading-2{
        font-size:1.12em;
      }

      .ai-bubble .ai-heading-3{
        font-size:1.03em;
      }

      .ai-bubble .ai-heading-4{
        font-size:1em;
      }

      .ai-bubble .ai-heading-5{
        font-size:.97em;
      }

      .ai-bubble .ai-heading-6{
        font-size:.94em;
      }

      .ai-bubble .ai-list{
        margin:6px 0 10px;
        padding-left:22px;
      }

      .ai-bubble .ai-list li{
        margin:5px 0;
      }

      .ai-bubble .ai-divider{
        border:0;
        border-top:1px solid rgba(0,0,0,.12);
        margin:12px 0;
      }

      .ai-bubble .ai-code{
        margin:8px 0;
        padding:10px 12px;
        overflow-x:auto;
        border-radius:8px;
        background:rgba(0,0,0,.06);
        white-space:pre;
      }

      .ai-bubble .ai-math{
        overflow-x:auto;
        padding:4px 0;
        margin:8px 0;
      }
    `;

    document.head.appendChild(style);
  }


  function openChat(){
    chat.classList.add('open');
    chat.setAttribute('aria-hidden','false');
    setTimeout(()=>input?.focus(),150);
  }

  function shut(){
    chat.classList.remove('open');
    chat.setAttribute('aria-hidden','true');
  }

  function escapeHTML(text){
    return String(text ?? '')
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#039;');
  }

  /*
   * Markdown sederhana.
   *
   * Penting:
   * Rumus LaTeX tidak diubah menjadi HTML biasa.
   * MathJax akan merendernya setelah bubble dibuat.
   */
  function formatAIInline(text){

    /*
     * Formatting Markdown ringan yang aman karena text
     * sudah melalui escapeHTML().
     *
     * Didukung:
     * **tebal**
     * *miring*
     * _miring_
     * `kode`
     */
    return text

      .replace(
        /`([^`]+)`/g,
        '<code>$1</code>'
      )

      .replace(
        /\*\*(.+?)\*\*/g,
        '<strong>$1</strong>'
      )

      .replace(
        /__(.+?)__/g,
        '<strong>$1</strong>'
      )

      .replace(
        /(?<!\*)\*([^*\n]+)\*(?!\*)/g,
        '<em>$1</em>'
      )

      .replace(
        /(?<!_)_([^_\n]+)_(?!_)/g,
        '<em>$1</em>'
      );
  }


  function renderAIText(text){

    const safe=escapeHTML(text);

    /*
     * Lindungi blok matematika sebelum Markdown diproses.
     * Dengan cara ini $$...$$ tidak rusak oleh formatter.
     */
    const mathBlocks=[];
    const mathPlaceholder='___KDKMP_MATH_BLOCK_';

    let protectedText=safe.replace(
      /\$\$([\s\S]*?)\$\$/g,
      function(match){
        const index=mathBlocks.length;
        mathBlocks.push(match);
        return mathPlaceholder+index+'___';
      }
    );


    const lines=
      protectedText.split(/\r?\n/);


    let html='';

    let listType=null;

    let inCodeBlock=false;
    let codeBuffer=[];


    function closeList(){

      if(listType==='ul'){
        html+='</ul>';
      }

      if(listType==='ol'){
        html+='</ol>';
      }

      listType=null;
    }


    function closeCodeBlock(){

      if(!inCodeBlock){
        return;
      }

      html+=
        '<pre class="ai-code"><code>' +
        codeBuffer.join('\n') +
        '</code></pre>';

      codeBuffer=[];
      inCodeBlock=false;
    }


    lines.forEach(line=>{

      const trimmed=line.trim();


      /*
       * Code block Markdown:
       * ```
       */
      if(trimmed==='```'){

        if(inCodeBlock){
          closeCodeBlock();
        }else{

          closeList();

          inCodeBlock=true;
          codeBuffer=[];

        }

        return;
      }


      if(inCodeBlock){

        codeBuffer.push(line);
        return;

      }


      /*
       * Baris kosong.
       */
      if(!trimmed){

        closeList();
        return;

      }


      /*
       * Horizontal rule.
       */
      if(
        /^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)
      ){

        closeList();

        html+='<hr class="ai-divider">';

        return;

      }


      /*
       * Heading Markdown:
       *
       * # Judul
       * ## Judul
       * ### Judul
       */
      const heading=
        trimmed.match(/^(#{1,6})\s+(.+)$/);


      if(heading){

        closeList();

        const level=
          heading[1].length;

        html+=
          '<h' +
          level +
          ' class="ai-heading ai-heading-' +
          level +
          '">' +
          formatAIInline(heading[2]) +
          '</h' +
          level +
          '>';

        return;

      }


      /*
       * Ordered list:
       *
       * 1. Item
       * 2. Item
       */
      const ordered=
        trimmed.match(/^\d+[.)]\s+(.*)$/);


      if(ordered){

        if(listType!=='ol'){

          closeList();

          html+='<ol class="ai-list ai-list-ordered">';

          listType='ol';

        }

        html+=
          '<li>' +
          formatAIInline(ordered[1]) +
          '</li>';

        return;

      }


      /*
       * Unordered list:
       *
       * - Item
       * * Item
       * • Item
       */
      const unordered=
        trimmed.match(/^[-*•]\s+(.*)$/);


      if(unordered){

        if(listType!=='ul'){

          closeList();

          html+='<ul class="ai-list ai-list-unordered">';

          listType='ul';

        }

        html+=
          '<li>' +
          formatAIInline(unordered[1]) +
          '</li>';

        return;

      }


      /*
       * Baris biasa.
       */
      closeList();


      /*
       * Blok matematika.
       */
      if(
        trimmed.startsWith(mathPlaceholder) &&
        trimmed.endsWith('___')
      ){

        html+=
          '<div class="ai-math">' +
          trimmed +
          '</div>';

      }else{

        html+=
          '<p>' +
          formatAIInline(trimmed) +
          '</p>';

      }

    });


    closeList();
    closeCodeBlock();


    /*
     * Kembalikan LaTeX yang dilindungi.
     */
    mathBlocks.forEach((block,index)=>{

      html=
        html.replace(
          mathPlaceholder+index+'___',
          block
        );

    });


    return html ||
      '<p>Maaf, saya belum mendapatkan jawaban.</p>';

  }



  /*
   * Render ulang MathJax setelah bubble ditambahkan.
   */
  async function typesetMath(element){

    if(
      window.MathJax &&
      typeof window.MathJax.typesetPromise === 'function'
    ){
      try{
        await window.MathJax.typesetPromise([element]);
      }catch(error){
        console.warn('MathJax render error:',error);
      }
    }
  }

  function addMessage(text,user=false){

    const w=document.createElement('div');

    w.className=
      'ai-message '+
      (user?'ai-message-user':'ai-message-bot');

    const b=document.createElement('div');

    b.className='ai-bubble';

    if(user){
      b.textContent=text;
    }else{
      b.innerHTML=renderAIText(text);

      /*
       * MathJax berjalan setelah DOM selesai dibuat.
       */
      typesetMath(b);
    }

    w.appendChild(b);

    body.appendChild(w);

    body.scrollTop=body.scrollHeight;

    return w;
  }

  function setBusy(busy){

    send.disabled=busy;
    input.disabled=busy;

    send.style.opacity=
      busy ? '.6' : '1';
  }

  /*
   * Menambahkan pesan ke memory lokal.
   */
  function addToHistory(role,text){

    if(
      !text ||
      typeof text !== 'string'
    ){
      return;
    }

    conversationHistory.push({
      role,
      text:text.trim().slice(0,MAX_LOCAL_TEXT)
    });

    /*
     * Simpan hanya pesan terbaru.
     */
    while(
      conversationHistory.length >
      MAX_LOCAL_HISTORY
    ){
      conversationHistory.shift();
    }
  }

  /*
   * Ambil history yang akan dikirim ke Worker.
   *
   * Kita tidak mengirim object DOM atau data lain,
   * hanya role + text.
   */
  function getHistory(){

    return conversationHistory
      .slice(-MAX_LOCAL_HISTORY)
      .map(item=>({
        role:item.role,
        text:item.text
      }));
  }

  async function sendMessage(text){

    text=(text||'').trim();

    if(
      !text ||
      send.disabled
    ){
      return;
    }

    /*
     * Simpan pertanyaan USER terlebih dahulu.
     */
    addToHistory('user',text);

    addMessage(text,true);

    input.value='';

    setBusy(true);

    const typing=
      addMessage(
        'Sedang mencari jawaban…',
        false
      );

    typing
      .querySelector('.ai-bubble')
      ?.classList.add('ai-typing');


    try{

      const res=
        await fetch(
          API_URL,
          {
            method:'POST',

            headers:{
              'Content-Type':
                'application/json'
            },

            body:
              JSON.stringify({

                message:text,

                /*
                 * INI BAGIAN PENTING.
                 *
                 * History percakapan dikirim
                 * ke Cloudflare Worker.
                 */
                history:getHistory()

              })
          }
        );


      const data=
        await res
          .json()
          .catch(()=>({}));


      typing.remove();


      if(!res.ok){

        throw new Error(
          data.error ||
          'Server AI tidak dapat dihubungi.'
        );

      }


      const answer=
        data.answer ||
        'Maaf, saya belum mendapatkan jawaban.';


      /*
       * Simpan jawaban AI ke conversation memory.
       */
      addToHistory(
        'model',
        answer
      );


      /*
       * Tampilkan jawaban AI.
       */
      addMessage(
        answer,
        false
      );


    }catch(err){

      typing.remove();


      /*
       * Jika request gagal, hapus user message
       * terakhir dari history agar tidak menyebabkan
       * konteks rusak pada request berikutnya.
       */
      const last=
        conversationHistory[
          conversationHistory.length-1
        ];

      if(
        last &&
        last.role==='user' &&
        last.text===text
      ){
        conversationHistory.pop();
      }


      addMessage(
        'Maaf, Asisten KDKMP sedang tidak dapat dihubungi. Silakan coba lagi atau hubungi pengurus melalui WhatsApp.',
        false
      );


      console.error(err);


    }finally{

      setBusy(false);

      input.focus();

    }

  }


  fab.onclick=
    ()=>
      chat.classList.contains('open')
        ? shut()
        : openChat();


  close.onclick=shut;


  send.onclick=
    ()=>sendMessage(input.value);


  input.onkeydown=
    e=>{
      if(e.key==='Enter'){
        sendMessage(input.value);
      }
    };


  body
    .querySelectorAll(
      '.ai-suggestions button'
    )
    .forEach(
      b=>
        b.onclick=
          ()=>sendMessage(b.textContent)
    );

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

/* =========================================================
   V1.5 — OFFICIAL PROFILE COUNTERS
   ========================================================= */
(function(){
  const counters=[...document.querySelectorAll('[data-count]')];
  if(!counters.length) return;

  const formatNumber=(value, decimals)=>{
    return new Intl.NumberFormat('id-ID',{minimumFractionDigits:decimals,maximumFractionDigits:decimals}).format(value);
  };

  const animate=(el)=>{
    if(el.dataset.counted==='true') return;
    el.dataset.counted='true';
    const target=Number(el.dataset.count||0);
    const decimals=Number(el.dataset.decimals||0);
    const suffix=el.dataset.suffix||'';
    const duration=900;
    const start=performance.now();

    const tick=(now)=>{
      const progress=Math.min((now-start)/duration,1);
      const eased=1-Math.pow(1-progress,3);
      el.textContent=formatNumber(target*eased,decimals)+suffix;
      if(progress<1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  if('IntersectionObserver' in window){
    const observer=new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        if(entry.isIntersecting){
          animate(entry.target);
          observer.unobserve(entry.target);
        }
      });
    },{threshold:.35});
    counters.forEach(el=>observer.observe(el));
  }else counters.forEach(animate);
})();
