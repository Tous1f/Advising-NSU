// BatSched app logic
(function(){
  const resultsEl = document.getElementById('results');
  const summaryEl = document.getElementById('summary');
  const btnPreferred = document.getElementById('btnPreferred');
  const btnAll = document.getElementById('btnAll');
  const btn4day = document.getElementById('btn4day');
  const btn5day = document.getElementById('btn5day');
  const openFilters = document.getElementById('openFilters');
  const closeFilters = document.getElementById('closeFilters');
  const filterPanel = document.getElementById('filterPanel');
  const usePrefsEl = document.getElementById('usePrefs');
  const noEarlyEl = document.getElementById('noEarly');
  const noLateEl = document.getElementById('noLate');
  const maxResultsEl = document.getElementById('maxResults');
  const downloadJson = document.getElementById('downloadJson');
  const facultyToggles = document.getElementById('facultyToggles');
  const USER_FACULTY_PREFS = new Set();
  // load persisted faculty prefs
  try{
    const saved = JSON.parse(localStorage.getItem('batsched_fac_prefs')||'[]');
    saved.forEach(s=>USER_FACULTY_PREFS.add(s));
  }catch(e){/* ignore */}

  function timeToMinutes(t){
    // "HH:MM AM" or "HH:MM PM"
    const [time, ampm] = t.split(' ');
    const [h,m] = time.split(':').map(Number);
    let hh = h % 12;
    if(ampm === 'PM') hh += 12;
    return hh*60 + m;
  }

  function parseRange(str){
    const [a,b] = str.split(' - ');
    return { start: timeToMinutes(a), end: timeToMinutes(b) };
  }

  function daysSet(daysStr){ return new Set(daysStr.split('')); }

  function conflicts(a,b){
    const daysA = [...daysSet(a.days)];
    const daysB = [...daysSet(b.days)];
    const common = daysA.filter(d=>daysB.includes(d));
    if(common.length===0) return false;
    const ra = parseRange(a.time); const rb = parseRange(b.time);
    return Math.max(ra.start, rb.start) < Math.min(ra.end, rb.end);
  }

  // Pre-index options by course
  const OPTIONS = {};
  for(const c of COURSES){
    OPTIONS[c.course] = OPTIONS[c.course]||[];
    OPTIONS[c.course].push(c);
  }

  // Ensure labs paired: find lab with same section number
  function findLabFor(section){
    return COURSES.find(c=>c.course==='EEE111L' && c.section===section.section);
  }

  // Backtracking with pruning
  function generate({usePreferences=false, requireDays=null, maxResults=200, noEarly=false, noLate=false}){
    const results = [];
    const req = REQUIRED.slice();

    function backtrack(idx, schedule){
      if(results.length>=maxResults) return;
      if(idx===req.length){
        // final checks: unique day count
        const unique = new Set(schedule.flatMap(s=>s.days.split(''))).size;
        if(requireDays===null || requireDays===unique) results.push(schedule.slice());
        return;
      }

      const courseName = req[idx];
      let candidates = OPTIONS[courseName] || [];
      if(usePreferences){
        const basePrefs = new Set(PREFERENCES[courseName] || []);
        // include faculties the user toggled
        const merged = new Set([...basePrefs, ...USER_FACULTY_PREFS]);
        if(merged.size>0){
          candidates = candidates.filter(c=> merged.has(c.faculty));
        }
      }

      for(const cand of candidates){
        // time filters
        const start = timeToMinutes(cand.time.split(' - ')[0]);
        if(noEarly && start < 9*60) continue;
        if(noLate && start >= 18*60) continue;

        // pair lab for EEE111
        const group = [cand];
        if(courseName==='EEE111'){
          const lab = findLabFor(cand);
          if(!lab) continue;
          group.push(lab);
        }

        // check conflicts with current schedule
        let bad=false;
        for(const g of group){
          for(const s of schedule){ if(conflicts(s,g)){ bad=true; break; } }
          if(bad) break;
        }
        if(bad) continue;

        schedule.push(...group);
        backtrack(idx+1, schedule);
        schedule.splice(-group.length, group.length);
        if(results.length>=maxResults) break;
      }
    }

    backtrack(0, []);
    return results;
  }

  function renderSchedules(list){
    resultsEl.innerHTML = '';
    if(list.length===0){ summaryEl.textContent = 'No schedules found.'; return; }
    summaryEl.textContent = `Found ${list.length} plans`;

    list.forEach((schedule, i)=>{
      const uniqueDays = [...new Set(schedule.flatMap(s=>s.days.split('')))].map(d=>d).length;
      const card = document.createElement('article'); card.className='card';
      const heading = document.createElement('h4'); heading.textContent = `Plan #${i+1} — ${uniqueDays} days/week`;
      card.appendChild(heading);

      const meta = document.createElement('div'); meta.className='meta';
      meta.innerHTML = `<div>${schedule.length} items</div><div class="muted">Auto-generated</div>`;
      card.appendChild(meta);

      // grid summary
      const grid = document.createElement('div'); grid.className='grid';
      schedule.forEach(c=>{
        const cell = document.createElement('div'); cell.className='cell';
        cell.innerHTML = `<strong>${c.course} — S${c.section}</strong><div style="font-size:13px;color:#9aa4b2">${c.faculty}</div><div style="margin-top:6px">${c.days} · ${c.time}</div>`;
        grid.appendChild(cell);
      });
      card.appendChild(grid);

      // timetable view
      const tt = buildTimetable(schedule);
      card.appendChild(tt);

      // actions
      const actions = document.createElement('div'); actions.style.marginTop='8px';
      const copyBtn = document.createElement('button'); copyBtn.className='btn small'; copyBtn.textContent='Copy JSON';
      copyBtn.onclick = ()=>{ navigator.clipboard.writeText(JSON.stringify(schedule,null,2)); };
      actions.appendChild(copyBtn);
      card.appendChild(actions);

      resultsEl.appendChild(card);
    });
  }

  // Build a visual timetable grid for one schedule
  function buildTimetable(schedule){
    // calendar-style timetable: columns per day, vertical minutes from 7:00 to 20:00
    const container = document.createElement('div'); container.className='timetable';
    const days = ['S','M','T','W','R','A','F'];

    // header row
    const header = document.createElement('div'); header.className='tt-grid';
    header.innerHTML = `<div class="tt-cell tt-header">Time</div>` + days.map(d=>`<div class="tt-cell tt-header">${d}</div>`).join('');
    container.appendChild(header);

    // create timeline container with columns
    const timeline = document.createElement('div'); timeline.style.display='grid'; timeline.style.gridTemplateColumns = '80px repeat(7,1fr)'; timeline.style.gap='4px';

    // left column: time markers
    const timesCol = document.createElement('div'); timesCol.style.gridColumn='1/2';
    timesCol.style.display='flex'; timesCol.style.flexDirection='column';
    timesCol.style.gap='6px';

    const startMin = 7*60, endMin = 20*60, totalMin = endMin - startMin;
    const slotCount = 13; // hourly labels
    for(let h=7; h<=20; h++){
      const t = document.createElement('div'); t.className='tt-cell tt-bg'; t.style.height = `${Math.round( (60/totalMin) * 600 )}px`; t.textContent = `${h}:00`;
      timesCol.appendChild(t);
    }
    timeline.appendChild(timesCol);

    // day columns
    for(const d of days){
      const col = document.createElement('div'); col.style.gridColumn='auto'; col.style.position='relative'; col.className='tt-bg'; col.style.minHeight='600px';

      // place course blocks overlapping by time
      schedule.forEach(c=>{
        if(!c.days.includes(d)) return;
        const r = parseRange(c.time);
        const topPct = ((r.start - startMin) / totalMin) * 100;
        const heightPct = ((r.end - r.start) / totalMin) * 100;
        const block = document.createElement('div'); block.className='course-block';
        block.style.position='absolute';
        block.style.left='6px'; block.style.right='6px';
        block.style.top = topPct + '%';
        block.style.height = heightPct + '%';
        block.style.background = 'linear-gradient(180deg, rgba(255,212,64,0.06), rgba(255,212,64,0.02))';
        block.style.border = '1px solid rgba(255,212,64,0.08)';

        // icon and title
        const title = document.createElement('div'); title.style.display='flex'; title.style.alignItems='center';
        title.innerHTML = `<svg class="icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L15 8H9L12 2Z" fill="#ffd400"/></svg><strong style="font-size:13px;margin-left:6px">${c.course} S${c.section}</strong>`;
        const meta = document.createElement('div'); meta.className='meta'; meta.textContent = `${c.faculty} · ${c.time}`;
        block.appendChild(title); block.appendChild(meta);
        col.appendChild(block);
      });

      timeline.appendChild(col);
    }

    container.appendChild(timeline);
    return container;
  }

  // Render faculty toggles dynamically
  function renderFacultyToggles(){
    const faculties = new Set(COURSES.map(c=>c.faculty));
    facultyToggles.innerHTML = '';
    for(const f of faculties){
      const id = 'fac-'+f;
      const wrapper = document.createElement('label'); wrapper.style.display='block';
      const cb = document.createElement('input'); cb.type='checkbox'; cb.id=id; cb.checked = USER_FACULTY_PREFS.has(f) || false;
      cb.onchange = ()=>{
        if(cb.checked) USER_FACULTY_PREFS.add(f); else USER_FACULTY_PREFS.delete(f);
        localStorage.setItem('batsched_fac_prefs', JSON.stringify(Array.from(USER_FACULTY_PREFS)));
      };
      wrapper.appendChild(cb);
      const text = document.createTextNode(' '+f);
      wrapper.appendChild(text);
      facultyToggles.appendChild(wrapper);
    }
  }

  // PWA install prompt handling
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', (e)=>{
    e.preventDefault(); deferredPrompt = e; openFilters.classList.add('installable');
    openFilters.textContent = 'Install';
  });

  openFilters.addEventListener('click', ()=>{
    if(deferredPrompt){ deferredPrompt.prompt(); deferredPrompt.userChoice.then(()=>deferredPrompt=null); return; }
    filterPanel.classList.toggle('hidden');
  });

  // initialize faculty toggles
  renderFacultyToggles();

  // Wire up buttons
  btnPreferred.addEventListener('click', ()=>{
    summaryEl.textContent = 'Generating preferred schedules...';
    setTimeout(()=>{
      const list = generate({usePreferences:true, maxResults: Number(maxResultsEl.value), noEarly: noEarlyEl.checked, noLate: noLateEl.checked});
      renderSchedules(list);
    },50);
  });

  btnAll.addEventListener('click', ()=>{
    summaryEl.textContent = 'Generating all valid schedules...';
    setTimeout(()=>{
      const list = generate({usePreferences:false, maxResults: Number(maxResultsEl.value), noEarly: noEarlyEl.checked, noLate: noLateEl.checked});
      renderSchedules(list);
    },50);
  });

  btn4day.addEventListener('click', ()=>{
    summaryEl.textContent = 'Generating 4-day schedules...';
    setTimeout(()=>{
      const list = generate({usePreferences:false, requireDays:4, maxResults: Number(maxResultsEl.value), noEarly: noEarlyEl.checked, noLate: noLateEl.checked});
      renderSchedules(list);
    },50);
  });

  btn5day.addEventListener('click', ()=>{
    summaryEl.textContent = 'Generating 5-day schedules...';
    setTimeout(()=>{
      const list = generate({usePreferences:false, requireDays:5, maxResults: Number(maxResultsEl.value), noEarly: noEarlyEl.checked, noLate: noLateEl.checked});
      renderSchedules(list);
    },50);
  });

  openFilters.addEventListener('click', ()=> filterPanel.classList.toggle('hidden'));
  closeFilters.addEventListener('click', ()=> filterPanel.classList.add('hidden'));

  downloadJson.addEventListener('click', ()=>{
    const schedules = generate({usePreferences: usePrefsEl.checked, maxResults: Number(maxResultsEl.value), noEarly: noEarlyEl.checked, noLate: noLateEl.checked});
    const blob = new Blob([JSON.stringify(schedules, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'batsched-plans.json'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  });

  // initial quick render (none)
  summaryEl.textContent = 'Ready — click a button to generate plans.';
})();
