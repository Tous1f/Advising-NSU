// CourseWizard - Smart Schedule Generation System
window.addEventListener('load', function() {
  'use strict';
  
  // Application state
  const state = {
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
    toastMessage: document.getElementById('toastMessage'),
    facultyToggles: document.getElementById('facultyToggles'),
    courseList: document.getElementById('courseList'),
    summary: document.getElementById('summary')
  }, {
    get(target, prop) {
      if (!target[prop]) {
        const element = document.getElementById(prop);
        if (!element) {
          console.warn(`Missing DOM element: ${prop}`);
          return document.createElement('div');
        }
        target[prop] = element;
      }
      return target[prop];
    }
  });

  // Utility Functions
  function timeToMinutes(timeStr) {
    const [time, ampm] = timeStr.split(' ');
    const [h, m] = time.split(':').map(Number);
    let hours = h === 12 ? 0 : h;
    if (ampm === 'PM') hours += 12;
    return hours * 60 + m;
  }

  function parseRange(timeStr) {
    try {
      const [start, end] = timeStr.split(' - ');
      return {
        start: timeToMinutes(start),
        end: timeToMinutes(end)
      };
    } catch (error) {
      console.error('Error parsing time range:', timeStr, error);
      return null;
    }
  }

  function daysSet(daysStr) {
    return new Set(daysStr.split(''));
  }

  // Core Schedule Generator Class
  class ScheduleGenerator {
    constructor(courses, selectedCourses, selectedFaculty, filters) {
      this.courses = courses;
      this.selectedCourses = selectedCourses;
      this.selectedFaculty = selectedFaculty;
      this.filters = filters;
    }

    conflicts(courseA, courseB) {
      if (!courseA || !courseB || !courseA.days || !courseB.days || !courseA.time || !courseB.time) {
        return true;
      }

      const daysA = daysSet(courseA.days);
      const daysB = daysSet(courseB.days);
      const commonDays = [...daysA].filter(d => daysB.has(d));
      
      if (commonDays.length === 0) return false;

      const timeA = parseRange(courseA.time);
      const timeB = parseRange(courseB.time);
      
      if (!timeA || !timeB) return true;

      // Check for time overlap
      return Math.max(timeA.start, timeB.start) < Math.min(timeA.end, timeB.end);
    }

    validateSchedule(schedule) {
      // Check for required course pairs (theory + lab)
      const courseSet = new Set(schedule.map(c => c.course));
      const requiredPairs = [['EEE111', 'EEE111L'], ['CSE311', 'CSE311L']];

      for (const [theory, lab] of requiredPairs) {
        if (courseSet.has(theory) || courseSet.has(lab)) {
          if (!courseSet.has(theory) || !courseSet.has(lab)) {
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

      return true;
    }

    calculateScheduleScore(schedule) {
      let score = 100;

      // Preferred faculty bonus
      for (const course of schedule) {
        const preferredFaculty = this.selectedFaculty.get(course.course);
        if (preferredFaculty && preferredFaculty.has(course.faculty)) {
          score += 20;
        }
      }

      // Time preferences
      if (this.filters.timeStart || this.filters.timeEnd) {
        for (const course of schedule) {
          const time = parseRange(course.time);
          if (!time) continue;
          
          if (this.filters.timeStart && time.start < this.filters.timeStart * 60) {
            score -= 10;
          }
          if (this.filters.timeEnd && time.end > this.filters.timeEnd * 60) {
            score -= 10;
          }
        }
      }

      return Math.max(0, score);
    }

    generateSchedules() {
      const results = [];
      const maxResults = this.filters.maxResults || 50;
      const requiredCourses = [...this.selectedCourses];
      
      // Filter sections based on preferences
      const availableSections = this.courses.filter(course => 
        requiredCourses.includes(course.course) &&
        (!this.selectedFaculty.get(course.course)?.size || 
         this.selectedFaculty.get(course.course).has(course.faculty))
      );

      const backtrack = (courseIndex, currentSchedule) => {
        if (results.length >= maxResults) return;
        
        if (courseIndex === requiredCourses.length) {
          if (this.validateSchedule(currentSchedule)) {
            const score = this.calculateScheduleScore(currentSchedule);
            results.push({ schedule: [...currentSchedule], score });
          }
          return;
        }

        const currentCourse = requiredCourses[courseIndex];
        const sections = availableSections.filter(s => s.course === currentCourse);

        for (const section of sections) {
          // Check if this section conflicts with current schedule
          const hasConflict = currentSchedule.some(existing => 
            this.conflicts(existing, section)
          );

          if (!hasConflict) {
            currentSchedule.push(section);
            backtrack(courseIndex + 1, currentSchedule);
            currentSchedule.pop();
          }
        }
      };

      backtrack(0, []);
      
      // Sort by score (highest first)
      results.sort((a, b) => b.score - a.score);
      return results.slice(0, maxResults).map(r => r.schedule);
    }
  }

  // UI Manager Class
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
        state.darkMode = !state.darkMode;
        document.body.classList.toggle('dark-theme', state.darkMode);
        localStorage.setItem('darkMode', state.darkMode);
        
        elements.themeToggle.innerHTML = state.darkMode ? 
          '<i class="fas fa-sun"></i>' : 
          '<i class="fas fa-moon"></i>';
        
        elements.themeToggle.setAttribute('aria-pressed', String(state.darkMode));
        elements.themeToggle.title = `Switch to ${state.darkMode ? 'light' : 'dark'} theme`;
      } catch (error) {
        console.error('Error toggling theme:', error);
      }
    }

    static setView(viewType) {
      try {
        state.view = viewType;
        localStorage.setItem('view', viewType);
        
        elements.btnListView.classList.toggle('active', viewType === 'list');
        elements.btnGridView.classList.toggle('active', viewType === 'grid');
        
        if (elements.resultsSection) {
          elements.resultsSection.classList.toggle('grid-view', viewType === 'grid');
        }
      } catch (error) {
        console.error('Error setting view:', error);
      }
    }

    static updateLoadingState(loading) {
      try {
        state.loading = loading;
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
        const searchTerm = elements.courseSearch.value || '';
        const filteredCourses = this.filterCourses(searchTerm);
        const uniqueCourses = [...new Set(filteredCourses.map(c => c.course))];
        
        elements.courseList.innerHTML = uniqueCourses.map(course => {
          const sectionCount = COURSES.filter(c => c.course === course).length;
          return `
            <div class="course-option" role="checkbox" aria-checked="${state.selectedCourses.has(course)}">
              <input type="checkbox" id="course_${course}" 
                     ${state.selectedCourses.has(course) ? 'checked' : ''}
                     data-course="${course}"
                     aria-label="Select ${course}">
              <label for="course_${course}">
                <span class="course-code">${course}</span>
                <span class="course-sections">${sectionCount} sections</span>
              </label>
            </div>
          `;
        }).join('');
      } catch (error) {
        console.error('Error updating course list:', error);
        UIManager.showToast('Error updating course list', 'error');
      }
    }

    static updateFacultyList() {
      try {
        const searchTerm = elements.facultySearch.value?.toLowerCase() || '';
        
        elements.facultyToggles.innerHTML = '';
        
        state.selectedCourses.forEach(course => {
          const courseFaculty = [...new Set(
            COURSES.filter(c => c.course === course).map(c => c.faculty)
          )];
          
          const filteredFaculty = searchTerm ? 
            courseFaculty.filter(f => f.toLowerCase().includes(searchTerm)) : 
            courseFaculty;

          if (filteredFaculty.length > 0) {
            const courseGroup = document.createElement('div');
            courseGroup.className = 'faculty-group';
            
            courseGroup.innerHTML = `
              <h4>${course}</h4>
              ${filteredFaculty.map(faculty => `
                <div class="faculty-option">
                  <input type="checkbox" id="faculty_${course}_${faculty}"
                         ${state.selectedFaculty.get(course)?.has(faculty) ? 'checked' : ''}
                         data-course="${course}" 
                         data-faculty="${faculty}">
                  <label for="faculty_${course}_${faculty}">${faculty}</label>
                </div>
              `).join('')}
            `;
            elements.facultyToggles.appendChild(courseGroup);
          }
        });
      } catch (error) {
        console.error('Error updating faculty list:', error);
        UIManager.showToast('Error updating faculty list', 'error');
      }
    }
  }

  // Schedule Display Functions
  function buildTimetable(schedule) {
    const container = document.createElement('div');
    container.className = 'timetable';
    
    const days = ['S', 'M', 'T', 'W', 'R', 'A', 'F'];
    
    // Create header
    const header = document.createElement('div');
    header.className = 'tt-grid';
    header.innerHTML = `
      <div class="tt-cell tt-header">Time</div>
      ${days.map(d => `<div class="tt-cell tt-header">${d}</div>`).join('')}
    `;
    container.appendChild(header);

    // Create timeline
    const timeline = document.createElement('div');
    timeline.style.cssText = 'display:grid;grid-template-columns:80px repeat(7,1fr);gap:4px';

    // Time column
    const timeCol = document.createElement('div');
    for (let h = 8; h <= 18; h++) {
      const timeCell = document.createElement('div');
      timeCell.className = 'tt-cell tt-bg';
      timeCell.style.height = '40px';
      timeCell.textContent = `${h > 12 ? h - 12 : h}:00 ${h >= 12 ? 'PM' : 'AM'}`;
      timeCol.appendChild(timeCell);
    }
    timeline.appendChild(timeCol);

    // Day columns
    days.forEach(day => {
      const dayCol = document.createElement('div');
      dayCol.style.cssText = 'position:relative;min-height:440px';
      dayCol.className = 'tt-bg';

      schedule.forEach(course => {
        if (course.days.includes(day)) {
          const timeRange = parseRange(course.time);
          if (timeRange) {
            const startHour = 8;
            const topPercent = ((timeRange.start - startHour * 60) / (10 * 60)) * 100;
            const heightPercent = ((timeRange.end - timeRange.start) / (10 * 60)) * 100;

            const block = document.createElement('div');
            block.className = 'course-block';
            block.style.cssText = `
              position:absolute;
              left:2px;right:2px;
              top:${topPercent}%;
              height:${heightPercent}%;
              background:linear-gradient(135deg,rgba(255,212,64,0.12),rgba(255,212,64,0.04));
              border:1px solid rgba(255,212,64,0.15);
              border-radius:6px;
              padding:4px;
              font-size:11px;
            `;
            
            block.innerHTML = `
              <strong>${course.course} S${course.section}</strong>
              <div style="color:#9aa4b2;margin-top:2px">${course.faculty}</div>
            `;
            
            dayCol.appendChild(block);
          }
        }
      });

      timeline.appendChild(dayCol);
    });

    container.appendChild(timeline);
    return container;
  }

  function renderSchedules(schedules) {
    if (!elements.resultsSection || !elements.summary) return;
    
    elements.resultsSection.innerHTML = '';
    
    if (schedules.length === 0) {
      elements.summary.textContent = 'No schedules found.';
      if (elements.noResults) {
        elements.noResults.classList.remove('hidden');
      }
      return;
    }

    elements.summary.textContent = `Found ${schedules.length} schedule${schedules.length === 1 ? '' : 's'}`;
    
    if (elements.noResults) {
      elements.noResults.classList.add('hidden');
    }

    schedules.forEach((schedule, index) => {
      const uniqueDays = [...new Set(schedule.flatMap(s => s.days.split('')))];
      
      const card = document.createElement('article');
      card.className = 'schedule-card';
      
      const heading = document.createElement('h4');
      heading.textContent = `Schedule #${index + 1} — ${uniqueDays.length} days/week`;
      card.appendChild(heading);

      const meta = document.createElement('div');
      meta.className = 'meta';
      meta.innerHTML = `<div>${schedule.length} courses</div><div class="muted">Auto-generated</div>`;
      card.appendChild(meta);

      // Course list
      const courseGrid = document.createElement('div');
      courseGrid.className = 'grid';
      
      schedule.forEach(course => {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.innerHTML = `
          <strong>${course.course} — S${course.section}</strong>
          <div style="font-size:13px;color:#9aa4b2">${course.faculty}</div>
          <div style="margin-top:4px">${course.days} · ${course.time}</div>
        `;
        courseGrid.appendChild(cell);
      });
      
      card.appendChild(courseGrid);

      // Timetable
      const timetable = buildTimetable(schedule);
      card.appendChild(timetable);

      // Actions
      const actions = document.createElement('div');
      actions.style.marginTop = '8px';
      
      const copyBtn = document.createElement('button');
      copyBtn.className = 'btn small';
      copyBtn.textContent = 'Copy JSON';
      copyBtn.onclick = () => {
        navigator.clipboard.writeText(JSON.stringify(schedule, null, 2));
        UIManager.showToast('Schedule copied to clipboard', 'success');
      };
      actions.appendChild(copyBtn);
      card.appendChild(actions);

      elements.resultsSection.appendChild(card);
    });
  }

  // Schedule Generation
  function generateSchedules() {
    if (state.selectedCourses.size === 0) {
      UIManager.showToast('Please select at least one course', 'warning');
      return;
    }

    UIManager.updateLoadingState(true);

    setTimeout(() => {
      try {
        const generator = new ScheduleGenerator(
          COURSES, 
          state.selectedCourses, 
          state.selectedFaculty, 
          state.filters
        );
        
        const schedules = generator.generateSchedules();
        state.schedules = schedules;
        renderSchedules(schedules);
        
      } catch (error) {
        console.error('Error generating schedules:', error);
        UIManager.showToast('Failed to generate schedules', 'error');
      } finally {
        UIManager.updateLoadingState(false);
      }
    }, 100);
  }

  // Reset all filters and selections
  function resetFilters() {
    state.selectedCourses.clear();
    state.selectedFaculty.clear();
    state.filters = {
      timeStart: null,
      timeEnd: null,
      days: new Set(),
      avoidGaps: false,
      balancedLoad: false,
      maxResults: 50,
      minimumGap: 15
    };
    
    // Reset UI
    document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
    const maxResultsInput = document.getElementById('maxResults');
    if (maxResultsInput) maxResultsInput.value = '50';
    
    CourseManager.updateCourseList();
    CourseManager.updateFacultyList();
    UIManager.showToast('All filters have been reset', 'info');
  }

  // Event Listeners
  function setupEventListeners() {
    // Theme toggle
    if (elements.themeToggle) {
      elements.themeToggle.addEventListener('click', UIManager.toggleTheme);
    }

    // View controls
    if (elements.btnListView) {
      elements.btnListView.addEventListener('click', () => UIManager.setView('list'));
    }
    if (elements.btnGridView) {
      elements.btnGridView.addEventListener('click', () => UIManager.setView('grid'));
    }

    // Sidebar toggle
    if (elements.toggleSidebar && elements.sidebar) {
      elements.toggleSidebar.addEventListener('click', () => {
        elements.sidebar.classList.toggle('active');
      });
    }

    // Search functionality
    if (elements.courseSearch) {
      elements.courseSearch.addEventListener('input', CourseManager.updateCourseList);
    }
    if (elements.facultySearch) {
      elements.facultySearch.addEventListener('input', CourseManager.updateFacultyList);
    }

    // Course selection
    if (elements.courseList) {
      elements.courseList.addEventListener('change', (e) => {
        if (e.target.matches('input[type="checkbox"]')) {
          const course = e.target.dataset.course;
          if (e.target.checked) {
            state.selectedCourses.add(course);
          } else {
            state.selectedCourses.delete(course);
            state.selectedFaculty.delete(course);
          }
          CourseManager.updateFacultyList();
        }
      });
    }

    // Faculty selection
    if (elements.facultyToggles) {
      elements.facultyToggles.addEventListener('change', (e) => {
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
    }

    // Generate and reset buttons
    if (elements.btnGenerateRoutine) {
      elements.btnGenerateRoutine.addEventListener('click', generateSchedules);
    }
    if (elements.btnReset) {
      elements.btnReset.addEventListener('click', resetFilters);
    }

    // Filter controls
    const maxResultsEl = document.getElementById('maxResults');
    if (maxResultsEl) {
      maxResultsEl.addEventListener('change', (e) => {
        state.filters.maxResults = parseInt(e.target.value) || 50;
      });
    }

    const avoidGapsEl = document.getElementById('avoidGaps');
    if (avoidGapsEl) {
      avoidGapsEl.addEventListener('change', (e) => {
        state.filters.avoidGaps = e.target.checked;
      });
    }

    const balancedLoadEl = document.getElementById('balancedLoad');
    if (balancedLoadEl) {
      balancedLoadEl.addEventListener('change', (e) => {
        state.filters.balancedLoad = e.target.checked;
      });
    }
  }

  // Initialize Application
  function init() {
    // Set initial theme
    document.body.classList.toggle('dark-theme', state.darkMode);
    if (elements.themeToggle) {
      elements.themeToggle.innerHTML = state.darkMode ? 
        '<i class="fas fa-sun"></i>' : 
        '<i class="fas fa-moon"></i>';
    }

    // Set initial view
    UIManager.setView(state.view);
    
    // Load course list
    CourseManager.updateCourseList();
    
    // Setup event listeners
    setupEventListeners();
    
    // Initialize summary
    if (elements.summary) {
      elements.summary.textContent = 'Ready — select courses to generate schedules';
    }

    console.log('CourseWizard initialized successfully');
  }

  // Start the application
  init();
});

// Mobile enhancements
document.addEventListener('DOMContentLoaded', () => {
  // Haptic feedback for supported devices
  if ('vibrate' in navigator) {
    document.querySelectorAll('.btn').forEach(btn => {
      btn.addEventListener('click', () => navigator.vibrate(50));
    });
  }

  // Close panels when clicking outside
  document.addEventListener('click', (e) => {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('toggleSidebar');
    
    if (sidebar && toggleBtn && 
        !sidebar.contains(e.target) && 
        !toggleBtn.contains(e.target) && 
        sidebar.classList.contains('active')) {
      sidebar.classList.remove('active');
    }
  });

  // Swipe gesture support for mobile
  let touchStartX = 0;
  document.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
  });

  document.addEventListener('touchend', (e) => {
    const touchEndX = e.changedTouches[0].clientX;
    const deltaX = touchEndX - touchStartX;
    const sidebar = document.getElementById('sidebar');
    
    if (sidebar) {
      if (deltaX > 50 && touchStartX < 50) {
        sidebar.classList.add('active');
      } else if (deltaX < -50 && sidebar.classList.contains('active')) {
        sidebar.classList.remove('active');
      }
    }
  });
});