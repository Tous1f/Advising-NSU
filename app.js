// CourseWizard - Advanced Schedule Generation Logic
// CourseWizard - Advanced Schedule Generation System
window.addEventListener('load', function() {
  'use strict';
  
  // Application state
  let state = {
    currentStep: 'courses',
    selectedCourses: new Set(),
    selectedFaculty: new Map(),
    filters: {
      timeStart: null,
      timeEnd: null,
      days: new Set(),
      avoidGaps: false,
      balancedLoad: false,
      maxResults: 50,
      minimumGap: 15
    },
    view: localStorage.getItem('view') || 'list',
    darkMode: localStorage.getItem('darkMode') === 'true',
    schedules: [],
    loading: false
  };
  
  // UI Elements cache
  let elements = {
    return new Proxy({
      sidebar: document.getElementById('sidebar'),
      stepNavigation: document.getElementById('stepNavigation'),
      toggleSidebar: document.getElementById('toggleSidebar'),
      courseSearch: document.getElementById('courseSearch'),
      facultySearch: document.getElementById('facultySearch'),
      btnGenerateRoutine: document.getElementById('btnGenerateRoutine'),
      btnReset: document.getElementById('btnReset'),
      themeToggle: document.getElementById('themeToggle'),
      btnNext: document.getElementById('btnNext'),
      btnBack: document.getElementById('btnBack'),
      btnListView: document.getElementById('btnListView'),
      btnGridView: document.getElementById('btnGridView'),
      resultsSection: document.getElementById('results'),
      noResults: document.getElementById('noResults'),
      toast: document.getElementById('toast'),
      toastMessage: document.getElementById('toastMessage'),
      facultyToggles: document.getElementById('facultyToggles'),
      courseList: document.getElementById('courseList')
    }, {
      get(target, prop) {
        const element = target[prop];
        if (!element) {
          console.error(`Missing DOM element: ${prop}`);
          return document.createElement('div');
        }
        return element;
      }
    });
  }
  };

  // Core Schedule Generator Class
  class ScheduleGenerator {
    constructor(state) {
      this.courses = COURSES;
      this.state = state;
      this.preferences = {
        avoidGaps: state.filters.avoidGaps,
        balancedLoad: state.filters.balancedLoad,
        preferredTimeStart: state.filters.timeStart,
        preferredTimeEnd: state.filters.timeEnd,
        preferredDays: state.filters.days,
        facultyPreferences: state.selectedFaculty
      };
    }

    validateTimeFormat(timeStr) {
      return /^\d{2}:\d{2} [AP]M - \d{2}:\d{2} [AP]M$/.test(timeStr);
    }

    parseTimeRange(timeStr) {
      if (!this.validateTimeFormat(timeStr)) {
        console.error('Invalid time format:', timeStr);
        return null;
      }
      return parseRange(timeStr);
    }

    conflicts(a, b) {
      // Input validation
      if (!a || !b || !a.days || !b.days || !a.time || !b.time) {
        console.error('Invalid course data:', { a, b });
        return true;
      }

      try {
        // Day overlap check
        const daysA = new Set([...daysSet(a.days)]);
        const daysB = new Set([...daysSet(b.days)]);
        const commonDays = [...daysA].filter(d => daysB.has(d));
        if (commonDays.length === 0) return false;

        // Time parsing and validation
        const ra = this.parseTimeRange(a.time);
        const rb = this.parseTimeRange(b.time);
        
        if (!ra || !rb) {
          console.error('Invalid time format:', { a: a.time, b: b.time });
          return true;
        }

        // Gap checking with configurable minimum
        const minGap = this.preferences.minimumGap || 15; // minutes
        if (this.preferences.avoidGaps) {
          const gapBetweenClasses = Math.min(
            Math.abs(ra.end - rb.start),
            Math.abs(rb.end - ra.start)
          );
          
          if (gapBetweenClasses < minGap) {
            console.debug(`Gap too small (${gapBetweenClasses} min) between:`, 
              { course1: a.course, time1: a.time, course2: b.course, time2: b.time });
            return true;
          }
        }

        // Actual time overlap check
        const hasOverlap = Math.max(ra.start, rb.start) < Math.min(ra.end, rb.end);
        
        if (hasOverlap) {
          console.debug('Time overlap detected between:', 
            { course1: a.course, time1: a.time, course2: b.course, time2: b.time });
        }
        
        return hasOverlap;
      } catch (error) {
        console.error('Error in conflict detection:', error, { course1: a, course2: b });
        throw new Error(`Schedule conflict error: ${error.message}`);
      }
    }

    validateSchedule(schedule) {
      // Check for required course pairs
      const courseSet = new Set(schedule.map(c => c.course));
      const requiredPairs = [
        ['EEE111', 'EEE111L']
      ];

      for (const [course1, course2] of requiredPairs) {
        if (courseSet.has(course1) || courseSet.has(course2)) {
          if (!courseSet.has(course1) || !courseSet.has(course2)) {
            return false;
          }
        }
      }

      // Check time conflicts
      for (let i = 0; i < schedule.length; i++) {
        for (let j = i + 1; j < schedule.length; j++) {
          if (this.conflicts(schedule[i], schedule[j])) {
            return false;
          }
        }
      }

      // Check preferred time range
      if (this.preferences.preferredTimeStart || this.preferences.preferredTimeEnd) {
        for (const course of schedule) {
          const time = this.parseTimeRange(course.time);
          if (!time) return false;
          
          if (this.preferences.preferredTimeStart && 
              time.start < this.preferences.preferredTimeStart * 60) {
            return false;
          }
          if (this.preferences.preferredTimeEnd && 
              time.end > this.preferences.preferredTimeEnd * 60) {
            return false;
          }
        }
      }

      // Check preferred days
      if (this.preferences.preferredDays.size > 0) {
        for (const course of schedule) {
          const courseDays = [...daysSet(course.days)];
          if (!courseDays.some(day => this.preferences.preferredDays.has(day))) {
            return false;
          }
        }
      }

      // Validate course load balance
      if (this.preferences.balancedLoad) {
        const dailyLoad = {};
        for (const course of schedule) {
          for (const day of course.days) {
            dailyLoad[day] = (dailyLoad[day] || 0) + 1;
          }
        }
        const loads = Object.values(dailyLoad);
        const maxLoad = Math.max(...loads);
        const minLoad = Math.min(...loads);
        if (maxLoad - minLoad > 2) {
          return false;
        }
      }

      return true;
    }

    calculateScheduleScore(schedule) {
      let score = 100; // Base score

      // Preferred faculty bonus
      for (const course of schedule) {
        if (this.preferences.facultyPreferences.get(course.course)?.has(course.faculty)) {
          score += 20;
        }
      }

      // Time distribution penalties
      const timeSlots = schedule.map(c => this.parseTimeRange(c.time)).filter(Boolean);
      const gaps = [];
      for (let i = 0; i < timeSlots.length - 1; i++) {
        for (let j = i + 1; j < timeSlots.length; j++) {
          const gap = Math.abs(timeSlots[i].end - timeSlots[j].start);
          if (gap > 0 && gap < 60) {
            gaps.push(gap);
          }
        }
      }
      score -= gaps.length * 5;

      // Daily load balance score
      const dailyLoad = {};
      for (const course of schedule) {
        for (const day of course.days) {
          dailyLoad[day] = (dailyLoad[day] || 0) + 1;
        }
      }
      const loads = Object.values(dailyLoad);
      const variance = loads.reduce((acc, val) => 
        acc + Math.pow(val - (loads.reduce((a, b) => a + b) / loads.length), 2), 0
      ) / loads.length;
      score -= variance * 10;

      return Math.max(0, score);
    }

    generateSchedules() {
      this.state.loading = true;
      const results = [];
      const maxResults = this.state.filters.maxResults || 50;
      const requiredCourses = [...this.state.selectedCourses];
      
      // Filter sections based on preferences
      const selectedSections = this.courses.filter(c => 
        requiredCourses.includes(c.course) &&
        (!this.state.selectedFaculty.get(c.course)?.size || 
         this.state.selectedFaculty.get(c.course).has(c.faculty))
      );

      const backtrack = (courseIndex, currentSchedule) => {
        if (results.length >= maxResults) return;
        
        if (courseIndex === requiredCourses.length) {
          if (this.validateSchedule(currentSchedule)) {
            const score = this.calculateScheduleScore(currentSchedule);
            // Insert schedule in sorted order by score
            const insertIndex = results.findIndex(r => r.score < score);
            if (insertIndex === -1) {
              results.push({ schedule: [...currentSchedule], score });
            } else {
              results.splice(insertIndex, 0, { schedule: [...currentSchedule], score });
            }
            if (results.length > maxResults) {
              results.pop();
            }
          }
          return;
        }

        const currentCourse = requiredCourses[courseIndex];
        const sections = selectedSections.filter(s => s.course === currentCourse);

        for (const section of sections) {
          if (currentSchedule.every(c => !this.conflicts(c, section))) {
            currentSchedule.push(section);
            backtrack(courseIndex + 1, currentSchedule);
            currentSchedule.pop();
          }
        }
      };

      backtrack(0, []);
      this.state.loading = false;
      return results.map(r => r.schedule);
    }
  }

  // Reactive State Management
  class AppState {
    constructor() {
      this._state = {
        currentStep: 'courses',
        selectedCourses: new Set(),
        selectedFaculty: new Map(),
        filters: {
          timeStart: null,
          timeEnd: null,
          days: new Set(),
          avoidGaps: false,
          balancedLoad: false,
          maxResults: 50,
          minimumGap: 15
        },
        view: localStorage.getItem('view') || 'list',
        darkMode: localStorage.getItem('darkMode') === 'true',
        schedules: [],
        loading: false
      };
      
      this._observers = new Map();
      this._scheduleGenerator = null;
      this.initializeFromStorage();
    }

    // State access and mutation
    get state() { return {...this._state}; }
    
    setState(newState, notify = true) {
      const oldState = {...this._state};
      this._state = {...this._state, ...newState};
      
      if (notify) {
        this.notifyObservers(oldState);
      }
      this.persistToStorage();
    }

    // Observer pattern implementation
    subscribe(key, callback) {
      if (!this._observers.has(key)) {
        this._observers.set(key, new Set());
      }
      this._observers.get(key).add(callback);
      
      // Initial call with current state
      callback(this._state);
      
      return () => this.unsubscribe(key, callback);
    }

    unsubscribe(key, callback) {
      if (this._observers.has(key)) {
        this._observers.get(key).delete(callback);
      }
    }

    notifyObservers(oldState) {
      for (const [key, observers] of this._observers) {
        for (const callback of observers) {
          callback(this._state, oldState);
        }
      }
    }

    // Storage management
    initializeFromStorage() {
      try {
        const storedFilters = JSON.parse(localStorage.getItem('filters'));
        const storedCourses = JSON.parse(localStorage.getItem('selectedCourses'));
        const storedFaculty = JSON.parse(localStorage.getItem('selectedFaculty'));
        
        if (storedFilters) this._state.filters = {...this._state.filters, ...storedFilters};
        if (storedCourses) this._state.selectedCourses = new Set(storedCourses);
        if (storedFaculty) this._state.selectedFaculty = new Map(storedFaculty);
      } catch (error) {
        console.warn('Error loading from storage:', error);
      }
    }

    persistToStorage() {
      try {
        localStorage.setItem('filters', JSON.stringify(this._state.filters));
        localStorage.setItem('selectedCourses', 
          JSON.stringify([...this._state.selectedCourses]));
        localStorage.setItem('selectedFaculty', 
          JSON.stringify([...this._state.selectedFaculty]));
        localStorage.setItem('view', this._state.view);
        localStorage.setItem('darkMode', this._state.darkMode);
      } catch (error) {
        console.warn('Error saving to storage:', error);
      }
    }

    // Schedule generation
    initScheduleGenerator() {
      this._scheduleGenerator = new ScheduleGenerator(this._state);
    }

    generateSchedules() {
      if (!this._scheduleGenerator) {
        this.initScheduleGenerator();
      }
      return this._scheduleGenerator.generateSchedules();
    }
  }

  // Initialize global state
  const appState = new AppState();

  // DOM Elements with error checking
  const elements = new Proxy({
    sidebar: document.getElementById('sidebar'),
    stepNavigation: document.getElementById('stepNavigation'),
    toggleSidebar: document.getElementById('toggleSidebar'),
    courseSearch: document.getElementById('courseSearch'),
    facultySearch: document.getElementById('facultySearch'),
    btnGenerateRoutine: document.getElementById('btnGenerateRoutine'),
    btnReset: document.getElementById('btnReset'),
    themeToggle: document.getElementById('themeToggle'),
    btnNext: document.getElementById('btnNext'),
    btnBack: document.getElementById('btnBack'),
    btnListView: document.getElementById('btnListView'),
    btnGridView: document.getElementById('btnGridView'),
    resultsSection: document.getElementById('results'),
    noResults: document.getElementById('noResults'),
    toast: document.getElementById('toast'),
    toastMessage: document.getElementById('toastMessage')
  }, {
    get(target, prop) {
      const element = target[prop];
      if (!element) {
        console.error(`Missing DOM element: ${prop}`);
        return document.createElement('div'); // Fallback
      }
      return element;
    }
  });
  // Utility Functions with Error Handling
  class UIManager {
    static showToast(message, type = 'info') {
      try {
        elements.toastMessage.textContent = message;
        elements.toast.className = `toast ${type} visible`;
        setTimeout(() => {
          elements.toast.classList.remove('visible');
          elements.toast.classList.add('hidden');
        }, 3000);
      } catch (error) {
        console.error('Error showing toast:', error);
      }
    }

    static toggleTheme() {
      try {
        const newDarkMode = !appState.state.darkMode;
        appState.setState({ darkMode: newDarkMode });
        document.body.classList.toggle('dark-theme', newDarkMode);
        elements.themeToggle.setAttribute('aria-pressed', String(newDarkMode));
        elements.themeToggle.setAttribute('aria-label', 
          `Switch to ${newDarkMode ? 'light' : 'dark'} theme`);
      } catch (error) {
        console.error('Error toggling theme:', error);
      }
    }

    static setView(view) {
      try {
        appState.setState({ view });
        elements.btnListView.classList.toggle('active', view === 'list');
        elements.btnGridView.classList.toggle('active', view === 'grid');
        elements.resultsSection.classList.toggle('grid-view', view === 'grid');
      } catch (error) {
        console.error('Error setting view:', error);
      }
    }

    static updateLoadingState(loading) {
      try {
        elements.btnGenerateRoutine.classList.toggle('loading', loading);
        elements.btnGenerateRoutine.disabled = loading;
        elements.btnGenerateRoutine.innerHTML = loading ? 
          '<i class="fas fa-spinner fa-spin"></i> Generating...' :
          '<i class="fas fa-wand-sparkles"></i> Generate Schedule';
      } catch (error) {
        console.error('Error updating loading state:', error);
      }
    }
  }

  // Initialize UI State
  document.body.classList.toggle('dark-theme', appState.state.darkMode);
    localStorage.setItem('darkMode', state.darkMode);
    themeToggle.innerHTML = state.darkMode ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
  }

  // Event Handlers and UI Logic
  // Course Management System
  class CourseManager {
    static filterCourses(searchTerm) {
      if (!searchTerm) return COURSES;
      
      const terms = searchTerm.toLowerCase().split(' ');
      return COURSES.filter(course => {
        const courseText = `${course.course} ${course.faculty} Section ${course.section}`.toLowerCase();
        return terms.every(term => courseText.includes(term));
      });
    }

    static updateCourseList() {
      try {
        const searchTerm = elements.courseSearch.value;
        const filteredCourses = this.filterCourses(searchTerm);
        const uniqueCourses = [...new Set(filteredCourses.map(c => c.course))];
        
        const courseList = document.getElementById('courseList');
        if (!courseList) {
          console.error('Course list element not found');
          return;
        }

        courseList.innerHTML = uniqueCourses.map(course => `
          <div class="course-option" role="checkbox" aria-checked="${appState.state.selectedCourses.has(course)}">
            <input type="checkbox" id="course_${course}" 
                   ${appState.state.selectedCourses.has(course) ? 'checked' : ''}
                   data-course="${course}"
                   aria-label="Select ${course}">
            <label for="course_${course}">
              <span class="course-code">${course}</span>
              <span class="course-sections">${COURSES.filter(c => c.course === course).length} sections</span>
            </label>
          </div>
        `).join('');
      } catch (error) {
        console.error('Error updating course list:', error);
        UIManager.showToast('Error updating course list', 'error');
      }
    }

    static updateFacultyList() {
      try {
        const searchTerm = elements.facultySearch.value.toLowerCase();
        const facultyList = elements.facultyToggles;
        
        if (!facultyList) {
          console.error('Faculty list element not found');
          return;
        }

        facultyList.innerHTML = '';
        const { selectedCourses, selectedFaculty } = appState.state;
        
        selectedCourses.forEach(course => {
          const courseFaculty = [...new Set(
            COURSES.filter(c => c.course === course)
              .map(c => c.faculty)
          )];
          
          const filteredFaculty = searchTerm ? 
            courseFaculty.filter(f => f.toLowerCase().includes(searchTerm)) : 
            courseFaculty;

          if (filteredFaculty.length > 0) {
            const courseGroup = document.createElement('div');
            courseGroup.className = 'faculty-group';
            courseGroup.setAttribute('role', 'group');
            courseGroup.setAttribute('aria-label', `Faculty for ${course}`);
            
            courseGroup.innerHTML = `
              <h4>${course}</h4>
              ${filteredFaculty.map(faculty => `
                <div class="faculty-option" role="checkbox" 
                     aria-checked="${selectedFaculty.get(course)?.has(faculty) || false}">
                  <input type="checkbox" id="faculty_${course}_${faculty}"
                         ${selectedFaculty.get(course)?.has(faculty) ? 'checked' : ''}
                         data-course="${course}" 
                         data-faculty="${faculty}"
                         aria-label="Select ${faculty} for ${course}">
                  <label for="faculty_${course}_${faculty}">${faculty}</label>
                </div>
              `).join('')}
            `;
            facultyList.appendChild(courseGroup);
          }
        });
      } catch (error) {
        console.error('Error updating faculty list:', error);
        UIManager.showToast('Error updating faculty list', 'error');
      }
    }
  }

  function resetFilters() {
    state.selectedCourses.clear();
    state.selectedFaculty.clear();
    state.filters = {
      timeStart: null,
      timeEnd: null,
      days: new Set(),
      avoidGaps: false,
      balancedLoad: false,
      maxResults: 50
    };
    
    // Reset UI
    document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
    document.getElementById('maxResults').value = '50';
    document.getElementById('preferredTimeStart').value = '';
    document.getElementById('preferredTimeEnd').value = '';
    
    updateCourseList();
    updateFacultyList();
    showToast('All filters have been reset');
  }

  // Event Listeners
  toggleSidebar.addEventListener('click', () => {
    sidebar.classList.toggle('active');
  });

  courseSearch.addEventListener('input', updateCourseList);
  facultySearch.addEventListener('input', updateFacultyList);

  document.getElementById('courseList').addEventListener('change', e => {
    if (e.target.matches('input[type="checkbox"]')) {
      const course = e.target.dataset.course;
      if (e.target.checked) {
        state.selectedCourses.add(course);
      } else {
        state.selectedCourses.delete(course);
        state.selectedFaculty.delete(course);
      }
      updateFacultyList();
    }
  });

  document.getElementById('facultyToggles').addEventListener('change', e => {
    if (e.target.matches('input[type="checkbox"]')) {
      const { course, faculty } = e.target.dataset;
      if (!state.selectedFaculty.has(course)) {
        state.selectedFaculty.set(course, new Set());
      }
      if (e.target.checked) {
        state.selectedFaculty.get(course).add(faculty);
      } else {
        state.selectedFaculty.get(course).delete(faculty);
      }
    }
  });

  btnGenerateRoutine.addEventListener('click', () => {
    if (state.selectedCourses.size === 0) {
      showToast('Please select at least one course', 'warning');
      return;
    }
    generateRoutines();
  });

  btnReset.addEventListener('click', resetFilters);
  themeToggle.addEventListener('click', toggleTheme);

  btnListView.addEventListener('click', () => {
    state.view = 'list';
    btnListView.classList.add('active');
    btnGridView.classList.remove('active');
    resultsSection.classList.remove('grid-view');
  });

  btnGridView.addEventListener('click', () => {
    state.view = 'grid';
    btnGridView.classList.add('active');
    btnListView.classList.remove('active');
    resultsSection.classList.add('grid-view');
  });

  // Initialize
  function init() {
    // Load theme preference
    if (localStorage.getItem('darkMode') === 'true') {
      toggleTheme();
    }
    
    updateCourseList();
    
    // Initialize time dropdowns
    const timeOptions = Array.from({length: 12}, (_, i) => {
      const hour = i + 8; // Start from 8 AM
      return `<option value="${hour}">${hour > 12 ? (hour-12) : hour}:00 ${hour >= 12 ? 'PM' : 'AM'}</option>`;
    }).join('');
    
    document.getElementById('preferredTimeStart').innerHTML += timeOptions;
    document.getElementById('preferredTimeEnd').innerHTML += timeOptions;
  }

  init();
  const courseListEl = document.getElementById('courseList');
  const facultyOptionsEl = document.getElementById('facultyOptions');
  const btnNext = document.getElementById('btnNext');
  const btnBack = document.getElementById('btnBack');
  const btnGenerateRoutine = document.getElementById('btnGenerateRoutine');
  const resultsEl = document.getElementById('results');
  const summaryEl = document.getElementById('summary');
  const btnPreferred = document.getElementById('btnPreferred');
  const btnAll = document.getElementById('btnAll');
  const btn4day = document.getElementById('btn4day');
  const btn5day = document.getElementById('btn5day');
  
  // Track selected courses and faculty preferences
  const selectedCourses = new Set();
  const selectedFaculty = new Map(); // course -> Set of faculty
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
    try {
      const [a,b] = str.split(' - ');
      return { start: timeToMinutes(a), end: timeToMinutes(b) };
    } catch (err) {
      console.error('Error parsing time range:', err);
      return null;
    }
  }

  // Convert days string to Set
  function daysSet(daysStr) {
    return new Set(daysStr.split(''));
  }

  function daysSet(daysStr){ return new Set(daysStr.split('')); }

  // Schedule Validation and Optimization
  class ScheduleValidator {
    static validateTimeString(timeStr) {
      return /^\d{2}:\d{2} [AP]M - \d{2}:\d{2} [AP]M$/.test(timeStr);
    }

    static validateDayString(dayStr) {
      return /^[SMTWRAF]+$/.test(dayStr);
    }

    static conflicts(a, b) {
      // Validate inputs
      if (!this.validateTimeString(a.time) || !this.validateTimeString(b.time)) {
        throw new Error('Invalid time format');
      }
      if (!this.validateDayString(a.days) || !this.validateDayString(b.days)) {
        throw new Error('Invalid days format');
      }

      const daysA = [...daysSet(a.days)];
      const daysB = [...daysSet(b.days)];
      const common = daysA.filter(d => daysB.includes(d));
      
      if (common.length === 0) return false;
      
      try {
        const ra = parseRange(a.time);
        const rb = parseRange(b.time);
        return Math.max(ra.start, rb.start) < Math.min(ra.end, rb.end);
      } catch (e) {
        console.error('Time parsing error:', e);
        return true; // Assume conflict on parsing error
      }
    }

    static validateSchedule(schedule) {
      const errors = [];
      const labs = new Map();
      const theories = new Map();
      let totalCredits = 0;

      // Group labs and theory courses
      schedule.forEach(course => {
        if (course.course.endsWith('L')) {
          const mainCourse = course.course.slice(0, -1);
          labs.set(mainCourse, course);
        } else {
          theories.set(course.course, course);
        }
      });

      // Validate lab-theory pairs
      labs.forEach((lab, mainCourse) => {
        if (!theories.has(mainCourse)) {
          errors.push(`Lab ${lab.course} found without corresponding theory course ${mainCourse}`);
        }
      });

      // Check time conflicts
      for (let i = 0; i < schedule.length; i++) {
        for (let j = i + 1; j < schedule.length; j++) {
          if (this.conflicts(schedule[i], schedule[j])) {
            errors.push(`Time conflict between ${schedule[i].course} and ${schedule[j].course}`);
          }
        }
      }

      // Validate credit hours (assuming each course is 3 credits)
      totalCredits = schedule.reduce((total, course) => total + (course.course.endsWith('L') ? 1 : 3), 0);
      if (totalCredits > 18) {
        errors.push(`Total credits (${totalCredits}) exceeds maximum allowed (18)`);
      }

      return {
        isValid: errors.length === 0,
        errors,
        totalCredits
      };
    }

    static calculateScheduleScore(schedule, preferences) {
      let score = 100;
      
      // Penalize gaps between classes
      if (preferences.avoidGaps) {
        const gaps = this.calculateGaps(schedule);
        score -= gaps * 5; // -5 points per hour gap
      }

      // Reward preferred faculty matches
      if (preferences.selectedFaculty.size > 0) {
        schedule.forEach(course => {
          const preferredFaculty = preferences.selectedFaculty.get(course.course);
          if (preferredFaculty?.has(course.faculty)) {
            score += 10;
          }
        });
      }

      // Consider time preferences
      if (preferences.timeStart || preferences.timeEnd) {
        schedule.forEach(course => {
          const time = parseRange(course.time);
          if (preferences.timeStart && time.start < preferences.timeStart * 60) {
            score -= 10;
          }
          if (preferences.timeEnd && time.end > preferences.timeEnd * 60) {
            score -= 10;
          }
        });
      }

      return Math.max(0, score);
    }

    static calculateGaps(schedule) {
      let totalGapMinutes = 0;
      const daySchedules = new Map();

      // Group classes by day
      schedule.forEach(course => {
        const days = [...daysSet(course.days)];
        days.forEach(day => {
          if (!daySchedules.has(day)) {
            daySchedules.set(day, []);
          }
          daySchedules.get(day).push({
            time: parseRange(course.time),
            course: course.course
          });
        });
      });

      // Calculate gaps for each day
      daySchedules.forEach(classes => {
        if (classes.length < 2) return;
        
        classes.sort((a, b) => a.time.start - b.time.start);
        
        for (let i = 1; i < classes.length; i++) {
          const gap = classes[i].time.start - classes[i-1].time.end;
          if (gap > 20) { // Ignore gaps less than 20 minutes
            totalGapMinutes += gap;
          }
        }
      });

      return Math.floor(totalGapMinutes / 60); // Return hours
    }
  }

  function setupCourseSelection() {
    // Get unique course codes
    const courses = [...new Set(COURSES.map(c => c.course))];
    courses.sort();
    
    // Create checkboxes for each course
    courseListEl.innerHTML = courses.map(course => `
      <div class="course-option">
        <input type="checkbox" id="course_${course}" data-course="${course}">
        <label for="course_${course}">${course}</label>
      </div>
    `).join('');
    
    // Add event listeners
    document.querySelectorAll('#courseList input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', e => {
        const course = e.target.dataset.course;
        if (e.target.checked) {
          selectedCourses.add(course);
        } else {
          selectedCourses.delete(course);
        }
      });
    });
  }

  function setupFacultySelection() {
    // Group sections by course and get unique faculty for each
    const facultyByCourse = {};
    selectedCourses.forEach(course => {
      const sections = COURSES.filter(c => c.course === course);
      const faculty = [...new Set(sections.map(s => s.faculty))];
      facultyByCourse[course] = faculty.sort();
    });

    // Create faculty selection groups
    facultyOptionsEl.innerHTML = Object.entries(facultyByCourse).map(([course, faculty]) => `
      <div class="faculty-group">
        <h4>${course}</h4>
        ${faculty.map(f => `
          <div class="faculty-option">
            <input type="checkbox" id="faculty_${course}_${f}" data-course="${course}" data-faculty="${f}">
            <label for="faculty_${course}_${f}">${f}</label>
          </div>
        `).join('')}
      </div>
    `).join('');

    // Add event listeners
    document.querySelectorAll('#facultyOptions input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', e => {
        const course = e.target.dataset.course;
        const faculty = e.target.dataset.faculty;
        if (!selectedFaculty.has(course)) {
          selectedFaculty.set(course, new Set());
        }
        if (e.target.checked) {
          selectedFaculty.get(course).add(faculty);
        } else {
          selectedFaculty.get(course).delete(faculty);
        }
      });
    });
  }

  // Setup navigation between steps
  btnNext.addEventListener('click', () => {
    if (selectedCourses.size === 0) {
      alert('Please select at least one course');
      return;
    }
    courseSelectionEl.classList.add('hidden');
    setupFacultySelection();
    facultySelectionEl.classList.remove('hidden');
  });

  btnBack.addEventListener('click', () => {
    facultySelectionEl.classList.add('hidden');
    courseSelectionEl.classList.remove('hidden');
  });

  btnGenerateRoutine.addEventListener('click', () => {
    facultySelectionEl.classList.add('hidden');
    controlsEl.classList.remove('hidden');
    // Filter available courses based on selection
    COURSES = COURSES.filter(course => {
      if (!selectedCourses.has(course.course)) return false;
      if (selectedFaculty.has(course.course) && 
          selectedFaculty.get(course.course).size > 0 &&
          !selectedFaculty.get(course.course).has(course.faculty)) {
        return false;
      }
      return true;
    });
    generateRoutines();
  });

  // Initialize course selection
  setupCourseSelection();

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
    if (!AppState.scheduleGenerator) {
      initScheduleGenerator();
    }

    // Update filters based on parameters
    AppState.filters.maxResults = maxResults;
    AppState.filters.avoidGaps = usePreferences;
    AppState.filters.balancedLoad = usePreferences;
    
    if (requireDays) {
      AppState.filters.days = new Set(requireDays);
    }
    
    if (noEarly) {
      AppState.filters.timeStart = 9; // 9 AM
    }
    
    if (noLate) {
      AppState.filters.timeEnd = 17; // 5 PM
    }

    // Generate schedules using the new generator
    AppState.loading = true;
    AppState.schedules = AppState.scheduleGenerator.generateSchedules();
    AppState.loading = false;
    refreshUI();
  }

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
      // Sort schedule by time
      schedule.sort((a, b) => {
        const timeA = timeToMinutes(a.time.split(' - ')[0]);
        const timeB = timeToMinutes(b.time.split(' - ')[0]);
        return timeA - timeB;
      });
      // Group by time slot for better display
      const timeSlots = new Map();
      schedule.forEach(c => {
        const time = c.time;
        if (!timeSlots.has(time)) {
          timeSlots.set(time, []);
        }
        timeSlots.get(time).push(c);
      });
      // Create grid rows for each time slot
      [...timeSlots.entries()].forEach(([time, courses]) => {
        const timeLabel = document.createElement('div');
        timeLabel.className = 'time-label';
        timeLabel.textContent = time;
        grid.appendChild(timeLabel);
        
        courses.forEach(c => {
          const cell = document.createElement('div');
          cell.className = 'cell';
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
  // View management functions
  let viewManager = {
    buildTimetable: function(schedule) {
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
      renderFacultyToggles: function() {
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
  // PWA Support
  var PWAManager = {
    deferredPrompt: null,

    init() {
      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        this.deferredPrompt = e;
        UIManager.showToast('Install CourseWizard for offline access', 'info', elements);
      });

      window.addEventListener('appinstalled', () => {
        this.deferredPrompt = null;
        console.log('PWA was installed');
      });
    },

    async install() {
      if (!this.deferredPrompt) {
        console.log('Can\'t install PWA: prompt not available');
        return;
      }

      this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      console.log(`PWA installation ${outcome}`);
      this.deferredPrompt = null;
    }
  };

  // Application entry point
  var init = function() {
    var elements = initializeElements();

    // Initialize PWA support
    PWAManager.init();

    // Set up event listeners
    elements.themeToggle.addEventListener('click', () => UIManager.toggleTheme(state, elements));
    elements.btnListView.addEventListener('click', () => UIManager.setView('list', state, elements));
    elements.btnGridView.addEventListener('click', () => UIManager.setView('grid', state, elements));
    
    elements.courseSearch.addEventListener('input', () => CourseManager.updateCourseList(state, elements));
    elements.facultySearch.addEventListener('input', () => CourseManager.updateFacultyList(state, elements));
    
    elements.btnGenerateRoutine.addEventListener('click', async () => {
      UIManager.updateLoadingState(true, elements);
      try {
        const schedules = await ScheduleGenerator.generateSchedules(state);
        ViewManager.displaySchedules(schedules, state, elements);
      } catch (error) {
        console.error('Error generating schedules:', error);
        UIManager.showToast('Failed to generate schedules', 'error', elements);
      } finally {
        UIManager.updateLoadingState(false, elements);
      }
    });

    // Initialize UI
    document.body.classList.toggle('dark-theme', state.darkMode);
    UIManager.setView(state.view, state, elements);
    CourseManager.updateCourseList(state, elements);
    CourseManager.updateFacultyList(state, elements);
  }

  // Initialize on DOM ready
  // Initialize application
  document.addEventListener('DOMContentLoaded', function() {
    init();
  });
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

// Mobile UX enhancements appended
(function(){
  document.addEventListener('DOMContentLoaded', () => {
    // Haptic feedback for buttons (if supported)
    const buttons = document.querySelectorAll('.btn');
    if (buttons && buttons.length) {
      buttons.forEach(btn => {
        try {
          if ('vibrate' in navigator) btn.addEventListener('click', () => navigator.vibrate(50));
        } catch (e) { /* ignore */ }
      });
    }

    // Loading state helper
    function showLoading(buttonEl, text = 'Loading...') {
      if (!buttonEl) return () => {};
      const originalText = buttonEl.textContent;
      buttonEl.textContent = text;
      buttonEl.disabled = true;
      return () => {
        buttonEl.textContent = originalText;
        buttonEl.disabled = false;
      };
    }

    // Elements used by handlers
    const btnPreferred = document.getElementById('btnPreferred');
    const summaryEl = document.getElementById('summary');
    const maxResultsEl = document.getElementById('maxResults');
    const noEarlyEl = document.getElementById('noEarly');
    const noLateEl = document.getElementById('noLate');
    const filterPanel = document.getElementById('filterPanel');
    const openFilters = document.getElementById('openFilters');

    // Enhanced Preferred button behavior
    if (btnPreferred) {
      btnPreferred.addEventListener('click', () => {
        const stopLoading = showLoading(btnPreferred, 'Generating...');
        if (summaryEl) summaryEl.textContent = 'Generating preferred schedules...';

        setTimeout(() => {
          let list = [];
          if (typeof generate === 'function') {
            list = generate({
              usePreferences: true,
              maxResults: Number(maxResultsEl?.value || 200),
              noEarly: !!(noEarlyEl && noEarlyEl.checked),
              noLate: !!(noLateEl && noLateEl.checked)
            });
          }

          if (typeof renderSchedules === 'function') renderSchedules(list);
          stopLoading();
        }, 100);
      });
    }

    // Close filter panel when clicking outside
    document.addEventListener('click', (e) => {
      if (filterPanel && openFilters && !filterPanel.contains(e.target) && !openFilters.contains(e.target)) {
        if (!filterPanel.classList.contains('hidden')) filterPanel.classList.add('hidden');
      }
    });

    // Swipe gesture to close filter panel
    if (filterPanel) {
      let touchStartX = 0;
      let touchStartY = 0;
      filterPanel.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      });

      filterPanel.addEventListener('touchend', (e) => {
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;
        if (deltaX > 50 && Math.abs(deltaY) < 100) {
          filterPanel.classList.add('hidden');
        }
      });
    }
  });
})();
