// Keep native select values as the source of truth; enhance only the two research filters.
export function enhanceSelects(selects) {
  const widgets=[];let opened=null;
  const chevron='<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m6 8 4 4 4-4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const check='<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m5 10 3 3 7-7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function close(restore=false){if(!opened)return;const w=opened;opened=null;w.popup.hidden=true;w.trigger.setAttribute('aria-expanded','false');w.trigger.removeAttribute('aria-activedescendant');w.trigger.classList.remove('is-open');if(restore)w.trigger.focus()}
  function position(w){const rect=w.trigger.getBoundingClientRect(),margin=12,width=Math.min(Math.max(rect.width,190),window.innerWidth-margin*2);w.popup.style.width=width+'px';w.popup.style.left=Math.max(margin,Math.min(rect.left,window.innerWidth-width-margin))+'px';const spaceBelow=window.innerHeight-rect.bottom-margin,spaceAbove=rect.top-margin;w.popup.style.maxHeight=Math.max(100,Math.min(280,Math.max(spaceBelow,spaceAbove)-8))+'px';const h=w.popup.offsetHeight;w.popup.style.top=(spaceBelow>=h+8||spaceBelow>=spaceAbove?rect.bottom+8:Math.max(margin,rect.top-h-8))+'px'}
  function highlight(w,index){w.active=(index+w.options.length)%w.options.length;w.items.forEach((item,i)=>item.classList.toggle('is-active',i===w.active));w.trigger.setAttribute('aria-activedescendant',w.items[w.active].id);w.items[w.active].scrollIntoView({block:'nearest'})}
  function sync(w){const option=w.select.selectedOptions[0];w.value.textContent=option?.textContent||'';w.trigger.setAttribute('aria-label',w.label+': '+w.value.textContent);w.items.forEach((item,i)=>{const selected=w.options[i].value===w.select.value;item.classList.toggle('is-selected',selected);item.setAttribute('aria-selected',String(selected))})}
  function open(w){if(opened===w){close();return}close();sync(w);opened=w;w.popup.hidden=false;w.trigger.classList.add('is-open');w.trigger.setAttribute('aria-expanded','true');position(w);highlight(w,Math.max(0,w.select.selectedIndex))}
  function choose(w,index){w.select.value=w.options[index].value;sync(w);close(true);w.select.dispatchEvent(new Event('change',{bubbles:true}))}
  for(const select of selects){
    const label=document.querySelector('label[for="'+select.id+'"]');
    const trigger=document.createElement('button');trigger.type='button';trigger.className='select-trigger';trigger.id=select.id+'Trigger';trigger.setAttribute('role','combobox');trigger.setAttribute('aria-haspopup','listbox');trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-controls',select.id+'Options');
    const value=document.createElement('span');value.className='select-value';trigger.append(value);trigger.insertAdjacentHTML('beforeend',chevron);
    const popup=document.createElement('div');popup.id=select.id+'Options';popup.className='select-menu';popup.setAttribute('role','listbox');popup.setAttribute('aria-label',label?.textContent||'Lựa chọn');popup.hidden=true;
    const options=[...select.options];const w={select,trigger,value,popup,options,label:label?.textContent||'Lựa chọn',items:[],active:0};
    options.forEach((option,index)=>{const item=document.createElement('button');item.type='button';item.className='select-option';item.id=select.id+'Option'+index;item.setAttribute('role','option');item.tabIndex=-1;const text=document.createElement('span');text.textContent=option.textContent;item.append(text);item.insertAdjacentHTML('beforeend',check);item.addEventListener('pointerdown',e=>e.preventDefault());item.onclick=()=>choose(w,index);item.onpointermove=()=>{w.active=index;w.items.forEach((el,i)=>el.classList.toggle('is-active',i===index));trigger.setAttribute('aria-activedescendant',item.id)};popup.append(item);w.items.push(item)});
    select.hidden=true;select.tabIndex=-1;select.insertAdjacentElement('afterend',trigger);document.body.append(popup);if(label)label.htmlFor=trigger.id;trigger.onclick=()=>open(w);select.addEventListener('change',()=>sync(w));
    let buffer='',timer;
    trigger.onkeydown=e=>{const keys=['ArrowDown','ArrowUp','Home','End','Enter',' ','Escape','Tab'];if(keys.includes(e.key)){if(e.key==='Tab'){close();return}e.preventDefault();if(e.key==='Escape'){close(true);return}if(e.key==='Enter'||e.key===' '){opened===w?choose(w,w.active):open(w);return}const wasOpen=opened===w;if(!wasOpen)open(w);if(e.key==='Home')highlight(w,0);else if(e.key==='End')highlight(w,w.options.length-1);else if(wasOpen)highlight(w,w.active+(e.key==='ArrowDown'?1:-1));return}if(e.key.length===1&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();buffer+=e.key.toLocaleLowerCase('vi');clearTimeout(timer);timer=setTimeout(()=>buffer='',700);if(opened!==w)open(w);const index=options.findIndex(o=>o.textContent.toLocaleLowerCase('vi').startsWith(buffer));if(index>=0)highlight(w,index)}};
    widgets.push(w);sync(w);
  }
  document.addEventListener('pointerdown',e=>{if(opened&&!opened.trigger.contains(e.target)&&!opened.popup.contains(e.target))close()});
  document.addEventListener('focusin',e=>{if(opened&&!opened.trigger.contains(e.target)&&!opened.popup.contains(e.target))close()});
  window.addEventListener('resize',()=>{if(opened)position(opened)});
  document.addEventListener('scroll',e=>{if(opened&&!opened.popup.contains(e.target))close()},true);
  return ()=>widgets.forEach(sync);
}
