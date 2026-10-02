(function(){
  const tabs=[...document.querySelectorAll('.program-tab')];
  const panels=[...document.querySelectorAll('.program-panel-data')];
  const quote=document.getElementById('quote');
  const selectedCount=document.getElementById('selectedCount');
  const form=document.getElementById('enterpriseQuoteForm');
  const message=document.getElementById('formMessage');
  const emailInput=document.getElementById('businessEmail');

  function activate(id,scroll=false){
    tabs.forEach(t=>t.classList.toggle('active',t.dataset.program===id));
    panels.forEach(p=>p.hidden=p.dataset.program!==id);
    if(scroll && quote) quote.scrollIntoView({behavior:'smooth',block:'start'});
  }
  tabs.forEach(tab=>tab.addEventListener('click',()=>activate(tab.dataset.program)));
  activate('board');

  function updateCount(){
    const n=document.querySelectorAll('input[name="services"]:checked').length;
    if(selectedCount) selectedCount.textContent=n + (n===1?' service selected':' services selected');
  }
  document.querySelectorAll('input[name="services"]').forEach(i=>i.addEventListener('change',updateCount));
  document.querySelectorAll('[data-request-service]').forEach(btn=>btn.addEventListener('click',()=>{
    const service=btn.dataset.requestService;
    const checkbox=document.querySelector('input[name="services"][value="'+CSS.escape(service)+'"]');
    if(checkbox) checkbox.checked=true;
    updateCount();
    if(quote) quote.scrollIntoView({behavior:'smooth',block:'center'});
  }));
  document.querySelectorAll('[data-scroll-quote]').forEach(btn=>btn.addEventListener('click',()=>quote&&quote.scrollIntoView({behavior:'smooth'})));

  if(form){form.addEventListener('submit',function(e){
    e.preventDefault();
    const selected=[...document.querySelectorAll('input[name="services"]:checked')].map(x=>x.value);
    if(!selected.length){
      alert('Please select at least one Enterprise service.');
      return;
    }
    // Front-end demo behavior. Replace this handler with the approved backend/email endpoint when ready.
    message.textContent='Thank you. Your Enterprise service request has been captured. A TSEC representative will review the scope and follow up regarding next steps.';
    message.classList.add('show');
    form.reset(); updateCount();
    window.setTimeout(()=>message.classList.remove('show'),9000);
  });}

  document.querySelector('.nav-toggle')?.addEventListener('click',()=>{
    const menu=document.querySelector('.mobile-menu');
    if(menu) menu.classList.toggle('open');
  });
})();

