import test from "node:test";
import assert from "node:assert/strict";
import { chromium, webkit, type Page } from "playwright";
import { startLocalServer } from "../scripts/computed-style-audit";

// Deterministic transport fixture: real browser requests, no requests to the vendor.
// A script removed without destruct leaves this counter running, exposing the old defect.
const tagFixture = `(() => {
 const queue = window.ym.a; const queued = Array.from(queue); let timer;
 window.__goals = window.__goals || [];
 const dispatch = (...args) => {
   window.__goals.push(args);
   if (args[1] === 'init') { clearInterval(timer); timer = setInterval(() => fetch('https://mc.yandex.ru/watch/' + args[0] + '?fixture=1').catch(()=>{}), 40); }
   if (args[1] === 'destruct') clearInterval(timer);
 };
 // The real vendor observes this exact array: replacing ym.a disconnects dispatch.
 const push = queue.push.bind(queue);
 queue.push = (...calls) => { calls.forEach(args => dispatch(...args)); return push(...calls); };
 queued.forEach(args => dispatch(...args));
})();`;
async function fixtures(page: Page) {
 await page.route('https://mc.yandex.ru/metrika/tag.js', r => r.fulfill({contentType:'text/javascript',body:tagFixture}));
 await page.route('https://mc.yandex.ru/watch/**', r => r.fulfill({status:204,headers:{'access-control-allow-origin':'*'}}));
 await page.route('**/api/**', r => r.fulfill({contentType:'application/json',body:JSON.stringify({available:false, csrfToken:'local-fixture'})}));
}
const goals = (page: Page) => page.evaluate(() => (window as any).__goals || []);
async function grant(page: Page) {
 const settings = page.getByRole('button',{name:'Настройки cookie',exact:true});
 if (!(await page.getByRole('button',{name:'Принять аналитику',exact:true}).isVisible())) await settings.click();
 await page.getByRole('button',{name:'Принять аналитику',exact:true}).click();
 await page.waitForFunction(() => ((window as any).__goals || []).some((a:any[])=>a[1]==='init'));
}

test('React/static counters require consent, stop requests on withdrawal and resume once', async () => {
 const {server, origin}=await startLocalServer(); const browser=await chromium.launch();
 try {
  for (const route of ['/', '/photo']) {
   const context=await browser.newContext(); const page=await context.newPage(); await fixtures(page);
   let watchRequests=0; page.on('request',r=>{if(r.url().includes('/watch/')) watchRequests++;});
   await page.goto(origin+route); await page.waitForTimeout(150);
   assert.equal(watchRequests,0,route+' before consent');
   await grant(page); await page.waitForTimeout(200); assert.ok(watchRequests>1,route+' counter active');
   await page.getByRole('button',{name:'Настройки cookie',exact:true}).click();
   await page.getByRole('button',{name:'Только необходимые',exact:true}).click();
   await page.waitForTimeout(100); const stopped=watchRequests; await page.waitForTimeout(200);
   assert.equal(watchRequests,stopped,route+' no requests after withdrawal');
   assert.ok((await goals(page)).some((a:any[])=>a[1]==='destruct'));
   await grant(page); await page.waitForTimeout(150); assert.ok(watchRequests>stopped);
   assert.equal((await goals(page)).filter((a:any[])=>a[1]==='init').length,2);
   assert.equal(await page.locator('script[src="https://mc.yandex.ru/metrika/tag.js"]').count(),1);
   await context.close();
  }
 } finally {await browser.close();server.close();}
});

test('Only actual portfolio pages produce portfolio_view; private pages remain quiet',async()=>{
 const {server, origin}=await startLocalServer(); const browser=await chromium.launch();
 try {
  for(const route of ['/','/portfolio','/journal','/account']) {
   const context=await browser.newContext(); const page=await context.newPage();await fixtures(page);
   await page.addInitScript(()=>localStorage.setItem('cookie_consent_v2',JSON.stringify({analytics:true})));
   await page.goto(origin+route);await page.waitForTimeout(200);
   const captured=await goals(page);
   assert.equal(captured.filter((a:any[])=>a[2]==='portfolio_view').length,route==='/portfolio'?1:0,route);
   if(['/journal','/account'].includes(route)) assert.equal(captured.length,0,route);
   await context.close();
  }
 }finally{await browser.close();server.close();}
});

test('Homepage and calculator count leads only after a successful server body',async()=>{
 const {server,origin}=await startLocalServer();const browser=await chromium.launch();
 try{
  for(const route of ['/contact?service=reels&from=%2Freels','/calculator?service=photo-studio&from=%2Fphoto']){
   const context=await browser.newContext();const page=await context.newPage();await fixtures(page);
   await page.goto(origin+route);await grant(page);
   let responseOk=false;
   let submittedPayload:any=null;
   await page.route('**/api/send-form',r=>{
    submittedPayload=r.request().postDataJSON();
    return r.fulfill({contentType:'application/json',body:JSON.stringify({ok:responseOk})});
   });
   if(route.startsWith('/contact')){
    assert.equal(await page.locator('.v3-form select').inputValue(),'Reels','known service context is preselected');
    await page.getByPlaceholder('Имя или компания').fill('Локальный тест');
    await page.getByPlaceholder('Telegram, email или телефон').fill('@local_test');
    await page.locator('.v3-form select').selectOption('Фотосъёмка');
    await page.locator('.v3-form textarea').fill('Локальная проверка формы без внешней доставки');
    await page.locator('.v3-form input[type=checkbox]').nth(0).focus();
    await page.keyboard.press('Space');
    assert.ok(await page.locator('.v3-form input[type=checkbox]').nth(0).isChecked());
    await page.locator('.v3-form input[type=checkbox]').nth(1).focus();
    await page.keyboard.press('Space');
    assert.ok(await page.locator('.v3-form input[type=checkbox]').nth(1).isChecked());
    await page.getByRole('button',{name:'ОТПРАВИТЬ ЗАДАЧУ'}).click();await page.getByRole('alert').waitFor();
   }else{
    await page.waitForFunction(() => document.querySelector('.calc-type[data-active="true"]')?.textContent?.includes('Студийная фотосъёмка'));
    await page.getByRole('button',{name:'Студийная фотосъёмка',exact:true}).click();
    await page.getByPlaceholder('Как к вам обращаться').fill('Локальный тест');
    await page.getByPlaceholder('Телефон, напр. +7 999 123-45-67').fill('+7 999 123-45-67');
    await page.getByRole('checkbox',{name:/Даю согласие/}).check();
    await page.getByRole('button',{name:'Отправить заявку',exact:true}).click();
    await page.getByText('Не удалось отправить заявку.',{exact:false}).waitFor();
    assert.equal((await goals(page)).filter((a:any[])=>a[2]==='calculator_use').length,1);
   }
   assert.equal((await goals(page)).filter((a:any[])=>a[2]==='lead_submit').length,0,'HTTP 200 ok:false is not success');
   responseOk=true;
   await page.getByRole('button',{name:route.startsWith('/contact')?'ОТПРАВИТЬ ЗАДАЧУ':'Отправить заявку',exact:true}).click();
   await page.waitForFunction(()=>((window as any).__goals||[]).some((a:any[])=>a[2]==='lead_submit'));
   if(route.startsWith('/contact')){
    assert.equal(submittedPayload?.service,'Фотосъёмка','manual selection overrides the preselected service');
    assert.equal(submittedPayload?.source,'/reels');
    assert.equal(submittedPayload?.pageUrl,'/reels');
   }else{
    assert.equal(submittedPayload?.service,'Студийная фотосъёмка');
    assert.match(submittedPayload?.message||'',/Студийная фотосъёмка/u);
    assert.match(submittedPayload?.message||'',/ИТОГ:/u);
    assert.equal(submittedPayload?.formId,'calculator-lead');
    assert.equal(submittedPayload?.pageUrl,'/photo','calculator inquiry keeps its allowlisted source page');
   }
   const captured=await goals(page);assert.equal(captured.filter((a:any[])=>a[2]==='lead_submit').length,1);
   const payload=JSON.stringify(captured.filter((a:any[])=>a[1]==='reachGoal'));
   assert.doesNotMatch(payload,/local_test|999|Локальный тест|внешней доставки/);
   await context.close();
  }
 }finally{await browser.close();server.close();}
});

test('failed lead delivery keeps the draft and offers a complete direct-contact message', async () => {
 const local = await startLocalServer();
 try {
  for (const engine of [chromium, webkit]) {
   const browser = await engine.launch();
   try {
    for (const width of [390, 1440]) {
     for (const path of ['/contact', '/calculator?service=photo-studio&from=%2Fphoto']) {
      const page = await browser.newPage({viewport:{width,height:900}}); await fixtures(page);
      await page.goto(local.origin+path); await page.evaluate(()=>document.fonts.ready);
      const consent = page.getByRole('button',{name:'Только необходимые',exact:true});
      if (await consent.isVisible()) await consent.click();
      const calculator=path.startsWith('/calculator');
      if(calculator){
       await page.waitForFunction(()=>document.querySelector('.calc-type[data-active="true"]')?.textContent?.includes('Студийная фотосъёмка'));
       await page.getByPlaceholder('Как к вам обращаться').fill('Локальный тест');
       await page.getByPlaceholder('Телефон, напр. +7 999 123-45-67').fill('+7 999 123-45-67');
       await page.locator('.calc-textarea').fill('Сохранить этот текст после ошибки');
       await page.getByRole('checkbox',{name:/Даю согласие/}).check();
      }else{
       await page.getByPlaceholder('Имя или компания').fill('Локальный тест');
       await page.getByPlaceholder('Telegram, email или телефон').fill('@local_test');
       await page.locator('.v3-form textarea').fill('Сохранить этот текст после ошибки');
       for(const node of await page.locator('.v3-form input[type=checkbox]').all()) {await node.focus();await page.keyboard.press('Space');}
      }
      for(const failure of ['504','timedout','failed']){
       await page.route('**/api/send-form',r=>failure==='504'?r.fulfill({status:504,contentType:'text/html',body:'Gateway timeout'}):r.abort(failure));
       const submit=page.getByRole('button',{name:calculator?'Отправить заявку':'ОТПРАВИТЬ ЗАДАЧУ',exact:true});
       await submit.click(); await page.getByRole('alert').waitFor();
       assert.equal(await page.locator(calculator?'.calc-textarea':'.v3-form textarea').inputValue(),'Сохранить этот текст после ошибки');
       assert.equal(await page.getByPlaceholder(calculator?'Как к вам обращаться':'Имя или компания').inputValue(),'Локальный тест');
       assert.equal(await submit.isEnabled(),true,'a failed attempt may be retried');
       assert.equal(await page.getByText('Заявка отправлена.',{exact:false}).count(),0);
       const fallback=page.getByRole('link',{name:'Отправить в Telegram',exact:false});
       assert.equal(await fallback.count(),1); assert.equal(await fallback.isVisible(),true);
       const url=new URL((await fallback.getAttribute('href'))!);
       assert.equal(url.origin+url.pathname,'https://t.me/YuriElygin');
       const text=url.searchParams.get('text')!;
       assert.ok(text.includes('Локальный тест')&&text.includes('Сохранить этот текст после ошибки'));
       assert.ok(text.includes(calculator?'+7 999 123-45-67':'@local_test'),'fallback retains the sender contact');
       if(calculator) assert.match(text,/Позиции:.*\nДополнения:/u);
       assert.equal(await page.getByRole('link',{name:'y.elyginn@gmail.com',exact:true}).last().getAttribute('href'),'mailto:y.elyginn@gmail.com');
       assert.equal((await goals(page)).filter((a:any[])=>a[2]==='lead_submit').length,0);
       assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth),false);
       await page.unroute('**/api/send-form');
      }
      await page.close();
     }
    }
   } finally {await browser.close();}
  }
 } finally {local.server.closeAllConnections();await new Promise<void>(resolve=>local.server.close(()=>resolve()));}
});
