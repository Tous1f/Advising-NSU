// CourseWizard - Smart Schedule Generation System
window.addEventListener('load', function () {
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
      minimumGap: 15,
      preferredFaculty: new Set(),
      exactDays: null
    },
    view: localStorage.getItem('view') || 'list',
    darkMode: localStorage.getItem('darkMode') === 'true',
    schedules: [],
    loading: false
  };

  // Initialize course selection modal
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.setAttribute('id', 'courseModal');
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2><i class="fas fa-book"></i> Select Courses</h2>
        <button class="close-modal" id="closeModal" aria-label="Close modal">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="course-list scrollable">
        <div class="search-box">
          <i class="fas fa-search"></i>
          <input type="text" id="courseSearch" placeholder="Search courses...">
        </div>
        ${createCourseList()}
      </div>
      <div class="modal-actions">
        <button class="secondary-button" id="cancelCourses">
          <i class="fas fa-times"></i> Cancel
        </button>
        <button class="primary-button" id="confirmCourses">
          <i class="fas fa-check"></i> Confirm Selection
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // Helper Functions
  function createCourseList() {
    if (!window.COURSES || !Array.isArray(window.COURSES)) {
      console.error('COURSES array not found or invalid');
      return '<div class="error-message"><i class="fas fa-exclamation-circle"></i> Unable to load courses</div>';
    }

    // Get unique courses and group them
    const coursesMap = window.COURSES.reduce((acc, course) => {
      if (!acc[course.course]) {
        acc[course.course] = {
          sections: [],
          faculty: new Set()
        };
      }
      acc[course.course].sections.push(course);
      acc[course.course].faculty.add(course.faculty);
      return acc;
    }, {});

    const uniqueCourses = Object.keys(coursesMap).sort();
    console.log('Available courses:', uniqueCourses);

    return uniqueCourses
      .map(courseCode => {
        const courseInfo = coursesMap[courseCode];
        return `
          <div class="course-card ${state.selectedCourses.has(courseCode) ? 'selected' : ''}">
            <div class="course-header">
              <label class="course-label">
                <input type="checkbox" 
                       value="${courseCode}" 
                       ${state.selectedCourses.has(courseCode) ? 'checked' : ''}
                       class="course-checkbox"
                       data-course="${courseCode}">
                <span class="course-code">${courseCode}</span>
              </label>
              <div class="course-stats">
                <span class="badge sections">
                  <i class="fas fa-clock"></i> ${courseInfo.sections.length} sections
                </span>
                <span class="badge faculty">
                  <i class="fas fa-user-tie"></i> ${courseInfo.faculty.size} faculty
                </span>
              </div>
            </div>
            <div class="course-details">
              <div class="section-times">
                ${Array.from(new Set(courseInfo.sections.map(s => s.time))).slice(0, 3).map(time =>
          `<span class="time-slot"><i class="fas fa-clock"></i> ${time}</span>`
        ).join('')}
                ${courseInfo.sections.length > 3 ? `<span class="more-times">+${courseInfo.sections.length - 3} more</span>` : ''}
              </div>
            </div>
          </div>
        `;
      })
      .join('');
  }

  // University-specific day combination logic
  function getValidDayCombinations(targetDays) {
    const dayCombos = {
      'ST': ['S', 'T'],
      'RA': ['R', 'A'], 
      'MW': ['M', 'W'],
      'S': ['S'],
      'M': ['M'],
      'T': ['T'],
      'W': ['W'],
      'R': ['R'],
      'A': ['A']
    };

    if (targetDays === 4) {
      return [
        ['ST', 'RA'], // 2 combinations = 4 days
        ['ST', 'MW'], 
        ['RA', 'MW']
      ];
    } else if (targetDays === 5) {
      return [
        ['ST', 'RA', 'M'], // 3 combinations = 5 days
        ['ST', 'RA', 'W'],
        ['ST', 'MW', 'R'],
        ['ST', 'MW', 'A'],
        ['RA', 'MW', 'S'],
        ['RA', 'MW', 'T'],
        ['ST', 'RA', 'S'], // Include single day options
        ['ST', 'RA', 'T'],
        ['ST', 'MW', 'S'],
        ['ST', 'MW', 'T'],
        ['RA', 'MW', 'M'],
        ['RA', 'MW', 'W']
      ];
    } else if (targetDays === 6) {
      return [
        ['ST', 'RA', 'MW'] // 3 combinations = 6 days
      ];
    }
    return [];
  }

  function isCourseAllowedForDayCombo(course, dayCombo) {
    const courseDays = course.days.split('');
    const allowedDays = new Set();
    
    dayCombo.forEach(combo => {
      if (combo === 'ST') { allowedDays.add('S'); allowedDays.add('T'); }
      else if (combo === 'RA') { allowedDays.add('R'); allowedDays.add('A'); }
      else if (combo === 'MW') { allowedDays.add('M'); allowedDays.add('W'); }
      else allowedDays.add(combo);
    });

    // Check if course uses only allowed days
    return courseDays.every(day => allowedDays.has(day));
  }

  function isSingleDayCourse(course) {
    // Labs and EEE154 can be single day courses
    return course.course.endsWith('L') || course.course === 'EEE154';
  }

  function convertTimeToMinutes(timeStr) {
    const [time, period] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }

  function filterSchedules() {
    const validSections = window.COURSES.filter(course => {
      // Filter by selected courses
      if (!state.selectedCourses.has(course.course)) return false;

      // Filter by time range
      if (state.filters.timeStart && state.filters.timeEnd) {
        const courseStart = convertTimeToMinutes(course.time.split(' - ')[0]);
        const courseEnd = convertTimeToMinutes(course.time.split(' - ')[1]);
        const filterStart = convertTimeToMinutes(state.filters.timeStart);
        const filterEnd = convertTimeToMinutes(state.filters.timeEnd);
        if (courseStart < filterStart || courseEnd > filterEnd) return false;
      }

      // Filter by faculty
      if (state.filters.preferredFaculty.size > 0) {
        if (!state.filters.preferredFaculty.has(course.faculty)) return false;
      }

      return true;
    });

    return generateSchedules(validSections);
  }

  function generateSchedules(sections) {
    const schedules = [];
    const courseGroups = {};

    // Group sections by course
    sections.forEach(section => {
      if (!courseGroups[section.course]) {
        courseGroups[section.course] = [];
      }
      courseGroups[section.course].push(section);
    });

    function isTimeConflict(schedule, section) {
      for (const existing of schedule) {
        // Check day overlap
        const existingDays = existing.days.split('');
        const newDays = section.days.split('');
        const hasCommonDays = existingDays.some(day => newDays.includes(day));

        if (hasCommonDays) {
          const existingStart = convertTimeToMinutes(existing.time.split(' - ')[0]);
          const existingEnd = convertTimeToMinutes(existing.time.split(' - ')[1]);
          const newStart = convertTimeToMinutes(section.time.split(' - ')[0]);
          const newEnd = convertTimeToMinutes(section.time.split(' - ')[1]);

          if (
            (newStart >= existingStart && newStart < existingEnd) ||
            (newEnd > existingStart && newEnd <= existingEnd) ||
            (newStart <= existingStart && newEnd >= existingEnd)
          ) {
            return true;
          }
        }
      }
      return false;
    }

    function generateScheduleRecursive(courses, currentSchedule = []) {
      if (courses.length === 0) {
        schedules.push([...currentSchedule]);
        return;
      }

      const [currentCourse, ...remainingCourses] = courses;
      const sections = courseGroups[currentCourse];

      for (const section of sections) {
        if (!isTimeConflict(currentSchedule, section)) {
          currentSchedule.push(section);
          generateScheduleRecursive(remainingCourses, currentSchedule);
          currentSchedule.pop();
        }
      }
    }

    generateScheduleRecursive([...state.selectedCourses]);

    if (state.filters.avoidGaps) {
      schedules.sort((a, b) => calculateGaps(a) - calculateGaps(b));
    }

    if (state.filters.balancedLoad) {
      schedules.sort((a, b) => calculateDailyLoad(a) - calculateDailyLoad(b));
    }

    return schedules.slice(0, state.filters.maxResults);
  }

  function calculateGaps(schedule) {
    const daySchedules = {};

    schedule.forEach(section => {
      const days = section.days.split('');
      days.forEach(day => {
        if (!daySchedules[day]) daySchedules[day] = [];
        daySchedules[day].push(section);
      });
    });

    let totalGaps = 0;
    Object.values(daySchedules).forEach(daySections => {
      daySections.sort((a, b) => {
        return convertTimeToMinutes(a.time.split(' - ')[0]) -
          convertTimeToMinutes(b.time.split(' - ')[0]);
      });

      for (let i = 1; i < daySections.length; i++) {
        const prevEnd = convertTimeToMinutes(daySections[i - 1].time.split(' - ')[1]);
        const currentStart = convertTimeToMinutes(daySections[i].time.split(' - ')[0]);
        totalGaps += currentStart - prevEnd;
      }
    });

    return totalGaps;
  }

  function calculateDailyLoad(schedule) {
    const dayLoads = {};
    let maxDiff = 0;

    schedule.forEach(section => {
      const days = section.days.split('');
      days.forEach(day => {
        if (!dayLoads[day]) dayLoads[day] = 0;
        dayLoads[day]++;
      });
    });

    const loads = Object.values(dayLoads);
    for (let i = 0; i < loads.length; i++) {
      for (let j = i + 1; j < loads.length; j++) {
        maxDiff = Math.max(maxDiff, Math.abs(loads[i] - loads[j]));
      }
    }

    return maxDiff;
  }

  // DOM Elements with error checking
  const elements = new Proxy({
    sidebar: document.getElementById('sidebar'),
    toggleSidebar: document.getElementById('toggleSidebar'),
    selectCoursesBtn: document.getElementById('selectCoursesBtn'),
    courseModal: document.getElementById('courseModal'),
    closeModal: document.getElementById('closeModal'),
    modalCourseSearch: document.getElementById('modalCourseSearch'),
    courseListModal: document.getElementById('courseListModal'),
    selectedCount: document.getElementById('selectedCount'),
    confirmCourses: document.getElementById('confirmCourses'),
    cancelCourses: document.getElementById('cancelCourses'),
    selectedCoursesSection: document.getElementById('selectedCoursesSection'),
    selectedCoursesList: document.getElementById('selectedCoursesList'),
    facultySearch: document.getElementById('facultySearch'),
    noEarly: document.getElementById('noEarly'),
    noLate: document.getElementById('noLate'),
    preferredTimeStart: document.getElementById('preferredTimeStart'),
    preferredTimeEnd: document.getElementById('preferredTimeEnd'),
    btn4day: document.getElementById('btn4day'),
    btn5day: document.getElementById('btn5day'),
    btn6day: document.getElementById('btn6day'),
    avoidGaps: document.getElementById('avoidGaps'),
    balancedLoad: document.getElementById('balancedLoad'),
    maxResults: document.getElementById('maxResults'),
    btnGenerateRoutine: document.getElementById('btnGenerateRoutine'),
    btnReset: document.getElementById('btnReset'),
    themeToggle: document.getElementById('themeToggle'),
    btnListView: document.getElementById('btnListView'),
    btnGridView: document.getElementById('btnGridView'),
    resultsSection: document.getElementById('results'),
    noResults: document.getElementById('noResults'),
    toast: document.getElementById('toast'),
    toastMessage: document.getElementById('toastMessage'),
    facultyToggles: document.getElementById('facultyToggles'),
    summary: document.getElementById('summary'),
    btnExport: document.getElementById('btnExport'),
    btnShare: document.getElementById('btnShare')
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

  // Enhanced Schedule Generator Class
  class ScheduleGenerator {
    constructor(courses, selectedCourses, selectedFaculty, filters) {
      this.courses = courses;
      this.selectedCourses = selectedCourses;
      this.selectedFaculty = selectedFaculty;
      this.filters = filters;
      this.generatedSchedules = [];
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
      // Check for required course pairs (theory + lab) with matching sections
      const courseMap = new Map(schedule.map(c => [c.course, c]));
      const requiredPairs = [['EEE111', 'EEE111L'], ['CSE311', 'CSE311L']];

      for (const [theory, lab] of requiredPairs) {
        const theoryCourse = courseMap.get(theory);
        const labCourse = courseMap.get(lab);

        // If either theory or lab is selected, both must be present
        if (theoryCourse || labCourse) {
          if (!theoryCourse || !labCourse) {
            return false;
          }

          // CRITICAL: Check that they have the same section number
          if (theoryCourse.section !== labCourse.section) {
            return false;
          }
        }
      }

      // Check day combination compliance
      if (typeof this.filters.exactDays === 'number') {
        const scheduleDays = new Set();
        schedule.forEach(course => {
          const courseDays = course.days.split('');
          courseDays.forEach(day => scheduleDays.add(day));
        });

        // Check if schedule uses valid day combinations for target day count
        const validCombos = getValidDayCombinations(this.filters.exactDays);
        const scheduleDaysArray = [...scheduleDays].sort();
        
        let validComboFound = false;
        for (const combo of validCombos) {
          const comboDays = new Set();
          combo.forEach(dayCombo => {
            if (dayCombo === 'ST') { comboDays.add('S'); comboDays.add('T'); }
            else if (dayCombo === 'RA') { comboDays.add('R'); comboDays.add('A'); }
            else if (dayCombo === 'MW') { comboDays.add('M'); comboDays.add('W'); }
            else comboDays.add(dayCombo);
          });
          
          const comboDaysArray = [...comboDays].sort();
          if (comboDaysArray.length === scheduleDaysArray.length && 
              comboDaysArray.every((day, i) => day === scheduleDaysArray[i])) {
            validComboFound = true;
            break;
          }
        }
        
        if (!validComboFound) return false;
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

    getLabCourseForTheory(theoryCourse) {
      const labTheoryPairs = {
        'CSE311': 'CSE311L',
        'EEE111': 'EEE111L'
      };
      return labTheoryPairs[theoryCourse] || null;
    }

    getNextCourseIndex(currentIndex, requiredCourses, labCourse) {
      // Skip the lab course in the main loop since it's handled in pairing
      let nextIndex = currentIndex + 1;
      while (nextIndex < requiredCourses.length && requiredCourses[nextIndex] === labCourse) {
        nextIndex++;
      }
      return nextIndex;
    }

    shouldSkipCourseInMainLoop(courseCode, requiredCourses, currentIndex) {
      // Skip lab courses in the main loop - they're handled in theory pairing
      if (CourseManager.isLabCourse(courseCode)) {
        return true;
      }
      
      // Skip if this is a theory course that has a lab and the lab is in the required courses
      const labCourse = this.getLabCourseForTheory(courseCode);
      if (labCourse && requiredCourses.includes(labCourse)) {
        return false; // Don't skip - we need to process this to pair with lab
      }
      
      return false;
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

      // Enhanced filtering with smart preferences
      const availableSections = this.courses.filter(course => {
        // Must be a selected course
        if (!requiredCourses.includes(course.course)) return false;

        // Faculty preference filter (skip for lab courses - they're handled in pairing)
        if (!CourseManager.isLabCourse(course.course) && 
            this.selectedFaculty.get(course.course)?.size &&
            !this.selectedFaculty.get(course.course).has(course.faculty)) {
          return false;
        }

        // Time preference filters
        if (this.filters.noEarly || this.filters.noLate) {
          const timeRange = parseRange(course.time);
          if (!timeRange) return false;

          const startHour = Math.floor(timeRange.start / 60);
          const endHour = Math.floor(timeRange.end / 60);

          if (this.filters.noEarly && startHour < 9) return false;
          if (this.filters.noLate && endHour > 18) return false;
        }

        // Preferred time range filter
        if (this.filters.timeStart || this.filters.timeEnd) {
          const timeRange = parseRange(course.time);
          if (!timeRange) return false;

          const startHour = Math.floor(timeRange.start / 60);
          const endHour = Math.floor(timeRange.end / 60);

          if (this.filters.timeStart && startHour < this.filters.timeStart) return false;
          if (this.filters.timeEnd && endHour > this.filters.timeEnd) return false;
        }

        // Day combination filter - only allow courses that fit valid day combinations
        if (typeof this.filters.exactDays === 'number') {
          const validCombos = getValidDayCombinations(this.filters.exactDays);
          const courseDays = course.days.split('');
          
          // Check if course fits any valid day combination
          let fitsValidCombo = false;
          for (const combo of validCombos) {
            if (isCourseAllowedForDayCombo(course, combo)) {
              fitsValidCombo = true;
              break;
            }
          }
          if (!fitsValidCombo) return false;
        }

        return true;
      });

      // Smart backtracking with early termination and lab-theory pairing
      const backtrack = (courseIndex, currentSchedule, usedSections = new Set()) => {
        if (results.length >= maxResults) return;

        if (courseIndex === requiredCourses.length) {
          if (this.validateSchedule(currentSchedule)) {
            const score = this.calculateScheduleScore(currentSchedule);
            results.push({ schedule: [...currentSchedule], score });
          }
          return;
        }

        const currentCourse = requiredCourses[courseIndex];
        
        // Skip lab courses in the main loop - they're handled in theory pairing
        if (this.shouldSkipCourseInMainLoop(currentCourse, requiredCourses, courseIndex)) {
          backtrack(courseIndex + 1, currentSchedule, usedSections);
          return;
        }

        const sections = availableSections.filter(s =>
          s.course === currentCourse && !usedSections.has(`${s.course}-${s.section}`)
        );

        // Sort sections by preference (faculty preference, time preference, etc.)
        sections.sort((a, b) => this.compareSections(a, b, currentSchedule));

        for (const section of sections) {
          // Check if this section conflicts with current schedule
          const hasConflict = currentSchedule.some(existing =>
            this.conflicts(existing, section)
          );

          if (!hasConflict) {
            // Add the current section
            currentSchedule.push(section);
            usedSections.add(`${section.course}-${section.section}`);

            // Check if this is a theory course that needs a lab pairing
            const labCourse = this.getLabCourseForTheory(section.course);
            if (labCourse && requiredCourses.includes(labCourse)) {
              // Find the corresponding lab section with the same section number
              const labSections = availableSections.filter(s =>
                s.course === labCourse &&
                s.section === section.section &&
                !usedSections.has(`${s.course}-${s.section}`)
              );

              // Filter lab sections by faculty preference if theory course has faculty preferences
              const theoryFacultyPrefs = this.selectedFaculty.get(section.course);
              const filteredLabSections = theoryFacultyPrefs?.size ? 
                labSections.filter(labSection => theoryFacultyPrefs.has(labSection.faculty)) :
                labSections;

              // Try each lab section with matching section number and faculty
              for (const labSection of filteredLabSections) {
                const labHasConflict = currentSchedule.some(existing =>
                  this.conflicts(existing, labSection)
                );

                if (!labHasConflict) {
                  // Add the lab section
                  currentSchedule.push(labSection);
                  usedSections.add(`${labSection.course}-${labSection.section}`);

                  // Continue with next course (skip the lab course in the main loop)
                  const nextCourseIndex = this.getNextCourseIndex(courseIndex, requiredCourses, labCourse);
                  backtrack(nextCourseIndex, currentSchedule, usedSections);

                  // Remove the lab section
                  currentSchedule.pop();
                  usedSections.delete(`${labSection.course}-${labSection.section}`);
                }
              }
            } else {
              // No lab pairing needed, continue normally
              backtrack(courseIndex + 1, currentSchedule, usedSections);
            }

            // Remove the current section
            currentSchedule.pop();
            usedSections.delete(`${section.course}-${section.section}`);
          }
        }
      };

      backtrack(0, []);

      // Sort by score (highest first) and apply additional sorting
      results.sort((a, b) => {
        if (this.filters.avoidGaps) {
          const gapsA = this.calculateGaps(a.schedule);
          const gapsB = this.calculateGaps(b.schedule);
          if (Math.abs(gapsA - gapsB) > 30) { // Significant gap difference
            return gapsA - gapsB;
          }
        }

        if (this.filters.balancedLoad) {
          const loadA = this.calculateDailyLoad(a.schedule);
          const loadB = this.calculateDailyLoad(b.schedule);
          if (Math.abs(loadA - loadB) > 1) { // Significant load difference
            return loadA - loadB;
          }
        }

        return b.score - a.score;
      });

      this.generatedSchedules = results.slice(0, maxResults).map(r => r.schedule);
      return this.generatedSchedules;
    }

    compareSections(a, b, currentSchedule) {
      // Faculty preference
      const facultyA = this.selectedFaculty.get(a.course)?.has(a.faculty) ? 1 : 0;
      const facultyB = this.selectedFaculty.get(b.course)?.has(b.faculty) ? 1 : 0;
      if (facultyA !== facultyB) return facultyB - facultyA;

      // Time preference (prefer earlier times)
      const timeA = parseRange(a.time);
      const timeB = parseRange(b.time);
      if (timeA && timeB) {
        return timeA.start - timeB.start;
      }

      // Section number (prefer lower section numbers)
      return a.section - b.section;
    }

    calculateGaps(schedule) {
      const daySchedules = {};

      schedule.forEach(section => {
        const days = section.days.split('');
        days.forEach(day => {
          if (!daySchedules[day]) daySchedules[day] = [];
          daySchedules[day].push(section);
        });
      });

      let totalGaps = 0;
      Object.values(daySchedules).forEach(daySections => {
        daySections.sort((a, b) => {
          const timeA = parseRange(a.time);
          const timeB = parseRange(b.time);
          return timeA.start - timeB.start;
        });

        for (let i = 1; i < daySections.length; i++) {
          const prevEnd = parseRange(daySections[i - 1].time).end;
          const currentStart = parseRange(daySections[i].time).start;
          totalGaps += currentStart - prevEnd;
        }
      });

      return totalGaps;
    }

    calculateDailyLoad(schedule) {
      const dayLoads = {};
      let maxLoad = 0;
      let minLoad = Infinity;

      schedule.forEach(section => {
        const days = section.days.split('');
        days.forEach(day => {
          if (!dayLoads[day]) dayLoads[day] = 0;
          dayLoads[day]++;
        });
      });

      Object.values(dayLoads).forEach(load => {
        maxLoad = Math.max(maxLoad, load);
        minLoad = Math.min(minLoad, load);
      });

      return maxLoad - minLoad;
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
        }, 4000);
      } catch (error) {
        console.error('Error showing toast:', error);
      }
    }

    static toggleTheme() {
      try {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);

        elements.themeToggle.innerHTML = newTheme === 'dark' ?
          '<i class="fas fa-sun"></i>' :
          '<i class="fas fa-moon"></i>';

        elements.themeToggle.title = `Switch to ${newTheme === 'dark' ? 'light' : 'dark'} theme`;
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

    static updateSummary(message) {
      try {
        if (elements.summary) {
          elements.summary.textContent = message;
        }
      } catch (error) {
        console.error('Error updating summary:', error);
      }
    }
  }

  // Course Management System
  class CourseManager {
    // Lab-Theory Course Pairing
    static getLabTheoryPairs() {
      return {
        'CSE311': 'CSE311L',
        'CSE311L': 'CSE311',
        'EEE111': 'EEE111L',
        'EEE111L': 'EEE111'
      };
    }

    static getPairedCourse(courseCode) {
      const pairs = this.getLabTheoryPairs();
      return pairs[courseCode] || null;
    }

    static isLabCourse(courseCode) {
      return courseCode.endsWith('L');
    }

    static isTheoryCourse(courseCode) {
      const pairs = this.getLabTheoryPairs();
      return pairs[courseCode] && !courseCode.endsWith('L');
    }

    static filterCourses(searchTerm, filterType = 'all') {
      let filteredCourses = window.COURSES;

      // Apply category filter
      if (filterType !== 'all') {
        filteredCourses = window.COURSES.filter(course =>
          course.course.toLowerCase().startsWith(filterType.toLowerCase())
        );
      }

      // Apply search filter
      if (searchTerm) {
        const terms = searchTerm.toLowerCase().split(' ');
        filteredCourses = filteredCourses.filter(course => {
          const courseText = `${course.course} ${course.faculty} Section ${course.section}`.toLowerCase();
          return terms.every(term => courseText.includes(term));
        });
      }

      return filteredCourses;
    }

    static getUniqueCourses(courses = window.COURSES) {
      const courseMap = new Map();

      courses.forEach(course => {
        if (!courseMap.has(course.course)) {
          const sections = courses.filter(c => c.course === course.course);
          const faculty = [...new Set(sections.map(s => s.faculty))];
          const times = [...new Set(sections.map(s => s.time))];
          const days = [...new Set(sections.map(s => s.days))];

          courseMap.set(course.course, {
            course: course.course,
            sections: sections,
            sectionCount: sections.length,
            faculty: faculty,
            times: times,
            days: days,
            totalSeats: sections.reduce((sum, s) => sum + s.seats, 0)
          });
        }
      });

      return Array.from(courseMap.values());
    }

    static updateModalCourseList(searchTerm = '', filterType = 'all') {
      try {
        const filteredCourses = this.filterCourses(searchTerm, filterType);
        const uniqueCourses = this.getUniqueCourses(filteredCourses);

        elements.courseListModal.innerHTML = uniqueCourses.map(courseInfo => {
          const isSelected = state.selectedCourses.has(courseInfo.course);
          const pairedCourse = this.getPairedCourse(courseInfo.course);
          const isPairedSelected = pairedCourse ? state.selectedCourses.has(pairedCourse) : false;
          const isLabCourse = this.isLabCourse(courseInfo.course);
          const isTheoryCourse = this.isTheoryCourse(courseInfo.course);

          // Add pairing indicator with section information
          let pairingInfo = '';
          if (pairedCourse) {
            const pairType = isLabCourse ? 'Lab' : 'Theory';
            const pairStatus = isPairedSelected ? '✓ Paired' : '⚠ Needs Pair';
            const sectionInfo = isPairedSelected ? ' (Same Section)' : ' (Will Match Sections)';
            const facultyInfo = isLabCourse ? ' (No Faculty Selection)' : '';
            pairingInfo = `<div class="pairing-info ${isPairedSelected ? 'paired' : 'unpaired'}">
              <i class="fas fa-link"></i> ${pairType} - ${pairStatus}${sectionInfo}${facultyInfo}
            </div>`;
          }

          return `
            <div class="course-card-modal ${isSelected ? 'selected' : ''} ${isPairedSelected ? 'paired-selected' : ''}" 
                 data-course="${courseInfo.course}">
              <input type="checkbox" 
                     ${isSelected ? 'checked' : ''}
                     data-course="${courseInfo.course}"
                     onchange="handleCourseSelection(this)">
              
              <div class="course-header-modal">
                <div class="course-code-modal">${courseInfo.course}</div>
                <div class="course-title-modal">${this.getCourseTitle(courseInfo.course)}</div>
              </div>
              
              ${pairingInfo}
              
              <div class="course-stats-modal">
                <span class="badge-modal">
                  <i class="fas fa-clock"></i> ${courseInfo.sectionCount} sections
                </span>
                <span class="badge-modal">
                  <i class="fas fa-user-tie"></i> ${courseInfo.faculty.length} faculty
                </span>
                <span class="badge-modal">
                  <i class="fas fa-users"></i> ${courseInfo.totalSeats} seats
                </span>
              </div>
              
              <div class="course-details-modal">
                <div><strong>Available Times:</strong> ${courseInfo.times.slice(0, 2).join(', ')}${courseInfo.times.length > 2 ? '...' : ''}</div>
                <div><strong>Days:</strong> ${courseInfo.days.slice(0, 3).join(', ')}${courseInfo.days.length > 3 ? '...' : ''}</div>
              </div>
            </div>
          `;
        }).join('');
      } catch (error) {
        console.error('Error updating modal course list:', error);
        UIManager.showToast('Error loading courses', 'error');
      }
    }

    static getCourseTitle(courseCode) {
      const titles = {
        'CSE327': 'Software Engineering',
        'CSE311': 'Data Structures & Algorithms',
        'CSE311L': 'Data Structures Lab',
        'CSE173': 'Programming Language',
        'CSE373': 'Computer Networks',
        'CSE273': 'Advanced Programming',
        'CSE323': 'Database Systems',
        'EEE111': 'Electrical Circuits',
        'EEE111L': 'Electrical Circuits Lab',
        'EEE154': 'Digital Logic Design',
        'CHE101': 'Chemistry',
        'ENG111': 'English Composition',
        'MAT361': 'Advanced Mathematics'
      };
      return titles[courseCode] || 'Course';
    }

    static updateSelectedCoursesDisplay() {
      try {
        if (state.selectedCourses.size === 0) {
          elements.selectedCoursesSection.style.display = 'none';
          return;
        }

        elements.selectedCoursesSection.style.display = 'block';

        elements.selectedCoursesList.innerHTML = Array.from(state.selectedCourses).map(course => {
          const courseInfo = this.getUniqueCourses().find(c => c.course === course);
          return `
            <div class="selected-course-tag">
              <span>${course}</span>
              <button class="remove-course" data-course="${course}" title="Remove course">
                <i class="fas fa-times"></i>
              </button>
            </div>
          `;
        }).join('');
      } catch (error) {
        console.error('Error updating selected courses display:', error);
      }
    }

    static updateFacultyList() {
      try {
        const searchTerm = elements.facultySearch.value?.toLowerCase() || '';

        elements.facultyToggles.innerHTML = '';

        state.selectedCourses.forEach(course => {
          // Skip lab courses - students must take corresponding theory course
          if (CourseManager.isLabCourse(course)) {
            return;
          }

          const courseFaculty = [...new Set(
            window.COURSES.filter(c => c.course === course).map(c => c.faculty)
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
        // Ensure paired lab/theory courses are included in selection automatically
        const normalizedSelected = new Set(state.selectedCourses);
        const pairs = CourseManager.getLabTheoryPairs();
        normalizedSelected.forEach(code => {
          const pair = pairs[code];
          if (pair) normalizedSelected.add(pair);
        });

        const generator = new ScheduleGenerator(
          window.COURSES,
          normalizedSelected,
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

  // Helper Functions
  function updateDayToggles() {
    // Day toggles removed - using only 4/5/6 day buttons
  }

  function updateSummary() {
    const courseCount = state.selectedCourses.size;
    if (courseCount === 0) {
      UIManager.updateSummary('Ready — select courses to generate schedules');
    } else {
      UIManager.updateSummary(`${courseCount} course${courseCount === 1 ? '' : 's'} selected`);
    }
  }

  function updateGenerateButton() {
    const hasCourses = state.selectedCourses.size > 0;
    elements.btnGenerateRoutine.disabled = !hasCourses;
    elements.btnGenerateRoutine.classList.toggle('disabled', !hasCourses);
  }

  // Global variables
  let currentFilterType = 'all';

  function exportSchedules() {
    if (state.schedules.length === 0) {
      UIManager.showToast('No schedules to export', 'warning');
      return;
    }

    const dataStr = JSON.stringify(state.schedules, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'course-schedules.json';
    link.click();

    URL.revokeObjectURL(url);
    UIManager.showToast('Schedules exported successfully', 'success');
  }

  function shareSchedules() {
    if (state.schedules.length === 0) {
      UIManager.showToast('No schedules to share', 'warning');
      return;
    }

    if (navigator.share) {
      navigator.share({
        title: 'Course Schedules',
        text: `Generated ${state.schedules.length} course schedules`,
        url: window.location.href
      }).catch(() => {
        UIManager.showToast('Share cancelled', 'info');
      });
    } else {
      navigator.clipboard.writeText(window.location.href).then(() => {
        UIManager.showToast('Link copied to clipboard', 'success');
      }).catch(() => {
        UIManager.showToast('Unable to share', 'error');
      });
    }
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
      minimumGap: 15,
      noEarly: false,
      noLate: false,
      preferredFaculty: new Set(),
      exactDays: null
    };

    // Reset UI
    document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
    document.querySelectorAll('select').forEach(select => select.selectedIndex = 0);
    if (elements.maxResults) elements.maxResults.value = '50';

    // Reset day toggle buttons
    elements.btn4day?.classList.remove('active');
    elements.btn5day?.classList.remove('active');
    elements.btn6day?.classList.remove('active');

    CourseManager.updateCourseList();
    CourseManager.updateFacultyList();
    updateSummary();
    UIManager.showToast('All filters have been reset', 'info');
  }

  // Global function for course selection (called from HTML)
  window.handleCourseSelection = function (checkbox) {
    const course = checkbox.dataset.course;
    const card = checkbox.closest('.course-card-modal');
    const pairedCourse = CourseManager.getPairedCourse(course);


    if (checkbox.checked) {
      // Add the selected course
      state.selectedCourses.add(course);
      card.classList.add('selected');

      // Automatically add paired course if it exists
      if (pairedCourse) {
        state.selectedCourses.add(pairedCourse);
        UIManager.showToast(`Automatically selected ${pairedCourse} (will match section numbers)`, 'info');
      }
    } else {
      // Remove the deselected course
      state.selectedCourses.delete(course);
      card.classList.remove('selected');

      // Automatically remove paired course if it exists
      if (pairedCourse) {
        state.selectedCourses.delete(pairedCourse);
        UIManager.showToast(`Automatically deselected ${pairedCourse}`, 'info');
      }
    }


    // Update pairing indicators and counter
    updatePairingIndicators();
    updateModalSelectedCount();
  };

  // Modal Management
  function openCourseModal() {
    if (!elements.courseModal) {
      console.error('Course modal element not found!');
      UIManager.showToast('Modal not found. Please refresh the page.', 'error');
      return;
    }

    elements.courseModal.classList.add('show');
    document.body.style.overflow = 'hidden';
    CourseManager.updateModalCourseList();
    updateModalSelectedCount();
  }

  function closeCourseModal() {
    if (elements.courseModal) {
      elements.courseModal.classList.remove('show');
      document.body.style.overflow = '';
    }
  }

  function updateModalSelectedCount() {
    const count = state.selectedCourses.size;
    elements.selectedCount.textContent = `${count} course${count === 1 ? '' : 's'} selected`;
    elements.confirmCourses.disabled = count === 0;
  }

  function updatePairingIndicators() {
    // Update pairing indicators for all course cards
    const courseCards = elements.courseListModal.querySelectorAll('.course-card-modal');
    courseCards.forEach(card => {
      const course = card.dataset.course;
      const pairedCourse = CourseManager.getPairedCourse(course);
      const isPairedSelected = pairedCourse ? state.selectedCourses.has(pairedCourse) : false;

      // Update card classes
      if (isPairedSelected) {
        card.classList.add('paired-selected');
      } else {
        card.classList.remove('paired-selected');
      }

      // Update pairing info
      const pairingInfo = card.querySelector('.pairing-info');
      if (pairingInfo && pairedCourse) {
        const isLabCourse = CourseManager.isLabCourse(course);
        const pairType = isLabCourse ? 'Lab' : 'Theory';
        const pairStatus = isPairedSelected ? '✓ Paired' : '⚠ Needs Pair';

        pairingInfo.className = `pairing-info ${isPairedSelected ? 'paired' : 'unpaired'}`;
        pairingInfo.innerHTML = `<i class="fas fa-link"></i> ${pairType} - ${pairStatus}`;
      }
    });
  }

  // Event Listeners
  function setupEventListeners() {
    // Course Selection Modal
    if (elements.selectCoursesBtn) {
      elements.selectCoursesBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openCourseModal();
      });
    }

    if (elements.closeModal) {
      elements.closeModal.addEventListener('click', closeCourseModal);
    }

    if (elements.cancelCourses) {
      elements.cancelCourses.addEventListener('click', closeCourseModal);
    }

    if (elements.confirmCourses) {
      elements.confirmCourses.addEventListener('click', () => {
        closeCourseModal();
        CourseManager.updateSelectedCoursesDisplay();
        CourseManager.updateFacultyList();
        updateSummary();
        updateGenerateButton();
        UIManager.showToast(`Selected ${state.selectedCourses.size} courses`, 'success');
      });
    }

    // Modal course search
    if (elements.modalCourseSearch) {
      elements.modalCourseSearch.addEventListener('input', (e) => {
        CourseManager.updateModalCourseList(e.target.value, currentFilterType);
      });
    }

    // Filter tabs
    document.querySelectorAll('.filter-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        currentFilterType = e.target.dataset.filter;
        CourseManager.updateModalCourseList(elements.modalCourseSearch.value, currentFilterType);
      });
    });

    // Click on card to toggle selection
    if (elements.courseListModal) {
      elements.courseListModal.addEventListener('click', (e) => {
        const card = e.target.closest('.course-card-modal');
        if (card && !e.target.matches('input[type="checkbox"]')) {
          const checkbox = card.querySelector('input[type="checkbox"]');
          checkbox.checked = !checkbox.checked;
          window.handleCourseSelection(checkbox);
        }
      });
    }

    // Remove course from selected list
    if (elements.selectedCoursesList) {
      elements.selectedCoursesList.addEventListener('click', (e) => {
        if (e.target.closest('.remove-course')) {
          const course = e.target.closest('.remove-course').dataset.course;
          state.selectedCourses.delete(course);
          CourseManager.updateSelectedCoursesDisplay();
          CourseManager.updateFacultyList();
          updateSummary();
          updateGenerateButton();
          UIManager.showToast(`Removed ${course}`, 'info');
        }
      });
    }

    // Close modal on outside click
    if (elements.courseModal) {
      elements.courseModal.addEventListener('click', (e) => {
        if (e.target === elements.courseModal) {
          closeCourseModal();
        }
      });
    }

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
        localStorage.setItem('sidebarActive', elements.sidebar.classList.contains('active'));
      });

      // Restore sidebar state
      const sidebarActive = localStorage.getItem('sidebarActive');
      if (sidebarActive === 'true') {
        elements.sidebar.classList.add('active');
      }
    }

    // Search functionality
    if (elements.courseSearch) {
      elements.courseSearch.addEventListener('input', () => CourseManager.updateCourseList());
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
            // Only delete faculty selection for non-lab courses
            if (!CourseManager.isLabCourse(course)) {
              state.selectedFaculty.delete(course);
            }
          }
          CourseManager.updateFacultyList();
          updateSummary();
        }
      });
    }

    // Faculty selection
    if (elements.facultyToggles) {
      elements.facultyToggles.addEventListener('change', (e) => {
        if (e.target.matches('input[type="checkbox"]')) {
          const { course, faculty } = e.target.dataset;
          
          // Skip lab courses - they don't have faculty selection
          if (CourseManager.isLabCourse(course)) {
            return;
          }
          
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

    // Day toggles removed - using only 4/5/6 day buttons

    // Quick day selection
    if (elements.btn4day) {
      elements.btn4day.addEventListener('click', () => {
        state.filters.days.clear();
        state.filters.exactDays = 4;
        elements.btn4day.classList.add('active');
        elements.btn5day.classList.remove('active');
        elements.btn6day.classList.remove('active');
      });
    }

    if (elements.btn5day) {
      elements.btn5day.addEventListener('click', () => {
        state.filters.days.clear();
        state.filters.exactDays = 5;
        elements.btn5day.classList.add('active');
        elements.btn4day.classList.remove('active');
        elements.btn6day.classList.remove('active');
      });
    }

    if (elements.btn6day) {
      elements.btn6day.addEventListener('click', () => {
        state.filters.days.clear();
        state.filters.exactDays = 6;
        elements.btn6day.classList.add('active');
        elements.btn4day.classList.remove('active');
        elements.btn5day.classList.remove('active');
      });
    }

    // Time preferences
    if (elements.noEarly) {
      elements.noEarly.addEventListener('change', (e) => {
        state.filters.noEarly = e.target.checked;
      });
    }

    if (elements.noLate) {
      elements.noLate.addEventListener('change', (e) => {
        state.filters.noLate = e.target.checked;
      });
    }

    if (elements.preferredTimeStart) {
      elements.preferredTimeStart.addEventListener('change', (e) => {
        state.filters.timeStart = e.target.value ? parseInt(e.target.value) : null;
      });
    }

    if (elements.preferredTimeEnd) {
      elements.preferredTimeEnd.addEventListener('change', (e) => {
        state.filters.timeEnd = e.target.value ? parseInt(e.target.value) : null;
      });
    }

    // Generate and reset buttons
    if (elements.btnGenerateRoutine) {
      elements.btnGenerateRoutine.addEventListener('click', generateSchedules);
    }
    if (elements.btnReset) {
      elements.btnReset.addEventListener('click', resetFilters);
    }

    // Export and share buttons
    if (elements.btnExport) {
      elements.btnExport.addEventListener('click', exportSchedules);
    }
    if (elements.btnShare) {
      elements.btnShare.addEventListener('click', shareSchedules);
    }

    // Filter controls
    if (elements.maxResults) {
      elements.maxResults.addEventListener('change', (e) => {
        state.filters.maxResults = parseInt(e.target.value) || 50;
      });
    }

    if (elements.avoidGaps) {
      elements.avoidGaps.addEventListener('change', (e) => {
        state.filters.avoidGaps = e.target.checked;
      });
    }

    if (elements.balancedLoad) {
      elements.balancedLoad.addEventListener('change', (e) => {
        state.filters.balancedLoad = e.target.checked;
      });
    }
  }

  // Initialize Application
  function init() {
    // Ensure COURSES is loaded
    if (!window.COURSES || !Array.isArray(window.COURSES) || window.COURSES.length === 0) {
      console.error('Course data not loaded properly');
      UIManager.showToast('Failed to load course data. Please refresh the page.', 'error');
      return;
    }

    console.log(`Course data loaded: ${window.COURSES.length} courses available`);

    // Set initial theme
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    if (elements.themeToggle) {
      elements.themeToggle.innerHTML = savedTheme === 'dark' ?
        '<i class="fas fa-sun"></i>' :
        '<i class="fas fa-moon"></i>';
    }

    // Set initial view
    UIManager.setView(state.view);

    // Initialize course list immediately
    setTimeout(() => {
      CourseManager.updateModalCourseList();
      CourseManager.updateFacultyList();
      updateGenerateButton();
    }, 0);

    // Setup event listeners
    setupEventListeners();

    // Show sidebar by default on desktop
    if (elements.sidebar && window.innerWidth > 1024) {
      elements.sidebar.classList.add('active');
    }

    // Initialize summary
    updateSummary();

    // Show welcome message
    setTimeout(() => {
      UIManager.showToast('Welcome to CourseWizard! Select courses to get started.', 'success');
    }, 1000);


    console.log('CourseWizard initialized successfully');
  }

  // Start the application
  init();
});

// Mobile enhancements and additional functionality
document.addEventListener('DOMContentLoaded', () => {
  // Haptic feedback for supported devices
  if ('vibrate' in navigator) {
    document.querySelectorAll('.btn').forEach(btn => {
      btn.addEventListener('click', () => navigator.vibrate(30));
    });
  }

  // Close sidebar when clicking outside on mobile
  document.addEventListener('click', (e) => {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('toggleSidebar');

    if (sidebar && toggleBtn && window.innerWidth <= 1024 &&
      !sidebar.contains(e.target) &&
      !toggleBtn.contains(e.target) &&
      sidebar.classList.contains('active')) {
      sidebar.classList.remove('active');
    }
  });

  // Swipe gesture support for mobile sidebar
  let touchStartX = 0;
  let touchStartY = 0;

  document.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  });

  document.addEventListener('touchend', (e) => {
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;
    const sidebar = document.getElementById('sidebar');

    // Only handle horizontal swipes
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      if (sidebar) {
        if (deltaX > 50 && touchStartX < 50) {
          sidebar.classList.add('active');
        } else if (deltaX < -50 && sidebar.classList.contains('active')) {
          sidebar.classList.remove('active');
        }
      }
    }
  });

  // Handle window resize
  window.addEventListener('resize', () => {
    const sidebar = document.getElementById('sidebar');
    if (window.innerWidth > 1024 && sidebar) {
      sidebar.classList.add('active');
    } else if (window.innerWidth <= 1024 && sidebar) {
      sidebar.classList.remove('active');
    }
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + K to focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      const searchInput = document.getElementById('courseSearch');
      if (searchInput) {
        searchInput.focus();
      }
    }

    // Escape to close sidebar on mobile
    if (e.key === 'Escape') {
      const sidebar = document.getElementById('sidebar');
      if (sidebar && window.innerWidth <= 1024 && sidebar.classList.contains('active')) {
        sidebar.classList.remove('active');
      }
    }
  });
});